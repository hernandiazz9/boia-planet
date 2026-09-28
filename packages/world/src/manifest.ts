import { z } from 'zod';
import { DIRECTIONS, type Direction } from './direction';

/**
 * Contrato del manifiesto de sprites del barco que produce el encargo 01
 * (`art/barco/manifest.json`, punto 6 de su prompt). Los anclajes están en
 * píxeles de la imagen, origen arriba a la izquierda.
 *
 * El prompt 01 fija los campos, no el anidado exacto. Se aceptan tres formas,
 * por este orden: `directions: { S: { anchors: { … } }, … }` (la que produce
 * `tools/blender/render.py` desde el 2026-09-28), `anchors: { S: { … } }` en
 * la raíz, o los anclajes dentro de cada entrada de `images`. Un punto puede
 * ser `{ x, y }` o `[x, y]`. `bow` (roda a la altura del agua) es opcional.
 */

const Point = z
  .union([
    z.object({ x: z.number().finite(), y: z.number().finite() }),
    z.tuple([z.number().finite(), z.number().finite()]),
  ])
  .transform((p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y }));

const DirectionSchema = z.enum(DIRECTIONS);

export const ShipAnchors = z.object({
  pivot: Point,
  mast_top: Point,
  slot_passenger: Point,
  wake_origin: Point,
  bow: Point.optional(),
});
export type ShipAnchors = z.infer<typeof ShipAnchors>;

const ImageEntry = z.object({
  file: z.string().min(1),
  skin: z.string().min(1),
  direction: DirectionSchema,
  frame: z.number().int().nonnegative().default(0),
  passenger: z.boolean().default(false),
  /** Fotograma de una animación (p. ej. `bob`); sin valor, imagen fija. */
  animation: z.string().optional(),
  pivot: Point.optional(),
  mast_top: Point.optional(),
  slot_passenger: Point.optional(),
  wake_origin: Point.optional(),
});

const RawManifest = z.object({
  id: z.string().min(1),
  version: z.union([z.string(), z.number()]),
  generator: z.unknown().optional(),
  license: z.string().min(1),
  images: z.array(ImageEntry).min(1),
  anchors: z.partialRecord(DirectionSchema, ShipAnchors).optional(),
  animations: z
    .record(z.string(), z.object({ fps: z.number().positive(), loop: z.boolean().default(true) }))
    .default({}),
  directions: z.partialRecord(DirectionSchema, z.object({ anchors: ShipAnchors })).optional(),
});

export interface ShipImage {
  file: string;
  skin: string;
  direction: Direction;
  frame: number;
  passenger: boolean;
  animation?: string;
}

export interface ShipManifest {
  id: string;
  version: string;
  license: string;
  images: ShipImage[];
  anchors: Record<Direction, ShipAnchors>;
  /** Animaciones declaradas (p. ej. `bob`, el balanceo en parado). */
  animations: Record<string, { fps: number; loop: boolean }>;
}

export type ManifestResult = { ok: true; manifest: ShipManifest } | { ok: false; error: string };

export function parseShipManifest(input: unknown): ManifestResult {
  const raw = RawManifest.safeParse(input);
  if (!raw.success) return { ok: false, error: z.prettifyError(raw.error) };
  const m = raw.data;

  const anchors: Partial<Record<Direction, ShipAnchors>> = { ...m.anchors };
  for (const d of DIRECTIONS) {
    const fromDirections = m.directions?.[d]?.anchors;
    if (fromDirections) anchors[d] = fromDirections;
  }
  for (const img of m.images) {
    if (anchors[img.direction]) continue;
    const a = ShipAnchors.safeParse(img);
    if (a.success) anchors[img.direction] = a.data;
  }
  const missing = DIRECTIONS.filter((d) => !anchors[d]);
  if (missing.length > 0) return { ok: false, error: `faltan anclajes de: ${missing.join(', ')}` };

  return {
    ok: true,
    manifest: {
      id: m.id,
      version: String(m.version),
      license: m.license,
      images: m.images.map(({ file, skin, direction, frame, passenger, animation }) => ({
        file,
        skin,
        direction,
        frame,
        passenger,
        ...(animation ? { animation } : {}),
      })),
      anchors: anchors as Record<Direction, ShipAnchors>,
      animations: m.animations,
    },
  };
}

/** Imagen estática de una skin y dirección (fotograma 0), con o sin pasajera. */
export function findShipImage(
  m: ShipManifest,
  skin: string,
  direction: Direction,
  passenger = false,
): ShipImage | undefined {
  return m.images.find(
    (i) =>
      !i.animation &&
      i.skin === skin &&
      i.direction === direction &&
      i.frame === 0 &&
      i.passenger === passenger,
  );
}

/** Fotogramas de una animación de una skin y dirección, en orden. Vacío si no existe. */
export function findShipAnimation(
  m: ShipManifest,
  animation: string,
  skin: string,
  direction: Direction,
  passenger = false,
): ShipImage[] {
  return m.images
    .filter(
      (i) =>
        i.animation === animation &&
        i.skin === skin &&
        i.direction === direction &&
        i.passenger === passenger,
    )
    .sort((a, b) => a.frame - b.frame);
}
