import type { Metadata } from 'next';
import { t } from '../../lib/i18n';
import { resolveBlock, resolveTicketsPanel } from '../../lib/landing/resolve';
import { SAMPLE_CONTENT } from '../../lib/landing/sample-content';
import { HomeBlocks } from './components/blocks';
import { LandingClient } from './components/landing-client';
import { SiteHeader } from './components/site-header';
import { TicketsPanel } from './components/tickets-panel';

export const metadata: Metadata = {
  title: t('site.title'),
  description: t('site.description'),
};

/** id de ancla de cada tipo de bloque, para enlazar sólo secciones que existen. */
const ANCHORS: Partial<Record<string, string>> = {
  artists: 'artistas',
  philosophy: 'filosofia',
  store: 'tienda',
  photos: 'fotos',
};

export default function LandingPage() {
  // Hasta T10 la home sale de datos de muestra; luego, de lo publicado en Supabase.
  const content = SAMPLE_CONTENT;
  const now = new Date();

  const main = content.blocks.filter((b) => b.type !== 'footer');
  const footer = content.blocks.filter((b) => b.type === 'footer');
  const sections = new Set(
    main
      .filter((b) => resolveBlock(b, content, now) !== null)
      .map((b) => ANCHORS[b.type])
      .filter((a): a is string => a !== undefined),
  );
  const tickets = resolveTicketsPanel(content, now);

  return (
    <>
      <SiteHeader sections={sections} />
      <main id="contenido" tabIndex={-1}>
        <HomeBlocks blocks={main} content={content} now={now} />
      </main>
      <HomeBlocks blocks={footer} content={content} now={now} />
      <TicketsPanel
        featured={tickets.featured}
        others={tickets.others}
        onSale={tickets.onSale}
        artists={content.artists}
      />
      <LandingClient />
    </>
  );
}
