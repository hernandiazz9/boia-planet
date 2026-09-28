import { type WorldObject, WorldObject as WorldObjectSchema } from './schema';

/**
 * Botella del mar (REQ-IDE-040…044, T22) como tipo de objeto del mundo.
 *
 * Las botellas no son lugares del mapa compartido: las escriben los
 * miembros, viven en la capa de datos (`@boia/store`) y el motor las pinta
 * encima del mundo que se juega. Aquí sólo está su forma como objeto, para
 * que se dibujen con el mismo contrato de arte que el resto (§48.1): un
 * asset configurable, sin colisión (el barco pasa por encima) y sin
 * comportamientos del catálogo (leerlas lo decide la interfaz, no el motor).
 */

export const BOTTLE_CATEGORY = 'botella';

/**
 * Arte de la botella. Hasta que llegue el de T18 (`art/mundos/<mundo>/…`),
 * un marcador dibujado por código. Se cambia pasando otro id al motor
 * (`GameOptions.bottleAsset`), sin tocar datos.
 */
export const BOTTLE_PLACEHOLDER_ASSET = 'placeholder:botella';

/** Radio visual de la botella en u de mundo (marcador). muestra */
export const BOTTLE_RADIUS = 7;

/** Lo mínimo que el motor necesita para pintar una botella. */
export interface BottleMarker {
  id: string;
  x: number;
  y: number;
  /** La botella de quien juega: se distingue a simple vista. */
  mine?: boolean;
}

/** La botella como objeto del mundo (sin colisión ni comportamientos). */
export function bottleObject(b: BottleMarker, asset = BOTTLE_PLACEHOLDER_ASSET): WorldObject {
  return WorldObjectSchema.parse({
    identity: {
      id: `botella:${b.id}`,
      name: 'Botella',
      category: BOTTLE_CATEGORY,
      tags: b.mine ? ['botella', 'mia'] : ['botella'],
    },
    appearance: { asset, layer: 'object' },
    position: { x: b.x, y: b.y },
    geometry: { proximityRadius: BOTTLE_RADIUS },
    behaviors: [],
  });
}
