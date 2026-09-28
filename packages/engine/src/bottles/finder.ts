import type { Vec2 } from '@boia/world';

/**
 * Botellas «encontradas»: las que flotan cerca del barco y se pueden leer
 * (REQ-IDE-041). Una botella aparece al acercarse a `BOTTLE_FIND_RADIUS` y
 * no se va hasta alejarse más de `BOTTLE_LOSE_RADIUS`: así el barco puede
 * frenar pasada la botella sin que el botón para leerla desaparezca.
 */

/** u. muestra */
export const BOTTLE_FIND_RADIUS = 150;
/** u; mayor que la frenada del barco a toda velocidad (≈ 140 u). muestra */
export const BOTTLE_LOSE_RADIUS = 240;

export interface Findable extends Vec2 {
  id: string;
}

/**
 * Ids de las botellas cerca del barco, de la más cercana a la más lejana.
 * `previous` son las que ya estaban cerca (para no perderlas al frenar).
 */
export function nearbyBottles(
  ship: Vec2,
  bottles: readonly Findable[],
  previous: ReadonlySet<string> = new Set(),
): string[] {
  return bottles
    .map((b) => ({ id: b.id, d: Math.hypot(b.x - ship.x, b.y - ship.y) }))
    .filter((b) => b.d <= BOTTLE_FIND_RADIUS || (previous.has(b.id) && b.d <= BOTTLE_LOSE_RADIUS))
    .sort((a, b) => a.d - b.d || a.id.localeCompare(b.id))
    .map((b) => b.id);
}
