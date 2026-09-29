import { placeHref } from '../world-handoff';

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
  carnet: 'Mi Carnet',
  sound: 'Sonido',
  soundOn: 'Sonido activado',
  soundOff: 'Sonido apagado',
  instagram: 'Instagram',
  instagramAria: 'Instagram de BOIA (se abre en otra pestaña)',
  whatsapp: 'WhatsApp',
  whatsappCta: 'Entrar en el WhatsApp',
  whatsappAria: 'Entrar en el WhatsApp de BOIA (se abre en otra pestaña)',
  /** `footer.invite.carnet`, `footer.invite.whatsapp` (zona 24 y 22). */
  footerCarnet: '¿Aún sin Carnet? Hazte el tuyo: es gratis y sin email.',
  footerCarnetCta: 'Crear mi Carnet',
  footerWhatsapp: 'Entérate antes que nadie de la próxima fiesta en el WhatsApp de BOIA.',
  footerInviteLabel: 'Únete a BOIA',
  /** «Ir en barco»: el mismo contenido, en su isla del mar. */
  sailTickets: 'Ver su isla en el mar',
  sailPhotos: 'Ir en barco al Puerto de Fotos',
  sailStore: 'Ir en barco a la isla tienda',
} as const;
