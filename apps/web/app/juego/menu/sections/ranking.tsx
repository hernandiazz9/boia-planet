import type { MenuSection } from '../types';

/** 🏆 Ranking (REQ-IDE-038). Esqueleto. */
export const rankingSection: MenuSection = {
  id: 'ranking',
  icon: '🏆',
  label: 'Ranking',
  group: 'progress',
  Component: function Ranking() {
    return (
      <>
        <p>
          Clasificación por puntos de prestigio, de siempre y de temporada, y récords del circuito.
        </p>
        <p className="juego-muted">Próximamente.</p>
      </>
    );
  },
};
