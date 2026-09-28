import { SCENE_ASSETS, type IntroConfig, type SceneAsset } from './config';

/**
 * Recursos de la entrada resueltos desde los manifiestos de `art/` (T01):
 * URL, tamaño, pivote y escala de cada imagen en px de escena. La escena
 * usa la densidad de los sprites del mundo (la del barco): 1 px de escena =
 * 1 px de arte de una isla o del barco. Las capas del planeta tienen otra
 * densidad y se escalan con `pixels_per_unit` de su manifiesto.
 *
 * Es código puro: la web lee los manifiestos del disco al construir la
 * página y le pasa aquí el JSON. Si algo no cuadra, la entrada no se juega
 * y la landing sale en su versión ligera (REQ-ENT-017).
 */

export type Point = readonly [number, number];

export interface ArtImage {
  url: string;
  width: number;
  height: number;
  /** Punto de la imagen (px) que se coloca en la posición del objeto. */
  pivot: Point;
  /** px de escena por px de imagen. */
  scale: number;
}

export interface IntroAssets {
  /** px de pantalla por px de escena a escala de juego (barco con `ship.lengthPx` de eslora). */
  artScale: number;
  planet: {
    /** Pivote = ancla `polo`: cae en el origen de la escena. */
    globe: ArtImage;
    /** Mismo lienzo que el globo; gira alrededor de `centre` (px de imagen). */
    clouds: ArtImage & { centre: Point };
    /** El mismo globo de cerca; pivote = su ancla `polo`. */
    band: ArtImage;
    /** Isla del planeta; se funde con la isla de evento en la revelación. */
    island: ArtImage;
    /** Centro del globo en px de escena (el polo es el origen). */
    globeCentre: Point;
    /** Radio del globo en px de escena. */
    globeRadius: number;
  };
  sprites: Record<SceneAsset, ArtImage & { frames: readonly string[]; fps: number }>;
  ship: ArtImage;
}

export type AssetsResult = { ok: true; assets: IntroAssets } | { ok: false; error: string };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const point = (v: unknown): Point | null =>
  Array.isArray(v) && v.length === 2 && num(v[0]) !== null && num(v[1]) !== null
    ? [v[0] as number, v[1] as number]
    : null;

class Missing extends Error {}
function must<T>(v: T | null | undefined, what: string): T {
  if (v === null || v === undefined) throw new Missing(what);
  return v;
}

const join = (base: string, id: string, file: string) =>
  `${base.replace(/\/$/, '')}/${id}/${file.split('/').map(encodeURIComponent).join('/')}`;

/**
 * @param manifests JSON de cada manifiesto por id de recurso (`planeta`,
 *   `barco` y los de `SCENE_ASSETS`).
 * @param baseUrl raíz desde la que se sirve `art/` (hoy `/api/art`, D-16).
 */
export function resolveIntroAssets(
  manifests: Readonly<Record<string, unknown>>,
  baseUrl: string,
  config: IntroConfig,
): AssetsResult {
  try {
    const ship = resolveShip(manifests.barco, baseUrl, config);
    const scenePpu = ship.ppu;

    const sprites = {} as IntroAssets['sprites'];
    for (const id of SCENE_ASSETS) {
      const m = manifests[id];
      if (!isObj(m)) throw new Missing(`manifiesto de ${id}`);
      const image = must(isObj(m.image) ? m.image : null, `${id}.image`);
      const ppu = must(num(isObj(m.scale) ? m.scale.pixels_per_unit : null), `${id}.scale`);
      const images = Array.isArray(m.images) ? m.images.filter(isObj) : [];
      const anim = isObj(m.animations) ? Object.keys(m.animations)[0] : undefined;
      const frames = images
        .filter((i) => (anim ? i.animation === anim : true))
        .sort((a, b) => (num(a.frame) ?? 0) - (num(b.frame) ?? 0))
        .map((i) =>
          join(baseUrl, id, must(typeof i.file === 'string' ? i.file : null, `${id} file`)),
        );
      const fps =
        anim && isObj(m.animations) && isObj(m.animations[anim])
          ? (num((m.animations[anim] as Obj).fps) ?? 8)
          : 0;
      sprites[id] = {
        url: must(frames[0], `${id}: sin imágenes`),
        frames,
        fps,
        width: must(num(image.width), `${id}.image.width`),
        height: must(num(image.height), `${id}.image.height`),
        pivot: must(point(m.pivot_px), `${id}.pivot_px`),
        scale: scenePpu / ppu,
      };
    }

    const planet = resolvePlanet(manifests.planeta, baseUrl, scenePpu);
    return {
      ok: true,
      assets: { artScale: ship.artScale, planet, sprites, ship: ship.image },
    };
  } catch (err) {
    if (err instanceof Missing) return { ok: false, error: `falta o no cuadra: ${err.message}` };
    throw err;
  }
}

function resolveShip(m: unknown, baseUrl: string, config: IntroConfig) {
  if (!isObj(m)) throw new Missing('manifiesto de barco');
  const projection = isObj(m.projection) ? m.projection : {};
  const ppu = must(num(projection.pixels_per_unit), 'barco.projection.pixels_per_unit');
  const image = must(isObj(m.image) ? m.image : null, 'barco.image');
  const directions = must(isObj(m.directions) ? m.directions : null, 'barco.directions');
  const anchorsOf = (d: string): Obj | null => {
    const dir = directions[d];
    return isObj(dir) && isObj(dir.anchors) ? dir.anchors : null;
  };

  // Escala de juego: la misma regla que el motor (eslora en la vista W, que no se acorta).
  const w = must(anchorsOf('W'), 'barco.directions.W.anchors');
  const bow = must(point(w.bow), 'barco W.bow');
  const stern = must(point(w.wake_origin), 'barco W.wake_origin');
  const hull = Math.hypot(bow[0] - stern[0], bow[1] - stern[1]);
  if (!(hull > 1)) throw new Missing('barco: eslora de la vista W');

  const view = config.ship.view;
  const images = Array.isArray(m.images) ? m.images.filter(isObj) : [];
  const style = typeof m.style === 'string' ? m.style : undefined;
  const entry = images.find(
    (i) =>
      i.skin === 'base' &&
      i.direction === view &&
      i.passenger !== true &&
      i.animation === undefined &&
      (i.style === undefined || i.style === style),
  );
  const file = must(
    entry && typeof entry.file === 'string' ? entry.file : null,
    `barco base/${view}`,
  );
  const anchors = must(anchorsOf(view), `barco.directions.${view}.anchors`);
  return {
    ppu,
    artScale: config.ship.lengthPx / hull,
    image: {
      url: join(baseUrl, 'barco', file),
      width: must(num(image.width), 'barco.image.width'),
      height: must(num(image.height), 'barco.image.height'),
      pivot: must(point(anchors.pivot), `barco ${view}.pivot`),
      scale: 1,
    } satisfies ArtImage,
  };
}

function resolvePlanet(m: unknown, baseUrl: string, scenePpu: number): IntroAssets['planet'] {
  if (!isObj(m)) throw new Missing('manifiesto de planeta');
  const layers = Array.isArray(m.layers) ? m.layers.filter(isObj) : [];
  const layer = (id: string) =>
    must(
      layers.find((l) => l.id === id),
      `planeta.layers.${id}`,
    );
  const img = (l: Obj, pivotAnchor: string): ArtImage => {
    const anchors = isObj(l.anchors) ? l.anchors : {};
    return {
      url: join(
        baseUrl,
        'planeta',
        must(typeof l.file === 'string' ? l.file : null, `${l.id}.file`),
      ),
      width: must(num(l.width), `${l.id}.width`),
      height: must(num(l.height), `${l.id}.height`),
      pivot: must(point(anchors[pivotAnchor]), `${l.id}.anchors.${pivotAnchor}`),
      scale: scenePpu / must(num(l.pixels_per_unit), `${l.id}.pixels_per_unit`),
    };
  };

  const globeLayer = layer('globo');
  const globe = img(globeLayer, 'polo');
  const centre = must(
    point(isObj(globeLayer.anchors) ? globeLayer.anchors.centro : null),
    'globo.anchors.centro',
  );
  const radius = must(num(globeLayer.radius_px), 'globo.radius_px');
  const cloudsLayer = layer('nubes');
  const clouds = img(cloudsLayer, 'polo');
  const cloudCentre = must(
    point(isObj(cloudsLayer.anchors) ? cloudsLayer.anchors.centro : null),
    'nubes.anchors.centro',
  );

  return {
    globe,
    clouds: { ...clouds, centre: cloudCentre },
    band: img(layer('banda-mar'), 'polo'),
    island: img(layer('isla'), 'pivot'),
    globeCentre: [
      (centre[0] - globe.pivot[0]) * globe.scale,
      (centre[1] - globe.pivot[1]) * globe.scale,
    ],
    globeRadius: radius * globe.scale,
  };
}

/** Ids de manifiesto que necesita la entrada. */
export const INTRO_MANIFEST_IDS: readonly string[] = ['planeta', 'barco', ...SCENE_ASSETS];

/** Todas las URL de imagen que carga la escena (para precargar o contar). */
export function introImageUrls(a: IntroAssets): string[] {
  const urls = new Set<string>([
    a.planet.globe.url,
    a.planet.clouds.url,
    a.planet.band.url,
    a.planet.island.url,
    a.ship.url,
  ]);
  for (const s of Object.values(a.sprites)) for (const f of s.frames) urls.add(f);
  return [...urls];
}
