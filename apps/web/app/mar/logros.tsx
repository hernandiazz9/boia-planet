'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { AchievementsPanel } from '../../lib/logros/panel';

/**
 * El panel de logros en /mar (T37), abierto desde el icono 🏆 del HUD o
 * tocando el aviso «¡Logro completado!»: el mismo panel que la sección
 * «Logros» de /juego, en una hoja crema por encima del mar. Escape, la × o
 * tocar fuera lo cierran. Mientras está abierto el barco no se mueve.
 */
export function MarLogros({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="mar-logros" onClick={onClose}>
      <section
        ref={ref}
        tabIndex={-1}
        className="mar-logros__sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Logros"
        data-testid="mar-logros-panel"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') onClose();
        }}
      >
        <header className="mar-logros__head">
          <h2>🏆 Logros</h2>
          <Link className="mar-logros__carnet" href="/carnet" prefetch={false}>
            🪪 Mi Carnet
          </Link>
          <button
            type="button"
            className="mar-logros__x"
            data-testid="mar-logros-cerrar"
            aria-label="Cerrar logros"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="mar-logros__body">
          <AchievementsPanel />
        </div>
      </section>
    </div>
  );
}
