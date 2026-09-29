import { ARCILLA_MAP, ARCILLA_SKIN, ARCILLA_WORLD_ID, PRUEBA_SKIN_ARCILLA } from './arcilla';
import { WorldRegistry } from './registry';

/**
 * Los mundos que se juegan hoy, sobre el mapa compartido de T20 (sacado de
 * `mundos/arcilla/mapa.json`). `arcilla` es el por defecto; `prueba` sólo
 * existe para probar el cambio de mundo hasta que T24 ponga Acuarela. El
 * mundo de muestra de plan 001 (`SAMPLE_MAP`) sigue en `sample-world.ts` para
 * las pruebas y la entrada (hasta T28).
 */
export const WORLD_REGISTRY = new WorldRegistry(
  ARCILLA_MAP,
  [ARCILLA_SKIN, PRUEBA_SKIN_ARCILLA],
  ARCILLA_WORLD_ID,
);
