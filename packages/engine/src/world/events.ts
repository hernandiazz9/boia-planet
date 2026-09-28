import type { CollisionMode, DialogueCue, RewardFrequency } from '@boia/world';

/**
 * Lo que pasa en el mundo, en el orden en que pasa. El motor no abre paneles
 * ni concede saldos: emite estos eventos y la aplicación decide (panel HTML,
 * aviso, servidor…). Todos llevan el id del objeto que los produce.
 */
export type WorldEvent =
  | { type: 'proximity_enter'; objectId: string }
  | { type: 'proximity_exit'; objectId: string }
  | { type: 'contact'; objectId: string; mode?: CollisionMode }
  | {
      type: 'effect';
      objectId: string;
      effect: 'slow' | 'boost' | 'brake';
      /** Multiplicador de la velocidad máxima (brake: de la velocidad actual). */
      factor: number;
      duration: number;
    }
  | { type: 'collected'; objectId: string }
  | { type: 'appeared'; objectId: string; x: number; y: number }
  | { type: 'disappeared'; objectId: string }
  | {
      type: 'reward';
      objectId: string;
      kind: string;
      amount: number;
      ref?: string;
      frequency: RewardFrequency;
      /** Clave de idempotencia para el servidor (D-09); null si es repetible. */
      key: string | null;
    }
  | {
      type: 'dialogue_line';
      objectId: string;
      index: number;
      count: number;
      text: string;
      cue?: DialogueCue;
    }
  | { type: 'dialogue_reaction'; objectId: string; text: string }
  | { type: 'dialogue_end'; objectId: string; reason: 'completed' | 'skipped' | 'interrupted' }
  | { type: 'content_open'; objectId: string; target: string; ref?: string }
  | { type: 'content_close'; objectId: string; target: string; ref?: string }
  | { type: 'ticket'; objectId: string; eventId: string }
  | { type: 'checkpoint'; objectId: string; circuitId?: string; order: number }
  | { type: 'teleport'; objectId: string; x: number; y: number }
  | { type: 'achievement'; objectId: string; trigger: string; amount: number }
  | { type: 'minigame'; objectId: string; gameId?: string; available: boolean };

export type WorldEventType = WorldEvent['type'];
