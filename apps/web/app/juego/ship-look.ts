import {
  SHIP_SKIN_STORAGE_KEY,
  SHIP_STYLE_PARAM,
  SHIP_STYLE_STORAGE_KEY,
  requestedShipSkin,
  requestedShipStyle,
} from '@boia/engine/ui';
import type { ShipCatalog } from '../../lib/barco/catalog';

/**
 * Aspecto del barco (estilo + skin) en /juego (T12). Qué se carga al entrar:
 * `?estilo=<id>` si viene en la URL (T11), si no el último elegido en este
 * navegador; la skin, la guardada si ese estilo la ofrece, si no `base`.
 * Elegir en la sección «Barco» lo aplica al momento y lo guarda aquí.
 */

export interface ShipLook {
  style: string;
  skin: string;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Lo pedido para esta carga (URL o guardado); la validación final la hace el motor. */
export function requestedLook(
  search: string,
  catalog: ShipCatalog | null,
): { style: string | null; skin: string | null } {
  const s = storage();
  const style = requestedShipStyle(search, s);
  let skin = requestedShipSkin(s);
  // Una skin que el catálogo no ofrece para ese estilo (p. ej. por sus notas) no se pide.
  const entry = catalog?.styles.find((e) => e.id === (style ?? catalog.defaultId));
  if (skin && entry && !entry.skins.some((k) => k.id === skin)) skin = null;
  return { style, skin };
}

/** Guarda la elección en este navegador; sin almacenamiento vale sólo para esta visita. */
export function rememberLook(look: ShipLook): void {
  try {
    const s = storage();
    s?.setItem(SHIP_STYLE_STORAGE_KEY, look.style);
    s?.setItem(SHIP_SKIN_STORAGE_KEY, look.skin);
  } catch {
    // Modo privado o almacenamiento bloqueado.
  }
}

/**
 * Si la URL trae `?estilo=`, lo pone al día sin recargar: si no, al recargar
 * ganaría el de la URL a lo recién elegido.
 */
export function syncStyleParam(style: string): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(SHIP_STYLE_PARAM)) return;
  if (url.searchParams.get(SHIP_STYLE_PARAM) === style) return;
  url.searchParams.set(SHIP_STYLE_PARAM, style);
  window.history.replaceState(window.history.state, '', url.href);
}
