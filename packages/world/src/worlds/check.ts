import type { WorldRegistry } from './registry';

/**
 * `pnpm world:check`, sin E/S: para cada mundo registrado, el estado de cada
 * lugar del mapa compartido. Falla si a algún mundo le falta la skin de un
 * lugar (o su arte no está en `art/`) o si una skin nombra un lugar que no
 * existe (eso ya lo rechaza el registro; aquí se informa igual).
 */

export type CheckStatus = 'ok' | 'sin-skin' | 'sin-arte' | 'oculto';

export interface CheckRow {
  placeId: string;
  category: string;
  name: string;
  status: CheckStatus;
  asset: string | null;
}

export interface WorldCheck {
  worldId: string;
  worldName: string;
  shipStyle: string;
  rows: CheckRow[];
  /** Assets de mundo (costas) que faltan en `art/`. */
  missingWorldAssets: string[];
}

export interface CheckReport {
  worlds: WorldCheck[];
  ok: boolean;
}

/** ¿Existe `art/<asset>/manifest.json`? Los marcadores `placeholder:` cuentan como que no. */
export type AssetExists = (assetId: string) => boolean;

export function checkWorlds(registry: WorldRegistry, assetExists: AssetExists): CheckReport {
  const categories = new Map(registry.map.places.map((p) => [p.id, p.category]));
  const worlds = registry.ids().map((id): WorldCheck => {
    const w = registry.get(id);
    const rows = w.places.map((p): CheckRow => {
      let status: CheckStatus;
      if (p.status === 'hidden') status = 'oculto';
      else if (p.status === 'missing' || p.asset === null) status = 'sin-skin';
      else status = assetExists(p.asset) ? 'ok' : 'sin-arte';
      return {
        placeId: p.id,
        category: categories.get(p.id) ?? '?',
        name: p.name,
        status,
        asset: p.asset,
      };
    });
    const coast = w.config.coast?.asset;
    return {
      worldId: id,
      worldName: w.theme.name,
      shipStyle: w.theme.ship.style,
      rows,
      missingWorldAssets: coast && !assetExists(coast) ? [coast] : [],
    };
  });
  const ok = worlds.every(
    (w) =>
      w.missingWorldAssets.length === 0 &&
      w.rows.every((r) => r.status === 'ok' || r.status === 'oculto'),
  );
  return { worlds, ok };
}

const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - [...s].length));

/** El informe como texto: una tabla por mundo y un resumen. */
export function formatCheck(report: CheckReport, mapId: string): string {
  const out: string[] = [`Mapa compartido «${mapId}»`];
  for (const w of report.worlds) {
    const header = ['lugar', 'tipo', 'estado', 'asset', 'nombre'];
    const cells = w.rows.map((r) => [r.placeId, r.category, r.status, r.asset ?? '—', r.name]);
    const widths = header.map((h, i) =>
      Math.max([...h].length, ...cells.map((c) => [...c[i]!].length)),
    );
    const line = (c: string[]) =>
      c
        .map((x, i) => pad(x, widths[i]!))
        .join('  ')
        .trimEnd();
    const bad = w.rows.filter((r) => r.status === 'sin-skin' || r.status === 'sin-arte').length;
    out.push(
      '',
      `Mundo ${w.worldId} (${w.worldName}) · barco ${w.shipStyle} · ${w.rows.length} lugares, ${bad} sin skin`,
      line(header),
      line(widths.map((n) => '-'.repeat(n))),
      ...cells.map(line),
    );
    for (const a of w.missingWorldAssets) out.push(`  falta el arte del mundo: ${a}`);
  }
  out.push('', report.ok ? 'world:check OK' : 'world:check FALLA: hay lugares sin skin o sin arte');
  return out.join('\n');
}
