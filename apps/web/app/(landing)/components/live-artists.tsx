'use client';

import type { HomeContent } from '@boia/contracts';
import { useLiveHome } from '../../../lib/landing/use-live-home';
import { ArtistsList } from './artists-list';

/** La lista de /artistas: la muestra del servidor y, al montar, la del repositorio (T26). */
export function LiveArtists({ initial, nowIso }: { initial: HomeContent; nowIso: string }) {
  const { content } = useLiveHome(initial, nowIso);
  return <ArtistsList artists={content.artists} />;
}
