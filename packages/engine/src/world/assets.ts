import { type ArtManifest, parseArtManifest } from '@boia/world';
import { Assets, type Texture } from 'pixi.js';

/** Un manifiesto de arte cargado y la carpeta de la que cuelgan sus archivos. */
export interface LoadedArt {
  manifest: ArtManifest;
  baseUrl: string;
}

/** Dónde está el manifiesto de un asset. Por defecto, la ruta de desarrollo `/api/art` (D-16). */
export type ArtUrl = (assetId: string) => string;

export const DEV_ART_URL: ArtUrl = (id) =>
  `/api/art/${encodeURIComponent(id)}/manifest.json?optional=1`;

/**
 * Descarga y valida los manifiestos de los assets pedidos. Los que faltan o
 * no cumplen el contrato se omiten con un aviso: el objeto se dibuja con un
 * marcador y se comporta igual (§48.1).
 */
export async function loadArt(ids: Iterable<string>, url: ArtUrl = DEV_ART_URL) {
  const out = new Map<string, LoadedArt>();
  await Promise.all(
    [...new Set(ids)]
      .filter((id) => !id.startsWith('placeholder:'))
      .map(async (id) => {
        const u = new URL(url(id), location.href);
        try {
          const res = await fetch(u, { cache: 'no-store' });
          if (res.status === 204 || res.status === 404) return;
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const r = parseArtManifest(await res.json());
          if (!r.ok) throw new Error(r.error);
          out.set(id, { manifest: r.manifest, baseUrl: new URL('.', u).href });
        } catch (err) {
          console.warn(`[boia] arte «${id}» no disponible; se usa un marcador`, err);
        }
      }),
  );
  return out;
}

export function manifestsOf(art: ReadonlyMap<string, LoadedArt>): Map<string, ArtManifest> {
  return new Map([...art].map(([id, a]) => [id, a.manifest]));
}

export async function loadTextures(baseUrl: string, files: string[]): Promise<Texture[]> {
  return Promise.all(files.map((f) => Assets.load<Texture>(new URL(f, baseUrl).href)));
}
