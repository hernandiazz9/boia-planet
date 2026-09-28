-- Base: esquema privado, ayudas comunes, roles del Admin y auditoría.
-- Spec: REQ-ARQ-003, REQ-ARQ-004, REQ-ARQ-009, REQ-ADM-004, REQ-ADM-006,
-- REQ-ADM-007. D-10 (Admin con TOTP).
--
-- Convenciones de todas las migraciones:
--   - Cada tabla de public lleva RLS y revoca lo que Supabase concede por
--     defecto a anon/authenticated/service_role; después concede sólo lo que
--     necesita, columna a columna cuando hay campos que un cliente no toca.
--   - Saldos, roles, sellos y estados de compra o de evento nunca se conceden
--     a anon ni a authenticated.
--   - Las funciones con SECURITY DEFINER viven en `private`, que no expone
--     la Data API, y fijan search_path = ''.
--   - Las entidades editables llevan `version` (sube sola en cada UPDATE).
--   - Los datos de ejemplo llevan `is_sample = true` («muestra», REQ-ARQ-006).

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Ayudas genéricas

create function private.touch_version() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create function private.forbid_change() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% sobre %.% no está permitido: la tabla sólo admite altas',
    tg_op, tg_table_schema, tg_table_name
    using errcode = '42501';
end;
$$;

-- Cuenta con email (no la identidad anónima del invitado, REQ-IDE-005).
create function private.is_member() returns boolean
language sql stable
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
$$;

-- ---------------------------------------------------------------------------
-- Roles del Admin (REQ-ADM-004). El orden del enum es el rango.

create type public.staff_role as enum ('editor', 'admin', 'owner');

create table public.staff_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.staff_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
comment on table public.staff_roles is
  'Una fila por persona del equipo. Sólo se escribe desde el servidor (service_role) o funciones auditadas.';

create trigger staff_roles_touch before update on public.staff_roles
  for each row execute function private.touch_version();

-- Rol del equipo de quien llama. Exige sesión con segundo factor (aal2, D-10):
-- sin TOTP no hay permisos de Admin aunque la fila exista.
create function private.staff_role() returns public.staff_role
language sql stable
security definer
set search_path = ''
as $$
  select sr.role
  from public.staff_roles sr
  where sr.user_id = (select auth.uid())
    and private.is_member()
    and ((select auth.jwt()) ->> 'aal') = 'aal2'
$$;

create function private.has_staff_role(min_role public.staff_role) returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(private.staff_role() >= min_role, false)
$$;

-- Protección del último propietario (REQ-ADM-004).
create function private.protect_last_owner() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and not exists (
       select 1 from public.staff_roles
       where role = 'owner' and user_id <> old.user_id
     )
  then
    raise exception 'No se puede quitar el último propietario' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger staff_roles_last_owner before update or delete on public.staff_roles
  for each row execute function private.protect_last_owner();

alter table public.staff_roles enable row level security;
revoke all on public.staff_roles from anon, authenticated, service_role;
grant select on public.staff_roles to authenticated;
grant select, insert, update, delete on public.staff_roles to service_role;

create policy staff_roles_select_own on public.staff_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('admin')));

-- ---------------------------------------------------------------------------
-- Auditoría (REQ-ARQ-009, REQ-ADM-007): autor, fecha, motivo, valor anterior
-- y nuevo. Sólo altas. El motivo lo pasa quien escribe con
--   select set_config('boia.audit_reason', '<motivo>', true);

create table public.audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  reason text,
  old_value jsonb,
  new_value jsonb
);
comment on table public.audit_log is
  'Auditoría inmutable. actor_id sin FK para conservar el historial si la cuenta se borra.';

create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);

create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function private.forbid_change();
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function private.forbid_change();

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated, service_role;
grant select on public.audit_log to authenticated;
grant select, insert on public.audit_log to service_role;

create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using ((select private.has_staff_role('admin')));

-- Disparador genérico: una fila de auditoría por cambio.
create function private.audit_row() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pk text;
  role_name text := coalesce(nullif(current_setting('role', true), 'none'), current_user);
begin
  pk := coalesce(
    to_jsonb(new) ->> tg_argv[0],
    to_jsonb(old) ->> tg_argv[0]
  );
  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, reason, old_value, new_value)
  values (
    (select auth.uid()),
    role_name,
    lower(tg_op),
    tg_table_name,
    pk,
    nullif(current_setting('boia.audit_reason', true), ''),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger staff_roles_audit after insert or update or delete on public.staff_roles
  for each row execute function private.audit_row('user_id');

-- Las funciones de disparador no se llaman directamente.
revoke all on function private.touch_version() from public;
revoke all on function private.forbid_change() from public;
revoke all on function private.protect_last_owner() from public;
revoke all on function private.audit_row() from public;

-- Las ayudas de RLS sí: las políticas se evalúan con el rol de quien consulta.
revoke all on function private.is_member() from public;
revoke all on function private.staff_role() from public;
revoke all on function private.has_staff_role(public.staff_role) from public;
grant execute on function private.is_member() to anon, authenticated, service_role;
grant execute on function private.staff_role() to anon, authenticated, service_role;
grant execute on function private.has_staff_role(public.staff_role) to anon, authenticated, service_role;
