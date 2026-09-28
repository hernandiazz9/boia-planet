import { canBuy, type Artist, type BoiaEvent } from '@boia/contracts';
import type { FunnelEventProps } from '@boia/contracts/analytics';
import { formatEventDate, t, type MessageKey } from '../../../lib/i18n';

type Source = FunnelEventProps['ticket_click_out']['source'];

export function EventCard({
  event,
  artists,
  source,
  headingLevel = 3,
  featured = false,
}: {
  event: BoiaEvent;
  artists: readonly Artist[];
  source: Source;
  headingLevel?: 2 | 3;
  featured?: boolean;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const lineup = event.artistIds
    .map((id) => artists.find((a) => a.id === id)?.name)
    .filter((n): n is string => n !== undefined);
  const stateKey = `event.state.${event.state}` as MessageKey;

  return (
    <article className={featured ? 'event-card event-card--featured' : 'event-card'}>
      <p className="event-card__meta">
        <span className="event-card__format">{event.format}</span>
        {event.state !== 'on_sale' && (
          <span className={`badge badge--${event.state}`}>{t(stateKey)}</span>
        )}
      </p>
      <Heading className="event-card__name">{event.name}</Heading>
      <p className="event-card__when">
        <time dateTime={event.startsAt}>{formatEventDate(event.startsAt, event.timeZone)}</time>
        <span aria-hidden="true"> · </span>
        <span>{event.placeLabel}</span>
      </p>
      {featured && event.description && <p className="event-card__desc">{event.description}</p>}
      {event.stateNote && <p className="event-card__note">{event.stateNote}</p>}
      {lineup.length > 0 && (
        <p className="event-card__lineup">
          <span className="visually-hidden">{t('event.lineup')}: </span>
          {lineup.join(' · ')}
        </p>
      )}
      {canBuy(event) ? (
        <a
          className="button button--buy"
          href={event.ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('event.buy.aria', { name: event.name })}
          data-track="ticket_click_out"
          data-event-id={event.id}
          data-source={source}
        >
          {t('event.buy')}
        </a>
      ) : (
        event.state === 'coming_soon' && <p className="event-card__soon">{t('event.soon')}</p>
      )}
    </article>
  );
}
