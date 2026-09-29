'use client';

import { DiscountCard } from '../../place-panels';
import { useRepoData } from '../../repo';
import type { MenuSection } from '../types';

/**
 * 🏷️ Descuentos (T20, REQ-COM-021/022): los códigos encontrados en el mar
 * siguen aquí, con su evento, fecha y condiciones; se copian con un toque y
 * los caducados se enseñan como caducados. Viven en este navegador (D-20).
 */
export const descuentosSection: MenuSection = {
  id: 'descuentos',
  icon: '🏷️',
  label: 'Descuentos',
  group: 'progress',
  Component: function Descuentos() {
    const { data } = useRepoData((r) => r.progress.discounts());
    if (data === undefined) return <p className="juego-muted">Cargando…</p>;
    if (data.length === 0) {
      return (
        <p data-testid="descuentos-vacio">
          Aún no has encontrado ninguno. Hay códigos escondidos en el mar: náufragos, restos y
          tesoros.
        </p>
      );
    }
    return (
      <ul className="juego-descuentos" data-testid="descuentos">
        {[...data]
          .sort((a, b) => b.foundAt.localeCompare(a.foundAt))
          .map((f) => (
            <li key={f.discount.id}>
              <DiscountCard found={f} testId={`descuento-${f.discount.id}`} />
            </li>
          ))}
      </ul>
    );
  },
};
