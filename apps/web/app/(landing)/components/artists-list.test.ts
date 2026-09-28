import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../lib/barco/load';
import { SAMPLE_CONTENT } from '../../../lib/landing/sample-content';
import { ArtistsList } from './artists-list';

const escape = (s: string) => s.replace(/&/g, '&amp;');

/** La lista provisional de v14 §18.1, leída del documento maestro: «- Nombre — Género, Género». */
function v14Artists(): Array<{ name: string; genres: string[] }> {
  const text = readFileSync(path.join(repoRoot(), 'docs/fuente/v14-maestro.md'), 'utf8');
  const start = text.indexOf('## 18.1 ');
  const section = text.slice(start, text.indexOf('\n#', start + 1));
  return [...section.matchAll(/^- (.+?) — (.+)$/gm)].map((m) => ({
    name: m[1]!.trim(),
    genres: m[2]!.split(',').map((g) => g.trim()),
  }));
}

describe('/artistas: la lista completa', () => {
  const html = renderToStaticMarkup(
    createElement(ArtistsList, { artists: SAMPLE_CONTENT.artists }),
  );

  it('pinta cada artista de su fuente de datos, una vez, con sus géneros', () => {
    expect(html.match(/<li /g)?.length).toBe(SAMPLE_CONTENT.artists.length);
    for (const a of SAMPLE_CONTENT.artists) {
      expect(html).toContain(`data-artist="${a.id}"`);
      expect(html).toContain(`>${escape(a.name)}</h3>`);
      expect(html).toContain(escape(a.genres.join(', ')));
    }
    // Avatar neutro: ninguna foto mientras no haya aprobadas.
    expect(html).not.toContain('<img');
  });

  it('los datos son los de v14 §18.1, textuales', () => {
    const v14 = v14Artists();
    expect(v14.length).toBeGreaterThan(0);
    expect(SAMPLE_CONTENT.artists.map((a) => ({ name: a.name, genres: a.genres }))).toEqual(v14);
    expect(html).toContain(`${v14.length} artistas`);
  });

  it('va de la A a la Z', () => {
    const names = [...html.matchAll(/<h3 class="artist-card__name">(.+?)<\/h3>/g)].map((m) => m[1]);
    expect(names).toEqual([...names].sort((a, b) => a!.localeCompare(b!, 'es')));
  });
});
