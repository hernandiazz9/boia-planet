-- Página principal por bloques: borrador editable y revisiones publicadas
-- inmutables, con la versión activa como puntero en site_settings.
-- Spec: REQ-ADM-015, REQ-ADM-016, REQ-ADM-017, REQ-COM-009, REQ-COM-011.

-- Mismos tipos que HOME_BLOCK_TYPES de @boia/contracts (una prueba lo exige).
create type public.home_block_type as enum (
  'hero', 'priority_event', 'upcoming_events', 'artists', 'philosophy', 'photos', 'store', 'contact',
  'footer'
);

create table public.home_blocks (
  id uuid primary key default gen_random_uuid(),
  block_type public.home_block_type not null,
  position integer not null check (position >= 0),
  is_visible boolean not null default true,
  visible_from timestamptz,
  visible_until timestamptz,
  -- Campos del bloque por formulario, sin HTML libre (REQ-ADM-017). En
  -- priority_event, { "event_id": "<uuid>" }.
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  is_sample boolean not null default false,
  updated_by uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (visible_until is null or visible_from is null or visible_until > visible_from)
);
create index home_blocks_position_idx on public.home_blocks (position);

create trigger home_blocks_touch before update on public.home_blocks
  for each row execute function private.touch_version();

alter table public.home_blocks enable row level security;
revoke all on public.home_blocks from anon, authenticated, service_role;
grant select on public.home_blocks to authenticated;
grant insert (id, block_type, position, is_visible, visible_from, visible_until, config, updated_by)
  on public.home_blocks to authenticated;
grant update (position, is_visible, visible_from, visible_until, config, updated_by)
  on public.home_blocks to authenticated;
grant delete on public.home_blocks to authenticated;
grant select, insert, update, delete on public.home_blocks to service_role;

create policy home_blocks_staff_read on public.home_blocks
  for select to authenticated
  using ((select private.has_staff_role('editor')));

create policy home_blocks_staff_insert on public.home_blocks
  for insert to authenticated
  with check ((select private.has_staff_role('editor')));

create policy home_blocks_staff_update on public.home_blocks
  for update to authenticated
  using ((select private.has_staff_role('editor')))
  with check ((select private.has_staff_role('editor')));

create policy home_blocks_staff_delete on public.home_blocks
  for delete to authenticated
  using ((select private.has_staff_role('editor')));

-- ---------------------------------------------------------------------------
-- Revisiones de la home

create table public.home_revisions (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique check (number > 0),
  status public.revision_status not null default 'draft',
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  note text,
  is_sample boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  check ((status = 'published') = (published_at is not null))
);

create trigger home_revisions_guard before update or delete on public.home_revisions
  for each row execute function private.guard_revision();
create trigger home_revisions_audit after insert or update or delete on public.home_revisions
  for each row execute function private.audit_row('id');

-- ---------------------------------------------------------------------------
-- Ajustes del sitio: una sola fila.

create table public.site_settings (
  id boolean primary key default true check (id),
  active_home_revision_id uuid references public.home_revisions (id) on delete restrict,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (true);

create function private.check_active_home_revision() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.active_home_revision_id is not null and not exists (
    select 1 from public.home_revisions r
    where r.id = new.active_home_revision_id and r.status = 'published'
  ) then
    raise exception 'La home activa tiene que ser una revisión publicada' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.check_active_home_revision() from public;

create trigger site_settings_active_home
  before insert or update of active_home_revision_id on public.site_settings
  for each row execute function private.check_active_home_revision();
create trigger site_settings_touch before update on public.site_settings
  for each row execute function private.touch_version();
create trigger site_settings_audit after update on public.site_settings
  for each row execute function private.audit_row('id');

alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated, service_role;
grant select on public.site_settings to anon, authenticated;
grant select, update on public.site_settings to service_role;

create policy site_settings_read on public.site_settings
  for select to anon, authenticated
  using (true);

alter table public.home_revisions enable row level security;
revoke all on public.home_revisions from anon, authenticated, service_role;
grant select on public.home_revisions to anon, authenticated;
grant insert (id, number, snapshot, note, created_by) on public.home_revisions to authenticated;
grant update (snapshot, note) on public.home_revisions to authenticated;
grant select, insert, update, delete on public.home_revisions to service_role;

create policy home_revisions_read_active on public.home_revisions
  for select to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.site_settings s
      where s.active_home_revision_id = home_revisions.id
    )
  );

create policy home_revisions_staff_read on public.home_revisions
  for select to authenticated
  using ((select private.has_staff_role('editor')));

create policy home_revisions_staff_insert on public.home_revisions
  for insert to authenticated
  with check ((select private.has_staff_role('editor')) and created_by = (select auth.uid()));

create policy home_revisions_staff_update on public.home_revisions
  for update to authenticated
  using ((select private.has_staff_role('editor')) and status = 'draft')
  with check ((select private.has_staff_role('editor')) and status = 'draft');
