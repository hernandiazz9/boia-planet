import {
  ACTIVE_WORLD_STORAGE_KEY,
  type ComposedWorld,
  WORLD_PARAM,
  WORLD_STORAGE_KEY,
  type WorldChoice,
  activeWorld,
  storedWorldChoice,
} from '@boia/world';
import { worlds } from './demo-world';

/**
 * Qué mundo se juega en /juego (T17): `?mundo=<id>`, si no el elegido en este
 * navegador (menú «Mundos», T24), si no el activo que fije el Admin (T26), si
 * no el por defecto. Las dos elecciones viven hoy en `localStorage`; T16/T26
 * las pasan al repositorio local sin cambiar la interfaz `WorldChoice`.
 */

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Mundo elegido por el visitante. */
export function visitorWorldChoice(): WorldChoice {
  return storedWorldChoice(storage(), WORLD_STORAGE_KEY);
}

/** Mundo activo para quien no ha elegido, fijado desde el Admin de la demo. */
export function adminWorldChoice(): WorldChoice {
  return storedWorldChoice(storage(), ACTIVE_WORLD_STORAGE_KEY);
}

/** El mundo de esta carga. */
export function currentWorld(search: string): ComposedWorld {
  return activeWorld(worlds, {
    search,
    visitor: visitorWorldChoice(),
    admin: adminWorldChoice(),
  });
}

/** Si la URL trae `?mundo=`, lo pone al día sin recargar (si no, al recargar ganaría). */
export function syncWorldParam(id: string): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(WORLD_PARAM) || url.searchParams.get(WORLD_PARAM) === id) return;
  url.searchParams.set(WORLD_PARAM, id);
  window.history.replaceState(window.history.state, '', url.href);
}
