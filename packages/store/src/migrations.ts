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

/**
 * Precios `muestra` que vivían en `apps/web/lib/ticketing/pricing.ts` antes
 * de pasar al evento (T42). Copia fija: una migración no lee el código vivo.
 */
export const V3_EVENT_PRICES_CENTS: Readonly<Record<string, number>> = {
  'ev-all-day-primavera': 2500,
  'ev-noche-mayo': 1500,
};

/** Clave de serie a partir del formato de texto libre de antes («Noche» → `noche`). */
function seriesKey(text: string): string | undefined {
  const key = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return key || undefined;
}

/**
 * Un evento guardado por el Admin antes de T42, llevado a la forma nueva.
 * `format` era texto libre: «All Day…» pasa a `all_day` y el resto a
 * `satelite` con su texto como serie. El estado lo había puesto el Admin a
 * mano: sigue a mano (`manual`), así nada cambia solo al migrar. El precio de
 * la tabla vieja se copia al evento.
 */
function eventV2ToV3(value: unknown): unknown {
  if (!isObject(value)) return value;
  const e: Record<string, unknown> = { ...value };
  if (e.format !== 'all_day' && e.format !== 'satelite') {
    const text = typeof e.format === 'string' ? e.format : '';
    if (/all\s*day/i.test(text)) e.format = 'all_day';
    else {
      e.format = 'satelite';
      const series = seriesKey(text);
      if (series && e.series === undefined) e.series = series;
    }
  }
  e.stateSource ??= 'manual';
  const id = typeof e.id === 'string' ? e.id : '';
  if (e.priceCents === undefined && V3_EVENT_PRICES_CENTS[id] !== undefined) {
    e.priceCents = V3_EVENT_PRICES_CENTS[id];
  }
  return e;
}

/**
 * v2 → v3 (T42): el evento gana formato cerrado (All Day o satélite), serie,
 * cartel, actividades, precio, apertura de venta y estado por fechas. Sólo
 * se tocan los eventos que el Admin guardó; la foto gana `selection`, que
 * por defecto es falso y no necesita migración.
 */
function v2ToV3(doc: Record<string, unknown>): Record<string, unknown> {
  if (!isObject(doc.content) || !isObject(doc.content.items)) return doc;
  const items = doc.content.items;
  if (!isObject(items.events)) return doc;
  const events: Record<string, unknown> = {};
  for (const [id, o] of Object.entries(items.events)) {
    events[id] = isObject(o) ? { ...o, value: eventV2ToV3(o.value) } : o;
  }
  return { ...doc, content: { ...doc.content, items: { ...items, events } } };
}

export const MIGRATIONS: readonly Migration[] = [
  { from: 1, to: 2, name: 'logros que se reclaman (T36)', up: v1ToV2 },
  { from: 2, to: 3, name: 'eventos con formato, precio y estado por fechas (T42)', up: v2ToV3 },
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
