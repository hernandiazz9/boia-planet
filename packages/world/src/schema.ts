import { z } from 'zod';
import { Behavior, COLLISION_DEFAULTS } from './behaviors';

/**
 * Versión del esquema del mundo. Sube cuando cambie de forma incompatible.
 * El catálogo de comportamientos v1 (T04) sigue en 0: los objetos de muestra
 * de la base (T06) ya usaban sus tipos (`dialogue`, `proximity`, `content`,
 * `collision` con `mode`) y siguen siendo válidos.
 */
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

/**
 * Porción del mapa que se carga bajo demanda (REQ-MUN-012, T47): cada objeto
 * es del primer sector que contiene su posición (o del más cercano), y el
 * motor pide el atlas de un sector cuando entra en la precarga
 * (`packages/engine/src/world/sectors.ts`). Sin sectores, todo el mapa es uno.
 */
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

/**
 * Círculo más de la colisión de un objeto, relativo a su posición: islas
 * alargadas y escolleras se cubren con varios círculos (la huella sigue
 * siendo del objeto; la COLISIÓN, una sola).
 */
export const CollisionPart = z.object({
  dx: finite,
  dy: finite,
  radius: finite.positive(),
});
export type CollisionPart = z.infer<typeof CollisionPart>;

export const ObjectGeometry = z.object({
  collision: CollisionShape.optional(),
  /** Círculos extra de la misma COLISIÓN (sólo con `collision`). */
  collisionParts: z.array(CollisionPart).max(24).optional(),
  proximityRadius: finite.positive().optional(),
  activation: CollisionShape.optional(),
});

/** Un comportamiento del catálogo (`./behaviors`) con sus parámetros. */
export const BehaviorRef = Behavior;
export type BehaviorRef = Behavior;

export const ObjectState = z.object({
  visible: z.boolean().default(true),
  status: z.enum(['draft', 'published']).default('draft'),
  activeFrom: z.iso.datetime().optional(),
  activeUntil: z.iso.datetime().optional(),
  repeatable: z.boolean().default(true),
});

export const WorldObject = z
  .object({
    identity: ObjectIdentity,
    appearance: ObjectAppearance,
    position: ObjectPosition,
    geometry: ObjectGeometry,
    behaviors: z.array(Behavior).default([]),
    params: z.record(z.string(), z.unknown()).optional(),
    content: z.record(z.string(), z.unknown()).optional(),
    state: ObjectState.optional(),
    reward: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((o, ctx) => {
    // Lo que el motor necesita para ejecutar cada comportamiento (§48.8).
    const issue = (i: number, message: string) =>
      ctx.addIssue({ code: 'custom', message, path: ['behaviors', i] });
    const g = o.geometry;
    o.behaviors.forEach((b, i) => {
      if (b.type === 'collision' && !g.collision && !g.activation) {
        issue(i, 'COLISIÓN necesita geometry.collision o geometry.activation');
      }
      if (b.type === 'proximity' && !b.params.radius && !g.proximityRadius) {
        issue(i, 'PROXIMIDAD necesita un radio (params.radius o geometry.proximityRadius)');
      }
      if (b.type === 'collision' && g.collisionParts?.length && !g.collision) {
        issue(i, 'los círculos extra necesitan geometry.collision');
      }
      if (b.type === 'collectible' && !b.params.radius && !g.activation && !g.collision) {
        issue(i, 'RECOGIBLE necesita un radio de recogida');
      }
    });
    const solid = o.behaviors.filter(
      (b) => b.type === 'collision' && (b.params.solid ?? COLLISION_DEFAULTS[b.params.mode].solid),
    );
    if (solid.length > 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'un objeto admite como mucho una COLISIÓN sólida',
        path: ['behaviors'],
      });
    }
  });
export type WorldObject = z.infer<typeof WorldObject>;
export type WorldObjectInput = z.input<typeof WorldObject>;

const assetId = z.string().min(1);

/** Arte de las costas de un mundo (ver `WorldConfig.coast`). */
export const CoastArt = z
  .object({
    asset: assetId.optional(),
    west: assetId.optional(),
    east: assetId.optional(),
    south: assetId.optional(),
    cornerWest: assetId.optional(),
    cornerEast: assetId.optional(),
  })
  .refine((c) => Object.values(c).some(Boolean), 'costa sin arte: quitar `coast`');
export type CoastArt = z.infer<typeof CoastArt>;

/** Los ids de arte que usa una costa. */
export function coastAssets(c: CoastArt | undefined): string[] {
  if (!c) return [];
  return [c.asset, c.west, c.east, c.south, c.cornerWest, c.cornerEast].filter(
    (x): x is string => !!x,
  );
}

export const WorldConfig = z
  .object({
    id: z.string().min(1),
    version: z.number().int().nonnegative(),
    bounds: WorldBounds,
    /** Donde aparece el barco; si falta, centro del borde inferior. */
    spawn: z.object({ x: finite, y: finite, heading: finite.default(-Math.PI / 2) }).optional(),
    sectors: z.array(Sector).default([]),
    /**
     * Arte de las costas. `asset`: manifiesto `kind: tile` de T01 con
     * variantes izquierda y derecha. O, por lados, piezas de lugar de T18
     * (`west`, `east`, `south` y las dos esquinas). Sin él, costas por código.
     */
    coast: CoastArt.optional(),
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
