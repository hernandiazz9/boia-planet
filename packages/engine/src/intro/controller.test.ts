import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_INTRO_CONFIG as CFG } from './config';
import {
  IntroController,
  MAX_FRAME_STEP_MS,
  type IntroOutcome,
  type IntroSceneHandle,
} from './controller';
import { realAssets } from './test-fixtures';
import { landingCamera, type IntroFrame, type IntroMode } from './timeline';

const geometry = realAssets();
const VP = { width: 360, height: 640 };

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
function setup(mode: IntroMode = 'intro', opts: { sceneFails?: boolean; elapsed?: number } = {}) {
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
    config: CFG,
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
  return { c, advance, sceneReady, sceneFails, play, landed, startGame, createScene };
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

describe('máquina de estados de la entrada', () => {
  it('primera visita: carga, reproduce y llega a la landing sin input', async () => {
    const h = setup();
    h.c.start();
    expect(h.c.phase).toBe('waiting');
    const scene = await h.sceneReady();
    expect(h.c.phase).toBe('playing');
    h.play(CFG.durationMs + 50);
    expect(h.c.phase).toBe('landed');
    expect(h.landed).toEqual(['played']);
    expect(h.c.playedMs).toBeGreaterThanOrEqual(CFG.durationMs);
    expect(h.c.playedMs).toBeLessThan(CFG.durationMs + 20);
    expect(scene.frames.at(-1)!.camera).toEqual(landingCamera(CFG, geometry, VP));
    expectInvariants(h);
  });

  it('un tirón largo no se come la animación: sigue donde iba', async () => {
    const h = setup();
    h.c.start();
    await h.sceneReady();
    h.play(300);
    h.advance(2500); // un fotograma de 2,5 s (subida de texturas, móvil lento)
    const f = h.c.render(VP, 0)!;
    expect(f.done).toBe(false);
    expect(f.t).toBeLessThanOrEqual(304 + MAX_FRAME_STEP_MS);
    expect(h.c.phase).toBe('playing');
    h.play(CFG.durationMs);
    expect(h.landed).toEqual(['played']);
    expectInvariants(h);
  });

  it('saltar dos veces (y cinco) lleva una sola vez al mismo estado final', async () => {
    const h = setup();
    h.c.start();
    const scene = await h.sceneReady();
    h.play(500);
    h.c.skip();
    h.c.skip();
    for (let i = 0; i < 3; i++) h.c.skip();
    expect(h.c.phase).toBe('landed');
    expect(h.landed).toEqual(['skipped']);
    h.play(100);
    const last = scene.frames.at(-1)!;
    expect(last.done).toBe(true);
    expect(last.camera).toEqual(landingCamera(CFG, geometry, VP));
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

  it('Atrás / cambio de hash a mitad: termina en la landing, no repite ni duplica', async () => {
    const h = setup();
    h.c.start();
    await h.sceneReady();
    h.play(800);
    h.c.interrupt(); // popstate
    h.c.interrupt(); // hashchange justo después
    expect(h.landed).toEqual(['played']);
    // Volver desde la caché del navegador (pageshow) tampoco repite.
    h.c.interrupt();
    h.c.start();
    expect(h.c.phase).toBe('landed');
    expectInvariants(h);
  });

  it('pestaña oculta a mitad: sin animación pendiente al volver', async () => {
    const h = setup();
    h.c.start();
    const scene = await h.sceneReady();
    h.play(1200);
    h.c.interrupt(); // visibilitychange → hidden
    h.advance(60_000); // la pestaña vuelve mucho después
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
    h.c.interrupt();
    expect(h.c.render(VP, 1)).toBeNull();
    expectInvariants(h);
  });

  it('cambio de ruta tras llegar: se destruye una vez y no queda mundo', async () => {
    const h = setup();
    h.c.start();
    const scene = await h.sceneReady();
    h.play(CFG.durationMs + 20);
    h.c.destroy();
    h.c.destroy();
    expect(scene.destroyed).toBe(1);
    expect(h.c.worldsAlive).toBe(0);
    expectInvariants(h);
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

  it('movimiento reducido: landing al instante y la cámara nunca se mueve', async () => {
    const h = setup('reduced');
    h.c.start();
    expect(h.landed).toEqual(['none']);
    const scene = await h.sceneReady();
    h.play(CFG.reduced.fadeMs + 200);
    const cams = new Set(scene.frames.map((f) => JSON.stringify(f.camera)));
    expect(cams.size).toBe(1);
    expectInvariants(h);
  });

  it('Explorar arranca el juego una vez y sólo desde la landing', async () => {
    const h = setup();
    h.c.start();
    await h.sceneReady();
    expect(h.c.explore()).toBe(false);
    h.play(CFG.durationMs + 20);
    expect(h.c.explore()).toBe(true);
    expect(h.c.explore()).toBe(false);
    expect(h.startGame).toHaveBeenCalledTimes(1);
    expect(h.c.scenesCreated).toBe(1);
  });
});
