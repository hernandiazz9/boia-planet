import type { AchievementState } from '@boia/contracts';
import { formatRaceTime } from '@boia/engine/circuit';
import type { AchievementDefinition, AchievementProgress, AchievementReward } from '@boia/store';
import {
  type AchievementFacts,
  type AchievementGoal,
  achievementGoal,
} from '../../app/juego/achievements';

/**
 * El panel de logros (T37, D-22 punto 5), sin React: de lo que devuelve
 * `progress.achievements()` y lo contado (`achievementFacts`) sale cada fila
 * tal como se pinta, igual en /mar y en /juego: título (o «???» si es oculto
 * y no se ha completado), barra de progreso, «te queda…», premio y estado
 * (en curso, listo para reclamar, reclamado). Textos `muestra`.
 */

/** Título de un logro oculto sin completar. */
export const HIDDEN_TITLE = '???';
/** Línea de un oculto: no dice qué pide. muestra */
export const HIDDEN_HINT = 'Logro oculto. Sigue explorando…';
/** Línea de un logro listo para reclamar (la del aviso de T36). muestra */
export const READY_HINT = '¡Completado! Reclama tu premio';
export const CLAIMED_HINT = 'Reclamado';
export const CLAIM_LABEL = 'Reclamar';
/** Lo que dura la animación del premio antes de irse sola (ms). muestra */
export const REWARD_MS = 2600;

export interface LogroRow {
  id: string;
  title: string;
  /** Qué pide; null en los ocultos. */
  description: string | null;
  state: AchievementState;
  hidden: boolean;
  /** 0…1; null si no se enseña barra (ocultos). */
  progress: number | null;
  /** «3/7», «2/5 min», «50,2 s»; null si no aplica. */
  count: string | null;
  /** «Te quedan 4 islas», «¡Completado! Reclama tu premio»… */
  hint: string;
  /** El premio en corto: «+30 ★ · +10 🪙 · Barco Pixel art». */
  reward: string;
}

/** Sustantivo de lo que se cuenta, por disparador: [singular, plural]. */
const NOUNS: Partial<Record<AchievementDefinition['trigger'], [string, string]>> = {
  find_buoy: ['boia', 'boies'],
  visit_island: ['isla', 'islas'],
  win_minigame: ['partida ganada', 'partidas ganadas'],
  read_bottle: ['botella', 'botellas'],
  throw_bottle: ['botella', 'botellas'],
  answer_question: ['pregunta', 'preguntas'],
  visit_world: ['mundo', 'mundos'],
  buy_ticket: ['entrada', 'entradas'],
  rescue_character: ['rescate', 'rescates'],
  deliver_character: ['entrega', 'entregas'],
  complete_encounter: ['encuentro', 'encuentros'],
  complete_circuit: ['vuelta', 'vueltas'],
};

function noun(def: AchievementDefinition, n: number): string {
  if (def.trigger === 'collect_objects') {
    const cat = (def.triggerParams as Record<string, unknown>).category;
    const pair: [string, string] =
      cat === 'secreto' ? ['secreto', 'secretos'] : ['objeto', 'objetos'];
    return n === 1 ? pair[0] : pair[1];
  }
  const pair = NOUNS[def.trigger];
  if (!pair) return n === 1 ? 'paso' : 'pasos';
  return n === 1 ? pair[0] : pair[1];
}

/** La descripción como continuación de «Te queda:» (sin punto final). */
const asTask = (d: string) => d.replace(/\.$/, '').replace(/^\p{Lu}/u, (c) => c.toLowerCase());

/** Cuánto le falta a un logro en curso, en una línea. */
export function remainingText(def: AchievementDefinition, goal: AchievementGoal): string {
  if (goal.unit === 'ms') {
    if (goal.have <= 0) return `Te queda una vuelta en menos de ${formatRaceTime(goal.need)}`;
    return `Tu mejor vuelta: ${formatRaceTime(goal.have)} · te quedan ${formatRaceTime(
      goal.have - goal.need,
    )}`;
  }
  const left = Math.max(0, goal.need - goal.have);
  if (goal.unit === 'minutos') {
    return left === 1 ? 'Te queda 1 minuto a bordo' : `Te quedan ${left} minutos a bordo`;
  }
  // Una sola cosa concreta (rescatar, el atajo…): qué hay que hacer.
  if (goal.need === 1 && def.description) return `Te queda: ${asTask(def.description)}`;
  return left === 1 ? `Te queda 1 ${noun(def, 1)}` : `Te quedan ${left} ${noun(def, left)}`;
}

/** Cuánto va, en 0…1 (en `ms`, lo cerca que está la mejor vuelta del tiempo pedido). */
export function goalProgress(goal: AchievementGoal): number {
  if (goal.done) return 1;
  if (goal.unit === 'ms') return goal.have > 0 ? Math.min(1, goal.need / goal.have) : 0;
  return goal.need > 0 ? Math.max(0, Math.min(1, goal.have / goal.need)) : 0;
}

function countText(goal: AchievementGoal): string {
  if (goal.unit === 'ms') return goal.have > 0 ? formatRaceTime(goal.have) : '–';
  const have = Math.min(goal.have, goal.need);
  return `${have}/${goal.need}${goal.unit === 'minutos' ? ' min' : ''}`;
}

/** Nombres de cosméticos por id (del contenido), para el premio. */
export type CosmeticNames = Readonly<Record<string, string>>;

/** El premio en corto: puntos, monedas y lo que dé además. */
export function rewardText(reward: AchievementReward, names: CosmeticNames = {}): string {
  const parts: string[] = [];
  if (reward.points > 0) parts.push(`+${reward.points} ★`);
  if (reward.coins > 0) parts.push(`+${reward.coins} 🪙`);
  const cosmetic = reward.cosmeticKey ? (names[reward.cosmeticKey] ?? reward.cosmeticKey) : null;
  if (reward.kind === 'ship' && cosmetic) parts.push(`Barco ${cosmetic}`);
  else if (reward.kind === 'badge') parts.push('Insignia del Carnet');
  else if (cosmetic) parts.push(cosmetic);
  return parts.join(' · ');
}

const ORDER: Record<AchievementState, number> = { ready: 0, in_progress: 1, claimed: 2 };

/**
 * Las filas del panel, en orden de juego: primero lo que se puede reclamar,
 * luego lo que está en curso (lo más avanzado arriba, los ocultos al final) y
 * abajo lo ya reclamado.
 */
export function logroRows(
  list: readonly AchievementProgress[],
  facts: AchievementFacts,
  names: CosmeticNames = {},
): LogroRow[] {
  const rows = list
    .filter((a) => a.definition.active || a.state !== 'in_progress')
    .map((a): LogroRow => {
      const d = a.definition;
      const reward = rewardText(a.reward, names);
      if (a.hidden) {
        return {
          id: d.id,
          title: HIDDEN_TITLE,
          description: null,
          state: a.state,
          hidden: true,
          progress: null,
          count: null,
          hint: HIDDEN_HINT,
          reward,
        };
      }
      const base = {
        id: d.id,
        title: d.title,
        description: d.description ?? null,
        state: a.state,
        hidden: false,
        reward,
      };
      if (a.state !== 'in_progress') {
        return {
          ...base,
          progress: 1,
          count: null,
          hint: a.state === 'ready' ? READY_HINT : CLAIMED_HINT,
        };
      }
      const goal = achievementGoal(d, facts);
      return {
        ...base,
        progress: goalProgress(goal),
        count: countText(goal),
        hint: remainingText(d, goal),
      };
    });
  return rows
    .map((r, i) => ({ r, i }))
    .sort(
      (a, b) =>
        ORDER[a.r.state] - ORDER[b.r.state] ||
        Number(a.r.hidden) - Number(b.r.hidden) ||
        (b.r.progress ?? 0) - (a.r.progress ?? 0) ||
        a.i - b.i,
    )
    .map(({ r }) => r);
}

/** Cuántos esperan a que se reclamen (el número del icono del HUD). */
export function readyCount(list: readonly Pick<AchievementProgress, 'state'>[]): number {
  return list.filter((a) => a.state === 'ready').length;
}

/** «X de Y logros»: los conseguidos (completados o reclamados) de todos. */
export function obtainedCount(list: readonly Pick<AchievementProgress, 'state'>[]): number {
  return list.filter((a) => a.state !== 'in_progress').length;
}
