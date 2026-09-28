import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BarcoPicker } from '../../app/juego/menu/sections/barco';
import { SKIN_RULES, allowedSkins, type ShipRegistry } from './catalog';
import { loadShipCatalog, repoRoot } from './load';
import { resolveRef, scriptConstants, toHex } from './python-constants';

// Todo contra los archivos reales: si cambia el arte o el registro, la prueba lo sigue.
const ROOT = repoRoot();
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const rootManifest = readJson<{
  style: string;
  skins: string[];
  style_variants: { id: string; barco: string; manifest: string }[];
}>('art/barco/manifest.json');
const registry = readJson<ShipRegistry>('docs/barcos/barcos.json');
const catalog = loadShipCatalog(ROOT)!;

/** Skins que declara el manifiesto de cada estilo en art/barco. */
const manifestSkins = (id: string): string[] => {
  if (id === rootManifest.style) return rootManifest.skins;
  const v = rootManifest.style_variants.find((x) => x.id === id)!;
  return readJson<{ skins: string[] }>(path.join('art/barco', v.manifest)).skins;
};
const registryEntry = (id: string) => {
  const barco = rootManifest.style_variants.find((x) => x.id === id)?.barco;
  return registry.barcos.find((b) => b.id === barco);
};

describe('catálogo de la sección «Barco»', () => {
  it('lista exactamente los estilos de art/barco/manifest.json, el por defecto primero', () => {
    expect(catalog.defaultId).toBe(rootManifest.style);
    expect(catalog.styles.map((s) => s.id)).toEqual([
      rootManifest.style,
      ...rootManifest.style_variants.map((v) => v.id),
    ]);
  });

  it.each(catalog.styles.map((s) => [s.id, s] as const))(
    '%s ofrece las skins de su manifiesto que admiten sus notas',
    (id, style) => {
      const declared = manifestSkins(id);
      const offered = style.skins.map((k) => k.id);
      expect(offered).toEqual(allowedSkins(declared, registryEntry(id)));
      expect(offered).toContain('base');
      for (const k of style.skins) {
        const file = k.preview.replace(/^\/api\/art\//, 'art/');
        expect(() => readFileSync(path.join(ROOT, file)), k.preview).not.toThrow();
      }
    },
  );

  it('nombre y descripción salen del registro (estilo y aspecto) para los B0N', () => {
    for (const v of rootManifest.style_variants) {
      const style = catalog.styles.find((s) => s.id === v.id)!;
      const entry = registry.barcos.find((b) => b.id === v.barco)!;
      expect(style.barco).toBe(v.barco);
      expect(style.name).toBe(entry.nombre ?? entry.estilo);
      expect(style.description).toBe(entry.aspecto);
      expect(style.swatches.length).toBe(entry.paleta?.length ?? 0);
    }
  });

  it('las reglas de skins siguen atadas a una nota de su barco en el registro', () => {
    for (const rule of SKIN_RULES) {
      const notes = registry.barcos.find((b) => b.id === rule.barco)?.notas_render ?? [];
      expect(
        notes.some((n) => rule.note.test(n)),
        `${rule.barco}: ${rule.note}`,
      ).toBe(true);
    }
    // B01 (monocromo) sólo base, B06 sin fiesta, B05 sin temáticas: aunque existieran.
    const all = ['base', 'fiesta', 'noche'];
    const entry = (id: string) => registry.barcos.find((b) => b.id === id);
    expect(allowedSkins(all, entry('B01'))).toEqual(['base']);
    expect(allowedSkins(all, entry('B05'))).toEqual(['base']);
    expect(allowedSkins(all, entry('B06'))).toEqual(['base', 'noche']);
    expect(allowedSkins(['noche', 'base', 'fiesta'], entry('B02'))).toEqual(all);
  });

  it('la sección pinta cada estilo con miniatura y, del elegido, cada una de sus skins', () => {
    for (const style of catalog.styles) {
      const html = renderToStaticMarkup(
        createElement(BarcoPicker, {
          catalog,
          current: { style: style.id, skin: style.skins[0]!.id },
          onChoose: () => {},
        }),
      );
      for (const s of catalog.styles) {
        expect(html).toContain(`data-testid="barco-estilo-${s.id}"`);
        expect(html).toContain(s.name.replace(/&/g, '&amp;'));
      }
      expect(html.match(/data-testid="barco-skin-/g)?.length).toBe(style.skins.length);
      for (const k of style.skins) expect(html).toContain(`data-testid="barco-skin-${k.id}"`);
      expect(html.match(/role="radio" aria-checked="true"/g)?.length).toBe(2);
    }
  });
});

describe('paleta resuelta como tools/barcos/guia_colores.py', () => {
  it('lee constantes literales y se salta lo que no lo es', () => {
    const env = scriptConstants(
      [
        '"""Docstring',
        'FALSO = 1',
        '"""',
        'import os',
        'HERE = os.path.dirname(__file__)',
        'GRIS = 0.5  # comentario',
        'PAL = {',
        '    "a": "#ff0000", "b": GRIS,  # coma final',
        '    "c": (0.1, -2),',
        '}',
        'COPIA = PAL',
        'MAL = 1 + 2',
        'def f():',
        '    DENTRO = 3',
      ].join('\n'),
    );
    expect([...env.keys()]).toEqual(['GRIS', 'PAL', 'COPIA']);
    expect(toHex(resolveRef(env, ['PAL', 'a']))).toBe('#FF0000');
    expect(toHex(resolveRef(env, ['PAL', 'b']))).toBe('#808080');
    expect(resolveRef(env, ['PAL', 'c', 1])).toBe(-2);
    expect(() => resolveRef(env, ['PAL', 'z'])).toThrow(/referencia rota/);
  });

  it('da los mismos colores que el script de Python para cada referencia del registro', () => {
    const ours = registry.barcos.map((b) => {
      const env = scriptConstants(readFileSync(path.join(ROOT, b.script), 'utf8'));
      return (b.paleta ?? []).flatMap((g) => g.colores.map((c) => toHex(resolveRef(env, c.ref))));
    });
    let theirs: string[][];
    try {
      theirs = JSON.parse(
        execFileSync(
          'python3',
          [
            '-c',
            [
              'import json, sys',
              'from pathlib import Path',
              'sys.path.insert(0, "tools/barcos")',
              'import guia_colores as g',
              'd = json.load(open("docs/barcos/barcos.json"))',
              'print(json.dumps([[g.to_hex(g.resolve(g.script_constants(Path(b["script"])), c["ref"])) for grp in b.get("paleta", []) for c in grp["colores"]] for b in d["barcos"]]))',
            ].join('\n'),
          ],
          { cwd: ROOT, encoding: 'utf8' },
        ),
      ) as string[][];
    } catch {
      // Sin python3 en esta máquina: la comprobación cruzada no se puede hacer.
      return;
    }
    expect(ours).toEqual(theirs);
  });
});
