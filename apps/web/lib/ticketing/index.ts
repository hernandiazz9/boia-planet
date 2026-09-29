import { gameRepository } from '../repo';
import type { TicketingAdapter } from './adapter';
import { createSandboxTicketing } from './sandbox';

export type * from './adapter';
export { createSandboxTicketing, TICKET_TRIGGER } from './sandbox';
export {
  applicableDiscount,
  discountBannerFor,
  formatEuros,
  quoteFor,
  samplePriceCents,
} from './pricing';
export type { DiscountBannerInfo, OwnedDiscount } from './pricing';

let adapter: TicketingAdapter | null = null;

/**
 * La ticketera que usa la web. En la versión de prueba (D-20), siempre el
 * sandbox sobre el repositorio de este navegador; la ticketera real se
 * enchufará aquí (REQ-COM-015).
 */
export function ticketing(): TicketingAdapter {
  if (typeof window === 'undefined') return createSandboxTicketing(gameRepository());
  adapter ??= createSandboxTicketing(gameRepository());
  return adapter;
}
