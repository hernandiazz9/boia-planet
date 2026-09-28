-- Progreso: logros con condición del catálogo, compras, libro de
-- transacciones idempotente y lo que se deriva de él (saldos de puntos y
-- monedas, puntos de temporada, logros obtenidos, sellos y cosméticos).
-- Spec: REQ-ARQ-007, REQ-ARQ-008, REQ-ARQ-010, REQ-IDE-021, REQ-IDE-027,
-- REQ-IDE-038, REQ-ADM-021, REQ-ADM-022, REQ-COM-017, REQ-COM-019.
--
-- Reglas:
--   - Toda concesión es una fila de ledger_transactions con un id estable que
--     elige el servidor (p. ej. derivado de usuario + objeto). Repetir el id
--     falla por clave primaria: reintentos y concurrencia no duplican nada.
--   - Sólo service_role inserta en el libro. Nadie lo modifica: una
--     corrección es una compensación (REQ-ARQ-007).
--   - Saldos, puntos de temporada, logros obtenidos, sellos y cosméticos los
--     escribe únicamente el disparador del libro. Ningún rol de cliente, ni
--     siquiera service_role, los escribe directamente.

-- ---------------------------------------------------------------------------
-- Logros

create type public.achievement_trigger as enum (
  'visit_island', 'find_buoy', 'collect_objects', 'complete_circuit',
  'time_played', 'buy_ticket', 'rescue_character', 'deliver_character'
);
create type public.achievement_scope as enum ('global', 'season');

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text not null check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Versión de la definición (REQ-ADM-022): cambiar la condición de un logro
  -- ya obtenido es crear key_version + 1, no editar esta fila.
  key_version integer not null default 1 check (key_version > 0),
  supersedes_id uuid references public.achievements (id),
  title text not null,
  description text,
  trigger_type public.achievement_trigger not null,
  trigger_params jsonb not null default '{}'::jsonb check (jsonb_typeof(trigger_params) = 'object'),
  scope public.achievement_scope not null default 'global',
  season_id uuid references public.seasons (id) on delete restrict,
  points integer not null default 0 check (points >= 0),
  coins integer not null default 0 check (coins >= 0),
  cosmetic_key text,
  icon_key text,
  is_secret boolean not null default false,
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  is_sample boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, key_version),
  check ((scope = 'season') = (season_id is not null)),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create trigger achievements_touch before update on public.achievements
  for each row execute function private.touch_version();
create trigger achievements_audit after insert or update or delete on public.achievements
  for each row execute function private.audit_row('id');

alter table public.achievements enable row level security;
revoke all on public.achievements from anon, authenticated, service_role;
grant select on public.achievements to anon, authenticated;
-- is_active (publicar o retirar) no es del cliente: funciones auditadas (T08).
grant insert (
  id, key, key_version, supersedes_id, title, description, trigger_type, trigger_params,
  scope, season_id, points, coins, cosmetic_key, icon_key, is_secret, starts_at, ends_at, created_by
) on public.achievements to authenticated;
grant update (
  title, description, trigger_type, trigger_params, scope, season_id, points, coins,
  cosmetic_key, icon_key, is_secret, starts_at, ends_at
) on public.achievements to authenticated;
grant select, insert, update, delete on public.achievements to service_role;

create policy achievements_read_public on public.achievements
  for select to anon, authenticated
  using (is_active and not is_secret);

create policy achievements_staff_read on public.achievements
  for select to authenticated
  using ((select private.has_staff_role('editor')));

create policy achievements_staff_insert on public.achievements
  for insert to authenticated
  with check ((select private.has_staff_role('editor')) and created_by = (select auth.uid()));

create policy achievements_staff_update on public.achievements
  for update to authenticated
  using ((select private.has_staff_role('editor')))
  with check ((select private.has_staff_role('editor')));

-- ---------------------------------------------------------------------------
-- Compras. id viaja a la ticketera como metadata.internal_id (D-06); el
-- estado sólo lo cambia el webhook verificado (service_role).

create type public.purchase_status as enum ('pending', 'confirmed', 'refunded', 'cancelled');

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event_id uuid not null references public.events (id) on delete restrict,
  provider text not null,
  provider_order_id text,
  status public.purchase_status not null default 'pending',
  quantity integer not null default 1 check (quantity > 0),
  confirmed_at timestamptz,
  refunded_at timestamptz,
  cancelled_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_order_id),
  check (status <> 'confirmed' or confirmed_at is not null)
);
create index purchases_user_idx on public.purchases (user_id);
create index purchases_event_idx on public.purchases (event_id);

create trigger purchases_touch before update on public.purchases
  for each row execute function private.touch_version();
create trigger purchases_audit after insert or update or delete on public.purchases
  for each row execute function private.audit_row('id');

alter table public.purchases enable row level security;
revoke all on public.purchases from anon, authenticated, service_role;
grant select on public.purchases to authenticated;
grant select, insert, update on public.purchases to service_role;

create policy purchases_read_own on public.purchases
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('admin')));

-- ---------------------------------------------------------------------------
-- Libro de transacciones

create type public.ledger_kind as enum (
  'world_reward', 'achievement', 'stamp', 'cosmetic', 'adjustment', 'compensation'
);

create table public.ledger_transactions (
  -- Id estable e idempotente: lo fija quien concede, no hay valor por defecto.
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.ledger_kind not null,
  points_delta integer not null default 0,
  coins_delta integer not null default 0,
  season_id uuid references public.seasons (id),
  achievement_id uuid references public.achievements (id),
  event_id uuid references public.events (id),
  purchase_id uuid references public.purchases (id),
  cosmetic_key text,
  compensates_id uuid unique references public.ledger_transactions (id),
  -- Origen legible: object_key del mundo, id del aviso de la ticketera…
  source_ref text,
  reason text,
  created_by uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  check (kind <> 'world_reward' or (source_ref is not null and points_delta >= 0 and coins_delta >= 0
    and points_delta + coins_delta > 0)),
  check (kind <> 'achievement' or (achievement_id is not null and points_delta >= 0 and coins_delta >= 0)),
  check (kind <> 'stamp' or (event_id is not null and purchase_id is not null
    and points_delta >= 0 and coins_delta >= 0)),
  -- Gastar monedas nunca reduce puntos (REQ-IDE-027).
  check (kind <> 'cosmetic' or (cosmetic_key is not null and points_delta = 0 and coins_delta <= 0)),
  check (kind <> 'adjustment' or (reason is not null and created_by is not null)),
  check (kind <> 'compensation' or (compensates_id is not null and reason is not null)),
  check (kind = 'compensation' or compensates_id is null)
);
create index ledger_user_idx on public.ledger_transactions (user_id, created_at desc);
create index ledger_season_idx on public.ledger_transactions (season_id);
create index ledger_achievement_idx on public.ledger_transactions (achievement_id);
create index ledger_event_idx on public.ledger_transactions (event_id);
create index ledger_purchase_idx on public.ledger_transactions (purchase_id);

-- Saldos derivados. Puntos (prestigio, ranking) y monedas (gastables) van
-- separados (REQ-IDE-027): los puntos son públicos, las monedas privadas.

create table public.point_balances (
  user_id uuid primary key references auth.users (id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);
create index point_balances_rank_idx on public.point_balances (points desc);

create table public.coin_balances (
  user_id uuid primary key references auth.users (id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  updated_at timestamptz not null default now()
);

-- Puntuación de temporada (REQ-ARQ-008).
create table public.season_points (
  season_id uuid not null references public.seasons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now(),
  primary key (season_id, user_id)
);
create index season_points_rank_idx on public.season_points (season_id, points desc);
create index season_points_user_idx on public.season_points (user_id);

create table public.user_achievements (
  tx_id uuid primary key references public.ledger_transactions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id),
  awarded_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by_tx uuid references public.ledger_transactions (id) on delete cascade
);
create unique index user_achievements_once on public.user_achievements (user_id, achievement_id)
  where revoked_at is null;
create index user_achievements_achievement_idx on public.user_achievements (achievement_id);

-- Sello del evento en el Carnet (REQ-IDE-021), una vez por evento.
create table public.stamps (
  tx_id uuid primary key references public.ledger_transactions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id),
  purchase_id uuid not null references public.purchases (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by_tx uuid references public.ledger_transactions (id) on delete cascade
);
create unique index stamps_once on public.stamps (user_id, event_id) where revoked_at is null;
create index stamps_event_idx on public.stamps (event_id);
create index stamps_purchase_idx on public.stamps (purchase_id);

create table public.user_cosmetics (
  tx_id uuid primary key references public.ledger_transactions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  cosmetic_key text not null,
  unlocked_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by_tx uuid references public.ledger_transactions (id) on delete cascade
);
create unique index user_cosmetics_once on public.user_cosmetics (user_id, cosmetic_key)
  where revoked_at is null;

-- Antes de insertar: completa lo que el libro decide por sí mismo.
create function private.ledger_prepare() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  orig public.ledger_transactions;
  ach public.achievements;
  pur public.purchases;
begin
  if new.kind = 'compensation' then
    select * into orig from public.ledger_transactions where id = new.compensates_id;
    if not found then
      raise exception 'La transacción que se compensa no existe' using errcode = '23503';
    end if;
    if orig.kind = 'compensation' then
      raise exception 'Una compensación no se compensa: se registra una transacción nueva'
        using errcode = '23514';
    end if;
    if orig.user_id <> new.user_id then
      raise exception 'La compensación tiene que ser de la misma cuenta' using errcode = '23514';
    end if;
    new.points_delta := -orig.points_delta;
    new.coins_delta := -orig.coins_delta;
    new.season_id := orig.season_id;
    return new;
  end if;

  if new.kind = 'achievement' then
    select * into ach from public.achievements where id = new.achievement_id;
    -- Desactivar un logro sólo evita concesiones nuevas (REQ-ADM-022).
    if not found or not ach.is_active
       or (ach.starts_at is not null and now() < ach.starts_at)
       or (ach.ends_at is not null and now() >= ach.ends_at) then
      raise exception 'El logro no está activo' using errcode = '23514';
    end if;
    -- La recompensa la fija la definición, no quien concede.
    new.points_delta := ach.points;
    new.coins_delta := ach.coins;
    if ach.scope = 'season' then
      new.season_id := ach.season_id;
    end if;
  end if;

  if new.kind = 'stamp' then
    select * into pur from public.purchases where id = new.purchase_id;
    if not found or pur.status <> 'confirmed' or pur.user_id is distinct from new.user_id
       or pur.event_id <> new.event_id then
      raise exception 'El sello exige una compra confirmada de esta cuenta y este evento'
        using errcode = '23514';
    end if;
  end if;

  if new.season_id is null then
    new.season_id := (select s.id from public.seasons s where s.is_active);
  end if;
  return new;
end;
$$;

-- Después de insertar: aplica la transacción a lo derivado.
create function private.ledger_apply() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  orig public.ledger_transactions;
begin
  if new.points_delta <> 0 then
    insert into public.point_balances as b (user_id, points)
    values (new.user_id, new.points_delta)
    on conflict (user_id) do update set points = b.points + excluded.points, updated_at = now();
    if new.season_id is not null then
      insert into public.season_points as sp (season_id, user_id, points)
      values (new.season_id, new.user_id, new.points_delta)
      on conflict (season_id, user_id) do update
        set points = sp.points + excluded.points, updated_at = now();
    end if;
  end if;

  if new.coins_delta <> 0 then
    insert into public.coin_balances as b (user_id, coins)
    values (new.user_id, new.coins_delta)
    on conflict (user_id) do update set coins = b.coins + excluded.coins, updated_at = now();
  end if;

  case new.kind
    when 'achievement' then
      insert into public.user_achievements (tx_id, user_id, achievement_id)
      values (new.id, new.user_id, new.achievement_id);
    when 'stamp' then
      insert into public.stamps (tx_id, user_id, event_id, purchase_id)
      values (new.id, new.user_id, new.event_id, new.purchase_id);
    when 'cosmetic' then
      insert into public.user_cosmetics (tx_id, user_id, cosmetic_key)
      values (new.id, new.user_id, new.cosmetic_key);
    when 'compensation' then
      select * into orig from public.ledger_transactions where id = new.compensates_id;
      update public.user_achievements set revoked_at = now(), revoked_by_tx = new.id
        where tx_id = orig.id;
      update public.stamps set revoked_at = now(), revoked_by_tx = new.id
        where tx_id = orig.id;
      update public.user_cosmetics set revoked_at = now(), revoked_by_tx = new.id
        where tx_id = orig.id;
    else
      null;
  end case;
  return null;
end;
$$;

revoke all on function private.ledger_prepare() from public;
revoke all on function private.ledger_apply() from public;

create trigger ledger_prepare before insert on public.ledger_transactions
  for each row execute function private.ledger_prepare();
create trigger ledger_apply after insert on public.ledger_transactions
  for each row execute function private.ledger_apply();
-- Sin UPDATE nunca; el DELETE sólo llega en cascada al borrar la cuenta
-- (procedimiento manual, REQ-ADM-031): ningún rol de API tiene DELETE.
create trigger ledger_no_update before update on public.ledger_transactions
  for each row execute function private.forbid_change();
create trigger ledger_no_truncate before truncate on public.ledger_transactions
  for each statement execute function private.forbid_change();

alter table public.ledger_transactions enable row level security;
revoke all on public.ledger_transactions from anon, authenticated, service_role;
grant select on public.ledger_transactions to authenticated;
grant select, insert on public.ledger_transactions to service_role;

create policy ledger_read_own on public.ledger_transactions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('admin')));

-- Derivados: lectura según privacidad; escritura sólo por el disparador.
alter table public.point_balances enable row level security;
revoke all on public.point_balances from anon, authenticated, service_role;
grant select on public.point_balances to anon, authenticated, service_role;
create policy point_balances_read on public.point_balances
  for select to anon, authenticated using (true);

alter table public.coin_balances enable row level security;
revoke all on public.coin_balances from anon, authenticated, service_role;
grant select on public.coin_balances to authenticated, service_role;
create policy coin_balances_read_own on public.coin_balances
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('admin')));

alter table public.season_points enable row level security;
revoke all on public.season_points from anon, authenticated, service_role;
grant select on public.season_points to anon, authenticated, service_role;
create policy season_points_read on public.season_points
  for select to anon, authenticated using (true);

-- Logros, sellos y cosméticos vigentes son parte del Carnet público.
alter table public.user_achievements enable row level security;
revoke all on public.user_achievements from anon, authenticated, service_role;
grant select on public.user_achievements to anon, authenticated, service_role;
create policy user_achievements_read on public.user_achievements
  for select to anon, authenticated
  using (revoked_at is null or user_id = (select auth.uid()));

alter table public.stamps enable row level security;
revoke all on public.stamps from anon, authenticated, service_role;
grant select on public.stamps to anon, authenticated, service_role;
create policy stamps_read on public.stamps
  for select to anon, authenticated
  using (revoked_at is null or user_id = (select auth.uid()));

alter table public.user_cosmetics enable row level security;
revoke all on public.user_cosmetics from anon, authenticated, service_role;
grant select on public.user_cosmetics to anon, authenticated, service_role;
create policy user_cosmetics_read on public.user_cosmetics
  for select to anon, authenticated
  using (revoked_at is null or user_id = (select auth.uid()));

-- Un logro secreto se ve cuando ya es tuyo.
create policy achievements_read_obtained on public.achievements
  for select to authenticated
  using (exists (
    select 1 from public.user_achievements ua
    where ua.achievement_id = achievements.id
      and ua.user_id = (select auth.uid())
      and ua.revoked_at is null
  ));

-- La condición y la recompensa de un logro ya concedido no cambian
-- (REQ-ADM-022): se crea key_version + 1.
create function private.guard_achievement() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.key, new.key_version, new.trigger_type, new.trigger_params, new.scope, new.season_id,
      new.points, new.coins, new.cosmetic_key)
     is distinct from
     (old.key, old.key_version, old.trigger_type, old.trigger_params, old.scope, old.season_id,
      old.points, old.coins, old.cosmetic_key)
     and exists (select 1 from public.user_achievements where achievement_id = old.id)
  then
    raise exception 'El logro ya se ha concedido: crea una versión nueva en vez de cambiar su condición'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_achievement() from public;

create trigger achievements_guard before update on public.achievements
  for each row execute function private.guard_achievement();
