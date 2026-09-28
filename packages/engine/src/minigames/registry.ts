import { canon } from './canon';
import { faro } from './faro';
import type { BaseConfig, MinigameDefinition, MinigameId } from './types';

/**
 * Registro de INICIAR_MINIJUEGO (REQ-MUN-026, D-20): `start_minigame` con
 * `gameId` `faro` o `canon`. Se pasa al motor como `runtime.minigames` para
 * que el evento `minigame` llegue con `available: true`.
 */
export const MINIGAME_REGISTRY: ReadonlyMap<string, MinigameDefinition<BaseConfig>> = new Map<
  string,
  MinigameDefinition<BaseConfig>
>([
  ['faro', faro as unknown as MinigameDefinition<BaseConfig>],
  ['canon', canon as unknown as MinigameDefinition<BaseConfig>],
]);

export const MINIGAME_IDS: readonly MinigameId[] = ['faro', 'canon'];

export function isMinigameId(v: unknown): v is MinigameId {
  return typeof v === 'string' && (MINIGAME_IDS as readonly string[]).includes(v);
}

export function minigame(id: string): MinigameDefinition<BaseConfig> | null {
  return MINIGAME_REGISTRY.get(id) ?? null;
}
