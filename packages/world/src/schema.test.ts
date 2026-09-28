import { describe, expect, it } from 'vitest';
import { parseWorldConfig, WorldConfig } from './schema';

const minimalObject = {
  identity: { id: 'roca-1', name: 'Roca', category: 'obstaculo' },
  appearance: { asset: 'placeholder:roca' },
  position: { x: 10, y: 20 },
  geometry: { collision: { shape: 'circle', radius: 30 } },
};

const base = {
  id: 'mundo-demo',
  version: 0,
  bounds: { left: 0, right: 1000, top: 0, bottom: 2000 },
};

describe('WorldConfig v0', () => {
  it('acepta un objeto sólo con las cuatro partes obligatorias y rellena valores por defecto', () => {
    const w = parseWorldConfig({ ...base, objects: [minimalObject] });
    const o = w.objects[0]!;
    expect(o.identity.active).toBe(true);
    expect(o.appearance.scale).toBe(1);
    expect(o.behaviors).toEqual([]);
    expect(w.sectors).toEqual([]);
  });

  it('acepta comportamientos del catálogo y rellena sus parámetros por defecto', () => {
    const w = parseWorldConfig({
      ...base,
      objects: [
        { ...minimalObject, behaviors: [{ type: 'collision', params: { mode: 'bounce' } }] },
      ],
    });
    expect(w.objects[0]!.behaviors[0]).toEqual({
      type: 'collision',
      params: { mode: 'bounce', duration: 2 },
    });
  });

  it('rechaza un comportamiento que el motor no conoce (REQ-MUN-027)', () => {
    expect(
      WorldConfig.safeParse({
        ...base,
        objects: [{ ...minimalObject, behaviors: [{ type: 'rebotar', params: {} }] }],
      }).success,
    ).toBe(false);
  });

  it.each(['identity', 'appearance', 'position', 'geometry'] as const)(
    'rechaza un objeto sin %s',
    (part) => {
      const o: Record<string, unknown> = { ...minimalObject };
      delete o[part];
      expect(WorldConfig.safeParse({ ...base, objects: [o] }).success).toBe(false);
    },
  );

  it('rechaza límites invertidos e IDs repetidos', () => {
    expect(
      WorldConfig.safeParse({ ...base, bounds: { left: 10, right: 0, top: 0, bottom: 1 } }).success,
    ).toBe(false);
    expect(
      WorldConfig.safeParse({ ...base, objects: [minimalObject, minimalObject] }).success,
    ).toBe(false);
  });
});
