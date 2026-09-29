/**
 * Los pocos textos de T42 que pinta la landing (tarjeta de evento y «Ver
 * todas» de las fotos), aparte de `eventos-copy.ts` para no cargar el resto en
 * su ruta crítica. De docs/propuestas/textos-zonas.md, `muestra`.
 */
export const EVENT_CARD_COPY = {
  /** Nombre de cada estado (los siete de REQ-COM-003). */
  state: {
    draft: 'Borrador',
    coming_soon: 'Próximamente',
    on_sale: 'A la venta',
    sold_out: 'Agotado',
    postponed: 'Pospuesto',
    cancelled: 'Cancelado',
    finished: 'Finalizado',
  },
  /** `event.postponed.body`, `event.cancelled.body`. */
  postponed: 'Hemos cambiado la fecha. En cuanto esté cerrada, la verás aquí.',
  cancelled: 'Este evento no se hace. Lo sentimos mucho; aquí tienes los próximos.',
  /** `tickets.satellite.*` (D-23, O7). */
  warmup: 'Calienta para el próximo All Day',
  warmupNone:
    'El próximo All Day todavía no tiene fecha. Entérate antes que nadie en el WhatsApp de BOIA.',
} as const;

/** `photos.home.all` (zona 30). */
export const PHOTOS_HOME_COPY = {
  all: 'Ver todas',
  allAria: 'Ver todas las fotos en «Fotos y eventos»',
} as const;
