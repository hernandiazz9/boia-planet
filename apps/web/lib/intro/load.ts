import {
  DEFAULT_INTRO_CONFIG,
  INTRO_MANIFEST_IDS,
  resolveIntroAssets,
  validateIntroConfig,
  type ArtImage,
  type IntroAssets,
  type IntroConfig,
} from '@boia/engine/intro';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Sólo servidor (se ejecuta al construir la landing estática): lee los
 * manifiestos de `art/` (D-16) y resuelve los recursos de la entrada. Si
 * falta un manifiesto o la configuración no valida, devuelve `null` y la
 * landing sale sin cinemática, con su versión ligera (REQ-ENT-017).
 */

export const ART_BASE_URL = '/api/art';
const ART_ROOT = path.resolve(process.cwd(), '../../art');

export interface IntroData {
  config: IntroConfig;
  assets: IntroAssets;
}

export function loadIntroData(): IntroData | null {
  const checked = validateIntroConfig(DEFAULT_INTRO_CONFIG);
  if (!checked.ok) {
    console.warn(
      '[boia] configuración de entrada inválida; landing sin cinemática\n' + checked.error,
    );
    return null;
  }
  const manifests: Record<string, unknown> = {};
  for (const id of INTRO_MANIFEST_IDS) {
    try {
      manifests[id] = JSON.parse(readFileSync(path.join(ART_ROOT, id, 'manifest.json'), 'utf8'));
    } catch {
      // resolveIntroAssets dirá cuál falta.
    }
  }
  const resolved = resolveIntroAssets(manifests, ART_BASE_URL, checked.config);
  if (!resolved.ok) {
    console.warn(
      '[boia] recursos de entrada incompletos; landing sin cinemática: ' + resolved.error,
    );
    return null;
  }
  return { config: checked.config, assets: resolved.assets };
}

/**
 * CSS de la ilustración ligera del hero (isla y barco en `<img>`), con el
 * mismo encuadre por dispositivo que el último fotograma de la escena: al
 * llegar el motor, el canvas cubre la ilustración sin salto (REQ-ENT-038).
 */
export function stillCss({ config, assets }: IntroData): string {
  const rules = config.framings.map((f) => {
    const z = f.zoom * assets.artScale;
    const isla = assets.sprites['isla-evento'];
    const place = (sel: string, art: ArtImage, x: number, y: number) =>
      `${sel}{width:${(art.width * art.scale * z).toFixed(2)}px;` +
      `left:calc(${(f.anchor[0] * 100).toFixed(3)}% + ${((x - art.pivot[0] * art.scale) * z).toFixed(2)}px);` +
      `top:calc(${(f.anchor[1] * 100).toFixed(3)}% + ${((y - art.pivot[1] * art.scale) * z).toFixed(2)}px)}`;
    const css =
      place('.hero__still-island', isla, 0, 0) +
      place('.hero__still-ship', assets.ship, config.ship.x, config.ship.y);
    return f.minWidth > 0 ? `@media (min-width:${f.minWidth}px){${css}}` : css;
  });
  return rules.join('\n');
}
