import {
  ENTITY_SCHEMAS,
  type AreaItem,
  type EntityArea,
  type ItemOverride,
  type PlacePatch,
  type Rank,
  type SkinPatch,
} from './schema';

/**
 * Resolución de contenido, pura: muestra + cambios del Admin. Un cambio del
 * Admin gana siempre a la muestra; restablecer un área es borrar sus cambios.
 */

/**
 * Lista resuelta de un área: la muestra, con cada cambio del Admin encima
 * (sustituye el elemento entero, o lo quita si está en la papelera), los
 * nuevos al final y, si el Admin ordenó el área, en su orden. Un cambio
 * guardado que ya no cumple el esquema se ignora (se ve la muestra).
 */
export function resolveEntities<A extends EntityArea>(
  area: A,
  sample: readonly AreaItem<A>[],
  overrides: Readonly<Record<string, ItemOverride>> | undefined,
  order: readonly string[] | undefined,
): AreaItem<A>[] {
  const schema = ENTITY_SCHEMAS[area];
  const byId = new Map<string, AreaItem<A>>();
  for (const item of sample) byId.set(item.id, item);
  for (const [id, o] of Object.entries(overrides ?? {})) {
    if (o.deleted) {
      byId.delete(id);
      continue;
    }
    const parsed = schema.safeParse(o.value);
    if (parsed.success && (parsed.data as { id: string }).id === id) {
      byId.set(id, parsed.data as AreaItem<A>);
    }
  }
  const items = [...byId.values()];
  if (!order || order.length === 0) return items;
  const rank = new Map(order.map((id, i) => [id, i]));
  const base = new Map(items.map((it, i) => [it.id, i]));
  return items.sort((a, b) => {
    const ra = rank.get(a.id);
    const rb = rank.get(b.id);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return (base.get(a.id) ?? 0) - (base.get(b.id) ?? 0);
  });
}

/**
 * Lista de un área con el borrador encima (REQ-ADM-015): lo publicado y, sobre
 * cada elemento, su cambio sin publicar; el orden del borrador si lo hay.
 */
export function resolveWithDrafts<A extends EntityArea>(
  area: A,
  sample: readonly AreaItem<A>[],
  published: Readonly<Record<string, ItemOverride>> | undefined,
  publishedOrder: readonly string[] | undefined,
  draft: Readonly<Record<string, ItemOverride>> | undefined,
  draftOrder: readonly string[] | undefined,
): AreaItem<A>[] {
  return resolveEntities(
    area,
    sample,
    { ...(published ?? {}), ...(draft ?? {}) },
    draftOrder ?? publishedOrder,
  );
}

/** Textos con los del borrador encima: null devuelve el texto a su valor de la app. */
export function applyDraftTexts(
  texts: Readonly<Record<string, string>>,
  draft: Readonly<Record<string, string | null>>,
): Record<string, string> {
  const out: Record<string, string> = { ...texts };
  for (const [k, v] of Object.entries(draft)) {
    if (v === null) delete out[k];
    else out[k] = v;
  }
  return out;
}

/** Textos: los de la app (`base`) con los del Admin encima. */
export function resolveTexts(
  base: Readonly<Record<string, string>>,
  overrides: Readonly<Record<string, string>>,
): Record<string, string> {
  return { ...base, ...overrides };
}

/** Junta dos cambios de lugar: los campos nuevos ganan; `params` se mezcla por clave. */
export function mergePlacePatch(a: PlacePatch | undefined, b: PlacePatch): PlacePatch {
  const out: PlacePatch = { ...(a ?? {}), ...b };
  if (a?.params || b.params) out.params = { ...(a?.params ?? {}), ...(b.params ?? {}) };
  return out;
}

/** Junta dos cambios de piel: los campos nuevos ganan; `texts` se mezcla por clave. */
export function mergeSkinPatch(a: SkinPatch | undefined, b: SkinPatch): SkinPatch {
  const out: SkinPatch = { ...(a ?? {}), ...b };
  if (a?.texts || b.texts) out.texts = { ...(a?.texts ?? {}), ...(b.texts ?? {}) };
  return out;
}

/**
 * Aplica un cambio compartido a un lugar con la forma de @boia/world
 * (`position: {x, y}`) o plana (`x`, `y`). Devuelve una copia. `params` se
 * entrega aparte: su forma la decide quien pinta el mundo.
 */
export function applyPlacePosition<T extends { position: { x: number; y: number } }>(
  place: T,
  patch: PlacePatch | undefined,
): T {
  if (!patch || (patch.x === undefined && patch.y === undefined)) return place;
  return {
    ...place,
    position: { ...place.position, x: patch.x ?? place.position.x, y: patch.y ?? place.position.y },
  };
}

/** Rango para unos puntos: el de umbral más alto alcanzado (REQ-IDE-028). */
export function rankFor(points: number, ranks: readonly Rank[]): Rank | null {
  let best: Rank | null = null;
  for (const r of ranks)
    if (points >= r.minPoints && (!best || r.minPoints > best.minPoints)) best = r;
  return best;
}
