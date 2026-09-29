import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BrandLogo } from './brand-logo';

/** Marca de Álvaro vectorizada (T50): art/marca/ (trazar_marca.py); la web lleva copias de logo/. */
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const ART = '../../../../../art/marca/';

describe('logo de BOIA (T50)', () => {
  it('las copias de la web son las variantes logo de art/marca/logo/ (sin retoques a mano)', () => {
    expect(read('../_marca/boia-wordmark.svg')).toBe(read(`${ART}logo/boia-wordmark.svg`));
    expect(read('../_marca/boia-mascota.svg')).toBe(read(`${ART}logo/boia-mascota.svg`));
    // El favicon es la mascota.
    expect(read('../../icon.svg')).toBe(read(`${ART}logo/boia-mascota.svg`));
  });

  it('el wordmark trae una letra por <path> y es el que extruye el título 3D', () => {
    const svg = read(`${ART}boia-wordmark.svg`);
    const ids = [...svg.matchAll(/<path id="([^"]+)"/g)].map((m) => m[1]).join('');
    const manifest = JSON.parse(read('../../../../../art/intro/titulo/manifest.json')) as {
      text: string;
      shape: string;
      generator: { scripts: string[] };
    };
    expect(ids).toBe(manifest.text);
    expect(manifest.shape).toBe('art/marca/boia-wordmark.svg');
    expect(manifest.generator.scripts).toContain(manifest.shape);
  });

  it('el logo del pie se nombra; el de la cabecera es decorativo (el enlace ya se nombra)', () => {
    const footer = renderToStaticMarkup(
      createElement(BrandLogo, { size: 'footer', label: 'BOIA.PLANET' }),
    );
    expect(footer).toContain('role="img"');
    expect(footer).toContain('aria-label="BOIA.PLANET"');
    const header = renderToStaticMarkup(createElement(BrandLogo));
    expect(header).toContain('aria-hidden="true"');
    expect(header).not.toContain('role=');
  });
});
