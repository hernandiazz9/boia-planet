import type { MenuSection } from '../types';

/** 🏅 Logros (REQ-IDE-024). Por ahora, lo conseguido en esta sesión; el progreso guardado es de T07. */
export const logrosSection: MenuSection = {
  id: 'logros',
  icon: '🏅',
  label: 'Logros',
  group: 'progress',
  Component: function Logros({ ctx }) {
    return (
      <>
        <h3>En esta sesión</h3>
        {ctx.achievements.length === 0 && ctx.discovered.length === 0 ? (
          <p>Aún nada. Navega y acércate a lo que veas.</p>
        ) : (
          <ul data-testid="logros-sesion">
            {ctx.achievements.map((a) => (
              <li key={a.id}>🏅 {a.title}</li>
            ))}
            {ctx.discovered.map((d) => (
              <li key={d.id}>🧭 {d.name}</li>
            ))}
          </ul>
        )}
        <p className="juego-muted">El progreso completo y los que faltan llegan pronto.</p>
      </>
    );
  },
};
