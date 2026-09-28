import { ledgerEntrySchema, type LedgerEntry } from './schema';

/**
 * Reglas del libro, puras, como las de `private.ledger_prepare` y
 * `private.ledger_apply` de T06: un id entra una vez; una compensación
 * invierte exactamente la original, una sola vez y de la misma cuenta; los
 * saldos (derivados) nunca quedan en negativo. Todo lo demás se deriva.
 */

export interface Balances {
  /** Prestigio: rango y ranking (REQ-IDE-027). Gastar monedas no lo toca. */
  readonly points: number;
  /** Monedas gastables en cosméticos. */
  readonly coins: number;
  /** Puntos por temporada (en la demo, por mundo). */
  readonly seasonPoints: Readonly<Record<string, number>>;
}

export type AppendResult =
  | { ok: true; entry: LedgerEntry }
  | { ok: false; reason: 'duplicate'; existing: LedgerEntry }
  | { ok: false; reason: 'invalid' | 'negative_balance'; message: string };

/** Saldos de una cuenta a partir del libro. Nunca se guardan: se calculan. */
export function deriveBalances(ledger: readonly LedgerEntry[], userId: string): Balances {
  let points = 0;
  let coins = 0;
  const seasonPoints: Record<string, number> = {};
  for (const e of ledger) {
    if (e.userId !== userId) continue;
    points += e.pointsDelta;
    coins += e.coinsDelta;
    if (e.seasonId !== null && e.pointsDelta !== 0) {
      seasonPoints[e.seasonId] = (seasonPoints[e.seasonId] ?? 0) + e.pointsDelta;
    }
  }
  return Object.freeze({ points, coins, seasonPoints: Object.freeze(seasonPoints) });
}

/** Ids de transacción ya compensadas (revocadas). */
export function compensatedIds(ledger: readonly LedgerEntry[]): Set<string> {
  const out = new Set<string>();
  for (const e of ledger)
    if (e.kind === 'compensation' && e.compensatesId) out.add(e.compensatesId);
  return out;
}

/** Transacciones vigentes (no compensadas) de un tipo para una cuenta. */
export function activeEntries(
  ledger: readonly LedgerEntry[],
  userId: string,
  kind: LedgerEntry['kind'],
): LedgerEntry[] {
  const revoked = compensatedIds(ledger);
  return ledger.filter((e) => e.userId === userId && e.kind === kind && !revoked.has(e.id));
}

/**
 * Prepara y comprueba una transacción contra el libro actual. No muta: si
 * vale, devuelve la fila final (una compensación toma sus deltas de la
 * original, como en el servidor).
 */
export function checkAppend(ledger: readonly LedgerEntry[], candidate: LedgerEntry): AppendResult {
  const existing = ledger.find((e) => e.id === candidate.id);
  if (existing) return { ok: false, reason: 'duplicate', existing };

  let entry = candidate;
  if (candidate.kind === 'compensation') {
    const orig = ledger.find((e) => e.id === candidate.compensatesId);
    if (!orig)
      return { ok: false, reason: 'invalid', message: 'la transacción compensada no existe' };
    if (orig.kind === 'compensation')
      return { ok: false, reason: 'invalid', message: 'una compensación no se compensa' };
    if (orig.userId !== candidate.userId)
      return { ok: false, reason: 'invalid', message: 'la compensación es de otra cuenta' };
    if (ledger.some((e) => e.kind === 'compensation' && e.compensatesId === orig.id))
      return { ok: false, reason: 'invalid', message: 'ya compensada' };
    entry = {
      ...candidate,
      pointsDelta: -orig.pointsDelta,
      coinsDelta: -orig.coinsDelta,
      seasonId: orig.seasonId,
    };
  }

  const parsed = ledgerEntrySchema.safeParse(entry);
  if (!parsed.success) {
    return { ok: false, reason: 'invalid', message: parsed.error.issues[0]?.message ?? 'forma' };
  }

  const b = deriveBalances(ledger, entry.userId);
  if (b.points + entry.pointsDelta < 0 || b.coins + entry.coinsDelta < 0) {
    return { ok: false, reason: 'negative_balance', message: 'el saldo quedaría en negativo' };
  }
  return { ok: true, entry: parsed.data };
}

/**
 * Vuelve a pasar un libro guardado por las reglas, en orden, y se queda con
 * lo que las cumple. Así un libro alterado a mano (ids repetidos,
 * compensaciones inventadas, gastos sin saldo) no fabrica saldo.
 */
export function replayLedger(entries: readonly LedgerEntry[]): {
  ledger: LedgerEntry[];
  dropped: number;
} {
  const ledger: LedgerEntry[] = [];
  let dropped = 0;
  for (const e of entries) {
    const r = checkAppend(ledger, e);
    // Una compensación guardada debe coincidir con lo que calcula el libro.
    if (r.ok && r.entry.pointsDelta === e.pointsDelta && r.entry.coinsDelta === e.coinsDelta) {
      ledger.push(r.entry);
    } else dropped++;
  }
  return { ledger, dropped };
}
