import { configHash } from './rng';
import {
  type MinigameRewardSink,
  type RewardOutcome,
  grantMinigameReward,
  readBest,
  saveBest,
} from './rewards';
import type { LocalSessionAuthority, MinigameResult, MinigameSession, Validation } from './session';
import type { KeyValueStore } from '../ui/storage';
import type {
  BaseConfig,
  Ending,
  MinigameDefinition,
  MinigameInput,
  MinigameSim,
  SimEvent,
} from './types';

/**
 * Ciclo de una partida sin DOM: instrucciones → juego ⇄ pausa → final.
 * Abre la sesión al empezar, avanza la simulación con paso fijo, pausa (y
 * al ocultar la pestaña invalida la marca), y al acabar liquida la sesión y
 * pide el premio. El anfitrión (`host.ts`) sólo pinta y traduce la entrada.
 */

export type Phase = 'intro' | 'playing' | 'paused' | 'ended';
export type PauseReason = 'user' | 'hidden';

export const STEP_S = 1 / 60;
/** Tras un tirón (pestaña lenta), no se simulan más de estos s de golpe. */
const MAX_FRAME_S = 0.25;

export interface EndSummary {
  ending: Ending;
  score: number;
  result: MinigameResult;
  validation: Validation;
  reward: RewardOutcome;
  best: number | null;
  newBest: boolean;
}

export interface ControllerOptions<C extends BaseConfig> {
  def: MinigameDefinition<C>;
  config?: C;
  authority: LocalSessionAuthority;
  sink?: MinigameRewardSink | null;
  records?: KeyValueStore | null;
  /** La configuración vigente al liquidar (si cambió, la marca no vale). */
  currentConfig?: () => C;
}

export class MinigameController<C extends BaseConfig = BaseConfig> {
  phase: Phase = 'intro';
  pauseReason: PauseReason | null = null;
  sim: MinigameSim | null = null;
  session: MinigameSession | null = null;
  summary: EndSummary | null = null;
  /** Promesa del final (liquidación y premio) de la partida en curso. */
  settling: Promise<EndSummary> | null = null;
  readonly def: MinigameDefinition<C>;
  readonly config: C;
  private acc = 0;

  constructor(private readonly o: ControllerOptions<C>) {
    this.def = o.def;
    this.config = o.config ?? o.def.defaults;
  }

  /** Empieza (o vuelve a empezar) con una sesión y una semilla nuevas. */
  start(): void {
    if (this.phase === 'playing' || this.phase === 'paused') this.abandon();
    this.session = this.o.authority.open(this.def, this.config);
    this.sim = this.def.create(this.session.seed, this.config);
    this.summary = null;
    this.settling = null;
    this.pauseReason = null;
    this.acc = 0;
    this.phase = 'playing';
  }

  /** Avanza `dt` s de reloj con paso fijo. `action` cuenta sólo en el primer paso. */
  tick(dt: number, input: MinigameInput): SimEvent[] {
    if (this.phase !== 'playing' || !this.sim) return [];
    this.acc += Math.min(Math.max(0, dt), MAX_FRAME_S);
    const out: SimEvent[] = [];
    let first = true;
    // La acción de un toque cuenta aunque el fotograma sea más corto que un paso.
    if (input.action && this.acc < STEP_S) this.acc = STEP_S;
    while (this.acc >= STEP_S && !this.sim.ended) {
      this.acc -= STEP_S;
      out.push(...this.sim.step(STEP_S, first ? input : { ...input, action: false }));
      first = false;
    }
    if (this.sim.ended) this.finish();
    return out;
  }

  pause(reason: PauseReason): void {
    if (this.phase !== 'playing' && this.phase !== 'paused') return;
    // Ocultar la pestaña invalida la marca (REQ-AVE-038); la partida puede seguir.
    if (reason === 'hidden' && this.session) this.o.authority.invalidate(this.session.id, 'hidden');
    if (this.phase === 'paused' && this.pauseReason === 'hidden') return;
    this.phase = 'paused';
    this.pauseReason = reason;
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.pauseReason = null;
    this.acc = 0;
  }

  /** ¿Sigue contando para premio la partida en curso? */
  counts(): boolean {
    return !!this.session && this.o.authority.isValid(this.session.id);
  }

  /** Salir a mitad: la sesión queda abandonada. */
  abandon(): void {
    if (this.session && (this.phase === 'playing' || this.phase === 'paused')) {
      this.o.authority.invalidate(this.session.id, 'abandoned');
    }
    this.phase = 'intro';
    this.sim = null;
  }

  private finish(): void {
    const sim = this.sim!;
    const session = this.session!;
    const ending = sim.ended!;
    this.phase = 'ended';
    this.pauseReason = null;
    const result: MinigameResult = {
      sessionId: session.id,
      gameId: this.def.id,
      version: this.config.version,
      seed: session.seed,
      configHash: configHash(this.config),
      outcome: ending.outcome,
      reason: ending.reason,
      score: sim.score,
      elapsedMs: sim.time * 1000,
    };
    this.settling = this.settle(result, ending);
  }

  private async settle(result: MinigameResult, ending: Ending): Promise<EndSummary> {
    const validation = this.o.authority.settle(result, this.o.currentConfig?.());
    const reward = await grantMinigameReward(this.o.sink, this.config.reward, result, validation);
    const records = this.o.records ?? null;
    const newBest = validation.valid ? saveBest(records, this.def.id, result.score) : false;
    const summary: EndSummary = {
      ending,
      score: result.score,
      result,
      validation,
      reward,
      best: readBest(records, this.def.id),
      newBest,
    };
    this.summary = summary;
    return summary;
  }
}
