'use client';

import type { HomeContent } from '@boia/contracts';
import type { ReactNode } from 'react';
import { resolveBlock, resolveTicketsPanel } from '../../../lib/landing/resolve';
import { useLiveHome } from '../../../lib/landing/use-live-home';
import { HomeBlocks } from './blocks';
import { SiteHeader } from './site-header';
import { TicketsPanel } from './tickets-panel';

/** id de ancla de cada tipo de bloque, para enlazar sólo secciones que existen. */
const ANCHORS: Partial<Record<string, string>> = {
  artists: 'artistas',
  philosophy: 'filosofia',
  store: 'tienda',
  photos: 'fotos',
};

/** Qué secciones de la cabecera existen con este contenido. */
export function landingSections(content: HomeContent, now: Date): Set<string> {
  return new Set(
    content.blocks
      .filter((b) => b.type !== 'footer')
      .filter((b) => resolveBlock(b, content, now) !== null)
      .map((b) => ANCHORS[b.type])
      .filter((a): a is string => a !== undefined),
  );
}

/**
 * Cabecera, bloques, pie y panel de Tickets de la home. El servidor los pinta
 * con la muestra; en el navegador pasan a leer el repositorio (T26), así los
 * cambios del Admin de la demo (eventos, orden y programación de bloques,
 * artistas, fotos y textos) se ven aquí. `data-contenido` dice de dónde sale
 * lo pintado (`muestra` o `repositorio`).
 */
export function LiveLanding({
  initial,
  nowIso,
  heroScene,
}: {
  initial: HomeContent;
  nowIso: string;
  heroScene: ReactNode;
}) {
  const { content, now, live } = useLiveHome(initial, nowIso);
  const main = content.blocks.filter((b) => b.type !== 'footer');
  const footer = content.blocks.filter((b) => b.type === 'footer');
  const tickets = resolveTicketsPanel(content, now);

  return (
    <>
      <SiteHeader sections={landingSections(content, now)} />
      <main id="contenido" tabIndex={-1} data-contenido={live ? 'repositorio' : 'muestra'}>
        <HomeBlocks blocks={main} content={content} now={now} heroScene={heroScene} />
      </main>
      <HomeBlocks blocks={footer} content={content} now={now} />
      <TicketsPanel
        featured={tickets.featured}
        others={tickets.others}
        onSale={tickets.onSale}
        artists={content.artists}
      />
    </>
  );
}
