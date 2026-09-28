-- Temporadas, islas y eventos. Evento e isla son entidades separadas (§49.4):
-- una isla conserva su historial de eventos y puede recibir uno nuevo.
-- Spec: REQ-COM-001 a REQ-COM-008, REQ-COM-011, REQ-COM-013, REQ-ADM-032,
-- REQ-ARQ-008.
--
-- El estado de un evento y su publicación no se conceden a ningún rol de
-- cliente: los cambia la tarea programada o una función auditada del Admin
-- (T08), o el servidor con service_role.

-- ---------------------------------------------------------------------------
-- Temporadas: una sola activa (REQ-ADM-032).

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  is_sample boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create unique index seasons_one_active on public.seasons (is_active) where is_active;

create trigger seasons_touch before update on public.seasons
  for each row execute function private.touch_version();
create trigger seasons_audit after insert or update or delete on public.seasons
  for each row execute function private.audit_row('id');

alter table public.seasons enable row level security;
revoke all on public.seasons from anon, authenticated, service_role;
grant select on public.seasons to anon, authenticated;
grant select, insert, update, delete on public.seasons to service_role;

create policy seasons_read on public.seasons
  for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Islas

create table public.islands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  summary text,
  archived_at timestamptz,
  is_sample boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger islands_touch before update on public.islands
  for each row execute function private.touch_version();

alter table public.islands enable row level security;
revoke all on public.islands from anon, authenticated, service_role;
grant select on public.islands to anon, authenticated;
grant insert (id, slug, name, summary) on public.islands to authenticated;
grant update (slug, name, summary) on public.islands to authenticated;
grant select, insert, update, delete on public.islands to service_role;

create policy islands_read_public on public.islands
  for select to anon, authenticated
  using (archived_at is null);

create policy islands_read_staff on public.islands
  for select to authenticated
  using ((select private.has_staff_role('editor')));

create policy islands_write_staff on public.islands
  for insert to authenticated
  with check ((select private.has_staff_role('editor')));

create policy islands_update_staff on public.islands
  for update to authenticated
  using ((select private.has_staff_role('editor')))
  with check ((select private.has_staff_role('editor')));

-- ---------------------------------------------------------------------------
-- Eventos. Los siete estados de §49.4 / REQ-COM-003, con los nombres de
-- EVENT_STATES de @boia/contracts (una prueba lo exige):
--   draft=borrador, coming_soon=próximamente, on_sale=a la venta,
--   sold_out=agotado, postponed=pospuesto, cancelled=cancelado,
--   finished=finalizado.

create type public.event_state as enum (
  'draft', 'coming_soon', 'on_sale', 'sold_out', 'postponed', 'cancelled', 'finished'
);

-- Qué muestra la isla de un evento cancelado (REQ-COM-008, pendiente Álvaro).
create type public.cancelled_island_mode as enum ('memory', 'notice');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  format text not null default 'all_day',
  state public.event_state not null default 'draft',
  -- Una transición manual bloquea las automáticas por fecha (REQ-COM-004).
  state_locked boolean not null default false,
  published_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'Europe/Madrid',
  sale_starts_at timestamptz,
  description text,
  poster_key text,
  -- Lugar público; la dirección de una secret location va en event_secrets
  -- y nunca se sirve a clientes (REQ-COM-013).
  venue_public text,
  lineup jsonb not null default '[]'::jsonb check (jsonb_typeof(lineup) = 'array'),
  activities jsonb not null default '[]'::jsonb check (jsonb_typeof(activities) = 'array'),
  ticket_url text check (ticket_url is null or ticket_url ~ '^https://'),
  ticket_provider text,
  ticket_provider_event_id text,
  island_id uuid references public.islands (id) on delete restrict,
  excluded_from_home boolean not null default false,
  postponed_message text,
  cancelled_message text,
  cancelled_island_mode public.cancelled_island_mode,
  archived_at timestamptz,
  is_sample boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  -- Un evento visible fuera del Admin tiene que estar publicado.
  check (state = 'draft' or published_at is not null)
);
create index events_island_idx on public.events (island_id);
create index events_public_idx on public.events (state, starts_at)
  where published_at is not null and archived_at is null;
create unique index events_provider_ref_key on public.events (ticket_provider, ticket_provider_event_id)
  where ticket_provider_event_id is not null;

create trigger events_touch before update on public.events
  for each row execute function private.touch_version();
create trigger events_audit after insert or update or delete on public.events
  for each row execute function private.audit_row('id');

alter table public.events enable row level security;
revoke all on public.events from anon, authenticated, service_role;
grant select on public.events to anon, authenticated;
-- Contenido editable por el equipo. Sin state, state_locked, published_at,
-- archived_at ni is_sample.
grant insert (
  id, slug, title, format, starts_at, ends_at, timezone, sale_starts_at, description, poster_key,
  venue_public, lineup, activities, ticket_url, ticket_provider, ticket_provider_event_id,
  island_id, excluded_from_home, postponed_message, cancelled_message, cancelled_island_mode,
  created_by
) on public.events to authenticated;
grant update (
  slug, title, format, starts_at, ends_at, timezone, sale_starts_at, description, poster_key,
  venue_public, lineup, activities, ticket_url, ticket_provider, ticket_provider_event_id,
  island_id, excluded_from_home, postponed_message, cancelled_message, cancelled_island_mode
) on public.events to authenticated;
grant select, insert, update, delete on public.events to service_role;

create policy events_read_public on public.events
  for select to anon, authenticated
  using (published_at is not null and state <> 'draft' and archived_at is null);

create policy events_read_staff on public.events
  for select to authenticated
  using ((select private.has_staff_role('editor')));

create policy events_insert_staff on public.events
  for insert to authenticated
  with check ((select private.has_staff_role('editor')) and created_by = (select auth.uid()));

create policy events_update_staff on public.events
  for update to authenticated
  using ((select private.has_staff_role('editor')))
  with check ((select private.has_staff_role('editor')));

-- ---------------------------------------------------------------------------
-- Datos reservados del evento (secret location). Sólo el equipo.

create table public.event_secrets (
  event_id uuid primary key references public.events (id) on delete cascade,
  secret_address text,
  notes text,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create trigger event_secrets_touch before update on public.event_secrets
  for each row execute function private.touch_version();

alter table public.event_secrets enable row level security;
revoke all on public.event_secrets from anon, authenticated, service_role;
grant select on public.event_secrets to authenticated;
grant insert (event_id, secret_address, notes) on public.event_secrets to authenticated;
grant update (secret_address, notes) on public.event_secrets to authenticated;
grant select, insert, update, delete on public.event_secrets to service_role;

create policy event_secrets_staff_read on public.event_secrets
  for select to authenticated
  using ((select private.has_staff_role('editor')));

create policy event_secrets_staff_insert on public.event_secrets
  for insert to authenticated
  with check ((select private.has_staff_role('editor')));

create policy event_secrets_staff_update on public.event_secrets
  for update to authenticated
  using ((select private.has_staff_role('editor')))
  with check ((select private.has_staff_role('editor')));
