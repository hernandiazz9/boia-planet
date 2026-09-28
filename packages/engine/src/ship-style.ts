import { parseShipManifest } from '@boia/world';
import type { LoadedShipManifest } from './manifest-loader';
import { shipArtScale } from './world/visual';

/**
 * Estilo del barco (T11). El manifiesto raíz `art/barco/manifest.json` es el
 * del estilo por defecto y lista en `style_variants` los estilos de
 * exploración, cada uno con su manifiesto completo (misma forma) en
 * `estilos/<id>/manifest.json`. Son muestras para comparar con Álvaro.
 *
 * Qué estilo se usa: `?estilo=<id>` en la URL; sin parámetro, el último
 * elegido en este navegador; si no, el por defecto. Un id desconocido (en la
 * URL o guardado) vuelve al por defecto.
 */

export const SHIP_STYLE_PARAM = 'estilo';
export const SHIP_STYLE_STORAGE_KEY = 'boia:estilo-barco';

export interface ShipStyleOption {
  id: string;
  label: string;
  description?: string;
  /** Ruta del manifiesto relativa a la carpeta del manifiesto raíz. */
  manifest: string;
}

export interface ShipStyleIndex {
  defaultId: string;
  /** El estilo por defecto primero y después los de exploración, en orden. */
  options: ShipStyleOption[];
}

interface RawVariant {
  id?: unknown;
  label?: unknown;
  description?: unknown;
  manifest?: unknown;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

/** Lee el índice de estilos del JSON del manifiesto raíz. Ignora entradas mal formadas. */
export function readShipStyleIndex(root: unknown): ShipStyleIndex {
  const r = (root ?? {}) as { style?: unknown; style_label?: unknown; style_variants?: unknown };
  const defaultId = str(r.style) ?? 'default';
  const options: ShipStyleOption[] = [
    { id: defaultId, label: str(r.style_label) ?? defaultId, manifest: 'manifest.json' },
  ];
  const variants = Array.isArray(r.style_variants) ? (r.style_variants as RawVariant[]) : [];
  for (const v of variants) {
    const id = str(v?.id);
    const manifest = str(v?.manifest);
    if (!id || !manifest || options.some((o) => o.id === id)) continue;
    const description = str(v.description);
    options.push({
      id,
      label: str(v.label) ?? id,
      manifest,
      ...(description ? { description } : {}),
    });
  }
  return { defaultId, options };
}

/** El estilo pedido: el de la URL si trae `?estilo=`, si no el guardado. `null` si no hay ninguno. */
export function requestedShipStyle(
  search: string,
  storage?: Pick<Storage, 'getItem'> | null,
): string | null {
  const fromUrl = new URLSearchParams(search).get(SHIP_STYLE_PARAM);
  if (fromUrl !== null) return fromUrl;
  try {
    return storage?.getItem(SHIP_STYLE_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/** El estilo a usar: el pedido si existe en el índice; si no, el por defecto. */
export function resolveShipStyle(index: ShipStyleIndex, requested: string | null): ShipStyleOption {
  const byId = (id: string) => index.options.find((o) => o.id === id);
  return (requested !== null && byId(requested)) || byId(index.defaultId) || index.options[0]!;
}

export interface LoadedShipStyle {
  loaded: LoadedShipManifest | null;
  style: ShipStyleOption | null;
  index: ShipStyleIndex | null;
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok || res.status === 204) return null;
    return await res.json();
  } catch (err) {
    console.warn('[boia] no se pudo pedir ' + url, err);
    return null;
  }
}

function toLoaded(json: unknown, url: string): LoadedShipManifest | null {
  const parsed = parseShipManifest(json);
  if (!parsed.ok) {
    console.warn(`[boia] manifiesto del barco inválido (${url})\n${parsed.error}`);
    return null;
  }
  return { manifest: parsed.manifest, baseUrl: new URL('.', url).href };
}

/**
 * Carga el manifiesto del barco en el estilo pedido. Si el estilo no existe o
 * su manifiesto no carga, usa el por defecto; si tampoco hay manifiesto raíz,
 * `loaded` es `null` y el motor sigue con el barco provisional.
 */
export async function loadShipStyle(
  rootUrl: string,
  requested: string | null,
): Promise<LoadedShipStyle> {
  const absRoot = new URL(rootUrl, globalThis.location?.href).href;
  const root = await fetchJson(absRoot);
  if (root === null) return { loaded: null, style: null, index: null };
  const index = readShipStyleIndex(root);
  const style = resolveShipStyle(index, requested);
  const base = toLoaded(root, absRoot);
  const fallback = () => ({ loaded: base, style: resolveShipStyle(index, null), index });
  if (style.id === index.defaultId || !base) return fallback();
  const url = new URL(style.manifest, absRoot).href;
  const loaded = toLoaded(await fetchJson(url), url);
  if (!loaded) return fallback();
  // Mismo pipeline y misma cámara: todo el arte comparte píxeles por unidad. El motor saca
  // la escala del mundo del manifiesto del barco, así que el estilo de exploración usa la
  // del estilo por defecto: el mundo no cambia de tamaño y el barco se ve a su tamaño modelado.
  return { loaded: { ...loaded, displayScale: shipArtScale(base.manifest) }, style, index };
}
