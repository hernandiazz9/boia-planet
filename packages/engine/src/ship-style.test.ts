import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIRECTIONS, findShipImage, parseShipManifest } from '@boia/world';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadShipStyle,
  readShipStyleIndex,
  requestedShipStyle,
  resolveShipStyle,
} from './ship-style';
import { shipArtScale } from './world/visual';

// El arte real que produce tools/blender/render.py: la prueba sigue a lo que haya en art/barco.
const SHIP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../art/barco');
const readJson = (rel: string): unknown =>
  JSON.parse(readFileSync(path.join(SHIP_DIR, rel), 'utf8'));
const root = readJson('manifest.json');
const index = readShipStyleIndex(root);

describe('estilos del barco en art/barco', () => {
  it('el manifiesto raíz lista estilos de exploración además del por defecto', () => {
    expect(index.options[0]!.id).toBe(index.defaultId);
    expect(index.options.length).toBeGreaterThan(1);
  });

  it.each(index.options.map((o) => [o.id, o] as const))(
    '%s resuelve las 8 direcciones con y sin pasajera',
    (id, option) => {
      expect(resolveShipStyle(index, id)).toBe(option);
      const parsed = parseShipManifest(readJson(option.manifest));
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      for (const d of DIRECTIONS) {
        for (const passenger of [false, true]) {
          const img = findShipImage(parsed.manifest, 'base', d, passenger);
          expect(img, `${id} base/${d}${passenger ? '_p' : ''}`).toBeDefined();
          const dir = path.dirname(path.join(SHIP_DIR, option.manifest));
          expect(() => readFileSync(path.join(dir, img!.file))).not.toThrow();
        }
      }
    },
  );
});

describe('elección del estilo', () => {
  const storage = (value: string | null) => ({ getItem: () => value });
  const other = () => index.options.find((o) => o.id !== index.defaultId)!;

  it('un ?estilo= desconocido vuelve al por defecto', () => {
    const requested = requestedShipStyle('?estilo=no-existe', storage(other().id));
    expect(requested).toBe('no-existe');
    expect(resolveShipStyle(index, requested).id).toBe(index.defaultId);
  });

  it('sin parámetro, usa el guardado; sin nada, el por defecto', () => {
    expect(resolveShipStyle(index, requestedShipStyle('', storage(other().id))).id).toBe(
      other().id,
    );
    expect(resolveShipStyle(index, requestedShipStyle('', storage(null))).id).toBe(index.defaultId);
    expect(resolveShipStyle(index, requestedShipStyle('', null)).id).toBe(index.defaultId);
  });

  it('el parámetro gana al guardado', () => {
    const [a, b] = index.options.slice(1, 3);
    expect(resolveShipStyle(index, requestedShipStyle(`?estilo=${a!.id}`, storage(b!.id))).id).toBe(
      a!.id,
    );
  });

  it('un almacenamiento que falla no rompe la elección', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(requestedShipStyle('', broken)).toBeNull();
  });
});

describe('loadShipStyle', () => {
  afterEach(() => vi.unstubAllGlobals());

  // fetch simulado que sirve art/barco bajo http://x/api/art/barco/.
  function serveArt() {
    const base = 'http://x/api/art/barco/';
    vi.stubGlobal('fetch', async (input: string) => {
      const rel = new URL(input).pathname.replace('/api/art/barco/', '');
      try {
        return new Response(readFileSync(path.join(SHIP_DIR, rel)));
      } catch {
        return new Response(null, { status: 404 });
      }
    });
    return base + 'manifest.json?optional=1';
  }

  it('carga el estilo pedido desde su carpeta', async () => {
    const url = serveArt();
    const want = index.options[1]!;
    const r = await loadShipStyle(url, want.id);
    expect(r.style?.id).toBe(want.id);
    expect(r.loaded?.baseUrl).toBe(new URL(want.manifest.replace('manifest.json', ''), url).href);
    // El mundo no cambia de escala con el estilo del barco: la del estilo por defecto.
    const base = parseShipManifest(root);
    expect(base.ok && r.loaded?.displayScale).toBe(base.ok && shipArtScale(base.manifest));
  });

  it('con un estilo desconocido carga el por defecto', async () => {
    const r = await loadShipStyle(serveArt(), 'no-existe');
    expect(r.style?.id).toBe(index.defaultId);
    expect(r.loaded?.baseUrl).toBe('http://x/api/art/barco/');
  });
});
