import type { RewardFrequency } from '@boia/world';

/**
 * Dónde se recuerda qué recompensas ya se concedieron. En L1 el progreso de
 * invitado es local (REQ-IDE-*) y el servidor vuelve a comprobar con la misma
 * clave (D-09); aquí basta una interfaz con `has`/`add`.
 */
export interface RewardStore {
  has(key: string): boolean;
  add(key: string): void;
}

export class MemoryRewardStore implements RewardStore {
  private readonly keys = new Set<string>();
  has(key: string): boolean {
    return this.keys.has(key);
  }
  add(key: string): void {
    this.keys.add(key);
  }
  get size(): number {
    return this.keys.size;
  }
}

export interface RewardScope {
  seasonId: string;
  sessionId: string;
}

/**
 * Clave de idempotencia de una recompensa según su frecuencia: una vez por
 * cuenta, una por sesión, una por temporada; `null` si es repetible.
 */
export function rewardKey(
  frequency: RewardFrequency,
  objectId: string,
  behaviorIndex: number,
  scope: RewardScope,
): string | null {
  const who = `${objectId}#${behaviorIndex}`;
  switch (frequency) {
    case 'once':
      return `once:${who}`;
    case 'season':
      return `season:${scope.seasonId}:${who}`;
    case 'session':
      return `session:${scope.sessionId}:${who}`;
    case 'repeatable':
      return null;
  }
}
