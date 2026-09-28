-- Fixture de pruebas: una compra confirmada y transacciones del libro.
-- Depende de la muestra (evento y logros). Reejecutable: los ids son fijos
-- y un id repetido no vuelve a disparar nada.

insert into public.purchases (id, user_id, event_id, provider, provider_order_id, status, confirmed_at) values
  ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001',
   'a2000000-0000-4000-8000-000000000001', 'sandbox', 'order-1', 'confirmed', '2026-09-28T10:00:00Z')
on conflict (id) do nothing;

insert into public.ledger_transactions (id, user_id, kind, points_delta, coins_delta, source_ref) values
  ('f2000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'world_reward', 5, 3,
   'muestra-boia-tutorial')
on conflict (id) do nothing;

insert into public.ledger_transactions (id, user_id, kind, achievement_id) values
  ('f2000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', 'achievement',
   'a7000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.ledger_transactions (id, user_id, kind, event_id, purchase_id, source_ref) values
  ('f2000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001', 'stamp',
   'a2000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'sandbox:order-1')
on conflict (id) do nothing;
