import { placeHref } from '../world-handoff';
import { t } from '../i18n/web';

/**
 * Accesos de la landing que llevan el barco a su lugar (T44, REQ-ENT-034,
 * REQ-AVE-022) y los textos nuevos de cabecera y pie (REQ-ENT-029,
 * REQ-ENT-032, O13). La landing sigue siendo HTML: Tickets abre su panel,
 * Fotos y Tienda son secciones; con JavaScript, cada una ofrece además «ir en
 * barco», que abre /juego con el barco llegando a su isla y su panel abierto
 * (el sector navegable bajo demanda de REQ-ENT-038). Textos de
 * docs/propuestas/textos-zonas.md, `muestra`.
 */

/** Lugares del mapa compartido (ids estables, iguales en todos los mundos). */
export const PHOTOS_PLACE_ID = 'fotos';
export const STORE_PLACE_ID = 'tienda';

/** /juego con el barco en el Puerto de Fotos y la galería abierta. */
export const PHOTOS_SAIL_HREF = placeHref(PHOTOS_PLACE_ID);
/** /juego con el barco en la isla tienda y su escaparate abierto. */
export const STORE_SAIL_HREF = placeHref(STORE_PLACE_ID);

/** /juego con el barco en la isla del evento y su panel (con compra) abierto. */
export function ticketsSailHref(islandId: string, eventId?: string): string {
  return placeHref(islandId, eventId ? { eventId } : {});
}

/** Mi Carnet desde la cabecera: la página del propio Carnet (o su invitación). */
export const CARNET_PAGE = '/carnet';
/** Crear el Carnet desde la landing: Mi Carnet en el Menú de a bordo. */
export const CARNET_CREATE_HREF = '/juego?menu=carnet';

export const ACCESS_COPY = {
  carnet: t('nav.carnet'),
  sound: t('landing.access.sonido'),
  soundOn: t('nav.sound.on'),
  soundOff: t('nav.sound.off'),
  instagram: t('footer.instagram'),
  instagramAria: t('instagram.cta.aria'),
  whatsapp: 'WhatsApp',
  whatsappCta: t('landing.access.entrarEnElWhatsapp'),
  whatsappAria: t('landing.access.entrarEnElWhatsapp2'),
  /** `footer.invite.carnet`, `footer.invite.whatsapp` (zona 24 y 22). */
  footerCarnet: t('footer.invite.carnet'),
  footerCarnetCta: t('carnet.create'),
  footerWhatsapp: t('footer.invite.whatsapp'),
  footerInviteLabel: t('invite.join.title'),
  /** «Ir en barco»: el mismo contenido, en su isla del mar. */
  sailTickets: t('landing.access.verSuIslaEn'),
  sailPhotos: t('landing.access.irEnBarcoAl'),
  sailStore: t('landing.access.irEnBarcoA'),
} as const;
