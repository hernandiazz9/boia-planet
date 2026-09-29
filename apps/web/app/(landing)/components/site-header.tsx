import { t, type MessageKey } from '../../../lib/landing/texts';
import { BrandLogo } from './brand-logo';

const SECONDARY: ReadonlyArray<[MessageKey, string]> = [
  ['nav.artists', '#artistas'],
  ['nav.philosophy', '#filosofia'],
  ['nav.store', '#tienda'],
  ['nav.photos', '#fotos'],
];

/**
 * Cabecera fija: el logo (mascota y wordmark, T50), Tickets siempre a mano y el resto de accesos. En
 * móvil lo secundario va en un menú plegable que funciona sin JavaScript
 * (REQ-ENT-029). Mi Carnet y sonido llegan con sus encargos (T07, T05).
 */
export function SiteHeader({ sections }: { sections: ReadonlySet<string> }) {
  const links = SECONDARY.filter(([, href]) => sections.has(href.slice(1)));
  return (
    <header className="site-header">
      <a className="skip-link" href="#contenido">
        {t('nav.skipToContent')}
      </a>
      <div className="site-header__inner">
        <a className="site-header__brand" href="#inicio" aria-label={t('nav.home')}>
          <BrandLogo />
        </a>
        <nav className="site-header__nav" aria-label={t('nav.label')}>
          <ul className="site-header__links">
            {links.map(([key, href]) => (
              <li key={href}>
                <a href={href}>{t(key)}</a>
              </li>
            ))}
          </ul>
          <a className="button button--tickets-small" href="#tickets" data-tickets-open="header">
            {t('nav.tickets')}
          </a>
          {links.length > 0 && (
            <details className="site-header__menu">
              <summary className="button button--ghost">{t('nav.menu')}</summary>
              <ul className="site-header__menu-list">
                {links.map(([key, href]) => (
                  <li key={href}>
                    <a href={href}>{t(key)}</a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </nav>
      </div>
    </header>
  );
}
