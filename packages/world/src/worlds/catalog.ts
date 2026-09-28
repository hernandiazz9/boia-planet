import { MUESTRA_SKIN, PRUEBA_SKIN, SAMPLE_MAP } from '../sample-world';
import { WorldRegistry } from './registry';

/**
 * Los mundos que se juegan hoy, sobre un mapa compartido. `muestra` es el
 * por defecto hasta que T20 ponga el mapa y la skin de Arcilla y T24 la de
 * Acuarela; `prueba` sólo existe para probar el cambio de mundo.
 */
export const WORLD_REGISTRY = new WorldRegistry(SAMPLE_MAP, [MUESTRA_SKIN, PRUEBA_SKIN], 'muestra');
