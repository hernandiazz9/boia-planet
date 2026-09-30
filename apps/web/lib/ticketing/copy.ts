import type { PurchaseOutcome } from './adapter';
import { t } from '../i18n/web';

/**
 * Textos de la compra de prueba (D-20, REQ-COM-035). Borrador `muestra`,
 * pendiente Álvaro. Tienen que dejar claro que es una prueba: no se cobra ni
 * se emite ninguna entrada, y todo se guarda en este navegador (REQ-IDE-051).
 */
export const CHECKOUT_COPY = {
  buy: t('event.buy'),
  buyAria: (name: string) => t('ticketing.copy.comprarEntradasParaCompra', { name }),
  islandBuy: t('island.buy'),
  kicker: t('checkout.title'),
  title: t('island.buy'),
  testNotice: t('ticketing.copy.versionDePruebaNo'),
  ticketLine: t('checkout.price'),
  discountLine: (code: string) => t('checkout.discount.line', { code }),
  noDiscount: t('checkout.noDiscount'),
  total: t('checkout.total'),
  confirm: t('checkout.confirm'),
  confirming: t('checkout.confirming'),
  cancel: t('carnet.cancel'),
  close: t('tickets.close'),
  loading: t('ticketing.copy.preparandoLaCompraDe'),
  notFound: t('ticketing.copy.noEncontramosEsteEvento'),
  notOnSale: t('ticketing.copy.esteEventoYaNo'),
  failed: t('ticketing.copy.noSePudoCompletar'),
  loadFailed: t('ticketing.copy.noSePudoAbrir'),
  seeCarnet: t('checkout.viewCarnet'),
  stamp: {
    granted: t('checkout.stampAdded'),
    duplicate: t('ticketing.copy.estaCompraYaEstaba'),
    already_stamped: t('ticketing.copy.yaTeniasElSello'),
  } satisfies Record<PurchaseOutcome['stamp'], string>,
  achievement: (title: string) => t('ticketing.copy.logroConseguido', { title }),
  /** Aviso de descuento al comprar en la isla o la ficha del evento (D-23, REQ-COM-036). */
  banner: {
    title: t('checkout.discount.banner.title'),
    saving: (euros: string) => t('ticketing.copy.ahorras', { euros }),
    applied: t('ticketing.copy.seAplicaSoloAl'),
  },
} as const;
