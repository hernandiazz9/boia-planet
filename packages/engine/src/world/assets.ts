import { type ArtManifest, parseArtManifest, parseAssetRef, placePartArt } from '@boia/world';
import { Assets, type Texture } from 'pixi.js';

/** Un manifiesto de arte cargado y la carpeta de la que cuelgan sus archivos. */
export interface LoadedArt {
  manifest: ArtManifest;
  baseUrl: string;
}

/** Dónde está el manifiesto de un asset. Por defecto, la ruta de desarrollo `/api/art` (D-16). */
export type ArtUrl = (assetId: string) => string;

export const DEV_ART_URL: ArtUrl = (id) =>
  // Los assets de un mundo son carpetas anidadas: `mundos/<mundo>/<lugar>` (T17).
  `/api/art/${id.split('/').map(encodeURIComponent).join('/')}/manifest.json?optional=1`;

/**
 * Descarga y valida los manifiestos de los assets pedidos. Los que faltan o
 * no cumplen el contrato se omiten con un aviso: el objeto se dibuja con un
 * marcador y se comporta igual (§48.1). Un asset de pieza de lugar (T18,
 * `<carpeta>#<pieza>[@variante]`) baja el manifiesto de la carpeta una vez y
 * queda como el manifiesto de esa pieza.
 */
export async function loadArt(ids: Iterable<string>, url: ArtUrl = DEV_ART_URL) {
  const out = new Map<string, LoadedArt>();
  const wanted = [...new Set(ids)].filter((id) => !id.startsWith('placeholder:'));
  const bases = new Map<string, string[]>();
  for (const id of wanted) {
    const { base } = parseAssetRef(id);
    bases.set(base, [...(bases.get(base) ?? []), id]);
  }
  await Promise.all(
    [...bases].map(async ([base, refs]) => {
      const u = new URL(url(base), location.href);
      try {
        const res = await fetch(u, { cache: 'no-store' });
        if (res.status === 204 || res.status === 404) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const r = parseArtManifest(await res.json());
        if (!r.ok) throw new Error(r.error);
        const baseUrl = new URL('.', u).href;
        for (const id of refs) {
          const ref = parseAssetRef(id);
          const manifest = ref.part ? placePartArt(r.manifest, ref.part, ref.variant) : r.manifest;
          if (manifest) out.set(id, { manifest, baseUrl });
          else console.warn(`[boia] arte «${id}»: la pieza no está en el manifiesto; marcador`);
        }
      } catch (err) {
        console.warn(`[boia] arte «${base}» no disponible; se usa un marcador`, err);
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
