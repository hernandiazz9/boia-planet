/**
 * Vocabulario del progreso: los mismos enums que el esquema de T06
 * (`packages/db`, supabase/migrations). La capa local de la demo
 * (`@boia/store`) y la futura de Supabase hablan con estos nombres; una
 * prueba de `@boia/store` los compara con `Constants` de `@boia/db`.
 */

/** Tipos de transacción del libro (tabla `ledger_transactions`, REQ-ARQ-007). */
export const LEDGER_KINDS = [
  'world_reward',
  'achievement',
  'stamp',
  'cosmetic',
  'adjustment',
  'compensation',
] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

/** Catálogo de condiciones de logro (REQ-ADM-021). */
export const ACHIEVEMENT_TRIGGERS = [
  'visit_island',
  'find_buoy',
  'collect_objects',
  'complete_circuit',
  'time_played',
  'buy_ticket',
  'rescue_character',
  'deliver_character',
] as const;
export type AchievementTrigger = (typeof ACHIEVEMENT_TRIGGERS)[number];

export const ACHIEVEMENT_SCOPES = ['global', 'season'] as const;
export type AchievementScope = (typeof ACHIEVEMENT_SCOPES)[number];

/** active: visible · retired: la retira su autor · removed: moderación. */
export const BOTTLE_STATUSES = ['active', 'retired', 'removed'] as const;
export type BottleStatus = (typeof BOTTLE_STATUSES)[number];

export const PURCHASE_STATUSES = ['pending', 'confirmed', 'refunded', 'cancelled'] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];
