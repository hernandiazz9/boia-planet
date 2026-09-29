import type { Artist, BoiaEvent } from '@boia/contracts';
import type { FunnelEventProps } from '@boia/contracts/analytics';
import { eventKicker } from '@boia/contracts/event-labels';
import { EVENT_CARD_COPY } from '../../../lib/landing/card-copy';
import { formatEventDate, t } from '../../../lib/landing/texts';
import { BuyButton } from './buy-button';

type Source = FunnelEventProps['ticket_click_out']['source'];

/** Ficha de un evento (sin cargar `lib/landing/eventos`, que arrastra los esquemas). */
const eventPage = (slug: string) => `/eventos/${encodeURIComponent(slug)}`;

/** Aviso de un estado sin compra: la nota del Admin o la de siempre (REQ-COM-008). */
function stateNoteOf(event: BoiaEvent): string | undefined {
  if (event.stateNote) return event.stateNote;
  if (event.state === 'postponed' || event.state === 'cancelled') {
    return EVENT_CARD_COPY[event.state];
  }
  return undefined;
}

export function EventCard({
  event,
  artists,
  buyable,
  source,
  headingLevel = 3,
  featured = false,
  nextAllDay,
}: {
  /** Con su estado de ahora (`resolveHome`). */
  event: BoiaEvent;
  artists: readonly Artist[];
  /** Compra disponible (`canBuy`, resuelto fuera: aquí no se carga `@boia/contracts`). */
  buyable: boolean;
  source: Source;
  headingLevel?: 2 | 3;
  featured?: boolean;
  /**
   * El próximo All Day, para la línea de un satélite sin isla (REQ-COM-010,
   * O7). `undefined`: aquí no se enseña; `null`: no hay próximo All Day.
   */
  nextAllDay?: { name: string; slug: string } | null;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const lineup = event.artistIds
    .map((id) => artists.find((a) => a.id === id)?.name)
    .filter((n): n is string => n !== undefined);
  const note = stateNoteOf(event);
  const satellite = event.format === 'satelite' && !event.islandId;

  return (
    <article
      className={featured ? 'event-card event-card--featured' : 'event-card'}
      data-evento={event.id}
      data-estado={event.state}
    >
      <p className="event-card__meta">
        <span className="event-card__format">{eventKicker(event)}</span>
        {event.state !== 'on_sale' && (
          <span className={`badge badge--${event.state}`}>
            {EVENT_CARD_COPY.state[event.state]}
          </span>
        )}
      </p>
      <Heading className="event-card__name">
        <a className="event-card__link" href={eventPage(event.slug)}>
          {event.name}
        </a>
      </Heading>
      <p className="event-card__when">
        <time dateTime={event.startsAt}>{formatEventDate(event.startsAt, event.timeZone)}</time>
        <span aria-hidden="true"> · </span>
        <span>{event.placeLabel}</span>
      </p>
      {featured && event.description && <p className="event-card__desc">{event.description}</p>}
      {note && <p className="event-card__note">{note}</p>}
      {lineup.length > 0 && (
        <p className="event-card__lineup">
          <span className="visually-hidden">{t('event.lineup')}: </span>
          {lineup.join(' · ')}
        </p>
      )}
      {satellite && nextAllDay !== undefined ? (
        <p className="event-card__warmup" data-testid={`calienta-${event.id}`}>
          {nextAllDay ? (
            <>
              {EVENT_CARD_COPY.warmup}: <a href={eventPage(nextAllDay.slug)}>{nextAllDay.name}</a>
            </>
          ) : (
            EVENT_CARD_COPY.warmupNone
          )}
        </p>
      ) : null}
      {buyable ? (
        // Versión de prueba (D-20): compra sandbox; un evento finalizado nunca llega aquí.
        <BuyButton
          eventId={event.id}
          eventName={event.name}
          ticketUrl={event.ticketUrl}
          source={source}
        />
      ) : (
        event.state === 'coming_soon' && <p className="event-card__soon">{t('event.soon')}</p>
      )}
    </article>
  );
}
