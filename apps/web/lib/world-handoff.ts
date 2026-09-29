import type { GameSurface } from '@boia/engine';

/**
 * Paso del mundo de la landing al juego (REQ-ENT-012). Al pulsar EXPLORAR, la
 * entrada cede su superficie (aplicación Pixi, canvas y mar vivo) y la
 * navegación a /juego es del lado del cliente: el juego la recoge y pinta su
 * mundo en el mismo canvas, sin crear otro contexto WebGL ni repetir la
 * entrada. Vive en memoria del módulo, así que sólo existe dentro de la misma
 * página (una recarga o un enlace directo a /juego arrancan en limpio).
 */

/** Si /juego no la recoge en este plazo (navegación cancelada), se destruye. */
const CLAIM_WINDOW_MS = 15_000;

let pending: { surface: GameSurface; timer: ReturnType<typeof setTimeout> } | null = null;

export function offerWorld(surface: GameSurface): void {
  discardWorld();
  const timer = setTimeout(discardWorld, CLAIM_WINDOW_MS);
  pending = { surface, timer };
}

/** La superficie cedida, una sola vez; `null` si no hay ninguna. */
export function claimWorld(): GameSurface | null {
  if (!pending) return null;
  clearTimeout(pending.timer);
  const { surface } = pending;
  pending = null;
  return surface;
}

export function discardWorld(): void {
  if (!pending) return;
  clearTimeout(pending.timer);
  const { surface } = pending;
  pending = null;
  surface.app.destroy({ removeView: true }, { children: true });
}

/**
 * Abrir /juego en un lugar (REQ-ENT-034, REQ-AVE-022): `/juego?ir=<lugar>`
 * lleva el barco a su punto seguro, junto al lugar y fuera de su radio (sin
 * premios ni descubrimientos, REQ-ENT-039), con una llegada breve y omisible,
 * y abre su panel. `evento` elige qué evento enseña una isla de evento. Lo
 * usan los accesos de la landing (Tickets, Fotos, Tienda) y cualquier «Ir a
 * la isla»; el juego lo consume una vez y lo quita de la URL, así una recarga
 * no repite el viaje.
 */
export const PLACE_PARAM = 'ir';
export const PLACE_EVENT_PARAM = 'evento';

export interface PlaceRequest {
  placeId: string;
  eventId?: string;
}

/** Enlace a /juego con el barco en `placeId` y su panel abierto. */
export function placeHref(placeId: string, opts: { eventId?: string } = {}): string {
  const q = new URLSearchParams({ [PLACE_PARAM]: placeId });
  if (opts.eventId) q.set(PLACE_EVENT_PARAM, opts.eventId);
  return `/juego?${q.toString()}`;
}

/** El lugar pedido en la URL de /juego, o `null`. */
export function readPlaceRequest(search: string): PlaceRequest | null {
  const q = new URLSearchParams(search);
  const placeId = q.get(PLACE_PARAM)?.trim();
  if (!placeId) return null;
  const eventId = q.get(PLACE_EVENT_PARAM)?.trim();
  return eventId ? { placeId, eventId } : { placeId };
}

/** La misma ruta sin la petición de lugar (se quita al llegar). */
export function withoutPlaceRequest(href: string): string {
  const url = new URL(href, 'http://boia.invalid');
  url.searchParams.delete(PLACE_PARAM);
  url.searchParams.delete(PLACE_EVENT_PARAM);
  return url.pathname + url.search + url.hash;
}
