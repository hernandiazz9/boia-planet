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
  collideShip,
  createShipState,
  shipSpeed,
  stepShip,
} from './ship/controller';
import { ShipSprite } from './ship/view';
import { JoystickOverlay, WakeView, drawCoasts, drawRock } from './views';
import { WakeSystem } from './wake';
import { Water } from './water';

export interface GameOptions {
  world: WorldConfig;
  /** Sprites del encargo 01. Sin él (o si falla), barco provisional. */
  manifest?: LoadedShipManifest | null;
  ship?: Partial<ShipConfig>;
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
}

export interface Game {
  stats(): GameStats;
  destroy(): void;
}

/** Obstáculos circulares del mundo: objetos activos con colisión circular. */
export function obstaclesFromWorld(world: WorldConfig): CircleObstacle[] {
  return world.objects
    .filter((o) => o.identity.active && o.geometry.collision?.shape === 'circle')
    .map((o) => ({ x: o.position.x, y: o.position.y, radius: o.geometry.collision!.radius }));
}

export async function createGame(canvas: HTMLCanvasElement, opts: GameOptions): Promise<Game> {
  const cfg: ShipConfig = { ...DEFAULT_SHIP_CONFIG, ...opts.ship };
  const world = opts.world;
  const env = { bounds: world.bounds, obstacles: obstaclesFromWorld(world) };
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

  const water = new Water();
  const worldLayer = new Container();
  const wakeView = new WakeView();
  const objects = new Container();
  objects.sortableChildren = true;
  worldLayer.addChild(drawCoasts(world.bounds), wakeView.view, objects);
  for (const o of env.obstacles) objects.addChild(drawRock(o));
  objects.addChild(sprite.view);

  const touch = new TouchControls();
  const keys = new KeyboardControls();
  const joystick = new JoystickOverlay(touch.cfg.radius);
  app.stage.addChild(water.view, worldLayer, joystick.view);
  canvas.style.touchAction = 'none';
  const unbind = bindInput(canvas, touch, keys);

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
  });

  const simulate = (dt: number) => {
    Object.assign(prev, ship);
    const input = readShipInput(touch, keys);
    stepShip(ship, input, cfg, dt);
    collideShip(ship, env, cfg, dt);
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

    const rx = lerp(prev.x, ship.x, alpha);
    const ry = lerp(prev.y, ship.y, alpha);
    const rh = prev.heading + wrapAngle(ship.heading - prev.heading) * alpha;
    camera.update(rx, ry, ship.vx, ship.vy, dt);

    const w = app.screen.width;
    const h = app.screen.height;
    const cam = worldToScreen(camera);
    worldLayer.position.set(Math.round(w / 2 - cam.x), Math.round(h / 2 - cam.y));
    water.update(w, h, cam.x - w / 2, cam.y - h / 2, time);

    const sp = worldToScreen({ x: rx, y: ry });
    sprite.view.position.set(sp.x, sp.y);
    sprite.view.zIndex = ry;
    sprite.update(rh);
    wakeView.sync(wake);
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
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unbind();
      app.ticker.remove(frame);
      app.destroy({ removeView: false }, { children: true });
    },
  };
}
