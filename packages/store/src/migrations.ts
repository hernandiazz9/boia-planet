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

export const MIGRATIONS: readonly Migration[] = [];

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
