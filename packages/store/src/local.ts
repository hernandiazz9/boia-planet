import {
  BOTTLE_MESSAGE_MAX,
  BOTTLE_REPORT_REASON_MAX,
  CARNET_ANSWER_MAX,
  CARNET_QUESTIONS,
  EVENT_STATE_BEHAVIOR,
  NICKNAME_MAX,
  NICKNAME_MIN,
  charLength,
  discountStatus,
  type HomeContent,
} from '@boia/contracts';
import { mergePlacePatch, mergeSkinPatch, rankFor, resolveEntities } from './content';
import { StoreError } from './errors';
import { isStableKey, ledgerId, newId, rewardKey } from './ids';
import {
  activeEntries,
  checkAppend,
  compensatedIds,
  deriveBalances,
  replayLedger,
} from './ledger';
import { MIGRATIONS, migrate, type Migration } from './migrations';
import type {
  AchievementProgress,
  AchievementReward,
  AchievementView,
  AdminApi,
  AdminBottleView,
  AdminOptions,
  BadgeView,
  BoiaRepository,
  BottleApi,
  BottleInput,
  BottleView,
  CarnetApi,
  CarnetInput,
  CarnetView,
  ChangeArea,
  ClaimResult,
  ContentApi,
  FoundDiscount,
  GrantResult,
  IdentityApi,
  OwnedCosmetic,
  ProgressApi,
  PurchaseApi,
  RepositoryChange,
  ShipUnlock,
  StampView,
} from './repository';
import { parseSample, type SampleData, type SampleInput } from './sample';
import {
  AVATAR_IMAGE_MAX,
  COSMETIC_SLOTS,
  CONTENT_AREAS,
  ENTITY_AREAS,
  ENTITY_SCHEMAS,
  SCHEMA_VERSION,
  emptyDoc,
  emptyPlayer,
  jsonValue,
  placePatchSchema,
  sanitizeDoc,
  skinPatchSchema,
  type AchievementDefinition,
  type AreaItem,
  type AuditEntry,
  type Bottle,
  type ContentArea,
  type EntityArea,
  type Identity,
  type JsonValue,
  type LedgerEntry,
  type PlacePatch,
  type PlayerState,
  type SkinPatch,
  type StoreDoc,
} from './schema';
import {
  DocChannel,
  STORAGE_MESSAGES,
  STORE_KEY,
  defaultStorage,
  type StorageIssue,
  type StorageSource,
  type StorageStatus,
} from './storage';

export interface LocalRepositoryOptions {
  /** Almacenamiento: por defecto `localStorage` del navegador; null fuerza memoria. */
  storage?: StorageSource;
  /** Clave del documento (por defecto `boia.store`). */
  key?: string;
  now?: () => Date;
  /** Sustituye partes de la muestra (p. ej. `bottles` con posiciones del motor). */
  sample?: Partial<SampleInput>;
  /** Sólo pruebas: otra versión de esquema y sus migraciones. */
  schemaVersion?: number;
  migrations?: readonly Migration[];
  /**
   * Validaciones que sólo sabe hacer quien conoce el mundo (@boia/world,
   * motor): devuelven el motivo del rechazo o null.
   */
  validate?: {
    bottlePosition?: (pos: { x: number; y: number }) => string | null;
    placePatch?: (placeId: string, patch: PlacePatch) => string | null;
    skinPatch?: (worldId: string, placeId: string, patch: SkinPatch) => string | null;
  };
  /** Autor de los cambios del Admin de la demo. */
  adminActor?: string;
  /** Escuchar cambios de otras pestañas (por defecto, sí). */
  watch?: boolean;
}

export const DEMO_ADMIN_ACTOR = 'admin-demo';

const PURCHASE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/;
const MAX_TIME_MS = 24 * 60 * 60 * 1000;

function clone<T>(v: T): T {
  return structuredClone(v);
}

function invalid(message: string): never {
  throw new StoreError('invalid', message);
}

function requireKey(k: unknown, what: string): string {
  if (!isStableKey(k)) invalid(`${what}: clave no válida (${String(k)})`);
  return k;
}

function nonNegativeInt(n: unknown, what: string): number {
  if (n === undefined) return 0;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) invalid(`${what}: entero >= 0`);
  return n;
}

function finiteNumber(n: unknown, what: string): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) invalid(`${what}: número finito`);
  return n;
}

/** Crea el repositorio local. En la app, mejor `browserRepository()` (uno por pestaña). */
export function createLocalRepository(options: LocalRepositoryOptions = {}): BoiaRepository {
  return new LocalRepository(options);
}

class LocalRepository implements BoiaRepository {
  private readonly channel: DocChannel;
  private readonly now: () => Date;
  private readonly sample: SampleData;
  private readonly version: number;
  private readonly migrations: readonly Migration[];
  private readonly validators: NonNullable<LocalRepositoryOptions['validate']>;
  private readonly actor: string;
  private readonly listeners = new Set<(c: RepositoryChange) => void>();
  private doc: StoreDoc = emptyDoc();
  private rev = 0;
  private loadIssue: StorageIssue | null = null;
  private dropped = 0;

  readonly identity: IdentityApi;
  readonly carnet: CarnetApi;
  readonly progress: ProgressApi;
  readonly purchases: PurchaseApi;
  readonly bottles: BottleApi;
  readonly content: ContentApi;
  readonly admin: AdminApi;

  constructor(opts: LocalRepositoryOptions) {
    this.now = opts.now ?? (() => new Date());
    this.sample = parseSample(opts.sample);
    this.version = opts.schemaVersion ?? SCHEMA_VERSION;
    this.migrations = opts.migrations ?? MIGRATIONS;
    this.validators = opts.validate ?? {};
    this.actor = opts.adminActor ?? DEMO_ADMIN_ACTOR;
    const useDefault = !('storage' in opts);
    this.channel = new DocChannel(
      useDefault ? defaultStorage : opts.storage,
      opts.key ?? STORE_KEY,
    );
    this.load();
    if (opts.watch ?? useDefault) {
      this.channel.watch(() => {
        this.load();
        this.emit(
          ['identity', 'carnet', 'progress', 'purchases', 'bottles', 'content', 'audit'],
          true,
        );
      });
    }
    this.identity = this.identityApi();
    this.carnet = this.carnetApi();
    this.progress = this.progressApi();
    this.purchases = this.purchaseApi();
    this.bottles = this.bottleApi();
    this.content = this.contentApi();
    this.admin = this.adminApi();
  }

  // -------------------------------------------------------------------------
  // Carga, guardado y avisos

  private load(): void {
    this.loadIssue = null;
    this.dropped = 0;
    const raw = this.channel.read();
    if (raw === null) {
      this.doc = emptyDoc(this.version);
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.startOver(raw, 'corrupt');
      return;
    }
    const m = migrate(parsed, this.version, this.migrations);
    if (m.status === 'newer') {
      // No se toca lo que guardó una versión más nueva: esta visita va en memoria.
      this.channel.toMemory('newer_schema');
      this.doc = emptyDoc(this.version);
      return;
    }
    if (m.status === 'invalid') {
      this.startOver(raw, m.from === null ? 'corrupt' : 'migration_failed');
      return;
    }
    const { doc, dropped } = sanitizeDoc(m.doc, this.version);
    const replay = replayLedger(doc.ledger);
    doc.ledger = replay.ledger;
    this.doc = doc;
    this.dropped = dropped + replay.dropped;
    if (m.applied.length > 0) this.persist();
  }

  private startOver(raw: string, issue: StorageIssue): void {
    this.channel.backup(raw);
    this.loadIssue = issue;
    this.doc = emptyDoc(this.version);
    this.persist();
  }

  private persist(): boolean {
    const before = this.channel.persistence;
    this.channel.write(JSON.stringify(this.doc));
    return before !== this.channel.persistence;
  }

  private emit(areas: ChangeArea[], external = false): void {
    this.rev++;
    const change: RepositoryChange = { areas, revision: this.rev, external };
    for (const l of [...this.listeners]) {
      try {
        l(change);
      } catch {
        // un oyente roto no rompe a los demás
      }
    }
  }

  /**
   * Cambia el documento de forma atómica: trabaja sobre una copia y sólo la
   * adopta si `fn` no lanza. `skip()` marca que no hubo cambio (repetición
   * idempotente): ni se guarda ni se avisa.
   */
  private mutate<T>(areas: ChangeArea[], fn: (draft: StoreDoc, skip: () => void) => T): T {
    const draft = clone(this.doc);
    let skipped = false;
    const result = fn(draft, () => {
      skipped = true;
    });
    if (skipped) return result;
    this.doc = draft;
    const wentToMemory = this.persist();
    this.emit(wentToMemory ? [...areas, 'storage'] : areas);
    return result;
  }

  // Funciones flecha: se pueden pasar sueltas (p. ej. a useSyncExternalStore).
  readonly status = (): StorageStatus => {
    const issue = this.channel.issue ?? this.loadIssue;
    return {
      backend: 'local',
      persistence: this.channel.persistence,
      issue,
      schemaVersion: this.version,
      droppedOnLoad: this.dropped,
      message: issue ? STORAGE_MESSAGES[issue] : null,
    };
  };

  readonly revision = (): number => this.rev;

  readonly subscribe = (listener: (change: RepositoryChange) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // -------------------------------------------------------------------------
  // Utilidades sobre el documento

  private iso(): string {
    return this.now().toISOString();
  }

  private ensureIdentity(draft: StoreDoc): Identity {
    if (!draft.identity) draft.identity = { id: newId(), kind: 'guest', createdAt: this.iso() };
    return draft.identity;
  }

  private player(draft: StoreDoc, userId: string): PlayerState {
    const p = draft.players[userId] ?? emptyPlayer();
    draft.players[userId] = p;
    return p;
  }

  private resolved<A extends EntityArea>(area: A, doc: StoreDoc = this.doc): AreaItem<A>[] {
    return resolveEntities(
      area,
      this.sample[area] as unknown as readonly AreaItem<A>[],
      doc.content.items[area],
      doc.content.order[area],
    );
  }

  private activeWorld(doc: StoreDoc = this.doc): string | null {
    return doc.content.activeWorldId !== undefined
      ? doc.content.activeWorldId
      : this.sample.activeWorldId;
  }

  private append(draft: StoreDoc, entry: LedgerEntry): GrantResult {
    const r = checkAppend(draft.ledger, entry);
    if (r.ok) {
      draft.ledger.push(r.entry);
      return { granted: true, entry: clone(r.entry) };
    }
    if (r.reason === 'duplicate')
      return { granted: false, reason: 'duplicate', entry: clone(r.existing) };
    if (r.reason === 'negative_balance') throw new StoreError('insufficient_coins', r.message);
    return invalid(r.message);
  }

  private baseEntry(
    userId: string,
    fields: Partial<LedgerEntry> & Pick<LedgerEntry, 'id' | 'kind'>,
  ): LedgerEntry {
    return {
      userId,
      pointsDelta: 0,
      coinsDelta: 0,
      seasonId: this.activeWorld(),
      metadata: {},
      createdAt: this.iso(),
      ...fields,
    };
  }

  private audit(
    draft: StoreDoc,
    entry: Omit<AuditEntry, 'id' | 'at' | 'actor' | 'reason'>,
    opts?: AdminOptions,
  ): void {
    draft.audit.push({
      id: newId(),
      at: this.iso(),
      actor: this.actor,
      reason: opts?.reason ?? null,
      ...entry,
      before: entry.before === undefined ? null : clone(entry.before),
      after: entry.after === undefined ? null : clone(entry.after),
    });
  }

  private allBottles(doc: StoreDoc = this.doc): Bottle[] {
    const local = new Map(doc.bottles.map((b) => [b.id, b]));
    const out: Bottle[] = [];
    for (const s of this.sample.bottles) {
      out.push(
        local.get(s.id) ?? {
          id: s.id,
          userId: s.userId,
          seasonId: null,
          message: s.message,
          x: s.x,
          y: s.y,
          status: 'active',
          moderatedBy: null,
          moderatedAt: null,
          moderationReason: null,
          version: 1,
          createdAt: s.createdAt,
          updatedAt: s.createdAt,
        },
      );
      local.delete(s.id);
    }
    return [...out, ...local.values()];
  }

  private nicknameOf(userId: string, doc: StoreDoc = this.doc): string | null {
    return (
      doc.carnets[userId]?.nickname ??
      this.sample.crew.find((c) => c.userId === userId)?.nickname ??
      null
    );
  }

  private bottleView(b: Bottle, doc: StoreDoc = this.doc): BottleView {
    const me = doc.identity?.id ?? null;
    return {
      id: b.id,
      message: b.message,
      x: b.x,
      y: b.y,
      status: b.status,
      authorId: b.userId,
      authorNickname: this.nicknameOf(b.userId, doc),
      isMine: me !== null && b.userId === me,
      isSample: this.sample.bottles.some((s) => s.id === b.id),
      read: me !== null && doc.bottleReads.some((r) => r.bottleId === b.id && r.readerId === me),
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }

  private upsertLocalBottle(draft: StoreDoc, b: Bottle): void {
    const i = draft.bottles.findIndex((x) => x.id === b.id);
    if (i >= 0) draft.bottles[i] = b;
    else draft.bottles.push(b);
  }

  private stampViews(doc: StoreDoc, userId: string): StampView[] {
    const events = this.resolved('events', doc);
    return activeEntries(doc.ledger, userId, 'stamp').map((e) => ({
      eventId: e.eventId ?? '',
      eventName: events.find((ev) => ev.id === e.eventId)?.name ?? null,
      purchaseId: e.purchaseId ?? null,
      grantedAt: e.createdAt,
    }));
  }

  // -------------------------------------------------------------------------
  // Logros que se reclaman (T36, D-22 punto 5)

  /** Premio de un logro según su definición y el catálogo de cosméticos. */
  private rewardOf(def: AchievementDefinition, doc: StoreDoc = this.doc): AchievementReward {
    const cosmetic = def.cosmeticKey
      ? this.resolved('cosmetics', doc).find((c) => c.id === def.cosmeticKey)
      : undefined;
    const shipStyle = cosmetic?.slot === 'ship' ? (cosmetic.assetKey ?? cosmetic.id) : null;
    return {
      kind: def.badgeKey ? 'badge' : shipStyle ? 'ship' : def.cosmeticKey ? 'cosmetic' : 'coins',
      points: def.points,
      coins: def.coins,
      badgeKey: def.badgeKey ?? null,
      cosmeticKey: def.cosmeticKey ?? null,
      shipStyle,
    };
  }

  /** La fila del libro de un logro de esta cuenta (vigente o compensada). */
  private achievementEntry(doc: StoreDoc, userId: string, id: string): LedgerEntry | undefined {
    const txId = ledgerId('achievement', id);
    return doc.ledger.find((e) => e.id === txId && e.userId === userId);
  }

  private achievementView(
    def: AchievementDefinition,
    doc: StoreDoc,
    userId: string | null,
    revoked: ReadonlySet<string> = compensatedIds(doc.ledger),
  ): AchievementProgress {
    const entry = userId ? this.achievementEntry(doc, userId, def.id) : undefined;
    const completion = userId ? doc.players[userId]?.achievements[def.id] : undefined;
    const claimed = !!entry && !revoked.has(entry.id);
    // Una fila compensada por el Admin (REQ-ADM-028) no vuelve a estar lista.
    const state = claimed ? 'claimed' : !entry && completion ? 'ready' : 'in_progress';
    const obtained = state !== 'in_progress';
    const hidden = def.secret && !obtained;
    const definition = clone(def);
    if (hidden) {
      definition.title = '???';
      delete definition.description;
      delete definition.iconKey;
    }
    return {
      definition,
      state,
      hidden,
      obtained,
      obtainedAt: obtained ? (completion?.completedAt ?? entry?.createdAt ?? null) : null,
      claimedAt: claimed && entry ? entry.createdAt : null,
      reward: this.rewardOf(def, doc),
    };
  }

  private badgeViews(doc: StoreDoc, userId: string): BadgeView[] {
    const defs = this.resolved('achievements', doc);
    return activeEntries(doc.ledger, userId, 'achievement').flatMap((e) => {
      const def = defs.find((d) => d.id === e.achievementId);
      const stored = e.metadata.badge;
      const key = typeof stored === 'string' ? stored : def?.badgeKey;
      if (!key) return [];
      return [
        {
          key,
          achievementId: e.achievementId ?? '',
          title: def?.title ?? key,
          iconKey: def?.iconKey ?? null,
          claimedAt: e.createdAt,
        },
      ];
    });
  }

  private carnetView(userId: string, doc: StoreDoc = this.doc): CarnetView | null {
    const me = doc.identity?.id ?? null;
    const ranks = this.resolved('ranks', doc);
    const defs = this.resolved('achievements', doc);
    const own = doc.carnets[userId];
    const answersFrom = (get: (qid: string) => { answer: string; version: number } | undefined) =>
      CARNET_QUESTIONS.flatMap((q) => {
        const a = get(q.id);
        return a
          ? [{ questionId: q.id, question: q.prompt, questionVersion: a.version, answer: a.answer }]
          : [];
      });
    if (own) {
      const points = deriveBalances(doc.ledger, userId).points;
      const achievements: AchievementView[] = activeEntries(doc.ledger, userId, 'achievement').map(
        (e) => {
          const d = defs.find((x) => x.id === e.achievementId);
          return {
            id: e.achievementId ?? '',
            title: d?.title ?? e.achievementId ?? '',
            description: d?.description ?? null,
            iconKey: d?.iconKey ?? null,
            obtainedAt: e.createdAt,
          };
        },
      );
      return {
        userId,
        nickname: own.nickname,
        avatarKey: own.avatarKey,
        avatarImage: own.avatarImage,
        memberSince: own.memberSince,
        answers: answersFrom((qid) => {
          const a = own.answers[qid];
          return a && { answer: a.answer, version: a.questionVersion };
        }),
        points,
        rank: rankFor(points, ranks),
        achievements,
        badges: this.badgeViews(doc, userId),
        stamps: this.stampViews(doc, userId),
        cosmeticIds: activeEntries(doc.ledger, userId, 'cosmetic').map((e) => e.cosmeticKey ?? ''),
        equipped: { ...(doc.players[userId]?.equipped ?? {}) },
        isMine: userId === me,
        isSample: false,
      };
    }
    const crew = this.sample.crew.find((c) => c.userId === userId);
    if (!crew) return null;
    const events = this.resolved('events', doc);
    return {
      userId,
      nickname: crew.nickname,
      avatarKey: crew.avatarKey,
      avatarImage: null,
      memberSince: crew.memberSince,
      answers: answersFrom((qid) => {
        const a = crew.answers[qid];
        const q = CARNET_QUESTIONS.find((x) => x.id === qid);
        return a && q ? { answer: a, version: q.version } : undefined;
      }),
      points: crew.showcase.points,
      rank: rankFor(crew.showcase.points, ranks),
      achievements: crew.showcase.achievementIds.flatMap((id) => {
        const d = defs.find((x) => x.id === id);
        return d
          ? [
              {
                id,
                title: d.title,
                description: d.description ?? null,
                iconKey: d.iconKey ?? null,
                obtainedAt: crew.memberSince,
              },
            ]
          : [];
      }),
      badges: crew.showcase.achievementIds.flatMap((id) => {
        const d = defs.find((x) => x.id === id);
        return d?.badgeKey
          ? [
              {
                key: d.badgeKey,
                achievementId: id,
                title: d.title,
                iconKey: d.iconKey ?? null,
                claimedAt: null,
              },
            ]
          : [];
      }),
      stamps: crew.showcase.stampEventIds.map((eventId) => ({
        eventId,
        eventName: events.find((e) => e.id === eventId)?.name ?? null,
        purchaseId: null,
        grantedAt: null,
      })),
      cosmeticIds: [...crew.showcase.cosmeticIds],
      equipped: {},
      isMine: false,
      isSample: true,
    };
  }

  private checkNickname(draft: StoreDoc, raw: unknown, userId: string): string {
    if (typeof raw !== 'string') invalid('apodo: texto');
    const nickname = raw.trim().replace(/\s+/g, ' ');
    const len = charLength(nickname);
    if (len < NICKNAME_MIN || len > NICKNAME_MAX)
      invalid(`apodo: entre ${NICKNAME_MIN} y ${NICKNAME_MAX} caracteres`);
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(nickname)) invalid('apodo: caracteres de control');
    const lower = nickname.toLocaleLowerCase('es');
    const taken =
      this.sample.crew.some((c) => c.nickname.toLocaleLowerCase('es') === lower) ||
      Object.values(draft.carnets).some(
        (c) => c.userId !== userId && c.nickname.toLocaleLowerCase('es') === lower,
      );
    if (taken) throw new StoreError('conflict', 'apodo en uso');
    return nickname;
  }

  private checkAvatar(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    if (typeof v !== 'string' || !v.startsWith('data:image/') || v.length > AVATAR_IMAGE_MAX)
      invalid(`foto: data URL de imagen de hasta ${AVATAR_IMAGE_MAX} caracteres`);
    return v;
  }

  private checkBottleMessage(raw: unknown): string {
    if (typeof raw !== 'string') invalid('botella: texto');
    const message = raw.trim();
    const len = charLength(message);
    if (len < 1 || len > BOTTLE_MESSAGE_MAX)
      invalid(`botella: entre 1 y ${BOTTLE_MESSAGE_MAX} caracteres`);
    return message;
  }

  private checkBottlePosition(x: unknown, y: unknown): { x: number; y: number } {
    const pos = { x: finiteNumber(x, 'botella x'), y: finiteNumber(y, 'botella y') };
    const why = this.validators.bottlePosition?.(pos) ?? null;
    if (why) invalid(`botella: ${why}`);
    return pos;
  }

  // -------------------------------------------------------------------------
  // Identidad

  private identityApi(): IdentityApi {
    return {
      current: async () => (this.doc.identity ? clone(this.doc.identity) : null),
      ensure: async () => {
        if (this.doc.identity) return clone(this.doc.identity);
        return this.mutate(['identity'], (d) => clone(this.ensureIdentity(d)));
      },
      reset: async () =>
        this.mutate(['identity', 'carnet', 'progress', 'purchases', 'bottles'], (d) => {
          const old = d.identity?.id;
          if (old) {
            delete d.carnets[old];
            delete d.players[old];
            d.ledger = d.ledger.filter((e) => e.userId !== old);
            d.purchases = d.purchases.filter((p) => p.userId !== old);
            d.bottleReads = d.bottleReads.filter((r) => r.readerId !== old);
            d.bottleReports = d.bottleReports.filter((r) => r.reporterId !== old);
            for (const b of d.bottles) {
              if (b.userId === old && b.status === 'active') {
                b.status = 'retired';
                b.updatedAt = this.iso();
              }
            }
          }
          d.identity = null;
          return clone(this.ensureIdentity(d));
        }),
    };
  }

  // -------------------------------------------------------------------------
  // Carnet

  private carnetApi(): CarnetApi {
    return {
      questions: async () => CARNET_QUESTIONS,
      mine: async () => {
        const id = this.doc.identity?.id;
        return id && this.doc.carnets[id] ? this.carnetView(id) : null;
      },
      get: async (userId) => this.carnetView(userId),
      create: async (input: CarnetInput) =>
        this.mutate(['identity', 'carnet'], (d) => {
          const me = this.ensureIdentity(d);
          if (d.carnets[me.id]) throw new StoreError('conflict', 'ya hay Carnet');
          const at = this.iso();
          d.carnets[me.id] = {
            userId: me.id,
            nickname: this.checkNickname(d, input.nickname, me.id),
            avatarKey: input.avatarKey ?? null,
            avatarImage: this.checkAvatar(input.avatarImage),
            memberSince: at,
            answers: {},
            version: 1,
            updatedAt: at,
          };
          return this.carnetView(me.id, d) as CarnetView;
        }),
      update: async (patch) =>
        this.mutate(['carnet'], (d) => {
          const me = d.identity;
          const c = me && d.carnets[me.id];
          if (!me || !c) throw new StoreError('no_carnet', 'no hay Carnet');
          if (patch.nickname !== undefined)
            c.nickname = this.checkNickname(d, patch.nickname, me.id);
          if (patch.avatarKey !== undefined) c.avatarKey = patch.avatarKey;
          if (patch.avatarImage !== undefined) c.avatarImage = this.checkAvatar(patch.avatarImage);
          c.version++;
          c.updatedAt = this.iso();
          return this.carnetView(me.id, d) as CarnetView;
        }),
      answer: async (questionId, answer) =>
        this.mutate(['carnet'], (d) => {
          const me = d.identity;
          const c = me && d.carnets[me.id];
          if (!me || !c) throw new StoreError('no_carnet', 'no hay Carnet');
          const q = CARNET_QUESTIONS.find((x) => x.id === questionId);
          if (!q) throw new StoreError('not_found', `pregunta ${questionId}`);
          const text = (answer ?? '').trim();
          if (text === '') delete c.answers[q.id];
          else {
            if (charLength(text) > CARNET_ANSWER_MAX)
              invalid(`respuesta: hasta ${CARNET_ANSWER_MAX} caracteres`);
            c.answers[q.id] = { answer: text, questionVersion: q.version, updatedAt: this.iso() };
          }
          c.version++;
          c.updatedAt = this.iso();
          return this.carnetView(me.id, d) as CarnetView;
        }),
    };
  }

  // -------------------------------------------------------------------------
  // Progreso

  private progressApi(): ProgressApi {
    const myId = () => this.doc.identity?.id ?? null;
    const grant = (build: (d: StoreDoc, me: Identity) => GrantResult) =>
      this.mutate(['identity', 'progress'], (d, skip) => {
        const hadIdentity = d.identity !== null;
        const me = this.ensureIdentity(d);
        const r = build(d, me);
        if (!r.granted && hadIdentity) skip();
        return r;
      });

    const foundDiscount = (
      d: StoreDoc,
      id: string,
      rec: { at: string; worldId: string | null },
    ) => {
      const discount = this.resolved('discounts', d).find((x) => x.id === id);
      return discount
        ? {
            discount,
            status: discountStatus(discount, this.now()),
            foundAt: rec.at,
            worldId: rec.worldId,
          }
        : null;
    };

    return {
      balances: async () => {
        const id = myId();
        return deriveBalances(id ? this.doc.ledger : [], id ?? '');
      },
      ledger: async () => {
        const id = myId();
        return id ? clone(this.doc.ledger.filter((e) => e.userId === id)) : [];
      },
      grantWorldReward: async (input) => {
        const sourceRef = requireKey(input.sourceRef, 'recompensa');
        const points = nonNegativeInt(input.points, 'puntos');
        const coins = nonNegativeInt(input.coins, 'monedas');
        if (points + coins <= 0) invalid('recompensa: puntos o monedas > 0');
        const policy = input.policy ?? 'once';
        const metadata = input.metadata ?? {};
        if (!jsonValue.safeParse(metadata).success) invalid('recompensa: metadata JSON');
        return grant((d, me) => {
          const seasonId = input.seasonId !== undefined ? input.seasonId : this.activeWorld(d);
          const key = rewardKey(sourceRef, policy, { now: this.now(), seasonId });
          return this.append(
            d,
            this.baseEntry(me.id, {
              id: ledgerId('world_reward', key),
              kind: 'world_reward',
              pointsDelta: points,
              coinsDelta: coins,
              seasonId,
              sourceRef,
              metadata: { ...metadata, policy },
            }),
          );
        });
      },
      completeAchievement: async (achievementId, metadata = {}) => {
        if (!jsonValue.safeParse(metadata).success) invalid('logro: metadata JSON');
        return this.mutate(['identity', 'progress'], (d, skip) => {
          const had = d.identity !== null;
          const me = this.ensureIdentity(d);
          const def = this.resolved('achievements', d).find((a) => a.id === achievementId);
          if (!def) throw new StoreError('not_found', `logro ${achievementId}`);
          const p = this.player(d, me.id);
          if (p.achievements[def.id] || this.achievementEntry(d, me.id, def.id)) {
            if (had) skip();
            return { completed: false, achievement: this.achievementView(def, d, me.id) };
          }
          const t = this.now().getTime();
          const inWindow =
            (!def.startsAt || t >= new Date(def.startsAt).getTime()) &&
            (!def.endsAt || t < new Date(def.endsAt).getTime());
          if (!def.active || !inWindow)
            throw new StoreError('forbidden', `logro inactivo: ${def.id}`);
          p.achievements[def.id] = {
            completedAt: this.iso(),
            version: def.version,
            worldId: this.activeWorld(d),
            metadata: clone(metadata),
          };
          return { completed: true, achievement: this.achievementView(def, d, me.id) };
        });
      },
      claimAchievement: async (achievementId) =>
        this.mutate(['identity', 'progress'], (d, skip): ClaimResult => {
          const had = d.identity !== null;
          const me = this.ensureIdentity(d);
          const def = this.resolved('achievements', d).find((a) => a.id === achievementId);
          if (!def) throw new StoreError('not_found', `logro ${achievementId}`);
          const existing = this.achievementEntry(d, me.id, def.id);
          const completion = d.players[me.id]?.achievements[def.id];
          if (existing || !completion) {
            if (had) skip();
            return existing
              ? { claimed: false, reason: 'duplicate', entry: clone(existing) }
              : { claimed: false, reason: 'not_ready', entry: null };
          }
          // Completado es ganado: se reclama aunque el Admin lo desactive después.
          const reward = this.rewardOf(def, d);
          const r = this.append(
            d,
            this.baseEntry(me.id, {
              id: ledgerId('achievement', def.id),
              kind: 'achievement',
              achievementId: def.id,
              // La recompensa la fija la definición, no quien reclama.
              pointsDelta: def.points,
              coinsDelta: def.coins,
              seasonId: def.scope === 'season' ? (def.seasonId ?? null) : this.activeWorld(d),
              sourceRef: `achievement:${def.id}@${def.version}`,
              metadata: {
                version: def.version,
                completedAt: completion.completedAt,
                reward: reward.kind,
                ...(reward.badgeKey ? { badge: reward.badgeKey } : {}),
              },
            }),
          );
          if (!r.granted) {
            if (had) skip();
            return { claimed: false, reason: 'duplicate', entry: r.entry };
          }
          let cosmetic: LedgerEntry | null = null;
          if (def.cosmeticKey) {
            const key = def.cosmeticKey;
            const owned = activeEntries(d.ledger, me.id, 'cosmetic').some(
              (e) => e.cosmeticKey === key,
            );
            if (!owned) {
              const c = this.append(
                d,
                this.baseEntry(me.id, {
                  id: ledgerId('cosmetic', key),
                  kind: 'cosmetic',
                  cosmeticKey: key,
                  sourceRef: `achievement:${def.id}`,
                }),
              );
              if (c.granted) cosmetic = c.entry;
            }
          }
          return { claimed: true, entry: r.entry, reward, cosmetic };
        }),
      achievements: async () => {
        const id = myId();
        const revoked = compensatedIds(this.doc.ledger);
        return this.resolved('achievements').map((def) =>
          this.achievementView(def, this.doc, id, revoked),
        );
      },
      badges: async () => {
        const id = myId();
        return id ? this.badgeViews(this.doc, id) : [];
      },
      ships: async () => {
        const id = myId();
        const owned = new Set(
          (id ? activeEntries(this.doc.ledger, id, 'cosmetic') : []).map((e) => e.cosmeticKey),
        );
        const defs = this.resolved('achievements');
        return this.resolved('cosmetics')
          .filter((c) => c.slot === 'ship' && c.active)
          .map(
            (c): ShipUnlock => ({
              style: c.assetKey ?? c.id,
              cosmeticId: c.id,
              name: c.name,
              owned: owned.has(c.id),
              achievementId: defs.find((a) => a.cosmeticKey === c.id)?.id ?? null,
              priceCoins: c.priceCoins,
            }),
          );
      },
      buyCosmetic: async (cosmeticId) =>
        grant((d, me) => {
          const c = this.resolved('cosmetics', d).find((x) => x.id === cosmeticId);
          if (!c) throw new StoreError('not_found', `cosmético ${cosmeticId}`);
          const owned = activeEntries(d.ledger, me.id, 'cosmetic').find(
            (e) => e.cosmeticKey === c.id,
          );
          if (owned) return { granted: false, reason: 'duplicate', entry: clone(owned) };
          if (!c.active || c.priceCoins === null)
            throw new StoreError('forbidden', `cosmético no a la venta: ${c.id}`);
          const base = ledgerId('cosmetic', c.id);
          let id = base;
          for (let n = 2; d.ledger.some((e) => e.id === id); n++) id = `${base}#${n}`;
          return this.append(
            d,
            this.baseEntry(me.id, {
              id,
              kind: 'cosmetic',
              cosmeticKey: c.id,
              coinsDelta: -c.priceCoins,
              sourceRef: 'coins',
            }),
          );
        }),
      cosmetics: async () => {
        const id = myId();
        if (!id) return [];
        const catalog = this.resolved('cosmetics');
        return activeEntries(this.doc.ledger, id, 'cosmetic').map((e): OwnedCosmetic => ({
          id: e.cosmeticKey ?? '',
          cosmetic: clone(catalog.find((c) => c.id === e.cosmeticKey) ?? null),
          unlockedAt: e.createdAt,
          source: e.sourceRef ?? 'coins',
        }));
      },
      equip: async (slot, cosmeticId) =>
        this.mutate(['progress'], (d) => {
          if (!(COSMETIC_SLOTS as readonly string[]).includes(slot)) invalid(`ranura ${slot}`);
          const me = this.ensureIdentity(d);
          const p = this.player(d, me.id);
          if (cosmeticId === null) delete p.equipped[slot];
          else {
            const owned = activeEntries(d.ledger, me.id, 'cosmetic').some(
              (e) => e.cosmeticKey === cosmeticId,
            );
            if (!owned) throw new StoreError('forbidden', `no tienes ${cosmeticId}`);
            const c = this.resolved('cosmetics', d).find((x) => x.id === cosmeticId);
            if (c && c.slot !== slot) invalid(`${cosmeticId} va en ${c.slot}, no en ${slot}`);
            p.equipped[slot] = cosmeticId;
          }
          return { ...p.equipped };
        }),
      equipped: async () => {
        const id = myId();
        return { ...((id && this.doc.players[id]?.equipped) || {}) };
      },
      stamps: async () => {
        const id = myId();
        return id ? this.stampViews(this.doc, id) : [];
      },
      discover: async (key, opts = {}) => {
        requireKey(key, 'descubrimiento');
        return this.mutate(['identity', 'progress'], (d, skip) => {
          const had = d.identity !== null;
          const p = this.player(d, this.ensureIdentity(d).id);
          if (p.discoveries[key]) {
            if (had) skip();
            return { first: false };
          }
          p.discoveries[key] = { at: this.iso(), worldId: opts.worldId ?? this.activeWorld(d) };
          return { first: true };
        });
      },
      discoveries: async () => {
        const id = myId();
        const p = id ? this.doc.players[id] : undefined;
        return Object.entries(p?.discoveries ?? {}).map(([key, v]) => ({ key, ...v }));
      },
      findDiscount: async (discountId, opts = {}) =>
        this.mutate(['identity', 'progress'], (d, skip) => {
          const had = d.identity !== null;
          const p = this.player(d, this.ensureIdentity(d).id);
          const prev = p.discounts[discountId];
          const rec = prev ?? { at: this.iso(), worldId: opts.worldId ?? this.activeWorld(d) };
          const found = foundDiscount(d, discountId, rec);
          if (!found) throw new StoreError('not_found', `descuento ${discountId}`);
          if (prev) {
            if (had) skip();
            return { first: false, ...clone(found) };
          }
          p.discounts[discountId] = rec;
          return { first: true, ...clone(found) };
        }),
      discounts: async () => {
        const id = myId();
        const p = id ? this.doc.players[id] : undefined;
        return Object.entries(p?.discounts ?? {}).flatMap(([did, rec]) => {
          const f = foundDiscount(this.doc, did, rec);
          return f ? [clone(f) as FoundDiscount] : [];
        });
      },
      mission: async (id) => {
        const me = myId();
        const m = me ? this.doc.players[me]?.missions[id] : undefined;
        return m ? clone(m) : null;
      },
      setMission: async (id, input) => {
        requireKey(id, 'misión');
        if (typeof input.step !== 'string' || input.step.length < 1 || input.step.length > 80)
          invalid('misión: paso');
        const data = input.data ?? {};
        if (!jsonValue.safeParse(data).success) invalid('misión: datos JSON');
        return this.mutate(['identity', 'progress'], (d) => {
          const p = this.player(d, this.ensureIdentity(d).id);
          const prev = p.missions[id];
          const at = this.iso();
          const next = {
            id,
            step: input.step,
            data: { ...(prev?.data ?? {}), ...data },
            worldId:
              input.worldId !== undefined ? input.worldId : (prev?.worldId ?? this.activeWorld(d)),
            startedAt: prev?.startedAt ?? at,
            updatedAt: at,
            completedAt: prev?.completedAt ?? (input.completed ? at : null),
          };
          p.missions[id] = next;
          return clone(next);
        });
      },
      record: async (id) => {
        const me = myId();
        const r = me ? this.doc.players[me]?.records[id] : undefined;
        return r ? clone(r) : null;
      },
      submitTime: async (id, ms) => {
        requireKey(id, 'récord');
        if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0 || ms > MAX_TIME_MS)
          invalid('récord: milisegundos > 0');
        return this.mutate(['identity', 'progress'], (d) => {
          const p = this.player(d, this.ensureIdentity(d).id);
          const prev = p.records[id];
          const best = !prev || ms < prev.bestMs;
          const record = {
            id,
            bestMs: best ? ms : (prev?.bestMs ?? ms),
            bestAt: best ? this.iso() : (prev?.bestAt ?? this.iso()),
            attempts: (prev?.attempts ?? 0) + 1,
          };
          p.records[id] = record;
          return { best, record: clone(record) };
        });
      },
      counter: async (name) => {
        const me = myId();
        return (me && this.doc.players[me]?.counters[name]) || 0;
      },
      increment: async (name, by = 1) => {
        requireKey(name, 'contador');
        nonNegativeInt(by, 'incremento');
        return this.mutate(['identity', 'progress'], (d) => {
          const p = this.player(d, this.ensureIdentity(d).id);
          const v = (p.counters[name] ?? 0) + by;
          p.counters[name] = v;
          return v;
        });
      },
      pref: async (key) => {
        const me = myId();
        const v = me ? this.doc.players[me]?.prefs[key] : undefined;
        return v === undefined ? undefined : clone(v);
      },
      setPref: async (key, value) => {
        requireKey(key, 'preferencia');
        if (value !== null && !jsonValue.safeParse(value).success) invalid('preferencia: JSON');
        await this.mutate(['identity', 'progress'], (d) => {
          const p = this.player(d, this.ensureIdentity(d).id);
          if (value === null) delete p.prefs[key];
          else p.prefs[key] = clone(value) as JsonValue;
        });
      },
    };
  }

  // -------------------------------------------------------------------------
  // Compras de prueba

  private purchaseApi(): PurchaseApi {
    return {
      confirmSandbox: async (input) => {
        if (typeof input.purchaseId !== 'string' || !PURCHASE_ID.test(input.purchaseId))
          invalid('compra: id');
        const quantity = input.quantity ?? 1;
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20)
          invalid('compra: cantidad');
        const amount = input.amountCents ?? null;
        if (amount !== null) nonNegativeInt(amount, 'compra: importe');
        return this.mutate(['identity', 'purchases', 'progress'], (d, skip) => {
          const had = d.identity !== null;
          const me = this.ensureIdentity(d);
          let purchase = d.purchases.find((p) => p.id === input.purchaseId);
          let first = false;
          if (purchase) {
            if (purchase.userId !== me.id || purchase.eventId !== input.eventId)
              throw new StoreError('conflict', 'ese id de compra es de otra compra');
          } else {
            const event = this.resolved('events', d).find((e) => e.id === input.eventId);
            if (!event) throw new StoreError('not_found', `evento ${input.eventId}`);
            if (!EVENT_STATE_BEHAVIOR[event.state].purchasable)
              throw new StoreError('forbidden', `evento no a la venta (${event.state})`);
            const discountId = input.discountId ?? null;
            if (discountId !== null) {
              const rec = d.players[me.id]?.discounts[discountId];
              const disc = this.resolved('discounts', d).find((x) => x.id === discountId);
              if (!rec || !disc) invalid('compra: descuento no encontrado');
              if (disc.eventId && disc.eventId !== event.id)
                invalid('compra: descuento de otro evento');
              if (discountStatus(disc, this.now()) !== 'active')
                invalid('compra: descuento no vigente');
            }
            const at = this.iso();
            purchase = {
              id: input.purchaseId,
              userId: me.id,
              eventId: event.id,
              provider: 'sandbox',
              providerOrderId: `sandbox-${input.purchaseId}`,
              status: 'confirmed',
              quantity,
              discountId,
              amountCents: amount,
              confirmedAt: at,
              createdAt: at,
            };
            d.purchases.push(purchase);
            first = true;
          }
          const stampId = ledgerId('stamp', purchase.id);
          const own = d.ledger.find((e) => e.id === stampId);
          const already = activeEntries(d.ledger, me.id, 'stamp').find(
            (e) => e.eventId === purchase.eventId,
          );
          let stamp: GrantResult;
          if (own) stamp = { granted: false, reason: 'duplicate', entry: clone(own) };
          else if (already)
            stamp = { granted: false, reason: 'already_stamped', entry: clone(already) };
          else
            stamp = this.append(
              d,
              this.baseEntry(me.id, {
                id: stampId,
                kind: 'stamp',
                eventId: purchase.eventId,
                purchaseId: purchase.id,
                sourceRef: `purchase:${purchase.id}`,
              }),
            );
          if (!first && !stamp.granted && had) skip();
          return { purchase: clone(purchase), first, stamp };
        });
      },
      list: async () => {
        const id = this.doc.identity?.id;
        return id ? clone(this.doc.purchases.filter((p) => p.userId === id)) : [];
      },
    };
  }

  // -------------------------------------------------------------------------
  // Botellas

  private bottleApi(): BottleApi {
    const findMine = (d: StoreDoc, id: string): Bottle => {
      const me = d.identity?.id;
      const b = d.bottles.find((x) => x.id === id);
      if (!b) throw new StoreError('not_found', `botella ${id}`);
      if (b.userId !== me) throw new StoreError('forbidden', 'la botella no es tuya');
      return b;
    };
    return {
      list: async () =>
        this.allBottles()
          .filter((b) => b.status === 'active')
          .map((b) => this.bottleView(b)),
      mine: async () => {
        const me = this.doc.identity?.id;
        const b = me && this.doc.bottles.find((x) => x.userId === me && x.status === 'active');
        return b ? this.bottleView(b) : null;
      },
      place: async (input: BottleInput) => {
        const message = this.checkBottleMessage(input.message);
        const pos = this.checkBottlePosition(input.x, input.y);
        return this.mutate(['bottles'], (d) => {
          const me = d.identity;
          if (!me || !d.carnets[me.id])
            throw new StoreError('no_carnet', 'sin Carnet no se escriben botellas');
          if (d.bottles.some((b) => b.userId === me.id && b.status === 'active'))
            throw new StoreError('conflict', 'ya tienes una botella en el mar');
          const at = this.iso();
          const b: Bottle = {
            id: newId(),
            userId: me.id,
            seasonId: this.activeWorld(d),
            message,
            ...pos,
            status: 'active',
            moderatedBy: null,
            moderatedAt: null,
            moderationReason: null,
            version: 1,
            createdAt: at,
            updatedAt: at,
          };
          d.bottles.push(b);
          return this.bottleView(b, d);
        });
      },
      edit: async (id, patch) => {
        const message =
          patch.message !== undefined ? this.checkBottleMessage(patch.message) : undefined;
        return this.mutate(['bottles'], (d) => {
          const b = findMine(d, id);
          if (b.status !== 'active') throw new StoreError('forbidden', `botella ${b.status}`);
          if (patch.x !== undefined || patch.y !== undefined) {
            const pos = this.checkBottlePosition(patch.x ?? b.x, patch.y ?? b.y);
            b.x = pos.x;
            b.y = pos.y;
          }
          if (message !== undefined) b.message = message;
          b.version++;
          b.updatedAt = this.iso();
          return this.bottleView(b, d);
        });
      },
      retire: async (id) =>
        this.mutate(['bottles'], (d, skip) => {
          const b = findMine(d, id);
          if (b.status === 'removed') throw new StoreError('forbidden', 'retirada por moderación');
          if (b.status === 'retired') return skip();
          b.status = 'retired';
          b.version++;
          b.updatedAt = this.iso();
        }),
      read: async (id) =>
        this.mutate(['identity', 'bottles'], (d, skip) => {
          const had = d.identity !== null;
          const me = this.ensureIdentity(d);
          const b = this.allBottles(d).find((x) => x.id === id);
          if (!b || (b.status !== 'active' && b.userId !== me.id))
            throw new StoreError('not_found', `botella ${id}`);
          if (d.bottleReads.some((r) => r.bottleId === id && r.readerId === me.id)) {
            if (had) skip();
          } else d.bottleReads.push({ bottleId: id, readerId: me.id, readAt: this.iso() });
          return this.bottleView(b, d);
        }),
      report: async (id, reason = null) => {
        const why = reason === null ? null : String(reason).trim() || null;
        if (why !== null && charLength(why) > BOTTLE_REPORT_REASON_MAX)
          invalid(`reporte: hasta ${BOTTLE_REPORT_REASON_MAX} caracteres`);
        return this.mutate(['bottles'], (d, skip) => {
          const me = d.identity;
          if (!me || !d.carnets[me.id])
            throw new StoreError('no_carnet', 'sin Carnet no se reporta');
          const b = this.allBottles(d).find((x) => x.id === id);
          if (!b || b.status !== 'active') throw new StoreError('not_found', `botella ${id}`);
          if (b.userId === me.id) throw new StoreError('forbidden', 'es tu botella');
          if (d.bottleReports.some((r) => r.bottleId === id && r.reporterId === me.id)) {
            skip();
            return { first: false };
          }
          d.bottleReports.push({
            id: newId(),
            bottleId: id,
            reporterId: me.id,
            reason: why,
            createdAt: this.iso(),
            resolvedAt: null,
            resolvedBy: null,
            resolution: null,
          });
          return { first: true };
        });
      },
    };
  }

  // -------------------------------------------------------------------------
  // Contenido

  private contentApi(): ContentApi {
    return {
      list: async (area) => clone(this.resolved(area)),
      get: async (area, id) => clone(this.resolved(area).find((x) => x.id === id) ?? null),
      home: async (): Promise<HomeContent> =>
        clone({
          blocks: this.resolved('homeBlocks'),
          events: this.resolved('events'),
          artists: this.resolved('artists'),
          photos: this.resolved('photos'),
          promotions: this.resolved('promotions'),
        }),
      events: async () => clone(this.resolved('events')),
      texts: async () => ({ ...this.sample.texts, ...this.doc.content.texts }),
      places: async () => clone(this.doc.content.places),
      skins: async () => clone(this.doc.content.skins),
      activeWorldId: async () => this.activeWorld(),
    };
  }

  // -------------------------------------------------------------------------
  // Admin de la demo

  private adminApi(): AdminApi {
    const areaItems = (d: StoreDoc, area: EntityArea) => (d.content.items[area] ??= {});
    const checkArea = (area: string): EntityArea => {
      if (!(ENTITY_AREAS as readonly string[]).includes(area)) invalid(`área ${area}`);
      return area as EntityArea;
    };
    const sampleOf = (area: EntityArea, id: string) =>
      (this.sample[area] as { id: string }[]).find((x) => x.id === id);

    return {
      upsert: async (area, item, opts) => {
        checkArea(area);
        const parsed = ENTITY_SCHEMAS[area].safeParse(item);
        if (!parsed.success)
          invalid(
            `${area}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
          );
        const value = parsed.data as AreaItem<typeof area>;
        return this.mutate(['content', 'audit'], (d) => {
          const before = this.resolved(area, d).find((x) => x.id === value.id) ?? null;
          areaItems(d, area)[value.id] = { value: clone(value), deleted: false, at: this.iso() };
          this.audit(d, { area, action: 'upsert', targetId: value.id, before, after: value }, opts);
          return clone(value);
        });
      },
      remove: async (area, id, opts) => {
        checkArea(area);
        await this.mutate(['content', 'audit'], (d) => {
          const current = this.resolved(area, d).find((x) => x.id === id);
          if (!current) throw new StoreError('not_found', `${area}/${id}`);
          areaItems(d, area)[id] = { value: clone(current), deleted: true, at: this.iso() };
          this.audit(
            d,
            { area, action: 'delete', targetId: id, before: current, after: null },
            opts,
          );
        });
      },
      restore: async (area, id, opts) => {
        checkArea(area);
        return this.mutate(['content', 'audit'], (d, skip) => {
          const o = d.content.items[area]?.[id];
          if (!o || !o.deleted) {
            skip();
            return clone(this.resolved(area, d).find((x) => x.id === id) ?? null);
          }
          const s = sampleOf(area, id);
          if (s && JSON.stringify(s) === JSON.stringify(o.value)) delete areaItems(d, area)[id];
          else areaItems(d, area)[id] = { ...o, deleted: false, at: this.iso() };
          const after = this.resolved(area, d).find((x) => x.id === id) ?? null;
          this.audit(d, { area, action: 'restore', targetId: id, before: null, after }, opts);
          return clone(after);
        });
      },
      reorder: async (area, ids, opts) => {
        checkArea(area);
        await this.mutate(['content', 'audit'], (d) => {
          const current = this.resolved(area, d).map((x) => x.id);
          if (new Set(ids).size !== ids.length) invalid('orden: ids repetidos');
          for (const id of ids)
            if (!current.includes(id)) invalid(`orden: ${area}/${id} no existe`);
          d.content.order[area] = [...ids];
          const after = this.resolved(area, d).map((x) => x.id);
          this.audit(d, { area, action: 'reorder', targetId: null, before: current, after }, opts);
        });
      },
      setPlace: async (placeId, patch, opts) => {
        requireKey(placeId, 'lugar');
        let parsed: PlacePatch | null = null;
        if (patch !== null) {
          const r = placePatchSchema.strict().safeParse(patch);
          if (!r.success) invalid(`lugar ${placeId}: ${r.error.issues[0]?.message ?? 'forma'}`);
          parsed = r.data;
        }
        await this.mutate(['content', 'audit'], (d) => {
          const before = d.content.places[placeId] ?? null;
          if (parsed === null) delete d.content.places[placeId];
          else {
            const merged = mergePlacePatch(before ?? undefined, parsed);
            const why = this.validators.placePatch?.(placeId, merged) ?? null;
            if (why) invalid(`lugar ${placeId}: ${why}`);
            d.content.places[placeId] = merged;
          }
          const after = d.content.places[placeId] ?? null;
          this.audit(d, { area: 'places', action: 'set', targetId: placeId, before, after }, opts);
        });
      },
      setSkin: async (worldId, placeId, patch, opts) => {
        requireKey(worldId, 'mundo');
        requireKey(placeId, 'lugar');
        let parsed: SkinPatch | null = null;
        if (patch !== null) {
          const r = skinPatchSchema.strict().safeParse(patch);
          if (!r.success)
            invalid(`piel ${worldId}/${placeId}: ${r.error.issues[0]?.message ?? 'forma'}`);
          parsed = r.data;
        }
        await this.mutate(['content', 'audit'], (d) => {
          const byPlace = (d.content.skins[worldId] ??= {});
          const before = byPlace[placeId] ?? null;
          if (parsed === null) delete byPlace[placeId];
          else {
            const merged = mergeSkinPatch(before ?? undefined, parsed);
            const why = this.validators.skinPatch?.(worldId, placeId, merged) ?? null;
            if (why) invalid(`piel ${worldId}/${placeId}: ${why}`);
            byPlace[placeId] = merged;
          }
          if (Object.keys(byPlace).length === 0) delete d.content.skins[worldId];
          const after = d.content.skins[worldId]?.[placeId] ?? null;
          this.audit(
            d,
            { area: 'skins', action: 'set', targetId: `${worldId}/${placeId}`, before, after },
            opts,
          );
        });
      },
      setText: async (key, value, opts) => {
        if (typeof key !== 'string' || key.length < 1 || key.length > 200) invalid('texto: clave');
        if (value !== null && (typeof value !== 'string' || value.length > 5000))
          invalid('texto: hasta 5000 caracteres');
        await this.mutate(['content', 'audit'], (d) => {
          const before = d.content.texts[key] ?? null;
          if (value === null) delete d.content.texts[key];
          else d.content.texts[key] = value;
          this.audit(
            d,
            { area: 'texts', action: 'set', targetId: key, before, after: value },
            opts,
          );
        });
      },
      setActiveWorld: async (worldId, opts) => {
        if (worldId !== null) requireKey(worldId, 'mundo');
        await this.mutate(['content', 'audit'], (d) => {
          const before = this.activeWorld(d);
          d.content.activeWorldId = worldId;
          this.audit(
            d,
            { area: 'activeWorld', action: 'set', targetId: null, before, after: worldId },
            opts,
          );
        });
      },
      reset: async (area, opts) => {
        const areas: readonly ContentArea[] = area === 'all' ? CONTENT_AREAS : [area];
        for (const a of areas)
          if (!(CONTENT_AREAS as readonly string[]).includes(a)) invalid(`área ${a}`);
        await this.mutate(['content', 'audit'], (d) => {
          for (const a of areas) {
            let before: unknown;
            if (a === 'places') {
              before = d.content.places;
              d.content.places = {};
            } else if (a === 'skins') {
              before = d.content.skins;
              d.content.skins = {};
            } else if (a === 'texts') {
              before = d.content.texts;
              d.content.texts = {};
            } else if (a === 'activeWorld') {
              before = d.content.activeWorldId ?? null;
              delete d.content.activeWorldId;
            } else {
              before = { items: d.content.items[a] ?? {}, order: d.content.order[a] ?? null };
              delete d.content.items[a];
              delete d.content.order[a];
            }
            this.audit(d, { area: a, action: 'reset', targetId: null, before, after: null }, opts);
          }
        });
      },
      overridden: async (area) => {
        const c = this.doc.content;
        if (area === 'places') return Object.keys(c.places);
        if (area === 'skins')
          return Object.entries(c.skins).flatMap(([w, byPlace]) =>
            Object.keys(byPlace).map((p) => `${w}/${p}`),
          );
        if (area === 'texts') return Object.keys(c.texts);
        if (area === 'activeWorld') return c.activeWorldId !== undefined ? ['activeWorld'] : [];
        return Object.keys(c.items[area] ?? {});
      },
      audit: async (filter = {}) => {
        const list = this.doc.audit
          .filter((e) => !filter.area || e.area === filter.area)
          .slice()
          .reverse();
        return clone(filter.limit ? list.slice(0, filter.limit) : list);
      },
      bottles: async () =>
        this.allBottles().map((b): AdminBottleView => ({
          ...this.bottleView(b),
          moderationReason: b.moderationReason,
          reports: clone(this.doc.bottleReports.filter((r) => r.bottleId === b.id)),
        })),
      removeBottle: async (id, opts) =>
        this.mutate(['bottles', 'audit'], (d) => {
          const b = this.allBottles(d).find((x) => x.id === id);
          if (!b) throw new StoreError('not_found', `botella ${id}`);
          const before = clone(b);
          const at = this.iso();
          const next: Bottle = {
            ...b,
            status: 'removed',
            moderatedBy: this.actor,
            moderatedAt: at,
            moderationReason: opts?.reason ?? null,
            version: b.version + 1,
            updatedAt: at,
          };
          this.upsertLocalBottle(d, next);
          for (const r of d.bottleReports) {
            if (r.bottleId === id && r.resolvedAt === null) {
              r.resolvedAt = at;
              r.resolvedBy = this.actor;
              r.resolution = 'retirada';
            }
          }
          this.audit(
            d,
            { area: 'bottles', action: 'moderate', targetId: id, before, after: next },
            opts,
          );
        }),
      resolveReport: async (reportId, resolution) =>
        this.mutate(['bottles', 'audit'], (d) => {
          const r = d.bottleReports.find((x) => x.id === reportId);
          if (!r) throw new StoreError('not_found', `reporte ${reportId}`);
          const before = clone(r);
          r.resolvedAt = this.iso();
          r.resolvedBy = this.actor;
          r.resolution = resolution;
          this.audit(d, {
            area: 'bottles',
            action: 'resolve_report',
            targetId: reportId,
            before,
            after: r,
          });
        }),
      compensate: async (txId, reason) => {
        if (typeof reason !== 'string' || reason.trim() === '') invalid('compensación: motivo');
        return this.mutate(['progress', 'audit'], (d) => {
          const orig = d.ledger.find((e) => e.id === txId);
          if (!orig) throw new StoreError('not_found', `transacción ${txId}`);
          const r = this.append(d, {
            ...this.baseEntry(orig.userId, {
              id: ledgerId('compensation', txId),
              kind: 'compensation',
              compensatesId: txId,
              reason: reason.trim(),
              createdBy: this.actor,
            }),
          });
          if (!r.granted) throw new StoreError('conflict', 'ya compensada');
          this.audit(
            d,
            { area: 'ledger', action: 'compensate', targetId: txId, before: orig, after: r.entry },
            { reason },
          );
          return r.entry;
        });
      },
    };
  }
}

// ---------------------------------------------------------------------------

let shared: BoiaRepository | null = null;

/**
 * El repositorio de esta pestaña, uno para todos (landing, juego, admin). La
 * primera llamada fija las opciones; las siguientes las ignoran. En el
 * servidor (SSR) da uno nuevo en memoria, con la muestra, en cada llamada.
 */
export function browserRepository(options: LocalRepositoryOptions = {}): BoiaRepository {
  // En el servidor, uno nuevo por llamada: nunca estado compartido entre peticiones.
  if (typeof window === 'undefined') return createLocalRepository({ ...options, storage: null });
  shared ??= createLocalRepository(options);
  return shared;
}

/** Sólo pruebas: olvida el repositorio compartido. */
export function resetBrowserRepositoryForTests(): void {
  shared = null;
}
