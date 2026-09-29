import type { WorldEvent } from '@boia/engine';
import type { AchievementTrigger } from '@boia/contracts';
import type { Notice } from '@boia/engine/ui';
import {
  type AchievementDefinition,
  type BoiaRepository,
  type ProgressApi,
  isStoreError,
} from '@boia/store';
import type { WorldConfig } from '@boia/world';

/**
 * Logros del juego (T21, REQ-IDE-024…027): un solo sistema de LOGROS/PROGRESO
 * sobre el libro de `@boia/store`. El juego manda señales (una boia, una
 * isla, un secreto, un minuto a bordo, la Fiestera rescatada…); cada señal
 * deja su huella en el progreso (por id de lugar, así sobrevive a recargar y
 * a cambiar de mundo) y concede los logros del catálogo cuya condición ya se
 * cumple. El catálogo es el del repositorio (la lista base de REQ-IDE-025,
 * `muestra`), también los secretos; el repositorio concede cada logro una
 * sola vez y el premio lo pone la definición. Puntos y monedas salen del
 * libro por separado (REQ-IDE-027).
 */

type Repo = Pick<BoiaRepository, 'progress' | 'content'>;

export type AchievementSignal =
  | { trigger: 'find_buoy'; objectId: string }
  | { trigger: 'visit_island'; objectId: string }
  | { trigger: 'collect_objects'; objectId: string; category: string }
  /** s jugados desde la última señal. */
  | { trigger: 'time_played'; seconds: number }
  | { trigger: 'rescue_character'; character: string }
  | { trigger: 'deliver_character'; character: string }
  | { trigger: 'complete_circuit'; circuit: string }
  | { trigger: 'buy_ticket'; eventId: string };

/**
 * Nombres de los disparadores del mundo que no son los del catálogo: el
 * mapa llama `find_boia` a lo que el catálogo llama `find_buoy`.
 */
export const WORLD_TRIGGER_ALIASES: Readonly<Record<string, AchievementTrigger>> = {
  find_boia: 'find_buoy',
};

/** Contador de segundos a bordo (sólo con la pestaña a la vista). */
export const TIME_PLAYED_COUNTER = 'tiempo-jugado-s';
/** Cada cuánto se apunta el tiempo jugado. muestra */
export const TIME_PLAYED_TICK_S = 15;

/** Claves de progreso de cada huella, por id de lugar (nunca coordenadas). */
const KEY = {
  buoy: 'boia:',
  island: 'isla:',
  object: (category: string) => `objeto:${category}:`,
} as const;

/** Lo que el juego lleva contado, para las condiciones con número. */
export interface AchievementFacts {
  buoys: number;
  islands: number;
  /** Objetos recogidos o encontrados, por categoría (`secreto`…). */
  objects: Record<string, number>;
  seconds: number;
}

/** La señal de logro de un evento del mundo, o null. */
export function signalFromWorldEvent(e: WorldEvent, world: WorldConfig): AchievementSignal | null {
  if (e.type !== 'achievement') return null;
  const trigger = WORLD_TRIGGER_ALIASES[e.trigger] ?? e.trigger;
  switch (trigger) {
    case 'find_buoy':
      return { trigger, objectId: e.objectId };
    case 'visit_island':
      return { trigger, objectId: e.objectId };
    case 'collect_objects': {
      const o = world.objects.find((x) => x.identity.id === e.objectId);
      return { trigger, objectId: e.objectId, category: o?.identity.category ?? 'objeto' };
    }
    default:
      return null;
  }
}

export async function achievementFacts(progress: ProgressApi): Promise<AchievementFacts> {
  const keys = (await progress.discoveries()).map((d) => d.key);
  const objects: Record<string, number> = {};
  for (const k of keys) {
    const m = /^objeto:([^:]+):/.exec(k);
    if (m) objects[m[1]!] = (objects[m[1]!] ?? 0) + 1;
  }
  return {
    buoys: keys.filter((k) => k.startsWith(KEY.buoy)).length,
    islands: keys.filter((k) => k.startsWith(KEY.island)).length,
    objects,
    seconds: await progress.counter(TIME_PLAYED_COUNTER),
  };
}

const param = (def: AchievementDefinition, key: string) =>
  (def.triggerParams as Record<string, unknown>)[key];
const count = (def: AchievementDefinition, fallback = 1) => {
  const v = param(def, 'count');
  return typeof v === 'number' && v > 0 ? v : fallback;
};

/**
 * Cuánto lleva y cuánto pide una condición con número (X/6 boies, 3 islas,
 * minutos…); null si la condición no se cuenta.
 */
export function achievementGoal(
  def: AchievementDefinition,
  facts: AchievementFacts,
): { have: number; need: number; unit: 'veces' | 'minutos' } | null {
  switch (def.trigger) {
    case 'find_buoy':
      return { have: facts.buoys, need: count(def), unit: 'veces' };
    case 'visit_island':
      return { have: facts.islands, need: count(def), unit: 'veces' };
    case 'collect_objects': {
      const cat = param(def, 'category');
      const have =
        typeof cat === 'string'
          ? (facts.objects[cat] ?? 0)
          : Object.values(facts.objects).reduce((a, b) => a + b, 0);
      return { have, need: count(def), unit: 'veces' };
    }
    case 'time_played': {
      const m = param(def, 'minutes');
      const need = typeof m === 'number' && m > 0 ? m : 1;
      return { have: Math.floor(facts.seconds / 60), need, unit: 'minutos' };
    }
    default:
      return null;
  }
}

/** Si la señal cumple ya la condición del logro (con lo contado hasta ahora). */
export function isDue(
  def: AchievementDefinition,
  signal: AchievementSignal,
  facts: AchievementFacts,
): boolean {
  if (def.trigger !== signal.trigger) return false;
  const goal = achievementGoal(def, facts);
  if (goal) {
    if (signal.trigger === 'collect_objects') {
      const cat = param(def, 'category');
      if (typeof cat === 'string' && cat !== signal.category) return false;
    }
    if (signal.trigger === 'time_played') return facts.seconds >= goal.need * 60;
    return goal.have >= goal.need;
  }
  const want = (key: string, got: string) => {
    const v = param(def, key);
    return typeof v !== 'string' || v === got;
  };
  switch (signal.trigger) {
    case 'rescue_character':
    case 'deliver_character':
      return want('character', signal.character);
    case 'complete_circuit':
      return want('circuit', signal.circuit);
    case 'buy_ticket':
      return true;
    default:
      return false;
  }
}

/** Deja la huella de la señal en el progreso (idempotente por id de lugar). */
async function record(progress: ProgressApi, s: AchievementSignal): Promise<void> {
  switch (s.trigger) {
    case 'find_buoy':
      await progress.discover(`${KEY.buoy}${s.objectId}`);
      break;
    case 'visit_island':
      await progress.discover(`${KEY.island}${s.objectId}`);
      break;
    case 'collect_objects':
      await progress.discover(`${KEY.object(s.category)}${s.objectId}`);
      break;
    case 'time_played':
      if (s.seconds > 0) await progress.increment(TIME_PLAYED_COUNTER, Math.round(s.seconds));
      break;
    default:
      break;
  }
}

/** Texto del premio de un logro. muestra */
export function achievementBody(def: Pick<AchievementDefinition, 'points' | 'coins'>): string {
  const parts: string[] = [];
  if (def.points > 0) parts.push(`+${def.points} ${def.points === 1 ? 'punto' : 'puntos'}`);
  if (def.coins > 0) parts.push(`+${def.coins} ${def.coins === 1 ? 'moneda' : 'monedas'}`);
  return parts.join(' · ');
}

export function achievementNotice(def: AchievementDefinition): Notice {
  const body = achievementBody(def);
  return {
    id: `logro:${def.id}`,
    kind: 'achievement',
    title: def.title,
    ...(body ? { body } : {}),
  };
}

/**
 * Apunta la señal y concede los logros que ya tocan. Devuelve los avisos de
 * los que se concedieron ahora (un logro ya obtenido no vuelve a avisar).
 */
export async function recordSignal(repo: Repo, signal: AchievementSignal): Promise<Notice[]> {
  await record(repo.progress, signal);
  const defs = (await repo.content.list('achievements')).filter(
    (d) => d.active && d.trigger === signal.trigger,
  );
  if (defs.length === 0) return [];
  const facts = await achievementFacts(repo.progress);
  const out: Notice[] = [];
  for (const def of defs) {
    if (!isDue(def, signal, facts)) continue;
    try {
      const r = await repo.progress.grantAchievement(def.id, { trigger: signal.trigger });
      if (r.granted) out.push(achievementNotice(def));
    } catch (err) {
      // Fuera de fechas o desactivado por el Admin: no se concede y no pasa nada.
      if (!isStoreError(err, 'forbidden')) throw err;
    }
  }
  return out;
}
