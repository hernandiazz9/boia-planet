import { type Discount, discountStatus } from '@boia/contracts';
import type { AppliedDiscount, Quote } from './adapter';

/**
 * Precios de la compra de prueba, en céntimos. Todos `muestra`: el precio real
 * lo pone la ticketera cuando Álvaro la contrate (D-06). Un evento sin precio
 * aquí usa `DEFAULT_SAMPLE_PRICE_CENTS`.
 */
export const SAMPLE_PRICES_CENTS: Readonly<Record<string, number>> = {
  'ev-all-day-primavera': 2500,
  'ev-noche-mayo': 1500,
};
export const DEFAULT_SAMPLE_PRICE_CENTS = 2000;

export function samplePriceCents(eventId: string): number {
  return SAMPLE_PRICES_CENTS[eventId] ?? DEFAULT_SAMPLE_PRICE_CENTS;
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
  eventId: string,
  found: readonly { discount: Discount }[],
  now: Date,
  quantity = 1,
): Quote {
  const unitCents = samplePriceCents(eventId);
  const discount = applicableDiscount(eventId, found, unitCents, now);
  const totalCents = Math.max(0, unitCents * quantity - (discount?.cents ?? 0));
  return { currency: 'EUR', unitCents, quantity, discount, totalCents, sample: true };
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export function formatEuros(cents: number): string {
  return EUR.format(cents / 100);
}
