/**
 * `pnpm db:types`: aplica las migraciones a una base temporal y escribe
 * packages/db/src/database.types.ts. Una prueba comprueba que el archivo
 * versionado coincide con lo que generan las migraciones actuales.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateTypes } from '../gen-types.ts';
import { dropDatabase, freshDatabase } from '../harness.ts';

const OUT = fileURLToPath(new URL('../database.types.ts', import.meta.url));
const DB = 'boia_planet_test_types';

async function main(): Promise<void> {
  const client = await freshDatabase(DB);
  try {
    writeFileSync(OUT, await generateTypes(client));
    console.log(`db:types → ${OUT}`);
  } finally {
    await client.end();
    await dropDatabase(DB);
  }
}

main().catch((err: unknown) => {
  console.error(`db:types FALLA — ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
