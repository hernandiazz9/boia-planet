'use client';

import { CONTENT_AREAS, type ContentArea } from '@boia/store';
import { useState } from 'react';
import { ADMIN_COPY } from '../../../lib/admin/copy';
import type { AdminContext } from '../use-admin';
import { useRead, useRun } from '../use-admin';
import { SectionHead, StatusLine } from '../ui';

/** Temporadas (REQ-ADM-032, D-20): cada mundo es una temporada; una activa. */
export function SeasonsSection({ ctx }: { ctx: AdminContext }) {
  const active = useRead(ctx, (r) => r.content.activeWorldId());
  const { status, busy, run } = useRun();
  if (active === undefined) return <p>Cargando…</p>;
  const current = active ?? ctx.registry.defaultId;
  return (
    <section>
      <SectionHead
        title="Temporadas"
        lead="Cada mundo es una temporada. El activo es el que ve por defecto quien llega a /juego sin haber elegido otro en el menú. Duplicar temporadas llega en L2."
      />
      <fieldset className="admin-card">
        <legend>Mundo activo</legend>
        {ctx.registry.list().map((w) => (
          <label key={w.id} className="admin-check" data-testid={`temporada-${w.id}`}>
            <input
              type="radio"
              name="mundo-activo"
              checked={current === w.id}
              disabled={busy}
              onChange={() =>
                void run(() => ctx.actions.setActiveWorld(w.id), `Temporada activa: ${w.name}.`)
              }
            />
            <span>
              <strong>{w.name}</strong>
              {w.tagline ? ` · ${w.tagline}` : ''} · barco {w.shipStyle}
              {w.id === ctx.registry.defaultId ? ' · por defecto' : ''}
            </span>
          </label>
        ))}
      </fieldset>
      <StatusLine status={status} />
    </section>
  );
}

/** Usuarios de administración (REQ-ADM-002 a REQ-ADM-004): sólo lectura en la demo. */
export function UsersSection() {
  return (
    <section>
      <SectionHead
        title="Usuarios de administración"
        lead="Sólo lectura en la versión de prueba: aquí no hay cuentas ni login (D-20). Con Supabase: una cuenta por persona con email, contraseña y TOTP."
      />
      <table className="admin-table" data-testid="usuarios">
        <thead>
          <tr>
            <th>Rol</th>
            <th>Puede</th>
            <th>Cuentas</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Propietario</td>
            <td>Todo, permisos e integraciones</td>
            <td>Álvaro (pendiente)</td>
          </tr>
          <tr>
            <td>Administrador</td>
            <td>Todo menos transferir la propiedad</td>
            <td>—</td>
          </tr>
          <tr>
            <td>Editor</td>
            <td>Edita borradores, no publica</td>
            <td>—</td>
          </tr>
          <tr>
            <td>Esta demo</td>
            <td>Todo, sin login, sólo en este navegador</td>
            <td>admin-demo</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

/** Integraciones: sólo lectura en la demo. */
export function IntegrationsSection() {
  const rows: [string, string][] = [
    [
      'Ticketera',
      'Sandbox de prueba: «Comprar» da el sello directamente (D-20). La real, cuando Álvaro la elija (D-06).',
    ],
    ['Datos', 'En este navegador (repositorio local). Supabase la sustituye sin cambiar la web.'],
    ['Correo', 'Sin correo en la versión de prueba.'],
    ['Analítica', 'Eventos del embudo en la consola; PostHog sin conectar.'],
  ];
  return (
    <section>
      <SectionHead title="Integraciones" lead="Sólo lectura en la versión de prueba." />
      <table className="admin-table" data-testid="integraciones">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const AREA_LABELS: Partial<Record<string, string>> = {
  events: 'Eventos',
  homeBlocks: 'Página principal',
  artists: 'Artistas',
  albums: 'Álbumes',
  photos: 'Fotos',
  promotions: 'Promociones',
  discounts: 'Descuentos',
  achievements: 'Logros',
  cosmetics: 'Cosméticos',
  ranks: 'Rangos',
  places: 'Mundo (mapa)',
  skins: 'Mundo (pieles)',
  texts: 'Textos',
  activeWorld: 'Temporada',
  bottles: 'Moderación',
  ledger: 'Recompensas',
};

/** Auditoría local (REQ-ADM-007) y volver a la muestra (REQ-ADM-039). */
export function AuditSection({ ctx }: { ctx: AdminContext }) {
  const audit = useRead(ctx, (r) => r.admin.audit({ limit: 200 }));
  const [area, setArea] = useState<ContentArea | ''>('');
  const { status, busy, run } = useRun();
  return (
    <section>
      <SectionHead
        title="Auditoría y muestra"
        lead="Cada cambio de este Admin queda aquí (autor, fecha, antes y después). Sólo crece."
      />
      <div className="admin-card admin-row admin-row--end">
        <label className="admin-field">
          <span className="admin-field__label">Área</span>
          <select value={area} onChange={(e) => setArea(e.target.value as ContentArea | '')}>
            <option value="">Elige un área…</option>
            {CONTENT_AREAS.map((a) => (
              <option key={a} value={a}>
                {AREA_LABELS[a] ?? a}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="admin-button admin-button--ghost"
          disabled={busy || !area}
          onClick={() =>
            area && void run(() => ctx.actions.reset(area), 'Área vuelta a la muestra.')
          }
        >
          {ADMIN_COPY.resetArea}
        </button>
        <button
          type="button"
          className="admin-button admin-button--danger"
          disabled={busy}
          data-testid="reset-todo"
          onClick={() => {
            if (!window.confirm(ADMIN_COPY.confirmResetAll)) return;
            void run(() => ctx.actions.reset('all'), 'Todo vuelve a los datos de muestra.');
          }}
        >
          {ADMIN_COPY.resetAll}
        </button>
      </div>
      <StatusLine status={status} />
      <ol className="admin-audit" data-testid="auditoria">
        {(audit ?? []).map((e) => (
          <li key={e.id}>
            <time dateTime={e.at}>{new Date(e.at).toLocaleString('es-ES')}</time> ·{' '}
            <strong>{AREA_LABELS[e.area] ?? e.area}</strong> · {e.action}
            {e.targetId ? ` · ${e.targetId}` : ''}
            {e.reason ? ` · ${e.reason}` : ''} · {e.actor}
          </li>
        ))}
        {audit && audit.length === 0 ? <li className="admin-meta">Sin cambios todavía.</li> : null}
      </ol>
    </section>
  );
}
