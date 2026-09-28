import type { LedgerKind } from '@boia/contracts';

/**
 * UUID v4. `crypto.randomUUID` sólo existe en contextos seguros: en el móvil
 * de pruebas, abriendo la demo por la IP de la red local (http://192.168…),
 * no está, pero `getRandomValues` sí.
 */
export function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') {
    try {
      return c.randomUUID();
    } catch {
      // contexto no seguro: se sigue con getRandomValues
    }
  }
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Claves estables (descubrimientos, `sourceRef` de recompensas, ids de logro,
 * cosmético, misión, récord, contador…): minúsculas, cifras y separadores
 * `-_:./`, sin separadores al principio, al final ni dobles. Son las mismas
 * que usa el mundo (ids de lugar de mundos/arcilla/mapa.json: `puerto`,
 * `costa_oeste`).
 */
export const STABLE_KEY = /^[a-z0-9]+([-_:./][a-z0-9]+)*$/;
export const STABLE_KEY_MAX = 120;

export function isStableKey(k: unknown): k is string {
  return typeof k === 'string' && k.length <= STABLE_KEY_MAX && STABLE_KEY.test(k);
}

/**
 * Política de una recompensa del mundo:
 * - `once`: una vez para siempre por `sourceRef`;
 * - `daily`: una vez por día natural en `Europe/Madrid`;
 * - `season`: una vez por temporada (en la demo, por mundo: D-20).
 */
export type RewardPolicy = 'once' | 'daily' | 'season';

export const REWARD_TIME_ZONE = 'Europe/Madrid';

/** Día natural `YYYY-MM-DD` en la zona de BOIA. */
export function dayKey(now: Date, timeZone = REWARD_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Id estable de una transacción del libro. Lo decide el repositorio, nunca la
 * interfaz (en Supabase, el servidor: T06). Repetir la misma concesión da el
 * mismo id, y el libro sólo acepta un id una vez.
 */
export function ledgerId(kind: LedgerKind, key: string): string {
  return `${kind}:${key}`;
}

/** Clave de periodo de una recompensa según su política. */
export function rewardKey(
  sourceRef: string,
  policy: RewardPolicy,
  ctx: { now: Date; seasonId: string | null },
): string {
  if (policy === 'daily') return `${sourceRef}@${dayKey(ctx.now)}`;
  if (policy === 'season') return `${sourceRef}@season:${ctx.seasonId ?? 'none'}`;
  return sourceRef;
}
