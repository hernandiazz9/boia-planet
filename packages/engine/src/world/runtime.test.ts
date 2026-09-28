import {
  type BehaviorInput,
  type RewardFrequency,
  COLLISION_DEFAULTS,
  DIALOGUE_INTERVAL,
  type WorldObjectInput,
  parseWorldConfig,
} from '@boia/world';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SHIP_CONFIG as cfg } from '../ship/config';
import { IDLE_INPUT, type ShipInput, shipSpeed } from '../ship/controller';
import type { WorldEvent } from './events';
import { MemoryRewardStore } from './rewards';
import { WorldRuntime } from './runtime';
import { simulate } from './simulate';

const DT = 1 / 60;
const north: ShipInput = { dirX: 0, dirY: -1, throttle: 1, drift: false };
const south: ShipInput = { dirX: 0, dirY: 1, throttle: 1, drift: false };
/** Rumbo hacia un punto: para volver a un objeto tras alejarse. */
const toward = (s: { x: number; y: number }, x: number, y: number): ShipInput => ({
  dirX: x - s.x,
  dirY: y - s.y,
  throttle: 1,
  drift: false,
});

function obj(
  id: string,
  x: number,
  y: number,
  geometry: WorldObjectInput['geometry'],
  behaviors: BehaviorInput[],
): WorldObjectInput {
  return {
    identity: { id, name: id, category: 'prueba' },
    appearance: { asset: 'placeholder:prueba' },
    position: { x, y },
    geometry,
    behaviors,
  };
}

function world(...objects: WorldObjectInput[]) {
  return parseWorldConfig({
    id: 'prueba',
    version: 0,
    bounds: { left: 0, right: 4000, top: -20000, bottom: 4000 },
    objects,
  });
}

const circle = (radius: number) => ({ shape: 'circle' as const, radius });
const ofType = <T extends WorldEvent['type']>(events: WorldEvent[], type: T) =>
  events.filter((e): e is Extract<WorldEvent, { type: T }> => e.type === type);

describe('COLISIÓN', () => {
  it('ralentizar quita su intensidad a la velocidad durante su duración y después se recupera', () => {
    const w = world(
      obj('cocodrilo', 500, 1000, { collision: circle(30) }, [
        { type: 'collision', params: { mode: 'slow', intensity: 0.6, duration: 2 } },
      ]),
    );
    const rule = w.objects[0]!.behaviors[0]!;
    if (rule.type !== 'collision') throw new Error('tipo');
    const { intensity, duration } = rule.params;
    const limit = cfg.maxSpeed * (1 - intensity!);

    const r = simulate(w, { seconds: 8, start: { x: 500, y: 1600 }, input: () => north });
    const hit = r.trace.findIndex((s) => s.events.some((e) => e.type === 'effect'));
    expect(hit).toBeGreaterThan(0);
    const before = r.trace[hit - 1]!;
    expect(Math.hypot(before.vx, before.vy)).toBeCloseTo(cfg.maxSpeed, 3);
    // No es sólido: el barco lo atraviesa (el cocodrilo no bloquea).
    expect(COLLISION_DEFAULTS.slow.solid).toBe(false);

    const steps = Math.round(duration / DT);
    for (let i = hit + 1; i < hit + steps - 1; i++) {
      const s = r.trace[i]!;
      expect(Math.hypot(s.vx, s.vy)).toBeLessThanOrEqual(limit + 1e-6);
    }
    // Pasada la duración vuelve a acelerar por encima del límite.
    const after = r.trace[hit + steps + 30]!;
    expect(Math.hypot(after.vx, after.vy)).toBeGreaterThan(limit + 1);
    expect(ofType(r.events, 'effect')).toEqual([
      { type: 'effect', objectId: 'cocodrilo', effect: 'slow', factor: 1 - intensity!, duration },
    ]);
  });

  it('bloquear y rebotar no dejan pasar; rebotar devuelve velocidad y bloquear no', () => {
    const run = (mode: 'block' | 'bounce') => {
      const w = world(
        obj('roca', 500, 1000, { collision: circle(40) }, [
          { type: 'collision', params: { mode } },
        ]),
      );
      let maxBack = 0;
      const r = simulate(w, {
        seconds: 4,
        start: { x: 500, y: 1400 },
        input: (t) => (t < 2.2 ? north : IDLE_INPUT),
      });
      for (const s of r.trace) {
        expect(Math.hypot(s.x - 500, s.y - 1000)).toBeGreaterThanOrEqual(40 + cfg.radius - 1e-6);
        maxBack = Math.max(maxBack, s.vy);
      }
      return maxBack;
    };
    expect(run('bounce')).toBeGreaterThan(cfg.maxSpeed * COLLISION_DEFAULTS.bounce.intensity * 0.5);
    expect(run('block')).toBeLessThan(1);
  });

  it('frenar quita su intensidad a la velocidad en el choque', () => {
    const w = world(
      obj('tronco', 500, 1000, { collision: circle(30) }, [
        { type: 'collision', params: { mode: 'brake', intensity: 0.5 } },
      ]),
    );
    const r = simulate(w, { seconds: 3, start: { x: 500, y: 1500 }, input: () => north });
    const e = ofType(r.events, 'effect');
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ effect: 'brake', factor: 0.5 });
  });

  it('boost suma su intensidad a la velocidad máxima durante su duración', () => {
    const w = world(
      obj('flecha', 500, 1000, { activation: circle(30) }, [
        { type: 'collision', params: { mode: 'boost', intensity: 0.5, duration: 2 } },
      ]),
    );
    const r = simulate(w, { seconds: 5, start: { x: 500, y: 1500 }, input: () => north });
    const hit = r.trace.findIndex((s) => s.events.some((e) => e.type === 'effect'));
    const s = r.trace[hit + 10]!;
    expect(Math.hypot(s.vx, s.vy)).toBeCloseTo(cfg.maxSpeed * 1.5, 3);
    const later = r.trace[hit + Math.round(2 / DT) + 5]!;
    expect(Math.hypot(later.vx, later.vy)).toBeLessThanOrEqual(cfg.maxSpeed + 1e-6);
  });
});

describe('PROXIMIDAD', () => {
  it('entrar y salir disparan una vez cada uno, aunque el barco dude en el borde', () => {
    const w = world(obj('isla', 500, 1000, { proximityRadius: 200 }, [{ type: 'proximity' }]));
    const hysteresis = (() => {
      const b = w.objects[0]!.behaviors[0]!;
      return b.type === 'proximity' ? b.params.hysteresis : 0;
    })();
    const rt = new WorldRuntime(w);
    const ship = { x: 500, y: 1400, vx: 0, vy: 0, heading: 0, drifting: false };
    const path: number[] = [];
    // Entrar, dudar ±(histéresis/2) en el borde, salir, volver a entrar y salir.
    const edge = 1000 + 200;
    for (let y = 1400; y >= 1100; y -= 5) path.push(y);
    for (let i = 0; i < 40; i++) path.push(edge + (i % 2 ? 1 : -1) * (hysteresis / 2));
    for (let y = 1100; y <= 1400; y += 5) path.push(y);
    for (let y = 1400; y >= 1100; y -= 5) path.push(y);
    for (let y = 1100; y <= 1400; y += 5) path.push(y);
    const events: WorldEvent[] = [];
    for (const y of path) {
      ship.y = y;
      rt.step(ship, cfg, DT);
      events.push(...rt.drainEvents());
    }
    // Dos visitas: dos entradas y dos salidas, alternadas; la duda no cuenta.
    expect(ofType(events, 'proximity_enter')).toHaveLength(2);
    expect(ofType(events, 'proximity_exit')).toHaveLength(2);
    const onlyOnce = events.map((e) => e.type).join(',');
    expect(onlyOnce).toBe('proximity_enter,proximity_exit,proximity_enter,proximity_exit');
  });

  it('dentro y fuera sin oscilar: exactamente una entrada y una salida', () => {
    const w = world(obj('isla', 500, 1000, { proximityRadius: 200 }, [{ type: 'proximity' }]));
    const r = simulate(w, { seconds: 12, start: { x: 500, y: 1500 }, input: () => north });
    expect(ofType(r.events, 'proximity_enter')).toHaveLength(1);
    expect(ofType(r.events, 'proximity_exit')).toHaveLength(1);
  });
});

describe('DIÁLOGO', () => {
  const lines = ['uno', 'dos', 'tres'];
  const boia = (extra: Record<string, unknown> = {}) =>
    world(
      obj('boia', 500, 1000, { proximityRadius: 150 }, [
        { type: 'proximity' },
        { type: 'dialogue', params: { lines, ...extra } },
      ]),
    );
  const stay = { x: 500, y: 1050 };

  it('avanza cada 1,5 s y termina tras la última línea', () => {
    const w = boia();
    const b = w.objects[0]!.behaviors[1]!;
    const interval = b.type === 'dialogue' ? b.params.interval : NaN;
    expect(interval).toBe(DIALOGUE_INTERVAL);
    expect(DIALOGUE_INTERVAL).toBe(1.5);
    const r = simulate(w, { seconds: 6, start: stay, input: () => IDLE_INPUT });
    const shown = r.trace.flatMap((s) =>
      s.events.filter((e) => e.type === 'dialogue_line').map((e) => ({ step: s.step, e })),
    );
    expect(shown.map((x) => (x.e.type === 'dialogue_line' ? x.e.text : ''))).toEqual(lines);
    const gaps = shown.slice(1).map((x, i) => (x.step - shown[i]!.step) * DT);
    for (const g of gaps) expect(g).toBeCloseTo(interval, 6);
    const end = r.trace.find((s) => s.events.some((e) => e.type === 'dialogue_end'))!;
    expect((end.step - shown.at(-1)!.step) * DT).toBeCloseTo(interval, 6);
    expect(ofType(r.events, 'dialogue_end')).toEqual([
      { type: 'dialogue_end', objectId: 'boia', reason: 'completed' },
    ]);
  });

  it('tocar avanza al instante y saltar lo cierra entero', () => {
    const r = simulate(boia(), {
      seconds: 3,
      start: stay,
      input: () => IDLE_INPUT,
      before: (_t, rt, step) => {
        if (step === 10) rt.advanceDialogue();
        if (step === 20) rt.skipDialogue();
      },
    });
    const lineSteps = r.trace.filter((s) => s.events.some((e) => e.type === 'dialogue_line'));
    expect(lineSteps.map((s) => s.step)).toEqual([0, 10]);
    expect(ofType(r.events, 'dialogue_end')).toEqual([
      { type: 'dialogue_end', objectId: 'boia', reason: 'skipped' },
    ]);
    expect(r.runtime.dialogue()).toBeNull();
  });

  it('si el barco se aleja, reacciona con su texto y se interrumpe; al volver empieza de nuevo', () => {
    const w = boia({ leaveReaction: '¡Vuelve!' });
    const r = simulate(w, {
      seconds: 12,
      start: { ...stay, heading: Math.PI / 2 },
      input: (t, s) => (t < 0.2 ? IDLE_INPUT : t < 3 ? south : toward(s, 500, 1000)),
    });
    const kinds = r.events
      .filter((e) => e.type.startsWith('dialogue'))
      .map((e) =>
        e.type === 'dialogue_line'
          ? `line:${e.index}`
          : e.type === 'dialogue_end'
            ? `end:${e.reason}`
            : e.type,
      );
    expect(kinds.slice(0, 3)).toEqual(['line:0', 'dialogue_reaction', 'end:interrupted']);
    expect(ofType(r.events, 'dialogue_reaction')[0]!.text).toBe('¡Vuelve!');
    // Interrumpido no cuenta como visto: al volver arranca otra vez desde la primera.
    expect(kinds[3]).toBe('line:0');
  });

  it('con once, terminado o saltado no se repite al volver', () => {
    const w = boia({ once: true });
    const r = simulate(w, {
      seconds: 10,
      start: { ...stay, heading: Math.PI / 2 },
      input: (t, s) => (t < 0.5 ? IDLE_INPUT : t < 4 ? south : toward(s, 500, 1000)),
      before: (_t, rt, step) => {
        if (step === 5) rt.skipDialogue();
      },
    });
    expect(ofType(r.events, 'proximity_enter').length).toBeGreaterThanOrEqual(2);
    expect(ofType(r.events, 'dialogue_line')).toHaveLength(1);
  });

  it('las señales de las líneas llegan a la interfaz (menú y minimapa)', () => {
    const w = boia({
      lines: [
        'hola',
        { text: 'minimapa', cue: 'pulse_minimap' },
        { text: 'menú', cue: 'pulse_menu' },
      ],
    });
    const r = simulate(w, { seconds: 5, start: stay, input: () => IDLE_INPUT });
    expect(ofType(r.events, 'dialogue_line').map((e) => e.cue ?? null)).toEqual([
      null,
      'pulse_minimap',
      'pulse_menu',
    ]);
  });
});

describe('RECOGIBLE y RECOMPENSA', () => {
  const restos = (frequency: RewardFrequency, respawn?: number) =>
    world(
      obj('restos', 500, 1000, { activation: circle(12) }, [
        { type: 'collectible', params: respawn === undefined ? {} : { respawn } },
        { type: 'reward', params: { kind: 'coins', amount: 5, frequency } },
      ]),
    );
  // Ida y vuelta sobre el objeto varias veces.
  const zigzag = (t: number): ShipInput => (Math.floor(t / 2.5) % 2 === 0 ? north : south);
  const session = (
    w: ReturnType<typeof restos>,
    rewards: MemoryRewardStore,
    sessionId: string,
    seasonId = 't1',
  ) =>
    simulate(w, {
      seconds: 15,
      start: { x: 500, y: 1250 },
      input: zigzag,
      rewards,
      sessionId,
      seasonId,
    });

  it('desaparece al pasar por encima y sólo reaparece si tiene respawn', () => {
    const once = session(restos('repeatable'), new MemoryRewardStore(), 's1');
    expect(ofType(once.events, 'collected')).toHaveLength(1);
    expect(once.runtime.objectState('restos')!.present).toBe(false);
    const again = session(restos('repeatable', 1), new MemoryRewardStore(), 's1');
    expect(ofType(again.events, 'collected').length).toBeGreaterThan(2);
    expect(ofType(again.events, 'appeared').length).toBeGreaterThan(1);
  });

  it.each([
    // [frecuencia, premios en sesión 1, en sesión 2 (misma temporada), en sesión 3 (otra temporada)]
    ['once', 1, 0, 0],
    ['session', 1, 1, 1],
    ['season', 1, 0, 1],
  ] as const)('%s: concede exactamente según su política', (frequency, s1, s2, s3) => {
    const store = new MemoryRewardStore();
    const w = restos(frequency, 1);
    const a = session(w, store, 's1');
    const b = session(w, store, 's2');
    const c = session(w, store, 's3', 't2');
    expect(ofType(a.events, 'collected').length).toBeGreaterThan(2);
    expect(ofType(a.events, 'reward')).toHaveLength(s1);
    expect(ofType(b.events, 'reward')).toHaveLength(s2);
    expect(ofType(c.events, 'reward')).toHaveLength(s3);
  });

  it('repeatable concede en cada recogida, con clave null', () => {
    const r = session(restos('repeatable', 1), new MemoryRewardStore(), 's1');
    const rewards = ofType(r.events, 'reward');
    expect(rewards).toHaveLength(ofType(r.events, 'collected').length);
    expect(rewards.every((e) => e.key === null && e.amount === 5)).toBe(true);
  });
});

describe('CONTENIDO, TICKET, LOGRO', () => {
  const isla = () =>
    world(
      obj('isla', 500, 1000, { collision: circle(100), proximityRadius: 300 }, [
        { type: 'collision', params: { mode: 'block' } },
        { type: 'proximity' },
        { type: 'content', params: { target: 'event', ref: 'ev-1' } },
        { type: 'ticket', params: { eventId: 'ev-1' } },
        { type: 'achievement', params: { trigger: 'visit_island' } },
      ]),
    );

  it('entrar abre el panel del evento y lo cierra al salir', () => {
    const r = simulate(isla(), {
      seconds: 8,
      start: { x: 700, y: 1500 },
      input: (t) => (t < 2.5 ? north : south),
    });
    const types = r.events.map((e) => e.type);
    expect(types).toContain('content_open');
    expect(types.indexOf('content_close')).toBeGreaterThan(types.indexOf('content_open'));
    expect(ofType(r.events, 'content_open')[0]).toMatchObject({ target: 'event', ref: 'ev-1' });
    expect(ofType(r.events, 'ticket')).toEqual([
      { type: 'ticket', objectId: 'isla', eventId: 'ev-1' },
    ]);
    expect(ofType(r.events, 'achievement')[0]).toMatchObject({
      trigger: 'visit_island',
      amount: 1,
    });
  });

  it('TICKET no aparece si el evento ya no está a la venta', () => {
    const r = simulate(isla(), {
      seconds: 4,
      start: { x: 700, y: 1500 },
      input: () => north,
      ticketAvailable: () => false,
    });
    expect(ofType(r.events, 'content_open')).toHaveLength(1);
    expect(ofType(r.events, 'ticket')).toHaveLength(0);
  });
});

describe('CHECKPOINT, TELETRANSPORTE, SPAWN, DECORATIVO, INICIAR_MINIJUEGO', () => {
  it('el checkpoint valida el paso y da un boost de su duración', () => {
    const w = world(
      obj('bandera', 500, 1000, { activation: circle(40) }, [
        { type: 'checkpoint', params: { circuitId: 'c1', order: 2 } },
      ]),
    );
    const r = simulate(w, { seconds: 4, start: { x: 500, y: 1400 }, input: () => north });
    expect(ofType(r.events, 'checkpoint')).toEqual([
      { type: 'checkpoint', objectId: 'bandera', circuitId: 'c1', order: 2 },
    ]);
    expect(ofType(r.events, 'effect')[0]).toMatchObject({ effect: 'boost', duration: 2 });
  });

  it('el teletransporte nunca deja el barco dentro de tierra ni fuera del mapa', () => {
    const w = world(
      obj('portal', 500, 1000, { activation: circle(20) }, [
        { type: 'teleport', params: { x: 2000, y: 2000 } },
      ]),
      obj('isla', 2000, 2000, { collision: circle(150) }, [
        { type: 'collision', params: { mode: 'block' } },
      ]),
    );
    const r = simulate(w, { seconds: 3, start: { x: 500, y: 1300 }, input: () => north });
    const tp = ofType(r.events, 'teleport')[0]!;
    expect(Math.hypot(tp.x - 2000, tp.y - 2000)).toBeGreaterThanOrEqual(150 + cfg.radius);
    const rt = new WorldRuntime(w);
    rt.step({ x: 0, y: 0, vx: 0, vy: 0, heading: 0, drifting: false }, cfg, DT);
    const out = rt.safePoint(-500, 99999);
    expect(out.x).toBeGreaterThanOrEqual(rt.bounds.left + cfg.radius);
    expect(out.y).toBeLessThanOrEqual(rt.bounds.bottom - cfg.radius);
  });

  it('spawn: la misma semilla da las mismas apariciones; vida y frecuencia se cumplen', () => {
    const w = world(
      obj('cofre', 500, 1000, { activation: circle(20) }, [
        {
          type: 'spawn',
          params: {
            probability: 0.5,
            positions: [
              { x: 100, y: 100 },
              { x: 200, y: 200 },
              { x: 300, y: 300 },
            ],
            lifetime: 3,
            every: 2,
          },
        },
      ]),
    );
    const run = (seed: number) =>
      simulate(w, {
        seconds: 60,
        start: { x: 3000, y: 3000 },
        input: () => IDLE_INPUT,
        seed,
      }).events.map((e) =>
        e.type === 'appeared' ? `+${e.x}` : e.type === 'disappeared' ? '-' : e.type,
      );
    expect(run(7)).toEqual(run(7));
    const seq = run(7);
    expect(seq.filter((s) => s.startsWith('+')).length).toBeGreaterThan(3);
    expect(new Set(seq.filter((s) => s.startsWith('+'))).size).toBeGreaterThan(1);
  });

  it('decorativo no interactúa; INICIAR_MINIJUEGO existe y no hay ningún juego en L1', () => {
    const w = world(
      obj('palmera', 500, 1100, { collision: circle(30) }, [{ type: 'decorative' }]),
      obj('faro', 500, 900, { activation: circle(30) }, [
        { type: 'start_minigame', params: { gameId: 'vigilancia-faro' } },
      ]),
    );
    const r = simulate(w, { seconds: 4, start: { x: 500, y: 1300 }, input: () => north });
    // La palmera no es sólida: pasa por encima sin rebote ni efecto.
    expect(ofType(r.events, 'effect')).toHaveLength(0);
    expect(r.trace.some((s) => Math.hypot(s.x - 500, s.y - 1100) < 10)).toBe(true);
    expect(ofType(r.events, 'minigame')).toEqual([
      { type: 'minigame', objectId: 'faro', gameId: 'vigilancia-faro', available: false },
    ]);
  });

  it('el runtime aplica los efectos a la física que devuelve shipConfig', () => {
    const rt = new WorldRuntime(world());
    expect(rt.shipConfig(cfg)).toBe(cfg);
    expect(shipSpeed({ x: 0, y: 0, vx: 3, vy: 4, heading: 0, drifting: false })).toBe(5);
  });
});
