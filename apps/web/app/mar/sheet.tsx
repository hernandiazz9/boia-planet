'use client';

import { type BoiaEvent, EVENT_STATE_BEHAVIOR } from '@boia/contracts';
import type { FoundDiscount } from '@boia/store';
import type { WorldConfig, WorldObject } from '@boia/world';
import Link from 'next/link';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { islandMemories } from '../../lib/admin/world';
import { formatEventDate } from '../../lib/i18n';
import { liveContent } from '../../lib/landing/live-content';

/**
 * La ficha de abajo del mar 3D: lo que abre un lugar al acercarse (evento,
 * isla, fotos, tienda, WhatsApp) o al tocar su rótulo, y el descuento
 * encontrado. No tapa el mar: el barco sigue navegando y se cierra sola al
 * alejarse. Mismos datos que /juego (el contenido del repositorio con los
 * cambios del Admin). Textos `muestra` [pendiente Álvaro].
 */

export type SheetState =
  | { kind: 'preview'; placeId: string }
  | { kind: 'event'; placeId: string; eventId: string }
  | { kind: 'content'; placeId: string; target: 'info' | 'photos' | 'store'; ref?: string }
  | { kind: 'discount'; found: FoundDiscount };

const block = (type: string) => liveContent().blocks.find((b) => b.type === type);

export const findEvent = (id: string | undefined) => liveContent().events.find((e) => e.id === id);

/** Próximos eventos a la venta o anunciados, el de la isla primero. */
export function upcoming(islandEventId?: string, limit = 3): BoiaEvent[] {
  const pb = block('priority_event');
  const priority = pb?.type === 'priority_event' ? pb.eventId : undefined;
  const rank = (e: BoiaEvent) => (e.id === islandEventId ? 0 : e.id === priority ? 1 : 2);
  return liveContent()
    .events.filter((e) => EVENT_STATE_BEHAVIOR[e.state].listed && e.state !== 'finished')
    .sort((a, b) => rank(a) - rank(b) || a.startsAt.localeCompare(b.startsAt))
    .slice(0, limit);
}

function textOf(o: WorldObject | undefined, key: string): string | undefined {
  const texts = o?.content?.texts as Record<string, string> | undefined;
  return texts?.[key];
}

/** El evento que abre una isla (su comportamiento CONTENIDO o TICKET). */
export function eventOfPlace(o: WorldObject | undefined): string | undefined {
  for (const b of o?.behaviors ?? []) {
    if (b.type === 'ticket') return b.params.eventId;
    if (b.type === 'content' && b.params.target === 'event') return b.params.ref;
  }
  return undefined;
}

/** Adónde lleva el botón «Entradas»: la isla del evento vigente y ese evento. */
export interface EventTrip {
  placeId: string;
  placeName: string;
  eventId: string;
}

/**
 * El evento vigente del mar (REQ-ENT-040): de las islas que abren un evento a
 * la venta (su TICKET o CONTENIDO de evento, ya re-ligado por el Admin), la
 * del evento destacado de la landing y, si no, la del más próximo. Sin
 * ninguno, null (el botón lleva a la sección de entradas de la landing).
 */
export function currentEventTrip(world: WorldConfig): EventTrip | null {
  const pb = block('priority_event');
  const priority = pb?.type === 'priority_event' ? pb.eventId : undefined;
  const trips: Array<EventTrip & { ev: BoiaEvent }> = [];
  for (const o of world.objects) {
    if (!o.identity.active) continue;
    const ev = findEvent(eventOfPlace(o));
    if (!ev || !EVENT_STATE_BEHAVIOR[ev.state].purchasable) continue;
    trips.push({ placeId: o.identity.id, placeName: o.identity.name, eventId: ev.id, ev });
  }
  trips.sort(
    (a, b) =>
      Number(b.ev.id === priority) - Number(a.ev.id === priority) ||
      a.ev.startsAt.localeCompare(b.ev.startsAt),
  );
  const best = trips[0];
  return best ? { placeId: best.placeId, placeName: best.placeName, eventId: best.eventId } : null;
}

export function Sheet({
  state,
  object,
  onClose,
  onCourse,
  onBuy,
  onSteerEvent,
  distance,
}: {
  state: SheetState;
  object: WorldObject | undefined;
  onClose: () => void;
  onCourse: (placeId: string) => void;
  onBuy: (eventId: string) => void;
  onSteerEvent: (eventId: string) => void;
  distance: number | null;
}) {
  const name = object?.identity.name ?? '';
  let body: ReactNode;

  if (state.kind === 'discount') {
    body = (
      <>
        <p className="mar-sheet__kicker">🎁 Descuento encontrado · muestra</p>
        <DiscountCard found={state.found} />
        <p className="mar-sheet__note">Queda guardado en tu Carnet, en Descuentos.</p>
      </>
    );
  } else if (state.kind === 'event') {
    const e = findEvent(state.eventId);
    body = e ? <EventBlock event={e} onBuy={onBuy} /> : null;
  } else if (state.kind === 'preview') {
    const eventId = eventOfPlace(object);
    const e = findEvent(eventId);
    body = (
      <>
        <p className="mar-sheet__kicker">
          {textOf(object, 'kicker') ?? kickerOf(object)}
          {distance !== null ? ` · ${distance} m` : ''}
        </p>
        <h2 className="mar-sheet__title">{e?.name ?? name}</h2>
        {e ? (
          <p className="mar-sheet__meta">
            {formatEventDate(e.startsAt, e.timeZone)} · {e.placeLabel}
          </p>
        ) : null}
        {textOf(object, 'body') ? <p>{textOf(object, 'body')}</p> : null}
        <div className="mar-sheet__actions">
          <button
            type="button"
            className="mar-btn mar-btn--primary"
            data-testid="mar-rumbo"
            onClick={() => onCourse(state.placeId)}
          >
            🧭 Navegar aquí
          </button>
          {e && EVENT_STATE_BEHAVIOR[e.state].purchasable ? (
            <button type="button" className="mar-btn" onClick={() => onBuy(e.id)}>
              🎟️ Entradas
            </button>
          ) : null}
        </div>
      </>
    );
  } else if (state.target === 'photos') {
    const photos = liveContent().photos.slice(0, 6);
    body = (
      <>
        <p className="mar-sheet__kicker">📷 Puerto de Fotos · muestra</p>
        <h2 className="mar-sheet__title">{name}</h2>
        <p>{textOf(object, 'body') ?? 'Todas las fotos de BOIA se revelan aquí.'}</p>
        <ul className="mar-sheet__photos" aria-label="Galería">
          {photos.map((p, i) => (
            <li
              key={p.id}
              role="img"
              aria-label={p.alt}
              title={p.alt}
              style={{ '--i': i } as CSSProperties}
            />
          ))}
        </ul>
        <div className="mar-sheet__actions">
          <Link className="mar-btn mar-btn--primary" href="/#fotos">
            Ver la galería
          </Link>
        </div>
      </>
    );
  } else if (state.target === 'store') {
    const sb = block('store');
    const url = sb?.type === 'store' ? sb.url : undefined;
    const products = sb?.type === 'store' ? sb.products : [];
    body = (
      <>
        <p className="mar-sheet__kicker">🛍️ Tienda · muestra</p>
        <h2 className="mar-sheet__title">{name}</h2>
        <p>{textOf(object, 'body') ?? 'Camisetas, tote bags y pegatinas.'}</p>
        {products.length ? <p className="mar-sheet__meta">{products.join(' · ')}</p> : null}
        {url ? (
          <div className="mar-sheet__actions">
            <a
              className="mar-btn mar-btn--primary"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ir a la tienda ↗
            </a>
          </div>
        ) : null}
      </>
    );
  } else if (state.ref === 'whatsapp') {
    const cb = block('contact');
    const wa = cb?.type === 'contact' ? cb.links.find((l) => /whatsapp/i.test(l.label)) : undefined;
    body = (
      <>
        <p className="mar-sheet__kicker">💬 Provisional · muestra</p>
        <h2 className="mar-sheet__title">{textOf(object, 'title') ?? name}</h2>
        <p>{textOf(object, 'body') ?? 'El grupo de WhatsApp de BOIA, si te apetece.'}</p>
        {wa ? (
          <div className="mar-sheet__actions">
            <a
              className="mar-btn mar-btn--primary"
              href={wa.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir WhatsApp ↗
            </a>
          </div>
        ) : null}
      </>
    );
  } else {
    const memories = islandMemories(state.placeId, liveContent().events, new Date());
    const next = upcoming();
    body = (
      <>
        <p className="mar-sheet__kicker">🏝️ {textOf(object, 'kicker') ?? 'Isla'} · muestra</p>
        <h2 className="mar-sheet__title">{name}</h2>
        {textOf(object, 'body') ? <p>{textOf(object, 'body')}</p> : null}
        {memories.length ? (
          <div className="mar-sheet__block">
            <h3>Recuerdos de esta isla</h3>
            <ul>
              {memories.map((e) => (
                <li key={e.id}>
                  <strong>{e.name}</strong> · {formatEventDate(e.startsAt, e.timeZone)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {next.length ? (
          <div className="mar-sheet__block">
            <h3>Próximos eventos</h3>
            <ul>
              {next.map((e) => (
                <li key={e.id}>
                  <strong>{e.name}</strong> · {formatEventDate(e.startsAt, e.timeZone)}{' '}
                  <button type="button" className="mar-link" onClick={() => onSteerEvent(e.id)}>
                    Rumbo a su isla
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <section className="mar-sheet" data-testid="mar-ficha" aria-label={name || 'Ficha'}>
      <button type="button" className="mar-sheet__close" onClick={onClose} aria-label="Cerrar">
        ×
      </button>
      {body}
    </section>
  );
}

function kickerOf(o: WorldObject | undefined): string {
  switch (o?.identity.category) {
    case 'isla':
      return eventOfPlace(o) ? '🎤 Isla de evento' : '🏝️ Isla';
    case 'naufrago':
      return '🆘 Encuentro';
    case 'encuentro':
      return '🎈 Misión';
    case 'circuito':
      return '🏁 Circuito';
    case 'boia':
      return '👋 Boia';
    default:
      return 'Lugar';
  }
}

function EventBlock({ event: e, onBuy }: { event: BoiaEvent; onBuy: (id: string) => void }) {
  const buy = EVENT_STATE_BEHAVIOR[e.state].purchasable;
  return (
    <>
      <p className="mar-sheet__kicker">
        🎤 {e.format}
        {e.sample ? ' · muestra' : ''}
      </p>
      <h2 className="mar-sheet__title">{e.name}</h2>
      <p className="mar-sheet__meta">
        {formatEventDate(e.startsAt, e.timeZone)} · {e.placeLabel}
      </p>
      <p>{e.description}</p>
      {buy ? (
        <div className="mar-sheet__actions">
          <button
            type="button"
            className="mar-btn mar-btn--primary mar-btn--big"
            data-testid="mar-comprar"
            aria-haspopup="dialog"
            onClick={() => onBuy(e.id)}
          >
            🎟️ Comprar entrada
          </button>
        </div>
      ) : null}
    </>
  );
}

const STATUS: Record<FoundDiscount['status'], string> = {
  active: 'Vigente',
  upcoming: 'Todavía no vale',
  expired: 'Caducado',
};

function DiscountCard({ found }: { found: FoundDiscount }) {
  const d = found.discount;
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  const expired = found.status === 'expired';
  const event = d.eventId ? findEvent(d.eventId) : undefined;
  return (
    <div className="mar-discount" data-status={found.status}>
      <p className="mar-discount__label">{d.label}</p>
      <p className="mar-discount__code">
        <code data-testid="mar-descuento-codigo">{d.code}</code>
        <span className={`mar-discount__status is-${found.status}`}>{STATUS[found.status]}</span>
      </p>
      {event ? <p className="mar-sheet__meta">{event.name}</p> : null}
      {d.conditions ? <p className="mar-sheet__note">{d.conditions}</p> : null}
      <button
        type="button"
        className="mar-btn mar-btn--primary"
        disabled={expired}
        onClick={() =>
          void navigator.clipboard
            .writeText(d.code)
            .then(() => setCopied('ok'))
            .catch(() => setCopied('fail'))
        }
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
