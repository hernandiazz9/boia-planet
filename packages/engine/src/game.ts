import { type Direction, type SeaPalette, type WorldConfig, worldToScreen } from '@boia/world';
import { Application, Container } from 'pixi.js';
import { Camera } from './camera';
import {
  type KeyboardMode,
  KeyboardControls,
  TouchControls,
  readShipInput,
} from './input/controls';
import { bindInput } from './input/dom';
import { FixedStepLoop, lerp } from './loop';
import type { LoadedShipManifest } from './manifest-loader';
import { wrapAngle } from './math';
import { DEFAULT_SHIP_CONFIG, type ShipConfig } from './ship/config';
import {
  type CircleObstacle,
  type ShipState,
  createShipState,
  shipSpeed,
  stepShip,
} from './ship/controller';
import { ShipSprite } from './ship/view';
import { JoystickOverlay, WakeView } from './views';
import { WakeSystem } from './wake';
import { Water } from './water';
import { type ArtUrl, loadArt, manifestsOf } from './world/assets';
import { BubbleView } from './world/bubble';
import { createCoastView } from './world/coast-view';
import type { WorldEvent } from './world/events';
import { ObjectView } from './world/object-view';
import { MemoryRewardStore } from './world/rewards';
import { type RuntimeOptions, WorldRuntime, solidObstaclesOf } from './world/runtime';
import { bubbleAnchor, resolveObjectVisual, shipArtScale } from './world/visual';

export interface GameOptions {
  world: WorldConfig;
  /** Sprites del encargo 01. Sin él (o si falla), barco provisional. */
  manifest?: LoadedShipManifest | null;
  ship?: Partial<ShipConfig>;
  /**
   * Dónde están los manifiestos del arte del mundo. Sin valor, `/api/art`
   * (D-16); `null`, sin arte: todo con marcadores.
   */
  artUrl?: ArtUrl | null;
  /** Opciones del motor de comportamientos (temporada, sesión, recompensas…). */
  runtime?: RuntimeOptions;
  /** Colores del mar del mundo (T17). Sin valor, los de la demo. */
  sea?: SeaPalette;
  /** Cada evento del mundo, en orden, una vez por imagen. */
  onWorldEvent?: (e: WorldEvent) => void;
  /** Se llama ~4 veces por segundo con los datos del HUD. */
  onStats?: (s: GameStats) => void;
  /** Modo del teclado (D-14); por defecto, dirección de pantalla. */
  keyboardMode?: KeyboardMode;
  /**
   * Superficie ya creada que el juego adopta en vez de crear otra: la de la
   * entrada al pulsar EXPLORAR (REQ-ENT-012). El mismo canvas, el mismo
   * contexto WebGL y el mismo mar siguen en pantalla; el juego vacía el
   * escenario y pinta su mundo encima. `canvas` debe ser `surface.app.canvas`.
   */
  surface?: GameSurface | null;
}

/** Aplicación Pixi viva (y su mar) que otra escena cede al juego. */
export interface GameSurface {
  app: Application;
  water?: Water;
}

export interface GameStats {
  fps: number;
  /** u/s */
  speed: number;
  drifting: boolean;
  direction: Direction;
  x: number;
  y: number;
  /** Rumbo del casco en el plano del agua (rad). */
  heading: number;
  shipSource: 'manifest' | 'provisional';
  /** Multiplicador de velocidad por efectos (ralentizar, boost). */
  speedFactor: number;
}

export interface Game {
  stats(): GameStats;
  readonly runtime: WorldRuntime;
  /**
   * Cambia de mundo en caliente (T17): otro `WorldConfig` sobre el mismo mapa
   * compartido. El barco sigue donde está, con su rumbo y su pasajera; las
   * recompensas ya concedidas siguen concedidas (van por id de lugar, con el
   * mismo almacén). `sea` pone los colores del mar del mundo nuevo. Resuelve
   * `true` si quedó el pedido y `false` si otra petición lo adelantó.
   */
  setWorld(world: WorldConfig, opts?: { sea?: SeaPalette }): Promise<boolean>;
  /** Bocadillo: siguiente línea (o cierra la última). */
  advanceDialogue(): void;
  /** Bocadillo: cierra el diálogo entero. */
  skipDialogue(): void;
  /** Slot TRIPULANTE del barco (Boia Fiestera a bordo). */
  setPassenger(on: boolean): void;
  /** Cambia el modo del teclado en caliente (D-14). */
  setKeyboardMode(mode: KeyboardMode): void;
  /**
   * Cambia el aspecto del barco en caliente (estilo o skin): mismo barco en
   * el agua, misma posición, rumbo y pasajera. `null` pone el provisional.
   * Resuelve `true` si quedó el pedido y `false` si no cargó (se queda el de antes).
   */
  setShip(manifest: LoadedShipManifest | null): Promise<boolean>;
  /** true si el juego adoptó una superficie existente en vez de crear la suya. */
  readonly adoptedSurface: boolean;
  destroy(): void;
}

/** Color del mar bajo el agua animada (el mismo que el fondo de /juego). */
const SEA_COLOR = 0x0f5f7d;

/** px de tierra que la cámara deja ver bajo el borde inferior del mundo. muestra */
const BOTTOM_LAND_PX = 56;

/** Obstáculos sólidos del mundo: objetos activos con una COLISIÓN sólida del catálogo. */
export function obstaclesFromWorld(world: WorldConfig): CircleObstacle[] {
  return solidObstaclesOf(world);
}

export async function createGame(canvas: HTMLCanvasElement, opts: GameOptions): Promise<Game> {
  const cfg: ShipConfig = { ...DEFAULT_SHIP_CONFIG, ...opts.ship };
  let world = opts.world;
  // Un solo almacén de recompensas para todos los mundos de la partida: el
  // progreso va por id de lugar y sobrevive al cambio de mundo.
  const runtimeOpts: RuntimeOptions = {
    ...opts.runtime,
    rewards: opts.runtime?.rewards ?? new MemoryRewardStore(),
  };
  let runtime = new WorldRuntime(world, runtimeOpts);
  const spawn = world.spawn ?? {
    x: (world.bounds.left + world.bounds.right) / 2,
    y: world.bounds.bottom - 200,
    heading: -Math.PI / 2,
  };

  const surface = opts.surface ?? null;
  let app: Application;
  if (surface) {
    // La entrada cede su aplicación: se quita lo suyo y el juego sigue en el mismo canvas.
    app = surface.app;
    for (const c of app.stage.removeChildren()) {
      if (c !== surface.water?.view) c.destroy({ children: true });
    }
    app.renderer.background.color = SEA_COLOR;
    app.resizeTo = canvas.parentElement ?? window;
    app.resize();
  } else {
    app = new Application();
    await app.init({
      canvas,
      resizeTo: canvas.parentElement ?? window,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      background: SEA_COLOR,
    });
  }

  const ship: ShipState = createShipState(spawn.x, spawn.y, spawn.heading);
  const prev: ShipState = { ...ship };

  let sprite =
    (opts.manifest ? await ShipSprite.fromManifest(opts.manifest, ship.heading) : null) ??
    ShipSprite.provisional(ship.heading);

  // Arte del mundo a la escala del barco (T01: misma densidad de píxeles).
  const artScale = opts.manifest?.displayScale ?? shipArtScale(opts.manifest?.manifest);
  const buildWorld = async (w: WorldConfig) => {
    const assetIds = w.objects.map((o) => o.appearance.asset);
    if (w.coast) assetIds.push(w.coast.asset);
    const art = opts.artUrl === null ? new Map() : await loadArt(assetIds, opts.artUrl);
    const manifests = manifestsOf(art);
    const objectViews = await Promise.all(
      w.objects
        .filter((o) => o.identity.active)
        .map((o) => ObjectView.create(o, resolveObjectVisual(o, manifests, artScale), art)),
    );
    const coasts = await createCoastView(
      w.bounds,
      w.coast ? art.get(w.coast.asset) : undefined,
      artScale,
    );
    return { objectViews, coasts };
  };
  const built = await buildWorld(world);
  const objectViews = built.objectViews;
  let coasts = built.coasts;

  const water = surface?.water ?? new Water(opts.sea);
  // La superficie adoptada trae el mar de la entrada: toma los colores de este mundo.
  if (surface?.water && opts.sea) water.setPalette(opts.sea);
  // El mar de la entrada llega con su escala y su fundido: vuelve a escala de juego.
  water.view.scale.set(1);
  water.view.alpha = 1;
  water.view.visible = true;
  const worldLayer = new Container();
  const wakeView = new WakeView();
  const objects = new Container();
  objects.sortableChildren = true;
  worldLayer.addChild(coasts, wakeView.view, objects);
  for (const v of objectViews) objects.addChild(v.view);
  objects.addChild(sprite.view);

  const touch = new TouchControls();
  const keys = new KeyboardControls(opts.keyboardMode);
  const joystick = new JoystickOverlay(touch.cfg.radius);
  const bubble = new BubbleView();
  app.stage.addChild(water.view, worldLayer, bubble.view, joystick.view);
  canvas.style.touchAction = 'none';

  const onBubble = (x: number, y: number) => {
    const h = bubble.hit(x, y);
    if (h === 'advance') runtime.advanceDialogue();
    else if (h === 'skip') runtime.skipDialogue();
    return h !== null;
  };
  const unbind = bindInput(canvas, touch, keys, onBubble);
  // Teclado: Espacio o Intro avanzan el bocadillo; Escape lo salta.
  const onKey = (e: KeyboardEvent) => {
    if (!runtime.dialogue()) return;
    if (e.code === 'Space' || e.code === 'Enter') runtime.advanceDialogue();
    else if (e.code === 'Escape') runtime.skipDialogue();
    else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', onKey);

  let views = new Map(objectViews.map((v) => [v.object.identity.id, v]));
  const loop = new FixedStepLoop(60);
  const camera = new Camera(ship.x, ship.y);
  const wake = new WakeSystem();
  let time = 0;
  let frames = 0;
  let fpsWindow = 0;
  let fps = 0;
  let statsTimer = 0;

  const stats = (): GameStats => ({
    fps,
    speed: shipSpeed(ship),
    drifting: ship.drifting,
    direction: sprite.direction,
    x: ship.x,
    y: ship.y,
    heading: ship.heading,
    shipSource: sprite.source,
    speedFactor: runtime.speedFactor(),
  });

  const simulate = (dt: number) => {
    Object.assign(prev, ship);
    const input = readShipInput(touch, keys, ship.heading);
    stepShip(ship, input, runtime.shipConfig(cfg), dt);
    runtime.step(ship, cfg, dt);
    const o = sprite.wakeOriginOffset();
    wake.update(dt, {
      x: ship.x + o.x,
      y: ship.y + o.y,
      heading: ship.heading,
      speed: shipSpeed(ship),
      maxSpeed: cfg.maxSpeed,
      drifting: ship.drifting,
    });
  };

  const frame = () => {
    const dt = app.ticker.deltaMS / 1000;
    time += dt;
    const alpha = loop.advance(dt, simulate);
    for (const e of runtime.drainEvents()) opts.onWorldEvent?.(e);

    const rx = lerp(prev.x, ship.x, alpha);
    const ry = lerp(prev.y, ship.y, alpha);
    const rh = prev.heading + wrapAngle(ship.heading - prev.heading) * alpha;
    camera.update(rx, ry, ship.vx, ship.vy, dt);

    const w = app.screen.width;
    const h = app.screen.height;
    const cam = worldToScreen(camera);
    // El borde inferior es tierra: la cámara no enseña más que una franja.
    cam.y = Math.min(
      cam.y,
      worldToScreen({ x: 0, y: world.bounds.bottom }).y + BOTTOM_LAND_PX - h / 2,
    );
    const ox = Math.round(w / 2 - cam.x);
    const oy = Math.round(h / 2 - cam.y);
    worldLayer.position.set(ox, oy);
    water.update(w, h, cam.x - w / 2, cam.y - h / 2, time);

    for (const s of runtime.objectStates()) {
      const v = views.get(s.id);
      if (!v) continue;
      v.sync(s);
      v.animate(time);
    }

    const sp = worldToScreen({ x: rx, y: ry });
    sprite.view.position.set(sp.x, sp.y);
    sprite.view.zIndex = ry;
    sprite.update(rh, time, shipSpeed(ship));
    wakeView.sync(wake);

    const d = runtime.dialogue();
    const speaker = d ? views.get(d.objectId) : undefined;
    const st = d ? runtime.objectState(d.objectId) : undefined;
    if (d && speaker && st) {
      const a = bubbleAnchor(speaker.visual);
      const p = worldToScreen(st);
      bubble.show(d, ox + p.x + a.x, oy + p.y + a.y, w);
    } else {
      bubble.show(null, 0, 0, w);
    }
    joystick.draw(touch.view(), ship.drifting);

    frames++;
    fpsWindow += dt;
    if (fpsWindow >= 0.5) {
      fps = frames / fpsWindow;
      frames = 0;
      fpsWindow = 0;
    }
    statsTimer += dt;
    if (opts.onStats && statsTimer >= 0.25) {
      statsTimer = 0;
      opts.onStats(stats());
    }
  };
  app.ticker.add(frame);
  // La superficie adoptada llega con el reloj parado (la entrada pinta a demanda).
  if (surface) app.start();

  let destroyed = false;
  let shipRequest = 0;
  let worldRequest = 0;
  return {
    stats,
    get runtime() {
      return runtime;
    },
    async setWorld(next, worldOpts = {}) {
      const request = ++worldRequest;
      const nextBuilt = await buildWorld(next);
      if (destroyed || request !== worldRequest) {
        for (const v of nextBuilt.objectViews) v.view.destroy({ children: true });
        nextBuilt.coasts.destroy({ children: true });
        return false;
      }
      // Lo que el mundo de antes tenía pendiente sale antes del cambio.
      for (const e of runtime.drainEvents()) opts.onWorldEvent?.(e);
      for (const v of views.values()) {
        objects.removeChild(v.view);
        v.view.destroy({ children: true });
      }
      worldLayer.removeChild(coasts);
      coasts.destroy({ children: true });
      coasts = nextBuilt.coasts;
      worldLayer.addChildAt(coasts, 0);
      for (const v of nextBuilt.objectViews) objects.addChild(v.view);
      views = new Map(nextBuilt.objectViews.map((v) => [v.object.identity.id, v]));
      world = next;
      runtime = new WorldRuntime(next, runtimeOpts);
      if (worldOpts.sea) water.setPalette(worldOpts.sea);
      return true;
    },
    advanceDialogue: () => void runtime.advanceDialogue(),
    skipDialogue: () => void runtime.skipDialogue(),
    setPassenger: (on) => sprite.setPassenger(on),
    setKeyboardMode: (mode) => {
      keys.mode = mode;
    },
    adoptedSurface: surface !== null,
    async setShip(manifest) {
      const request = ++shipRequest;
      const next = manifest
        ? await ShipSprite.fromManifest(manifest, ship.heading)
        : ShipSprite.provisional(ship.heading);
      // Otra petición más nueva, o el juego ya no existe: ésta no se aplica.
      if (!next || destroyed || request !== shipRequest) {
        next?.view.destroy({ children: true });
        return false;
      }
      next.setPassenger(sprite.hasPassenger);
      next.update(ship.heading, time, shipSpeed(ship));
      next.view.position.copyFrom(sprite.view.position);
      next.view.zIndex = sprite.view.zIndex;
      const old = sprite;
      objects.addChild(next.view);
      objects.removeChild(old.view);
      // Las texturas se quedan en la caché de Assets: volver a un estilo es inmediato.
      old.view.destroy({ children: true });
      sprite = next;
      return true;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unbind();
      window.removeEventListener('keydown', onKey);
      app.ticker.remove(frame);
      app.destroy({ removeView: false }, { children: true });
    },
  };
}
