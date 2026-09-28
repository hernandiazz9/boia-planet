import { bootScript } from '@boia/engine/intro';
import type { Metadata } from 'next';
import { t } from '../../lib/i18n';
import { loadIntroData, stillCss } from '../../lib/intro/load';
import { resolveBlock, resolveTicketsPanel } from '../../lib/landing/resolve';
import { SAMPLE_CONTENT } from '../../lib/landing/sample-content';
import { HomeBlocks } from './components/blocks';
import { IntroStage } from './components/intro-stage';
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
  // Entrada cinemática (T03): recursos de art/ leídos al construir la página.
  const intro = loadIntroData();
  const hasHero = main.some((b) => b.type === 'hero' && resolveBlock(b, content, now) !== null);

  return (
    <>
      {intro && hasHero && (
        <>
          {/* Antes que nada: decide la entrada antes del primer pintado. */}
          <script
            dangerouslySetInnerHTML={{
              __html: bootScript({
                loadBudgetMs: intro.config.loadBudgetMs,
                hardCapMs: intro.config.loadBudgetMs + intro.config.durationMs + 4000,
                preload: [
                  intro.assets.planet.globe.url,
                  intro.assets.planet.clouds.url,
                  intro.assets.planet.island.url,
                  intro.assets.planet.band.url,
                ],
              }),
            }}
          />
          <style dangerouslySetInnerHTML={{ __html: stillCss(intro) }} />
        </>
      )}
      <SiteHeader sections={sections} />
      <main id="contenido" tabIndex={-1}>
        <HomeBlocks
          blocks={main}
          content={content}
          now={now}
          heroScene={<IntroStage data={intro} skipLabel={t('intro.skip')} />}
        />
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
