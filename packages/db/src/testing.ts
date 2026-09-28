/**
 * Ayudas para las pruebas de vitest: una base propia por archivo de pruebas
 * (boia_planet_test_v<pid>_<aleatorio>, así varias ejecuciones en paralelo no se
 * pisan) y ejecución como anon, authenticated o service_role con los claims
 * que PostgREST pondría, dentro de una transacción que siempre se deshace.
 */
import { randomBytes } from 'node:crypto';
import type pg from 'pg';
import { dropDatabase, freshDatabase } from './harness.ts';

export interface TestDatabase {
  name: string;
  client: pg.Client;
  close(): Promise<void>;
}

export async function openTestDatabase(): Promise<TestDatabase> {
  const name = `boia_planet_test_v${process.pid}_${randomBytes(4).toString('hex')}`;
  let client: pg.Client;
  try {
    client = await freshDatabase(name, { seed: true, fixtures: true });
  } catch (err) {
    // Si falla una migración, afterAll no llega a borrar la base.
    await dropDatabase(name);
    throw err;
  }
  return {
    name,
    client,
    async close() {
      await client.end();
      await dropDatabase(name);
    },
  };
}

export type Identity =
  | { role: 'anon' }
  | { role: 'service_role' }
  | { role: 'authenticated'; sub: string; aal?: 'aal1' | 'aal2'; isAnonymous?: boolean };

export const USERS = {
  member: 'f0000000-0000-4000-8000-000000000001',
  member2: 'f0000000-0000-4000-8000-000000000002',
  guest: 'f0000000-0000-4000-8000-000000000003',
  owner: 'f0000000-0000-4000-8000-000000000009',
} as const;

export const anon: Identity = { role: 'anon' };
export const service: Identity = { role: 'service_role' };
export const member = (sub: string = USERS.member): Identity => ({ role: 'authenticated', sub });
export const guest: Identity = { role: 'authenticated', sub: USERS.guest, isAnonymous: true };
export const staff = (sub: string, aal: 'aal1' | 'aal2' = 'aal2'): Identity => ({
  role: 'authenticated',
  sub,
  aal,
});

function claims(id: Identity): Record<string, unknown> {
  if (id.role !== 'authenticated') return { role: id.role };
  return {
    role: 'authenticated',
    sub: id.sub,
    aal: id.aal ?? 'aal1',
    is_anonymous: id.isAnonymous ?? false,
  };
}

/**
 * Ejecuta `fn` como `id` y deshace todo al terminar. `setup` corre antes con
 * el rol dueño (p. ej. para crear una cuenta de editor).
 */
export async function as<T>(
  client: pg.Client,
  id: Identity,
  fn: (q: pg.Client) => Promise<T>,
  setup?: string,
): Promise<T> {
  await client.query('begin');
  try {
    if (setup) await client.query(setup);
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(claims(id)),
    ]);
    await client.query(`set local role ${id.role}`);
    return await fn(client);
  } finally {
    await client.query('rollback');
  }
}

/** Código SQLSTATE del error que lanza `p`, o null si no falla. */
export async function sqlstate(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (err) {
    return (err as { code?: string }).code ?? 'unknown';
  }
}

/**
 * Ejecuta una sentencia dentro de un savepoint: si falla, devuelve su
 * SQLSTATE y la transacción sigue utilizable con el mismo rol y claims.
 */
export async function attempt(
  q: pg.Client,
  sql: string,
  params: unknown[] = [],
): Promise<{ code: string | null; rowCount: number }> {
  await q.query('savepoint attempt');
  try {
    const r = await q.query(sql, params);
    await q.query('release savepoint attempt');
    return { code: null, rowCount: r.rowCount ?? 0 };
  } catch (err) {
    await q.query('rollback to savepoint attempt');
    return { code: (err as { code?: string }).code ?? 'unknown', rowCount: 0 };
  }
}

export const PERMISSION_DENIED = '42501'; // también «row-level security policy»
export const UNIQUE_VIOLATION = '23505';
export const CHECK_VIOLATION = '23514';

/** Crea una cuenta con rol del equipo (dentro de la transacción de `as`). */
export function staffSetup(sub: string, role: 'editor' | 'admin' | 'owner'): string {
  return `
    insert into auth.users (id, email) values ('${sub}', '${role}@example.test');
    insert into public.staff_roles (user_id, role) values ('${sub}', '${role}');
  `;
}
