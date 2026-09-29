'use client';

import { type BoiaEvent, EVENT_STATE_BEHAVIOR } from '@boia/contracts';
import type { FoundDiscount } from '@boia/store';
import type { WorldObject } from '@boia/world';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { islandMemories } from '../../lib/admin/world';
import { liveContent } from '../../lib/landing/live-content';
import './place-panels.css';

/**
 * Paneles de los lugares que no son de evento (T20): la isla con su relato y
 * sus Próximos eventos (REQ-AVE-014), el Puerto de Fotos con la galería
 * (REQ-AVE-022), la tienda con su enlace externo (REQ-COM-033), la boia de
 * WhatsApp (REQ-AVE-023) y el descuento encontrado (REQ-COM-021/022). No
 * son modales: el barco sigue navegando y se cierran al alejarse. Textos
 * `muestra` [pendiente Álvaro].
 */

export type PlaceTarget = 'info' | 'photos' | 'store';

export interface PlacePanelState {
  objectId: string;
  target: PlaceTarget;
  ref?: string;
}

/** Bloques de la home con los cambios del Admin de la demo (T26). */
const block = (type: string) => liveContent().blocks.find((b) => b.type === type);

function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(new Date(iso));
}

/** Próximos eventos: el de la isla primero, luego el prioritario y el resto por fecha. */
export function upcomingEvents(islandEventId?: string, limit = 3): BoiaEvent[] {
  const priorityBlock = block('priority_event');
  const priority = priorityBlock?.type === 'priority_event' ? priorityBlock.eventId : undefined;
  const rank = (e: BoiaEvent) => (e.id === islandEventId ? 0 : e.id === priority ? 1 : 2);
  return liveContent()
    .events    .filter((e) => EVENT_STATE_BEHAVIOR[e.state].listed && e.state !== 'finished')
    .sort((a, b) => rank(a) - rank(b) || a.startsAt.localeCompare(b.startsAt))
    .slice(0, limit);
}

function textOf(o: WorldObject | undefined, key: string): string | undefined {
  const texts = o?.content?.texts as Record<string, string> | undefined;
  return texts?.[key];
}

function Close({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className="juego-panel-close" onClick={onClose} aria-label="Cerrar">
      ×
    </button>
  );
}

function Upcoming({ onSteer }: { onSteer: (eventId: string) => boolean }) {
  const events = upcomingEvents();
  if (events.length === 0) return null;
  return (
    <div className="juego-panel-block" data-testid="panel-proximos">
      <h3>Próximos eventos</h3>
      <ul>
        {events.map((e) => (
          <li key={e.id}>
            <strong>{e.name}</strong> · {formatDate(e.startsAt, e.timeZone)}
            {e.sample ? ' · muestra' : ''}{' '}
            <button type="button" className="juego-link-button" onClick={() => onSteer(e.id)}>
              Rumbo a su isla
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Los eventos que ya pasaron por esta isla: la isla se queda con ellos (T26, REQ-COM-002). */
function Memories({ placeId }: { placeId: string }) {
  const memories = islandMemories(placeId, liveContent().events, new Date());
  if (memories.length === 0) {
    return <p className="juego-panel-pending">Fotos y recuerdos de esta isla: próximamente.</p>;
  }
  return (
    <div className="juego-panel-block" data-testid="panel-recuerdos">
      <h3>Recuerdos de esta isla</h3>
      <ul>
        {memories.map((e) => (
          <li key={e.id}>
            <strong>{e.name}</strong> · {formatDate(e.startsAt, e.timeZone)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlacePanel({
  state,
  object,
  onClose,
  onSteer,
}: {
  state: PlacePanelState;
  object: WorldObject | undefined;
  onClose: () => void;
  /** Pone la brújula rumbo a la isla de un evento (false si no tiene isla). */
  onSteer: (eventId: string) => boolean;
}) {
  const name = object?.identity.name ?? '';
  if (state.target === 'photos') {
    const photos = liveContent().photos.slice(0, 6);
    return (
      <section className="juego-panel" data-testid="panel-fotos" aria-label={name}>
        <Close onClose={onClose} />
        <p className="juego-panel-kicker">Puerto de Fotos · muestra</p>
        <h2>{name}</h2>
        <p>{textOf(object, 'body') ?? 'Todas las fotos de BOIA se revelan aquí.'}</p>
        <ul className="juego-panel-photos" aria-label="Galería">
          {photos.map((p) => (
            <li key={p.id} role="img" aria-label={p.alt} title={p.alt}>
              📷
            </li>
          ))}
        </ul>
        <Link className="juego-panel-cta" href="/#fotos" data-testid="panel-fotos-galeria">
          Ver la galería
        </Link>
      </section>
    );
  }
  if (state.target === 'store') {
    const storeBlock = block('store');
    const url = storeBlock?.type === 'store' ? storeBlock.url : undefined;
    const products = storeBlock?.type === 'store' ? storeBlock.products : [];
    return (
      <section className="juego-panel" data-testid="panel-tienda" aria-label={name}>
        <Close onClose={onClose} />
        <p className="juego-panel-kicker">Tienda · muestra</p>
        <h2>{name}</h2>
        <p>{textOf(object, 'body') ?? 'Camisetas, tote bags y pegatinas.'}</p>
        {products.length ? <p className="juego-panel-meta">{products.join(' · ')}</p> : null}
        {url ? (
          <a
            className="juego-panel-cta"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="panel-tienda-enlace"
          >
            Ir a la tienda ↗
          </a>
        ) : null}
      </section>
    );
  }
  if (state.ref === 'whatsapp') {
    const contactBlock = block('contact');
    const wa =
      contactBlock?.type === 'contact'
        ? contactBlock.links.find((l) => /whatsapp/i.test(l.label))
        : undefined;
    return (
      <section className="juego-panel" data-testid="panel-whatsapp" aria-label={name}>
        <Close onClose={onClose} />
        <p className="juego-panel-kicker">Provisional · muestra</p>
        <h2>{textOf(object, 'title') ?? name}</h2>
        <p>{textOf(object, 'body') ?? 'El grupo de WhatsApp de BOIA, si te apetece.'}</p>
        {wa ? (
          <a className="juego-panel-cta" href={wa.url} target="_blank" rel="noopener noreferrer">
            Abrir WhatsApp ↗
          </a>
        ) : null}
      </section>
    );
  }
  // Una isla: su relato, sus recuerdos y los Próximos eventos (REQ-AVE-014).
  return (
    <section className="juego-panel" data-testid="panel-isla" aria-label={name}>
      <Close onClose={onClose} />
      <p className="juego-panel-kicker">{textOf(object, 'kicker') ?? 'Isla'} · muestra</p>
      <h2>{name}</h2>
      {textOf(object, 'body') ? <p>{textOf(object, 'body')}</p> : null}
      <Memories placeId={state.objectId} />
      <Upcoming onSteer={onSteer} />
    </section>
  );
}

const STATUS: Record<FoundDiscount['status'], string> = {
  active: 'Vigente',
  upcoming: 'Todavía no vale',
  expired: 'Caducado',
};

/** Copia un texto con un toque; `true` si pudo. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Una tarjeta de descuento: código, evento, fecha, condiciones y copiar (REQ-COM-022). */
export function DiscountCard({ found, testId }: { found: FoundDiscount; testId?: string }) {
  const d = found.discount;
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  const event = d.eventId ? liveContent().events.find((e) => e.id === d.eventId) : undefined;
  const expired = found.status === 'expired';
  return (
    <div className="juego-descuento" data-testid={testId} data-status={found.status}>
      <p className="juego-descuento-label">{d.label}</p>
      <p className="juego-descuento-code">
        <code data-testid="descuento-codigo">{d.code}</code>{' '}
        <span className={`juego-descuento-status is-${found.status}`} data-testid="descuento-estado">
          {STATUS[found.status]}
        </span>
      </p>
      {event ? (
        <p className="juego-panel-meta">
          {event.name} · {formatDate(event.startsAt, event.timeZone)}
        </p>
      ) : null}
      {d.endsAt ? (
        <p className="juego-panel-pending">
          {expired ? 'Caducó' : 'Vale hasta'} el {formatDate(d.endsAt, 'Europe/Madrid')}
        </p>
      ) : null}
      {d.conditions ? <p className="juego-panel-pending">{d.conditions}</p> : null}
      <button
        type="button"
        className="juego-panel-cta"
        data-testid="descuento-copiar"
        disabled={expired}
        onClick={() => void copyText(d.code).then((ok) => setCopied(ok ? 'ok' : 'fail'))}
      >
        {expired
          ? 'Caducado: ya no vale'
          : copied === 'ok'
            ? 'Copiado ✓'
            : copied === 'fail'
              ? `Cópialo a mano: ${d.code}`
              : 'Copiar código'}
      </button>
    </div>
  );
}

export function DiscountPanel({ found, onClose }: { found: FoundDiscount; onClose: () => void }) {
  return (
    <section className="juego-panel" data-testid="panel-descuento" aria-label="Descuento encontrado">
      <Close onClose={onClose} />
      <p className="juego-panel-kicker">Descuento encontrado · muestra</p>
      <DiscountCard found={found} />
      <p className="juego-panel-pending">Lo tienes guardado en el Menú de a bordo, en Descuentos.</p>
    </section>
  );
}
