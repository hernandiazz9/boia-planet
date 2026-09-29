import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
} from 'three';
import { litMaterial } from './characters';
import { Kit, rng, wobble } from './kit';
import { C } from './palette';
import { Glows, house, palm, pine, rock } from './props';

/**
 * Las costas del mar 3D: acantilados de arcilla al oeste y al este (el borde
 * del mundo, donde el barco roza y desliza) y, al sur, la ciudad: el paseo
 * con su mosaico de olas, palmeras, casas blancas y el castillo en su monte.
 * El norte queda abierto (la corriente devuelve el barco) con islotes a lo
 * lejos. Unidades de escena; `bounds` es el rectángulo del mundo.
 */

export interface SceneRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CoastBuild {
  group: Group;
  glows: Glows;
}

/** Acantilado a lo largo de un lado (`side` −1 oeste, +1 este). */
function cliff(
  k: Kit,
  x0: number,
  side: -1 | 1,
  z0: number,
  z1: number,
  rnd: () => number,
  glows: Glows,
): void {
  const step = 4;
  const n = Math.ceil((z1 - z0) / step);
  const pos: number[] = [];
  const col: number[] = [];
  const tmp = new Color();
  const tri = (a: number[], b: number[], c: number[], color: string) => {
    // Cara hacia el mar (−side en x) o hacia arriba.
    pos.push(...a, ...(side < 0 ? b : c), ...(side < 0 ? c : b));
    tmp.set(color);
    const j = 1 + (rnd() - 0.5) * 0.16;
    for (let v = 0; v < 3; v++) col.push(tmp.r * j, tmp.g * j, tmp.b * j);
  };
  const prof: number[][] = [];
  for (let i = 0; i <= n; i++) {
    const z = z0 + i * step;
    const bite = Math.abs(Math.sin(z * 0.05) * 1.6 + Math.sin(z * 0.13 + 1) * 0.8) + rnd() * 0.5;
    const face = x0 + side * bite;
    const hgt = 6 + Math.sin(z * 0.021) * 3 + Math.sin(z * 0.07) * 1.5 + rnd();
    prof.push([
      face - side * 0.6,
      -2.5,
      face,
      hgt * 0.45,
      face + side * 0.9,
      hgt,
      face + side * 3.5,
      hgt + 0.4,
      face + side * 80,
      hgt + 1,
    ]);
  }
  const colors = [C.cliffDark, C.cliff, C.grassDark, C.grass];
  for (let i = 0; i < n; i++) {
    const A = prof[i]!;
    const B = prof[i + 1]!;
    const za = z0 + i * step;
    const zb = za + step;
    for (let j = 0; j < 4; j++) {
      const a0 = [A[j * 2]!, A[j * 2 + 1]!, za];
      const a1 = [A[j * 2 + 2]!, A[j * 2 + 3]!, za];
      const b0 = [B[j * 2]!, B[j * 2 + 1]!, zb];
      const b1 = [B[j * 2 + 2]!, B[j * 2 + 3]!, zb];
      tri(a0, b0, a1, colors[j]!);
      tri(a1, b0, b1, colors[j]!);
    }
    // Pinos y alguna casa en lo alto.
    if (rnd() > 0.35) {
      const x = A[4]! + side * (2 + rnd() * 10);
      pine(k, x, A[5]!, za + rnd() * step, 2 + rnd() * 1.8);
    }
    if (rnd() > 0.9) {
      const x = A[4]! + side * (6 + rnd() * 6);
      house(k, x, A[5]!, za, 2.2, 1.8, 1.6, rnd() * Math.PI, rnd);
      glows.add([x, A[5]! + 1.2, za], C.bulb, 1.6);
    }
    // Rocas al pie.
    if (rnd() > 0.55) rock(k, A[2]! - side * (0.6 + rnd()), 0, za, 0.6 + rnd() * 0.9, rnd);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  k.addPainted(g);
}

/** El mosaico de olas del paseo (rojo, crema y negro), en canvas. */
function mosaicTexture(): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 64;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#f1e2c8';
  g.fillRect(0, 0, 256, 64);
  const band = (y: number, color: string, amp: number) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 4) g.lineTo(x, y + Math.sin((x / 256) * Math.PI * 4) * amp);
    g.lineTo(256, y + 8);
    for (let x = 256; x >= 0; x -= 4) g.lineTo(x, y + 8 + Math.sin((x / 256) * Math.PI * 4) * amp);
    g.closePath();
    g.fill();
  };
  band(8, '#b8332b', 6);
  band(26, '#2b2327', 6);
  band(44, '#b8332b', 6);
  const t = new CanvasTexture(cv);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  return t;
}

function southTown(k: Kit, b: SceneRect, rnd: () => number, glows: Glows, group: Group): void {
  const quay = b.bottom + 0.4;
  const w = b.right - b.left + 180;
  // Muelle de piedra (el borde donde para el barco).
  k.add(new BoxGeometry(w, 2.4, 3), '#cdb893', { p: [0, -0.8, quay + 1.4] });
  k.add(new BoxGeometry(w, 0.2, 0.5), '#e9dcc0', { p: [0, 0.42, quay + 0.2] });
  // Paseo con mosaico.
  const tex = mosaicTexture();
  tex.repeat.set(w / 6, 1);
  const walk = new Mesh(new PlaneGeometry(w, 5), new MeshLambertMaterial({ map: tex }));
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(0, 0.42, quay + 5.4);
  group.add(walk);
  k.add(new BoxGeometry(w, 0.8, 12), '#d7c29c', { p: [0, 0, quay + 8.5] });
  // Palmeras del paseo y farolas.
  for (let x = b.left - 60; x <= b.right + 60; x += 8) {
    palm(k, x + (rnd() - 0.5), 0.4, quay + 7.4, 4 + rnd() * 1.2, rnd);
    if (Math.round(x / 8) % 2 === 0) {
      k.add(new CylinderGeometry(0.06, 0.08, 2.4, 5), C.iron, { p: [x + 4, 1.9, quay + 7.6] });
      k.add(new SphereGeometry(0.22, 6, 5), C.bulb, { p: [x + 4, 3.2, quay + 7.6] });
      glows.add([x + 4, 3.2, quay + 7.6], C.bulb, 2.4);
    }
  }
  // Calle y manzanas de casas blancas.
  k.add(new BoxGeometry(w, 1.2, 80), '#cbb58e', { p: [0, 0.1, quay + 54] });
  const castleX = b.left * 0.28;
  for (let row = 0; row < 5; row++) {
    for (let x = b.left - 70; x <= b.right + 70; x += 3.2 + rnd() * 2) {
      if (Math.abs(x - castleX) < 22 + row * 3) continue;
      const hgt = 1.8 + rnd() * (row === 0 ? 3.5 : 2.2) + row * 0.3;
      const z = quay + 13 + row * 5.5 + (rnd() - 0.5);
      house(k, x, 0.7, z, 2.6 + rnd(), 3 + rnd(), hgt, (rnd() - 0.5) * 0.1, rnd);
      if (rnd() > 0.7) glows.add([x, 0.7 + hgt * 0.6, z - 1.7], C.bulb, 1.4);
    }
  }
  // El monte y el castillo.
  const hill = wobble(new ConeGeometry(26, 26, 9, 3), 2.5, rnd);
  k.add(hill, C.cliff, { p: [castleX, 12, quay + 30], s: [1, 1, 0.8] });
  const cy = 24;
  k.add(new BoxGeometry(14, 3, 7), '#e3cfa8', { p: [castleX, cy, quay + 30] });
  for (const [dx, dz] of [
    [-7, -3.5],
    [7, -3.5],
    [-7, 3.5],
    [7, 3.5],
  ] as const) {
    k.add(new CylinderGeometry(1.3, 1.5, 5, 8), '#dcc49a', {
      p: [castleX + dx, cy + 1, quay + 30 + dz],
    });
  }
  for (let i = 0; i < 7; i++) {
    k.add(new BoxGeometry(1, 0.8, 0.6), '#e3cfa8', {
      p: [castleX - 6 + i * 2, cy + 1.9, quay + 26.6],
    });
  }
  k.add(new CylinderGeometry(0.08, 0.08, 4, 5), C.iron, { p: [castleX, cy + 3.5, quay + 30] });
  k.add(new BoxGeometry(1.8, 1.1, 0.05), C.purple, { p: [castleX + 0.9, cy + 4.8, quay + 30] });
  glows.add([castleX, cy + 2, quay + 26], C.bulb, 5);
}

/** Islotes lejanos al norte (fuera de alcance): el horizonte no está vacío. */
function farIslets(k: Kit, b: SceneRect, rnd: () => number): void {
  for (let i = 0; i < 6; i++) {
    const x = b.left + (b.right - b.left) * (i / 5) + (rnd() - 0.5) * 30;
    const z = b.top - 70 - rnd() * 60;
    const s = 6 + rnd() * 10;
    k.add(
      wobble(new SphereGeometry(s, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), s * 0.2, rnd),
      C.cliff,
      {
        p: [x, -0.5, z],
        s: [1.6, 0.45, 1],
      },
    );
    for (let j = 0; j < 3; j++)
      pine(k, x + (rnd() - 0.5) * s, s * 0.4, z + (rnd() - 0.5) * s * 0.6, 3);
  }
}

export function buildCoast(b: SceneRect, cave: { z: number; side: -1 | 1 } | null): CoastBuild {
  const rnd = rng(20260929);
  const k = new Kit();
  const glows = new Glows();
  const group = new Group();
  cliff(k, b.left, -1, b.top - 140, b.bottom + 40, rnd, glows);
  cliff(k, b.right, 1, b.top - 140, b.bottom + 40, rnd, glows);
  southTown(k, b, rnd, glows, group);
  farIslets(k, b, rnd);
  if (cave) {
    const x = cave.side < 0 ? b.left - 1.2 : b.right + 1.2;
    k.add(new SphereGeometry(2.4, 10, 6, 0, Math.PI), '#231c1a', {
      p: [x, 0, cave.z],
      r: [0, cave.side < 0 ? Math.PI / 2 : -Math.PI / 2, 0],
      s: [1, 1.1, 0.6],
    });
  }
  group.add(new Mesh(k.build(), litMaterial()));
  return { group, glows };
}
