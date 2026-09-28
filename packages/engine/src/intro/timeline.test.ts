import { describe, expect, it } from 'vitest';
import { DEFAULT_INTRO_CONFIG as CFG } from './config';
import { realAssets } from './test-fixtures';
import { frameAt, landingCamera, planetCamera, sameCamera, type Viewport } from './timeline';

const geo = realAssets();
const VIEWPORTS: Viewport[] = [
  { width: 360, height: 640 },
  { width: 1280, height: 720 },
];
const steps = (n: number) => Array.from({ length: n + 1 }, (_, i) => (CFG.durationMs * i) / n);

describe.each(VIEWPORTS)('línea de tiempo en $width×$height', (vp) => {
  it('empieza con el planeta entero y el título, sin landing', () => {
    const f = frameAt(CFG, geo, vp, 0, 'intro');
    expect(sameCamera(f.camera, planetCamera(CFG, geo, vp))).toBe(true);
    expect(f.globe).toBe(1);
    expect(f.water).toBe(0);
    expect(f.title).toBe(1);
    expect(f.content).toBe(0);
    expect(f.done).toBe(false);
    // El globo cabe en la vista.
    const diameter = 2 * geo.planet.globeRadius * f.camera.zoom;
    expect(diameter).toBeLessThanOrEqual(Math.min(vp.width, vp.height));
  });

  it('el último fotograma es exactamente el encuadre de la landing (REQ-ENT-014)', () => {
    const f = frameAt(CFG, geo, vp, CFG.durationMs, 'intro');
    expect(f.done).toBe(true);
    expect(f.camera).toEqual(landingCamera(CFG, geo, vp));
    expect(f.content).toBe(1);
    expect(f.title).toBe(0);
    expect(f.globe).toBe(0);
    expect(f.water).toBe(1);
    // Y es el mismo que el de una visita directa: nada salta al terminar.
    expect(frameAt(CFG, geo, vp, 0, 'direct')).toEqual({ ...f, t: 0 });
  });

  it('el acercamiento sólo acerca: zoom monótono, sin túnel ni saltos', () => {
    let prev = frameAt(CFG, geo, vp, 0, 'intro');
    for (const t of steps(180).slice(1)) {
      const f = frameAt(CFG, geo, vp, t, 'intro');
      expect(f.camera.zoom).toBeGreaterThanOrEqual(prev.camera.zoom - 1e-9);
      // A 60 fps ningún fotograma acerca más de un 6 % respecto al anterior.
      expect(f.camera.zoom / prev.camera.zoom).toBeLessThan(1.06);
      prev = f;
    }
  });

  it('la landing entra al final y el título se va antes del mar', () => {
    for (const t of steps(60)) {
      const f = frameAt(CFG, geo, vp, t, 'intro');
      if (t < CFG.phases.arrival[0] * CFG.durationMs) expect(f.content).toBe(0);
      if (f.water > 0) expect(f.title).toBe(0);
    }
  });

  it('movimiento reducido: la cámara no se mueve nunca (REQ-ENT-010)', () => {
    const still = landingCamera(CFG, geo, vp);
    for (const t of [0, 16, 100, CFG.reduced.fadeMs / 2, CFG.reduced.fadeMs, 5000]) {
      const f = frameAt(CFG, geo, vp, t, 'reduced');
      expect(f.camera).toEqual(still);
      expect(f.globe).toBe(0);
    }
    expect(frameAt(CFG, geo, vp, 0, 'reduced').content).toBe(0);
    expect(frameAt(CFG, geo, vp, CFG.reduced.fadeMs, 'reduced').done).toBe(true);
  });
});

it('la duración es la de la configuración (3 s por defecto) y reescala las fases', () => {
  expect(CFG.durationMs).toBe(3000);
  const vp = VIEWPORTS[0]!;
  const slow = { ...CFG, durationMs: 6000 };
  const a = frameAt(CFG, geo, vp, 1500, 'intro');
  const b = frameAt(slow, geo, vp, 3000, 'intro');
  expect(b.camera.zoom).toBeCloseTo(a.camera.zoom, 9);
  expect(frameAt(slow, geo, vp, 3000, 'intro').done).toBe(false);
});
