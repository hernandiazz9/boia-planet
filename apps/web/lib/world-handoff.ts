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
