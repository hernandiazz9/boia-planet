import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  RingGeometry,
  Vector3,
} from 'three';
import { litMaterial } from './characters';
import { Kit, rng, smooth, wobble } from './kit';
import { C } from './palette';

/**
 * Vuelo del botón «Entradas» (experimento): el barco levita, le salen alas
 * de nave y vuela sobre el planeta hasta la isla del evento, donde se posa
 * en el agua. Aquí están el perfil del vuelo (puro, con pruebas) y sus
 * piezas de escena: las alas con propulsores, la estela de chispas, el
 * chapoteo al despegar y al posarse y las nubes que pasan a su altura.
 * Todo `muestra`.
 */

// --- Perfil ---------------------------------------------------------------------

/** Tiempos (s) y alturas (unidades de escena) del vuelo. muestra */
export const FLIGHT = {
  /** Sube a levitar sobre el agua (s) y a qué altura. */
  hoverUp: 1.0,
  hover: 1.4,
  /** Las alas salen entre estos dos instantes. */
  wingsFrom: 0.85,
  wingsTo: 2.0,
  /** Empieza a avanzar. */
  go: 2.3,
  /** Altura de crucero sobre el agua. */
  cruise: 9,
  /** u de motor por segundo de crucero y límites del tramo que avanza (s). */
  uPerS: 620,
  minTravel: 2.4,
  maxTravel: 4.4,
  /** Desde que llega encima hasta que toca el agua (s). */
  settle: 0.95,
} as const;

export interface FlightPlan {
  /** Cuándo empieza y termina el avance y cuándo toca el agua (s desde el despegue). */
  go: number;
  arrive: number;
  total: number;
}

export function flightPlan(distanceU: number): FlightPlan {
  const travel = Math.min(FLIGHT.maxTravel, Math.max(FLIGHT.minTravel, distanceU / FLIGHT.uPerS));
  const go = FLIGHT.go;
  const arrive = go + travel;
  return { go, arrive, total: arrive + FLIGHT.settle };
}

export interface FlightPose {
  /** 0..1 del camino hecho. */
  travel: number;
  /** Altura sobre el agua (escena). */
  alt: number;
  /** 0 plegadas (no se ven) … 1 abiertas. */
  wings: number;
  /** Morro arriba (+) o abajo (−), rad. */
  pitch: number;
  /** Cuánto tira el propulsor (0..1). */
  thrust: number;
  /** 0..1 del giro hacia el destino (mientras levita). */
  turn: number;
  phase: 'lift' | 'cruise' | 'land' | 'done';
}

const smoother = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** Cómo va el barco `t` s después de despegar. */
export function flightPose(t: number, plan: FlightPlan): FlightPose {
  const { go, arrive, total } = plan;
  const travel = smoother((t - go) / (arrive - go));
  // Levita (y al final se posa) y, encima, sube a la altura de crucero y baja.
  const hover = FLIGHT.hover * smooth(0, FLIGHT.hoverUp, t) * (1 - smooth(total - 0.45, total, t));
  const climb = smooth(go - 0.1, go + 0.9, t) * (1 - smooth(arrive - 0.8, arrive + 0.2, t));
  const bob = Math.sin(t * 5.2) * 0.12 * smooth(0.2, 0.7, t) * (1 - smooth(total - 0.5, total, t));
  const alt = t >= total ? 0 : Math.max(0, hover + (FLIGHT.cruise - FLIGHT.hover) * climb + bob);
  const wings =
    smooth(FLIGHT.wingsFrom, FLIGHT.wingsTo, t) * (1 - smooth(arrive + 0.05, total - 0.3, t));
  // Morro arriba al arrancar, abajo al bajar.
  const pitch =
    0.3 * (smooth(go - 0.15, go + 0.35, t) - smooth(go + 0.4, go + 1.1, t)) -
    0.18 * (smooth(arrive - 1.0, arrive - 0.6, t) - smooth(arrive - 0.2, arrive + 0.25, t));
  const thrust = smooth(go - 0.25, go + 0.1, t) * (1 - smooth(arrive - 0.6, arrive, t));
  const turn = smoother((t - 0.25) / (go - 0.2));
  const phase = t >= total ? 'done' : t < go ? 'lift' : t < arrive ? 'cruise' : 'land';
  return { travel, alt, wings, pitch, thrust, turn, phase };
}

// --- Alas ------------------------------------------------------------------------

/** Una ala hacia +z (la otra es su espejo): delta con franja naranja, aleta y luz en la punta. */
function wingGeometry(side: 1 | -1): BufferGeometry {
  const kit = new Kit();
  const tri = (pts: number[], color: string, y: number) => {
    const g = new BufferGeometry();
    const v: number[] = [];
    for (let i = 0; i < pts.length; i += 2) v.push(pts[i]!, y, pts[i + 1]! * side);
    g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3));
    g.computeVertexNormals();
    kit.add(g, color);
  };
  // Plano del ala: raíz ancha, punta echada atrás.
  const root = [0.55, 0.05, -0.95, 0.05];
  const tip = [-1.25, 2.35, -0.75, 2.35];
  tri([root[0]!, root[1]!, root[2]!, root[3]!, tip[0]!, tip[1]!], C.cream, 0);
  tri([root[0]!, root[1]!, tip[0]!, tip[1]!, tip[2]!, tip[3]!], C.cream, 0);
  // Franja naranja por el borde de ataque y otra morada detrás.
  tri([0.42, 0.25, 0.1, 0.25, -0.72, 2.05], C.orange, 0.012);
  tri([0.1, 0.25, -0.95, 2.05, -0.72, 2.05], C.orange, 0.012);
  tri([-0.35, 0.3, -0.7, 0.3, -1.05, 1.7], C.purpleSoft, 0.012);
  // Aleta en la punta (vertical).
  const fin = new BufferGeometry();
  const fz = 2.33 * side;
  fin.setAttribute(
    'position',
    new BufferAttribute(
      new Float32Array([
        -0.7,
        0,
        fz,
        -1.3,
        0,
        fz,
        -1.35,
        0.55,
        fz,
        -0.7,
        0,
        fz,
        -1.35,
        0.55,
        fz,
        -1.1,
        0.55,
        fz,
      ]),
      3,
    ),
  );
  fin.computeVertexNormals();
  kit.add(fin, C.purple);
  return kit.build();
}

export class Wings {
  /** Cuelga del grupo del barco; copia el cabeceo y el balanceo del casco. */
  readonly group = new Group();
  private readonly pivots: Group[] = [];
  private readonly tips: Mesh[] = [];
  private readonly flames: Mesh[] = [];
  private readonly flameMat = new MeshBasicMaterial({
    color: '#ffb347',
    transparent: true,
    opacity: 0.9,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  private readonly tipMat = new MeshBasicMaterial({ color: C.yellow });

  constructor(scale: number) {
    this.group.scale.setScalar(scale);
    const mat = litMaterial();
    for (const side of [1, -1] as const) {
      const pivot = new Group();
      pivot.position.set(-0.05, 0.42, 0.55 * side);
      const wing = new Mesh(wingGeometry(side), mat);
      pivot.add(wing);
      const tip = new Mesh(new IcosahedronGeometry(0.11, 0), this.tipMat);
      tip.position.set(-1.05, 0.02, 2.36 * side);
      pivot.add(tip);
      this.tips.push(tip);
      this.pivots.push(pivot);
      this.group.add(pivot);
      // Propulsor a popa, a cada lado.
      const nozzle = new Mesh(
        new ConeGeometry(0.13, 0.32, 6),
        new MeshLambertMaterial({ color: C.navy }),
      );
      nozzle.rotation.z = Math.PI / 2;
      nozzle.position.set(-1.45, 0.3, 0.3 * side);
      this.group.add(nozzle);
      const flame = new Mesh(new ConeGeometry(0.12, 1, 6, 1, true), this.flameMat);
      flame.rotation.z = Math.PI / 2;
      flame.position.set(-1.6, 0.3, 0.3 * side);
      this.group.add(flame);
      this.flames.push(flame);
    }
    this.set(0, 0, 0, 0);
  }

  /** Abiertas `open` (0..1), aleteo, empuje del propulsor y tiempo. */
  set(open: number, thrust: number, t: number, flap = 1): void {
    this.group.visible = open > 0.01;
    // Salen con un poco de rebote y se despliegan desde vertical (pegadas al casco).
    const s = open <= 0 ? 0.001 : Math.max(0.001, easeOutBack(open));
    const unfold = 1 - smooth(0.15, 1, open);
    const beat = Math.sin(t * 7) * 0.07 * flap * open;
    this.pivots.forEach((p, i) => {
      const side = i === 0 ? 1 : -1;
      p.scale.set(Math.min(1, s * 1.2), s, s);
      p.rotation.x = -side * (unfold * (Math.PI / 2) + 0.12 * (1 - unfold) + beat);
    });
    const glow = 0.8 + Math.sin(t * 13) * 0.2;
    for (const tip of this.tips) tip.scale.setScalar(open * glow);
    this.flameMat.opacity = 0.9 * thrust;
    this.flames.forEach((f, i) => {
      const flick = 0.75 + Math.sin(t * 31 + i * 2) * 0.15 + Math.sin(t * 17 + i) * 0.1;
      f.scale.set(0.2 + thrust * 1.8 * flick, 1, 0.8 + thrust * 0.4);
      f.position.x = -1.45 - (0.1 + thrust * 0.9 * flick) / 2;
      f.visible = thrust > 0.02;
    });
  }

  /** Dónde están las puntas de las alas (escena), para la estela. */
  tipsWorld(out: [Vector3, Vector3]): void {
    this.tips[0]!.getWorldPosition(out[0]);
    this.tips[1]!.getWorldPosition(out[1]);
  }
}

function easeOutBack(x: number): number {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// --- Estela de chispas ---------------------------------------------------------------

/** Chispas que dejan las puntas de las alas y los propulsores; se apagan solas. */
export class Sparks {
  readonly mesh: InstancedMesh;
  private readonly N = 160;
  private readonly p: { pos: Vector3; vel: Vector3; life: number; max: number; size: number }[] =
    [];
  private readonly o = new Object3D();
  private next = 0;

  constructor() {
    this.mesh = new InstancedMesh(
      new IcosahedronGeometry(0.16, 0),
      new MeshBasicMaterial({
        color: '#ffe08a',
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      this.N,
    );
    this.mesh.frustumCulled = false;
    const colors = ['#ffd23f', '#fff4e2', '#f26a1b', '#b9a6ff'];
    for (let i = 0; i < this.N; i++) {
      this.mesh.setColorAt(i, new Color(colors[i % colors.length]!));
      this.p.push({ pos: new Vector3(), vel: new Vector3(), life: 0, max: 1, size: 1 });
      this.o.scale.setScalar(0);
      this.o.updateMatrix();
      this.mesh.setMatrixAt(i, this.o.matrix);
    }
  }

  emit(at: Vector3, vx: number, vy: number, vz: number, size = 1, life = 0.7): void {
    const q = this.p[this.next]!;
    this.next = (this.next + 1) % this.N;
    q.pos.copy(at);
    q.vel.set(
      vx + (Math.random() - 0.5) * 1.2,
      vy + (Math.random() - 0.5) * 1.2,
      vz + (Math.random() - 0.5) * 1.2,
    );
    q.life = q.max = life * (0.7 + Math.random() * 0.6);
    q.size = size * (0.6 + Math.random() * 0.8);
  }

  update(dt: number): void {
    let any = false;
    for (let i = 0; i < this.N; i++) {
      const q = this.p[i]!;
      if (q.life <= 0) continue;
      any = true;
      q.life -= dt;
      q.vel.multiplyScalar(1 - dt * 2.5);
      q.pos.addScaledVector(q.vel, dt);
      this.o.position.copy(q.pos);
      this.o.scale.setScalar(Math.max(0, q.life / q.max) * q.size);
      this.o.updateMatrix();
      this.mesh.setMatrixAt(i, this.o.matrix);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// --- Chapoteo ------------------------------------------------------------------------

/** Anillo de espuma que se abre sobre el agua y gotas que saltan (al despegar y al posarse). */
export class Splash {
  readonly group = new Group();
  private readonly ring: Mesh;
  private readonly ringMat = new MeshBasicMaterial({
    color: C.white,
    transparent: true,
    opacity: 0,
    side: DoubleSide,
    depthWrite: false,
  });
  private readonly drops: InstancedMesh;
  private readonly N = 36;
  private readonly d: { pos: Vector3; vel: Vector3; life: number }[] = [];
  private readonly o = new Object3D();
  private age = 99;

  constructor() {
    this.ring = new Mesh(new RingGeometry(0.8, 1, 40), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.06;
    this.drops = new InstancedMesh(
      new IcosahedronGeometry(0.12, 0),
      new MeshBasicMaterial({ color: '#e8fbff' }),
      this.N,
    );
    this.drops.frustumCulled = false;
    for (let i = 0; i < this.N; i++) {
      this.d.push({ pos: new Vector3(), vel: new Vector3(), life: 0 });
      this.o.scale.setScalar(0);
      this.o.updateMatrix();
      this.drops.setMatrixAt(i, this.o.matrix);
    }
    this.group.add(this.ring, this.drops);
    this.group.visible = false;
  }

  burst(x: number, z: number, strength = 1): void {
    this.group.visible = true;
    this.age = 0;
    this.ring.position.x = x;
    this.ring.position.z = z;
    for (const q of this.d) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.8 + Math.random() * 0.8;
      q.pos.set(x + Math.cos(a) * r, 0.1, z + Math.sin(a) * r);
      const s = (2 + Math.random() * 3) * strength;
      q.vel.set(Math.cos(a) * s, (4 + Math.random() * 5) * strength, Math.sin(a) * s);
      q.life = 1.4;
    }
  }

  update(dt: number): void {
    if (!this.group.visible) return;
    this.age += dt;
    const k = Math.min(1, this.age / 1.1);
    this.ring.scale.setScalar(1 + k * 5);
    this.ringMat.opacity = 0.85 * (1 - k);
    let any = k < 1;
    for (let i = 0; i < this.N; i++) {
      const q = this.d[i]!;
      if (q.life <= 0) continue;
      q.life -= dt;
      q.vel.y -= 16 * dt;
      q.pos.addScaledVector(q.vel, dt);
      const alive = q.life > 0 && q.pos.y > 0;
      if (!alive) q.life = 0;
      else any = true;
      this.o.position.copy(q.pos);
      this.o.scale.setScalar(alive ? 1 : 0);
      this.o.updateMatrix();
      this.drops.setMatrixAt(i, this.o.matrix);
    }
    this.drops.instanceMatrix.needsUpdate = true;
    if (!any) this.group.visible = false;
  }
}

// --- Nubes del vuelo ---------------------------------------------------------------------

/**
 * Nubecillas a la altura del vuelo, repartidas a lo largo del camino: el
 * barco pasa entre ellas y se nota la velocidad. Aparecen al despegar y se
 * van al posarse.
 */
export class FlightClouds {
  readonly group = new Group();
  private readonly mat = new MeshLambertMaterial({
    color: '#ffffff',
    emissive: '#9a90c4',
    transparent: true,
    opacity: 0,
    flatShading: true,
    depthWrite: false,
  });

  constructor() {
    const rnd = rng(311);
    for (let i = 0; i < 10; i++) {
      const c = new Group();
      const puffs = 2 + Math.floor(rnd() * 3);
      for (let j = 0; j < puffs; j++) {
        const s = 1.6 + rnd() * 1.8;
        const m = new Mesh(wobble(new IcosahedronGeometry(s, 1), s * 0.18, rnd), this.mat);
        m.position.set(
          j * s * 0.9 - puffs * s * 0.4,
          (rnd() - 0.5) * s * 0.3,
          (rnd() - 0.5) * s * 0.6,
        );
        m.scale.set(1, 0.55, 0.8);
        c.add(m);
      }
      c.userData.side = (rnd() < 0.5 ? -1 : 1) * (2.5 + rnd() * 6);
      c.userData.up = (rnd() - 0.5) * 5;
      c.userData.at = 0.08 + (i / 10) * 0.84 + (rnd() - 0.5) * 0.05;
      this.group.add(c);
    }
    this.group.visible = false;
  }

  /**
   * Las pone a lo largo del camino (escena, desde `from` en la dirección
   * `dir` normalizada, `len` de largo) a la altura `alt`, con opacidad `k`.
   */
  place(
    fromX: number,
    fromZ: number,
    dirX: number,
    dirZ: number,
    len: number,
    alt: number,
    k: number,
  ): void {
    this.group.visible = k > 0.01;
    this.mat.opacity = 0.8 * k;
    if (!this.group.visible) return;
    for (const c of this.group.children) {
      const u = c.userData as { side: number; up: number; at: number };
      c.position.set(
        fromX + dirX * len * u.at - dirZ * u.side,
        alt + u.up,
        fromZ + dirZ * len * u.at + dirX * u.side,
      );
    }
  }
}
