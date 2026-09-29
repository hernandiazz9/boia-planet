import {
  canBuy,
  hasActivePromotion,
  isBlockScheduled,
  resolvePriorityEvent,
  upcomingEvents,
  type Artist,
  type BoiaEvent,
  type HomeBlock,
  type HomeBlockOf,
  type HomeContent,
  type Photo,
} from '@boia/contracts';
import { shuffledOrder } from './rotation';

/**
 * De bloque configurado a lo que se pinta. Devuelve `null` cuando el bloque
 * no debe verse: oculto, fuera de su programación o sin contenido publicado
 * útil (REQ-ENT-030).
 */
export type ResolvedBlock =
  | (HomeBlockOf<'hero'> & { hasPromotions: boolean })
  | (HomeBlockOf<'priority_event'> & { event: BoiaEvent })
  | (HomeBlockOf<'upcoming_events'> & { events: BoiaEvent[] })
  | (HomeBlockOf<'artists'> & { rotation: Artist[]; alphabetical: Artist[] })
  | HomeBlockOf<'philosophy'>
  | (HomeBlockOf<'photos'> & { photos: Photo[] })
  | HomeBlockOf<'store'>
  | HomeBlockOf<'contact'>
  | HomeBlockOf<'footer'>;

/** Semilla fija: el orden de rotación es el mismo en servidor y cliente. */
export const ARTIST_ORDER_SEED = 2026;

/** Artistas de la A a la Z (lista completa en /artistas y orden alfabético del bloque). */
export function alphabeticalArtists<A extends { name: string }>(artists: readonly A[]): A[] {
  return [...artists].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function resolveBlock(
  block: HomeBlock,
  content: HomeContent,
  now: Date,
): ResolvedBlock | null {
  if (!isBlockScheduled(block, now)) return null;

  switch (block.type) {
    case 'hero':
      return { ...block, hasPromotions: hasActivePromotion(content.promotions, now) };

    case 'priority_event': {
      const event = resolvePriorityEvent(content.events, block.eventId, now);
      return event ? { ...block, event } : null;
    }

    case 'upcoming_events': {
      // Si el bloque del evento prioritario se ve, no se repite en la lista.
      const priority = shownPriorityEvent(content, now);
      const exclude = priority ? [...block.excludeEventIds, priority.id] : block.excludeEventIds;
      const events = upcomingEvents(content.events, now, exclude).slice(0, block.limit);
      return events.length > 0 ? { ...block, events } : null;
    }

    case 'artists': {
      if (content.artists.length === 0) return null;
      const order = shuffledOrder(content.artists.length, ARTIST_ORDER_SEED);
      const rotation = order.map((i) => content.artists[i]!);
      const alphabetical = alphabeticalArtists(content.artists);
      return { ...block, rotation, alphabetical };
    }

    case 'philosophy':
      return block.paragraphs.length > 0 || block.verbs.length > 0 ? block : null;

    case 'photos': {
      const photos = content.photos
        .filter((p) => block.albumId === undefined || p.albumId === block.albumId)
        .slice(0, block.limit);
      return photos.length > 0 ? { ...block, photos } : null;
    }

    case 'store':
      return block;

    case 'contact':
      return block.email !== undefined || block.links.length > 0 ? block : null;

    case 'footer':
      return block;
  }
}

/** Evento prioritario tal y como lo muestra su bloque, si el bloque está activo. */
export function shownPriorityEvent(content: HomeContent, now: Date): BoiaEvent | undefined {
  const block = content.blocks.find(
    (b): b is HomeBlockOf<'priority_event'> => b.type === 'priority_event',
  );
  if (!block || !isBlockScheduled(block, now)) return undefined;
  return resolvePriorityEvent(content.events, block.eventId, now);
}

/**
 * Contenido del panel de Tickets (REQ-ENT-037): el evento prioritario vigente
 * (aunque esté agotado o próximamente, con su estado) y todos los próximos con
 * compra disponible. `onSale` es falso si no hay nada que comprar: entonces
 * el panel dice «Próximamente» sin inventar entradas.
 */
export function resolveTicketsPanel(
  content: HomeContent,
  now: Date,
): { featured: BoiaEvent | undefined; others: BoiaEvent[]; onSale: boolean } {
  const priorityBlock = content.blocks.find(
    (b): b is HomeBlockOf<'priority_event'> => b.type === 'priority_event',
  );
  const featured = resolvePriorityEvent(content.events, priorityBlock?.eventId, now);
  const others = upcomingEvents(content.events, now)
    .filter(canBuy)
    .filter((e) => e.id !== featured?.id);
  const onSale = others.length > 0 || (featured !== undefined && canBuy(featured));
  return { featured, others, onSale };
}

/** id de ancla de cada tipo de bloque, para enlazar sólo secciones que existen. */
const ANCHORS: Partial<Record<string, string>> = {
  artists: 'artistas',
  philosophy: 'filosofia',
  store: 'tienda',
  photos: 'fotos',
};

/** Qué secciones de la cabecera existen con este contenido. */
export function landingSections(content: HomeContent, now: Date): string[] {
  return [
    ...new Set(
      content.blocks
        .filter((b) => b.type !== 'footer')
        .filter((b) => resolveBlock(b, content, now) !== null)
        .map((b) => ANCHORS[b.type])
        .filter((a): a is string => a !== undefined),
    ),
  ];
}

/**
 * La home ya resuelta, lista para pintar: bloques visibles en su orden, pie,
 * secciones de la cabecera, panel de Tickets y qué eventos se pueden comprar.
 * El servidor la calcula con la muestra; el navegador sólo carga este módulo
 * (y con él los esquemas de `@boia/contracts` y zod) cuando llega el contenido
 * del repositorio, fuera de la ruta crítica de la landing (REQ-ARQ-014, T29).
 */
export interface HomeView {
  main: ResolvedBlock[];
  footer: ResolvedBlock[];
  sections: string[];
  tickets: { featured: BoiaEvent | undefined; others: BoiaEvent[]; onSale: boolean };
  artists: Artist[];
  /** ids de los eventos con compra disponible (`canBuy`). */
  buyable: string[];
}

export function resolveHome(content: HomeContent, now: Date): HomeView {
  const resolved = (blocks: readonly HomeBlock[]) =>
    blocks
      .map((b) => resolveBlock(b, content, now))
      .filter((b): b is ResolvedBlock => b !== null);
  return {
    main: resolved(content.blocks.filter((b) => b.type !== 'footer')),
    footer: resolved(content.blocks.filter((b) => b.type === 'footer')),
    sections: landingSections(content, now),
    tickets: resolveTicketsPanel(content, now),
    artists: content.artists,
    buyable: content.events.filter(canBuy).map((e) => e.id),
  };
}
