'use client';

import { type BoiaEvent, EVENT_STATE_BEHAVIOR } from '@boia/contracts';

/**
 * Interfaz HTML sobre el mundo para la demo de T04: marcadores del minimapa y
 * del ancla del Menú de a bordo (los construye T05; aquí sólo existen para
 * que la boia tutorial los haga pulsar, REQ-AVE-004) y el panel de evento que
 * abre la isla por proximidad. Nada es modal: el barco sigue navegando.
 */

export function MinimapPlaceholder({ pulse }: { pulse: number }) {
  return (
    <div
      key={pulse}
      data-testid="minimapa"
      className={`juego-minimap${pulse ? ' juego-pulse-long' : ''}`}
      aria-label="Minimapa (pendiente)"
      role="img"
    >
      <span>minimapa</span>
    </div>
  );
}

export function MenuAnchor({ pulse }: { pulse: number }) {
  return (
    <button
      key={pulse}
      type="button"
      data-testid="menu-ancla"
      className={`juego-anchor${pulse ? ' juego-pulse-short' : ''}`}
      aria-label="Menú de a bordo (pendiente)"
      title="Menú de a bordo (llega con T05)"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v14M7 11h10M4 14c0 4 4 7 8 7s8-3 8-7" />
        </g>
      </svg>
    </button>
  );
}

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

let audio: AudioContext | null = null;

/** «Plop» corto de cada bocadillo (REQ-AVE-001), sintetizado: no hay efectos de sonido aún. */
export function plop(): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const t = audio.currentTime;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(620, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + 0.13);
  } catch {
    // Sin audio (navegador sin gesto previo o sin Web Audio): el diálogo sigue.
  }
}
