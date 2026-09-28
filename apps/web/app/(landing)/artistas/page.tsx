import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '../../../lib/i18n';
import { SAMPLE_CONTENT } from '../../../lib/landing/sample-content';
import { ArtistsList } from '../components/artists-list';

/**
 * Todos los artistas (v14 §18.1), de la A a la Z, con avatar neutro mientras
 * no haya foto aprobada (REQ-COM-027). Es una página estática: se enlaza
 * directamente (/artistas) y funciona sin JavaScript y sin WebGL. Hasta T10,
 * los artistas salen del contenido de muestra, como la home.
 */

export const metadata: Metadata = {
  title: `${t('artists.page.title')} · ${t('site.title')}`,
  description: t('artists.intro'),
};

export default function ArtistsPage() {
  return (
    <main id="contenido" className="section artists-page" aria-labelledby="artistas-title">
      <div className="section__inner">
        <p>
          <Link href="/#artistas">{t('artists.page.back')}</Link>
        </p>
        <ArtistsList artists={SAMPLE_CONTENT.artists} />
      </div>
    </main>
  );
}
