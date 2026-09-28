import { z } from 'zod';

/**
 * Los siete estados de un evento (v14 §49.4, REQ-COM-003). El evento y su isla
 * son entidades separadas: `islandId` es opcional y una isla sobrevive a sus
 * eventos (REQ-COM-002).
 */
export const EVENT_STATES = [
  'draft',
  'coming_soon',
  'on_sale',
  'sold_out',
  'postponed',
  'cancelled',
  'finished',
] as const;

export const eventStateSchema = z.enum(EVENT_STATES);
export type EventState = z.infer<typeof eventStateSchema>;

export const eventSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  /** Formato: «All Day BOIA», «Noche», … Texto de contenido, no clave i18n. */
  format: z.string().min(1),
  /** Inicio en ISO 8601 con zona horaria. */
  startsAt: z.iso.datetime({ offset: true }),
  /** Zona IANA en la que se muestra la fecha. */
  timeZone: z.string().min(1),
  /** Texto público del lugar. Nunca la dirección de una secret location (REQ-COM-013). */
  placeLabel: z.string().min(1),
  state: eventStateSchema,
  description: z.string(),
  artistIds: z.array(z.string()),
  /** Enlace a la ticketera (adaptador o sandbox hasta que Álvaro contrate, D-06). */
  ticketUrl: z.url().optional(),
  islandId: z.string().optional(),
  /** Mensaje de pospuesto o cancelado (REQ-COM-008). */
  stateNote: z.string().optional(),
  /** Contenido de ejemplo hasta que Álvaro lo apruebe. */
  sample: z.boolean().default(false),
});
export type BoiaEvent = z.infer<typeof eventSchema>;

/**
 * Comportamiento de cada estado en la home y en Tickets (tabla de
 * docs/spec/06-comercial.md). `listed`: aparece en próximos eventos;
 * `purchasable`: muestra compra.
 */
export const EVENT_STATE_BEHAVIOR: Record<EventState, { listed: boolean; purchasable: boolean }> = {
  draft: { listed: false, purchasable: false },
  coming_soon: { listed: true, purchasable: false },
  on_sale: { listed: true, purchasable: true },
  sold_out: { listed: true, purchasable: false },
  postponed: { listed: true, purchasable: false },
  cancelled: { listed: true, purchasable: false },
  finished: { listed: false, purchasable: false },
};

/** Un evento puede venderse sólo si está a la venta y tiene enlace de ticket. */
export function canBuy(event: BoiaEvent): boolean {
  return EVENT_STATE_BEHAVIOR[event.state].purchasable && event.ticketUrl !== undefined;
}

/** Estados que puede tener el evento prioritario: vigente, nunca cancelado ni pasado (REQ-COM-009). */
export function canBePriority(event: BoiaEvent, now: Date): boolean {
  const vigente =
    event.state === 'coming_soon' ||
    event.state === 'on_sale' ||
    event.state === 'sold_out' ||
    event.state === 'postponed';
  return vigente && new Date(event.startsAt).getTime() >= startOfDay(now).getTime();
}

/**
 * Próximos eventos para home y Tickets (REQ-COM-011): estado listado, fecha no
 * pasada, sin los excluidos a mano, ordenados por fecha.
 */
export function upcomingEvents(
  events: readonly BoiaEvent[],
  now: Date,
  excludeIds: readonly string[] = [],
): BoiaEvent[] {
  const from = startOfDay(now).getTime();
  return events
    .filter((e) => EVENT_STATE_BEHAVIOR[e.state].listed)
    .filter((e) => new Date(e.startsAt).getTime() >= from)
    .filter((e) => !excludeIds.includes(e.id))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/**
 * Evento prioritario: el elegido si sigue vigente; si no, el primer próximo
 * comprable; si no hay, el primer próximo. Nunca una campaña terminada.
 */
export function resolvePriorityEvent(
  events: readonly BoiaEvent[],
  priorityEventId: string | undefined,
  now: Date,
): BoiaEvent | undefined {
  const chosen = events.find((e) => e.id === priorityEventId);
  if (chosen && canBePriority(chosen, now)) return chosen;
  const upcoming = upcomingEvents(events, now).filter((e) => canBePriority(e, now));
  return upcoming.find(canBuy) ?? upcoming[0];
}

function startOfDay(d: Date): Date {
  const s = new Date(d.getTime());
  s.setUTCHours(0, 0, 0, 0);
  return s;
}
