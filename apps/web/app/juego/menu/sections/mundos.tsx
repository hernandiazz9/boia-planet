import type { WorldSummary } from '@boia/world';
import type { ShipCatalog } from '../../../../lib/barco/catalog';
import type { MenuSection } from '../types';

/**
 * 🌍 Mundos (T24, D-20): los mundos del mapa compartido, cada uno con su
 * línea de historia y su barco. Elegir uno cambia el mundo al momento, sin
 * recargar: el barco sigue donde está, y lo descubierto, los premios y los
 * descuentos se quedan (van por id de lugar). Si no has elegido barco en
 * «Barco», llevas el del mundo. Se recuerda en este navegador.
 */

export function MundosPicker({
  worlds,
  current,
  pending = false,
  catalog,
  onChoose,
}: {
  worlds: readonly WorldSummary[];
  current: string;
  pending?: boolean;
  catalog: ShipCatalog | null;
  onChoose: (id: string) => void;
}) {
  return (
    <div className="mundos" data-testid="mundos" aria-busy={pending}>
      <p>
        Los mismos lugares con otra piel, otra historia y otro barco. Tu progreso viaja contigo.
      </p>
      <ul className="mundos-lista" role="radiogroup" aria-label="Mundos">
        {worlds.map((w) => {
          const checked = w.id === current;
          const ship = catalog?.styles.find((s) => s.id === w.shipStyle);
          const preview = ship?.skins[0]?.preview;
          return (
            <li key={w.id}>
              <button
                type="button"
                role="radio"
                aria-checked={checked}
                className={`mundo${checked ? ' is-active' : ''}`}
                data-testid={`mundo-${w.id}`}
                // Sin bloquear mientras carga: el último que se elige gana.
                onClick={() => (checked ? undefined : onChoose(w.id))}
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arte servido desde art/ (D-16)
                  <img src={preview} alt="" width={64} height={64} loading="lazy" />
                ) : (
                  <span className="mundo-sin-barco" aria-hidden="true">
                    ⛵
                  </span>
                )}
                <span className="mundo-texto">
                  <span className="mundo-nombre">
                    {w.name}
                    {checked ? <span className="mundo-actual"> · navegando</span> : null}
                  </span>
                  {w.tagline ? <span className="mundo-historia">{w.tagline}</span> : null}
                  <span className="mundo-barco" data-testid={`mundo-${w.id}-barco`}>
                    Barco: {ship?.name ?? w.shipStyle}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="juego-muted">
        Si eliges un barco en «Barco», lo llevas en todos los mundos. Todo es de muestra.
      </p>
    </div>
  );
}

export const mundosSection: MenuSection = {
  id: 'mundos',
  icon: '🌍',
  label: 'Mundos',
  group: 'progress',
  Component: function Mundos({ ctx }) {
    return (
      <MundosPicker
        worlds={ctx.world.worlds}
        current={ctx.world.current}
        pending={ctx.world.pending}
        catalog={ctx.ship.catalog}
        onChoose={ctx.world.choose}
      />
    );
  },
};
