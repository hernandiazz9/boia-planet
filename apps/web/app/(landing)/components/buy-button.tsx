'use client';

import type { FunnelEventProps } from '@boia/contracts/analytics';
import { type ComponentType, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../lib/i18n';
import type { SandboxCheckout } from '../../../lib/ticketing/checkout';
import { CHECKOUT_COPY } from '../../../lib/ticketing/copy';

type Source = FunnelEventProps['ticket_click_out']['source'];
type Checkout = typeof SandboxCheckout;

/** Dónde ver el sello desde la landing: Mi Carnet en el Menú de a bordo. */
export const CARNET_FROM_LANDING = '/juego?menu=carnet';

/**
 * «Comprar entradas» de la landing y del panel de Tickets (T25): abre el
 * checkout de prueba (D-20, REQ-COM-035). El checkout y el repositorio se
 * cargan al pulsar, fuera de la ruta crítica de la landing. La analítica del
 * clic la recoge `LandingClient` por `data-track`. Sólo se pinta para
 * eventos comprables (`canBuy`): un finalizado nunca llega aquí.
 */
export function BuyButton({
  eventId,
  eventName,
  ticketUrl,
  source,
}: {
  eventId: string;
  eventName: string;
  /** Enlace sin JavaScript (la ticketera de muestra hasta que haya una real). */
  ticketUrl: string | undefined;
  source: Source;
}) {
  const [Checkout, setCheckout] = useState<ComponentType<Parameters<Checkout>[0]> | null>(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  // Sin JavaScript (o antes de hidratar) queda el enlace a la ticketera de
  // muestra, como antes (REQ-ENT-017); con JavaScript, la compra de prueba.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const track = {
    'data-track': 'ticket_click_out',
    'data-event-id': eventId,
    'data-source': source,
    'data-testid': `comprar-${eventId}`,
  };

  if (!hydrated && ticketUrl) {
    return (
      <a
        className="button button--buy"
        href={ticketUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('event.buy.aria', { name: eventName })}
        {...track}
      >
        {t('event.buy')}
      </a>
    );
  }

  const onClick = () => {
    setFailed(false);
    if (Checkout) return setOpen(true);
    import('../../../lib/ticketing/checkout')
      .then((m) => {
        setCheckout(() => m.SandboxCheckout);
        setOpen(true);
      })
      .catch((err: unknown) => {
        console.warn('[boia] no se pudo cargar la compra de prueba', err);
        setFailed(true);
      });
  };

  return (
    <>
      <button
        type="button"
        className="button button--buy"
        aria-label={CHECKOUT_COPY.buyAria(eventName)}
        aria-haspopup="dialog"
        {...track}
        onClick={onClick}
      >
        {CHECKOUT_COPY.buy}
      </button>
      {failed ? (
        <p className="event-card__note" role="alert">
          {CHECKOUT_COPY.loadFailed}
        </p>
      ) : null}
      {open && Checkout
        ? createPortal(
            <Checkout
              eventId={eventId}
              carnet={{ href: CARNET_FROM_LANDING }}
              onClose={() => setOpen(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}
