import type { HomeContent } from '@boia/contracts';
import type { BoiaRepository } from '@boia/store';
import { SAMPLE_CONTENT } from './sample-content';

/**
 * Lo último que se leyó del contenido del repositorio, para quien lo necesita
 * sin esperar (el mar de /juego: qué evento abre una isla, si se vende). Hasta
 * que `refreshLiveContent` lee el repositorio, la muestra; después, la muestra
 * con los cambios del Admin de la demo (T26).
 */
let current: HomeContent = SAMPLE_CONTENT;

export function liveContent(): HomeContent {
  return current;
}

/** Lee el contenido del repositorio y lo deja a mano. */
export async function refreshLiveContent(repo: BoiaRepository): Promise<HomeContent> {
  current = await repo.content.home();
  return current;
}

/** Sólo pruebas: vuelve a la muestra. */
export function resetLiveContentForTests(): void {
  current = SAMPLE_CONTENT;
}
