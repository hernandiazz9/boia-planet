import type { WorldConfig } from '@boia/world';
import { DEFAULT_SHIP_CONFIG, type ShipConfig } from '../ship/config';
import { type ShipInput, type ShipState, createShipState, stepShip } from '../ship/controller';
import type { WorldEvent } from './events';
import { type RuntimeOptions, WorldRuntime } from './runtime';

export interface TraceStep {
  step: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  events: WorldEvent[];
}

export interface SimulationResult {
  runtime: WorldRuntime;
  ship: ShipState;
  trace: TraceStep[];
  events: WorldEvent[];
}

export interface SimulationOptions extends RuntimeOptions {
  seconds: number;
  hz?: number;
  ship?: ShipConfig;
  start?: { x: number; y: number; heading?: number };
  /** Entrada del jugador en cada paso (t en s desde el inicio). */
  input: (t: number, ship: ShipState) => ShipInput;
  /** Se llama antes de cada paso: para tocar el diálogo, etc. */
  before?: (t: number, runtime: WorldRuntime, step: number) => void;
  runtime?: WorldRuntime;
}

const round = (v: number) => Math.round(v * 1e6) / 1e6;

/**
 * Simulación sin render, igual a la del juego: `stepShip` con la física que
 * da el runtime y después `runtime.step`, a paso fijo. Devuelve la traza
 * (posición y eventos por paso) para comparar ejecuciones.
 */
export function simulate(world: WorldConfig, opts: SimulationOptions): SimulationResult {
  const hz = opts.hz ?? 60;
  const dt = 1 / hz;
  const cfg = opts.ship ?? DEFAULT_SHIP_CONFIG;
  const runtime = opts.runtime ?? new WorldRuntime(world, opts);
  const spawn = opts.start ?? world.spawn ?? { x: 0, y: 0 };
  const ship = createShipState(spawn.x, spawn.y, spawn.heading ?? -Math.PI / 2);
  const trace: TraceStep[] = [];
  const all: WorldEvent[] = [];
  const steps = Math.round(opts.seconds * hz);
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    opts.before?.(t, runtime, i);
    stepShip(ship, opts.input(t, ship), runtime.shipConfig(cfg), dt);
    runtime.step(ship, cfg, dt);
    const events = runtime.drainEvents();
    all.push(...events);
    trace.push({
      step: i,
      x: round(ship.x),
      y: round(ship.y),
      vx: round(ship.vx),
      vy: round(ship.vy),
      heading: round(ship.heading),
      events,
    });
  }
  return { runtime, ship, trace, events: all };
}
