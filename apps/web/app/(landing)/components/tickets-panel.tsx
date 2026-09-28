import type { Artist, BoiaEvent } from '@boia/contracts';
import { t } from '../../../lib/i18n';
import { EventCard } from './event-card';

/**
 * Panel de Tickets en HTML (REQ-ENT-037, REQ-ENT-038). No depende del motor
 * ni de WebGL. Sin JavaScript se abre con el ancla `#tickets` (CSS :target);
 * con JavaScript, `LandingClient` gestiona foco, Escape, Atrás y analítica.
 * La URL `/#tickets` es compartible (REQ-ENT-036).
 */
export function TicketsPanel({
  featured,
  others,
  onSale,
  artists,
}: {
  featured: BoiaEvent | undefined;
  others: readonly BoiaEvent[];
  onSale: boolean;
  artists: readonly Artist[];
}) {
  return (
    <section
      id="tickets"
      className="tickets-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tickets-title"
    >
      <div className="tickets-panel__sheet">
        <div className="tickets-panel__head">
          <h2 id="tickets-title" className="tickets-panel__title" tabIndex={-1}>
            {t('tickets.heading')}
          </h2>
          <a
            className="button button--ghost tickets-panel__close"
            href="#inicio"
            data-tickets-close
          >
            {t('tickets.close')}
          </a>
        </div>
        {featured && (
          <div className="tickets-panel__featured">
            <p className="tickets-panel__kicker">{t('tickets.featured')}</p>
            <EventCard event={featured} artists={artists} source="tickets_panel" featured />
          </div>
        )}
        {others.length > 0 && (
          <ul className="tickets-panel__list">
            {others.map((e) => (
              <li key={e.id}>
                <EventCard event={e} artists={artists} source="tickets_panel" />
              </li>
            ))}
          </ul>
        )}
        {!onSale && <p className="tickets-panel__empty">{t('tickets.empty')}</p>}
        <p className="tickets-panel__invite">
          <a href="/juego" data-track="explore_start" data-source="tickets_panel">
            {t('tickets.islandInvite')}
          </a>
        </p>
      </div>
    </section>
  );
}
