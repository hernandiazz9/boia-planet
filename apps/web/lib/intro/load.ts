import {
  DEFAULT_INTRO_CONFIG,
  INTRO_MANIFEST_IDS,
  TITLE_MANIFEST_ID,
  resolveIntroAssets,
  resolveTitleSheet,
  validateIntroConfig,
  type ArtImage,
  type IntroAssets,
  type IntroConfig,
  type IntroGeometry,
  type TitleSheet,
} from '@boia/engine/intro';
import { worldIntroGeometry } from '@boia/engine/intro/world-geometry';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { demoWorld } from '../../app/juego/demo-world';

/**
 * Sólo servidor (se ejecuta al construir la landing estática): valida la
 * configuración de la entrada, lee los manifiestos de `art/` (D-16) para la
 * ilustración ligera y calcula la geometría del mini-mundo a partir del
 * mundo de la demo (el mismo que `/juego`). Si algo no cuadra, devuelve
 * `null` y la landing sale sin cinemática, con su versión ligera
 * (REQ-ENT-017).
 */

export const ART_BASE_URL = '/api/art';
const ART_ROOT = path.resolve(process.cwd(), '../../art');

export interface IntroData {
  config: IntroConfig;
  assets: IntroAssets;
  geometry: IntroGeometry;
  /**
   * Imágenes que la escena va a pedir (arte del mundo y barco): el script de
   * arranque las pide ya, antes de hidratar, sólo si toca la entrada.
   */
  preload: string[];
  /**
   * Título 3D «BOIA» (T27): la hoja de sprites de Blender. Se pide después
   * del mini-mundo (no va en `preload`); sin ella, el título es texto plano.
   */
  title: TitleSheet | null;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const artUrl = (id: string, file: string) =>
  `${ART_BASE_URL}/${id}/${file.split('/').map(encodeURIComponent).join('/')}`;

/** Imágenes de los manifiestos de `art/` que usa el mundo de la demo. */
function worldImages(): string[] {
  const ids = new Set(
    demoWorld.objects.filter((o) => o.identity.active).map((o) => o.appearance.asset),
  );
  if (demoWorld.coast) ids.add(demoWorld.coast.asset);
  const urls: string[] = [];
  for (const id of ids) {
    let m: unknown;
    try {
      m = JSON.parse(readFileSync(path.join(ART_ROOT, id, 'manifest.json'), 'utf8'));
    } catch {
      continue; // sin arte: la escena dibuja un marcador
    }
    if (!isObj(m)) continue;
    const images = Array.isArray(m.images) ? m.images.filter(isObj) : [];
    for (const i of images) if (typeof i.file === 'string') urls.push(artUrl(id, i.file));
    const variants = isObj(m.tile) && isObj(m.tile.variants) ? Object.values(m.tile.variants) : [];
    for (const v of variants)
      if (isObj(v) && typeof v.file === 'string') urls.push(artUrl(id, v.file));
  }
  return urls;
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
  const geometry = worldIntroGeometry(demoWorld, checked.config, resolved.assets.artScale);
  if (!geometry) {
    console.warn('[boia] el punto de aterrizaje cae fuera del mundo; landing sin cinemática');
    return null;
  }
  const preload = [...new Set([resolved.assets.ship.url, ...worldImages()])];
  return {
    config: checked.config,
    assets: resolved.assets,
    geometry,
    preload,
    title: titleSheet(checked.config),
  };
}

function titleSheet(config: IntroConfig): TitleSheet | null {
  let manifest: unknown = null;
  try {
    manifest = JSON.parse(
      readFileSync(path.join(ART_ROOT, TITLE_MANIFEST_ID, 'manifest.json'), 'utf8'),
    );
  } catch {
    // resolveTitleSheet dice que falta.
  }
  const r = resolveTitleSheet(manifest, ART_BASE_URL, config.copy.title);
  if (!r.ok) {
    console.warn('[boia] sin título 3D; la entrada usa el título plano: ' + r.error);
    return null;
  }
  return r.sheet;
}

const pct = (f: number) => `${(f * 100).toFixed(3)}%`;
const media = (minWidth: number, css: string) =>
  minWidth > 0 ? `@media (min-width:${minWidth}px){${css}}` : css;

/**
 * CSS de la ilustración ligera del hero (isla y barco en `<img>`), con el
 * mismo encuadre por dispositivo que el último fotograma de la escena: al
 * llegar el motor, el canvas cubre la ilustración sin salto (REQ-ENT-038).
 */
export function stillCss({ config, assets }: IntroData): string {
  const rules = config.framings.map((f) => {
    const z = f.zoom * assets.artScale;
    // (x, y): px de juego a zoom 1 respecto al punto de aterrizaje.
    const place = (sel: string, art: ArtImage, x: number, y: number) =>
      `${sel}{width:${(art.width * art.scale * z).toFixed(2)}px;` +
      `left:calc(${pct(f.anchor[0])} + ${(x * f.zoom - art.pivot[0] * art.scale * z).toFixed(2)}px);` +
      `top:calc(${pct(f.anchor[1])} + ${(y * f.zoom - art.pivot[1] * art.scale * z).toFixed(2)}px)}`;
    const css =
      place('.hero__still-island', assets.island, 0, 0) +
      place('.hero__still-ship', assets.ship, config.ship.dx, config.ship.dy);
    return media(f.minWidth, css);
  });
  return rules.join('\n');
}

/**
 * CSS de la entrada que sale de su configuración (REQ-ENT-015): posición del
 * título y del botón por encuadre, y cuándo aparece la carga del acto 0.
 */
export function introCss({ config }: IntroData): string {
  const rules = config.framings.map((f) =>
    media(
      f.minWidth,
      `.intro-overlay__title{top:${pct(f.titleY)}}` +
        `.intro-overlay__enter{top:${pct(f.buttonY)}}`,
    ),
  );
  rules.push(`.intro-loading{animation-delay:${config.loading.showAfterMs}ms}`);
  return rules.join('\n');
}
