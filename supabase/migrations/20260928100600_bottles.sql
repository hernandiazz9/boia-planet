-- Botellas: una activa por cuenta, 140 caracteres, lecturas registradas,
-- reportes y retirada por moderación.
-- Spec: REQ-IDE-040 a REQ-IDE-044, REQ-ADM-027.

create type public.bottle_status as enum ('active', 'retired', 'removed');

create table public.bottles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  season_id uuid references public.seasons (id) on delete restrict,
  message text not null check (char_length(message) between 1 and 140 and message = btrim(message)),
  -- Posición en coordenadas de mundo; que sea mar válido lo comprueba el servidor.
  x double precision not null,
  y double precision not null,
  -- active: visible · retired: la retira su autor · removed: moderación.
  status public.bottle_status not null default 'active',
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index bottles_one_active_per_user on public.bottles (user_id) where status = 'active';
create index bottles_season_idx on public.bottles (season_id) where status = 'active';

create function private.bottle_prepare() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.season_id is null then
    new.season_id := (select s.id from public.seasons s where s.is_active);
  end if;
  if new.status = 'removed' and (tg_op = 'INSERT' or old.status <> 'removed') then
    new.moderated_by := (select auth.uid());
    new.moderated_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.bottle_prepare() from public;

create trigger bottles_prepare before insert or update on public.bottles
  for each row execute function private.bottle_prepare();
create trigger bottles_touch before update on public.bottles
  for each row execute function private.touch_version();
create trigger bottles_audit after update of status on public.bottles
  for each row when (new.status = 'removed')
  execute function private.audit_row('id');

alter table public.bottles enable row level security;
revoke all on public.bottles from anon, authenticated, service_role;
grant select on public.bottles to anon, authenticated;
grant insert (user_id, message, x, y) on public.bottles to authenticated;
grant update (message, x, y, status) on public.bottles to authenticated;
grant select, insert, update, delete on public.bottles to service_role;

create policy bottles_read_active on public.bottles
  for select to anon, authenticated
  using (status = 'active');

create policy bottles_read_own_or_staff on public.bottles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('admin')));

-- Sin cuenta (invitado anónimo) no se escriben botellas.
create policy bottles_insert_own on public.bottles
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_member()) and status = 'active');

-- El autor edita o retira la suya, pero no deshace una retirada por moderación.
create policy bottles_update_own on public.bottles
  for update to authenticated
  using (user_id = (select auth.uid()) and status <> 'removed')
  with check (user_id = (select auth.uid()) and status in ('active', 'retired'));

create policy bottles_moderate on public.bottles
  for update to authenticated
  using ((select private.has_staff_role('admin')))
  with check ((select private.has_staff_role('admin')));

-- ---------------------------------------------------------------------------
-- Lecturas (la botella no desaparece al leerla, REQ-IDE-041). También las
-- registra el invitado con su identidad anónima.

create table public.bottle_reads (
  bottle_id uuid not null references public.bottles (id) on delete cascade,
  reader_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (bottle_id, reader_id)
);
create index bottle_reads_reader_idx on public.bottle_reads (reader_id);

alter table public.bottle_reads enable row level security;
revoke all on public.bottle_reads from anon, authenticated, service_role;
grant select, insert on public.bottle_reads to authenticated;
grant select, insert, delete on public.bottle_reads to service_role;

create policy bottle_reads_read_own on public.bottle_reads
  for select to authenticated
  using (reader_id = (select auth.uid()));

create policy bottle_reads_insert_own on public.bottle_reads
  for insert to authenticated
  with check (reader_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Reportes

create table public.bottle_reports (
  id uuid primary key default gen_random_uuid(),
  bottle_id uuid not null references public.bottles (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 280),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  resolution text,
  unique (bottle_id, reporter_id)
);
create index bottle_reports_open_idx on public.bottle_reports (created_at) where resolved_at is null;
create index bottle_reports_reporter_idx on public.bottle_reports (reporter_id);

alter table public.bottle_reports enable row level security;
revoke all on public.bottle_reports from anon, authenticated, service_role;
grant select on public.bottle_reports to authenticated;
grant insert (bottle_id, reporter_id, reason) on public.bottle_reports to authenticated;
grant update (resolved_at, resolved_by, resolution) on public.bottle_reports to authenticated;
grant select, insert, update, delete on public.bottle_reports to service_role;

create policy bottle_reports_read on public.bottle_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.has_staff_role('admin')));

create policy bottle_reports_insert_own on public.bottle_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select private.is_member()));

create policy bottle_reports_resolve on public.bottle_reports
  for update to authenticated
  using ((select private.has_staff_role('admin')))
  with check ((select private.has_staff_role('admin')));
