import { ShipStyleSelector } from '../../ship-style-selector';
import type { MenuSection } from '../types';

/** ⛵ Mi Barco (REQ-IDE-030). Por ahora, el selector de estilos de prueba de T11; T12 trae estilos y skins. */
export const barcoSection: MenuSection = {
  id: 'barco',
  icon: '⛵',
  label: 'Mi Barco',
  group: 'progress',
  Component: function Barco({ ctx }) {
    return (
      <>
        <p>Colores, banderas, estelas y aspectos para tu barco. Sólo cambian cómo se ve.</p>
        <ShipStyleSelector state={ctx.shipStyle} />
        <p className="juego-muted">Próximamente.</p>
      </>
    );
  },
};
