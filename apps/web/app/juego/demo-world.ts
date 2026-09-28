import { WORLD_REGISTRY, type WorldConfig, type WorldRegistry } from '@boia/world';

/**
 * Mundos del juego (T17): un mapa compartido y una skin por mundo, de
 * `@boia/world`. Hoy `muestra` (el de plan 001, por defecto) y `prueba`.
 * Cuando exista el editor vendrán de la revisión publicada.
 */
export const worlds: WorldRegistry = WORLD_REGISTRY;

/**
 * El mundo por defecto ya compuesto. Lo usan la entrada (la esfera de T14) y
 * la prueba de la esfera; `/juego` elige el suyo con `world-choice.ts`.
 */
export const demoWorld: WorldConfig = worlds.get(worlds.defaultId).config;
