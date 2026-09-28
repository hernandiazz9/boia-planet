import { parseShipManifest, type ShipManifest } from '@boia/world';

export interface LoadedShipManifest {
  manifest: ShipManifest;
  /** URL de la carpeta del manifiesto; los `file` son relativos a ella. */
  baseUrl: string;
  /** Skin a usar. Por defecto `base`. */
  skin?: string;
  /** Escala de pantalla de los PNG (256 px). muestra */
  displayScale?: number;
}

/**
 * Descarga y valida `manifest.json`. Devuelve `null` si no existe (204/404)
 * o si no cumple el contrato: el motor sigue con el barco provisional.
 */
export async function loadShipManifest(url: string): Promise<LoadedShipManifest | null> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch (err) {
    console.warn('[boia] no se pudo pedir el manifiesto del barco', err);
    return null;
  }
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) {
    console.warn(`[boia] manifiesto del barco: HTTP ${res.status}`);
    return null;
  }
  const parsed = parseShipManifest(await res.json());
  if (!parsed.ok) {
    console.warn('[boia] manifiesto del barco inválido; se usa el provisional\n' + parsed.error);
    return null;
  }
  return { manifest: parsed.manifest, baseUrl: new URL('.', new URL(url, location.href)).href };
}
