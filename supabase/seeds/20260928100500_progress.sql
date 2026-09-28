-- Muestra: logros de ejemplo tomados de la v14 §14 (la lista de lanzamiento
-- la aprueba Álvaro, REQ-IDE-025). Reejecutable.

insert into public.achievements (
  id, key, title, description, trigger_type, trigger_params, points, coins, is_secret, is_active, is_sample
) values
  ('a7000000-0000-4000-8000-000000000001', 'muestra-primera-boia', 'Primera boia (muestra)',
   'Encuentra tu primera boia.', 'find_buoy', '{"count": 1}', 10, 5, false, true, true),
  ('a7000000-0000-4000-8000-000000000002', 'muestra-isla-descubierta', 'Isla descubierta (muestra)',
   'Llega a la isla del evento.', 'visit_island',
   '{"island_id": "a1000000-0000-4000-8000-000000000001"}', 20, 10, false, true, true),
  ('a7000000-0000-4000-8000-000000000003', 'muestra-entrada-comprada', 'Entrada comprada (muestra)',
   'Compra una entrada de un evento.', 'buy_ticket', '{}', 50, 0, false, true, true),
  ('a7000000-0000-4000-8000-000000000004', 'muestra-secreto', 'Secreto (muestra)',
   'Un logro escondido.', 'collect_objects', '{"count": 3}', 15, 15, true, true, true)
on conflict (id) do nothing;
