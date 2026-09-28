import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type ArtManifest,
  MISSING_SKIN_ASSET,
  MUESTRA_SKIN,
  PRUEBA_SKIN,
  SAMPLE_MAP,
  type SharedMapInput,
  WORLD_REGISTRY,
  WorldRegistry,
  parseArtManifest,
  parseShipManifest,
} from '@boia/world';
import { describe, expect, it } from 'vitest';
import { IDLE_INPUT } from '../ship/controller';
import { readShipStyleIndex, resolveShipStyle, shipSkins } from '../ship-style';
import { DiscoveryTracker, discoveryTargets } from '../ui/discovery';
import { MemoryRewardStore } from './rewards';
import { simulate } from './simulate';
import { resolveObjectVisual, shipArtScale } from './visual';

/**
 * Varios mundos en el motor (T17, D-20): el mismo mapa, otra piel. El motor
 * dibuja cada mundo con su arte y su barco; lo que se ha hecho va por id de
 * lugar y sobrevive al cambio.
 */

const ART = fileURLToPath(new URL('../../../../art/', import.meta.url));
const readJson = (rel: string): unknown =>
  JSON.parse(readFileSync(path.join(ART, rel), 'utf8')) as unknown;

function library(ids: Iterable<string>): Map<string, ArtManifest> {
  const m = new Map<string, ArtManifest>();
  for (const id of ids) {
    if (id.startsWith('placeholder:')) continue;
    const r = parseArtManifest(readJson(`${id}/manifest.json`));
    if (!r.ok) throw new Error(`${id}: ${r.error}`);
    m.set(id, r.manifest);
  }
  return m;
}

const worlds = WORLD_REGISTRY.ids().map((id) => WORLD_REGISTRY.get(id));
const shipIndex = readShipStyleIndex(readJson('barco/manifest.json'));
const scale = shipArtScale(null);

describe('dos mundos sobre el mismo mapa', () => {
  it('dibujan los mismos lugares, cada uno con su arte', () => {
    expect(worlds.length).toBeGreaterThanOrEqual(2);
    const visuals = worlds.map((w) => {
      const lib = library(w.config.objects.map((o) => o.appearance.asset));
      return new Map(
        w.config.objects.map((o) => [o.identity.id, resolveObjectVisual(o, lib, scale)]),
      );
    });
    const [a, b] = visuals as [(typeof visuals)[0], (typeof visuals)[0]];
    expect([...a.keys()]).toEqual([...b.keys()]);
    for (const v of [...a.values(), ...b.values()]) expect(v.kind).toBe('sprite');
    const assetOf = (m: typeof a, id: string) => {
      const v = m.get(id)!;
      return v.kind === 'sprite' ? v.assetId : null;
    };
    const differ = [...a.keys()].filter((id) => assetOf(a, id) !== assetOf(b, id));
    expect(differ.length).toBeGreaterThan(0);
    // Lo que cambia es el dibujo, no el sitio.
    for (const id of a.keys()) {
      const pos = worlds.map((w) => w.config.objects.find((o) => o.identity.id === id)!.position);
      expect(pos[1]).toEqual(pos[0]);
    }
  });

  it('cada mundo lleva su estilo de barco de art/barco, con sus skins', () => {
    const styles = worlds.map((w) => resolveShipStyle(shipIndex, w.theme.ship.style));
    styles.forEach((s, i) => expect(s.id).toBe(worlds[i]!.theme.ship.style));
    expect(new Set(styles.map((s) => s.id)).size).toBe(worlds.length);
    for (const s of styles) {
      const file = path.join(ART, 'barco', s.manifest);
      expect(existsSync(file), file).toBe(true);
      const m = parseShipManifest(JSON.parse(readFileSync(file, 'utf8')));
      expect(m.ok && shipSkins(m.manifest).length).toBeGreaterThan(0);
    }
  });

  it('un lugar sin skin se dibuja con el marcador «sin-skin» a su tamaño', () => {
    const places = { ...PRUEBA_SKIN.places };
    delete places['isla-primavera'];
    const r = new WorldRegistry(SAMPLE_MAP, [{ ...PRUEBA_SKIN, places }]);
    const o = r.get('prueba').config.objects.find((x) => x.identity.id === 'isla-primavera')!;
    expect(o.appearance.asset).toBe(MISSING_SKIN_ASSET);
    const v = resolveObjectVisual(o, new Map(), scale);
    expect(v).toMatchObject({ kind: 'placeholder', shape: 'sin-skin', reason: 'placeholder' });
    expect(v.kind === 'placeholder' && v.radius).toBe(o.geometry.collision!.radius);
  });
});

describe('cambiar de mundo conserva el progreso por id de lugar', () => {
  it('lo descubierto en un mundo sigue descubierto en el otro', () => {
    const [a, b] = worlds as [(typeof worlds)[0], (typeof worlds)[0]];
    const inA = new DiscoveryTracker(discoveryTargets(a.config));
    const island = inA.targets.find((t) => t.kind === 'island')!;
    expect(inA.update(island).map((t) => t.id)).toContain(island.id);

    const inB = new DiscoveryTracker(discoveryTargets(b.config), inA.discovered());
    expect(inB.isDiscovered(island.id)).toBe(true);
    // El nombre es el del mundo nuevo; el id y el sitio, los mismos.
    const t = inB.targets.find((x) => x.id === island.id)!;
    expect({ x: t.x, y: t.y }).toEqual({ x: island.x, y: island.y });
    expect(inB.update(t)).toEqual([]);
  });

  it('una recompensa «una vez» cobrada en un mundo no se vuelve a dar en el otro', () => {
    // Un mapa con una sola boia que premia al acercarse, y dos mundos encima.
    const map: SharedMapInput = {
      ...SAMPLE_MAP,
      places: [
        {
          id: 'boia-premio',
          name: 'Boia con premio',
          category: 'boia',
          position: { x: 500, y: 2300 },
          geometry: { collision: { shape: 'circle', radius: 10 }, proximityRadius: 200 },
          behaviors: [
            { type: 'proximity' },
            { type: 'reward', params: { kind: 'coins', amount: 5, frequency: 'once' } },
          ],
        },
      ],
    };
    const r = new WorldRegistry(map, [
      { ...MUESTRA_SKIN, places: { 'boia-premio': { asset: 'boia-tutorial' } } },
      { ...PRUEBA_SKIN, places: { 'boia-premio': { asset: 'boia-tutorial' } }, names: {} },
    ]);
    const rewards = new MemoryRewardStore();
    const sail = (id: string) =>
      simulate(r.get(id).config, { seconds: 0.5, input: () => IDLE_INPUT, rewards }).events.filter(
        (e) => e.type === 'reward',
      );
    expect(sail('muestra')).toHaveLength(1);
    expect(sail('prueba')).toHaveLength(0);
    expect(sail('muestra')).toHaveLength(0);
  });
});
