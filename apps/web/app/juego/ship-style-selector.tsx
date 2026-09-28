'use client';

// Sólo tipos: el motor (pixi) se importa dinámicamente, como en game-canvas.tsx.
import type { LoadedShipManifest, ShipStyleIndex } from '@boia/engine';

/**
 * Selector de prueba del estilo del barco (T11): compara los 8 estilos de
 * exploración con el actual dentro del juego. Elegir uno lo guarda en este
 * navegador y recarga /juego con `?estilo=<id>`; el motor carga ese estilo al
 * arrancar. Es una herramienta de revisión, no una función del producto.
 */

export interface ShipStyleState {
  index: ShipStyleIndex;
  current: string;
  /** Nombre del parámetro de la URL y clave de localStorage (del motor). */
  param: string;
  storageKey: string;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function remember(key: string, id: string) {
  try {
    storage()?.setItem(key, id);
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): el estilo vale sólo por la URL.
  }
}

/** Manifiesto del barco en el estilo pedido (URL o guardado) y el estado para el selector. */
export async function loadStyledShip(
  manifestUrl: string,
): Promise<{ manifest: LoadedShipManifest | null; style: ShipStyleState | null }> {
  const { loadShipStyle, requestedShipStyle, SHIP_STYLE_PARAM, SHIP_STYLE_STORAGE_KEY } =
    await import('@boia/engine');
  const requested = requestedShipStyle(window.location.search, storage());
  const r = await loadShipStyle(manifestUrl, requested);
  if (!r.index || !r.style) return { manifest: r.loaded, style: null };
  // Un ?estilo= válido queda guardado; uno desconocido no pisa lo guardado.
  if (requested === r.style.id) remember(SHIP_STYLE_STORAGE_KEY, r.style.id);
  return {
    manifest: r.loaded,
    style: {
      index: r.index,
      current: r.style.id,
      param: SHIP_STYLE_PARAM,
      storageKey: SHIP_STYLE_STORAGE_KEY,
    },
  };
}

export function ShipStyleSelector({ state }: { state: ShipStyleState | null }) {
  if (!state || state.index.options.length < 2) return null;
  const choose = (id: string) => {
    remember(state.storageKey, id);
    const url = new URL(window.location.href);
    url.searchParams.set(state.param, id);
    window.location.assign(url.href);
  };
  const current = state.index.options.find((o) => o.id === state.current);
  return (
    <label
      style={{
        position: 'absolute',
        left: 'max(8px, env(safe-area-inset-left))',
        bottom: 'max(8px, env(safe-area-inset-bottom))',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(18,35,63,.55)',
        padding: '4px 8px',
        borderRadius: 6,
        font: '600 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
        textShadow: '0 1px 2px rgba(0,0,0,.6)',
      }}
      title={current?.description}
    >
      barco
      <select
        data-testid="ship-style"
        value={state.current}
        onChange={(e) => choose(e.target.value)}
        style={{ font: 'inherit', fontSize: 16, maxWidth: '60vw' }}
      >
        {state.index.options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.id === state.index.defaultId ? `${o.label} (por defecto)` : o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
