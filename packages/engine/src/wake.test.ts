import { describe, expect, it } from 'vitest';
import { type WakeEmitter, WakeSystem } from './wake';

const emitter = (speed: number, drifting = false): WakeEmitter => ({
  x: 0,
  y: 0,
  heading: 0,
  speed,
  maxSpeed: 200,
  drifting,
});

function countAfter(e: WakeEmitter, seconds: number) {
  const w = new WakeSystem();
  let emitted = 0;
  let prev = 0;
  for (let i = 0; i < seconds * 60; i++) {
    w.update(1 / 60, e);
    emitted += Math.max(0, w.particles.length - prev);
    prev = w.particles.length;
  }
  return { w, emitted };
}

describe('estela', () => {
  it('parado no emite; más velocidad, más partículas; el drift aún más', () => {
    expect(countAfter(emitter(0), 1).w.particles.length).toBe(0);
    const slow = countAfter(emitter(60), 0.5).emitted;
    const fast = countAfter(emitter(200), 0.5).emitted;
    const drift = countAfter(emitter(200, true), 0.5).emitted;
    expect(fast).toBeGreaterThan(slow);
    expect(drift).toBeGreaterThan(fast);
  });

  it('las partículas se desvanecen: al parar, la estela desaparece', () => {
    const w = new WakeSystem();
    for (let i = 0; i < 60; i++) w.update(1 / 60, emitter(200, true));
    expect(w.particles.length).toBeGreaterThan(0);
    for (let i = 0; i < 60 * 3; i++) w.update(1 / 60, emitter(0));
    expect(w.particles.length).toBe(0);
  });
});
