import { MUESTRA_SKIN, PRUEBA_SKIN, SAMPLE_MAP } from '../../sample-world';
import { WorldRegistry } from '../registry';

/**
 * Fixture de `world:check`: el mundo `prueba` trae la skin de un lugar que
 * no está en el mapa compartido. El registro lo rechaza y el check sale con 1.
 */
export const UNKNOWN_PLACE = 'isla-fantasma';

export const registry = new WorldRegistry(
  SAMPLE_MAP,
  [
    MUESTRA_SKIN,
    { ...PRUEBA_SKIN, places: { ...PRUEBA_SKIN.places, [UNKNOWN_PLACE]: { asset: 'roca-a' } } },
  ],
  'muestra',
);
