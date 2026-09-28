-- Muestra: bloques de la home y una revisión publicada y activa. Reejecutable.

insert into public.home_blocks (id, block_type, position, config, is_sample) values
  ('a5000000-0000-4000-8000-000000000001', 'hero', 0,
   '{"title": "BOIA.PLANET", "subtitle": "Texto de muestra", "cta_explore": "Explorar", "cta_tickets": "Tickets"}', true),
  ('a5000000-0000-4000-8000-000000000002', 'priority_event', 1,
   '{"event_id": "a2000000-0000-4000-8000-000000000001"}', true),
  ('a5000000-0000-4000-8000-000000000003', 'upcoming_events', 2, '{}', true),
  ('a5000000-0000-4000-8000-000000000004', 'artists', 3, '{}', true),
  ('a5000000-0000-4000-8000-000000000005', 'philosophy', 4, '{}', true),
  ('a5000000-0000-4000-8000-000000000006', 'photos', 5, '{}', true),
  ('a5000000-0000-4000-8000-000000000007', 'store', 6, '{}', true),
  ('a5000000-0000-4000-8000-000000000008', 'contact', 7, '{}', true),
  ('a5000000-0000-4000-8000-000000000009', 'footer', 8, '{}', true)
on conflict (id) do nothing;

insert into public.home_revisions (id, number, status, snapshot, note, published_at, is_sample)
select
  'a6000000-0000-4000-8000-000000000001', 1, 'published',
  jsonb_build_object('blocks', (
    select jsonb_agg(
      jsonb_build_object('id', b.id, 'type', b.block_type, 'config', b.config) order by b.position
    )
    from public.home_blocks b
    where b.is_visible and b.is_sample
  )),
  'Home de muestra', '2026-09-28T10:00:00Z', true
on conflict (id) do nothing;

update public.site_settings
set active_home_revision_id = 'a6000000-0000-4000-8000-000000000001'
where active_home_revision_id is null;
