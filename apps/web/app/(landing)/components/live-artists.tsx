'use client';

import type { Artist } from '@boia/contracts/content';
import { useLiveHome } from '../../../lib/landing/use-live-home';
import { ArtistsList } from './artists-list';

/** La lista de /artistas: la muestra del servidor y, al montar, la del repositorio (T26). */
export function LiveArtists({ initial }: { initial: readonly Artist[] }) {
  const { view } = useLiveHome(initial, (content) => content.artists);
  return <ArtistsList artists={view} />;
}
