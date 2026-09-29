import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Sirve `art/` de la raíz del repo en desarrollo, para que el motor lea el
 * manifiesto y los sprites que produce el encargo 01 sin copiarlos.
 * Con `?optional=1`, un archivo que no existe responde 204 en vez de 404
 * (el motor usa entonces el barco provisional y la consola queda limpia).
 * En producción los recursos saldrán de Storage (D-04); esto no se despliega así.
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
    const cache = process.env.NODE_ENV === 'production' ? 'public, max-age=3600' : 'no-store';
    return new Response(body, { headers: { 'content-type': type, 'cache-control': cache } });
  } catch {
    const optional = new URL(req.url).searchParams.has('optional');
    return new Response(null, { status: optional ? 204 : 404 });
  }
}
