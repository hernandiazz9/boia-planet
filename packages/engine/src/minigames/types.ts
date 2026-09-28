/**
 * Tipos compartidos por los minijuegos de INICIAR_MINIJUEGO (REQ-AVE-035…039).
 * La simulación de cada juego es pura (sin DOM): recibe una entrada por paso
 * fijo y devuelve lo que pasó. El anfitrión (`host.ts`) la pinta, la controla
 * con dedo, puntero o teclado y valida el resultado con la sesión local.
 */

export type MinigameId = 'faro' | 'canon';

/** Política de recompensa (REQ-AVE-038). `record_only`: sólo marca personal. */
export type MinigamePolicy = 'once' | 'daily' | 'season' | 'record_only';

export interface RewardRule {
  policy: MinigamePolicy;
  points: number;
  coins: number;
  /** Límites de lo que una partida puede conceder, por si la regla cambia. */
  maxPoints: number;
  maxCoins: number;
}

/** Lo que toda configuración de minijuego lleva. Todo `muestra`. */
export interface BaseConfig {
  /** Versión de reglas y patrones; cambia la validación. */
  version: number;
  /** Objetivo: piratas identificados o tiburones ahuyentados. */
  goal: number;
  timeLimitS: number;
  reward: RewardRule;
}

export type Outcome = 'won' | 'lost';
export type EndReason = 'goal' | 'time' | 'errors' | 'ships' | 'ammo';

export interface Ending {
  outcome: Outcome;
  reason: EndReason;
}

/** Punto en el espacio lógico de la escena: 0..1 en ambos ejes. */
export interface Point {
  x: number;
  y: number;
}

/**
 * Entrada de un paso. `aim` es el punto que señala el dedo o el puntero;
 * `turn` y `lift` (-1..1) vienen del teclado; `action` es ALARMA o FUEGO y
 * vale sólo en el paso en que se pulsa.
 */
export interface MinigameInput {
  aim?: Point | null;
  turn?: number;
  lift?: number;
  action?: boolean;
}

/** Lo que pasó en un paso, para el sonido, los avisos y las marcas en pantalla. */
export interface SimEvent {
  kind: 'hit' | 'false_alarm' | 'escape' | 'fire' | 'splash' | 'scare' | 'miss' | 'end';
  x?: number;
  y?: number;
}

/** Una línea de estado legible sin audio (REQ-AVE-039). */
export interface StatusItem {
  label: string;
  value: string;
}

export interface DrawOptions {
  reducedMotion: boolean;
  /** s de reloj real, sólo para animaciones decorativas. */
  clock: number;
}

export interface MinigameSim {
  /** s simulados de juego (no cuenta la pausa). */
  readonly time: number;
  readonly score: number;
  readonly ended: Ending | null;
  step(dt: number, input: MinigameInput): SimEvent[];
  status(): StatusItem[];
  /** El punto de apuntado actual (para que el teclado parta de él). */
  aim(): Point;
  draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    skin: MinigameSkin,
    o: DrawOptions,
  ): void;
}

export interface MinigameDefinition<C extends BaseConfig = BaseConfig> {
  id: MinigameId;
  title: string;
  /** Texto del panel editorial de la isla. */
  summary: string;
  /** Instrucciones breves, una por línea. */
  instructions: readonly string[];
  /** Texto del botón de acción (ALARMA, FUEGO). */
  actionLabel: string;
  defaults: C;
  create(seed: number, config: C): MinigameSim;
  /**
   * El tiempo mínimo, en ms, en que se puede llegar a `score` con esta
   * semilla y esta configuración. Por debajo, la marca es imposible.
   */
  minPlausibleMs(score: number, seed: number, config: C): number;
  /** Texto del final, por motivo. */
  endText(e: Ending): string;
}

/** Colores y trazo de un mundo para los minijuegos. */
export interface MinigameSkin {
  /** `clay`: contornos gruesos (Arcilla); `wash`: aguadas suaves (Acuarela). */
  style: 'plain' | 'clay' | 'wash';
  night: string;
  sea: string;
  wave: string;
  crest: string;
  land: string;
  ink: string;
  beam: string;
  accent: string;
  onAccent: string;
  good: string;
  bad: string;
}
