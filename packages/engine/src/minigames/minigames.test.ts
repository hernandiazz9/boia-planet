import { parseWorldConfig } from '@boia/world';
import { describe, expect, it, vi } from 'vitest';
import { CANON_DEFAULTS, type CanonConfig, CanonSim, canon } from './canon';
import { MinigameController } from './controller';
import {
  FARO_DEFAULTS,
  type FaroConfig,
  FaroSim,
  faro,
  faroFleet,
  faroMinPlausibleMs,
} from './faro';
import { MINIGAME_REGISTRY } from './registry';
import { minigameSkin } from './skin';
import { type MinigameRewardSink, grantMinigameReward } from './rewards';
import { LocalSessionAuthority, type MinigameResult } from './session';
import { canonExpert, canonWaster, faroExpert, faroPanic, idle, playHeadless } from './testing';
import type { BaseConfig, MinigameDefinition } from './types';
import { MemoryStore } from '../ui/storage';
import { simulate } from '../world/simulate';

/** Reloj de la autoridad que avanza con la partida. */
function clock(start = Date.UTC(2026, 8, 29, 18)) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

function setup<C extends BaseConfig>(def: MinigameDefinition<C>, config?: C, seed = 7) {
  const c = clock();
  const granted: Parameters<MinigameRewardSink['grantWorldReward']>[0][] = [];
  const sink: MinigameRewardSink = {
    grantWorldReward: vi.fn(async (input) => {
      granted.push(input);
      return { granted: true };
    }),
  };
  const authority = new LocalSessionAuthority(c.now, () => seed);
  const records = new MemoryStore();
  const controller = new MinigameController({
    def,
    ...(config ? { config } : {}),
    authority,
    sink,
    records,
  });
  return { clock: c, sink, granted, authority, controller, records };
}

const faroWith = (patch: Partial<FaroConfig>): FaroConfig => ({ ...FARO_DEFAULTS, ...patch });
const canonWith = (patch: Partial<CanonConfig>): CanonConfig => ({ ...CANON_DEFAULTS, ...patch });

describe('registro de INICIAR_MINIJUEGO', () => {
  it('con el registro, el motor da `faro` y `canon` por disponibles y nada más', () => {
    expect([...MINIGAME_REGISTRY.keys()]).toEqual(['faro', 'canon']);
    const island = (id: string, x: number, gameId: string) => ({
      identity: { id, name: id, category: 'prueba' },
      appearance: { asset: 'placeholder:prueba' },
      position: { x, y: 900 },
      geometry: { activation: { shape: 'circle' as const, radius: 60 } },
      behaviors: [{ type: 'start_minigame' as const, params: { gameId } }],
    });
    const w = parseWorldConfig({
      id: 'prueba',
      version: 0,
      bounds: { left: 0, right: 4000, top: -20000, bottom: 4000 },
      objects: [
        island('faro', 500, 'faro'),
        island('canon', 1500, 'canon'),
        island('otro', 2500, 'otro'),
      ],
    });
    const seen = (x: number) =>
      simulate(w, {
        seconds: 3,
        start: { x, y: 1200 },
        input: () => ({ dirX: 0, dirY: -1, throttle: 1, drift: false }),
        minigames: MINIGAME_REGISTRY,
      }).events.filter((e) => e.type === 'minigame');
    expect(seen(500)).toEqual([
      { type: 'minigame', objectId: 'faro', gameId: 'faro', available: true },
    ]);
    expect(seen(1500)).toEqual([
      { type: 'minigame', objectId: 'canon', gameId: 'canon', available: true },
    ]);
    expect(seen(2500)).toEqual([
      { type: 'minigame', objectId: 'otro', gameId: 'otro', available: false },
    ]);
  });
});

describe('Vigilancia del faro', () => {
  it('la misma semilla da la misma flota, con los piratas y señuelos de la configuración', () => {
    const a = faroFleet(11, FARO_DEFAULTS);
    expect(faroFleet(11, FARO_DEFAULTS)).toEqual(a);
    expect(a).toHaveLength(FARO_DEFAULTS.fleet.count);
    expect(a.filter((s) => s.kind === 'pirate')).toHaveLength(FARO_DEFAULTS.fleet.pirates);
    expect(a.filter((s) => s.kind === 'decoy')).toHaveLength(FARO_DEFAULTS.fleet.decoys);
    expect(faroFleet(12, FARO_DEFAULTS)).not.toEqual(a);
  });

  it('la bandera sólo se reconoce tras iluminarla el tiempo mínimo', () => {
    const sim = new FaroSim(3, FARO_DEFAULTS);
    const ship = sim.ships[0]!;
    // Adelanta el primer barco al centro de la escena y lo sigue con el haz.
    sim.step(ship.spawnAt, {});
    ship.x = 0.5;
    const steps = Math.floor(FARO_DEFAULTS.identifyS * 60) - 2;
    for (let i = 0; i < steps; i++) sim.step(1 / 60, { aim: { x: ship.x, y: ship.y } });
    expect(sim.isLit(ship)).toBe(true);
    expect(ship.identified).toBe(false);
    for (let i = 0; i < 6; i++) sim.step(1 / 60, { aim: { x: ship.x, y: ship.y } });
    expect(ship.identified).toBe(true);
  });

  it('gana al identificar el objetivo de piratas', async () => {
    const { controller, granted, clock: c } = setup(faro);
    playHeadless(controller, faroExpert, c.advance);
    expect(controller.sim?.ended).toEqual({ outcome: 'won', reason: 'goal' });
    expect(controller.sim?.score).toBe(FARO_DEFAULTS.goal);
    const s = await controller.settling!;
    expect(s.validation).toEqual({ valid: true });
    expect(s.reward).toEqual({
      granted: true,
      points: FARO_DEFAULTS.reward.points,
      coins: FARO_DEFAULTS.reward.coins,
    });
    expect(granted[0]).toMatchObject({
      sourceRef: 'minigame:faro',
      policy: FARO_DEFAULTS.reward.policy,
    });
  });

  it('pierde al agotar las falsas alarmas', async () => {
    const { controller, clock: c, sink } = setup(faro);
    playHeadless(controller, faroPanic, c.advance);
    const sim = controller.sim as FaroSim;
    expect(sim.ended).toEqual({ outcome: 'lost', reason: 'errors' });
    expect(sim.errors).toBe(FARO_DEFAULTS.maxErrors);
    expect((await controller.settling!).reward).toEqual({ granted: false, reason: 'not_won' });
    expect(sink.grantWorldReward).not.toHaveBeenCalled();
  });

  it('pierde al agotar el tiempo', () => {
    const { controller, clock: c } = setup(faro, faroWith({ timeLimitS: 20 }));
    playHeadless(controller, idle, c.advance);
    expect(controller.sim?.ended).toEqual({ outcome: 'lost', reason: 'time' });
    expect(controller.sim!.time).toBeGreaterThanOrEqual(20);
  });

  it('pierde al agotar los barcos, aunque se juegue perfecto', () => {
    const few = faroWith({
      fleet: { ...FARO_DEFAULTS.fleet, count: 6, pirates: FARO_DEFAULTS.goal - 1 },
    });
    const { controller, clock: c } = setup(faro, few);
    playHeadless(controller, faroExpert, c.advance);
    expect(controller.sim?.ended).toEqual({ outcome: 'lost', reason: 'ships' });
    expect(controller.sim?.score).toBe(few.fleet.pirates);
  });

  it('un pirata sin alarma se escapa', () => {
    const sim = new FaroSim(5, FARO_DEFAULTS);
    const events = [];
    while (!sim.ended) events.push(...sim.step(1 / 60, {}));
    expect(events.filter((e) => e.kind === 'escape')).toHaveLength(FARO_DEFAULTS.fleet.pirates);
    expect(sim.ended).toEqual({ outcome: 'lost', reason: 'ships' });
  });
});

describe('Cañón contra tiburones', () => {
  it('gana al ahuyentar el objetivo de tiburones', async () => {
    const { controller, clock: c } = setup(canon);
    playHeadless(controller, canonExpert, c.advance);
    expect(controller.sim?.ended).toEqual({ outcome: 'won', reason: 'goal' });
    expect(controller.sim!.score).toBeGreaterThanOrEqual(CANON_DEFAULTS.goal);
    expect((await controller.settling!).reward.granted).toBe(true);
  });

  it('pierde al agotar la munición', () => {
    const { controller, clock: c } = setup(canon);
    playHeadless(controller, canonWaster, c.advance);
    const sim = controller.sim as CanonSim;
    expect(sim.ended).toEqual({ outcome: 'lost', reason: 'ammo' });
    expect(sim.ammo).toBe(0);
    expect(sim.score).toBeLessThan(CANON_DEFAULTS.goal);
  });

  it('pierde al agotar el tiempo', () => {
    const { controller, clock: c } = setup(canon);
    playHeadless(controller, idle, c.advance);
    expect(controller.sim?.ended).toEqual({ outcome: 'lost', reason: 'time' });
    expect((controller.sim as CanonSim).ammo).toBe(CANON_DEFAULTS.ammo);
  });

  it('un tiburón sumergido no se asusta; uno asustado huye entero y otro ocupa su sitio', () => {
    const sim = new CanonSim(9, canonWith({}));
    const k = sim.sharks[0]!;
    k.submerged = true;
    k.diveTimer = 99;
    k.turnTimer = 99;
    sim.step(1 / 60, { aim: { x: k.x, y: k.y }, action: true });
    for (let i = 0; i < 60; i++) sim.step(1 / 60, { aim: { x: k.x, y: k.y } });
    expect(k.state).toBe('swimming');
    k.submerged = false;
    for (let i = 0; i < 60; i++) sim.step(1 / 60, { aim: { x: k.x, y: k.y }, action: i === 0 });
    expect(k.state).not.toBe('swimming');
    expect(Object.keys(k).some((key) => /herid|wound|hp|health/i.test(key))).toBe(false);
    for (let i = 0; i < 120; i++) sim.step(1 / 60, {});
    expect(sim.sharks.filter((s) => s.state === 'swimming').length).toBe(
      CANON_DEFAULTS.sharks.concurrent,
    );
  });

  it('los patrones de tiburón van por versión', () => {
    const sim = new CanonSim(4, CANON_DEFAULTS);
    for (const k of sim.sharks) expect(['recto', 'zigzag', 'circulo']).toContain(k.pattern);
  });
});

describe('sesión, semilla y duración (REQ-AVE-038)', () => {
  function forged(
    session: { id: string; seed: number; configHash: string },
    patch: Partial<MinigameResult> = {},
  ): MinigameResult {
    return {
      sessionId: session.id,
      gameId: 'faro',
      version: FARO_DEFAULTS.version,
      seed: session.seed,
      configHash: session.configHash,
      outcome: 'won',
      reason: 'goal',
      score: FARO_DEFAULTS.goal,
      elapsedMs: 1500,
      ...patch,
    };
  }

  it('una semilla repetida con una duración imposible no concede nada', async () => {
    const c = clock();
    const authority = new LocalSessionAuthority(c.now, () => 42);
    const sink: MinigameRewardSink = { grantWorldReward: vi.fn(async () => ({ granted: true })) };
    const session = authority.open(faro, FARO_DEFAULTS);
    const min = faroMinPlausibleMs(FARO_DEFAULTS.goal, 42, FARO_DEFAULTS);
    c.advance(FARO_DEFAULTS.timeLimitS * 1000);
    // La misma semilla, la marca máxima, pero en menos tiempo del posible.
    const result = forged(session, { elapsedMs: min / 2 });
    const v = authority.settle(result);
    expect(v).toEqual({ valid: false, reason: 'implausible_duration' });
    expect(await grantMinigameReward(sink, FARO_DEFAULTS.reward, result, v)).toEqual({
      granted: false,
      reason: 'implausible_duration',
    });
    // Repetir la misma sesión, ahora con una duración posible, tampoco.
    const again = authority.settle(forged(session, { elapsedMs: min + 1000 }));
    expect(again).toEqual({ valid: false, reason: 'replayed' });
    // Y la semilla en otra sesión no sirve: cada sesión tiene la suya.
    const other = new LocalSessionAuthority(c.now, () => 43).open(faro, FARO_DEFAULTS);
    expect(authority.settle(forged(session, { sessionId: other.id }))).toEqual({
      valid: false,
      reason: 'unknown_session',
    });
    expect(sink.grantWorldReward).not.toHaveBeenCalled();
  });

  it('no se juega más rápido que el reloj ni más que el límite', () => {
    const c = clock();
    const authority = new LocalSessionAuthority(c.now, () => 42);
    const min = faroMinPlausibleMs(FARO_DEFAULTS.goal, 42, FARO_DEFAULTS);
    const s1 = authority.open(faro, FARO_DEFAULTS);
    c.advance(2000);
    expect(authority.settle(forged(s1, { elapsedMs: min + 100 }))).toEqual({
      valid: false,
      reason: 'implausible_duration',
    });
    const s2 = authority.open(faro, FARO_DEFAULTS);
    c.advance(FARO_DEFAULTS.timeLimitS * 3000);
    expect(authority.settle(forged(s2, { elapsedMs: FARO_DEFAULTS.timeLimitS * 2000 }))).toEqual({
      valid: false,
      reason: 'implausible_duration',
    });
    const s3 = authority.open(faro, FARO_DEFAULTS);
    c.advance(min + 5000);
    expect(authority.settle(forged(s3, { elapsedMs: min + 100 }))).toEqual({ valid: true });
  });

  it('otra semilla, otra versión o una marca imposible no valen', () => {
    const c = clock();
    const authority = new LocalSessionAuthority(c.now, () => 42);
    const ok = { elapsedMs: FARO_DEFAULTS.timeLimitS * 900 };
    c.advance(FARO_DEFAULTS.timeLimitS * 1000);
    const s = () => authority.open(faro, FARO_DEFAULTS);
    expect(authority.settle(forged(s(), { ...ok, seed: 41 })).valid).toBe(false);
    expect(authority.settle(forged(s(), { ...ok, version: 99 })).valid).toBe(false);
    expect(authority.settle(forged(s(), { ...ok, score: 2 }))).toEqual({
      valid: false,
      reason: 'implausible_score',
    });
  });

  it('una partida real dura al menos el mínimo de su semilla', () => {
    for (const seed of [1, 2, 3]) {
      const { controller, clock: c } = setup(faro, undefined, seed);
      playHeadless(controller, faroExpert, c.advance);
      const sim = controller.sim!;
      expect(sim.time * 1000).toBeGreaterThanOrEqual(
        faroMinPlausibleMs(sim.score, seed, FARO_DEFAULTS),
      );
    }
  });

  it('ocultar la pestaña, abandonar, recargar o cambiar la configuración invalidan la marca', async () => {
    // Ocultar: la partida se pausa, puede seguir, pero no da premio.
    const hidden = setup(faro);
    hidden.controller.start();
    hidden.controller.pause('hidden');
    expect(hidden.controller.phase).toBe('paused');
    expect(hidden.controller.counts()).toBe(false);
    hidden.controller.resume();
    playHeadless(hidden.controller, faroExpert, hidden.clock.advance);
    const h = await hidden.controller.settling!;
    expect(h.ending.outcome).toBe('won');
    expect(h.reward).toEqual({ granted: false, reason: 'hidden' });
    expect(hidden.sink.grantWorldReward).not.toHaveBeenCalled();

    // Abandonar: la sesión queda marcada.
    const left = setup(canon);
    left.controller.start();
    const id = left.controller.session!.id;
    left.controller.abandon();
    expect(left.authority.isValid(id)).toBe(false);

    // Recargar: una autoridad nueva no conoce la sesión.
    const reloaded = new LocalSessionAuthority();
    expect(reloaded.settle({ ...forged({ id, seed: 1, configHash: 'x' }) })).toEqual({
      valid: false,
      reason: 'unknown_session',
    });

    // Cambiar la configuración a mitad de partida.
    const c = clock();
    const authority = new LocalSessionAuthority(c.now, () => 7);
    let live: FaroConfig = FARO_DEFAULTS;
    const ctl = new MinigameController({ def: faro, authority, currentConfig: () => live });
    ctl.start();
    live = faroWith({ goal: 2 });
    playHeadless(ctl, faroExpert, c.advance);
    expect((await ctl.settling!).validation).toEqual({ valid: false, reason: 'config_changed' });
  });

  it('la pausa no cuenta como tiempo de juego', () => {
    const { controller } = setup(canon);
    controller.start();
    controller.tick(0.5, {});
    const t = controller.sim!.time;
    controller.pause('user');
    controller.tick(0.5, {});
    expect(controller.sim!.time).toBe(t);
    controller.resume();
    controller.tick(0.1, {});
    expect(controller.sim!.time).toBeGreaterThan(t);
  });

  it('los límites de la regla acotan puntos y monedas; «sólo marca» no concede', async () => {
    const sink: MinigameRewardSink = { grantWorldReward: vi.fn(async () => ({ granted: true })) };
    const result = forged({ id: 'x', seed: 1, configHash: 'h' });
    const rule = { ...FARO_DEFAULTS.reward, points: 999, coins: 999 };
    expect(await grantMinigameReward(sink, rule, result, { valid: true })).toEqual({
      granted: true,
      points: rule.maxPoints,
      coins: rule.maxCoins,
    });
    expect(
      await grantMinigameReward(sink, { ...rule, policy: 'record_only' }, result, { valid: true }),
    ).toEqual({ granted: false, reason: 'record_only' });
  });

  it('la marca personal sólo sube con partidas válidas', async () => {
    const a = setup(faro);
    playHeadless(a.controller, faroExpert, a.clock.advance);
    const s = await a.controller.settling!;
    expect(s.newBest).toBe(true);
    expect(s.best).toBe(FARO_DEFAULTS.goal);
  });
});

describe('dibujo en el estilo de cada mundo', () => {
  /** Un contexto 2D que acepta cualquier llamada y cuenta los trazos. */
  function fakeCtx() {
    let calls = 0;
    const target: Record<string, unknown> = {};
    const ctx: unknown = new Proxy(target, {
      get(t, key) {
        if (typeof key === 'string' && key in t) return t[key];
        return () => {
          calls++;
          return { addColorStop: () => {} };
        };
      },
      set(t, key, value) {
        if (typeof key === 'string') t[key] = value;
        return true;
      },
    });
    return { ctx: ctx as CanvasRenderingContext2D, calls: () => calls };
  }

  const theme = {
    sea: { base: '#112233', wave: '#223344', crest: '#ffffff' },
    ui: { accent: '#ff0000', onAccent: '#000000' },
  };

  it.each(['arcilla', 'acuarela', 'otro'])(
    '%s: los dos juegos se pintan de principio a fin',
    (worldId) => {
      const skin = minigameSkin(worldId, theme);
      const games = [
        [faro, faroExpert],
        [canon, canonExpert],
      ] as const;
      for (const [def, bot] of games) {
        for (const reducedMotion of [false, true]) {
          const { controller, clock: c } = setup(def as unknown as MinigameDefinition<BaseConfig>);
          controller.start();
          for (let i = 0; controller.phase === 'playing'; i++) {
            c.advance(1000 / 60);
            controller.tick(1 / 60, bot(controller.sim!));
            if (i % 10) continue;
            const f = fakeCtx();
            controller.sim!.draw(f.ctx, 360, 520, skin, { reducedMotion, clock: i / 60 });
            expect(f.calls()).toBeGreaterThan(20);
          }
          expect(controller.phase).toBe('ended');
        }
      }
    },
  );

  it('Arcilla y Acuarela tienen su estilo; otro mundo toma su mar y su acento', () => {
    expect(minigameSkin('arcilla').style).toBe('clay');
    expect(minigameSkin('acuarela').style).toBe('wash');
    expect(minigameSkin('otro', theme)).toMatchObject({
      style: 'plain',
      sea: theme.sea.base,
      accent: theme.ui.accent,
    });
  });
});
