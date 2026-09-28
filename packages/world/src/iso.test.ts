import { describe, expect, it } from 'vitest';
import {
  CAMERA_ELEVATION_DEG,
  EDGE_ANGLE_DEG,
  TILE_HEIGHT,
  TILE_WIDTH,
  gridToWorld,
  screenToWorld,
  screenVectorToWorld,
  worldToGrid,
  worldToScreen,
} from './iso';

function bbox(points: { x: number; y: number }[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

// Pseudoaleatorio con semilla fija para que el test sea reproducible.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('proyección dimétrica 2:1', () => {
  it('ida y vuelta mundo → pantalla → mundo sobre el agua y en altura', () => {
    const r = rng(42);
    for (let i = 0; i < 500; i++) {
      const p = { x: (r() - 0.5) * 1e4, y: (r() - 0.5) * 1e4, z: (r() - 0.5) * 200 };
      const back = screenToWorld(worldToScreen(p), p.z);
      expect(back.x).toBeCloseTo(p.x, 9);
      expect(back.y).toBeCloseTo(p.y, 9);
    }
  });

  it('ida y vuelta mundo → rejilla → mundo', () => {
    const r = rng(7);
    for (let i = 0; i < 200; i++) {
      const g = { a: r() * 100 - 50, b: r() * 100 - 50, c: r() * 4 };
      const w = gridToWorld(g.a, g.b, g.c);
      const back = worldToGrid(w);
      expect(back.x).toBeCloseTo(g.a, 9);
      expect(back.y).toBeCloseTo(g.b, 9);
      expect(back.z).toBeCloseTo(g.c, 9);
    }
  });

  it('la cara superior de un cubo unidad proyecta a una losa 2:1 de 64×32 px', () => {
    const top = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ].map(([a, b]) => worldToScreen(gridToWorld(a!, b!, 1)));
    const { w, h } = bbox(top);
    expect(w / h).toBeCloseTo(2, 12);
    expect(w).toBeCloseTo(TILE_WIDTH, 9);
    expect(h).toBeCloseTo(TILE_HEIGHT, 9);
    // La base es la misma losa, desplazada hacia abajo por la altura del cubo.
    const bottom = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ].map(([a, b]) => worldToScreen(gridToWorld(a!, b!, 0)));
    expect(bbox(bottom).w / bbox(bottom).h).toBeCloseTo(2, 12);
    expect(bottom[0]!.y - top[0]!.y).toBeGreaterThan(0);
  });

  it('las aristas de la rejilla quedan a ≈26,57° en pantalla con cámara a 30°', () => {
    const o = worldToScreen(gridToWorld(0, 0));
    const a = worldToScreen(gridToWorld(1, 0));
    const angle = (Math.atan2(a.y - o.y, a.x - o.x) * 180) / Math.PI;
    expect(angle).toBeCloseTo(EDGE_ANGLE_DEG, 9);
    expect(EDGE_ANGLE_DEG).toBeCloseTo(26.565, 3);
    expect(CAMERA_ELEVATION_DEG).toBe(30);
  });

  it('un vector de pantalla hacia arriba-derecha a 45° es una dirección de mundo que vuelve a 45°', () => {
    const w = screenVectorToWorld({ x: 1, y: -1 });
    const s = worldToScreen(w);
    expect(Math.atan2(s.y, s.x)).toBeCloseTo(-Math.PI / 4, 12);
  });
});
