'use client';

import { type BoiaEvent, EVENT_STATE_BEHAVIOR } from '@boia/contracts';

/**
 * Panel de evento que abre la isla por proximidad (T04). No es modal: el
 * barco sigue navegando. El resto del HUD está en minimap.tsx,
 * hud-buttons.tsx, notices.tsx y menu/ (T05).
 */

function formatDate(e: BoiaEvent): string {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: e.timeZone,
  }).format(new Date(e.startsAt));
}

export function EventPanel({
  event,
  showTicket,
  onClose,
}: {
  event: BoiaEvent;
  showTicket: boolean;
  onClose: () => void;
}) {
  const buy = showTicket && EVENT_STATE_BEHAVIOR[event.state].purchasable && event.ticketUrl;
  return (
    <section className="juego-panel" data-testid="panel-evento" aria-label={event.name}>
      <button type="button" className="juego-panel-close" onClick={onClose} aria-label="Cerrar">
        ×
      </button>
      <p className="juego-panel-kicker">
        {event.format}
        {event.sample ? ' · muestra' : ''}
      </p>
      <h2>{event.name}</h2>
      <p className="juego-panel-meta">
        {formatDate(event)} · {event.placeLabel}
      </p>
      <p>{event.description}</p>
      <p className="juego-panel-pending">Fotos y recuerdos de esta isla: próximamente.</p>
      {buy ? (
        <a className="juego-panel-cta" href={event.ticketUrl} target="_blank" rel="noopener">
          Entradas
        </a>
      ) : null}
    </section>
  );
}
