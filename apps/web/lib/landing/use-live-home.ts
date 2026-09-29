'use client';

import type { HomeContent } from '@boia/contracts';
import { useEffect, useRef, useState } from 'react';
import { setTextOverrides } from './texts';

/**
 * La home tal como la deja el Admin de la demo (T26): el servidor pinta la
 * muestra (`initial`, la misma que da el repositorio sin cambios) y, al
 * montar, se lee el repositorio del navegador (`gameRepository`, D-20) y se
 * vuelve a pintar con sus eventos, bloques, artistas, fotos y textos. Sigue
 * escuchando: un cambio del Admin en otra pestaña llega sin recargar.
 *
 * El repositorio se carga con `import()` cuando el navegador está libre, fuera
 * de la ruta crítica de la landing (REQ-ARQ-014).
 */
export interface LiveHome<V> {
  /** Lo que se pinta: la vista del servidor y, al llegar el repositorio, la derivada de él. */
  view: V;
  /** Ya viene del repositorio (y no de la muestra del servidor). */
  live: boolean;
}

type Idle = (cb: () => void) => number;

function whenIdle(cb: () => void): () => void {
  const w = window as Window & {
    requestIdleCallback?: Idle;
    cancelIdleCallback?: (id: number) => void;
  };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(cb);
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 150);
  return () => window.clearTimeout(id);
}

export function useLiveHome<V>(
  initial: V,
  derive: (content: HomeContent, now: Date) => V | Promise<V>,
): LiveHome<V> {
  const [state, setState] = useState<LiveHome<V>>(() => ({ view: initial, live: false }));
  const deriveRef = useRef(derive);
  deriveRef.current = derive;

  useEffect(() => {
    let alive = true;
    let off = () => {};
    const cancelIdle = whenIdle(() => {
      import('../repo')
        .then(({ gameRepository }) => {
          if (!alive) return;
          const repo = gameRepository();
          const read = async () => {
            const [content, texts] = await Promise.all([repo.content.home(), repo.content.texts()]);
            const view = await deriveRef.current(content, new Date());
            if (!alive) return;
            setTextOverrides(texts);
            setState({ view, live: true });
          };
          off = repo.subscribe(({ areas }) => {
            if (areas.includes('content')) void read();
          });
          return read();
        })
        .catch((err: unknown) =>
          console.warn('[boia] no se pudo leer el contenido del Admin', err),
        );
    });
    return () => {
      alive = false;
      cancelIdle();
      off();
    };
  }, []);

  return state;
}
