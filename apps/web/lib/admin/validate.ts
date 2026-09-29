import {
  COLLISION_DEFAULTS,
  type WorldConfig,
  type WorldObject,
  type WorldRegistry,
  type WorldSkin,
  composeWorld,
} from '@boia/world';
import {
  MAP_POINT_KEYS,
  MAP_POINT_LABELS,
  type WorldContent,
  applySkinPatches,
  composeLiveWorld,
  isMapPointId,
  liveMap,
  mapPoint,
} from './world';

/**
 * Validación de un cambio del mundo antes de guardarlo (REQ-ADM-013,
 * REQ-ADM-014), con las mismas reglas que comprueban las pruebas del mar de
 * T09/T20 (`packages/engine/src/world/arcilla.test.ts`):
 * - los ids existen (lugares del mapa o puntos del mapa);
 * - cada lugar queda dentro del mapa y el resultado es un mundo válido para el
 *   esquema de `@boia/world` en todos los mundos;
 * - la salida, el puerto, el aterrizaje de la entrada y todo destino de
 *   teletransporte quedan en el agua (nunca en tierra);
 * - ninguna isla corta el paso: desde la salida se llega a cada lugar que
 *   hace algo.
 * Devuelve el motivo del rechazo, en castellano, o null.
 */

/** Radio del casco (`DEFAULT_SHIP_CONFIG.radius` de @boia/engine). */
export const SHIP_RADIUS = 13.5;
/** Lado de la celda de la inundación (el de las pruebas del mar). */
export const NAV_CELL = 16;

interface Circle {
  x: number;
  y: number;
  radius: number;
}

/** Círculos sólidos de un mundo (objetos activos con COLISIÓN sólida), como el motor. */
export function solidCircles(world: WorldConfig): Circle[] {
  const out: Circle[] = [];
  for (const o of world.objects) {
    if (!o.identity.active || o.state?.visible === false) continue;
    const radius = o.geometry.collision?.radius ?? o.geometry.activation?.radius;
    if (radius === undefined) continue;
    const b = o.behaviors.find((x) => x.type === 'collision');
    if (b?.type !== 'collision') continue;
    if (!(b.params.solid ?? COLLISION_DEFAULTS[b.params.mode].solid)) continue;
    out.push({ x: o.position.x, y: o.position.y, radius });
    if (o.geometry.collision) {
      for (const p of o.geometry.collisionParts ?? []) {
        out.push({ x: o.position.x + p.dx, y: o.position.y + p.dy, radius: p.radius });
      }
    }
  }
  return out;
}

/** ¿Cabe el barco en `p` sin tocar tierra ni salirse del mapa? */
export function isWater(world: WorldConfig, obstacles: Circle[], p: { x: number; y: number }) {
  const b = world.bounds;
  const r = SHIP_RADIUS;
  if (p.x < b.left + r || p.x > b.right - r || p.y < b.top + r || p.y > b.bottom - r) return false;
  return obstacles.every((o) => Math.hypot(p.x - o.x, p.y - o.y) >= o.radius + r);
}

/** Hasta dónde hay que acercarse para que el lugar haga lo suyo. */
function interactionRadius(o: WorldObject): number {
  const r = SHIP_RADIUS;
  const prox = o.geometry.proximityRadius;
  const touch = (o.geometry.activation?.radius ?? o.geometry.collision?.radius ?? 0) + r;
  const collect = o.behaviors.find((x) => x.type === 'collectible');
  const pick = collect?.type === 'collectible' ? (collect.params.radius ?? touch) + r : 0;
  return Math.max(prox ?? 0, touch, pick);
}

/** Lugares activos que hacen algo y a los que no se llega desde la salida. */
export function unreachablePlaces(
  world: WorldConfig,
  obstacles = solidCircles(world),
): WorldObject[] {
  const b = world.bounds;
  const R = SHIP_RADIUS;
  const cell = NAV_CELL;
  const cols = Math.ceil((b.right - b.left) / cell);
  const rows = Math.ceil((b.bottom - b.top) / cell);
  const cx = (i: number) => b.left + (i + 0.5) * cell;
  const cy = (j: number) => b.top + (j + 0.5) * cell;
  const water = new Uint8Array(cols * rows).fill(1);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = cx(i);
      const y = cy(j);
      if (x < b.left + R || x > b.right - R || y < b.top + R || y > b.bottom - R) {
        water[j * cols + i] = 0;
      }
    }
  }
  for (const o of obstacles) {
    const reach = o.radius + R;
    const i0 = Math.max(0, Math.floor((o.x - reach - b.left) / cell));
    const i1 = Math.min(cols - 1, Math.floor((o.x + reach - b.left) / cell));
    const j0 = Math.max(0, Math.floor((o.y - reach - b.top) / cell));
    const j1 = Math.min(rows - 1, Math.floor((o.y + reach - b.top) / cell));
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        if (Math.hypot(cx(i) - o.x, cy(j) - o.y) < reach) water[j * cols + i] = 0;
      }
    }
  }
  const seen = new Uint8Array(cols * rows);
  const s = world.spawn ?? { x: (b.left + b.right) / 2, y: b.bottom - R * 2 };
  const si = Math.floor((s.x - b.left) / cell);
  const sj = Math.floor((s.y - b.top) / cell);
  if (si >= 0 && sj >= 0 && si < cols && sj < rows && water[sj * cols + si]) {
    const queue = [sj * cols + si];
    seen[queue[0]!] = 1;
    while (queue.length) {
      const k = queue.pop()!;
      const i = k % cols;
      const j = (k - i) / cols;
      const next = [
        i + 1 < cols ? k + 1 : -1,
        i > 0 ? k - 1 : -1,
        j + 1 < rows ? k + cols : -1,
        j > 0 ? k - cols : -1,
      ];
      for (const n of next) {
        if (n < 0 || seen[n] || !water[n]) continue;
        seen[n] = 1;
        queue.push(n);
      }
    }
  }
  const out: WorldObject[] = [];
  for (const o of world.objects) {
    if (!o.identity.active) continue;
    // Decorado sin función (anillo, carriles, posidonia) o sólo roca: no hace falta llegar.
    if (o.behaviors.every((x) => x.type === 'decorative' || x.type === 'collision')) continue;
    const r = interactionRadius(o);
    const i0 = Math.max(0, Math.floor((o.position.x - r - b.left) / cell));
    const i1 = Math.min(cols - 1, Math.floor((o.position.x + r - b.left) / cell));
    const j0 = Math.max(0, Math.floor((o.position.y - r - b.top) / cell));
    const j1 = Math.min(rows - 1, Math.floor((o.position.y + r - b.top) / cell));
    let ok = false;
    for (let i = i0; i <= i1 && !ok; i++) {
      for (let j = j0; j <= j1 && !ok; j++) {
        if (!seen[j * cols + i]) continue;
        if (Math.hypot(cx(i) - o.position.x, cy(j) - o.position.y) <= r) ok = true;
      }
    }
    if (!ok) out.push(o);
  }
  return out;
}

function zodMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'issues' in err && Array.isArray(err.issues)) {
    const first = err.issues[0] as { message?: string; path?: unknown[] } | undefined;
    if (first?.message) return first.message;
  }
  return err instanceof Error ? err.message.split('\n')[0]! : String(err);
}

/** La skin sin nada oculto: la navegación se comprueba con todos los lugares a la vista. */
function withEverythingVisible(skin: WorldSkin): WorldSkin {
  const places = Object.fromEntries(
    Object.entries(skin.places).map(([id, s]) => {
      const copy = { ...s };
      delete copy.hidden;
      return [id, copy];
    }),
  );
  return { ...skin, places };
}

/**
 * Motivo por el que este estado del mundo no se puede guardar, o null. Se
 * comprueba en todos los mundos: el mapa es el mismo y un cambio de posición
 * vale en todos.
 */
export function worldProblem(registry: WorldRegistry, content: WorldContent): string | null {
  const known = new Map(registry.map.places.map((p) => [p.id, p]));
  for (const id of Object.keys(content.places)) {
    if (!known.has(id) && !isMapPointId(id)) return `no existe el lugar «${id}» en el mapa`;
  }
  const b = registry.map.bounds;
  for (const [id, patch] of Object.entries(content.places)) {
    const base = known.get(id);
    const x = patch.x ?? base?.position.x;
    const y = patch.y ?? base?.position.y;
    if (x === undefined || y === undefined) continue;
    if (x < b.left || x > b.right || y < b.top || y > b.bottom) {
      return `«${base?.name ?? id}» quedaría fuera del mapa`;
    }
  }
  for (const [worldId, byPlace] of Object.entries(content.skins)) {
    if (!registry.has(worldId)) return `no existe el mundo «${worldId}»`;
    for (const id of Object.keys(byPlace)) {
      if (!known.has(id)) return `no existe el lugar «${id}» en el mapa`;
    }
  }
  // Esquema: cada mundo se compone sin errores.
  for (const id of registry.ids()) {
    try {
      composeLiveWorld(registry, id, content);
    } catch (err) {
      return `el mundo «${id}» no sería válido: ${zodMessage(err)}`;
    }
  }
  // El mar: con todos los lugares a la vista (lo más estricto para cualquier mundo).
  const map = liveMap(registry, content);
  const skin = withEverythingVisible(registry.skin(registry.defaultId));
  const world = composeWorld(map, applySkinPatches(map, skin, {})).config;
  const obstacles = solidCircles(world);
  for (const key of MAP_POINT_KEYS) {
    const p = mapPoint(registry.map, key, content.places);
    if (p && !isWater(world, obstacles, p)) {
      return `${MAP_POINT_LABELS[key]}: quedaría en tierra o fuera del mar navegable`;
    }
  }
  for (const o of world.objects) {
    if (!o.identity.active) continue;
    for (const beh of o.behaviors) {
      if (beh.type !== 'teleport') continue;
      if (!isWater(world, obstacles, beh.params)) {
        return `el teletransporte de «${o.identity.name}» dejaría el barco en tierra`;
      }
    }
  }
  const blocked = unreachablePlaces(world, obstacles);
  if (blocked.length > 0) {
    const names = blocked.slice(0, 3).map((o) => `«${o.identity.name}»`);
    return `una isla cortaría el paso: desde la salida no se llega a ${names.join(', ')}${
      blocked.length > 3 ? ` y ${blocked.length - 3} más` : ''
    }`;
  }
  return null;
}
