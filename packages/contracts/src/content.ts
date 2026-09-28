import { z } from 'zod';
import { eventSchema } from './events';
import { homeBlocksSchema } from './home-blocks';

/** Personas detrás del sonido (v14 §18, REQ-COM-027, REQ-COM-028). */
export const artistSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  genres: z.array(z.string().min(1)).min(1),
  /** Sin foto aprobada se muestra un avatar neutro. */
  photoUrl: z.url().optional(),
});
export type Artist = z.infer<typeof artistSchema>;

/** Foto de un álbum. El texto alternativo es obligatorio (REQ-COM-031). */
export const photoSchema = z.object({
  id: z.string().min(1),
  albumId: z.string().min(1),
  alt: z.string().min(1),
  src: z.url().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type Photo = z.infer<typeof photoSchema>;

/** Álbum de fotos y vídeos, opcionalmente ligado a un evento (REQ-COM-001, REQ-ADM-019). */
export const albumSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  eventId: z.string().optional(),
  /** Fecha del álbum en ISO 8601 con zona. */
  date: z.iso.datetime({ offset: true }).optional(),
  coverPhotoId: z.string().optional(),
  sample: z.boolean().default(false),
});
export type Album = z.infer<typeof albumSchema>;

/**
 * Descuento compartible (REQ-COM-020 a REQ-COM-022). Se esconde en el mundo
 * (restos, tesoros, náufragos) por su id; el hallazgo se premia una vez
 * (REQ-COM-021) y el código caducado se muestra como tal.
 */
export const discountSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  /** Texto corto: «-10 % en el All Day de primavera». */
  label: z.string().min(1),
  eventId: z.string().optional(),
  kind: z.enum(['percent', 'amount']),
  /** Porcentaje (1–100) o importe en céntimos. */
  value: z.number().int().positive(),
  startsAt: z.iso.datetime({ offset: true }).optional(),
  endsAt: z.iso.datetime({ offset: true }).optional(),
  conditions: z.string().optional(),
  url: z.url().optional(),
  sample: z.boolean().default(false),
});
export type Discount = z.infer<typeof discountSchema>;

export type DiscountStatus = 'upcoming' | 'active' | 'expired';

/** Vigencia de un descuento en `now` (REQ-COM-021: los caducados se marcan). */
export function discountStatus(discount: Discount, now: Date): DiscountStatus {
  const t = now.getTime();
  if (discount.startsAt && t < new Date(discount.startsAt).getTime()) return 'upcoming';
  if (discount.endsAt && t >= new Date(discount.endsAt).getTime()) return 'expired';
  return 'active';
}

export const promotionSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().optional(),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  published: z.boolean(),
});
export type Promotion = z.infer<typeof promotionSchema>;

/** Todo lo que la home necesita para pintarse. Lo publicado, no borradores. */
export const homeContentSchema = z.object({
  blocks: homeBlocksSchema,
  events: z.array(eventSchema),
  artists: z.array(artistSchema),
  photos: z.array(photoSchema),
  promotions: z.array(promotionSchema),
});
export type HomeContent = z.infer<typeof homeContentSchema>;
export type HomeContentInput = z.input<typeof homeContentSchema>;

/** ¿Hay alguna promoción publicada y vigente? (REQ-ENT-028) */
export function hasActivePromotion(promotions: readonly Promotion[], now: Date): boolean {
  const t = now.getTime();
  return promotions.some(
    (p) => p.published && new Date(p.startsAt).getTime() <= t && t < new Date(p.endsAt).getTime(),
  );
}
