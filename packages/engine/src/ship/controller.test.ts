import { describe, expect, it } from 'vitest';
import { DEFAULT_SHIP_CONFIG as cfg } from './config';
import {
  type ShipEnvironment,
  type ShipInput,
  type ShipState,
  IDLE_INPUT,
  collideShip,
  createShipState,
  shipSpeed,
  stepShip,
} from './controller';

const DT = 1 / 60;
const bounds = { left: 0, right: 1000, top: 0, bottom: 2000 };
const openSea: ShipEnvironment = {
  bounds: { left: -1e6, right: 1e6, top: -1e6, bottom: 1e6 },
  obstacles: [],
};
const north: ShipInput = { dirX: 0, dirY: -1, throttle: 1, drift: false };

function run(s: ShipState, input: ShipInput, seconds: number, env = openSea) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    stepShip(s, input, cfg, DT);
    collideShip(s, env, cfg, DT);
  }
}

describe('ShipController', () => {
  it('acelera hasta la velocidad máxima en maxSpeed / acceleration segundos', () => {
    const s = createShipState(0, 0, -Math.PI / 2);
    const expected = cfg.maxSpeed / cfg.acceleration;
    let t = 0;
    while (shipSpeed(s) < cfg.maxSpeed - 1e-6 && t < 10) {
      stepShip(s, north, cfg, DT);
      t += DT;
    }
    expect(Math.abs(t - expected)).toBeLessThanOrEqual(DT * 1.5);
    run(s, north, 2);
    expect(shipSpeed(s)).toBeCloseTo(cfg.maxSpeed, 6);
  });

  it('soltar el control frena suave hasta parar', () => {
    const s = createShipState(0, 0, -Math.PI / 2);
    run(s, north, 2);
    stepShip(s, IDLE_INPUT, cfg, DT);
    expect(shipSpeed(s)).toBeGreaterThan(cfg.maxSpeed * 0.9);
    run(s, IDLE_INPUT, cfg.maxSpeed / cfg.brakeDeceleration + 0.1);
    expect(shipSpeed(s)).toBe(0);
  });

  it('el drift aumenta el giro y el derrape lateral', () => {
    const turnRight: ShipInput = { dirX: 1, dirY: 0, throttle: 1, drift: false };
    const plain = createShipState(0, 0, -Math.PI / 2);
    const drift = createShipState(0, 0, -Math.PI / 2);
    run(plain, north, 2);
    run(drift, north, 2);
    run(plain, turnRight, 0.3);
    run(drift, { ...turnRight, drift: true }, 0.3);
    const turned = (s: ShipState) => s.heading - -Math.PI / 2;
    expect(turned(drift)).toBeGreaterThan(turned(plain) * 1.5);
    const slip = (s: ShipState) =>
      Math.abs(-s.vx * Math.sin(s.heading) + s.vy * Math.cos(s.heading));
    expect(slip(drift)).toBeGreaterThan(slip(plain));
    expect(drift.drifting).toBe(true);
    expect(plain.drifting).toBe(false);
  });

  it('las costas laterales y el borde inferior dejan el barco dentro', () => {
    const env: ShipEnvironment = { bounds, obstacles: [] };
    for (const input of [
      { dirX: -1, dirY: 0, throttle: 1, drift: false },
      { dirX: 1, dirY: 0, throttle: 1, drift: true },
      { dirX: -0.3, dirY: 1, throttle: 1, drift: false },
    ]) {
      const s = createShipState(500, 1800, Math.atan2(input.dirY, input.dirX));
      for (let i = 0; i < 600; i++) {
        stepShip(s, input, cfg, DT);
        collideShip(s, env, cfg, DT);
        expect(s.x).toBeGreaterThanOrEqual(bounds.left + cfg.radius);
        expect(s.x).toBeLessThanOrEqual(bounds.right - cfg.radius);
        expect(s.y).toBeLessThanOrEqual(bounds.bottom - cfg.radius);
      }
    }
  });

  it('contra una costa lateral desliza: conserva la velocidad paralela', () => {
    const env: ShipEnvironment = { bounds, obstacles: [] };
    const diag: ShipInput = { dirX: -1, dirY: -1, throttle: 1, drift: false };
    const s = createShipState(40, 1500, Math.atan2(-1, -1));
    for (let i = 0; i < 90; i++) {
      stepShip(s, diag, cfg, DT);
      collideShip(s, env, cfg, DT);
      expect(shipSpeed(s)).toBeLessThanOrEqual(cfg.maxSpeed + 1e-9);
    }
    expect(s.x).toBeCloseTo(bounds.left + cfg.radius, 6);
    expect(s.vy).toBeLessThan(-cfg.maxSpeed * 0.3);
  });

  it('el borde superior está abierto y una corriente suave devuelve el barco', () => {
    const env: ShipEnvironment = { bounds, obstacles: [] };
    const s = createShipState(500, 100, -Math.PI / 2);
    let minY = s.y;
    for (let i = 0; i < 60 * 8; i++) {
      stepShip(s, north, cfg, DT);
      collideShip(s, env, cfg, DT);
      minY = Math.min(minY, s.y);
    }
    expect(minY).toBeLessThan(bounds.top);
    expect(minY).toBeGreaterThan(bounds.top - cfg.openEdgeSoftZone);
    // Con el acelerador a fondo se queda quieto en la zona, sin vaivén.
    const settled = s.y;
    run(s, north, 1, env);
    expect(Math.abs(s.y - settled)).toBeLessThan(5);
    run(s, IDLE_INPUT, 6, env);
    expect(s.y).toBeGreaterThan(bounds.top);
  });

  it('un obstáculo circular bloquea con rebote suave', () => {
    const rock = { x: 500, y: 1000, radius: 40 };
    const env: ShipEnvironment = { bounds, obstacles: [rock] };
    const s = createShipState(500, 1300, -Math.PI / 2);
    let bounced = false;
    for (let i = 0; i < 60 * 4; i++) {
      stepShip(s, north, cfg, DT);
      collideShip(s, env, cfg, DT);
      const d = Math.hypot(s.x - rock.x, s.y - rock.y);
      expect(d).toBeGreaterThanOrEqual(rock.radius + cfg.radius - 1e-9);
      if (s.vy > 0) bounced = true;
    }
    expect(bounced).toBe(true);
  });
});
