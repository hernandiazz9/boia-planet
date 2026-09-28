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
