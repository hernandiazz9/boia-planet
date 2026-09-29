/**
 * Textos de la ficha de evento, de «Fotos y eventos» y del estado de las
 * islas (T42), tomados de docs/propuestas/textos-zonas.md (zonas 4, 11, 17 y
 * 30). Todos `muestra` [pendiente Álvaro, P22]. Viven aquí hasta que la T49
 * los pase al catálogo i18n con estas mismas claves. Lo poco que pinta la
 * landing está en `card-copy.ts`.
 */
import { EVENT_CARD_COPY, PHOTOS_HOME_COPY } from './card-copy';

export const EVENTOS_COPY = {
  state: EVENT_CARD_COPY.state,
  /** `event.soldOut.body`, `event.postponed.body`, `event.cancelled.body`. */
  stateBody: {
    sold_out: 'Agotadas. Mira los próximos eventos: siempre hay otra isla.',
    postponed: EVENT_CARD_COPY.postponed,
    cancelled: EVENT_CARD_COPY.cancelled,
    finished: 'Este evento ya pasó. Aquí se queda su recuerdo: fotos, cartel y artistas.',
  },
  soon: 'Entradas próximamente',
  /** `tickets.sailToIsland` */
  sailToIsland: 'Ir a su isla',
  /** `tickets.satellite.*` (D-23, O7). */
  warmup: EVENT_CARD_COPY.warmup,
  warmupLink: 'Ver el próximo All Day',
  warmupNone: EVENT_CARD_COPY.warmupNone,
  /** `event.halloween-2026.poster` y cartel que falta en general (P19). */
  posterSoon: 'Cartel próximamente',
  posterAlt: (name: string) => `Cartel de ${name}`,
  details: 'Ver el evento',
  detailsAria: (name: string) => `Ver la ficha de ${name}`,
  when: 'Cuándo',
  where: 'Dónde',
  format: 'Formato',
  price: 'Precio',
  priceSample: 'precio de muestra',
  lineup: 'Cartel',
  lineupSoon: 'Artistas por anunciar',
  activities: 'Actividades',
  memories: 'Recuerdos',
  memoriesPhotos: 'Ver sus fotos',
  upcoming: 'Próximos eventos',
  back: 'Volver al inicio',
  allTickets: 'Todas las entradas',
  sampleNotice: 'Contenido de muestra pendiente de aprobación.',
  loading: 'Buscando el evento…',
  notFound: 'No encontramos este evento. Puede que se lo haya llevado la corriente.',
  /** Islas (zona 11). */
  island: {
    memoriesHeading: 'Recuerdos de esta isla',
    memoriesEmpty: 'Las fotos de esta isla todavía se están revelando.',
    photosCta: 'Ver fotos de la isla',
    soldOut: 'Agotado. Pero esta isla tiene más fiestas: mira abajo.',
    memory: 'Este evento ya pasó. Aquí se queda su recuerdo: fotos, cartel y artistas.',
    upcomingHeading: 'Próximos eventos',
    steer: 'Rumbo a su isla',
  },
} as const;

/** «Fotos y eventos» (zona 30 de textos-zonas). */
export const FOTOS_COPY = {
  heading: 'Fotos',
  homeAll: PHOTOS_HOME_COPY.all,
  homeAllAria: PHOTOS_HOME_COPY.allAria,
  pageTitle: 'Fotos y eventos',
  pageLead: 'Todas las fotos de BOIA, por isla y por evento. Búscate.',
  placeholder: 'Foto de muestra',
  empty: 'Todavía no hay fotos de este evento. Se están revelando.',
  emptyIsland: 'Las fotos de esta isla todavía se están revelando.',
  general: 'BOIA en general',
  islandsNav: 'Galerías',
  byIsland: 'Por isla',
  byEvent: 'Por evento',
  back: 'Volver al inicio',
  eventPage: 'Ficha del evento',
  count: (n: number) => (n === 1 ? '1 foto' : `${n} fotos`),
} as const;
