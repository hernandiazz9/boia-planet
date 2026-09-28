import type { Artist } from '@boia/contracts/content';
import { t } from '../../../lib/i18n';
import { alphabeticalArtists } from '../../../lib/landing/resolve';
import { ArtistCard } from './artist-card';

/** Lista completa de artistas de /artistas (T12): de la A a la Z, con avatar neutro. */
export function ArtistsList({ artists }: { artists: readonly Artist[] }) {
  const sorted = alphabeticalArtists(artists);
  return (
    <>
      <h1 id="artistas-title" className="section__title">
        {t('artists.page.title')}
      </h1>
      <p className="section__lead">{t('artists.page.lead', { count: sorted.length })}</p>
      <ul
        className="artists-page__list"
        aria-label={t('artists.azLabel')}
        data-testid="artistas-lista"
      >
        {sorted.map((artist) => (
          <li key={artist.id} data-artist={artist.id}>
            <ArtistCard artist={artist} genresLabel={t('artists.genres')} />
          </li>
        ))}
      </ul>
    </>
  );
}
