import { SAMPLE_WORLD, type WorldConfig, parseWorldConfig } from '@boia/world';

/**
 * Mundo de la demo: el mundo de muestra de `@boia/world` (T04), sólo datos.
 * Spawn, boia tutorial, rocas, isla pequeña, isla de evento y costas con el
 * arte de T01. Cuando exista el editor (T09) vendrá de la revisión publicada.
 */
export const demoWorld: WorldConfig = parseWorldConfig(SAMPLE_WORLD);
