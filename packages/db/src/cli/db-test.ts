/**
 * `pnpm db:test`: prueba las migraciones contra el PostgreSQL local (D-17).
 *
 * 1. Base vacía `boia_planet_test` + shim + todas las migraciones.
 * 2. Comprobaciones estáticas: RLS en todas las tablas de public y ningún
 *    permiso de escritura de cliente sobre saldos, roles, sellos, compras,
 *    libro, auditoría ni estado de evento.
 * 3. Muestra: siembra, retira con supabase/sample/remove-sample.sql (no
 *    queda ninguna fila is_sample) y vuelve a sembrar; añade los fixtures.
 *    Repetir migraciones no aplica nada; repetir semillas no cambia filas.
 * 4. Camino de actualización, para cada corte k: migraciones hasta k, datos
 *    hasta k, y después las migraciones nuevas encima de esos datos, sin
 *    reiniciar nada: ninguna tabla pierde filas.
 *
 * La base se crea y se borra aquí; sólo se tocan bases boia_planet_test*.
 */
import { readFileSync } from 'node:fs';
import type pg from 'pg';
import {
  FIXTURES_DIR,
  REMOVE_SAMPLE_SQL,
  SEEDS_DIR,
  TEST_DB,
  applyDataFiles,
  applyShim,
  connect,
  dropDatabase,
  listMigrations,
  migrate,
  recreateDatabase,
  rowCounts,
} from '../harness.ts';
import { clientWriteLeaks, tablesWithoutRls } from '../checks.ts';

const DATA_DIRS = [SEEDS_DIR, FIXTURES_DIR];
let checks = 0;

function check(cond: boolean, message: string): void {
  if (!cond) throw new Error(message);
  checks += 1;
}

async function sampleRows(client: pg.Client): Promise<number> {
  const { rows } = await client.query<{ table_name: string }>(
    `select table_name from information_schema.columns
     where table_schema = 'public' and column_name = 'is_sample'`,
  );
  let total = 0;
  for (const { table_name } of rows) {
    const r = await client.query<{ n: string }>(
      `select count(*) as n from public."${table_name}" where is_sample`,
    );
    total += Number(r.rows[0]!.n);
  }
  return total;
}

function sameCounts(a: Map<string, number>, b: Map<string, number>): string[] {
  return [...a].filter(([t, n]) => b.get(t) !== n).map(([t, n]) => `${t}: ${n} → ${b.get(t)}`);
}

async function fullRun(): Promise<void> {
  await recreateDatabase(TEST_DB);
  const client = await connect(TEST_DB);
  try {
    await applyShim(client);
    const applied = await migrate(client);
    const all = listMigrations();
    check(
      applied.length === all.length,
      `se aplicaron ${applied.length} de ${all.length} migraciones`,
    );
    console.log(`[vacía] ${applied.length} migraciones aplicadas a ${TEST_DB}`);

    const noRls = await tablesWithoutRls(client);
    check(noRls.length === 0, `tablas sin RLS: ${noRls.join(', ')}`);
    const leaks = await clientWriteLeaks(client);
    check(
      leaks.length === 0,
      `permisos de escritura de cliente indebidos:\n  ${leaks.join('\n  ')}`,
    );
    console.log(
      '[vacía] RLS en todas las tablas; sin escrituras de cliente sobre datos protegidos',
    );

    await applyDataFiles(client, SEEDS_DIR);
    const seeded = await sampleRows(client);
    check(seeded > 0, 'la semilla no creó filas de muestra');
    await client.query(readFileSync(REMOVE_SAMPLE_SQL, 'utf8'));
    check((await sampleRows(client)) === 0, 'quedan filas de muestra tras remove-sample.sql');
    await applyDataFiles(client, SEEDS_DIR);
    check((await sampleRows(client)) === seeded, 'volver a sembrar no repone la muestra');
    console.log(`[muestra] ${seeded} filas is_sample: retiradas y repuestas`);

    await applyDataFiles(client, FIXTURES_DIR);
    const before = await rowCounts(client);
    check((await migrate(client)).length === 0, 'repetir las migraciones aplicó algo');
    await applyDataFiles(client, DATA_DIRS);
    const diff = sameCounts(before, await rowCounts(client));
    check(diff.length === 0, `repetir semillas y fixtures cambió filas: ${diff.join(', ')}`);
    const empty = [...before].filter(([, n]) => n === 0).map(([t]) => t);
    console.log(
      `[repetir] 0 migraciones y 0 filas nuevas; ${before.size} tablas, vacías: ${empty.join(', ') || 'ninguna'}`,
    );
  } finally {
    await client.end();
  }
}

async function upgradeRun(cut: number): Promise<void> {
  const migrations = listMigrations();
  const base = migrations[cut - 1]!.version;
  await recreateDatabase(TEST_DB);
  const client = await connect(TEST_DB);
  try {
    await applyShim(client);
    await migrate(client, base);
    await applyDataFiles(client, DATA_DIRS, { upto: base });
    const before = await rowCounts(client);
    const applied = await migrate(client);
    check(
      applied.length === migrations.length - cut,
      `corte ${cut}: se aplicaron ${applied.length} de ${migrations.length - cut} migraciones nuevas`,
    );
    const after = await rowCounts(client);
    const lost = [...before].filter(([t, n]) => (after.get(t) ?? 0) < n).map(([t]) => t);
    check(
      lost.length === 0,
      `corte ${cut}: las migraciones nuevas borraron filas de ${lost.join(', ')}`,
    );
    await applyDataFiles(client, DATA_DIRS, { after: base });
    const rows = [...before.values()].reduce((a, b) => a + b, 0);
    console.log(
      `[actualizar] hasta ${base} con ${rows} filas + ${applied.length} migraciones nuevas: sin pérdida`,
    );
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const t0 = performance.now();
  try {
    await fullRun();
    const n = listMigrations().length;
    for (let cut = 1; cut < n; cut += 1) await upgradeRun(cut);
  } finally {
    await dropDatabase(TEST_DB);
  }
  const ms = Math.round(performance.now() - t0);
  console.log(
    `db:test OK — ${checks} comprobaciones, ${listMigrations().length} migraciones, ${ms} ms`,
  );
}

main().catch((err: unknown) => {
  console.error(`db:test FALLA — ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
