import { bottlePositionValidator, settleInSea } from '@boia/engine/bottles';
import { type BoiaRepository, SAMPLE_BOTTLES, browserRepository } from '@boia/store';
import type { WorldConfig } from '@boia/world';
import { worlds } from '../app/juego/demo-world';

/**
 * El repositorio de la demo (T16, D-20): todo en este navegador. Lo usan
 * /juego, /carnet y la compra de prueba de la landing (T25). Las botellas se
 * validan contra el mar del mapa compartido (el mismo en todos los mundos) y
 * las de muestra, cuyas coordenadas son del mapa de Arcilla, se dejan en el
 * mar del mapa que se juega hoy.
 *
 * `browserRepository` se queda con las opciones de la primera llamada, y la
 * landing y /juego comparten pestaña (EXPLORAR navega sin recargar): en la
 * web, toda llamada tiene que pasar por aquí.
 */

/** El mar donde flotan las botellas: el del mapa compartido. */
export function seaWorld(): WorldConfig {
  return worlds.get(worlds.defaultId).config;
}

let sampleBottles: typeof SAMPLE_BOTTLES | null = null;

export function gameRepository(): BoiaRepository {
  sampleBottles ??= settleInSea(seaWorld(), SAMPLE_BOTTLES);
  return browserRepository({
    validate: { bottlePosition: bottlePositionValidator(seaWorld) },
    sample: { bottles: sampleBottles },
  });
}
