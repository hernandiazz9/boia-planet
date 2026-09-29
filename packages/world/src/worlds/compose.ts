import type { Behavior } from '../behaviors';
import { type WorldConfig, type WorldObjectInput, parseWorldConfig } from '../schema';
import type { Place, SharedMap } from './map';
import { type PlaceSkin, type WorldSkin, type WorldTheme, skinAsset } from './skin';

/**
 * Mapa compartido + skin de un mundo = el `WorldConfig` que ya ejecuta el
 * motor. Los lugares salen en el orden del mapa, con su id estable como id
 * de objeto: el progreso (recompensas, descubrimientos) va por id y sobrevive
 * al cambio de mundo (REQ-AVE-011), nunca por coordenadas.
 */

/** Asset del marcador de un lugar sin skin en un mundo: se ve a propósito. */
export const MISSING_SKIN_ASSET = 'placeholder:sin-skin';

export interface SkinIssue {
  worldId: string;
  placeId: string;
  message: string;
}

/**
 * Problemas de una skin frente al mapa: skins o nombres de lugares que no
 * existen y bocadillos en lugares sin DIÁLOGO. Vacío si la skin es válida.
 */
export function skinIssues(map: SharedMap, skin: WorldSkin): SkinIssue[] {
  const byId = new Map(map.places.map((p) => [p.id, p]));
  const issues: SkinIssue[] = [];
  const add = (placeId: string, message: string) =>
    issues.push({ worldId: skin.id, placeId, message });
  for (const [id, s] of Object.entries(skin.places)) {
    const place = byId.get(id);
    if (!place) {
      add(id, `skin de un lugar que no está en el mapa «${map.id}»`);
      continue;
    }
    if (s.lines && !place.behaviors.some((b) => b.type === 'dialogue')) {
      add(id, 'bocadillos para un lugar sin DIÁLOGO');
    }
  }
  for (const id of Object.keys(skin.names)) {
    if (!byId.has(id)) add(id, `nombre de un lugar que no está en el mapa «${map.id}»`);
  }
  return issues;
}

export class SkinError extends Error {
  readonly issues: SkinIssue[];
  constructor(issues: SkinIssue[]) {
    super(issues.map((i) => `[${i.worldId}] ${i.placeId}: ${i.message}`).join('\n'));
    this.name = 'SkinError';
    this.issues = issues;
  }
}

/** Qué pasa con cada lugar en un mundo. */
export type PlaceStatus = 'skin' | 'missing' | 'hidden';

export interface ComposedWorld {
  id: string;
  config: WorldConfig;
  theme: WorldTheme;
  /** Estado de cada lugar del mapa en este mundo, en el orden del mapa. */
  places: { id: string; status: PlaceStatus; asset: string | null; name: string }[];
}

/** El nombre del lugar en un mundo: el suyo si lo cambia, si no el común. */
function placeName(place: Place, world: WorldSkin): string {
  return world.names[place.id] ?? place.name;
}

function skinnedBehaviors(place: Place, skin: PlaceSkin | undefined): Behavior[] {
  if (!skin?.lines) return place.behaviors;
  const lines = skin.lines;
  return place.behaviors.map((b) =>
    b.type === 'dialogue' ? { ...b, params: { ...b.params, lines } } : b,
  );
}

function placeObject(world: WorldSkin, place: Place): WorldObjectInput {
  const skin = world.places[place.id];
  const scale = (place.appearance?.scale ?? 1) * (skin?.scale ?? 1);
  const content = skin?.texts ? { ...place.content, texts: skin.texts } : place.content;
  return {
    identity: {
      id: place.id,
      name: placeName(place, world),
      category: place.category,
      tags: place.tags,
      active: place.active,
    },
    appearance: {
      ...place.appearance,
      asset: skin ? skinAsset(world.id, place.id, skin) : MISSING_SKIN_ASSET,
      scale,
    },
    position: place.position,
    geometry: place.geometry,
    behaviors: skinnedBehaviors(place, skin),
    ...(place.params ? { params: place.params } : {}),
    ...(content ? { content } : {}),
    ...(place.state ? { state: place.state } : {}),
    ...(place.reward ? { reward: place.reward } : {}),
  };
}

/**
 * Compone un mundo. Lanza `SkinError` si la skin no encaja con el mapa. Un
 * lugar sin skin sale con el marcador `MISSING_SKIN_ASSET` y su comportamiento
 * intacto; uno con `hidden: true` no sale.
 */
export function composeWorld(map: SharedMap, skin: WorldSkin): ComposedWorld {
  const issues = skinIssues(map, skin);
  if (issues.length > 0) throw new SkinError(issues);
  const objects: WorldObjectInput[] = [];
  const places: ComposedWorld['places'] = [];
  for (const place of map.places) {
    const s = skin.places[place.id];
    const name = placeName(place, skin);
    if (s?.hidden) {
      places.push({ id: place.id, status: 'hidden', asset: null, name });
      continue;
    }
    objects.push(placeObject(skin, place));
    places.push({
      id: place.id,
      status: s ? 'skin' : 'missing',
      asset: s ? skinAsset(skin.id, place.id, s) : null,
      name,
    });
  }
  const config = parseWorldConfig({
    id: `${skin.id}-${map.id}`,
    version: map.version,
    bounds: map.bounds,
    spawn: map.spawn,
    sectors: map.sectors,
    ...(skin.coast ? { coast: skin.coast } : {}),
    objects,
  });
  const theme: WorldTheme = {
    id: skin.id,
    name: skin.name,
    ship: skin.ship,
    sea: skin.sea,
    ui: skin.ui,
    music: skin.music,
    ...(skin.tagline ? { tagline: skin.tagline } : {}),
  };
  return { id: skin.id, config, theme, places };
}

/**
 * Alcance de un cambio de nombre: sólo un mundo (su nombre propio) o todos
 * (el nombre común, y se quitan los nombres propios de todos los mundos).
 */
export type RenameScope = { world: string } | 'all';

/**
 * Renombra un lugar sin mutar nada: devuelve el mapa y las skins nuevos.
 * `{ world }` pone el nombre propio de ese mundo; `'all'` cambia el común y
 * borra todos los propios, así el lugar se llama igual en todos los mundos.
 */
export function renamePlace(
  map: SharedMap,
  skins: readonly WorldSkin[],
  placeId: string,
  name: string,
  scope: RenameScope,
): { map: SharedMap; skins: WorldSkin[] } {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('un lugar necesita nombre');
  if (!map.places.some((p) => p.id === placeId)) throw new Error(`lugar desconocido: ${placeId}`);
  if (scope === 'all') {
    return {
      map: {
        ...map,
        places: map.places.map((p) => (p.id === placeId ? { ...p, name: trimmed } : p)),
      },
      skins: skins.map((s) => {
        if (!(placeId in s.names)) return s;
        const names = { ...s.names };
        delete names[placeId];
        return { ...s, names };
      }),
    };
  }
  if (!skins.some((s) => s.id === scope.world)) {
    throw new Error(`mundo desconocido: ${scope.world}`);
  }
  return {
    map,
    skins: skins.map((s) =>
      s.id === scope.world ? { ...s, names: { ...s.names, [placeId]: trimmed } } : s,
    ),
  };
}

/**
 * Mueve un lugar del mapa compartido sin mutar nada: devuelve el mapa nuevo.
 * La posición es del mapa, no de la skin, así que el lugar se mueve en todos
 * los mundos a la vez (D-20). Es lo que aplica un cambio compartido de
 * posición del Admin (`PlacePatch` de `@boia/store`).
 */
export function movePlace(map: SharedMap, placeId: string, x: number, y: number): SharedMap {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('posición no válida');
  if (!map.places.some((p) => p.id === placeId)) throw new Error(`lugar desconocido: ${placeId}`);
  return {
    ...map,
    places: map.places.map((p) =>
      p.id === placeId ? { ...p, position: { ...p.position, x, y } } : p,
    ),
  };
}
