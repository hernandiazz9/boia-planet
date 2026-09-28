import { describe, expect, it } from 'vitest';
import {
  BEHAVIOR_CATALOG,
  BEHAVIOR_TYPES,
  Behavior,
  COLLISION_DEFAULTS,
  COLLISION_MODES,
  DIALOGUE_INTERVAL,
} from './behaviors';
import { WorldObject } from './schema';

/** Parámetros mínimos de los comportamientos que tienen alguno obligatorio. */
const REQUIRED: Partial<Record<(typeof BEHAVIOR_TYPES)[number], Record<string, unknown>>> = {
  ticket: { eventId: 'ev' },
  teleport: { x: 0, y: 0 },
  achievement: { trigger: 'visit_island' },
};

describe('catálogo de comportamientos v1 (§48.3)', () => {
  it('tiene los 12 módulos de L1 más INICIAR_MINIJUEGO', () => {
    expect(BEHAVIOR_TYPES).toEqual([
      'collision',
      'proximity',
      'dialogue',
      'collectible',
      'reward',
      'content',
      'ticket',
      'checkpoint',
      'teleport',
      'spawn',
      'achievement',
      'decorative',
      'start_minigame',
    ]);
    for (const t of BEHAVIOR_TYPES) expect(BEHAVIOR_CATALOG[t].label.length).toBeGreaterThan(0);
  });

  it.each(BEHAVIOR_TYPES)('%s: con los parámetros mínimos es válido y rellena el resto', (type) => {
    const params = REQUIRED[type];
    const r = Behavior.safeParse(params ? { type, params } : { type });
    expect(r.success).toBe(true);
  });

  it('COLISIÓN admite los cinco modos y cada uno tiene intensidad y solidez por defecto', () => {
    expect(COLLISION_MODES).toEqual(['block', 'bounce', 'brake', 'slow', 'boost']);
    for (const mode of COLLISION_MODES) {
      expect(Behavior.parse({ type: 'collision', params: { mode } }).params).toMatchObject({
        mode,
      });
      expect(COLLISION_DEFAULTS[mode].intensity).toBeGreaterThanOrEqual(0);
    }
  });

  it('el diálogo va a 1,5 s por bocadillo por defecto y acepta líneas con señal', () => {
    const b = Behavior.parse({
      type: 'dialogue',
      params: { lines: ['hola', { text: 'menú', cue: 'pulse_menu' }] },
    });
    if (b.type !== 'dialogue') throw new Error('tipo');
    expect(b.params.interval).toBe(DIALOGUE_INTERVAL);
    expect(b.params.lines).toEqual([{ text: 'hola' }, { text: 'menú', cue: 'pulse_menu' }]);
  });

  it('limita los parámetros a rangos seguros (§48.8)', () => {
    const bad = [
      { type: 'collision', params: { intensity: 1.5 } },
      { type: 'collision', params: { duration: 60 } },
      { type: 'dialogue', params: { interval: 0.1 } },
      { type: 'dialogue', params: { lines: ['x'.repeat(141)] } },
      { type: 'reward', params: { amount: -1 } },
      { type: 'reward', params: { frequency: 'daily' } },
      { type: 'spawn', params: { probability: 2 } },
      { type: 'ticket', params: {} },
    ];
    for (const b of bad) expect(Behavior.safeParse(b).success, JSON.stringify(b)).toBe(false);
  });

  it('el objeto exige la geometría que su comportamiento necesita', () => {
    const o = {
      identity: { id: 'x', name: 'x', category: 'x' },
      appearance: { asset: 'placeholder:x' },
      position: { x: 0, y: 0 },
    };
    expect(
      WorldObject.safeParse({ ...o, geometry: {}, behaviors: [{ type: 'proximity' }] }).success,
    ).toBe(false);
    expect(
      WorldObject.safeParse({
        ...o,
        geometry: { proximityRadius: 100 },
        behaviors: [{ type: 'proximity' }],
      }).success,
    ).toBe(true);
    expect(
      WorldObject.safeParse({ ...o, geometry: {}, behaviors: [{ type: 'collision' }] }).success,
    ).toBe(false);
  });
});
