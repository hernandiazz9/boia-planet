/**
 * Minijuegos de INICIAR_MINIJUEGO (REQ-AVE-035…039, D-20): Vigilancia del
 * faro (`faro`) y Cañón contra tiburones (`canon`). Se importa como
 * `@boia/engine/minigames`: sin Pixi, para que la capa HTML no arrastre el
 * motor del mar. `MINIGAME_REGISTRY` va al motor como `runtime.minigames`;
 * `mountMinigame` abre la capa sobre el mar.
 */
export * from './types';
export { MINIGAME_IDS, MINIGAME_REGISTRY, isMinigameId, minigame } from './registry';
export {
  FARO_DEFAULTS,
  FaroSim,
  faro,
  faroFleet,
  faroMinPlausibleMs,
  type FaroConfig,
} from './faro';
export {
  CANON_DEFAULTS,
  CanonSim,
  SHARK_PATTERNS,
  canon,
  canonMinPlausibleMs,
  type CanonConfig,
} from './canon';
export {
  INVALID_TEXT,
  LocalSessionAuthority,
  type InvalidReason,
  type MinigameResult,
  type MinigameSession,
  type Validation,
} from './session';
export {
  RECORDS_KEY,
  grantMinigameReward,
  minigameSourceRef,
  policyText,
  readBest,
  rewardText,
  saveBest,
  type MinigameRewardSink,
  type RewardOutcome,
} from './rewards';
export { MinigameController, STEP_S, type EndSummary, type Phase } from './controller';
export { minigameSkin, type WorldLook } from './skin';
export { mountMinigame, pageAuthority, type MountOptions, type MountedMinigame } from './host';
export { configHash } from './rng';
