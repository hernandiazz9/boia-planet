import type { ShipCatalog } from '../../../../lib/barco/catalog';
import { type ShipLock, lockedShipText, useShipLocks } from '../../../../lib/logros/use-logros';
import '../../../../lib/logros/logros.css';
import type { ShipLook } from '../../ship-look';
import type { MenuSection } from '../types';

/**
 * ⛵ Barco (REQ-IDE-030, T12): los estilos del barco de T11 y sus skins
 * (base, fiesta, noche; cada estilo enseña sólo las que tiene), con una
 * miniatura de cada uno. Elegir cambia el barco al momento, sin recargar, y
 * se recuerda en este navegador. Sólo cambia cómo se ve. Los barcos que se
 * ganan con un logro (T36, T37) salen con candado y el logro que los da
 * hasta tenerlos; no se pueden elegir.
 */

export function BarcoPicker({
  catalog,
  current,
  pending = false,
  locks = [],
  onChoose,
}: {
  catalog: ShipCatalog | null;
  current: ShipLook | null;
  pending?: boolean;
  /** Barcos bloqueables (`progress.ships()`); los que no se tienen van con candado. */
  locks?: readonly ShipLock[];
  onChoose: (look: ShipLook) => void;
}) {
  if (!catalog || catalog.styles.length === 0) {
    return <p className="juego-muted">El barco de muestra todavía no tiene estilos.</p>;
  }
  const selectedId = current?.style ?? catalog.defaultId;
  const selected = catalog.styles.find((s) => s.id === selectedId) ?? catalog.styles[0]!;
  const skinId = current?.skin ?? 'base';
  const pick = (style: string, skin: string) => {
    // Sin bloquear mientras carga: la última elección gana (y un botón
    // desactivado perdería el foco, y con él Escape para cerrar el menú).
    if (style === current?.style && skin === current?.skin) return;
    onChoose({ style, skin });
  };

  return (
    <div className="barco" data-testid="barco" aria-busy={pending}>
      <p>Elige el estilo y la skin de tu barco. Sólo cambian cómo se ve.</p>
      <h3 id="barco-estilos">Estilo</h3>
      <ul className="barco-estilos" role="radiogroup" aria-labelledby="barco-estilos">
        {catalog.styles.map((style) => {
          const checked = style.id === selected.id;
          const lock = locks.find((l) => l.style === style.id && !l.owned);
          if (lock && !checked) {
            const why = lockedShipText(lock);
            return (
              <li key={style.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={false}
                  aria-disabled="true"
                  aria-label={`${style.name}: bloqueado. ${why}`}
                  className="barco-estilo is-locked"
                  data-testid={`barco-estilo-${style.id}`}
                  data-bloqueado="si"
                  title={why}
                  onClick={() => undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- arte servido desde art/ (D-16) */}
                  <img src={style.skins[0]!.preview} alt="" width={72} height={72} loading="lazy" />
                  <span className="barco-estilo-nombre">
                    <span aria-hidden="true">🔒 </span>
                    {style.name}
                  </span>
                  <span className="barco-candado" data-testid={`barco-candado-${style.id}`}>
                    {why}
                  </span>
                </button>
              </li>
            );
          }
          // La miniatura del estilo elegido enseña su skin actual.
          const shown = (checked && style.skins.find((k) => k.id === skinId)) || style.skins[0]!;
          return (
            <li key={style.id}>
              <button
                type="button"
                role="radio"
                aria-checked={checked}
                className={`barco-estilo${checked ? ' is-active' : ''}`}
                data-testid={`barco-estilo-${style.id}`}
                onClick={() =>
                  // Se conserva la skin si el estilo nuevo la tiene; si no, base.
                  pick(
                    style.id,
                    style.skins.some((k) => k.id === skinId) ? skinId : style.skins[0]!.id,
                  )
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- arte servido desde art/ (D-16) */}
                <img src={shown.preview} alt="" width={72} height={72} loading="lazy" />
                <span className="barco-estilo-nombre">{style.name}</span>
                {style.swatches.length > 0 ? (
                  <span className="barco-paleta" aria-hidden="true">
                    {style.swatches.map((c) => (
                      <span
                        key={c.label}
                        className="barco-color"
                        style={{ background: c.hex }}
                        title={`${c.label} ${c.hex}`}
                      />
                    ))}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {selected.description ? (
        <p className="barco-descripcion" data-testid="barco-descripcion">
          <strong>{selected.name}.</strong> {selected.description}
        </p>
      ) : null}
      <h3 id="barco-skins">Skin</h3>
      <ul className="barco-skins" role="radiogroup" aria-labelledby="barco-skins">
        {selected.skins.map((skin) => {
          const checked = skin.id === skinId;
          return (
            <li key={skin.id}>
              <button
                type="button"
                role="radio"
                aria-checked={checked}
                className={`barco-skin${checked ? ' is-active' : ''}`}
                data-testid={`barco-skin-${skin.id}`}
                onClick={() => pick(selected.id, skin.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- arte servido desde art/ (D-16) */}
                <img src={skin.preview} alt="" width={56} height={56} loading="lazy" />
                <span>{skin.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {selected.skins.length < 2 ? (
        <p className="juego-muted">Este estilo sólo tiene la skin base, por ahora.</p>
      ) : null}
    </div>
  );
}

export const barcoSection: MenuSection = {
  id: 'barco',
  icon: '⛵',
  label: 'Barco',
  group: 'progress',
  Component: function Barco({ ctx }) {
    const locks = useShipLocks() ?? [];
    return (
      <BarcoPicker
        locks={locks}
        catalog={ctx.ship.catalog}
        current={ctx.ship.current}
        pending={ctx.ship.pending || !ctx.game}
        onChoose={ctx.ship.choose}
      />
    );
  },
};
