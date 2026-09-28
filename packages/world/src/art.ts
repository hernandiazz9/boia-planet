import { z } from 'zod';

/**
 * Contrato de los manifiestos de arte del mundo que produce el pipeline de
 * Blender (T01, `tools/blender/asset.schema.json`): islas, boies, rocas
 * (`kind: sprite`) y costas (`kind: tile`). Sólo se leen los campos que usa
 * el motor; el resto se ignora. Píxeles de la imagen, origen arriba a la
 * izquierda. Todos los recursos están a la densidad del barco
 * (`pixels_per_unit`), así el motor los dibuja con la escala del barco.
 */

const Px = z
  .union([
    z.tuple([z.number().finite(), z.number().finite()]),
    z.object({ x: z.number().finite(), y: z.number().finite() }),
  ])
  .transform((p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y }));

const Circle = z.object({
  shape: z.literal('circle'),
  center_px: Px,
  /** Semieje horizontal: el vertical mide la mitad en pantalla. */
  radius_px: z.number().finite().positive(),
});

const ArtImage = z.object({
  file: z.string().min(1),
  frame: z.number().int().nonnegative().default(0),
  animation: z.string().optional(),
  variant: z.string().optional(),
  anchors: z.record(z.string(), Px).optional(),
});

const TileVariant = z.object({
  file: z.string().min(1),
  land_side: z.enum(['left', 'right']),
  shore_x_px: z.object({ mean: z.number(), min: z.number(), max: z.number() }),
  /** Donde se para el casco: la costa de colisión del mundo. */
  collision_x_px: z.number().finite(),
  /** Color de la tierra más allá de la losa. */
  outer_fill: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const ArtManifest = z.object({
  id: z.string().min(1),
  kind: z.enum(['sprite', 'tile', 'layers', 'ship']),
  category: z.string().optional(),
  version: z.union([z.string(), z.number()]).transform(String),
  status: z.string().optional(),
  license: z.string().min(1),
  image: z
    .object({ width: z.number().int().positive(), height: z.number().int().positive() })
    .optional(),
  pivot_px: Px.optional(),
  anchors: z.record(z.string(), Px).default({}),
  hitbox_hint: Circle.optional(),
  proximity_hint: Circle.optional(),
  animations: z
    .record(
      z.string(),
      z.object({
        frames: z.number().int().positive(),
        fps: z.number().positive(),
        loop: z.boolean().default(true),
      }),
    )
    .default({}),
  images: z.array(ArtImage).default([]),
  tile: z
    .object({
      axis: z.literal('y'),
      period_px: z.number().positive(),
      variants: z.record(z.string(), TileVariant),
    })
    .optional(),
});
export type ArtManifest = z.output<typeof ArtManifest>;
export type ArtTileVariant = z.output<typeof TileVariant>;

export type ArtManifestResult = { ok: true; manifest: ArtManifest } | { ok: false; error: string };

export function parseArtManifest(input: unknown): ArtManifestResult {
  const r = ArtManifest.safeParse(input);
  return r.success
    ? { ok: true, manifest: r.data }
    : { ok: false, error: z.prettifyError(r.error) };
}

/**
 * Fotogramas de una animación en orden, o la imagen fija (fotograma 0 sin
 * animación) si la animación no existe. Vacío si no hay ninguna imagen.
 */
export function artFrames(
  m: ArtManifest,
  animation?: string,
): { files: string[]; fps: number; loop: boolean } {
  const anim = animation ? m.animations[animation] : undefined;
  if (anim && animation) {
    const files = m.images
      .filter((i) => i.animation === animation)
      .sort((a, b) => a.frame - b.frame)
      .map((i) => i.file);
    if (files.length > 0) return { files, fps: anim.fps, loop: anim.loop };
  }
  const still =
    m.images.find((i) => !i.animation && !i.variant && i.frame === 0) ??
    m.images.find((i) => i.frame === 0);
  return { files: still ? [still.file] : [], fps: 0, loop: false };
}
