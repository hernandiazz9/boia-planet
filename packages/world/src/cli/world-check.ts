/**
 * `pnpm world:check`: tabla de skins por mundo sobre el mapa compartido
 * (D-20). Sale con 1 si a algún mundo le falta la skin o el arte de un
 * lugar, o si una skin nombra un lugar que no está en el mapa.
 *
 * Sin argumentos revisa `WORLD_REGISTRY`. Con `--registro <módulo>` revisa el
 * `registry` que exporte ese módulo (las pruebas lo usan con un fixture).
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SkinError } from '../worlds/compose';
import { checkWorlds, formatCheck } from '../worlds/check';
import type { WorldRegistry } from '../worlds/registry';

const ART = fileURLToPath(new URL('../../../../art/', import.meta.url));

const assetExists = (id: string) =>
  !id.startsWith('placeholder:') && existsSync(path.join(ART, id, 'manifest.json'));

async function loadRegistry(args: string[]): Promise<WorldRegistry> {
  const i = args.indexOf('--registro');
  if (i < 0) return (await import('../worlds/catalog')).WORLD_REGISTRY;
  const file = args[i + 1];
  if (!file) throw new Error('--registro necesita la ruta de un módulo');
  const mod = (await import(pathToFileURL(path.resolve(file)).href)) as {
    registry?: WorldRegistry;
  };
  if (!mod.registry) throw new Error(`${file} no exporta «registry»`);
  return mod.registry;
}

try {
  const registry = await loadRegistry(process.argv.slice(2));
  const report = checkWorlds(registry, assetExists);
  console.log(formatCheck(report, registry.map.id));
  process.exitCode = report.ok ? 0 : 1;
} catch (err) {
  if (err instanceof SkinError) {
    console.error('world:check FALLA: skins que no encajan con el mapa compartido');
    for (const i of err.issues) console.error(`  [${i.worldId}] ${i.placeId}: ${i.message}`);
  } else {
    console.error(err);
  }
  process.exitCode = 1;
}
