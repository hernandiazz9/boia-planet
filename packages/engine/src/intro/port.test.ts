import { DIRECTIONS, WORLD_REGISTRY, directionHeading, worldToScreen } from '@boia/world';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_INTRO_CONFIG as CFG, pickFraming } from './config';
import { IntroController, type IntroSceneHandle } from './controller';
import {
  GAME_BOTTOM_LAND_PX,
  onScreen,
  portCamera,
  revealCamera,
  shipViewFor,
  validateWorldIntro,
  type IntroPoints,
  type WorldIntro,
} from './port';
import { realAssets } from './test-fixtures';
import { landingCamera, type IntroFrame, type IntroMode } from './timeline';
import { worldIntroSetup } from './world-geometry';

/** Entrada de prueba: los datos de cada mundo viven en la web (`lib/intro/worlds.ts`). */
const INTRO: WorldIntro = {
  arrival: [
    { minWidth: 0, zoom: 1.3, anchor: [0.5, 0.3] },
    { minWidth: 900, zoom: 1.45, anchor: [0.5, 0.34] },
  ],
  miniWorld: { span: 2400, reach: 2600 },
  explore: { durationMs: 1300, easing: 'easeInOutSine' },
};

// El mundo activo por defecto (Arcilla) sobre el mapa compartido, con sus puntos.
const map = WORLD_REGISTRY.map;
const world = WORLD_REGISTRY.get(WORLD_REGISTRY.defaultId).config;
const POINTS: IntroPoints = {
  landing: map.introLanding,
  spawn: map.spawn,
  port: map.port ?? map.spawn,
};
const setup = worldIntroSetup(world, CFG, INTRO, POINTS, realAssets().artScale)!;

const MOBILE = { width: 360, height: 640 };
const DESKTOP = { width: 1280, height: 720 };

class FakeScene implements IntroSceneHandle {
  frames: IntroFrame[] = [];
  constructor(
    readonly view = { config: setup.config, geometry: setup.geometry, reveal: setup.reveal },
  ) {}
  render(f: IntroFrame) {
    this.frames.push(f);
  }
  destroy() {}
}

/** Controlador ya en la landing del mundo activo, con reloj de mentira. */
async function landed(mode: IntroMode = 'direct') {
  let now = 0;
  const startGame = vi.fn();
  const scene = new FakeScene();
  // Como la web: la página trae la entrada del mundo por defecto y la escena, la de este navegador.
  const c = new IntroController<FakeScene>({
    mode,
    config: CFG,
    geometry: setup.geometry,
    reveal: null,
    now: () => now,
    elapsedSinceBoot: 0,
    createScene: () => Promise.resolve(scene),
    setTimer: () => () => {},
    onLanded: () => {},
    startGame,
  });
  c.start();
  await Promise.resolve();
  await Promise.resolve();
  if (mode !== 'direct') c.skip();
  const play = (vp: typeof MOBILE, ms: number) => {
    for (let t = 0; t < ms; t += 16) {
      now += 16;
      c.render(vp, now / 1000);
    }
  };
  return { c, scene, startGame, play };
}

describe('EXPLORAR descubre el puerto (T28)', () => {
  it('la entrada del mundo aterriza en su punto y espera con el barco en la salida', () => {
    expect(setup.config.landingPoint).toEqual({ x: map.introLanding.x, y: map.introLanding.y });
    const l = worldToScreen(map.introLanding);
    const s = worldToScreen(map.spawn);
    expect(setup.config.ship.dx).toBeCloseTo(s.x - l.x);
    expect(setup.config.ship.dy).toBeCloseTo(s.y - l.y);
    expect(setup.config.ship.view).toBe(shipViewFor(map.spawn.heading));
    expect(setup.geometry.landing).toEqual(l);
    // El mini-mundo es el trozo de mapa alrededor del aterrizaje.
    expect(setup.geometry.worldHeight).toBeCloseTo(
      worldToScreen({ x: 0, y: INTRO.miniWorld.span }).y,
    );
    // Se pinta el puerto: los objetos cerca de la salida están; los lejanos, no.
    const near = (o: (typeof world.objects)[number]) =>
      Math.abs(o.position.x - map.spawn.x) <= INTRO.miniWorld.reach &&
      Math.abs(o.position.y - map.spawn.y) <= INTRO.miniWorld.reach;
    expect(setup.world.objects.length).toBeGreaterThan(0);
    expect(setup.world.objects.length).toBeLessThan(world.objects.length);
    for (const o of world.objects.filter(near)) expect(setup.world.objects).toContain(o);
  });

  for (const [name, vp] of [
    ['móvil', MOBILE],
    ['escritorio', DESKTOP],
  ] as const) {
    it(`${name}: EXPLORAR se aleja un poco y termina con el barco en el puerto del mundo activo`, async () => {
      const h = await landed();
      expect(h.c.phase).toBe('landed');
      // Llegada: el aterrizaje en el encuadre del mundo (más cerca que el juego).
      const arrival = landingCamera(setup.config, setup.geometry, vp);
      expect(arrival.zoom).toBe(pickFraming(setup.config, vp.width).zoom);
      expect(arrival.zoom).toBeGreaterThan(1);

      expect(h.c.explore(vp)).toBe(true);
      expect(h.c.phase).toBe('exploring');
      expect(h.startGame).not.toHaveBeenCalled();
      h.play(vp, INTRO.explore.durationMs / 2);
      expect(h.startGame).not.toHaveBeenCalled();
      h.play(vp, INTRO.explore.durationMs);
      expect(h.startGame).toHaveBeenCalledTimes(1);
      expect(h.c.phase).toBe('explored');

      const frames = h.scene.frames.filter((f) => f.act === 'explore');
      const last = frames.at(-1)!;
      expect(last.done).toBe(true);
      // Se aleja: el zoom sólo baja, hasta la escala del juego, y no más.
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i]!.camera.zoom).toBeLessThanOrEqual(frames[i - 1]!.camera.zoom + 1e-9);
      }
      expect(last.camera.zoom).toBe(1);
      expect(arrival.zoom / last.camera.zoom).toBeLessThan(2);
      // El último fotograma es la cámara con la que empieza el juego: barco en la salida.
      expect(last.camera).toEqual(portCamera(setup.reveal, vp));
      const ship = onScreen(last.camera, worldToScreen(map.spawn));
      const cam = worldToScreen(map.spawn);
      cam.y = Math.min(
        cam.y,
        worldToScreen({ x: 0, y: world.bounds.bottom }).y + GAME_BOTTOM_LAND_PX - vp.height / 2,
      );
      expect(ship.x).toBeCloseTo(vp.width / 2 + worldToScreen(map.spawn).x - cam.x);
      expect(ship.y).toBeCloseTo(vp.height / 2 + worldToScreen(map.spawn).y - cam.y);
      // El puerto y el barco se ven; la landing se ha apartado.
      for (const p of [ship, onScreen(last.camera, worldToScreen(POINTS.port))]) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(vp.width);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(vp.height);
      }
      expect(last.content).toBe(0);
      // Después, la escena es del juego: no se pinta más y no se vuelve a explorar.
      const n = h.scene.frames.length;
      h.play(vp, 200);
      expect(h.scene.frames.length).toBe(n);
      expect(h.c.explore(vp)).toBe(false);
      expect(h.startGame).toHaveBeenCalledTimes(1);
    });
  }

  it('el encuadre del puerto es para la vista del juego (la ventana), aunque la escena mida otra cosa', async () => {
    const h = await landed();
    const game = { width: 360, height: 700 };
    h.c.explore(game);
    h.play(MOBILE, INTRO.explore.durationMs + 50);
    expect(h.scene.frames.at(-1)!.camera).toEqual(portCamera(setup.reveal, game));
  });

  it('movimiento reducido: sin alejamiento, el juego arranca ya (REQ-ENT-010)', async () => {
    const h = await landed('reduced');
    expect(h.c.phase).toBe('landed');
    expect(h.c.explore(MOBILE)).toBe(true);
    expect(h.startGame).toHaveBeenCalledTimes(1);
    expect(h.c.phase).toBe('explored');
    expect(h.scene.frames.some((f) => f.act === 'explore')).toBe(false);
  });

  it('pestaña oculta a medio alejamiento: el juego arranca igual, una vez', async () => {
    const h = await landed();
    h.c.explore(MOBILE);
    h.play(MOBILE, 200);
    h.c.interrupt();
    expect(h.startGame).toHaveBeenCalledTimes(1);
    h.c.interrupt();
    h.c.destroy();
    expect(h.startGame).toHaveBeenCalledTimes(1);
  });

  it('salir de la landing a medio alejamiento no arranca el juego', async () => {
    const h = await landed();
    h.c.explore(MOBILE);
    h.play(MOBILE, 200);
    h.c.destroy();
    h.play(MOBILE, 2000);
    expect(h.startGame).not.toHaveBeenCalled();
  });
});

describe('cámara del puerto y alejamiento', () => {
  const r = setup.reveal;

  it('la franja de tierra bajo el mapa es la misma que la del juego', () => {
    const game = readFileSync(new URL('../game.ts', import.meta.url), 'utf8');
    const m = /const BOTTOM_LAND_PX = (\d+(?:\.\d+)?);/.exec(game);
    expect(m, 'BOTTOM_LAND_PX en game.ts').not.toBeNull();
    expect(GAME_BOTTOM_LAND_PX).toBe(Number(m![1]));
  });

  it('centra el barco salvo junto al borde de abajo, donde la cámara no baja más', () => {
    const tall = { width: 360, height: 20 };
    expect(portCamera(r, tall)).toMatchObject({ x: r.ship.x, y: r.ship.y, zoom: 1 });
    const c = portCamera(r, MOBILE);
    expect(c.y).toBeCloseTo(r.floorY - MOBILE.height / 2);
    expect(c.y).toBeLessThan(r.ship.y);
  });

  it('empieza en la cámara de llegada y termina en la del puerto', () => {
    const from = landingCamera(setup.config, setup.geometry, MOBILE);
    const to = portCamera(r, MOBILE);
    const p = { x: r.ship.x + 40, y: r.ship.y - 90 };
    const a = revealCamera(from, to, MOBILE, 0, 'easeInOutSine');
    expect(onScreen(a, p).x).toBeCloseTo(onScreen(from, p).x);
    expect(onScreen(a, p).y).toBeCloseTo(onScreen(from, p).y);
    expect(revealCamera(from, to, MOBILE, 1, 'easeInOutSine')).toEqual(to);
  });

  it('la vista del barco sale del rumbo, como en el juego', () => {
    for (const d of DIRECTIONS) expect(shipViewFor(directionHeading(d))).toBe(d);
    expect(shipViewFor(-Math.PI / 2)).toBe('N');
  });

  it('valida los datos de entrada de un mundo', () => {
    expect(validateWorldIntro(INTRO).ok).toBe(true);
    const bad = (patch: Partial<WorldIntro>) => validateWorldIntro({ ...INTRO, ...patch }).ok;
    // Llegar más lejos que el juego haría que EXPLORAR acercase en vez de alejarse.
    expect(bad({ arrival: [{ minWidth: 0, zoom: 0.72, anchor: [0.5, 0.3] }] })).toBe(false);
    expect(bad({ arrival: [{ minWidth: 10, zoom: 1.2, anchor: [0.5, 0.3] }] })).toBe(false);
    expect(bad({ arrival: [] })).toBe(false);
    expect(bad({ miniWorld: { span: 10, reach: 0 } })).toBe(false);
    expect(bad({ explore: { durationMs: 99_999, easing: 'linear' } })).toBe(false);
    expect(validateWorldIntro(null).ok).toBe(false);
  });

  it('sin escena no hay alejamiento: el juego arranca al pulsar', () => {
    const startGame = vi.fn();
    const c = new IntroController({
      mode: 'direct',
      config: setup.config,
      geometry: setup.geometry,
      reveal: setup.reveal,
      now: () => 0,
      elapsedSinceBoot: 0,
      createScene: () => new Promise<IntroSceneHandle>(() => {}),
      setTimer: () => () => {},
      onLanded: () => {},
      startGame,
    });
    c.start();
    expect(c.explore(MOBILE)).toBe(true);
    expect(startGame).toHaveBeenCalledTimes(1);
  });
});
