import { readFileSync } from 'node:fs';
import { INTRO_MANIFEST_IDS, resolveIntroAssets, type IntroAssets } from './assets';
import { DEFAULT_INTRO_CONFIG } from './config';

/** Sólo pruebas: los manifiestos reales de `art/`, leídos del disco. */
export function readArtManifests(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const id of INTRO_MANIFEST_IDS) {
    const url = new URL(`../../../../art/${id}/manifest.json`, import.meta.url);
    out[id] = JSON.parse(readFileSync(url, 'utf8'));
  }
  return out;
}

export function realAssets(): IntroAssets {
  const r = resolveIntroAssets(readArtManifests(), '/api/art', DEFAULT_INTRO_CONFIG);
  if (!r.ok) throw new Error(r.error);
  return r.assets;
}
