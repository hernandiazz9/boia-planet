'use client';

import type { ContentArea } from '@boia/store';
import type { ReactNode } from 'react';
import { ADMIN_COPY } from '../../lib/admin/copy';
import type { AdminContext, Status } from './use-admin';
import { useRun } from './use-admin';

/** Resultado del último cambio de la sección (anunciado a lectores de pantalla). */
export function StatusLine({ status }: { status: Status }) {
  if (status.kind === 'idle') return <p className="admin-status" role="status" />;
  return status.kind === 'ok' ? (
    <p className="admin-status admin-status--ok" role="status" data-testid="admin-ok">
      {status.text}
    </p>
  ) : (
    <p className="admin-status admin-status--error" role="alert" data-testid="admin-error">
      {status.text}
    </p>
  );
}

export function SectionHead({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="admin-section-head">
      <div>
        <h2>{title}</h2>
        {lead ? <p className="admin-lead">{lead}</p> : null}
      </div>
      {children ? <div className="admin-section-tools">{children}</div> : null}
    </header>
  );
}

/** «Volver a la muestra» de un área (o varias), con su propia línea de estado. */
export function ResetButton({
  ctx,
  areas,
  label = ADMIN_COPY.resetArea,
}: {
  ctx: AdminContext;
  areas: readonly ContentArea[];
  label?: string;
}) {
  const { status, busy, run } = useRun();
  return (
    <span className="admin-reset">
      <button
        type="button"
        className="admin-button admin-button--ghost"
        disabled={busy}
        data-testid={`reset-${areas.join('-')}`}
        onClick={() =>
          void run(async () => {
            for (const a of areas) await ctx.actions.reset(a);
          }, 'Vuelto a los datos de muestra.')
        }
      >
        {label}
      </button>
      {status.kind !== 'idle' ? <StatusLine status={status} /> : null}
    </span>
  );
}

/** Marca de «cambiado en el Admin». */
export function Changed({ on }: { on: boolean }) {
  return on ? (
    <span className="admin-badge" title="Cambiado en el Admin (sólo en este navegador)">
      cambiado
    </span>
  ) : null;
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="admin-field">
      <span className="admin-field__label">{label}</span>
      {children}
      {hint ? <span className="admin-field__hint">{hint}</span> : null}
    </label>
  );
}
