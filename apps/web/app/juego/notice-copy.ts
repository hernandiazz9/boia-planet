import type { WorldEvent } from '@boia/engine';
import type { DiscoveryTarget, Notice, TargetFunction } from '@boia/engine/ui';

/**
 * Textos de los avisos y del mapa ampliado (borrador, pendiente Álvaro). Van
 * aquí, junto al juego, como el resto del copy de /juego (ver T04).
 */

/** Nombre de cada logro del catálogo de triggers; los que falten, genérico. */
const ACHIEVEMENTS: Record<string, string> = {
  find_boia: 'Primera boia encontrada',
  visit_island: 'Isla visitada',
};

const REWARDS: Record<string, (n: number) => string> = {
  coins: (n) => `+${n} ${n === 1 ? 'moneda' : 'monedas'}`,
  points: (n) => `+${n} ${n === 1 ? 'punto' : 'puntos'}`,
  discount: () => 'Descuento encontrado',
  item: () => 'Objeto encontrado',
  achievement: () => 'Logro conseguido',
};

export const FUNCTION_LABEL: Record<TargetFunction, string> = {
  event: 'Evento',
  tickets: 'Entradas',
  guide: 'Guía',
  reward: 'Premio',
  teleport: 'Atajo',
  minigame: 'Minijuego',
};

export function discoveryNotice(t: DiscoveryTarget): Notice {
  const what = t.kind === 'island' ? 'Isla descubierta' : 'Descubierto';
  const fns = t.functions.map((f) => FUNCTION_LABEL[f]).join(' · ');
  return {
    id: `descubierto:${t.id}`,
    kind: 'discovery',
    title: `${what}: ${t.name}`,
    ...(fns ? { body: fns } : {}),
  };
}

/**
 * El aviso que corresponde a un evento del mundo, o null. Sólo logros y
 * recompensas avisan; guardarlos y contarlos es de T07 (progreso).
 */
export function noticeFromWorldEvent(e: WorldEvent): Notice | null {
  if (e.type === 'achievement') {
    return {
      id: `logro:${e.trigger}:${e.objectId}`,
      kind: 'achievement',
      title: ACHIEVEMENTS[e.trigger] ?? 'Logro conseguido',
    };
  }
  if (e.type === 'reward') {
    const text = REWARDS[e.kind]?.(e.amount) ?? 'Recompensa';
    return {
      // Las repetibles no tienen clave: cada una es un aviso nuevo.
      id: e.key ?? `premio:${e.objectId}:${Math.random().toString(36).slice(2)}`,
      kind: 'reward',
      title: text,
    };
  }
  return null;
}
