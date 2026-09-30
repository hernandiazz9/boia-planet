import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: script de Node sin tipos
import { parseZonas, ZONAS_MD } from '../../scripts/i18n-zonas.mjs';
import { es, type MessageKey } from './es';
import { esWeb } from './es-web';
import { esEventos } from './eventos';
import { t } from './index';

const rows: { key: string; text: string }[] = parseZonas(readFileSync(ZONAS_MD, 'utf8'));

describe('textos-zonas.md en el catálogo i18n (REQ-ARQ-020, T49)', () => {
  it('cada clave del documento está en el catálogo con su texto', () => {
    expect(rows.length).toBeGreaterThan(0);
    const wrong = rows.filter(({ key, text }) => es[key as MessageKey] !== text);
    // Si falla: `node apps/web/scripts/i18n-zonas.mjs` vuelve a copiar el documento.
    expect(wrong).toEqual([]);
  });

  it('las variables del documento se sustituyen', () => {
    const row = rows.find((r) => /\{\w+\}/.test(r.text))!;
    const name = row.text.match(/\{(\w+)\}/)![1]!;
    expect(t(row.key as MessageKey, { [name]: 'X' })).not.toContain(`{${name}}`);
  });

  it('las partes de la web pública dicen lo mismo que el catálogo entero', () => {
    const differ = Object.entries({ ...esWeb, ...esEventos }).filter(
      ([k, v]) => es[k as MessageKey] !== v,
    );
    expect(differ).toEqual([]);
  });

  it('ninguna cadena del catálogo está vacía', () => {
    expect(Object.entries(es).filter(([, v]) => !v.trim())).toEqual([]);
  });
});
