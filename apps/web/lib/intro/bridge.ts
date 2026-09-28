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
  /** Fotogramas en los que la cámara (o la esfera) se movió sin que cambiase la vista. */
  cameraMoves: number;
  /** Curvatura del último fotograma pintado (1 esfera, 0 plano) y las vistas en el aterrizaje. */
  k: number | null;
  landingK: number[];
  /** Cómo se pidió el aterrizaje: botón o avance automático. */
  enteredBy: 'button' | 'auto' | null;
  /** ms de reloj de la aparición y del aterrizaje (sólo si se vieron enteros). */
  appearedMs: number | null;
  playedMs: number | null;
  /** GPU con la que pinta la escena (SwiftShader = por software). */
  renderer: string | null;
  /** ms desde la carga hasta tener la escena lista (si pasa de `loadBudgetMs`, landing ligera). */
  sceneReadyMs: number | null;
  /** ms desde la carga (arranque del script) hasta ver la landing. */
  landedAtMs: number | null;
  /** Fotograma más largo durante la animación y cuántos pasaron de 50 ms. */
  longestFrameMs: number;
  slowFrames: number;
  /** Fases vistas, en orden. */
  history: string[];
  /** EXPLORAR arrancó el juego desde esta landing (cediendo la escena si la había). */
  explored: boolean;
  /** Título del acto 2 (T27). */
  title: TitleDiagnostics;
}

export interface TitleDiagnostics {
  /** `3d`: letras de Blender en el canvas; `flat`: el texto plano (sin hoja o aún sin cargar). */
  mode: 'flat' | '3d';
  /** ms desde la carga hasta tener la hoja decodificada, y desde cuándo se pidió. */
  requestedMs: number | null;
  loadedMs: number | null;
  /** Veces que se pintó el canvas. */
  draws: number;
  /** Pose del último pintado (columna, desplazamiento y opacidad de cada letra), para comparar. */
  pose: string | null;
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
