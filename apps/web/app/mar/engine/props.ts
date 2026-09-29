import {
  BoxGeometry,
  type BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Kit, type Vec3, jitterFaces, paint, wobble } from './kit';
import { C } from './palette';

/**
 * Piezas sueltas del mar 3D: palmeras, rocas, antorchas, gente, casas,
 * muelles, boias. Cada función añade a un `Kit` (lo iluminado) y, si brilla,
 * a otro `Kit` sin luz y a los puntos de resplandor (`Glows`). Medidas en
 * unidades de escena: el barco mide 3 de eslora, una persona 0,55 de alto.
 */

/** Resplandores (antorchas, bombillas, farolas): un solo `Points` aditivo. */
export class Glows {
  readonly pos: number[] = [];
  readonly col: number[] = [];
  readonly size: number[] = [];
  readonly phase: number[] = [];

  add(p: Vec3, color: string, size: number): void {
    this.pos.push(p[0], p[1], p[2]);
    const c = parseInt(color.slice(1), 16);
    this.col.push(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255);
    this.size.push(size);
    this.phase.push(Math.random() * Math.PI * 2);
  }
}

/** Lo que construye un lugar: su parte iluminada, la que brilla y sus luces. */
export interface Parts {
  lit: Kit;
  glow: Kit;
  glows: Glows;
}

const rot = (x: number, y: number, z: number): Vec3 => [x, y, z];

export function palm(k: Kit, x: number, y: number, z: number, h: number, rnd: () => number): void {
  const lean = (rnd() - 0.5) * 0.5;
  const dir = rnd() * Math.PI * 2;
  const seg = 4;
  let px = x;
  let pz = z;
  let py = y;
  const lx = Math.cos(dir) * lean;
  const lz = Math.sin(dir) * lean;
  for (let i = 0; i < seg; i++) {
    const t = i / seg;
    const len = h / seg;
    const r = 0.16 - t * 0.06;
    const nx = px + lx * len * (0.3 + t);
    const nz = pz + lz * len * (0.3 + t);
    const g = new CylinderGeometry(r * 0.85, r, len * 1.04, 6);
    k.add(g, i % 2 ? C.trunk : '#8a5c3a', {
      p: [(px + nx) / 2, py + len / 2, (pz + nz) / 2],
      r: rot(lz * 0.8, 0, -lx * 0.8),
    });
    px = nx;
    pz = nz;
    py += len;
  }
  const frond = new OctahedronGeometry(1, 0);
  const fronds = 6 + Math.floor(rnd() * 2);
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rnd() * 0.4;
    const L = h * (0.36 + rnd() * 0.08);
    const droop = 0.35 + rnd() * 0.25;
    k.add(frond, i % 2 ? C.leaf : C.leafDark, {
      p: [px + Math.cos(a) * L * 0.45, py - L * 0.12, pz + Math.sin(a) * L * 0.45],
      r: rot(0, -a, -droop),
      s: [L * 0.55, 0.05, L * 0.16],
    });
  }
  const nut = new SphereGeometry(0.1, 5, 4);
  for (let i = 0; i < 3; i++) {
    const a = rnd() * Math.PI * 2;
    k.add(nut, C.woodDark, { p: [px + Math.cos(a) * 0.14, py - 0.12, pz + Math.sin(a) * 0.14] });
  }
}

export function pine(k: Kit, x: number, y: number, z: number, h: number): void {
  k.add(new CylinderGeometry(0.1, 0.14, h * 0.3, 5), C.trunk, { p: [x, y + h * 0.15, z] });
  for (let i = 0; i < 3; i++) {
    const r = h * (0.32 - i * 0.07);
    k.add(new ConeGeometry(r, h * 0.42, 6), i % 2 ? C.pine : '#3f6d33', {
      p: [x, y + h * (0.38 + i * 0.2), z],
      r: rot(0, i * 0.5, 0),
    });
  }
}

export function bush(k: Kit, x: number, y: number, z: number, s: number, rnd: () => number): void {
  const g = wobble(new IcosahedronGeometry(s, 0), s * 0.3, rnd);
  k.add(g, rnd() > 0.5 ? C.grassDark : C.leafDark, { p: [x, y + s * 0.5, z], s: [1, 0.7, 1] });
}

export function rock(
  k: Kit,
  x: number,
  y: number,
  z: number,
  s: number,
  rnd: () => number,
  color: string = C.rock,
): void {
  const g = wobble(new DodecahedronGeometry(s, 0), s * 0.35, rnd);
  const painted = paint(g, color);
  jitterFaces(painted, 0.22, rnd);
  k.addPainted(painted, {
    p: [x, y, z],
    r: rot(rnd() * 3, rnd() * 3, rnd() * 3),
    s: [1, 0.75 + rnd() * 0.5, 1],
  });
}

/** Una aguja de roca que sale del agua (Els Dents, escolleras). */
export function crag(k: Kit, x: number, z: number, s: number, rnd: () => number): void {
  const n = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * s * 0.6;
    const h = s * (0.8 + rnd() * 1.4);
    const g = wobble(new ConeGeometry(s * (0.35 + rnd() * 0.3), h, 5), s * 0.12, rnd);
    const painted = paint(g, rnd() > 0.5 ? C.rock : C.rockDark);
    jitterFaces(painted, 0.2, rnd);
    k.addPainted(painted, { p: [x + Math.cos(a) * d, h / 2 - 0.3, z + Math.sin(a) * d] });
  }
}

export function torch(p: Parts, x: number, y: number, z: number, h = 1.1): void {
  p.lit.add(new CylinderGeometry(0.05, 0.07, h, 5), C.woodDark, { p: [x, y + h / 2, z] });
  p.lit.add(new CylinderGeometry(0.11, 0.07, 0.18, 6), C.iron, { p: [x, y + h, z] });
  p.glow.add(new ConeGeometry(0.1, 0.32, 5), C.flame, { p: [x, y + h + 0.2, z] });
  p.glows.add([x, y + h + 0.25, z], '#ffae4a', 2.4);
}

/** Guirnalda de bombillas entre dos puntos (cae un poco en el medio). */
export function festoon(p: Parts, a: Vec3, b: Vec3, n: number, colors: readonly string[]): void {
  const bulb = new SphereGeometry(0.07, 5, 4);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const sag = Math.sin(t * Math.PI) * 0.35;
    const q: Vec3 = [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t - sag,
      a[2] + (b[2] - a[2]) * t,
    ];
    const color = colors[i % colors.length]!;
    p.glow.add(bulb, color, { p: q });
    p.glows.add(q, color, 1.1);
  }
}

/** Una persona de pie: cuerpo de color, cabeza. Para multitudes, ver `crowdGeometry`. */
export function person(k: Kit, x: number, y: number, z: number, shirt: string, s = 1): void {
  k.add(new CylinderGeometry(0.11 * s, 0.14 * s, 0.34 * s, 6), shirt, { p: [x, y + 0.17 * s, z] });
  k.add(new SphereGeometry(0.11 * s, 6, 5), C.skin, { p: [x, y + 0.44 * s, z] });
}

/** Geometría de una persona (para `InstancedMesh`), con los pies en 0. */
export function crowdGeometry(): BufferGeometry {
  const parts = [
    paint(new CylinderGeometry(0.11, 0.14, 0.34, 6).translate(0, 0.17, 0), '#ffffff'),
    paint(new SphereGeometry(0.11, 6, 5).translate(0, 0.44, 0), C.skin),
    paint(new BoxGeometry(0.42, 0.06, 0.06).translate(0, 0.3, 0), '#ffffff'),
  ];
  const g = mergeGeometries(parts, false);
  if (!g) throw new Error('mar3d: persona sin geometría');
  return g;
}

export function house(
  k: Kit,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  ry: number,
  rnd: () => number,
): void {
  const wall = rnd() > 0.25 ? C.wall : '#f3d9b0';
  k.add(new BoxGeometry(w, h, d), wall, { p: [x, y + h / 2, z], r: [0, ry, 0] });
  if (rnd() > 0.35) {
    // Tejado a cuatro aguas de teja.
    k.add(new ConeGeometry(Math.hypot(w, d) * 0.56, h * 0.45, 4), C.roof, {
      p: [x, y + h + h * 0.22, z],
      r: [0, ry + Math.PI / 4, 0],
      s: [(w / Math.hypot(w, d)) * 1.41, 1, (d / Math.hypot(w, d)) * 1.41],
    });
  } else {
    // Azotea blanca con pretil.
    k.add(new BoxGeometry(w * 1.04, 0.12, d * 1.04), '#e9e1d2', {
      p: [x, y + h + 0.06, z],
      r: [0, ry, 0],
    });
  }
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  const fx = x + s * (d / 2 + 0.01);
  const fz = z + c * (d / 2 + 0.01);
  k.add(new BoxGeometry(w * 0.22, h * 0.45, 0.04), rnd() > 0.5 ? C.blueDoor : C.terracotta, {
    p: [fx, y + h * 0.22, fz],
    r: [0, ry, 0],
  });
}

/** Muelle de tablas desde `(x, z)` hacia `dir` (rad, 0 = este). */
export function pier(k: Kit, x: number, z: number, dir: number, len: number, y = 0.35): void {
  const c = Math.cos(dir);
  const s = Math.sin(dir);
  const planks = Math.max(3, Math.round(len / 0.42));
  for (let i = 0; i < planks; i++) {
    const t = (i + 0.5) / planks;
    k.add(new BoxGeometry(0.36, 0.08, 1.1), i % 2 ? C.wood : '#a86a37', {
      p: [x + c * len * t, y, z + s * len * t],
      r: [0, -dir, 0],
    });
  }
  for (let i = 0; i <= 2; i++) {
    const t = i / 2;
    for (const side of [-1, 1]) {
      k.add(new CylinderGeometry(0.07, 0.07, 1.1, 5), C.woodDark, {
        p: [x + c * len * t - s * side * 0.5, y - 0.35, z + s * len * t + c * side * 0.5],
      });
    }
  }
}

/** Boia de canal o de carril: cuerpo, franja y remate. */
export function buoy(k: Kit, x: number, z: number, body: string, band: string, s = 1): void {
  k.add(new CylinderGeometry(0.28 * s, 0.4 * s, 0.7 * s, 8), body, { p: [x, 0.2 * s, z] });
  k.add(new CylinderGeometry(0.29 * s, 0.3 * s, 0.16 * s, 8), band, { p: [x, 0.42 * s, z] });
  k.add(new ConeGeometry(0.2 * s, 0.34 * s, 8), body, { p: [x, 0.72 * s, z] });
}

/** Salvavidas flotante. */
export function lifebuoy(k: Kit, x: number, z: number, s = 1): void {
  const g = new TorusGeometry(0.4 * s, 0.13 * s, 5, 10);
  k.add(g, C.white, { p: [x, 0.06, z], r: [Math.PI / 2, 0, 0] });
}

/** Una bandera triangular en un mástil. */
export function flag(k: Kit, x: number, y: number, z: number, h: number, color: string): void {
  k.add(new CylinderGeometry(0.035, 0.045, h, 5), C.woodDark, { p: [x, y + h / 2, z] });
  k.add(new ConeGeometry(0.22, 0.6, 3), color, {
    p: [x + 0.3, y + h - 0.2, z],
    r: [0, 0, -Math.PI / 2],
    s: [1, 1, 0.25],
  });
}

/** Caja de madera. */
export function crate(k: Kit, x: number, y: number, z: number, s: number, ry = 0): void {
  k.add(new BoxGeometry(s, s, s), C.wood, { p: [x, y + s / 2, z], r: [0, ry, 0] });
  k.add(new BoxGeometry(s * 1.02, s * 0.14, s * 1.02), C.woodDark, {
    p: [x, y + s / 2, z],
    r: [0, ry, 0],
  });
}
