-- Fixture de pruebas (no es semilla): cuentas en el auth.users del shim,
-- Carnets y un propietario del Admin. Sólo existe en bases de prueba.
-- Reejecutable.

insert into auth.users (id, email, is_anonymous) values
  ('f0000000-0000-4000-8000-000000000001', 'miembro1@example.test', false),
  ('f0000000-0000-4000-8000-000000000002', 'miembro2@example.test', false),
  ('f0000000-0000-4000-8000-000000000003', null, true),
  ('f0000000-0000-4000-8000-000000000009', 'owner@example.test', false)
on conflict (id) do nothing;

insert into public.carnets (user_id, nickname) values
  ('f0000000-0000-4000-8000-000000000001', 'Marinera'),
  ('f0000000-0000-4000-8000-000000000002', 'Grumete')
on conflict (user_id) do nothing;

insert into public.carnet_answers (user_id, question_id, question_version, answer) values
  ('f0000000-0000-4000-8000-000000000001', 'buena-fiesta', 1, 'Buena gente y un bajo que se sienta.')
on conflict (user_id, question_id) do nothing;

insert into public.staff_roles (user_id, role) values
  ('f0000000-0000-4000-8000-000000000009', 'owner')
on conflict (user_id) do nothing;
