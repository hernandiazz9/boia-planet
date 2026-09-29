import { bootScript } from '@boia/engine/intro';
import type { Metadata } from 'next';
import { t } from '../../lib/i18n';
import { introCss, loadIntroData, stillCss } from '../../lib/intro/load';
import { resolveBlock } from '../../lib/landing/resolve';
import { SAMPLE_CONTENT } from '../../lib/landing/sample-content';
import { IntroStage } from './components/intro-stage';
import { LandingClient } from './components/landing-client';
import { LiveLanding } from './components/live-landing';

export const metadata: Metadata = {
  title: t('site.title'),
  description: t('site.description'),
};

export default function LandingPage() {
  // El servidor pinta la muestra; en el navegador, `LiveLanding` pasa a leer el
  // repositorio local con los cambios del Admin de la demo (T26, D-20). Con
  // Supabase, lo publicado.
  const content = SAMPLE_CONTENT;
  const now = new Date();

  const main = content.blocks.filter((b) => b.type !== 'footer');
  // Entrada «mini-mundo» (T14, D-19): configuración, arte de la ilustración
  // ligera y geometría del mundo, leídos al construir la página.
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
                // Sólo si nadie toma el relevo: después manda el controlador.
                hardCapMs: intro.config.loadBudgetMs + 4000,
                preload: intro.preload,
              }),
            }}
          />
          <style dangerouslySetInnerHTML={{ __html: `${stillCss(intro)}\n${introCss(intro)}` }} />
        </>
      )}
      <LiveLanding
        initial={content}
        nowIso={now.toISOString()}
        heroScene={<IntroStage data={intro} skipLabel={t('intro.skip')} />}
      />
      <LandingClient />
    </>
  );
}
