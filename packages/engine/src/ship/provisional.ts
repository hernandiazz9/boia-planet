import { type Direction, type Vec2, directionHeading, worldToScreen } from '@boia/world';

/**
 * Barco provisional dibujado por código mientras no hay sprites del
 * encargo 01. Se modela como un prisma en el plano del agua y se proyecta con
 * la misma cámara que el resto del mundo, así cada una de las 8 vistas es una
 * vista real (nunca un espejo) y los anclajes salen de la geometría.
 * Colores de marca `muestra` (los mismos que usa el 01).
 */
export const BOIA_ORANGE = 0xf26a1b;
export const BOIA_NAVY = 0x12233f;
export const SAIL_WHITE = 0xf5efe4;

/** Eslora del barco en unidades de mundo; también fija la escala de los sprites del 01. muestra */
export const SHIP_LENGTH = 64;
const LENGTH = SHIP_LENGTH;
const BEAM = 26;
const DECK_Z = 11;
const MAST_Z = 66;
const BOOM_Z = 20;

/** Casco en coordenadas locales: f hacia la proa, s a estribor. */
const HULL: readonly (readonly [number, number])[] = [
  [LENGTH * 0.5, 0],
  [LENGTH * 0.18, BEAM * 0.5],
  [-LENGTH * 0.46, BEAM * 0.4],
  [-LENGTH * 0.5, 0],
  [-LENGTH * 0.46, -BEAM * 0.4],
  [LENGTH * 0.18, -BEAM * 0.5],
];

export interface Polygon {
  points: Vec2[];
  fill: number;
  /** Profundidad para ordenar de atrás adelante (y de mundo media). */
  depth: number;
}

export interface ProvisionalShipView {
  direction: Direction;
  hull: Polygon[];
  deck: Polygon;
  sail: Vec2[];
  mast: [Vec2, Vec2];
  flag: Vec2[];
  prow: Vec2[];
  /** Anclajes en px de pantalla relativos al pivote (0, 0). */
  anchors: { pivot: Vec2; mast_top: Vec2; slot_passenger: Vec2; wake_origin: Vec2 };
}

function shade(color: number, k: number): number {
  const r = Math.round(((color >> 16) & 0xff) * k);
  const g = Math.round(((color >> 8) & 0xff) * k);
  const b = Math.round((color & 0xff) * k);
  return (Math.min(r, 255) << 16) | (Math.min(g, 255) << 8) | Math.min(b, 255);
}

export function provisionalShipView(direction: Direction): ProvisionalShipView {
  const h = directionHeading(direction);
  const fx = Math.cos(h);
  const fy = Math.sin(h);
  // Local (f, s, z) → mundo relativo al pivote → pantalla.
  const world = (f: number, s: number) => ({ x: fx * f - fy * s, y: fy * f + fx * s });
  const project = (f: number, s: number, z: number) => worldToScreen({ ...world(f, s), z });

  const hull: Polygon[] = [];
  for (let i = 0; i < HULL.length; i++) {
    const [f0, s0] = HULL[i]!;
    const [f1, s1] = HULL[(i + 1) % HULL.length]!;
    const a = world(f0, s0);
    const b = world(f1, s1);
    // Normal exterior en el plano (el polígono va en sentido horario en f-s).
    const nx = b.y - a.y;
    const ny = -(b.x - a.x);
    const nlen = Math.hypot(nx, ny) || 1;
    // Sólo las caras que miran al espectador (+y) se ven desde la cámara.
    if (ny / nlen <= 0.02) continue;
    const light = 0.72 + 0.28 * Math.max(0, (-nx / nlen) * 0.6 + (ny / nlen) * 0.4);
    const k = 0.82;
    hull.push({
      points: [
        project(f0 * k, s0 * k, 0),
        project(f1 * k, s1 * k, 0),
        project(f1, s1, DECK_Z),
        project(f0, s0, DECK_Z),
      ],
      fill: shade(BOIA_ORANGE, light),
      depth: (a.y + b.y) / 2,
    });
  }
  hull.sort((p, q) => p.depth - q.depth);

  const deck: Polygon = {
    points: HULL.map(([f, s]) => project(f * 0.9, s * 0.9, DECK_Z)),
    fill: 0xf7b27a,
    depth: 0,
  };

  const mastF = LENGTH * 0.06;
  const mast: [Vec2, Vec2] = [project(mastF, 0, DECK_Z), project(mastF, 0, MAST_Z)];
  // Vela con algo de embolsado a babor para que se lea también de proa.
  const sail = [
    project(mastF, 0, MAST_Z - 4),
    project(mastF, 0, BOOM_Z),
    project(-LENGTH * 0.34, -5, BOOM_Z),
  ];
  const flag = [
    project(mastF, 0, MAST_Z),
    project(mastF - 14, -1, MAST_Z - 4),
    project(mastF, 0, MAST_Z - 9),
  ];
  const prow = [
    project(LENGTH * 0.5, 0, DECK_Z),
    project(LENGTH * 0.3, BEAM * 0.28, DECK_Z),
    project(LENGTH * 0.3, -BEAM * 0.28, DECK_Z),
  ];

  return {
    direction,
    hull,
    deck,
    sail,
    mast,
    flag,
    prow,
    anchors: {
      pivot: { x: 0, y: 0 },
      mast_top: project(mastF, 0, MAST_Z),
      slot_passenger: project(-LENGTH * 0.22, 0, DECK_Z),
      wake_origin: project(-LENGTH * 0.5, 0, 0),
    },
  };
}

/** Punto de proa en pantalla relativo al pivote (para comprobar la orientación). */
export function provisionalBow(direction: Direction): Vec2 {
  const h = directionHeading(direction);
  return worldToScreen({ x: Math.cos(h) * LENGTH * 0.5, y: Math.sin(h) * LENGTH * 0.5, z: DECK_Z });
}
