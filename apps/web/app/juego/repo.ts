'use client';

import { bottlePositionValidator, settleInSea } from '@boia/engine/bottles';
import { type BoiaRepository, SAMPLE_BOTTLES, browserRepository } from '@boia/store';
import type { WorldConfig } from '@boia/world';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { worlds } from './demo-world';

/**
 * El repositorio de la demo en /juego y /carnet (T16, D-20): todo en este
 * navegador. Las botellas se validan contra el mar del mapa compartido (el
 * mismo en todos los mundos) y las de muestra, cuyas coordenadas son del
 * mapa de Arcilla, se dejan en el mar del mapa que se juega hoy.
 *
 * `browserRepository` se queda con las opciones de la primera llamada: en la
 * web, toda llamada tiene que pasar por aquí.
 */

/** El mar donde flotan las botellas: el del mapa compartido. */
export function seaWorld(): WorldConfig {
  return worlds.get(worlds.defaultId).config;
}

let sampleBottles: typeof SAMPLE_BOTTLES | null = null;

export function gameRepository(): BoiaRepository {
  sampleBottles ??= settleInSea(seaWorld(), SAMPLE_BOTTLES);
  return browserRepository({
    validate: { bottlePosition: bottlePositionValidator(seaWorld) },
    sample: { bottles: sampleBottles },
  });
}

const noop = () => () => {};

/** Revisión del repositorio: sube con cada cambio (también de otra pestaña). */
export function useRepoRevision(repo: BoiaRepository | null): number {
  return useSyncExternalStore(
    repo ? repo.subscribe : noop,
    repo ? repo.revision : () => -1,
    () => -1,
  );
}

/**
 * Lee del repositorio y vuelve a leer con cada cambio. `undefined` mientras
 * carga; el repositorio sólo existe en el navegador (tras montar).
 */
export function useRepoData<T>(
  read: (repo: BoiaRepository) => Promise<T>,
  deps: readonly unknown[] = [],
): { data: T | undefined; repo: BoiaRepository | null } {
  const [repo, setRepo] = useState<BoiaRepository | null>(null);
  useEffect(() => setRepo(gameRepository()), []);
  const revision = useRepoRevision(repo);
  const [data, setData] = useState<T | undefined>(undefined);
  useEffect(() => {
    if (!repo) return;
    let alive = true;
    read(repo).then(
      (v) => alive && setData(v),
      (err: unknown) => console.warn('[boia] no se pudo leer del repositorio', err),
    );
    return () => {
      alive = false;
    };
    // `read` cambia en cada render; lo que importa es la revisión y las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, revision, ...deps]);
  return { data, repo };
}
