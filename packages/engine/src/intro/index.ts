/**
 * Entrada cinemática planeta → mar → landing (v14 §4.4, §47-B; REQ-ENT-*).
 * Este punto de entrada es puro (sin Pixi) y puede ir en la ruta crítica de
 * la landing; la escena Pixi está en `@boia/engine/intro/scene` y se carga
 * bajo demanda.
 */
export * from './config';
export * from './assets';
export * from './timeline';
export * from './entry';
export * from './controller';
