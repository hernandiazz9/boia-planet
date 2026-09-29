import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Sirve `art/` de la raíz del repo, para que el motor lea los manifiestos y
 * los sprites del pipeline de Blender sin copiarlos (D-16). También en la
 * versión de prueba desplegada en Vercel: `next.config.ts` mete `art/` en la
 * traza de esta función (`outputFileTracingIncludes`) y en Vercel el proceso
 * corre desde `apps/web`, como en local. Supabase Storage lo sustituirá con
 * el editor de mundo.
 * Con `?optional=1`, un archivo que no existe responde 204 en vez de 404
 * (el motor usa entonces el barco provisional y la consola queda limpia).
 */
const ART_ROOT = path.resolve(process.cwd(), '../../art');
const TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  // Barcos del mar 3D (tools/blender/export_barcos_glb.py).
  '.glb': 'model/gltf-binary',
};

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params;
  const file = path.resolve(ART_ROOT, ...segments);
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!file.startsWith(ART_ROOT + path.sep) || !type) {
    return new Response('no', { status: 400 });
  }
  try {
    const body = await readFile(file);
    // En desarrollo el arte cambia al re-renderizar; en `next start` no, y la
    // entrada precarga el planeta antes de que el motor lo pida (T03).
    // `s-maxage`: la CDN de Vercel guarda la respuesta (cada despliegue empieza
    // con la caché vacía) y la función no se invoca por cada sprite.
    const cache =
      process.env.NODE_ENV === 'production'
        ? 'public, max-age=3600, s-maxage=86400'
        : 'no-store';
    return new Response(body, { headers: { 'content-type': type, 'cache-control': cache } });
  } catch {
    const optional = new URL(req.url).searchParams.has('optional');
    return new Response(null, { status: optional ? 204 : 404 });
  }
}
