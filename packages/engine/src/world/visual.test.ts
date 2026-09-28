import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  type ArtManifest,
  SAMPLE_WORLD,
  artFrames,
  parseArtManifest,
  parseShipManifest,
  parseWorldConfig,
} from '@boia/world';
import { describe, expect, it } from 'vitest';
import { SHIP_LENGTH } from '../ship/provisional';
import { bubbleAnchor, resolveObjectVisual, shipArtScale } from './visual';

const ART = fileURLToPath(new URL('../../../../art/', import.meta.url));
const read = (id: string) =>
  JSON.parse(readFileSync(`${ART}${id}/manifest.json`, 'utf8')) as unknown;

function art(...ids: string[]): Map<string, ArtManifest> {
  const m = new Map<string, ArtManifest>();
  for (const id of ids) {
    const r = parseArtManifest(read(id));
    if (!r.ok) throw new Error(r.error);
    m.set(id, r.manifest);
  }
  return m;
}

describe('escala del arte (D-15)', () => {
  it('la eslora del barco en la vista W mide SHIP_LENGTH, ~48 px', () => {
    const r = parseShipManifest(read('barco'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const w = r.manifest.anchors.W;
    const s = shipArtScale(r.manifest);
    expect(Math.hypot(w.bow!.x - w.wake_origin.x, w.bow!.y - w.wake_origin.y) * s).toBeCloseTo(
      SHIP_LENGTH,
      9,
    );
    expect(SHIP_LENGTH).toBe(48);
    // Sin manifiesto, la escala de reserva es la del barco de T01.
    expect(shipArtScale(null)).toBeCloseTo(s, 3);
  });
});

describe('visual de los objetos del mundo de muestra', () => {
  const world = parseWorldConfig(SAMPLE_WORLD);
  const ids = [...new Set(world.objects.map((o) => o.appearance.asset))];
  const lib = art(...ids);
  const scale = shipArtScale(null);

  it('cada objeto usa un recurso de art/ con imágenes', () => {
    for (const o of world.objects) {
      const v = resolveObjectVisual(o, lib, scale);
      expect(v.kind, o.identity.id).toBe('sprite');
    }
  });

  it('la boia tutorial usa su bucle idle y el bocadillo sale de su anclaje', () => {
    const boia = world.objects.find((o) => o.appearance.asset === 'boia-tutorial')!;
    const m = lib.get('boia-tutorial')!;
    const v = resolveObjectVisual(boia, lib, scale);
    if (v.kind !== 'sprite') throw new Error('sprite');
    expect(v.frames).toEqual(artFrames(m, 'idle').files);
    expect(v.frames.length).toBe(m.animations.idle!.frames);
    expect(v.fps).toBe(m.animations.idle!.fps);
    const a = bubbleAnchor(v);
    const pivot = m.pivot_px!;
    expect(a.y).toBeCloseTo((m.anchors.bocadillo!.y - pivot.y) * scale, 9);
  });

  it('las rocas estáticas usan su imagen fija; sin manifiesto, marcador', () => {
    const roca = world.objects.find((o) => o.appearance.asset === 'roca-a')!;
    const v = resolveObjectVisual(roca, lib, scale);
    if (v.kind !== 'sprite') throw new Error('sprite');
    expect(v.frames).toEqual(['base.png']);
    expect(resolveObjectVisual(roca, new Map(), scale)).toMatchObject({
      kind: 'placeholder',
      reason: 'missing',
    });
  });

  it('las costas declaran su línea de colisión para cada lado', () => {
    const r = parseArtManifest(read(world.coast!.asset));
    if (!r.ok) throw new Error(r.error);
    const sides = Object.values(r.manifest.tile!.variants)
      .map((v) => v.land_side)
      .sort();
    expect(sides).toEqual(['left', 'right']);
  });
});
