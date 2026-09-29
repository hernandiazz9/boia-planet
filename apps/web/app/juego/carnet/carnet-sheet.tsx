'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { CarnetCard } from './carnet-card';
import { CarnetReport } from './carnet-report';
import { carnetPath } from './share';
import { useCarnet } from './use-carnet';

/**
 * El Carnet de otra persona sobre el mar (REQ-IDE-017): se abre desde su
 * botella con «VER SU CARNET». El barco sigue en el agua detrás.
 */
export function CarnetSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data } = useCarnet(userId);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="juego-overlay" onClick={onClose}>
      <section
        ref={ref}
        tabIndex={-1}
        className="juego-map juego-sheet"
        role="dialog"
        aria-label="Carnet BOIA"
        data-testid="carnet-ajeno"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') onClose();
        }}
      >
        <header className="juego-sheet-head">
          <h2>Carnet BOIA</h2>
          <button type="button" className="juego-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        {data === undefined ? (
          <p className="juego-muted">Cargando…</p>
        ) : data.carnet ? (
          <>
            <CarnetCard carnet={data.carnet} extras={data.extras} />
            <CarnetReport carnet={data.carnet} />
            <p>
              <Link href={carnetPath(userId)} className="juego-link">
                Ver a pantalla completa
              </Link>
            </p>
          </>
        ) : (
          <p>Este Carnet ya no está disponible.</p>
        )}
      </section>
    </div>
  );
}
