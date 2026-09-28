import { type Direction, type WorldConfig, worldToScreen } from '@boia/world';
import { Application, Container } from 'pixi.js';
import { Camera } from './camera';
import { KeyboardControls, TouchControls, readShipInput } from './input/controls';
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
  /** Cada evento del mundo, en orden, una vez por imagen. */
  onWorldEvent?: (e: WorldEvent) => void;
  /** Se llama ~4 veces por segundo con los datos del HUD. */
  onStats?: (s: GameStats) => void;
}

export interface GameStats {
  fps: number;
  /** u/s */
  speed: number;
  drifting: boolean;
  direction: Direction;
  x: number;
  y: number;
  shipSource: 'manifest' | 'provisional';
  /** Multiplicador de velocidad por efectos (ralentizar, boost). */
  speedFactor: number;
}

export interface Game {
  stats(): GameStats;
  readonly runtime: WorldRuntime;
  /** Bocadillo: siguiente línea (o cierra la última). */
  advanceDialogue(): void;
  /** Bocadillo: cierra el diálogo entero. */
  skipDialogue(): void;
  /** Slot TRIPULANTE del barco (Boia Fiestera a bordo). */
  setPassenger(on: boolean): void;
  destroy(): void;
}

/** px de tierra que la cámara deja ver bajo el borde inferior del mundo. muestra */
const BOTTOM_LAND_PX = 56;

/** Obstáculos sólidos del mundo: objetos activos con una COLISIÓN sólida del catálogo. */
export function obstaclesFromWorld(world: WorldConfig): CircleObstacle[] {
  return solidObstaclesOf(world);
}

export async function createGame(canvas: HTMLCanvasElement, opts: GameOptions): Promise<Game> {
  const cfg: ShipConfig = { ...DEFAULT_SHIP_CONFIG, ...opts.ship };
  const world = opts.world;
  const runtime = new WorldRuntime(world, opts.runtime);
  const spawn = world.spawn ?? {
    x: (world.bounds.left + world.bounds.right) / 2,
    y: world.bounds.bottom - 200,
    heading: -Math.PI / 2,
  };

  const app = new Application();
  await app.init({
    canvas,
    resizeTo: canvas.parentElement ?? window,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    background: 0x0f5f7d,
  });

  const ship: ShipState = createShipState(spawn.x, spawn.y, spawn.heading);
  const prev: ShipState = { ...ship };

  const sprite =
    (opts.manifest ? await ShipSprite.fromManifest(opts.manifest, ship.heading) : null) ??
    ShipSprite.provisional(ship.heading);

  // Arte del mundo a la escala del barco (T01: misma densidad de píxeles).
  const artScale = opts.manifest?.displayScale ?? shipArtScale(opts.manifest?.manifest);
  const assetIds = world.objects.map((o) => o.appearance.asset);
  if (world.coast) assetIds.push(world.coast.asset);
  const art = opts.artUrl === null ? new Map() : await loadArt(assetIds, opts.artUrl);
  const manifests = manifestsOf(art);
  const objectViews = await Promise.all(
    world.objects
      .filter((o) => o.identity.active)
      .map((o) => ObjectView.create(o, resolveObjectVisual(o, manifests, artScale), art)),
  );
  const coasts = await createCoastView(
    world.bounds,
    world.coast ? art.get(world.coast.asset) : undefined,
    artScale,
  );

  const water = new Water();
  const worldLayer = new Container();
  const wakeView = new WakeView();
  const objects = new Container();
  objects.sortableChildren = true;
  worldLayer.addChild(coasts, wakeView.view, objects);
  for (const v of objectViews) objects.addChild(v.view);
  objects.addChild(sprite.view);

  const touch = new TouchControls();
  const keys = new KeyboardControls();
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

  const views = new Map(objectViews.map((v) => [v.object.identity.id, v]));
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
    shipSource: sprite.source,
    speedFactor: runtime.speedFactor(),
  });

  const simulate = (dt: number) => {
    Object.assign(prev, ship);
    const input = readShipInput(touch, keys);
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

  let destroyed = false;
  return {
    stats,
    runtime,
    advanceDialogue: () => void runtime.advanceDialogue(),
    skipDialogue: () => void runtime.skipDialogue(),
    setPassenger: (on) => sprite.setPassenger(on),
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
