import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_INTRO_CONFIG as CFG, type IntroConfig } from './config';
import {
  IntroController,
  MAX_FRAME_STEP_MS,
  type IntroOutcome,
  type IntroSceneHandle,
} from './controller';
import { realGeometry } from './test-fixtures';
import { landingCamera, samePose, type IntroFrame, type IntroMode } from './timeline';

const geometry = realGeometry();
const VP = { width: 360, height: 640 };
const APPEAR = CFG.appear.durationMs;
const LAND = CFG.landing.durationMs;
/** Configuración de prueba con el avance automático encendido. */
const AUTO: IntroConfig = {
  ...CFG,
  pause: { ...CFG.pause, autoAdvance: { enabled: true, afterMs: 8000 } },
};

class FakeScene implements IntroSceneHandle {
  static alive = 0;
  frames: IntroFrame[] = [];
  destroyed = 0;
  constructor() {
    FakeScene.alive++;
  }
  render(f: IntroFrame) {
    this.frames.push(f);
  }
  destroy() {
    this.destroyed++;
    if (this.destroyed === 1) FakeScene.alive--;
  }
}

/** Controlador con reloj, temporizadores y escena de mentira. */
function setup(mode: IntroMode = 'intro', opts: { elapsed?: number; config?: IntroConfig } = {}) {
  FakeScene.alive = 0;
  let now = 0;
  const timers: Array<{ at: number; fn: () => void; cancelled: boolean }> = [];
  const landed: IntroOutcome[] = [];
  const startGame = vi.fn();
  let resolveScene!: (s: FakeScene) => void;
  let rejectScene!: (e: Error) => void;
  const createScene = vi.fn(
    () =>
      new Promise<FakeScene>((res, rej) => {
        resolveScene = res;
        rejectScene = rej;
      }),
  );
  const c = new IntroController<FakeScene>({
    mode,
    config: opts.config ?? CFG,
    geometry,
    now: () => now,
    elapsedSinceBoot: opts.elapsed ?? 0,
    createScene,
    setTimer: (fn, ms) => {
      const t = { at: now + ms, fn, cancelled: false };
      timers.push(t);
      return () => (t.cancelled = true);
    },
    onLanded: (o) => landed.push(o),
    startGame,
  });
  const advance = (ms: number) => {
    now += ms;
    for (const t of timers) {
      if (!t.cancelled && t.at <= now) {
        t.cancelled = true;
        t.fn();
      }
    }
  };
  const sceneReady = async () => {
    const s = new FakeScene();
    resolveScene(s);
    await Promise.resolve();
    await Promise.resolve();
    return s;
  };
  const sceneFails = async () => {
    rejectScene(new Error('sin WebGL'));
    await Promise.resolve();
    await Promise.resolve();
  };
  /** Pinta fotogramas cada 16 ms durante `ms`. */
  const play = (ms: number) => {
    for (let t = 0; t < ms; t += 16) {
      advance(16);
      c.render(VP, now / 1000);
    }
  };
  /** Hasta la pausa: escena lista y la aparición entera. */
  const toPause = async () => {
    c.start();
    const scene = await sceneReady();
    play(APPEAR + 32);
    expect(c.phase).toBe('paused');
    return scene;
  };
  const pending = () => timers.filter((t) => !t.cancelled).length;
  return {
    c,
    advance,
    sceneReady,
    sceneFails,
    play,
    toPause,
    pending,
    landed,
    startGame,
    createScene,
  };
}

/** Invariantes que ningún evento puede romper (REQ-ENT-008, 014, 020). */
function expectInvariants(h: ReturnType<typeof setup>) {
  expect(h.createScene).toHaveBeenCalledTimes(1);
  expect(h.c.scenesCreated).toBe(1);
  expect(h.c.worldsAlive).toBeLessThanOrEqual(1);
  expect(FakeScene.alive).toBeLessThanOrEqual(1);
  expect(h.landed.length).toBeLessThanOrEqual(1);
  expect(h.startGame).not.toHaveBeenCalled();
  expect(h.c.gamesStarted).toBe(0);
}

describe('máquina de estados de la entrada «mini-mundo»', () => {
  it('primera visita: carga → aparición → pausa → (botón) → aterrizaje → landing', async () => {
    const h = setup();
    h.c.start();
    expect(h.c.phase).toBe('waiting');
    const scene = await h.sceneReady();
    expect(h.c.phase).toBe('appearing');
    h.play(APPEAR + 32);
    expect(h.c.phase).toBe('paused');
    expect(h.c.appearedMs).toBeGreaterThanOrEqual(APPEAR);
    expect(h.c.appearedMs).toBeLessThan(APPEAR + 20);
    expect(h.c.enter()).toBe(true);
    expect(h.c.phase).toBe('landing');
    h.play(LAND + 50);
    expect(h.c.phase).toBe('landed');
    expect(h.landed).toEqual(['played']);
    expect(h.c.enteredBy).toBe('button');
    expect(h.c.playedMs).toBeGreaterThanOrEqual(LAND);
    expect(h.c.playedMs).toBeLessThan(LAND + 20);
    expect(scene.frames.at(-1)!.camera).toEqual(landingCamera(CFG, geometry, VP));
    expectInvariants(h);
  });

  it('la pausa nunca avanza sin el botón (configuración de serie: sin avance automático)', async () => {
    const h = setup();
    const scene = await h.toPause();
    h.play(60_000);
    h.advance(10 * 60_000);
    h.play(100);
    expect(h.c.phase).toBe('paused');
    expect(h.landed).toEqual([]);
    expect(h.pending()).toBe(0);
    const last = scene.frames.at(-1)!;
    expect(last.act).toBe('pause');
    expect(last.content).toBe(0);
    expect(last.sphere.k).toBe(1);
    expectInvariants(h);
  });

  it('con el avance automático encendido, aterriza solo tras el tiempo configurado', async () => {
    const h = setup('intro', { config: AUTO });
    await h.toPause();
    h.play(AUTO.pause.autoAdvance.afterMs - 100);
    expect(h.c.phase).toBe('paused');
    h.play(200);
    expect(h.c.phase).toBe('landing');
    expect(h.c.enteredBy).toBe('auto');
    h.play(LAND + 50);
    expect(h.landed).toEqual(['played']);
    expectInvariants(h);
  });

  it('avance automático: tocar la pantalla vuelve a contar desde cero', async () => {
    const h = setup('intro', { config: AUTO });
    await h.toPause();
    const after = AUTO.pause.autoAdvance.afterMs;
    h.play(after - 1000);
    h.c.touch();
    h.play(after - 1000);
    expect(h.c.phase).toBe('paused');
    h.play(1100);
    expect(h.c.phase).toBe('landing');
    expectInvariants(h);
  });

  it('el botón pulsado dos veces (y cinco) aterriza una sola vez', async () => {
    const h = setup();
    const scene = await h.toPause();
    expect(h.c.enter()).toBe(true);
    for (let i = 0; i < 4; i++) expect(h.c.enter()).toBe(false);
    h.play(LAND / 2);
    expect(h.c.enter()).toBe(false);
    h.play(LAND);
    expect(h.c.enter()).toBe(false);
    expect(h.landed).toEqual(['played']);
    // El aterrizaje no volvió a empezar: k nunca sube.
    const ks = scene.frames.filter((f) => f.act === 'landing').map((f) => f.sphere.k);
    expect(ks.every((k, i) => i === 0 || k <= ks[i - 1]!)).toBe(true);
    expectInvariants(h);
  });

  it('el botón no hace nada durante la aparición, antes de la escena ni tras llegar', async () => {
    const h = setup();
    h.c.start();
    expect(h.c.enter()).toBe(false);
    await h.sceneReady();
    h.play(APPEAR / 2);
    expect(h.c.enter()).toBe(false);
    expect(h.c.phase).toBe('appearing');
    h.play(APPEAR);
    h.c.skip();
    expect(h.c.enter()).toBe(false);
    expect(h.c.phase).toBe('landed');
    expectInvariants(h);
  });

  it('«Saltar» durante la pausa: una vez, al mismo estado final', async () => {
    const h = setup();
    const scene = await h.toPause();
    for (let i = 0; i < 5; i++) h.c.skip();
    expect(h.c.phase).toBe('landed');
    expect(h.landed).toEqual(['skipped']);
    h.play(100);
    const last = scene.frames.at(-1)!;
    expect(last.done).toBe(true);
    expect(last.camera).toEqual(landingCamera(CFG, geometry, VP));
    expectInvariants(h);
  });

  it('«Saltar» durante el aterrizaje: una vez, al mismo estado final', async () => {
    const h = setup();
    const scene = await h.toPause();
    h.c.enter();
    h.play(LAND / 3);
    h.c.skip();
    h.c.skip();
    h.c.enter();
    expect(h.landed).toEqual(['skipped']);
    h.play(100);
    expect(scene.frames.at(-1)!.done).toBe(true);
    expectInvariants(h);
  });

  it('saltar antes de que llegue la escena también es idempotente', async () => {
    const h = setup();
    h.c.start();
    h.c.skip();
    h.c.skip();
    const scene = await h.sceneReady();
    expect(h.c.phase).toBe('landed');
    h.play(50);
    expect(scene.frames.every((f) => f.done)).toBe(true);
    expectInvariants(h);
  });

  it('Atrás / cambio de ancla durante la pausa: sale a la landing sin repetir ni duplicar', async () => {
    const h = setup();
    await h.toPause();
    h.c.skip(); // popstate
    h.c.skip(); // hashchange justo después
    // Volver desde la caché del navegador (pageshow) tampoco repite.
    h.c.interrupt();
    h.c.start();
    expect(h.c.phase).toBe('landed');
    expect(h.landed).toEqual(['skipped']);
    expectInvariants(h);
  });

  it('pestaña oculta en la aparición: al volver, pausa con título y botón (no aterriza sola)', async () => {
    const h = setup();
    h.c.start();
    const scene = await h.sceneReady();
    h.play(APPEAR / 2);
    h.c.interrupt(); // visibilitychange → hidden
    expect(h.c.phase).toBe('paused');
    h.advance(60_000);
    h.play(32);
    const last = scene.frames.at(-1)!;
    expect(last.act).toBe('pause');
    expect(last.title).toBe(1);
    expect(last.button).toBe(1);
    expect(h.landed).toEqual([]);
    expectInvariants(h);
  });

  it('pestaña oculta en la pausa: sigue esperando; en el aterrizaje: termina en la landing', async () => {
    const h = setup();
    const scene = await h.toPause();
    h.c.interrupt();
    expect(h.c.phase).toBe('paused');
    h.c.enter();
    h.play(LAND / 2);
    h.c.interrupt();
    h.c.interrupt();
    h.advance(60_000);
    h.play(32);
    expect(scene.frames.at(-1)!.done).toBe(true);
    expect(h.landed).toEqual(['played']);
    expectInvariants(h);
  });

  it('cambio de ruta mientras carga: la escena que llega tarde se destruye', async () => {
    const h = setup();
    h.c.start();
    h.c.destroy();
    h.c.destroy();
    const late = await h.sceneReady();
    expect(late.destroyed).toBe(1);
    expect(h.c.worldsAlive).toBe(0);
    expect(FakeScene.alive).toBe(0);
    expect(h.landed).toEqual([]);
    h.c.skip();
    h.c.enter();
    h.c.interrupt();
    expect(h.c.render(VP, 1)).toBeNull();
    expectInvariants(h);
  });

  it('cambio de ruta en la pausa o en el aterrizaje: se destruye una vez y no queda mundo', async () => {
    for (const during of ['paused', 'landing'] as const) {
      const h = setup('intro', { config: AUTO });
      const scene = await h.toPause();
      if (during === 'landing') {
        h.c.enter();
        h.play(LAND / 2);
      }
      h.c.destroy();
      h.c.destroy();
      h.c.enter();
      h.advance(60_000); // el avance automático ya no dispara
      expect(scene.destroyed).toBe(1);
      expect(h.c.worldsAlive).toBe(0);
      expect(h.c.phase).toBe('destroyed');
      expect(h.pending()).toBe(0);
      expectInvariants(h);
    }
  });

  it('recursos que no llegan a tiempo: landing ligera; si llegan luego, fondo quieto', async () => {
    const h = setup('intro', { elapsed: 500 });
    h.c.start();
    h.advance(CFG.loadBudgetMs - 500);
    expect(h.c.phase).toBe('landed');
    expect(h.landed).toEqual(['none']);
    const scene = await h.sceneReady();
    h.play(50);
    expect(scene.frames.every((f) => f.done)).toBe(true);
    expectInvariants(h);
  });

  it('motor que falla: landing ligera, sin mundo', async () => {
    const h = setup();
    h.c.start();
    await h.sceneFails();
    expect(h.c.phase).toBe('landed');
    expect(h.c.sceneStatus).toBe('failed');
    expect(h.c.worldsAlive).toBe(0);
    expect(h.landed).toEqual(['none']);
    expectInvariants(h);
  });

  it('un tirón largo no se come la aparición: sigue donde iba', async () => {
    const h = setup();
    h.c.start();
    await h.sceneReady();
    h.play(300);
    h.advance(2500); // un fotograma de 2,5 s (subida de texturas, móvil lento)
    const f = h.c.render(VP, 0)!;
    expect(f.act).toBe('appear');
    expect(f.t).toBeLessThanOrEqual(304 + MAX_FRAME_STEP_MS);
    expectInvariants(h);
  });

  it('movimiento reducido: sin aparición; mini-mundo quieto; al pulsar, fundido sin mover nada', async () => {
    const h = setup('reduced');
    h.c.start();
    expect(h.landed).toEqual([]);
    const scene = await h.sceneReady();
    expect(h.c.phase).toBe('paused');
    h.play(3000);
    expect(h.c.phase).toBe('paused');
    expect(h.c.enter()).toBe(true);
    h.play(CFG.reduced.fadeMs + 100);
    expect(h.landed).toEqual(['played']);
    const shown = scene.frames.filter((f) => f.planet > 0);
    expect(shown.every((f) => samePose(f.sphere, shown[0]!.sphere))).toBe(true);
    const cams = new Set(scene.frames.map((f) => JSON.stringify(f.camera)));
    expect(cams.size).toBe(1);
    expect(scene.frames.some((f) => f.act === 'appear')).toBe(false);
    expectInvariants(h);
  });

  it('Explorar arranca el juego una vez y sólo desde la landing', async () => {
    const h = setup();
    await h.toPause();
    expect(h.c.explore()).toBe(false);
    h.c.enter();
    expect(h.c.explore()).toBe(false);
    h.play(LAND + 20);
    expect(h.c.explore()).toBe(true);
    expect(h.c.explore()).toBe(false);
    expect(h.startGame).toHaveBeenCalledTimes(1);
    expect(h.c.scenesCreated).toBe(1);
  });
});
