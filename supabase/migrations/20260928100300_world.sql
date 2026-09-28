-- Mundo modular (§48): objetos en borrador por temporada y revisiones
-- inmutables del mundo completo. La versión activa es un puntero en la
-- temporada, así que publicar o restaurar es un único UPDATE atómico.
-- Spec: REQ-ADM-009 a REQ-ADM-016, REQ-ADM-032, REQ-ARQ-004.
--
-- `data` y `snapshot` guardan exactamente la forma de @boia/world
-- (WorldObject y WorldConfig): el editor y el motor comparten esquema y lo
-- valida zod antes de escribir. Publicar lo harán funciones auditadas (T09)
-- o el servidor; ningún cliente cambia `status` ni el puntero activo.

-- Configuración del mundo en borrador (límites, spawn, sectores) sin objetos.
alter table public.seasons
  add column world_draft jsonb not null default '{}'::jsonb
    check (jsonb_typeof(world_draft) = 'object');

-- ---------------------------------------------------------------------------
-- Objetos del mundo en borrador

create table public.world_objects (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete restrict,
  -- identity.id del WorldObject; estable entre revisiones.
  object_key text not null check (char_length(object_key) between 1 and 80),
  category text not null,
  island_id uuid references public.islands (id) on delete set null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  enabled boolean not null default true,
  -- Papelera recuperable (REQ-ADM-030).
  deleted_at timestamptz,
  is_sample boolean not null default false,
  updated_by uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, object_key)
);
create index world_objects_island_idx on public.world_objects (island_id);

create trigger world_objects_touch before update on public.world_objects
  for each row execute function private.touch_version();

alter table public.world_objects enable row level security;
revoke all on public.world_objects from anon, authenticated, service_role;
grant select on public.world_objects to authenticated;
grant insert (id, season_id, object_key, category, island_id, data, enabled, updated_by)
  on public.world_objects to authenticated;
grant update (object_key, category, island_id, data, enabled, deleted_at, updated_by)
  on public.world_objects to authenticated;
grant select, insert, update, delete on public.world_objects to service_role;

create policy world_objects_staff_read on public.world_objects
  for select to authenticated
  using ((select private.has_staff_role('editor')));

create policy world_objects_staff_insert on public.world_objects
  for insert to authenticated
  with check ((select private.has_staff_role('editor')));

create policy world_objects_staff_update on public.world_objects
  for update to authenticated
  using ((select private.has_staff_role('editor')))
  with check ((select private.has_staff_role('editor')));

-- ---------------------------------------------------------------------------
-- Revisiones del mundo: borrador editable o publicada inmutable.

create type public.revision_status as enum ('draft', 'published');

create table public.world_revisions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete restrict,
  number integer not null check (number > 0),
  status public.revision_status not null default 'draft',
  -- WORLD_SCHEMA_VERSION de @boia/world con el que se escribió el snapshot.
  schema_version integer not null default 0,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  note text,
  is_sample boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  unique (season_id, number),
  check ((status = 'published') = (published_at is not null))
);

-- Una revisión publicada no cambia ni se borra (REQ-ADM-015, REQ-ADM-016).
create function private.guard_revision() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- Los datos de muestra sí se pueden retirar (REQ-ARQ-006).
    if old.status = 'published' and not old.is_sample then
      raise exception 'Una revisión publicada no se borra' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.status = 'published' then
    raise exception 'Una revisión publicada es inmutable' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_revision() from public;

create trigger world_revisions_guard before update or delete on public.world_revisions
  for each row execute function private.guard_revision();
create trigger world_revisions_audit after insert or update or delete on public.world_revisions
  for each row execute function private.audit_row('id');

-- Versión activa de la temporada: puntero a una revisión publicada suya.
alter table public.seasons
  add column active_world_revision_id uuid references public.world_revisions (id) on delete restrict;

create function private.check_active_world_revision() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.active_world_revision_id is not null and not exists (
    select 1 from public.world_revisions r
    where r.id = new.active_world_revision_id
      and r.season_id = new.id
      and r.status = 'published'
  ) then
    raise exception 'La revisión activa tiene que estar publicada y ser de esta temporada'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.check_active_world_revision() from public;

create trigger seasons_active_world_revision
  before insert or update of active_world_revision_id on public.seasons
  for each row execute function private.check_active_world_revision();

alter table public.world_revisions enable row level security;
revoke all on public.world_revisions from anon, authenticated, service_role;
grant select on public.world_revisions to anon, authenticated;
grant insert (id, season_id, number, schema_version, snapshot, note, created_by)
  on public.world_revisions to authenticated;
grant update (snapshot, schema_version, note) on public.world_revisions to authenticated;
grant select, insert, update, delete on public.world_revisions to service_role;

-- El público sólo lee el mundo activo de la temporada activa.
create policy world_revisions_read_active on public.world_revisions
  for select to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.seasons s
      where s.is_active and s.active_world_revision_id = world_revisions.id
    )
  );

create policy world_revisions_staff_read on public.world_revisions
  for select to authenticated
  using ((select private.has_staff_role('editor')));

create policy world_revisions_staff_insert on public.world_revisions
  for insert to authenticated
  with check ((select private.has_staff_role('editor')) and created_by = (select auth.uid()));

create policy world_revisions_staff_update on public.world_revisions
  for update to authenticated
  using ((select private.has_staff_role('editor')) and status = 'draft')
  with check ((select private.has_staff_role('editor')) and status = 'draft');
