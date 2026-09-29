'use client';

import type { AdminBottleView } from '@boia/store';
import { useState } from 'react';
import type { AdminContext } from '../use-admin';
import { useRead, useRun } from '../use-admin';
import { SectionHead, StatusLine } from '../ui';

const STATUS_LABELS: Record<string, string> = {
  active: 'en el mar',
  retired: 'retirada por su autor',
  removed: 'retirada por moderación',
};

function BottleRow({ ctx, b }: { ctx: AdminContext; b: AdminBottleView }) {
  const [reason, setReason] = useState(b.reports.find((r) => r.reason)?.reason ?? '');
  const { status, busy, run } = useRun();
  const open = b.reports.filter((r) => r.resolvedAt === null);
  return (
    <li className="admin-card" data-testid={`botella-${b.id}`} data-estado={b.status}>
      <p>«{b.message}»</p>
      <p className="admin-meta">
        {b.authorNickname ?? 'sin apodo'}
        {b.isSample ? ' · muestra' : ''} · {STATUS_LABELS[b.status] ?? b.status} ·{' '}
        {b.reports.length} {b.reports.length === 1 ? 'reporte' : 'reportes'}
        {open.length ? ` (${open.length} sin revisar)` : ''}
        {b.moderationReason ? ` · motivo: ${b.moderationReason}` : ''}
      </p>
      {b.reports.length ? (
        <ul className="admin-reports">
          {b.reports.map((r) => (
            <li key={r.id}>
              {r.reason ?? 'sin motivo'} ·{' '}
              {r.resolution ? `resuelto: ${r.resolution}` : 'pendiente'}
              {!r.resolvedAt ? (
                <button
                  type="button"
                  className="admin-link"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => ctx.repo.admin.resolveReport(r.id, 'descartado'),
                      'Reporte descartado.',
                    )
                  }
                >
                  descartar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {b.status === 'active' ? (
        <div className="admin-row admin-row--end">
          <label className="admin-field">
            <span className="admin-field__label">Motivo</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid={`botella-motivo-${b.id}`}
            />
          </label>
          <button
            type="button"
            className="admin-button admin-button--danger"
            disabled={busy}
            data-testid={`botella-retirar-${b.id}`}
            onClick={() =>
              void run(() => ctx.actions.removeBottle(b.id, reason), 'Botella retirada del mar.')
            }
          >
            Retirar del mar
          </button>
        </div>
      ) : null}
      <StatusLine status={status} />
    </li>
  );
}

/** Moderación (REQ-ADM-027, REQ-ADM-028): botellas y reportes; recompensas implausibles. */
export function ModerationSection({ ctx }: { ctx: AdminContext }) {
  const bottles = useRead(ctx, (r) => r.admin.bottles());
  const ledger = useRead(ctx, (r) => r.progress.ledger());
  const [onlyReported, setOnlyReported] = useState(false);
  const [why, setWhy] = useState('');
  const { status, busy, run } = useRun();
  if (!bottles) return <p>Cargando…</p>;
  const reported = (b: AdminBottleView) => b.reports.length > 0;
  const list = [...bottles]
    .sort((a, b) => Number(reported(b)) - Number(reported(a)))
    .filter((b) => !onlyReported || reported(b));
  const compensated = new Set(
    (ledger ?? []).flatMap((e) => (e.compensatesId ? [e.compensatesId] : [])),
  );
  const rewards = (ledger ?? []).filter(
    (e) => (e.kind === 'world_reward' || e.kind === 'achievement') && !compensated.has(e.id),
  );
  return (
    <section>
      <SectionHead
        title="Moderación"
        lead="Botellas del mar y sus reportes. En la versión de prueba sólo están las de muestra y las de este navegador."
      />
      <label className="admin-check">
        <input
          type="checkbox"
          checked={onlyReported}
          onChange={(e) => setOnlyReported(e.target.checked)}
        />
        Sólo las reportadas
      </label>
      <ul className="admin-list" data-testid="botellas">
        {list.map((b) => (
          <BottleRow key={`${b.id}|${b.status}|${b.reports.length}`} ctx={ctx} b={b} />
        ))}
      </ul>
      <h3>Recompensas de este navegador</h3>
      <p className="admin-lead">
        Retirar a mano una recompensa implausible: queda una compensación en el libro y en la
        auditoría.
      </p>
      <label className="admin-field">
        <span className="admin-field__label">Motivo</span>
        <input value={why} onChange={(e) => setWhy(e.target.value)} />
      </label>
      <ul className="admin-list">
        {rewards.length === 0 ? <li className="admin-meta">Sin recompensas todavía.</li> : null}
        {rewards.map((e) => (
          <li key={e.id} className="admin-row admin-row--between">
            <span>
              {e.sourceRef ?? e.achievementId ?? e.id} · {e.pointsDelta} puntos · {e.coinsDelta}{' '}
              monedas
            </span>
            <button
              type="button"
              className="admin-button admin-button--ghost"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!why.trim()) throw new Error('hace falta un motivo');
                  await ctx.repo.admin.compensate(e.id, why.trim());
                }, 'Recompensa retirada.')
              }
            >
              Retirar
            </button>
          </li>
        ))}
      </ul>
      <StatusLine status={status} />
    </section>
  );
}
