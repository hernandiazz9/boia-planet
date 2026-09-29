import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLD_REGISTRY, parseArtManifest, parseAssetRef, placePartArt } from '@boia/world';
import { describe, expect, it } from 'vitest';
import { missionDestination, rescueMissionOf } from './rescue';

/**
 * La misión de la Fiestera (T21) en cada mundo registrado (T24): sale de los
 * datos del mapa compartido, así que en Acuarela es la misma misión (mismo
 * personaje, cocodrilos, radios y destino) y sólo cambia el dibujo de la
 * tripulante, que es la pieza `tripulante` del arte del mundo. Que la misión
 * siga a bordo al cambiar de mundo lo prueba `rescue.test.ts` (T21).
 */

const ART = fileURLToPath(new URL('../../../../art/', import.meta.url));
const worlds = WORLD_REGISTRY.ids().map((id) => WORLD_REGISTRY.get(id));
const specs = worlds.map((w) => ({ w, spec: rescueMissionOf(w.config)! }));

describe('la misión de la Fiestera en cada mundo', () => {
  it('hay misión en cada mundo, igual salvo el arte de la tripulante', () => {
    expect(worlds.length).toBeGreaterThanOrEqual(2);
    const [first, ...rest] = specs;
    for (const { w, spec } of specs) {
      expect(spec, w.id).not.toBeNull();
      expect(missionDestination(w.config, spec.destination), w.id).not.toBeNull();
    }
    const same = { ...first!.spec, crewAsset: null };
    for (const { w, spec } of rest) {
      expect({ ...spec, crewAsset: null }, w.id).toEqual(same);
    }
  });

  it('la tripulante de cada mundo es su pieza `tripulante`, que existe en art/', () => {
    for (const { w, spec } of specs) {
      expect(spec.crewAsset, w.id).toMatch(new RegExp(`^mundos/${w.id}/.*#tripulante$`));
      const ref = parseAssetRef(spec.crewAsset!);
      const file = path.join(ART, ref.base, 'manifest.json');
      expect(existsSync(file), file).toBe(true);
      const m = parseArtManifest(JSON.parse(readFileSync(file, 'utf8')));
      if (!m.ok) throw new Error(m.error);
      expect(placePartArt(m.manifest, ref.part!), spec.crewAsset!).not.toBeNull();
    }
  });
});
