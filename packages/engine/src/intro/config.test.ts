import { describe, expect, it } from 'vitest';
import { DEFAULT_INTRO_CONFIG, pickFraming, validateIntroConfig } from './config';
import { INTRO_MANIFEST_IDS, introImageUrls, resolveIntroAssets } from './assets';
import { readArtManifests, realAssets } from './test-fixtures';

const clone = () => structuredClone(DEFAULT_INTRO_CONFIG) as unknown as Record<string, unknown>;

describe('configuración de la entrada (REQ-ENT-015)', () => {
  it('la configuración por defecto es válida y trae «BOIA.PLANET» (REQ-ENT-003)', () => {
    const r = validateIntroConfig(DEFAULT_INTRO_CONFIG);
    expect(r.ok, r.ok ? '' : r.error).toBe(true);
    expect(DEFAULT_INTRO_CONFIG.copy.title).toBe('BOIA.PLANET');
  });

  it('rechaza con el campo que falla', () => {
    const c = clone();
    c.durationMs = 60_000;
    (c.copy as { title: string }).title = ' ';
    const r = validateIntroConfig(c);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('durationMs');
      expect(r.error).toContain('copy.title');
    }
  });

  it('exige una sola isla de evento en el polo (0, 0)', () => {
    const c = clone();
    const objects = c.objects as Array<Record<string, unknown>>;
    objects.push({ ...objects[0], id: 'otra' });
    const r = validateIntroConfig(c);
    expect(r.ok).toBe(false);
  });

  it('los encuadres se eligen por ancho de vista', () => {
    const [mobile, ...rest] = DEFAULT_INTRO_CONFIG.framings;
    expect(pickFraming(DEFAULT_INTRO_CONFIG, 360)).toBe(mobile);
    const widest = rest.at(-1) ?? mobile;
    expect(pickFraming(DEFAULT_INTRO_CONFIG, 4000)).toBe(widest);
  });
});

describe('recursos de la entrada desde los manifiestos de art/', () => {
  it('resuelve planeta, sprites y barco de los manifiestos reales', () => {
    const a = realAssets();
    const manifests = readArtManifests();
    const planeta = manifests.planeta as { layers: Array<{ id: string; file: string }> };
    for (const l of planeta.layers) {
      expect(introImageUrls(a)).toContain(`/api/art/planeta/${l.file}`);
    }
    // El centro del globo queda bajo el polo y el radio es positivo.
    expect(a.planet.globeCentre[1]).toBeGreaterThan(0);
    expect(a.planet.globeRadius).toBeGreaterThan(a.planet.globeCentre[1]);
    // La isla del planeta y la de evento miden casi lo mismo en la escena
    // (la del planeta lleva un contorno doble, algo más ancho).
    const isla = a.sprites['isla-evento'];
    const ratio = (a.planet.island.width * a.planet.island.scale) / (isla.width * isla.scale);
    expect(ratio).toBeGreaterThan(0.95);
    expect(ratio).toBeLessThan(1.05);
    // Escala de juego: el barco mide `ship.lengthPx` de eslora (D-15).
    expect(a.artScale).toBeGreaterThan(0);
    expect(a.sprites['boia-tutorial'].frames.length).toBeGreaterThan(1);
  });

  it('sin un manifiesto, dice cuál falta en vez de romper', () => {
    const manifests = readArtManifests();
    for (const id of INTRO_MANIFEST_IDS) {
      const partial = { ...manifests, [id]: undefined };
      const r = resolveIntroAssets(partial, '/api/art', DEFAULT_INTRO_CONFIG);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain(id);
    }
  });
});
