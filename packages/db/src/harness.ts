/**
 * Arnés de base de datos para el PostgreSQL 17 local (D-17): crea y borra
 * bases de prueba, aplica el shim de Supabase, las migraciones de
 * `supabase/migrations/` y los archivos de datos (semillas y fixtures).
 *
 * Sólo crea o borra bases cuyo nombre empieza por `boia_planet_test`: nunca
 * toca otras bases del servidor.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const MIGRATIONS_DIR = `${REPO_ROOT}supabase/migrations`;
export const SEEDS_DIR = `${REPO_ROOT}supabase/seeds`;
export const REMOVE_SAMPLE_SQL = `${REPO_ROOT}supabase/sample/remove-sample.sql`;
export const SHIM_SQL = fileURLToPath(new URL('../sql/supabase-shim.sql', import.meta.url));
export const FIXTURES_DIR = fileURLToPath(new URL('../sql/fixtures', import.meta.url));

export const TEST_DB = 'boia_planet_test';
const TEST_DB_PATTERN = /^boia_planet_test(_[a-z0-9_]+)?$/;

/** Servidor local. `BOIA_PG_URL` apunta a otro sin tocar el código. */
export function serverUrl(): URL {
  return new URL(process.env.BOIA_PG_URL ?? 'postgresql://localhost:5432/postgres');
}

export function databaseUrl(database: string): string {
  const url = serverUrl();
  url.pathname = `/${database}`;
  return url.toString();
}

function assertTestDb(name: string): void {
  if (!TEST_DB_PATTERN.test(name)) {
    throw new Error(`Nombre de base no permitido: ${name} (sólo boia_planet_test*)`);
  }
}

async function withMaintenance<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: serverUrl().toString() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function dropDatabase(name: string): Promise<void> {
  assertTestDb(name);
  await withMaintenance((c) => c.query(`drop database if exists "${name}" with (force)`));
}

/** Borra la base si existe y la crea vacía. */
export async function recreateDatabase(name: string): Promise<void> {
  assertTestDb(name);
  await dropDatabase(name);
  await withMaintenance((c) => c.query(`create database "${name}"`));
}

export async function connect(database: string): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: databaseUrl(database) });
  await client.connect();
  // Los NOTICE de `if not exists` no aportan nada en la salida de las pruebas.
  await client.query(`set client_min_messages = warning`);
  return client;
}

export interface SqlFile {
  /** Prefijo numérico de 14 cifras (fecha y hora), como en Supabase. */
  version: string;
  name: string;
  path: string;
}

const FILE_PATTERN = /^(\d{14})_([a-z0-9_]+)\.sql$/;

/** Archivos `<version>_<nombre>.sql` de un directorio, en orden. */
export function listSqlFiles(dir: string): SqlFile[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries
    .filter((f) => f.endsWith('.sql'))
    .map((f) => {
      const m = FILE_PATTERN.exec(f);
      if (!m) throw new Error(`Nombre de archivo SQL inválido: ${dir}/${f}`);
      return { version: m[1]!, name: m[2]!, path: `${dir}/${f}` };
    })
    .sort((a, b) => a.version.localeCompare(b.version) || a.name.localeCompare(b.name));
}

export function listMigrations(): SqlFile[] {
  return listSqlFiles(MIGRATIONS_DIR);
}

export async function applyShim(client: pg.Client): Promise<void> {
  await client.query(readFileSync(SHIM_SQL, 'utf8'));
}

/**
 * Aplica las migraciones pendientes hasta `upto` (incluida) y las registra en
 * `supabase_migrations.schema_migrations`, la misma tabla que usa la CLI de
 * Supabase. Cada migración va en su propia transacción. Devuelve las
 * versiones aplicadas.
 */
export async function migrate(client: pg.Client, upto?: string): Promise<string[]> {
  await client.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text
    );
  `);
  const { rows } = await client.query<{ version: string }>(
    'select version from supabase_migrations.schema_migrations',
  );
  const done = new Set(rows.map((r) => r.version));
  const applied: string[] = [];
  for (const m of listMigrations()) {
    if (upto !== undefined && m.version > upto) break;
    if (done.has(m.version)) continue;
    const sql = readFileSync(m.path, 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query(
        'insert into supabase_migrations.schema_migrations (version, statements, name) values ($1, $2, $3)',
        [m.version, [sql], m.name],
      );
      await client.query('commit');
    } catch (err) {
      await client.query('rollback');
      throw new Error(`Falla la migración ${m.version}_${m.name}: ${(err as Error).message}`, {
        cause: err,
      });
    }
    applied.push(m.version);
  }
  return applied;
}

/**
 * Aplica los archivos de datos de un directorio cuyo prefijo cae en
 * (`after`, `upto`]. El prefijo de cada archivo es la versión de la
 * migración que necesita. Los archivos son reejecutables (on conflict).
 */
export async function applyDataFiles(
  client: pg.Client,
  dirs: string | string[],
  range: { after?: string; upto?: string } = {},
): Promise<string[]> {
  // Con varios directorios, a igual versión va primero el que se pasa antes
  // (las semillas antes que los fixtures que dependen de ellas).
  const files = (Array.isArray(dirs) ? dirs : [dirs])
    .flatMap((d, i) => listSqlFiles(d).map((f) => ({ ...f, order: i })))
    .sort((a, b) => a.version.localeCompare(b.version) || a.order - b.order);
  const applied: string[] = [];
  for (const f of files) {
    if (range.after !== undefined && f.version <= range.after) continue;
    if (range.upto !== undefined && f.version > range.upto) continue;
    try {
      await client.query(readFileSync(f.path, 'utf8'));
    } catch (err) {
      throw new Error(`Falla ${f.path}: ${(err as Error).message}`, { cause: err });
    }
    applied.push(`${f.version}_${f.name}`);
  }
  return applied;
}

/** Base nueva con shim y todas las migraciones. Devuelve un cliente abierto. */
export async function freshDatabase(
  name: string,
  opts: { seed?: boolean; fixtures?: boolean } = {},
): Promise<pg.Client> {
  await recreateDatabase(name);
  const client = await connect(name);
  try {
    await applyShim(client);
    await migrate(client);
    const dirs = [...(opts.seed ? [SEEDS_DIR] : []), ...(opts.fixtures ? [FIXTURES_DIR] : [])];
    if (dirs.length > 0) await applyDataFiles(client, dirs);
  } catch (err) {
    await client.end();
    throw err;
  }
  return client;
}

/** Filas por tabla del esquema public. */
export async function rowCounts(client: pg.Client): Promise<Map<string, number>> {
  const { rows } = await client.query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`,
  );
  const counts = new Map<string, number>();
  for (const { table_name } of rows) {
    const r = await client.query<{ n: string }>(`select count(*) as n from public."${table_name}"`);
    counts.set(table_name, Number(r.rows[0]!.n));
  }
  return counts;
}
