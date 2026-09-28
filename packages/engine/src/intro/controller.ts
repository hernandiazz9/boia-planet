import type { IntroConfig } from './config';
import type { Viewport } from './math';
import type { IntroGeometry } from './sphere';
import { actDuration, frameAt, type IntroAct, type IntroFrame, type IntroMode } from './timeline';

/**
 * Máquina de estados de la entrada «mini-mundo» (D-19). Sin DOM ni Pixi:
 * recibe eventos (botón de entrar, saltar, pestaña oculta, cambio de ruta,
 * Atrás, rotación) y decide qué fotograma pintar y cuándo se muestra la
 * landing. Garantías (REQ-ENT-008, 014, 019, 020):
 * - crea como mucho una escena en toda su vida, pase lo que pase;
 * - la landing se muestra una sola vez (`onLanded` se llama una vez);
 * - la pausa no avanza sin el botón (o el avance automático, si está activo);
 * - entrar, saltar, interrumpir y destruir son idempotentes;
 * - nunca arranca el juego: sólo `explore()`, ya en la landing, lo hace.
 *
 * Fases: `waiting` (acto 0: escena cargando) → `appearing` (acto 1) →
 * `paused` (acto 2) → `landing` (acto 3) → `landed`; `destroyed` al
 * desmontar. Con movimiento reducido no hay acto 1 (el mini-mundo sale
 * quieto) y el acto 3 es un fundido. Un enlace directo o una visita
 * posterior nacen ya en `landed`: la escena, si llega, se pinta en el
 * encuadre final.
 */

/**
 * Un fotograma nunca adelanta la secuencia más de esto: tras un tirón (subir
 * texturas, un móvil lento) la animación sigue donde iba en vez de saltar.
 */
export const MAX_FRAME_STEP_MS = 250;

export type IntroPhase =
  'idle' | 'waiting' | 'appearing' | 'paused' | 'landing' | 'landed' | 'destroyed';
export type SceneStatus = 'none' | 'loading' | 'ready' | 'failed' | 'disposed';
export type IntroOutcome = 'played' | 'skipped' | 'none';
export type EnterSource = 'button' | 'auto';

export interface IntroSceneHandle {
  render(frame: IntroFrame, clockSeconds: number): void;
  destroy(): void;
}

export interface IntroControllerDeps<S extends IntroSceneHandle> {
  mode: IntroMode;
  config: IntroConfig;
  geometry: IntroGeometry;
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

const ACT_OF: Partial<Record<IntroPhase, IntroAct>> = {
  appearing: 'appear',
  paused: 'pause',
  landing: 'landing',
};

export class IntroController<S extends IntroSceneHandle = IntroSceneHandle> {
  phase: IntroPhase = 'idle';
  sceneStatus: SceneStatus = 'none';
  outcome: IntroOutcome | null = null;
  scenesCreated = 0;
  scenesDestroyed = 0;
  gamesStarted = 0;
  /** Cómo se pidió el aterrizaje (botón o avance automático); `null` si no se pidió. */
  enteredBy: EnterSource | null = null;
  /** ms de reloj que duró la aparición (acto 1), si se vio entera. */
  appearedMs: number | null = null;
  /** ms de reloj que duró el aterrizaje (acto 3), si se vio entero. */
  playedMs: number | null = null;

  private scene: S | null = null;
  /** ms avanzados dentro del acto (con el tope por fotograma). */
  private actMs = 0;
  /** ms de giro acumulados en los actos 1 y 2. */
  private spinMs = 0;
  private lastNow: number | null = null;
  private actStartedAt: number | null = null;
  private cancelBudget: (() => void) | null = null;
  private cancelAuto: (() => void) | null = null;

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
    if (mode === 'direct') {
      this.land('none');
    } else {
      this.phase = 'waiting';
      const remaining = Math.max(0, config.loadBudgetMs - this.deps.elapsedSinceBoot);
      this.cancelBudget = this.deps.setTimer(() => {
        // Recursos no listos a tiempo: landing ligera, sin alargar la espera.
        if (this.phase === 'waiting') this.land('none');
      }, remaining);
    }
    this.loadScene();
    this.changed();
  }

  /**
   * Botón de entrar (o avance automático): empieza el aterrizaje. Sólo desde
   * la pausa; devuelve si lo empezó. Pulsarlo otra vez no hace nada.
   */
  enter(source: EnterSource = 'button'): boolean {
    if (this.phase !== 'paused') return false;
    this.clearAuto();
    this.enteredBy = source;
    this.toAct('landing');
    // El aterrizaje cuenta desde la pulsación, no desde el fotograma anterior.
    this.lastNow = this.actStartedAt = this.deps.now();
    return true;
  }

  /** Hubo interacción en la pausa: el avance automático vuelve a contar desde cero. */
  touch(): void {
    if (this.phase === 'paused') this.scheduleAuto();
  }

  /** «Saltar animación»: lleva al mismo estado final. Idempotente. */
  skip(): void {
    if (
      this.phase === 'waiting' ||
      this.phase === 'appearing' ||
      this.phase === 'paused' ||
      this.phase === 'landing'
    ) {
      this.land('skipped');
    }
  }

  /**
   * Pestaña oculta, rotación o vuelta desde la caché del navegador: lo que se
   * estaba animando termina en su estado final y no se retoma a medias. La
   * aparición acaba en la pausa (con título y botón); el aterrizaje, en la
   * landing. La pausa sigue esperando al botón.
   */
  interrupt(): void {
    if (this.phase === 'waiting') this.land('none');
    else if (this.phase === 'appearing') {
      this.toAct('paused');
      // Título y botón ya visibles: al volver no hay nada a medias.
      this.actMs = this.deps.config.pause.uiInMs;
    } else if (this.phase === 'landing') this.land('played');
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
   * Fotograma para ahora, o `null` si no hay escena que pintar. Terminar un
   * acto pasa al siguiente; terminar el aterrizaje muestra la landing.
   */
  frame(vp: Viewport): IntroFrame | null {
    if (this.sceneStatus !== 'ready' || this.phase === 'destroyed') return null;
    const { config, geometry, mode } = this.deps;
    const act = ACT_OF[this.phase];
    if (!act) return frameAt(config, geometry, vp, { act: 'landed', t: 0, spinMs: 0 }, 'direct');

    const now = this.deps.now();
    // El acto empieza en su primer fotograma, no al llegar la escena.
    if (this.lastNow === null) this.lastNow = now;
    if (this.actStartedAt === null) this.actStartedAt = now;
    const dt = Math.min(Math.max(0, now - this.lastNow), MAX_FRAME_STEP_MS);
    this.lastNow = now;
    this.actMs += dt;
    if (mode === 'intro' && act !== 'landing') this.spinMs += dt;

    const duration = actDuration(config, act, mode);
    if (act === 'appear' && this.actMs >= duration) {
      this.appearedMs = now - this.actStartedAt;
      const extra = this.actMs - duration;
      this.toAct('paused');
      this.actStartedAt = now;
      this.actMs = extra;
    }
    const f = frameAt(
      config,
      geometry,
      vp,
      { act: ACT_OF[this.phase]!, t: this.actMs, spinMs: this.spinMs },
      mode,
    );
    if (act === 'landing' && f.done) {
      // Duración real, de reloj: es la que se mide contra los ~2 s.
      this.playedMs = now - this.actStartedAt;
      this.land('played');
    }
    return f;
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
    this.clearAuto();
    this.disposeScene();
    this.changed();
  }

  private toAct(phase: 'appearing' | 'paused' | 'landing'): void {
    this.phase = phase;
    this.actMs = 0;
    this.actStartedAt = null;
    if (phase === 'paused') this.scheduleAuto();
    this.changed();
  }

  private scheduleAuto(): void {
    this.clearAuto();
    const auto = this.deps.config.pause.autoAdvance;
    if (!auto.enabled) return;
    this.cancelAuto = this.deps.setTimer(() => {
      this.cancelAuto = null;
      this.enter('auto');
    }, auto.afterMs);
  }

  private clearAuto(): void {
    this.cancelAuto?.();
    this.cancelAuto = null;
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
          this.cancelBudget?.();
          this.cancelBudget = null;
          this.lastNow = null;
          this.spinMs = 0;
          this.toAct(this.deps.mode === 'intro' ? 'appearing' : 'paused');
          return;
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
    this.clearAuto();
    this.deps.onLanded(outcome);
    this.changed();
  }

  private changed(): void {
    this.deps.onChange?.();
  }
}
