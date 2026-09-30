'use client';

import type { ContentArea, DraftChange, EntityArea } from '@boia/store';
import { type ReactNode, useState } from 'react';
import { ADMIN_COPY, ADMIN_PREVIEW_PATH } from '../../lib/admin/copy';
import { type Reference, itemName } from '../../lib/admin/references';
import type { AdminContext, Status } from './use-admin';
import { useRead, useRun } from './use-admin';
import { t as msg } from '../../lib/i18n';

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
          }, msg('admin.ui.vueltoALosDatos'))
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
    <span className="admin-badge" title={msg('admin.ui.cambiadoEnElAdmin')}>
      {msg('admin.ui.cambiado')}
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

/**
 * «A la papelera» con aviso de impacto (REQ-ADM-029): antes de borrar enseña
 * el elemento y lo que lo nombra (home, mapa, eventos, logros…) y pide
 * escribir su nombre exacto como segunda confirmación.
 */
export function DeleteButton({
  ctx,
  area,
  id,
  label = msg('admin.ui.aLaPapelera'),
}: {
  ctx: AdminContext;
  area: EntityArea;
  id: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<{ name: string; references: Reference[] } | null>(null);
  const [typed, setTyped] = useState('');
  const { status, busy, run } = useRun();
  const start = () =>
    void run(async () => {
      setImpact(await ctx.actions.impact(area, id));
      setTyped('');
      setOpen(true);
    }, msg('admin.ui.revisaLoQueSe'));
  return (
    <span className="admin-delete">
      <button
        type="button"
        className="admin-button admin-button--ghost"
        disabled={busy}
        data-testid={`borrar-${area}-${id}`}
        onClick={() => (open ? setOpen(false) : start())}
      >
        {label}
      </button>
      {open && impact ? (
        <div className="admin-card admin-delete__panel" role="group" data-testid="borrar-panel">
          <p>
            {msg('admin.ui.vasAMandarA')} <strong>«{impact.name}»</strong>
            {msg('admin.ui.sePuedeRecuperarHasta')}
          </p>
          {impact.references.length ? (
            <>
              <p className="admin-meta">
                {msg('admin.ui.loNombran', { length: impact.references.length })}
              </p>
              <ul className="admin-impact" data-testid="borrar-impacto">
                {impact.references.map((r, i) => (
                  <li key={i}>
                    <strong>{r.where}</strong>: {r.what}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="admin-meta" data-testid="borrar-impacto">
              {msg('admin.ui.nadaLoNombra')}
            </p>
          )}
          <Field label={msg('admin.ui.paraConfirmarEscribe', { name: impact.name })}>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              data-testid="borrar-nombre"
            />
          </Field>
          <div className="admin-row">
            <button
              type="button"
              className="admin-button admin-button--danger"
              disabled={busy || typed.trim() !== impact.name}
              data-testid="borrar-confirmar"
              onClick={() =>
                void run(async () => {
                  await ctx.actions.trashItem(area, id, typed);
                  setOpen(false);
                }, msg('admin.ui.enviadoALaPapelera'))
              }
            >
              {msg('admin.ui.borrar')}
            </button>
            <button
              type="button"
              className="admin-button admin-button--ghost"
              onClick={() => setOpen(false)}
            >
              {msg('carnet.cancel')}
            </button>
          </div>
        </div>
      ) : null}
      {status.kind !== 'idle' ? <StatusLine status={status} /> : null}
    </span>
  );
}

/** Lo de un área que está en la papelera, con «Recuperar» (la purga, en Papelera). */
export function TrashInline({ ctx, area }: { ctx: AdminContext; area: EntityArea }) {
  const trash = useRead(ctx, (r) => r.admin.trash());
  const { status, busy, run } = useRun();
  const items = (trash ?? []).filter((t) => t.area === area);
  if (items.length === 0) return null;
  return (
    <div className="admin-meta" data-testid={`papelera-${area}`}>
      {msg('admin.ui.enLaPapelera')}{' '}
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          className="admin-link"
          disabled={busy}
          onClick={() =>
            void run(() => ctx.repo.admin.restore(area, t.id), msg('admin.ui.recuperado'))
          }
        >
          {msg('admin.ui.recuperar', { itemName: itemName(area, t.value) })}
        </button>
      ))}
      <StatusLine status={status} />
    </div>
  );
}

const CHANGE_LABELS: Record<DraftChange['kind'], string> = {
  item: 'cambio',
  order: 'orden',
  text: 'texto',
};

/**
 * Borrador de la home y los eventos (REQ-ADM-015): cuántos cambios hay sin
 * publicar, vista previa privada, «Publicar» (todo de una vez, si no hay
 * referencias rotas ni un mar que no se juegue) y «Descartar».
 */
export function DraftBar({ ctx }: { ctx: AdminContext }) {
  const pending = useRead(ctx, (r) => r.admin.pendingDrafts());
  const [problems, setProblems] = useState<string[] | null>(null);
  const { status, busy, run } = useRun();
  const n = pending?.length ?? 0;
  return (
    <div
      className={`admin-card admin-draftbar${n ? ' admin-draftbar--pending' : ''}`}
      data-testid="borrador"
      data-pendientes={n}
    >
      <div className="admin-row admin-row--between">
        <p>
          {n === 0 ? (
            msg('admin.ui.sinCambiosEnBorrador')
          ) : (
            <>
              <strong>
                {n === 1
                  ? msg('admin.ui.n1CambioSinPublicar')
                  : msg('admin.ui.cambiosSinPublicar', { n })}
              </strong>{' '}
              {msg('admin.ui.enLaHomeY')}
            </>
          )}
        </p>
        <span className="admin-row">
          <a
            className="admin-button admin-button--ghost"
            href={ADMIN_PREVIEW_PATH}
            target="_blank"
            rel="noreferrer"
            data-testid="borrador-vista-previa"
          >
            {msg('admin.ui.vistaPrevia')}
          </a>
          <button
            type="button"
            className="admin-button"
            disabled={busy || n === 0}
            data-testid="publicar"
            onClick={() =>
              void run(async () => {
                const found = await ctx.actions.publishProblems();
                setProblems(found);
                if (found.length) throw new Error('arregla lo de abajo antes de publicar');
                await ctx.actions.publish();
              }, msg('admin.ui.publicadoYaSeVe'))
            }
          >
            {msg('admin.ui.publicar')}
          </button>
          <button
            type="button"
            className="admin-button admin-button--ghost"
            disabled={busy || n === 0}
            data-testid="descartar-borrador"
            onClick={() => {
              if (!window.confirm(msg('admin.ui.tirarTodosLosCambios'))) return;
              void run(async () => {
                await ctx.actions.discardDrafts();
                setProblems(null);
              }, msg('admin.ui.borradorDescartado'));
            }}
          >
            {msg('admin.ui.descartarBorrador')}
          </button>
        </span>
      </div>
      {n > 0 ? (
        <details className="admin-details">
          <summary>{msg('admin.ui.queCambia')}</summary>
          <ul className="admin-impact">
            {(pending ?? []).map((c, i) => (
              <li key={i}>
                {c.area} · {CHANGE_LABELS[c.kind]}
                {c.id ? ` · ${c.id}` : ''}
                {c.isNew ? msg('admin.ui.nuevo') : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {problems && problems.length ? (
        <ul className="admin-impact admin-impact--error" data-testid="borrador-problemas">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      <StatusLine status={status} />
    </div>
  );
}
