import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GLOBE_COLORS } from './globe';
import { C } from './palette';

/**
 * Los colores de la marca (T50) también en el mar 3D (T51): el naranja y el
 * azul de /mar son los tokens de `globals.css`, y el CSS de /mar los usa.
 */

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const token = (css: string, name: string) =>
  new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1]?.toLowerCase();

const globals = read('../../globals.css');
const marCss = read('../mar.css');

describe('marca en /mar', () => {
  it('el naranja y el azul de las piezas 3D son los de la marca', () => {
    expect(C.orange.toLowerCase()).toBe(token(globals, '--boia-orange'));
    expect(C.purple.toLowerCase()).toBe(token(globals, '--boia-blue'));
    expect(GLOBE_COLORS.accent.toLowerCase()).toBe(token(globals, '--boia-orange'));
  });

  it('los tokens del CSS de /mar son los de la marca', () => {
    expect(token(marCss, '--orange')).toBe(token(globals, '--boia-orange'));
    expect(token(marCss, '--orange-2')).toBe(token(globals, '--boia-orange-bright'));
    expect(token(marCss, '--purple')).toBe(token(globals, '--boia-blue'));
  });
});
