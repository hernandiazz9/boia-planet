import {
  BufferAttribute,
  BufferGeometry,
  Color,
  type ColorRepresentation,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Kit de modelado del mar 3D: piezas low-poly con el color en los vértices,
 * fusionadas en una sola geometría por grupo (una llamada de dibujo por isla
 * y material). Sin texturas: el aspecto es de maqueta de barro pintado, con
 * caras planas (el material usa `flatShading`).
 */

export type Vec3 = readonly [number, number, number];

export interface Place {
  p?: Vec3;
  r?: Vec3;
  s?: Vec3 | number;
}

const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpE = new Euler();
const tmpV = new Vector3();
const tmpS = new Vector3();
const tmpC = new Color();

export function matrixOf({ p = [0, 0, 0], r = [0, 0, 0], s = 1 }: Place): Matrix4 {
  tmpE.set(r[0], r[1], r[2]);
  tmpQ.setFromEuler(tmpE);
  tmpV.set(p[0], p[1], p[2]);
  if (typeof s === 'number') tmpS.set(s, s, s);
  else tmpS.set(s[0], s[1], s[2]);
  return tmpM.clone().compose(tmpV, tmpQ, tmpS);
}

/** Pinta una geometría (sin índices) de un color y la deja lista para fusionar. */
export function paint(geo: BufferGeometry, color: ColorRepresentation): BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 3);
  tmpC.set(color);
  for (let i = 0; i < n; i++) {
    c[i * 3] = tmpC.r;
    c[i * 3 + 1] = tmpC.g;
    c[i * 3 + 2] = tmpC.b;
  }
  g.setAttribute('color', new BufferAttribute(c, 3));
  return g;
}

/** Varía un poco el color de cada cara: da el tacto de pieza hecha a mano. */
export function jitterFaces(geo: BufferGeometry, amount: number, rnd: () => number): void {
  const col = geo.getAttribute('color');
  if (!col) return;
  for (let f = 0; f < col.count; f += 3) {
    const k = 1 + (rnd() - 0.5) * amount;
    for (let v = f; v < f + 3 && v < col.count; v++) {
      col.setXYZ(v, col.getX(v) * k, col.getY(v) * k, col.getZ(v) * k);
    }
  }
}

/** Un grupo de piezas que acaba en una sola geometría. */
export class Kit {
  private readonly parts: BufferGeometry[] = [];

  add(geo: BufferGeometry, color: ColorRepresentation, at: Place = {}): this {
    const g = paint(geo.clone(), color);
    g.applyMatrix4(matrixOf(at));
    this.parts.push(g);
    return this;
  }

  /** Añade una geometría ya pintada (de otro kit), colocada. */
  addPainted(geo: BufferGeometry, at: Place = {}): this {
    const g = geo.clone();
    g.applyMatrix4(matrixOf(at));
    this.parts.push(g);
    return this;
  }

  get empty(): boolean {
    return this.parts.length === 0;
  }

  build(): BufferGeometry {
    if (this.parts.length === 0) return new BufferGeometry();
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts.length = 0;
    if (!merged) throw new Error('mar3d: no se pudieron fusionar las piezas');
    merged.computeBoundingSphere();
    return merged;
  }
}

/** Generador pseudoaleatorio con semilla (mulberry32): el mismo mundo en cada visita. */
export function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semilla estable a partir de un id. */
export function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Mueve cada vértice un poco (rocas y colinas que no parecen de catálogo). */
export function wobble(geo: BufferGeometry, amount: number, rnd: () => number): BufferGeometry {
  const pos = geo.getAttribute('position');
  // Vértices que comparten sitio se mueven igual: la pieza no se abre.
  const seen = new Map<string, [number, number, number]>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let d = seen.get(key);
    if (!d) {
      d = [(rnd() - 0.5) * amount, (rnd() - 0.5) * amount, (rnd() - 0.5) * amount];
      seen.set(key, d);
    }
    pos.setXYZ(i, pos.getX(i) + d[0], pos.getY(i) + d[1], pos.getZ(i) + d[2]);
  }
  pos.needsUpdate = true;
  return geo;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
