-- Fixture de pruebas: una botella, su lectura y un reporte. Reejecutable.

insert into public.bottles (id, user_id, message, x, y) values
  ('f3000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001',
   'Hola desde la muestra', 120, -240)
on conflict (id) do nothing;

insert into public.bottle_reads (bottle_id, reader_id) values
  ('f3000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000003')
on conflict do nothing;

insert into public.bottle_reports (id, bottle_id, reporter_id, reason) values
  ('f4000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-000000000002', 'Prueba de reporte')
on conflict (id) do nothing;
