'use client';

import { achievementBody, achievementFacts, achievementGoal } from '../../achievements';
import { useRepoData } from '../../repo';
import type { MenuSection } from '../types';

/**
 * 🏅 Logros (REQ-IDE-024…028): un solo sistema de LOGROS/PROGRESO que dice
 * qué he conseguido y qué me falta, con progreso (X/6 boies…), puntos y
 * monedas por separado y el rango lúdico que dan los puntos. Todo sale del
 * repositorio local (T16): lo guardado en este navegador. Los secretos no
 * se listan hasta conseguirlos. Títulos y premios son `muestra`.
 */
export const logrosSection: MenuSection = {
  id: 'logros',
  icon: '🏅',
  label: 'Logros',
  group: 'progress',
  Component: function Logros({ ctx }) {
    const { data } = useRepoData(async (r) => {
      const [list, balances, facts, ranks] = await Promise.all([
        r.progress.achievements(),
        r.progress.balances(),
        achievementFacts(r.progress),
        r.content.list('ranks'),
      ]);
      const rank =
        [...ranks]
          .filter((k) => k.minPoints <= balances.points)
          .sort((a, b) => b.minPoints - a.minPoints)[0] ?? null;
      return { list, balances, facts, rank };
    });
    if (data === undefined) return <p className="juego-muted">Cargando…</p>;
    const { list, balances, facts, rank } = data;
    const got = list.filter((a) => a.obtained).length;
    return (
      <>
        <p className="juego-logros-saldos" data-testid="logros-saldos">
          <span data-testid="logros-puntos">★ {balances.points} puntos</span>
          <span data-testid="logros-monedas">● {balances.coins} monedas</span>
          {rank ? <span data-testid="logros-rango">Rango: {rank.name}</span> : null}
        </p>
        <h3>
          {got} de {list.length} logros
        </h3>
        <ul className="juego-logros" data-testid="logros">
          {list.map(({ definition: d, obtained }) => {
            const goal = obtained ? null : achievementGoal(d, facts);
            const reward = achievementBody(d);
            return (
              <li
                key={d.id}
                data-testid={`logro-${d.id}`}
                data-obtenido={obtained ? 'si' : 'no'}
                className={obtained ? 'is-obtained' : undefined}
              >
                <span aria-hidden="true">{obtained ? '🏅' : '○'}</span> <strong>{d.title}</strong>
                {d.description ? <span className="juego-muted"> · {d.description}</span> : null}
                {goal ? (
                  <span className="juego-logro-progreso">
                    {' '}
                    · {Math.min(goal.have, goal.need)}/{goal.need}
                    {goal.unit === 'minutos' ? ' min' : ''}
                  </span>
                ) : null}
                {reward ? <span className="juego-muted"> · {reward}</span> : null}
              </li>
            );
          })}
        </ul>
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
