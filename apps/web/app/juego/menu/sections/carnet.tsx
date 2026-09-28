import type { MenuSection } from '../types';

/** 🪪 Mi Carnet (REQ-IDE-011). Sin cuenta, la invitación es «Crear mi Carnet». Esqueleto. */
export const carnetSection: MenuSection = {
  id: 'carnet',
  icon: '🪪',
  label: 'Mi Carnet',
  group: 'progress',
  Component: function Carnet() {
    return (
      <>
        <p>Tu identidad en BOIA: sellos de los eventos a los que vas, tu barco y tus logros.</p>
        <button type="button" className="juego-button" disabled>
          Crear mi Carnet
        </button>
        <p className="juego-muted">Próximamente.</p>
      </>
    );
  },
};
