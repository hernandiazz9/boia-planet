/**
 * Cambio de mundo por agujero negro (T41, D-23 punto 4): el tiempo de la
 * transición, sin Pixi ni DOM. El mar y las islas se enroscan hacia un
 * agujero negro centrado en el barco (`in`, ~1 s), la pantalla queda a
 * oscuras (`dark`) hasta que el mundo nuevo está listo alrededor del barco, y
 * el mundo nuevo se despliega desde el mismo punto (`out`, ~1 s).
 *
 * Con movimiento reducido (`fade`) no hay vórtice: el mundo de antes sigue
 * en pantalla mientras carga el nuevo y después se funde con él en 300 ms.
 *
 * Mientras dura (`active`), la entrada está bloqueada y el barco quieto.
 */

export type SwitchMode = 'vortex' | 'fade';
export type SwitchPhase = 'idle' | 'in' | 'dark' | 'out';

/** ms que tarda el mundo en caer al agujero. muestra */
export const VORTEX_IN_MS = 1000;
/** ms que tarda el mundo nuevo en desplegarse. muestra */
export const VORTEX_OUT_MS = 1000;
/** ms mínimos a oscuras, para que se note el cambio aunque el mundo ya esté. muestra */
export const VORTEX_DARK_MS = 150;
/** ms del fundido con movimiento reducido. */
export const FADE_MS = 300;
/** Vueltas que da el centro del vórtice al caer (rad). muestra */
export const VORTEX_TURNS = Math.PI * 5;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeIn = (t: number) => t * t * t;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Cómo se ve el vórtice en un instante. `depth` va de 0 (mundo normal) a 1
 * (todo dentro del agujero); el resto sale de ella.
 */
export interface VortexPose {
  depth: number;
  /** Giro en el centro (rad); se desvanece hacia fuera. */
  angle: number;
  /** Cuánto se encoge el mundo hacia el centro (1 = nada). */
  pull: number;
  /** Radio del agujero, en fracción de la media diagonal de la pantalla. */
  hole: number;
  /** Oscuridad de toda la pantalla (0–1). */
  dark: number;
  /** Opacidad de la foto del mundo de antes en el fundido (0 sin fundido). */
  fade: number;
}

export const IDLE_POSE: VortexPose = { depth: 0, angle: 0, pull: 1, hole: 0, dark: 0, fade: 0 };

/** Pose del vórtice para una profundidad; `sign` es el sentido (el despliegue sigue girando). */
export function vortexPose(depth: number, sign: 1 | -1 = 1): VortexPose {
  const d = clamp01(depth);
  return {
    depth: d,
    angle: sign * d * VORTEX_TURNS,
    pull: 1 + d * d * 7,
    hole: smooth(0.15, 1, d) * 1.2,
    dark: smooth(0.7, 1, d),
    fade: 0,
  };
}

export class SwitchTimeline {
  private _phase: SwitchPhase = 'idle';
  private _mode: SwitchMode = 'vortex';
  /** ms dentro de la fase. */
  private t = 0;
  /** El mundo pedido ya está puesto (o se abandonó): se puede abrir. */
  private ready = false;
  private darkWaiters: (() => void)[] = [];
  private endWaiters: (() => void)[] = [];
  private cancelled = false;

  get phase(): SwitchPhase {
    return this._phase;
  }

  get mode(): SwitchMode {
    return this._mode;
  }

  /** Hay transición: la entrada está bloqueada. */
  get active(): boolean {
    return this._phase !== 'idle';
  }

  private inMs() {
    return this._mode === 'fade' ? 0 : VORTEX_IN_MS;
  }

  private outMs() {
    return this._mode === 'fade' ? FADE_MS : VORTEX_OUT_MS;
  }

  private darkMs() {
    return this._mode === 'fade' ? 0 : VORTEX_DARK_MS;
  }

  /**
   * Empieza (o retoma) una transición. Si ya estaba cayendo o a oscuras,
   * sigue; si se estaba desplegando, vuelve a caer desde donde iba.
   */
  begin(mode: SwitchMode): void {
    if (this.cancelled) return;
    this.ready = false;
    if (this._phase === 'idle') {
      this._mode = mode;
      this._phase = 'in';
      this.t = 0;
    } else if (this._phase === 'out') {
      // Vuelve a caer desde la profundidad a la que iba el despliegue.
      const depth = 1 - this.t / this.outMs();
      this._mode = mode;
      this._phase = 'in';
      this.t = this.inMs() * (1 - depth);
    }
    this.settle();
  }

  /** El mundo nuevo ya está puesto (o no hay que esperar más): abre en cuanto se pueda. */
  release(): void {
    this.ready = true;
    this.settle();
  }

  /** Avanza `ms`. */
  tick(ms: number): void {
    if (this._phase === 'idle' || this.cancelled) return;
    this.t += Math.max(0, ms);
    this.settle();
  }

  /** Pasa de fase todo lo que toque con el tiempo que lleva. */
  private settle(): void {
    for (;;) {
      if (this._phase === 'in' && this.t >= this.inMs()) {
        this.t -= this.inMs();
        this._phase = 'dark';
        for (const w of this.darkWaiters.splice(0)) w();
        continue;
      }
      if (this._phase === 'dark' && this.ready && this.t >= this.darkMs()) {
        this._phase = 'out';
        this.t = 0;
        continue;
      }
      if (this._phase === 'out' && this.t >= this.outMs()) {
        this._phase = 'idle';
        this.t = 0;
        for (const w of this.endWaiters.splice(0)) w();
      }
      return;
    }
  }

  /** Resuelve cuando la pantalla está a oscuras (ya, si lo está). */
  whenDark(): Promise<void> {
    if (this._phase === 'dark' || this.cancelled) return Promise.resolve();
    return new Promise((resolve) => this.darkWaiters.push(resolve));
  }

  /** Resuelve cuando termina la transición (ya, si no hay). */
  whenIdle(): Promise<void> {
    if (this._phase === 'idle' || this.cancelled) return Promise.resolve();
    return new Promise((resolve) => this.endWaiters.push(resolve));
  }

  /** Cómo se ve ahora. */
  pose(): VortexPose {
    if (this._phase === 'idle') return IDLE_POSE;
    if (this._mode === 'fade') {
      // El fundido: la foto del mundo de antes, entera hasta que se abre.
      const fade = this._phase === 'out' ? 1 - clamp01(this.t / FADE_MS) : 1;
      return { ...IDLE_POSE, fade };
    }
    if (this._phase === 'in') return vortexPose(easeIn(clamp01(this.t / VORTEX_IN_MS)), 1);
    if (this._phase === 'dark') return vortexPose(1, 1);
    // Despliegue: el giro sigue en el mismo sentido hasta quedar quieto.
    return vortexPose(1 - easeOut(clamp01(this.t / VORTEX_OUT_MS)), -1);
  }

  /** El juego se destruye: nadie se queda esperando. */
  cancel(): void {
    this.cancelled = true;
    this._phase = 'idle';
    for (const w of [...this.darkWaiters.splice(0), ...this.endWaiters.splice(0)]) w();
  }
}
