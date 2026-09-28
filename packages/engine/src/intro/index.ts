/**
 * Entrada «mini-mundo» (v14 §4.4, §47-B; D-19; REQ-ENT-*). Este punto de
 * entrada es puro (sin Pixi ni `@boia/world`) y puede ir en la ruta crítica
 * de la landing; la escena Pixi está en `@boia/engine/intro/scene` y se
 * carga bajo demanda, y la geometría a partir de un mundo, en
 * `@boia/engine/intro/world-geometry` (sólo al construir la página).
 */
export * from './config';
export * from './assets';
export * from './math';
export * from './sphere';
export * from './timeline';
export * from './title';
export * from './entry';
export * from './controller';
