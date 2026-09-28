import type { Notice } from '@boia/engine/ui';
import type { PurchaseOutcome } from './adapter';
import { CHECKOUT_COPY } from './copy';

/**
 * Avisos del mar tras una compra de prueba (REQ-IDE-026): el sello, si se
 * acaba de añadir, y el logro de la entrada, si se acaba de conseguir. Ids
 * estables: repetir la confirmación no repite el aviso.
 */
export function purchaseNotices(outcome: PurchaseOutcome, eventName: string): Notice[] {
  const out: Notice[] = [];
  if (outcome.stamp === 'granted') {
    out.push({
      id: `sello:${outcome.purchaseId}`,
      kind: 'reward',
      title: CHECKOUT_COPY.stamp.granted,
      body: eventName,
    });
  }
  if (outcome.achievement?.granted) {
    out.push({
      id: `logro:${outcome.achievement.id}`,
      kind: 'achievement',
      title: outcome.achievement.title,
    });
  }
  return out;
}
