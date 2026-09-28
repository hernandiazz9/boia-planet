-- Muestra: objetos del mundo en borrador y una revisión publicada y activa.
-- La forma de `data` y `snapshot` es la de @boia/world (WorldObject,
-- WorldConfig). Reejecutable.

update public.seasons
set world_draft = '{"bounds": {"left": -1200, "right": 1200, "top": -1600, "bottom": 400},
                    "spawn": {"x": 0, "y": 200, "heading": -1.5707963267948966},
                    "sectors": []}'::jsonb
where id = 'a0000000-0000-4000-8000-000000000001' and world_draft = '{}'::jsonb;

insert into public.world_objects (id, season_id, object_key, category, island_id, data, is_sample) values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'muestra-boia-tutorial', 'boia', null,
   '{"identity": {"id": "muestra-boia-tutorial", "name": "Boia tutorial", "category": "boia", "tags": ["muestra"], "active": true},
     "appearance": {"asset": "placeholder:circle", "scale": 1, "rotation": 0, "layer": "object", "depth": 0},
     "position": {"x": 0, "y": 0, "orientation": 0},
     "geometry": {"collision": {"shape": "circle", "radius": 12}, "proximityRadius": 90},
     "behaviors": [{"type": "dialogue", "params": {}}]}'::jsonb, true),
  ('a3000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'muestra-isla-fiesta', 'isla', 'a1000000-0000-4000-8000-000000000001',
   '{"identity": {"id": "muestra-isla-fiesta", "name": "Isla de muestra", "category": "isla", "tags": ["muestra"], "active": true},
     "appearance": {"asset": "placeholder:circle", "scale": 1, "rotation": 0, "layer": "ground", "depth": 0},
     "position": {"x": 400, "y": -700, "orientation": 0},
     "geometry": {"collision": {"shape": "circle", "radius": 140}, "proximityRadius": 320},
     "behaviors": [{"type": "proximity", "params": {}}, {"type": "content", "params": {}}]}'::jsonb, true),
  ('a3000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'muestra-roca-1', 'obstaculo', null,
   '{"identity": {"id": "muestra-roca-1", "name": "Roca", "category": "obstaculo", "tags": ["muestra"], "active": true},
     "appearance": {"asset": "placeholder:circle", "scale": 1, "rotation": 0, "layer": "object", "depth": 0},
     "position": {"x": -300, "y": -300, "orientation": 0},
     "geometry": {"collision": {"shape": "circle", "radius": 30}},
     "behaviors": [{"type": "collision", "params": {"mode": "block"}}]}'::jsonb, true)
on conflict (id) do nothing;

insert into public.world_revisions (
  id, season_id, number, status, schema_version, snapshot, note, published_at, is_sample
)
select
  'a4000000-0000-4000-8000-000000000001', s.id, 1, 'published', 0,
  jsonb_build_object(
    'id', 'muestra-temporada-1',
    'version', 1,
    'bounds', s.world_draft -> 'bounds',
    'spawn', s.world_draft -> 'spawn',
    'sectors', s.world_draft -> 'sectors',
    'objects', (
      select jsonb_agg(o.data order by o.object_key)
      from public.world_objects o
      where o.season_id = s.id and o.deleted_at is null and o.enabled
    )
  ),
  'Revisión de muestra', '2026-09-28T10:00:00Z', true
from public.seasons s
where s.id = 'a0000000-0000-4000-8000-000000000001'
on conflict (id) do nothing;

update public.seasons
set active_world_revision_id = 'a4000000-0000-4000-8000-000000000001'
where id = 'a0000000-0000-4000-8000-000000000001'
  and active_world_revision_id is null;
