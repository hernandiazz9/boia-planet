import type { HomeBlock, HomeContent } from '@boia/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { t } from '../../../lib/i18n';
import { resolveBlock, type ResolvedBlock } from '../../../lib/landing/resolve';
import { ArtistRotator } from './artist-rotator';
import { EventCard } from './event-card';

/**
 * Pinta un bloque de la home. Oculto, fuera de programación o sin contenido
 * útil: no pinta nada (ni contenedor vacío).
 */
export function Block({
  block,
  content,
  now,
  heroScene,
}: {
  block: HomeBlock;
  content: HomeContent;
  now: Date;
  /** Escena del hero (entrada cinemática, T03). Sin ella, mar en CSS. */
  heroScene?: ReactNode;
}) {
  const resolved = resolveBlock(block, content, now);
  return resolved ? (
    <ResolvedBlockView block={resolved} content={content} heroScene={heroScene} />
  ) : null;
}

/** Lista de bloques en el orden configurado. */
export function HomeBlocks({
  blocks,
  content,
  now,
  heroScene,
}: {
  blocks: readonly HomeBlock[];
  content: HomeContent;
  now: Date;
  heroScene?: ReactNode;
}) {
  return (
    <>
      {blocks.map((b) => (
        <Block key={b.id} block={b} content={content} now={now} heroScene={heroScene} />
      ))}
    </>
  );
}

function ResolvedBlockView({
  block,
  content,
  heroScene,
}: {
  block: ResolvedBlock;
  content: HomeContent;
  heroScene?: ReactNode;
}) {
  switch (block.type) {
    case 'hero':
      return (
        <section id="inicio" className="hero" aria-labelledby="hero-title" data-block={block.id}>
          {heroScene ?? <div className="hero__sea" aria-hidden="true" />}
          <div className="hero__content">
            <p className="hero__brand">{t('hero.brand')}</p>
            <h1 id="hero-title" className="hero__title">
              {block.title}
            </h1>
            <p className="hero__positioning">{block.positioning}</p>
            <div className="hero__actions">
              <a
                className="cta-explore"
                href="/juego"
                data-track="explore_start"
                data-source="hero"
              >
                <span className="cta-explore__label">{t('hero.explore')}</span>
                <span className="cta-explore__sub">
                  {t(
                    block.hasPromotions
                      ? 'hero.explore.withPromotions'
                      : 'hero.explore.withoutPromotions',
                  )}
                </span>
              </a>
              <a className="button button--tickets" href="#tickets" data-tickets-open="hero">
                {t('hero.tickets')}
              </a>
            </div>
          </div>
        </section>
      );

    case 'priority_event':
      return (
        <section className="section" aria-labelledby="priority-title" data-block={block.id}>
          <div className="section__inner">
            <h2 id="priority-title" className="section__title">
              {t('priority.heading')}
            </h2>
            <EventCard
              event={block.event}
              artists={content.artists}
              source="priority_event"
              featured
            />
          </div>
        </section>
      );

    case 'upcoming_events':
      return (
        <section
          id="eventos"
          className="section section--alt"
          aria-labelledby="upcoming-title"
          data-block={block.id}
        >
          <div className="section__inner">
            <h2 id="upcoming-title" className="section__title">
              {t('upcoming.heading')}
            </h2>
            <ul className="card-grid">
              {block.events.map((e) => (
                <li key={e.id}>
                  <EventCard event={e} artists={content.artists} source="upcoming_events" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      );

    case 'artists':
      return (
        <section
          id="artistas"
          className="section"
          aria-labelledby="artists-title"
          data-block={block.id}
        >
          <div className="section__inner">
            <h2 id="artists-title" className="section__title">
              {t('artists.heading')}
            </h2>
            <p className="section__lead">{block.intro ?? t('artists.intro')}</p>
            <ArtistRotator
              artists={block.rotation}
              rotationMs={block.rotationMs}
              labels={{
                pause: t('artists.pause'),
                resume: t('artists.resume'),
                genres: t('artists.genres'),
              }}
            />
            <details className="artists-az">
              <summary className="button button--ghost">{t('artists.all')}</summary>
              <ul className="artists-az__list" aria-label={t('artists.azLabel')}>
                {block.alphabetical.map((a) => (
                  <li key={a.id}>
                    <span className="artists-az__name">{a.name}</span>{' '}
                    <span className="artists-az__genres">{a.genres.join(', ')}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </section>
      );

    case 'philosophy':
      return (
        <section
          id="filosofia"
          className="section section--alt"
          aria-labelledby="philosophy-title"
          data-block={block.id}
        >
          <div className="section__inner">
            <h2 id="philosophy-title" className="section__title">
              {t('philosophy.heading')}
            </h2>
            {block.paragraphs.map((p) => (
              <p key={p} className="philosophy__text">
                {p}
              </p>
            ))}
            {block.verbs.length > 0 && (
              <ul className="philosophy__verbs">
                {block.verbs.map((v) => (
                  <li key={v.verb}>
                    <strong className="philosophy__verb">{v.verb}</strong> {v.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      );

    case 'photos':
      return (
        <section
          id="fotos"
          className="section"
          aria-labelledby="photos-title"
          data-block={block.id}
        >
          <div className="section__inner">
            <h2 id="photos-title" className="section__title">
              {t('photos.heading')}
            </h2>
            <ul className="photo-grid">
              {block.photos.map((p, i) => (
                <li key={p.id}>
                  {p.src ? (
                    // eslint-disable-next-line @next/next/no-img-element -- fotos del Admin, dominio aún sin fijar
                    <img src={p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" />
                  ) : (
                    <div
                      className={`photo-placeholder photo-placeholder--${i % 3}`}
                      role="img"
                      aria-label={p.alt}
                      style={{ aspectRatio: `${p.width} / ${p.height}` }}
                    >
                      <span aria-hidden="true">{t('photos.placeholder')}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      );

    case 'store':
      return (
        <section
          id="tienda"
          className="section section--alt"
          aria-labelledby="store-title"
          data-block={block.id}
        >
          <div className="section__inner">
            <h2 id="store-title" className="section__title">
              {t('store.heading')}
            </h2>
            <p className="section__lead">{t('store.intro')}</p>
            <ul className="chip-list">
              {block.products.map((p) => (
                <li key={p} className="chip">
                  {p}
                </li>
              ))}
            </ul>
            <a
              className="button button--secondary"
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('store.cta.aria')}
            >
              {t('store.cta')}
            </a>
          </div>
        </section>
      );

    case 'contact':
      return (
        <section
          id="contacto"
          className="section"
          aria-labelledby="contact-title"
          data-block={block.id}
        >
          <div className="section__inner">
            <h2 id="contact-title" className="section__title">
              {t('contact.heading')}
            </h2>
            <ul className="link-list">
              {block.email && (
                <li>
                  <a href={`mailto:${block.email}`}>
                    {t('contact.email')}: {block.email}
                  </a>
                </li>
              )}
              {block.links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer">
                    {l.label} <span className="visually-hidden">{t('common.newTab')}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      );

    case 'footer':
      return (
        <footer className="site-footer" data-block={block.id}>
          <div className="section__inner site-footer__inner">
            {block.officialLinks.length > 0 && (
              <nav aria-label={t('footer.official')}>
                <ul className="link-list link-list--inline">
                  {block.officialLinks.map((l) => (
                    <li key={l.url}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer">
                        {l.label} <span className="visually-hidden">{t('common.newTab')}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <nav aria-label={t('footer.legal')}>
              <ul className="link-list link-list--inline">
                <li>
                  <Link href="/legal/privacidad" prefetch={false}>
                    {t('footer.privacy')}
                  </Link>
                </li>
                <li>
                  <Link href="/legal/condiciones" prefetch={false}>
                    {t('footer.terms')}
                  </Link>
                </li>
                <li>
                  <Link href="/legal/cookies" prefetch={false}>
                    {t('footer.cookies')}
                  </Link>
                </li>
              </ul>
            </nav>
            <p className="site-footer__small">
              {/* Carga completa a propósito: la entrada la decide el script de arranque. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/?intro=1">{t('footer.replayIntro')}</a>
            </p>
            <p className="site-footer__small">{t('footer.copyright')}</p>
            <p className="site-footer__small">{t('site.sampleNotice')}</p>
          </div>
        </footer>
      );
  }
}
