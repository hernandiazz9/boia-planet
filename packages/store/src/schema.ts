import { z } from 'zod';
import {
  ACHIEVEMENT_SCOPES,
  ACHIEVEMENT_TRIGGERS,
  BOTTLE_STATUSES,
  LEDGER_KINDS,
  PURCHASE_STATUSES,
  albumSchema,
  artistSchema,
  discountSchema,
  eventSchema,
  homeBlockSchema,
  photoSchema,
  promotionSchema,
} from '@boia/contracts';
import { STABLE_KEY, STABLE_KEY_MAX } from './ids';

/**
 * Forma del documento que se guarda en el navegador. Espeja las tablas de T06
 * (supabase/migrations) en camelCase, con dos reglas de allí que aquí se
 * mantienen:
 *
 * - El libro (`ledger`) es la única fuente de puntos, monedas, logros, sellos
 *   y cosméticos. Los saldos NO se guardan: se derivan al leer. Un campo de
 *   saldo metido a mano en el almacenamiento se ignora.
 * - Los ids del libro los elige el repositorio a partir del origen de la
 *   concesión (`ids.ts`), no quien la pide.
 *
 * Subir `SCHEMA_VERSION` exige añadir la migración en `migrations.ts` con su
 * prueba.
 */
export const SCHEMA_VERSION = 2;

const iso = z.string().min(1);
const stableKey = z.string().max(STABLE_KEY_MAX).regex(STABLE_KEY);
const finite = z.number().finite();

/** Valor JSON (preferencias, datos de misión, metadatos). */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export const jsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    finite,
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ]),
);
const jsonObject = z.record(z.string(), jsonValue);

// ---------------------------------------------------------------------------
// Identidad y Carnet

export const identitySchema = z.object({
  id: z.string().min(1),
  /** En la demo sólo hay invitados: sin email (D-20). `member` llega con Supabase. */
  kind: z.literal('guest'),
  createdAt: iso,
});
export type Identity = z.infer<typeof identitySchema>;

export const carnetAnswerSchema = z.object({
  answer: z.string().min(1),
  questionVersion: z.number().int().positive(),
  updatedAt: iso,
});

/** Máximo de la foto del Carnet guardada como data URL (≈ 225 KB de imagen). */
export const AVATAR_IMAGE_MAX = 300_000;

export const carnetSchema = z.object({
  userId: z.string().min(1),
  nickname: z.string().min(1),
  /** Avatar neutro elegido de una lista (clave de arte). */
  avatarKey: z.string().nullable(),
  /** Foto del dispositivo como data URL `data:image/…`, ya reducida por quien la sube. */
  avatarImage: z.string().max(AVATAR_IMAGE_MAX).nullable(),
  /** «Miembro de BOIA desde…»: lo fija el repositorio al crear el Carnet. */
  memberSince: iso,
  answers: z.record(z.string(), carnetAnswerSchema),
  version: z.number().int().positive(),
  updatedAt: iso,
});
export type CarnetRecord = z.infer<typeof carnetSchema>;

// ---------------------------------------------------------------------------
// Libro de transacciones (ledger_transactions)

export const ledgerEntrySchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    kind: z.enum(LEDGER_KINDS),
    pointsDelta: z.number().int(),
    coinsDelta: z.number().int(),
    /** Temporada; en la demo, el mundo activo al conceder (D-20). */
    seasonId: z.string().nullable(),
    achievementId: z.string().optional(),
    eventId: z.string().optional(),
    purchaseId: z.string().optional(),
    cosmeticKey: z.string().optional(),
    compensatesId: z.string().optional(),
    /** Origen legible: id de lugar u objeto, `minigame:faro`… */
    sourceRef: z.string().optional(),
    reason: z.string().optional(),
    createdBy: z.string().optional(),
    metadata: jsonObject,
    createdAt: iso,
  })
  .superRefine((e, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    const nonNegative = e.pointsDelta >= 0 && e.coinsDelta >= 0;
    switch (e.kind) {
      case 'world_reward':
        if (!e.sourceRef || !nonNegative || e.pointsDelta + e.coinsDelta <= 0)
          fail('world_reward: sourceRef y un premio positivo');
        break;
      case 'achievement':
        if (!e.achievementId || !nonNegative) fail('achievement: achievementId y premio >= 0');
        break;
      case 'stamp':
        if (!e.eventId || !e.purchaseId || !nonNegative) fail('stamp: evento y compra');
        break;
      case 'cosmetic':
        // Gastar monedas nunca reduce puntos (REQ-IDE-027).
        if (!e.cosmeticKey || e.pointsDelta !== 0 || e.coinsDelta > 0)
          fail('cosmetic: cosmeticKey, 0 puntos y monedas <= 0');
        break;
      case 'adjustment':
        if (!e.reason || !e.createdBy) fail('adjustment: motivo y autor');
        break;
      case 'compensation':
        if (!e.compensatesId || !e.reason) fail('compensation: transacción compensada y motivo');
        break;
    }
    if (e.kind !== 'compensation' && e.compensatesId) fail('compensatesId sólo en compensation');
  });
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

// ---------------------------------------------------------------------------
// Compras (purchases). En la demo sólo el sandbox (D-20).

export const purchaseSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  eventId: z.string().min(1),
  provider: z.string().min(1),
  providerOrderId: z.string().nullable(),
  status: z.enum(PURCHASE_STATUSES),
  quantity: z.number().int().positive(),
  discountId: z.string().nullable(),
  /** Importe `muestra` en céntimos, si lo hay. */
  amountCents: z.number().int().nonnegative().nullable(),
  confirmedAt: iso.nullable(),
  createdAt: iso,
});
export type Purchase = z.infer<typeof purchaseSchema>;

// ---------------------------------------------------------------------------
// Progreso del jugador que no pasa por el libro

export const discoverySchema = z.object({ at: iso, worldId: z.string().nullable() });
export const missionSchema = z.object({
  id: z.string().min(1),
  /** Paso actual, con el nombre que elija la misión (`rescued`, `delivered`…). */
  step: z.string().min(1),
  /** Datos de la misión. El destino se guarda por id de lugar/mundo, nunca por coordenadas. */
  data: jsonObject,
  worldId: z.string().nullable(),
  startedAt: iso,
  updatedAt: iso,
  completedAt: iso.nullable(),
});
export type MissionState = z.infer<typeof missionSchema>;

export const timeRecordSchema = z.object({
  id: z.string().min(1),
  bestMs: z.number().positive().finite(),
  bestAt: iso,
  attempts: z.number().int().positive(),
});
export type TimeRecord = z.infer<typeof timeRecordSchema>;

/**
 * Logro completado y todavía sin reclamar (D-22, punto 5; T36). Completar no
 * da nada: el premio y su fila del libro llegan al reclamar. Reclamado es
 * tener la fila `achievement` en el libro.
 */
export const achievementCompletionSchema = z.object({
  completedAt: iso,
  /** Versión de la definición al completarlo. */
  version: z.number().int().positive(),
  worldId: z.string().nullable(),
  metadata: jsonObject.default({}),
});
export type AchievementCompletion = z.infer<typeof achievementCompletionSchema>;

export const playerSchema = z.object({
  /** Descubrimientos por clave estable (id de lugar u objeto), no por coordenadas. */
  discoveries: z.record(z.string(), discoverySchema),
  /** Descuentos encontrados por id de descuento (REQ-COM-021). */
  discounts: z.record(z.string(), discoverySchema),
  missions: z.record(z.string(), missionSchema),
  /** Récords locales (circuito, D-09: sólo locales en L1). */
  records: z.record(z.string(), timeRecordSchema),
  /** Contadores (segundos jugados, boies recogidas…). */
  counters: z.record(z.string(), z.number().int().nonnegative()),
  /** Cosmético equipado por ranura. */
  equipped: z.record(z.string(), z.string()),
  /** Preferencias del invitado (aspecto del barco…), REQ-IDE-004 y REQ-IDE-033. */
  prefs: jsonObject,
  /** Logros completados por id de logro (listos o ya reclamados). Desde la v2. */
  achievements: z.record(z.string(), achievementCompletionSchema).default({}),
});
export type PlayerState = z.infer<typeof playerSchema>;

export function emptyPlayer(): PlayerState {
  return {
    discoveries: {},
    discounts: {},
    missions: {},
    records: {},
    counters: {},
    equipped: {},
    prefs: {},
    achievements: {},
  };
}

// ---------------------------------------------------------------------------
// Botellas (bottles, bottle_reads, bottle_reports)

export const bottleSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  seasonId: z.string().nullable(),
  message: z.string().min(1),
  /** Coordenadas de mundo del mapa compartido (D-20): valen en todos los mundos. */
  x: finite,
  y: finite,
  status: z.enum(BOTTLE_STATUSES),
  moderatedBy: z.string().nullable(),
  moderatedAt: iso.nullable(),
  moderationReason: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: iso,
  updatedAt: iso,
});
export type Bottle = z.infer<typeof bottleSchema>;

export const bottleReadSchema = z.object({
  bottleId: z.string().min(1),
  readerId: z.string().min(1),
  readAt: iso,
});
export type BottleRead = z.infer<typeof bottleReadSchema>;

export const bottleReportSchema = z.object({
  id: z.string().min(1),
  bottleId: z.string().min(1),
  reporterId: z.string().min(1),
  reason: z.string().nullable(),
  createdAt: iso,
  resolvedAt: iso.nullable(),
  resolvedBy: z.string().nullable(),
  resolution: z.string().nullable(),
});
export type BottleReport = z.infer<typeof bottleReportSchema>;

// ---------------------------------------------------------------------------
// Contenido: catálogos propios de la tienda de datos

/** Definición de logro (tabla `achievements`, REQ-ADM-021). `id` es la clave estable. */
export const achievementDefinitionSchema = z.object({
  id: stableKey,
  /** Versión de la definición (REQ-ADM-022). */
  version: z.number().int().positive().default(1),
  title: z.string().min(1),
  description: z.string().optional(),
  trigger: z.enum(ACHIEVEMENT_TRIGGERS),
  /** Parámetros de la condición: `{ count: 6, category: 'boia' }`, `{ minutes: 5 }`… */
  triggerParams: jsonObject.default({}),
  scope: z.enum(ACHIEVEMENT_SCOPES).default('global'),
  seasonId: z.string().optional(),
  points: z.number().int().nonnegative(),
  coins: z.number().int().nonnegative(),
  /**
   * Cosmético que concede al reclamarlo (REQ-IDE-031): bandera, estela,
   * color o, en la ranura `ship`, un barco de estilo (REQ-IDE-052).
   */
  cosmeticKey: z.string().optional(),
  /** Insignia del Carnet que concede al reclamarlo (REQ-IDE-052). */
  badgeKey: stableKey.optional(),
  iconKey: z.string().optional(),
  /** Oculto: cuenta en el total, pero se ve como «???» hasta completarlo. */
  secret: z.boolean().default(false),
  /** Desactivar sólo evita concesiones nuevas (REQ-ADM-022). */
  active: z.boolean().default(true),
  startsAt: z.iso.datetime({ offset: true }).optional(),
  endsAt: z.iso.datetime({ offset: true }).optional(),
  sample: z.boolean().default(false),
});
export type AchievementDefinition = z.infer<typeof achievementDefinitionSchema>;

/**
 * Ranuras de cosmético. `ship` es un barco de estilo (`assetKey`: el id del
 * estilo de `art/barco/estilos/`): mientras exista como cosmético, el estilo
 * está bloqueado hasta tenerlo (por un logro o, con precio, en una tienda).
 */
export const COSMETIC_SLOTS = ['flag', 'accessory', 'skin', 'wake', 'ship'] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

/** Cosmético del barco (REQ-IDE-030 a REQ-IDE-032): nunca cambia cómo navega. */
export const cosmeticSchema = z.object({
  id: stableKey,
  name: z.string().min(1),
  slot: z.enum(COSMETIC_SLOTS),
  /** Precio en monedas; null: sólo se consigue con un logro. */
  priceCoins: z.number().int().nonnegative().nullable(),
  /** Clave de arte (la resuelve el motor). */
  assetKey: z.string().optional(),
  active: z.boolean().default(true),
  sample: z.boolean().default(false),
});
export type Cosmetic = z.infer<typeof cosmeticSchema>;

/** Rango lúdico derivado de los puntos (REQ-IDE-028). */
export const rankSchema = z.object({
  id: stableKey,
  name: z.string().min(1),
  minPoints: z.number().int().nonnegative(),
  sample: z.boolean().default(false),
});
export type Rank = z.infer<typeof rankSchema>;

/**
 * Colecciones de contenido con id: muestra en código + cambios del Admin
 * guardados en el navegador. El orden de la lista es el de la muestra salvo
 * que el Admin lo cambie (`reorder`).
 */
export const ENTITY_SCHEMAS = {
  events: eventSchema,
  homeBlocks: homeBlockSchema,
  artists: artistSchema,
  albums: albumSchema,
  photos: photoSchema,
  promotions: promotionSchema,
  discounts: discountSchema,
  achievements: achievementDefinitionSchema,
  cosmetics: cosmeticSchema,
  ranks: rankSchema,
} as const;

export type EntityArea = keyof typeof ENTITY_SCHEMAS;
export const ENTITY_AREAS = Object.keys(ENTITY_SCHEMAS) as EntityArea[];
export type AreaItem<A extends EntityArea> = z.infer<(typeof ENTITY_SCHEMAS)[A]>;
export type AreaInput<A extends EntityArea> = z.input<(typeof ENTITY_SCHEMAS)[A]>;

/**
 * Cambio compartido de un lugar del mapa común (D-20): se aplica en todos los
 * mundos. Se direcciona por id estable de lugar u objeto; nunca se duplican
 * posiciones por mundo.
 */
export const placePatchSchema = z.object({
  x: finite.optional(),
  y: finite.optional(),
  /** Parámetros de comportamiento; forma decidida por @boia/world. */
  params: jsonObject.optional(),
  enabled: z.boolean().optional(),
});
export type PlacePatch = z.infer<typeof placePatchSchema>;

/** Cambio de la piel de un lugar en un mundo concreto: (mundo, lugar). */
export const skinPatchSchema = z.object({
  name: z.string().min(1).optional(),
  texts: z.record(z.string(), z.string()).optional(),
  asset: z.string().min(1).optional(),
  /** Ocultar el lugar en este mundo sólo con esta marca explícita. */
  hidden: z.boolean().optional(),
});
export type SkinPatch = z.infer<typeof skinPatchSchema>;

/** Áreas que se pueden restablecer a la muestra una a una. */
export const CONTENT_AREAS = [
  ...ENTITY_AREAS,
  'places',
  'skins',
  'texts',
  'activeWorld',
] as const satisfies readonly string[];
export type ContentArea = (typeof CONTENT_AREAS)[number];

const itemOverrideSchema = z.object({
  /** Valor completo que sustituye al de la muestra (o uno nuevo). */
  value: z.unknown(),
  /** Papelera: oculto, pero recuperable con `restore` (REQ-ADM-030). */
  deleted: z.boolean(),
  at: iso,
});
export type ItemOverride = z.infer<typeof itemOverrideSchema>;

export const contentOverridesSchema = z.object({
  items: z.record(z.string(), z.record(z.string(), itemOverrideSchema)),
  order: z.record(z.string(), z.array(z.string())),
  places: z.record(z.string(), placePatchSchema),
  skins: z.record(z.string(), z.record(z.string(), skinPatchSchema)),
  texts: z.record(z.string(), z.string()),
  /** Sin la clave: el de la muestra. `null`: el que diga el registro de mundos. */
  activeWorldId: z.string().nullable().optional(),
});
export type ContentOverrides = z.infer<typeof contentOverridesSchema>;

export function emptyOverrides(): ContentOverrides {
  return { items: {}, order: {}, places: {}, skins: {}, texts: {} };
}

/** Auditoría local, sólo de añadir (REQ-ARQ-009): autor, fecha, motivo, antes y después. */
export const auditEntrySchema = z.object({
  id: z.string().min(1),
  at: iso,
  actor: z.string().min(1),
  area: z.string().min(1),
  action: z.enum([
    'upsert',
    'delete',
    'restore',
    'reorder',
    'reset',
    'set',
    'moderate',
    'resolve_report',
    'compensate',
  ]),
  targetId: z.string().nullable(),
  before: z.unknown(),
  after: z.unknown(),
  reason: z.string().nullable(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

// ---------------------------------------------------------------------------
// Documento completo

export interface StoreDoc {
  schemaVersion: number;
  identity: Identity | null;
  carnets: Record<string, CarnetRecord>;
  players: Record<string, PlayerState>;
  ledger: LedgerEntry[];
  purchases: Purchase[];
  bottles: Bottle[];
  bottleReads: BottleRead[];
  bottleReports: BottleReport[];
  content: ContentOverrides;
  audit: AuditEntry[];
}

export function emptyDoc(version: number = SCHEMA_VERSION): StoreDoc {
  return {
    schemaVersion: version,
    identity: null,
    carnets: {},
    players: {},
    ledger: [],
    purchases: [],
    bottles: [],
    bottleReads: [],
    bottleReports: [],
    content: emptyOverrides(),
    audit: [],
  };
}

function arrayOf<T>(schema: z.ZodType<T>, raw: unknown, dropped: { n: number }): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const item of raw) {
    const r = schema.safeParse(item);
    if (r.success) out.push(r.data);
    else dropped.n++;
  }
  return out;
}

function recordOf<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  dropped: { n: number },
): Record<string, T> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const r = schema.safeParse(v);
    if (r.success) out[k] = r.data;
    else dropped.n++;
  }
  return out;
}

function objectOf(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

/**
 * Lee un documento ya migrado a `SCHEMA_VERSION` quedándose con lo válido,
 * pieza a pieza: una fila rota (o alterada a mano) se descarta sin perder el
 * resto. Todo campo desconocido (p. ej. un saldo escrito a mano) se ignora.
 */
export function sanitizeDoc(
  raw: unknown,
  version: number = SCHEMA_VERSION,
): { doc: StoreDoc; dropped: number } {
  const src = objectOf(raw);
  const dropped = { n: 0 };
  const identity = identitySchema.safeParse(src.identity);
  const players = recordOf(playerSchema, src.players, dropped);
  const content = objectOf(src.content);
  const items: ContentOverrides['items'] = {};
  for (const [area, byId] of Object.entries(objectOf(content.items))) {
    items[area] = recordOf(itemOverrideSchema, byId, dropped);
  }
  const skins: ContentOverrides['skins'] = {};
  for (const [world, byPlace] of Object.entries(objectOf(content.skins))) {
    skins[world] = recordOf(skinPatchSchema, byPlace, dropped);
  }
  const order = recordOf(z.array(z.string()), content.order, dropped);
  const active = z.string().nullable().optional().safeParse(content.activeWorldId);
  const overrides: ContentOverrides = {
    items,
    order,
    places: recordOf(placePatchSchema, content.places, dropped),
    skins,
    texts: recordOf(z.string(), content.texts, dropped),
  };
  if (active.success && active.data !== undefined) overrides.activeWorldId = active.data;
  const doc: StoreDoc = {
    schemaVersion: version,
    identity: identity.success ? identity.data : null,
    carnets: recordOf(carnetSchema, src.carnets, dropped),
    players,
    ledger: arrayOf(ledgerEntrySchema, src.ledger, dropped),
    purchases: arrayOf(purchaseSchema, src.purchases, dropped),
    bottles: arrayOf(bottleSchema, src.bottles, dropped),
    bottleReads: arrayOf(bottleReadSchema, src.bottleReads, dropped),
    bottleReports: arrayOf(bottleReportSchema, src.bottleReports, dropped),
    content: overrides,
    audit: arrayOf(auditEntrySchema, src.audit, dropped),
  };
  return { doc, dropped: dropped.n };
}
