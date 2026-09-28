import type { IntroConfig } from './config';
import {
  frameAt,
  type IntroFrame,
  type IntroMode,
  type SceneGeometry,
  type Viewport,
} from './timeline';

/**
 * Máquina de estados de la entrada. Sin DOM ni Pixi: recibe eventos (saltar,
 * pestaña oculta, cambio de ruta, Atrás, rotación) y decide qué fotograma
 * pintar y cuándo se muestra la landing. Garantías (REQ-ENT-008, 014, 019,
 * 020):
 * - crea como mucho una escena en toda su vida, pase lo que pase;
 * - la landing se muestra una sola vez (`onLanded` se llama una vez);
 * - saltar, interrumpir y destruir son idempotentes;
 * - nunca arranca el juego: sólo `explore()`, ya en la landing, lo hace.
 *
 * Fases: `waiting` (cinemática pedida, escena cargando) → `playing` →
 * `landed`; `destroyed` al desmontar. Los modos `direct` y `reduced` nacen
 * ya en `landed`: la escena, si llega, se pinta en el encuadre final.
 */

/**
 * Un fotograma nunca adelanta la secuencia más de esto: tras un tirón (subir
 * texturas, un móvil lento) la animación sigue donde iba en vez de saltar al
 * final. Pestaña oculta y rotación no pasan por aquí: terminan la entrada.
 */
export const MAX_FRAME_STEP_MS = 250;

export type IntroPhase = 'idle' | 'waiting' | 'playing' | 'landed' | 'destroyed';
export type SceneStatus = 'none' | 'loading' | 'ready' | 'failed' | 'disposed';
export type IntroOutcome = 'played' | 'skipped' | 'none';

export interface IntroSceneHandle {
  render(frame: IntroFrame, clockSeconds: number): void;
  destroy(): void;
}

export interface IntroControllerDeps<S extends IntroSceneHandle> {
  mode: IntroMode;
  config: IntroConfig;
  geometry: SceneGeometry;
  /** Reloj en ms (performance.now en el navegador). */
  now(): number;
  /** ms ya gastados desde la carga cuando se crea el controlador. */
  elapsedSinceBoot: number;
  /** Crea la escena (Pixi). Puede fallar: entonces se queda la landing ligera. */
  createScene(): Promise<S>;
  setTimer(fn: () => void, ms: number): () => void;
  /** Se muestra la landing. Exactamente una vez. */
  onLanded(outcome: IntroOutcome): void;
  /** Cualquier cambio de fase o de escena (para depurar y para las pruebas). */
  onChange?(): void;
  /** Única vía para arrancar el juego (Explorar). */
  startGame?(): void;
}

export class IntroController<S extends IntroSceneHandle = IntroSceneHandle> {
  phase: IntroPhase = 'idle';
  sceneStatus: SceneStatus = 'none';
  outcome: IntroOutcome | null = null;
  scenesCreated = 0;
  scenesDestroyed = 0;
  gamesStarted = 0;
  /** ms desde el inicio de la secuencia hasta la llegada (sólo cinemática). */
  playedMs: number | null = null;

  private scene: S | null = null;
  private startedAt: number | null = null;
  /** ms de secuencia avanzados (con el tope por fotograma). */
  private elapsed = 0;
  private lastNow = 0;
  private cancelBudget: (() => void) | null = null;

  constructor(private readonly deps: IntroControllerDeps<S>) {}

  get mode(): IntroMode {
    return this.deps.mode;
  }

  /** Escenas vivas (0 o 1). */
  get worldsAlive(): number {
    return this.scenesCreated - this.scenesDestroyed;
  }

  start(): void {
    if (this.phase !== 'idle') return;
    const { mode, config } = this.deps;
    if (mode === 'intro') {
      this.phase = 'waiting';
      const remaining = Math.max(0, config.loadBudgetMs - this.deps.elapsedSinceBoot);
      this.cancelBudget = this.deps.setTimer(() => {
        // Recursos no listos a tiempo: landing ligera, sin alargar la espera.
        if (this.phase === 'waiting') this.land('none');
      }, remaining);
    } else {
      this.startedAt = this.deps.now();
      this.land('none');
    }
    this.loadScene();
    this.changed();
  }

  /** «Saltar animación»: lleva al mismo estado final. Idempotente. */
  skip(): void {
    if (this.phase === 'waiting' || this.phase === 'playing') this.land('skipped');
  }

  /**
   * Pestaña oculta, rotación, Atrás, cambio de hash o vuelta desde la caché
   * del navegador: la animación no se retoma, se termina en su estado final.
   */
  interrupt(): void {
    if (this.phase === 'playing') this.land('played');
    else if (this.phase === 'waiting') this.land('none');
  }

  /** Explorar: arranca el juego una vez, y sólo desde la landing. */
  explore(): boolean {
    if (this.phase !== 'landed' || this.gamesStarted > 0) return false;
    this.gamesStarted++;
    this.deps.startGame?.();
    this.changed();
    return true;
  }

  /**
   * Fotograma para ahora, o `null` si no hay escena que pintar. Llegar al
   * final de la secuencia muestra la landing.
   */
  frame(vp: Viewport): IntroFrame | null {
    if (this.sceneStatus !== 'ready' || this.phase === 'destroyed') return null;
    const { config, geometry, mode } = this.deps;
    if (this.phase === 'playing') {
      const now = this.deps.now();
      // La secuencia empieza en su primer fotograma, no al llegar la escena.
      if (this.startedAt === null) this.startedAt = this.lastNow = now;
      this.elapsed += Math.min(Math.max(0, now - this.lastNow), MAX_FRAME_STEP_MS);
      this.lastNow = now;
      const f = frameAt(config, geometry, vp, this.elapsed, 'intro');
      if (f.done) {
        // Duración real, de reloj: es la que se mide contra los 3 s.
        this.playedMs = now - (this.startedAt ?? now);
        this.land('played');
      }
      return f;
    }
    if (mode === 'reduced') {
      return frameAt(config, geometry, vp, this.deps.now() - (this.startedAt ?? 0), 'reduced');
    }
    return frameAt(config, geometry, vp, 0, 'direct');
  }

  /** Pinta el fotograma de ahora en la escena, si la hay. */
  render(vp: Viewport, clockSeconds: number): IntroFrame | null {
    const f = this.frame(vp);
    if (f && this.scene) this.scene.render(f, clockSeconds);
    return f;
  }

  /** Cambio de ruta o desmontaje. Idempotente. */
  destroy(): void {
    if (this.phase === 'destroyed') return;
    this.phase = 'destroyed';
    this.cancelBudget?.();
    this.cancelBudget = null;
    this.disposeScene();
    this.changed();
  }

  private loadScene(): void {
    if (this.scenesCreated > 0) return;
    this.scenesCreated++;
    this.sceneStatus = 'loading';
    this.deps.createScene().then(
      (scene) => {
        if (this.phase === 'destroyed') {
          // Llegó tarde: se desmontó mientras cargaba.
          scene.destroy();
          this.scenesDestroyed++;
          this.sceneStatus = 'disposed';
          this.changed();
          return;
        }
        this.scene = scene;
        this.sceneStatus = 'ready';
        if (this.phase === 'waiting') {
          this.phase = 'playing';
          this.startedAt = null;
          this.elapsed = 0;
        }
        this.changed();
      },
      () => {
        if (this.phase === 'destroyed') {
          this.scenesDestroyed++;
          this.sceneStatus = 'disposed';
          return;
        }
        // Motor o recursos fallan: la escena no existe y la landing ligera se queda.
        this.scenesDestroyed++;
        this.sceneStatus = 'failed';
        if (this.phase === 'waiting') this.land('none');
        this.changed();
      },
    );
  }

  private disposeScene(): void {
    if (this.scene) {
      this.scene.destroy();
      this.scene = null;
      this.scenesDestroyed++;
      this.sceneStatus = 'disposed';
    }
  }

  private land(outcome: IntroOutcome): void {
    if (this.phase === 'landed' || this.phase === 'destroyed') return;
    this.phase = 'landed';
    this.outcome = outcome;
    this.cancelBudget?.();
    this.cancelBudget = null;
    this.deps.onLanded(outcome);
    this.changed();
  }

  private changed(): void {
    this.deps.onChange?.();
  }
}
