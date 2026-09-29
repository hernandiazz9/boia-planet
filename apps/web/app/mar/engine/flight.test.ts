import { describe, expect, it } from 'vitest';
import { FLIGHT, flightPlan, flightPose } from './flight';

describe('vuelo de «Entradas»', () => {
  it('el tramo que avanza crece con la distancia, dentro de sus límites', () => {
    const near = flightPlan(100);
    const far = flightPlan(1e6);
    expect(near.arrive - near.go).toBeCloseTo(FLIGHT.minTravel);
    expect(far.arrive - far.go).toBeCloseTo(FLIGHT.maxTravel);
    const mid = flightPlan(1800);
    expect(mid.arrive - mid.go).toBeCloseTo(1800 / FLIGHT.uPerS);
    expect(mid.total).toBeLessThan(8);
  });

  it('sale del agua quieto y sin alas, y se posa en el destino con ellas plegadas', () => {
    const plan = flightPlan(1800);
    const a = flightPose(0, plan);
    expect(a).toMatchObject({ travel: 0, alt: 0, wings: 0, phase: 'lift' });
    const z = flightPose(plan.total, plan);
    expect(z).toMatchObject({ travel: 1, alt: 0, wings: 0, phase: 'done' });
  });

  it('levita antes de avanzar, con las alas fuera, y vuela alto en crucero', () => {
    const plan = flightPlan(1800);
    const hover = flightPose(FLIGHT.go - 0.05, plan);
    expect(hover.travel).toBe(0);
    expect(hover.alt).toBeGreaterThan(FLIGHT.hover * 0.8);
    expect(hover.wings).toBeGreaterThan(0.9);
    const mid = flightPose((plan.go + plan.arrive) / 2, plan);
    expect(mid.phase).toBe('cruise');
    expect(mid.alt).toBeGreaterThan(FLIGHT.cruise * 0.9);
    expect(mid.travel).toBeGreaterThan(0.3);
    expect(mid.travel).toBeLessThan(0.7);
  });

  it('se mueve sin saltos', () => {
    const plan = flightPlan(2500);
    let prev = flightPose(0, plan);
    for (let t = 1 / 60; t <= plan.total; t += 1 / 60) {
      const p = flightPose(t, plan);
      expect(p.travel).toBeGreaterThanOrEqual(prev.travel);
      expect(Math.abs(p.travel - prev.travel)).toBeLessThan(0.02);
      expect(Math.abs(p.alt - prev.alt)).toBeLessThan(0.4);
      prev = p;
    }
  });
});
