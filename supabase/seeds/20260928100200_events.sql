-- Muestra (REQ-ARQ-006): temporada, isla y eventos de ejemplo. Todo lleva
-- is_sample = true y slug «muestra-…»; se retira con
-- supabase/sample/remove-sample.sql. Reejecutable.

insert into public.seasons (id, slug, name, is_active, is_sample) values
  ('a0000000-0000-4000-8000-000000000001', 'muestra-temporada-1', 'Temporada de muestra', true, true)
on conflict (id) do nothing;

insert into public.islands (id, slug, name, summary, is_sample) values
  ('a1000000-0000-4000-8000-000000000001', 'muestra-isla-fiesta', 'Isla de muestra',
   'Isla de ejemplo para probar eventos por proximidad.', true)
on conflict (id) do nothing;

-- Un evento por estado relevante del ciclo: a la venta, próximamente,
-- finalizado en la misma isla (historial) y un borrador.
insert into public.events (
  id, slug, title, state, published_at, starts_at, ends_at, description, venue_public,
  lineup, ticket_url, ticket_provider, island_id, is_sample
) values
  ('a2000000-0000-4000-8000-000000000001', 'muestra-all-day-otono', 'All Day BOIA (muestra)', 'on_sale',
   '2026-09-01T10:00:00Z', '2026-11-14T12:00:00+01:00', '2026-11-15T02:00:00+01:00',
   'Evento de muestra a la venta.', 'Alicante', '["Alba Fitz", "DJ Alpina", "Nat"]',
   'https://example.com/tickets/muestra-all-day-otono', 'sandbox',
   'a1000000-0000-4000-8000-000000000001', true),
  ('a2000000-0000-4000-8000-000000000002', 'muestra-all-day-invierno', 'All Day BOIA invierno (muestra)', 'coming_soon',
   '2026-09-01T10:00:00Z', '2027-02-13T12:00:00+01:00', '2027-02-14T02:00:00+01:00',
   'Evento de muestra próximamente.', 'Alicante', '[]', null, null, null, true),
  ('a2000000-0000-4000-8000-000000000003', 'muestra-all-day-verano', 'All Day BOIA verano (muestra)', 'finished',
   '2026-05-01T10:00:00Z', '2026-07-18T12:00:00+02:00', '2026-07-19T02:00:00+02:00',
   'Evento de muestra ya finalizado en la misma isla.', 'Alicante', '["Marabina"]', null, null,
   'a1000000-0000-4000-8000-000000000001', true),
  ('a2000000-0000-4000-8000-000000000004', 'muestra-borrador', 'Borrador (muestra)', 'draft',
   null, null, null, 'Evento de muestra sin publicar.', null, '[]', null, null, null, true)
on conflict (id) do nothing;
