import { ACHIEVEMENT_TRIGGERS, type AchievementTrigger, CARNET_QUESTIONS } from '@boia/contracts';
import type { JsonValue } from '@boia/store';

/**
 * Condiciones de logro que el Admin puede elegir (REQ-ADM-021): el catálogo
 * cerrado de disparadores de `@boia/contracts` y, para cada uno, sus
 * parámetros con su tipo y su rango seguro, los mismos que lee el juego
 * (`app/juego/achievements.ts`). Sin constructor de lógica libre: sólo se
 * elige un disparador y se rellenan sus casillas.
 */

export const TRIGGER_LABELS: Record<AchievementTrigger, string> = {
  visit_island: 'Visitar islas',
  find_buoy: 'Encontrar boies',
  collect_objects: 'Recoger objetos',
  complete_circuit: 'Completar el circuito',
  time_played: 'Tiempo jugado',
  buy_ticket: 'Comprar entradas',
  rescue_character: 'Rescatar a un personaje',
  deliver_character: 'Entregar a un personaje',
  win_minigame: 'Ganar un minijuego',
  complete_encounter: 'Terminar un encuentro',
  read_bottle: 'Leer botellas',
  throw_bottle: 'Echar una botella',
  create_carnet: 'Hacerse el Carnet',
  answer_question: 'Contestar preguntas del Carnet',
  visit_world: 'Navegar en mundos',
};

/** De dónde salen las opciones de un parámetro de elección. */
export type ChoiceSource = 'circuits' | 'games' | 'worlds';

export type TriggerParam =
  | { key: string; label: string; kind: 'int'; min: number; max: number; optional?: boolean }
  | { key: string; label: string; kind: 'text'; optional?: boolean }
  | { key: string; label: string; kind: 'choice'; source: ChoiceSource; optional?: boolean };

const count = (max: number, label = 'Cuántas veces'): TriggerParam => ({
  key: 'count',
  label,
  kind: 'int',
  min: 1,
  max,
});

/** Parámetros de cada disparador, con su rango (REQ-ADM-013). */
export const TRIGGER_PARAMS: Record<AchievementTrigger, readonly TriggerParam[]> = {
  visit_island: [count(50, 'Islas distintas')],
  find_buoy: [count(50, 'Boies distintas')],
  collect_objects: [
    { key: 'category', label: 'Categoría (vacío: cualquiera)', kind: 'text', optional: true },
    count(500, 'Objetos'),
  ],
  complete_circuit: [
    {
      key: 'circuit',
      label: 'Circuito (vacío: cualquiera)',
      kind: 'choice',
      source: 'circuits',
      optional: true,
    },
    {
      key: 'maxMs',
      label: 'Tiempo máximo (ms, opcional)',
      kind: 'int',
      min: 1000,
      max: 3_600_000,
      optional: true,
    },
    { key: 'via', label: 'Pasando por el arco (opcional)', kind: 'text', optional: true },
  ],
  time_played: [{ key: 'minutes', label: 'Minutos', kind: 'int', min: 1, max: 1440 }],
  buy_ticket: [count(50, 'Entradas de eventos distintos')],
  rescue_character: [
    { key: 'character', label: 'Personaje (vacío: cualquiera)', kind: 'text', optional: true },
    { ...count(20), optional: true },
  ],
  deliver_character: [
    { key: 'character', label: 'Personaje (vacío: cualquiera)', kind: 'text', optional: true },
    { ...count(20), optional: true },
  ],
  win_minigame: [
    {
      key: 'game',
      label: 'Minijuego (vacío: cualquiera)',
      kind: 'choice',
      source: 'games',
      optional: true,
    },
    { ...count(20, 'Minijuegos distintos'), optional: true },
  ],
  complete_encounter: [
    { key: 'encounter', label: 'Encuentro (vacío: cualquiera)', kind: 'text', optional: true },
    { ...count(20), optional: true },
  ],
  read_bottle: [count(100, 'Botellas')],
  throw_bottle: [count(100, 'Botellas')],
  create_carnet: [],
  answer_question: [count(CARNET_QUESTIONS.length, 'Preguntas')],
  visit_world: [
    {
      key: 'world',
      label: 'Mundo (vacío: cualquiera)',
      kind: 'choice',
      source: 'worlds',
      optional: true,
    },
    { ...count(20, 'Mundos distintos'), optional: true },
  ],
};

/** Minijuegos registrados (T23). */
export const MINIGAMES = ['faro', 'canon'] as const;

export interface TriggerChoices {
  circuits: readonly string[];
  games: readonly string[];
  worlds: readonly string[];
}

const TEXT_PARAM = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * Motivo por el que unos parámetros no valen para ese disparador, o null:
 * claves desconocidas, enteros fuera de rango, textos que no son claves y
 * opciones que no existen (un circuito o un mundo borrados).
 */
export function triggerParamsProblem(
  trigger: string,
  params: Record<string, JsonValue>,
  choices: TriggerChoices,
): string | null {
  if (!(ACHIEVEMENT_TRIGGERS as readonly string[]).includes(trigger)) {
    return `condición desconocida: ${trigger}`;
  }
  const spec = TRIGGER_PARAMS[trigger as AchievementTrigger];
  for (const key of Object.keys(params)) {
    if (!spec.some((p) => p.key === key)) return `«${key}» no es un parámetro de esta condición`;
  }
  for (const p of spec) {
    const v = params[p.key];
    if (v === undefined || v === null || v === '') {
      if (!p.optional) return `falta «${p.label}»`;
      continue;
    }
    if (p.kind === 'int') {
      if (typeof v !== 'number' || !Number.isInteger(v)) return `«${p.label}» es un número entero`;
      if (v < p.min || v > p.max) {
        return `«${p.label}» fuera de rango (${v}; entre ${p.min} y ${p.max})`;
      }
    } else if (p.kind === 'text') {
      if (typeof v !== 'string' || !TEXT_PARAM.test(v)) {
        return `«${p.label}»: minúsculas, cifras y guiones`;
      }
    } else if (typeof v !== 'string' || !choices[p.source].includes(v)) {
      return `«${p.label}»: «${String(v)}» no existe`;
    }
  }
  return null;
}

/** Parámetros del formulario (todo texto) → parámetros guardados, sin los vacíos. */
export function paramsFromForm(
  trigger: AchievementTrigger,
  form: Readonly<Record<string, string>>,
): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  for (const p of TRIGGER_PARAMS[trigger]) {
    const raw = (form[p.key] ?? '').trim();
    if (!raw) continue;
    out[p.key] = p.kind === 'int' && /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
  }
  return out;
}
