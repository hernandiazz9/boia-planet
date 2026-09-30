'use client';

import { useEffect, useRef } from 'react';
import type { ShipCatalog } from '../../lib/barco/catalog';
import { BarcoShop } from '../../lib/barco/shop';
import type { ShipLook } from '../../lib/barco/shop-model';

/**
 * La tienda «Barco» en /mar (T40), abierta desde el menú: la misma tienda que
 * la sección «Barco» de /juego, en una hoja crema por encima del mar (la de
 * los logros). Escape, la × o tocar fuera la cierran. Mientras está abierta
 * el barco no se mueve.
 */
export function MarTienda({
  catalog,
  current,
  pending,
  onEquip,
  onClose,
}: {
  catalog: ShipCatalog | null;
  current: ShipLook | null;
  pending: boolean;
  onEquip: (look: ShipLook) => void;
  onClose: () => void;
}) {
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
        aria-label="Barco"
        data-testid="mar-tienda"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') onClose();
        }}
      >
        <header className="mar-logros__head">
          <h2>⛵ Barco</h2>
          <button
            type="button"
            className="mar-logros__x"
            data-testid="mar-tienda-cerrar"
            aria-label="Cerrar la tienda del barco"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="mar-logros__body">
          <BarcoShop catalog={catalog} current={current} pending={pending} onEquip={onEquip} />
        </div>
      </section>
    </div>
  );
}
