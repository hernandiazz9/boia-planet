'use client';

import { ClaimBadge, claimLabel } from '../../../../lib/logros/claim-badge';
import { AchievementsPanel } from '../../../../lib/logros/panel';
import { useReadyCount } from '../../../../lib/logros/use-logros';
import type { MenuSection } from '../types';

/**
 * 🏅 Logros (REQ-IDE-024…028, T37): el panel de logros compartido con /mar
 * (`lib/logros`): «X de Y logros», barra y «te queda…» de cada uno, los
 * ocultos como «???» y «Reclamar» en los completados. Debajo, lo descubierto
 * en esta visita. Títulos y premios son `muestra`.
 */
function LogrosIcon() {
  const ready = useReadyCount();
  return (
    <span className="juego-menu-icon-wrap" title={claimLabel('Logros', ready)}>
      🏅
      <ClaimBadge count={ready} testId="menu-logros-contador" />
    </span>
  );
}

export const logrosSection: MenuSection = {
  id: 'logros',
  icon: <LogrosIcon />,
  label: 'Logros',
  group: 'progress',
  Component: function Logros({ ctx }) {
    return (
      <>
        <AchievementsPanel />
        {ctx.discovered.length > 0 ? (
          <>
            <h3>Descubierto en esta visita</h3>
            <ul data-testid="logros-sesion">
              {ctx.discovered.map((d) => (
                <li key={d.id}>🧭 {d.name}</li>
              ))}
            </ul>
          </>
        ) : null}
      </>
    );
  },
};
