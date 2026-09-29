import type { PurchaseOutcome } from './adapter';

/**
 * Textos de la compra de prueba (D-20, REQ-COM-035). Borrador `muestra`,
 * pendiente Álvaro. Tienen que dejar claro que es una prueba: no se cobra ni
 * se emite ninguna entrada, y todo se guarda en este navegador (REQ-IDE-051).
 */
export const CHECKOUT_COPY = {
  buy: 'Comprar entradas',
  buyAria: (name: string) => `Comprar entradas para ${name} (compra de prueba)`,
  islandBuy: 'Comprar entrada',
  kicker: 'Compra de prueba',
  title: 'Comprar entrada',
  testNotice:
    'Versión de prueba: no se cobra nada ni se emite una entrada real. Al confirmar, el sello del evento se añade a tu Carnet, guardado sólo en este navegador.',
  ticketLine: 'Entrada · precio de muestra',
  discountLine: (code: string) => `Descuento ${code}`,
  noDiscount: 'Sin descuento. Algunos se esconden en el mar.',
  total: 'Total de prueba',
  confirm: 'Confirmar compra de prueba',
  confirming: 'Confirmando…',
  cancel: 'Cancelar',
  close: 'Cerrar',
  loading: 'Preparando la compra de prueba…',
  notFound: 'No encontramos este evento.',
  notOnSale: 'Este evento ya no está a la venta.',
  failed: 'No se pudo completar la compra de prueba. Inténtalo de nuevo.',
  loadFailed: 'No se pudo abrir la compra de prueba.',
  seeCarnet: 'Ver Mi Carnet',
  stamp: {
    granted: '¡Sello añadido a tu Carnet!',
    duplicate: 'Esta compra ya estaba confirmada: su sello ya está en tu Carnet.',
    already_stamped: 'Ya tenías el sello de este evento: cada evento deja uno.',
  } satisfies Record<PurchaseOutcome['stamp'], string>,
  achievement: (title: string) => `Logro conseguido: ${title}`,
  /** Aviso de descuento al comprar en la isla o la ficha del evento (D-23, REQ-COM-036). */
  banner: {
    title: 'Tienes un código de descuento para este evento',
    saving: (euros: string) => `Ahorras ${euros}`,
    applied: 'Se aplica solo al comprar.',
  },
} as const;
