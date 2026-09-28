import { z } from 'zod';

/** Versión del esquema del mundo. Sube cuando cambie de forma incompatible. */
export const WORLD_SCHEMA_VERSION = 0;

const finite = z.number().finite();

/**
 * Rectángulo en coordenadas de mundo (y crece hacia el espectador, así que
 * `top < bottom`).
 */
export const Rect = z
  .object({ left: finite, right: finite, top: finite, bottom: finite })
  .refine((r) => r.left < r.right && r.top < r.bottom, 'left < right y top < bottom');
export type Rect = z.infer<typeof Rect>;

/**
 * Límites navegables. Las costas laterales y el borde inferior colisionan;
 * `top` es el borde publicado y está abierto (§49.7): pasarlo no choca, pero
 * una corriente suave devuelve el barco a aguas navegables.
 */
export const WorldBounds = Rect;
export type WorldBounds = Rect;

export const Sector = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  area: Rect,
});
export type Sector = z.infer<typeof Sector>;

// Las nueve partes de un objeto del mundo (v14 §48.2). En v0 sólo identidad,
// apariencia, posición y geometría son obligatorias.

export const ObjectIdentity = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export const ObjectAppearance = z.object({
  /** ID de recurso de la biblioteca, o `placeholder:<forma>` mientras no hay arte. */
  asset: z.string().min(1),
  scale: finite.positive().default(1),
  rotation: finite.default(0),
  layer: z.enum(['water', 'ground', 'object', 'overlay']).default('object'),
  depth: finite.default(0),
});

export const ObjectPosition = z.object({
  x: finite,
  y: finite,
  orientation: finite.default(0),
  zone: z.string().optional(),
});

export const CircleShape = z.object({ shape: z.literal('circle'), radius: finite.positive() });
export const CollisionShape = z.discriminatedUnion('shape', [CircleShape]);

export const ObjectGeometry = z.object({
  collision: CollisionShape.optional(),
  proximityRadius: finite.positive().optional(),
  activation: CollisionShape.optional(),
});

/** Tipo abierto: el catálogo de comportamientos (§48.3) llega en otro encargo. */
export const BehaviorRef = z.object({
  type: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({}),
});
export type BehaviorRef = z.infer<typeof BehaviorRef>;

export const ObjectState = z.object({
  visible: z.boolean().default(true),
  status: z.enum(['draft', 'published']).default('draft'),
  activeFrom: z.iso.datetime().optional(),
  activeUntil: z.iso.datetime().optional(),
  repeatable: z.boolean().default(true),
});

export const WorldObject = z.object({
  identity: ObjectIdentity,
  appearance: ObjectAppearance,
  position: ObjectPosition,
  geometry: ObjectGeometry,
  behaviors: z.array(BehaviorRef).default([]),
  params: z.record(z.string(), z.unknown()).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  state: ObjectState.optional(),
  reward: z.record(z.string(), z.unknown()).optional(),
});
export type WorldObject = z.infer<typeof WorldObject>;
export type WorldObjectInput = z.input<typeof WorldObject>;

export const WorldConfig = z
  .object({
    id: z.string().min(1),
    version: z.number().int().nonnegative(),
    bounds: WorldBounds,
    /** Donde aparece el barco; si falta, centro del borde inferior. */
    spawn: z.object({ x: finite, y: finite, heading: finite.default(-Math.PI / 2) }).optional(),
    sectors: z.array(Sector).default([]),
    objects: z.array(WorldObject).default([]),
  })
  .superRefine((w, ctx) => {
    const seen = new Set<string>();
    w.objects.forEach((o, i) => {
      if (seen.has(o.identity.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `ID de objeto repetido: ${o.identity.id}`,
          path: ['objects', i, 'identity', 'id'],
        });
      }
      seen.add(o.identity.id);
    });
  });
export type WorldConfig = z.infer<typeof WorldConfig>;
export type WorldConfigInput = z.input<typeof WorldConfig>;

export function parseWorldConfig(input: unknown): WorldConfig {
  return WorldConfig.parse(input);
}
