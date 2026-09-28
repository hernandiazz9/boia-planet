import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { t, type MessageKey } from '../../../../lib/i18n';

/**
 * Páginas legales enlazadas desde el pie (REQ-ENT-032). El texto real lo
 * redacta y revisa un profesional [pendiente Álvaro]; hasta entonces existen
 * para que los enlaces no lleven a un 404.
 */
const DOCS: Record<string, { title: MessageKey; body: MessageKey }> = {
  privacidad: { title: 'footer.privacy', body: 'legal.pending' },
  condiciones: { title: 'footer.terms', body: 'legal.pending' },
  cookies: { title: 'footer.cookies', body: 'legal.cookies.body' },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

type Props = { params: Promise<{ doc: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = DOCS[(await params).doc];
  return { title: doc ? `${t(doc.title)} · ${t('site.title')}` : t('site.title') };
}

export default async function LegalPage({ params }: Props) {
  const doc = DOCS[(await params).doc];
  if (!doc) notFound();
  return (
    <main id="contenido" className="legal">
      <div className="section__inner">
        <p>
          <Link href="/">{t('legal.back')}</Link>
        </p>
        <h1 className="section__title">{t(doc.title)}</h1>
        <p>{t(doc.body)}</p>
        {doc.body !== 'legal.pending' && <p>{t('legal.pending')}</p>}
      </div>
    </main>
  );
}
