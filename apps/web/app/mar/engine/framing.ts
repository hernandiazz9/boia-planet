/**
 * Encuadre de la cámara de cubierta según la forma de la pantalla (T34,
 * Hernán en el móvil): en un móvil en vertical el barco va en el centro de lo
 * que se ve (entre la barra de arriba y «Entradas»), mirando apenas por
 * delante, y se sale con algo más de zoom para ver las boyas siguientes y lo
 * que hay alrededor. En apaisado (el escritorio) todo sigue como antes. Por
 * proporción de la pantalla, nunca por el navegador. Sin three.js. muestra
 */

/** Zoom de salida en apaisado (el de siempre) y en un móvil en vertical. muestra */
export const START_ZOOM = { wide: 0.2, portrait: 0.26 } as const;
/** Cuánto mira por delante del barco, × la distancia de la cámara (parado). muestra */
export const LOOK_AHEAD = { wide: 0.2, portrait: 0.03 } as const;
/** Cuánto se adelanta con la velocidad (s de navegación). muestra */
export const SPEED_LEAD = { wide: 0.28, portrait: 0.05 } as const;

/**
 * Rapidez (1/s) con la que el foco de la cámara sigue al barco. Navegando
 * recto se queda `v / FOCUS_RATE` por detrás: en vertical se compensa entero
 * (`catchUp`), para que el barco no se salga del centro al ir rápido.
 */
export const FOCUS_RATE = 8;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 en apaisado o cuadrado (ancho ≥ alto), 1 en un móvil en vertical (ancho ≤ la mitad del alto). */
export function portraitness(aspect: number): number {
  return clamp01((1 - aspect) / 0.5);
}

export function startZoom(aspect: number): number {
  return mix(START_ZOOM.wide, START_ZOOM.portrait, portraitness(aspect));
}

export function lookAhead(aspect: number): { ahead: number; lead: number; catchUp: number } {
  const k = portraitness(aspect);
  return {
    ahead: mix(LOOK_AHEAD.wide, LOOK_AHEAD.portrait, k),
    lead: mix(SPEED_LEAD.wide, SPEED_LEAD.portrait, k),
    catchUp: k / FOCUS_RATE,
  };
}
