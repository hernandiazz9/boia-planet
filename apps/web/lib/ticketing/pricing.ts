import { type BoiaEvent, type Discount, discountStatus } from '@boia/contracts';
import { SAMPLE_CONTENT } from '../landing/sample-content';
import type { AppliedDiscount, Quote } from './adapter';

/**
 * Precios de la compra de prueba, en céntimos. El precio es del evento
 * (`priceCents`, T42; antes vivía aquí en una tabla) y es `muestra` hasta que
 * lo ponga la ticketera que contrate Álvaro (D-06). Un evento sin precio usa
 * `DEFAULT_SAMPLE_PRICE_CENTS`.
 */
export const DEFAULT_SAMPLE_PRICE_CENTS = 2000;

type Priced = Pick<BoiaEvent, 'id' | 'priceCents'>;

/** Precio de un evento; con sólo el id, el del evento de la muestra. */
export function samplePriceCents(event: Priced | string): number {
  const e = typeof event === 'string' ? SAMPLE_CONTENT.events.find((x) => x.id === event) : event;
  return e?.priceCents ?? DEFAULT_SAMPLE_PRICE_CENTS;
}

/** Lo que descuenta un código sobre un precio, sin pasar de ese precio. */
export function discountCents(discount: Discount, priceCents: number): number {
  const off =
    discount.kind === 'percent'
      ? Math.round((priceCents * Math.min(discount.value, 100)) / 100)
      : discount.value;
  return Math.max(0, Math.min(priceCents, off));
}

/**
 * El descuento que se aplica a la compra de un evento, o null. Sólo vale un
 * código que el visitante haya encontrado (la lista es la de sus hallazgos),
 * vigente ahora y de ese evento (o sin evento). Si hay varios, el que más
 * descuenta.
 */
export function applicableDiscount(
  eventId: string,
  found: readonly { discount: Discount }[],
  priceCents: number,
  now: Date,
): AppliedDiscount | null {
  let best: AppliedDiscount | null = null;
  for (const { discount } of found) {
    if (discount.eventId !== undefined && discount.eventId !== eventId) continue;
    if (discountStatus(discount, now) !== 'active') continue;
    const cents = discountCents(discount, priceCents);
    if (cents <= 0 || (best && best.cents >= cents)) continue;
    best = { id: discount.id, code: discount.code, label: discount.label, cents };
  }
  return best;
}

export function quoteFor(
  event: Priced | string,
  found: readonly { discount: Discount }[],
  now: Date,
  quantity = 1,
): Quote {
  const eventId = typeof event === 'string' ? event : event.id;
  const unitCents = samplePriceCents(event);
  const discount = applicableDiscount(eventId, found, unitCents, now);
  const totalCents = Math.max(0, unitCents * quantity - (discount?.cents ?? 0));
  return { currency: 'EUR', unitCents, quantity, discount, totalCents, sample: true };
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export function formatEuros(cents: number): string {
  return EUR.format(cents / 100);
}
