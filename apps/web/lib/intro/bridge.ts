import { LANDED_EVENT, type BootEntry, type IntroOutcome } from '@boia/engine/intro';

/** Diagnóstico de la entrada, legible desde la consola y desde las pruebas e2e. */
export interface IntroDiagnostics {
  mode: string;
  phase: string;
  sceneStatus: string;
  outcome: IntroOutcome | null;
  scenesCreated: number;
  worldsAlive: number;
  gamesStarted: number;
  framesRendered: number;
  /** Fotogramas en los que la cámara cambió sin que cambiase la vista. */
  cameraMoves: number;
  /** ms de secuencia hasta la llegada (sólo si se reprodujo entera). */
  playedMs: number | null;
  /** ms desde la carga (arranque del script) hasta ver la landing. */
  landedAtMs: number | null;
  /** Fotograma más largo durante la animación y cuántos pasaron de 50 ms. */
  longestFrameMs: number;
  slowFrames: number;
  /** Fases vistas, en orden. */
  history: string[];
  /** EXPLORAR arrancó el juego desde esta landing (cediendo la escena si la había). */
  explored: boolean;
}

declare global {
  interface Window {
    __boiaEntry?: BootEntry;
    __boiaIntro?: IntroDiagnostics;
  }
}

/** Llama a `cb` cuando se ve la landing (ya, si ya se ve). Devuelve la baja. */
export function onLanded(cb: (outcome: IntroOutcome) => void): () => void {
  const entry = window.__boiaEntry;
  if (!entry || entry.landed) {
    cb(entry?.landed ?? 'none');
    return () => {};
  }
  const handler = (e: Event) => cb((e as CustomEvent<{ intro: IntroOutcome }>).detail.intro);
  window.addEventListener(LANDED_EVENT, handler, { once: true });
  return () => window.removeEventListener(LANDED_EVENT, handler);
}
