import type { Behavior, Rect, WorldConfig, WorldObject } from '@boia/world';

/**
 * El mapa compartido (D-20) visto en el mar 3D. Mismo mapa, mismos lugares y
 * mismos comportamientos que /juego, con dos cambios de escala para que en 3D
 * el mar no sea un desierto y las islas se lean desde lejos:
 *
 * - el agua entre zonas se acorta `spread` veces (el 2D la estira ×15 para
 *   un minuto de ruta directa; aquí el zoom ya da la vista de conjunto);
 * - las islas crecen `islandGrow` veces (casco, colisión y proximidad), y lo
 *   que está pegado a ellas se aparta con ellas.
 *
 * Las composiciones locales (el puerto, el remanso de la Fiestera, el
 * semáforo del circuito) no se acortan: cada pieza queda a su distancia 1:1
 * del ancla de su zona, como en el arte. Lo que sale es un `WorldConfig`
 * normal: lo ejecuta el mismo `WorldRuntime` que el 2D, en u de motor.
 * Todo `muestra`.
 */
export const MAR3D_SCALE = {
  spread: 2.5,
  islandGrow: 2.4,
  /** Las islas amplían su proximidad menos que su casco (el panel ya salta lejos). */
  islandProximityGrow: 1.5,
  /** u alrededor del ancla de una zona dentro de las que una pieza es composición local. */
  localRadius: 320,
  /** u de motor por unidad de escena de three.js (el barco mide 48 u → 3). */
  unitsPerScene: 16,
} as const;

type Point = { x: number; y: number };

interface Anchor {
  id: string;
  at: Point;
  to: Point;
  grow: number;
}

const isIsland = (o: WorldObject) => o.identity.category === 'isla';

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Anclas: el lugar que da nombre a cada zona (el que tiene su mismo id). */
function anchorsOf(world: WorldConfig): Anchor[] {
  const out: Anchor[] = [];
  for (const o of world.objects) {
    const zone = o.position.zone;
    if (!zone || o.identity.id !== zone) continue;
    const at = { x: o.position.x, y: o.position.y };
    out.push({
      id: o.identity.id,
      at,
      to: { x: at.x / MAR3D_SCALE.spread, y: at.y / MAR3D_SCALE.spread },
      grow: isIsland(o) ? MAR3D_SCALE.islandGrow : 1,
    });
  }
  return out;
}

function nearestAnchor(anchors: readonly Anchor[], p: Point): Anchor | null {
  let best: Anchor | null = null;
  let bestD: number = MAR3D_SCALE.localRadius;
  for (const a of anchors) {
    const d = Math.hypot(p.x - a.at.x, p.y - a.at.y);
    if (d <= bestD) {
      best = a;
      bestD = d;
    }
  }
  return best;
}

/** Un punto del mapa en el mar 3D (u de motor). */
export function compressPoint(anchors: readonly Anchor[], p: Point): Point {
  const a = nearestAnchor(anchors, p);
  if (a) {
    return { x: r2(a.to.x + (p.x - a.at.x) * a.grow), y: r2(a.to.y + (p.y - a.at.y) * a.grow) };
  }
  return { x: r2(p.x / MAR3D_SCALE.spread), y: r2(p.y / MAR3D_SCALE.spread) };
}

/** Recorre parámetros y cambia de escala todo lo que es un punto ({x, y}). */
function compressParams(anchors: readonly Anchor[], v: unknown): unknown {
  if (Array.isArray(v)) return v.map((x) => compressParams(anchors, x));
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(o)) out[k] = compressParams(anchors, x);
    if (typeof o.x === 'number' && typeof o.y === 'number') {
      const p = compressPoint(anchors, { x: o.x, y: o.y });
      out.x = p.x;
      out.y = p.y;
    }
    return out;
  }
  return v;
}

function growBehavior(b: Behavior, k: number): Behavior {
  if (b.type === 'proximity' && b.params.radius !== undefined) {
    return { ...b, params: { ...b.params, radius: r2(b.params.radius * k) } };
  }
  return b;
}

function compressObject(anchors: readonly Anchor[], o: WorldObject): WorldObject {
  const p = compressPoint(anchors, o.position);
  const out: WorldObject = { ...o, position: { ...o.position, x: p.x, y: p.y } };
  if (o.params) out.params = compressParams(anchors, o.params) as Record<string, unknown>;
  if (!isIsland(o)) return out;
  const g = MAR3D_SCALE.islandGrow;
  const pg = MAR3D_SCALE.islandProximityGrow;
  const geo = o.geometry;
  out.geometry = {
    ...geo,
    ...(geo.collision
      ? { collision: { ...geo.collision, radius: r2(geo.collision.radius * g) } }
      : {}),
    ...(geo.collisionParts
      ? {
          collisionParts: geo.collisionParts.map((c) => ({
            dx: r2(c.dx * g),
            dy: r2(c.dy * g),
            radius: r2(c.radius * g),
          })),
        }
      : {}),
    ...(geo.activation
      ? { activation: { ...geo.activation, radius: r2(geo.activation.radius * g) } }
      : {}),
    ...(geo.proximityRadius !== undefined
      ? {
          proximityRadius: r2(
            Math.max(geo.proximityRadius * pg, (geo.collision?.radius ?? 0) * g + 120),
          ),
        }
      : {}),
  };
  out.behaviors = o.behaviors.map((b) => growBehavior(b, pg));
  return out;
}

function compressRect(anchors: readonly Anchor[], r: Rect, spawn: Point): Rect {
  // Los lados abiertos (oeste, este, norte) van a escala de posiciones; el
  // sur (el paseo) es parte del puerto y queda a su distancia 1:1.
  const south = compressPoint(anchors, { x: spawn.x, y: r.bottom });
  return {
    left: r2(r.left / MAR3D_SCALE.spread),
    right: r2(r.right / MAR3D_SCALE.spread),
    top: r2(r.top / MAR3D_SCALE.spread),
    bottom: south.y,
  };
}

/** El mundo que se juega, en la escala del mar 3D. */
export function compressWorld(world: WorldConfig): WorldConfig {
  const anchors = anchorsOf(world);
  const spawn = world.spawn ?? {
    x: (world.bounds.left + world.bounds.right) / 2,
    y: world.bounds.bottom - 200,
    heading: -Math.PI / 2,
  };
  const s = compressPoint(anchors, spawn);
  return {
    ...world,
    bounds: compressRect(anchors, world.bounds, spawn),
    spawn: { x: s.x, y: s.y, heading: spawn.heading },
    sectors: world.sectors.map((sec) => ({
      ...sec,
      area: {
        left: r2(sec.area.left / MAR3D_SCALE.spread),
        right: r2(sec.area.right / MAR3D_SCALE.spread),
        top: r2(sec.area.top / MAR3D_SCALE.spread),
        bottom: r2(sec.area.bottom / MAR3D_SCALE.spread),
      },
    })),
    objects: world.objects.map((o) => compressObject(anchors, o)),
  };
}

/** u de motor → unidades de escena. */
export const toScene = (u: number) => u / MAR3D_SCALE.unitsPerScene;
/** Unidades de escena → u de motor. */
export const fromScene = (s: number) => s * MAR3D_SCALE.unitsPerScene;
