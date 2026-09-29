/**
 * Eventos del embudo en PostHog UE (D-04, REQ-ARQ-019). Los nombres son
 * contrato: el panel de PostHog se construye sobre ellos.
 */
export const FUNNEL_EVENTS = [
  'landing_view',
  'explore_start',
  'discount_found',
  'tickets_panel_open',
  'ticket_click_out',
  'purchase_confirmed',
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

/** Propiedades de cada evento. Nunca datos personales. */
export interface FunnelEventProps {
  landing_view: { intro: 'played' | 'skipped' | 'none' };
  explore_start: { source: 'hero' | 'hero_3d' | 'tickets_panel' | 'event' };
  discount_found: { discountId: string; eventId?: string };
  tickets_panel_open: { source: 'hero' | 'header' | 'deep_link' | 'event' };
  ticket_click_out: {
    eventId: string;
    source: 'priority_event' | 'upcoming_events' | 'tickets_panel' | 'event_page';
  };
  purchase_confirmed: { eventId: string; provider: string; orderRef: string };
}

/**
 * `purchase_confirmed` sólo lo emite el servidor, desde el webhook verificado
 * de la ticketera (REQ-COM-017). El cliente no puede ni tiparlo.
 */
export type ServerOnlyFunnelEvent = 'purchase_confirmed';
export type ClientFunnelEvent = Exclude<FunnelEvent, ServerOnlyFunnelEvent>;

export const CLIENT_FUNNEL_EVENTS = FUNNEL_EVENTS.filter(
  (e): e is ClientFunnelEvent => e !== 'purchase_confirmed',
);
