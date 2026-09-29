import {
  SAMPLE_WORLD,
  WORLD_REGISTRY,
  type WorldConfig,
  type WorldRegistry,
  parseWorldConfig,
} from '@boia/world';

/**
 * Mundos del juego (T17): un mapa compartido y una skin por mundo, de
 * `@boia/world`. Desde T20 el mapa es el de `mundos/arcilla/mapa.json` y el
 * mundo por defecto, Arcilla (más `prueba`, hasta que T24 ponga Acuarela).
 * Cuando exista el editor vendrán de la revisión publicada.
 */
export const worlds: WorldRegistry = WORLD_REGISTRY;

/**
 * El mundo de la entrada (la esfera de T14) y de su prueba: sigue siendo el
 * de muestra de plan 001, pequeño y con su punto de aterrizaje, hasta que T28
 * haga que EXPLORAR descubra el puerto del mundo activo. `/juego` elige el
 * suyo con `world-choice.ts`.
 */
export const demoWorld: WorldConfig = parseWorldConfig(SAMPLE_WORLD);
