import { SCHEMA_VERSION } from './schema';

/**
 * Migraciones del documento guardado. Cada una sube exactamente una versión y
 * recibe el documento tal cual estaba guardado (sin validar): tiene que
 * aceptar datos viejos o a medias. Nunca borran progreso (REQ-ARQ-005).
 *
 * Para cambiar la forma del documento: subir `SCHEMA_VERSION` en schema.ts,
 * añadir aquí `{ from: N, to: N + 1, up }` y una prueba con un documento de
 * la versión N.
 */
export interface Migration {
  from: number;
  to: number;
  /** Descripción corta para el registro. */
  name: string;
  up: (doc: Record<string, unknown>) => Record<string, unknown>;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Premio nuevo, sin saldo, para quien ya tenía un logro cuyo premio cambió
 * con el catálogo aprobado (T36, catálogo punto 6): `secretos` pasa a dar el
 * barco Boceto a lápiz. La insignia de `entrada` no hace falta escribirla: se
 * deriva de la definición al leer. Copia fija de lo que decía el catálogo al
 * migrar (una migración no lee el catálogo vivo).
 */
export const V2_NEW_COSMETICS: Readonly<Record<string, string>> = {
  secretos: 'barco-boceto-lapiz',
};

/**
 * v1 → v2 (T36): los logros se reclaman. Todo logro ya concedido en el libro
 * cuenta como completado y reclamado (su fila sigue igual: los saldos no se
 * tocan) y quien tenía `secretos` recibe además su barco, con 0 puntos y 0
 * monedas.
 */
function v1ToV2(doc: Record<string, unknown>): Record<string, unknown> {
  const ledger = Array.isArray(doc.ledger) ? [...(doc.ledger as unknown[])] : [];
  const players: Record<string, unknown> = isObject(doc.players) ? { ...doc.players } : {};
  const compensated = new Set(
    ledger.flatMap((e) =>
      isObject(e) && e.kind === 'compensation' && typeof e.compensatesId === 'string'
        ? [e.compensatesId]
        : [],
    ),
  );
  const ids = new Set(
    ledger.flatMap((e) => (isObject(e) && typeof e.id === 'string' ? [e.id] : [])),
  );
  const completions = new Map<string, Record<string, unknown>>();
  const extra: Record<string, unknown>[] = [];
  for (const e of ledger) {
    if (!isObject(e) || e.kind !== 'achievement') continue;
    const userId = e.userId;
    const achievementId = e.achievementId;
    if (typeof userId !== 'string' || typeof achievementId !== 'string') continue;
    const version = isObject(e.metadata) ? e.metadata.version : undefined;
    const done = completions.get(userId) ?? {};
    done[achievementId] ??= {
      completedAt: e.createdAt,
      version:
        typeof version === 'number' && Number.isInteger(version) && version > 0 ? version : 1,
      worldId: typeof e.seasonId === 'string' ? e.seasonId : null,
      metadata: { migratedFrom: 1 },
    };
    completions.set(userId, done);
    const cosmeticKey = V2_NEW_COSMETICS[achievementId];
    const id = cosmeticKey ? `cosmetic:${cosmeticKey}` : null;
    if (!cosmeticKey || !id || compensated.has(String(e.id)) || ids.has(id)) continue;
    ids.add(id);
    extra.push({
      id,
      userId,
      kind: 'cosmetic',
      pointsDelta: 0,
      coinsDelta: 0,
      seasonId: typeof e.seasonId === 'string' ? e.seasonId : null,
      cosmeticKey,
      sourceRef: `achievement:${achievementId}`,
      metadata: { migratedFrom: 1 },
      createdAt: e.createdAt,
    });
  }
  for (const [userId, done] of completions) {
    const p: Record<string, unknown> = isObject(players[userId])
      ? { ...players[userId] }
      : {
          discoveries: {},
          discounts: {},
          missions: {},
          records: {},
          counters: {},
          equipped: {},
          prefs: {},
        };
    const had = isObject(p.achievements) ? p.achievements : {};
    p.achievements = { ...done, ...had };
    players[userId] = p;
  }
  for (const [userId, p] of Object.entries(players)) {
    if (isObject(p) && !isObject(p.achievements)) players[userId] = { ...p, achievements: {} };
  }
  return { ...doc, players, ledger: [...ledger, ...extra] };
}

export const MIGRATIONS: readonly Migration[] = [
  { from: 1, to: 2, name: 'logros que se reclaman (T36)', up: v1ToV2 },
];

export type MigrationOutcome =
  | { status: 'ok'; doc: Record<string, unknown>; from: number; applied: string[] }
  /** Guardado por una versión más nueva del código: no se toca. */
  | { status: 'newer'; from: number }
  /** No es un documento de la tienda o falta un paso de migración. */
  | { status: 'invalid'; from: number | null; error: string };

/** Versión guardada; un documento sin `schemaVersion` no es de esta tienda. */
export function storedVersion(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const v = (raw as Record<string, unknown>).schemaVersion;
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null;
}

/** Lleva un documento guardado hasta `target` aplicando los pasos en orden. */
export function migrate(
  raw: unknown,
  target: number = SCHEMA_VERSION,
  migrations: readonly Migration[] = MIGRATIONS,
): MigrationOutcome {
  const from = storedVersion(raw);
  if (from === null) return { status: 'invalid', from: null, error: 'sin schemaVersion' };
  if (from > target) return { status: 'newer', from };
  let doc = { ...(raw as Record<string, unknown>) };
  let v = from;
  const applied: string[] = [];
  while (v < target) {
    const step = migrations.find((m) => m.from === v);
    if (!step || step.to !== v + 1) {
      return { status: 'invalid', from, error: `falta la migración ${v} → ${v + 1}` };
    }
    try {
      doc = { ...step.up(doc), schemaVersion: step.to };
    } catch (e) {
      return { status: 'invalid', from, error: `${step.name}: ${String(e)}` };
    }
    applied.push(step.name);
    v = step.to;
  }
  return { status: 'ok', doc, from, applied };
}
