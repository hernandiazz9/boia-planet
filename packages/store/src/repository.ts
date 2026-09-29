import type {
  AchievementRewardKind,
  AchievementState,
  BoiaEvent,
  BottleStatus,
  CarnetQuestion,
  Discount,
  DiscountStatus,
  HomeContent,
} from '@boia/contracts';
import type { RewardPolicy } from './ids';
import type { Balances } from './ledger';
import type {
  AchievementDefinition,
  AreaInput,
  AreaItem,
  AuditEntry,
  BottleReport,
  ContentArea,
  Cosmetic,
  CosmeticSlot,
  EntityArea,
  Identity,
  JsonValue,
  LedgerEntry,
  MissionState,
  PlacePatch,
  Purchase,
  Rank,
  SkinPatch,
  TimeRecord,
} from './schema';
import type { StorageStatus } from './storage';

/**
 * La interfaz de datos de toda la demo. Hoy la implementa el repositorio
 * local (`createLocalRepository`, en el navegador); con Supabase llegará otra
 * implementación de esta misma interfaz, sin cambiar a quien la usa.
 *
 * Reglas para quien la implemente (y por qué todo es asíncrono):
 * - Toda lectura y escritura devuelve una promesa, aunque la local responda
 *   al momento: la de Supabase va por red.
 * - Nadie fuera del repositorio escribe saldos, logros, sellos ni
 *   cosméticos: sólo se piden concesiones, y el repositorio decide su id
 *   estable (REQ-ARQ-003, REQ-ARQ-007). No hay ningún método para fijar un
 *   saldo.
 * - Los datos del mundo se direccionan por ids estables de lugar (mapa
 *   compartido, D-20), nunca por coordenadas.
 * - `subscribe` avisa de cada cambio (también de otra pestaña) con las
 *   áreas tocadas, para volver a leer.
 */
export interface BoiaRepository {
  /** Dónde se guarda y si hubo problemas (memoria, cuota…), con texto para la interfaz. */
  status(): StorageStatus;
  /** Contador que sube con cada cambio (útil para `useSyncExternalStore`). */
  revision(): number;
  subscribe(listener: (change: RepositoryChange) => void): () => void;
  readonly identity: IdentityApi;
  readonly carnet: CarnetApi;
  readonly progress: ProgressApi;
  readonly purchases: PurchaseApi;
  readonly bottles: BottleApi;
  readonly content: ContentApi;
  readonly admin: AdminApi;
}

export type ChangeArea =
  'identity' | 'carnet' | 'progress' | 'purchases' | 'bottles' | 'content' | 'audit' | 'storage';

export interface RepositoryChange {
  areas: ChangeArea[];
  revision: number;
  /** true si llegó de otra pestaña. */
  external: boolean;
}

// ---------------------------------------------------------------------------

export interface IdentityApi {
  /** La identidad de este navegador, o null si todavía no hay. */
  current(): Promise<Identity | null>;
  /** La crea si no existe (invitado, sin email: D-20). Toda escritura la llama sola. */
  ensure(): Promise<Identity>;
  /**
   * Olvida al invitado en este navegador y empieza otro: borra su Carnet, su
   * progreso, sus compras y lecturas, y retira su botella. El contenido del
   * Admin y la auditoría no se tocan.
   */
  reset(): Promise<Identity>;
}

// ---------------------------------------------------------------------------

export interface CarnetAnswerView {
  questionId: string;
  /** La pregunta siempre acompaña a la respuesta (REQ-IDE-015). */
  question: string;
  questionVersion: number;
  answer: string;
}

export interface AchievementView {
  id: string;
  title: string;
  description: string | null;
  iconKey: string | null;
  obtainedAt: string;
}

/** Insignia del Carnet ganada con un logro reclamado (REQ-IDE-052). */
export interface BadgeView {
  key: string;
  /** Logro que la da; su título es el nombre de la insignia. */
  achievementId: string;
  title: string;
  iconKey: string | null;
  /** Cuándo se reclamó; null en los miembros de muestra. */
  claimedAt: string | null;
}

export interface StampView {
  eventId: string;
  eventName: string | null;
  purchaseId: string | null;
  grantedAt: string | null;
}

/** El Carnet tal como lo ven los demás (REQ-IDE-010, REQ-IDE-011). */
export interface CarnetView {
  userId: string;
  nickname: string;
  avatarKey: string | null;
  avatarImage: string | null;
  memberSince: string;
  /** Sólo las contestadas, en el orden de las preguntas. */
  answers: CarnetAnswerView[];
  points: number;
  rank: Rank | null;
  /** Logros reclamados. */
  achievements: AchievementView[];
  /** Insignias de los logros reclamados que dan una. */
  badges: BadgeView[];
  stamps: StampView[];
  cosmeticIds: string[];
  equipped: Record<string, string>;
  isMine: boolean;
  /** Miembro ficticio de muestra. */
  isSample: boolean;
}

export interface CarnetInput {
  nickname: string;
  avatarKey?: string | null | undefined;
  avatarImage?: string | null | undefined;
}

export interface CarnetApi {
  /** Las 5 preguntas de §44.1, textuales (de @boia/contracts). */
  questions(): Promise<readonly CarnetQuestion[]>;
  mine(): Promise<CarnetView | null>;
  /** El Carnet de cualquiera (propio o de muestra), p. ej. desde su botella. */
  get(userId: string): Promise<CarnetView | null>;
  /** Crea el Carnet del invitado; fija «Miembro desde». Apodo único sin distinguir mayúsculas. */
  create(input: CarnetInput): Promise<CarnetView>;
  update(patch: Partial<CarnetInput>): Promise<CarnetView>;
  /** Contesta (o borra con null o vacío) una de las 5 preguntas. */
  answer(questionId: string, answer: string | null): Promise<CarnetView>;
}

// ---------------------------------------------------------------------------

export type GrantResult =
  | { granted: true; entry: LedgerEntry }
  /** Ya estaba concedido con ese id (o, en sellos, ya hay sello de ese evento). */
  | { granted: false; reason: 'duplicate' | 'already_stamped'; entry: LedgerEntry | null };

export interface WorldRewardInput {
  /** Origen estable: id de lugar u objeto, `minigame:faro`… */
  sourceRef: string;
  points?: number | undefined;
  coins?: number | undefined;
  /** `once` por defecto. */
  policy?: RewardPolicy | undefined;
  /** Temporada; por defecto, el mundo activo (D-20). */
  seasonId?: string | null | undefined;
  metadata?: Record<string, JsonValue> | undefined;
}

/** Premio de un logro, tal como lo fija su definición. */
export interface AchievementReward {
  /** Tipo principal: monedas (por defecto), insignia, barco o cosmético. */
  kind: AchievementRewardKind;
  points: number;
  coins: number;
  badgeKey: string | null;
  /** Cosmético que se concede (también el del barco de estilo). */
  cosmeticKey: string | null;
  /** Estilo del barco que desbloquea (`assetKey` del cosmético `ship`). */
  shipStyle: string | null;
}

export interface AchievementProgress {
  /**
   * Definición. La de un logro oculto sin completar sale con título «???» y
   * sin descripción; condición y parámetros van completos (el juego los
   * evalúa).
   */
  definition: AchievementDefinition;
  state: AchievementState;
  /** Oculto y sin completar: se enseña como «???». */
  hidden: boolean;
  /** Conseguido: completado (listo para reclamar o reclamado). */
  obtained: boolean;
  /** Cuándo se completó. */
  obtainedAt: string | null;
  claimedAt: string | null;
  reward: AchievementReward;
}

export type CompleteResult = {
  /** true sólo la primera vez: ahora queda listo para reclamar. */
  completed: boolean;
  achievement: AchievementProgress;
};

export type ClaimResult =
  | {
      claimed: true;
      /** La fila `achievement` del libro, con los puntos y monedas. */
      entry: LedgerEntry;
      reward: AchievementReward;
      /** La fila del cosmético o barco concedido, si lo hay. */
      cosmetic: LedgerEntry | null;
    }
  /** duplicate: ya reclamado · not_ready: todavía no se ha completado. */
  | { claimed: false; reason: 'duplicate' | 'not_ready'; entry: LedgerEntry | null };

/**
 * Barco de estilo que se gana (logro) o se compra (tienda): mientras está en
 * esta lista y no se tiene, su estilo está bloqueado en el selector. Los
 * estilos que no están aquí son libres.
 */
export interface ShipUnlock {
  /** Id del estilo (`art/barco/estilos/<id>`). */
  style: string;
  cosmeticId: string;
  name: string;
  owned: boolean;
  /** Logro que lo desbloquea, si lo hay. */
  achievementId: string | null;
  /** Precio en monedas; null si sólo se gana con un logro. */
  priceCoins: number | null;
}

export interface OwnedCosmetic {
  cosmetic: Cosmetic | null;
  id: string;
  unlockedAt: string;
  /** `achievement:<id>` o `coins`. */
  source: string;
}

export interface Discovery {
  key: string;
  at: string;
  worldId: string | null;
}

export interface FoundDiscount {
  discount: Discount;
  /** Vigencia ahora (`discountStatus`). */
  status: DiscountStatus;
  foundAt: string;
  worldId: string | null;
  /**
   * Cuándo se aplicó en una compra confirmada de este visitante, o null. Un
   * código usado ya no se aplica otra vez (T43; «usado» en «Mis códigos»).
   */
  usedAt: string | null;
  /** La compra que lo usó, o null. */
  usedIn: string | null;
}

export interface MissionInput {
  step: string;
  data?: Record<string, JsonValue> | undefined;
  worldId?: string | null | undefined;
  completed?: boolean | undefined;
}

export interface ProgressApi {
  /** Puntos y monedas por separado, derivados del libro. Sólo lectura. */
  balances(): Promise<Balances>;
  ledger(): Promise<readonly LedgerEntry[]>;
  /** Recompensa del mundo, idempotente por (`sourceRef`, política). */
  grantWorldReward(input: WorldRewardInput): Promise<GrantResult>;
  /**
   * Marca un logro del catálogo como completado (listo para reclamar). No
   * escribe en el libro ni da nada. Idempotente; `forbidden` si el logro
   * está desactivado o fuera de fechas.
   */
  completeAchievement(
    achievementId: string,
    metadata?: Record<string, JsonValue>,
  ): Promise<CompleteResult>;
  /**
   * Reclama un logro completado: escribe su fila en el libro (puntos y
   * monedas de la definición) y concede su cosmético o barco. Una sola vez
   * por id: reclamar otra vez no da nada.
   */
  claimAchievement(achievementId: string): Promise<ClaimResult>;
  /** Catálogo entero con su estado; los ocultos sin completar, como «???». */
  achievements(): Promise<AchievementProgress[]>;
  /** Insignias de los logros reclamados (Mi Carnet). */
  badges(): Promise<BadgeView[]>;
  /** Barcos de estilo bloqueables y si ya se tienen. */
  ships(): Promise<ShipUnlock[]>;
  /** Compra un cosmético con monedas (nunca toca los puntos). */
  buyCosmetic(cosmeticId: string): Promise<GrantResult>;
  cosmetics(): Promise<OwnedCosmetic[]>;
  /** Equipa un cosmético propio en su ranura (null la vacía). */
  equip(slot: CosmeticSlot, cosmeticId: string | null): Promise<Record<string, string>>;
  equipped(): Promise<Record<string, string>>;
  stamps(): Promise<StampView[]>;
  /** Descubrimiento por clave estable; `first` sólo la primera vez. */
  discover(key: string, opts?: { worldId?: string | null }): Promise<{ first: boolean }>;
  discoveries(): Promise<Discovery[]>;
  /** Encuentra un descuento del contenido; `first` sólo la primera vez (REQ-COM-021). */
  findDiscount(
    discountId: string,
    opts?: { worldId?: string | null },
  ): Promise<{ first: boolean } & FoundDiscount>;
  discounts(): Promise<FoundDiscount[]>;
  mission(id: string): Promise<MissionState | null>;
  setMission(id: string, input: MissionInput): Promise<MissionState>;
  /** Récord local (D-09): guarda el mejor tiempo. */
  record(id: string): Promise<TimeRecord | null>;
  submitTime(id: string, ms: number): Promise<{ best: boolean; record: TimeRecord }>;
  counter(name: string): Promise<number>;
  increment(name: string, by?: number): Promise<number>;
  pref(key: string): Promise<JsonValue | undefined>;
  setPref(key: string, value: JsonValue | null): Promise<void>;
}

// ---------------------------------------------------------------------------

export interface SandboxPurchaseInput {
  /** Id estable de la compra: confirmar dos veces la misma no duplica nada. */
  purchaseId: string;
  eventId: string;
  quantity?: number | undefined;
  /**
   * Descuento encontrado, vigente, de entradas (no de tienda), de ese evento
   * y sin usar en otra compra, si se aplica.
   */
  discountId?: string | null | undefined;
  amountCents?: number | null | undefined;
}

export interface PurchaseApi {
  /**
   * Compra de prueba (D-20, sin ticketera): la confirma y concede el sello del
   * evento una vez. El evento tiene que estar a la venta.
   */
  confirmSandbox(
    input: SandboxPurchaseInput,
  ): Promise<{ purchase: Purchase; first: boolean; stamp: GrantResult }>;
  list(): Promise<Purchase[]>;
}

// ---------------------------------------------------------------------------

export interface BottleView {
  id: string;
  message: string;
  x: number;
  y: number;
  status: BottleStatus;
  authorId: string;
  authorNickname: string | null;
  isMine: boolean;
  isSample: boolean;
  /** Ya la he leído. */
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BottleInput {
  message: string;
  x: number;
  y: number;
}

export interface BottleApi {
  /** Botellas activas en el mar (las de muestra y las de este navegador). */
  list(): Promise<BottleView[]>;
  mine(): Promise<BottleView | null>;
  /** Echa la botella. Una activa por identidad: con otra activa, `conflict`. */
  place(input: BottleInput): Promise<BottleView>;
  edit(id: string, patch: Partial<BottleInput>): Promise<BottleView>;
  /** La retira su autor. */
  retire(id: string): Promise<void>;
  /** La lee: queda registrado y la botella sigue en el mar (REQ-IDE-041). */
  read(id: string): Promise<BottleView>;
  /** Reporta (una vez por persona y botella). */
  report(id: string, reason?: string | null): Promise<{ first: boolean }>;
}

// ---------------------------------------------------------------------------

export interface ContentApi {
  list<A extends EntityArea>(area: A): Promise<AreaItem<A>[]>;
  get<A extends EntityArea>(area: A, id: string): Promise<AreaItem<A> | null>;
  /** Todo lo que pinta la home, con la forma de @boia/contracts. */
  home(): Promise<HomeContent>;
  events(): Promise<BoiaEvent[]>;
  /** Textos cambiados por el Admin; la app los pone sobre los suyos (`resolveTexts`). */
  texts(): Promise<Record<string, string>>;
  /** Cambios compartidos por id de lugar (valen en todos los mundos). */
  places(): Promise<Record<string, PlacePatch>>;
  /** Cambios de piel por mundo y lugar. */
  skins(): Promise<Record<string, Record<string, SkinPatch>>>;
  /** Mundo activo; null: el que diga el registro de mundos. */
  activeWorldId(): Promise<string | null>;
}

export interface AdminOptions {
  reason?: string | null | undefined;
}

export interface AdminBottleView extends BottleView {
  reports: BottleReport[];
  moderationReason: string | null;
}

/**
 * El Admin de la demo («Probar admin», D-20): sin login, cada cambio queda en
 * este navegador, se anota en la auditoría local y se puede restablecer a la
 * muestra por áreas.
 */
export interface AdminApi {
  upsert<A extends EntityArea>(
    area: A,
    item: AreaInput<A>,
    opts?: AdminOptions,
  ): Promise<AreaItem<A>>;
  /** A la papelera (recuperable con `restore`). */
  remove(area: EntityArea, id: string, opts?: AdminOptions): Promise<void>;
  restore<A extends EntityArea>(
    area: A,
    id: string,
    opts?: AdminOptions,
  ): Promise<AreaItem<A> | null>;
  reorder(area: EntityArea, ids: readonly string[], opts?: AdminOptions): Promise<void>;
  /** Cambio compartido de un lugar (se mezcla con el anterior); null lo quita. */
  setPlace(placeId: string, patch: PlacePatch | null, opts?: AdminOptions): Promise<void>;
  setSkin(
    worldId: string,
    placeId: string,
    patch: SkinPatch | null,
    opts?: AdminOptions,
  ): Promise<void>;
  setText(key: string, value: string | null, opts?: AdminOptions): Promise<void>;
  setActiveWorld(worldId: string | null, opts?: AdminOptions): Promise<void>;
  /** Vuelve un área (o todas) a la muestra. Queda en la auditoría. */
  reset(area: ContentArea | 'all', opts?: AdminOptions): Promise<void>;
  /** Ids con cambios del Admin en un área (para marcarlos en la interfaz). */
  overridden(area: ContentArea): Promise<string[]>;
  /** Auditoría, la más nueva primero. */
  audit(filter?: { area?: string; limit?: number }): Promise<AuditEntry[]>;
  bottles(): Promise<AdminBottleView[]>;
  /** Retira una botella por moderación (REQ-ADM-027). */
  removeBottle(id: string, opts?: AdminOptions): Promise<void>;
  resolveReport(reportId: string, resolution: string): Promise<void>;
  /** Retira una recompensa con una compensación auditada (REQ-ADM-028). */
  compensate(txId: string, reason: string): Promise<LedgerEntry>;
}
