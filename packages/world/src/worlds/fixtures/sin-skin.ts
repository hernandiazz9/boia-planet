import { MUESTRA_SKIN, PRUEBA_SKIN, SAMPLE_MAP } from '../../sample-world';
import { WorldRegistry } from '../registry';

/**
 * Fixture de `world:check`: los mundos de prueba con una skin quitada (la
 * isla pequeña del mundo `prueba`). El check tiene que salir con 1.
 */
export const REMOVED = { world: 'prueba', place: 'isla-pequena-1' } as const;

const places = { ...PRUEBA_SKIN.places };
delete places[REMOVED.place];

export const registry = new WorldRegistry(
  SAMPLE_MAP,
  [MUESTRA_SKIN, { ...PRUEBA_SKIN, places }],
  'muestra',
);
