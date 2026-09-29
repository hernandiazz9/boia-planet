'use client';

import type { AdminBottleView, AdminCarnetView, CarnetModerationAction } from '@boia/store';
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

/** Textos de la moderación de Carnets (textos-zonas, zona 18). muestra */
const CARNET_MOD = {
  heading: 'Carnets reportados',
  empty: 'No hay Carnets reportados. Buena señal.',
  hideAnswer: 'Ocultar respuesta',
  hidePhoto: 'Ocultar foto',
  resetNickname: 'Restablecer apodo',
  dismiss: 'Descartar el reporte',
  reason: 'Motivo (queda en la auditoría)',
} as const;

/** Un Carnet reportado: sus reportes y lo que se le puede retirar (REQ-ADM-040). */
function CarnetRow({ ctx, row }: { ctx: AdminContext; row: AdminCarnetView }) {
  const [reason, setReason] = useState(row.reports.find((r) => r.reason)?.reason ?? '');
  const { status, busy, run } = useRun();
  const { carnet, moderation } = row;
  const act = (action: CarnetModerationAction, ok: string) =>
    void run(() => ctx.actions.moderateCarnet(row.userId, action, reason), ok);
  const hasPhoto = !!carnet.avatarImage || !!carnet.avatarKey;
  return (
    <li
      className="admin-card"
      data-testid={`carnet-reportado-${row.userId}`}
      data-abiertos={row.open}
    >
      <p>
        <strong>{carnet.nickname}</strong>
        {carnet.isSample ? ' · muestra' : ''}
        {moderation?.nickname ? ' · apodo restablecido' : ''}
        {moderation?.photo ? ' · foto retirada' : ''}
      </p>
      <p className="admin-meta">
        {row.reports.length} {row.reports.length === 1 ? 'reporte' : 'reportes'}
        {row.open ? ` (${row.open} sin revisar)` : ' · revisado'}
      </p>
      <ul className="admin-reports">
        {row.reports.map((r) => (
          <li key={r.id}>
            {r.reason ?? 'sin motivo'} · {r.resolution ? `resuelto: ${r.resolution}` : 'pendiente'}
            {!r.resolvedAt ? (
              <button
                type="button"
                className="admin-link"
                disabled={busy}
                data-testid={`carnet-descartar-${r.id}`}
                onClick={() =>
                  void run(
                    () => ctx.actions.dismissCarnetReport(r.id, reason),
                    'Reporte descartado.',
                  )
                }
              >
                {CARNET_MOD.dismiss}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <label className="admin-field">
        <span className="admin-field__label">{CARNET_MOD.reason}</span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          data-testid={`carnet-motivo-${row.userId}`}
        />
      </label>
      {carnet.answers.length ? (
        <ul className="admin-list">
          {carnet.answers.map((a) => {
            const hidden = moderation?.answers[a.questionId] === a.answer;
            return (
              <li key={a.questionId} className="admin-row admin-row--between">
                <span>
                  <span className="admin-meta">{a.question}</span>
                  <br />
                  {a.answer}
                  {hidden ? ' · oculta' : ''}
                </span>
                {hidden ? null : (
                  <button
                    type="button"
                    className="admin-button admin-button--ghost"
                    disabled={busy}
                    data-testid={`carnet-ocultar-${row.userId}-${a.questionId}`}
                    onClick={() =>
                      act({ kind: 'hide_answer', questionId: a.questionId }, 'Respuesta oculta.')
                    }
                  >
                    {CARNET_MOD.hideAnswer}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="admin-row admin-row--end">
        <button
          type="button"
          className="admin-button admin-button--ghost"
          disabled={busy || !hasPhoto || !!moderation?.photo}
          data-testid={`carnet-ocultar-foto-${row.userId}`}
          onClick={() => act({ kind: 'hide_photo' }, 'Foto oculta.')}
        >
          {CARNET_MOD.hidePhoto}
        </button>
        <button
          type="button"
          className="admin-button admin-button--danger"
          disabled={busy || moderation?.nickname === carnet.nickname}
          data-testid={`carnet-restablecer-apodo-${row.userId}`}
          onClick={() => act({ kind: 'reset_nickname' }, 'Apodo restablecido.')}
        >
          {CARNET_MOD.resetNickname}
        </button>
      </div>
      <StatusLine status={status} />
    </li>
  );
}

/** Carnets reportados (REQ-ADM-040, O9): se retira algo sin borrar el Carnet. */
function CarnetReports({ ctx }: { ctx: AdminContext }) {
  const rows = useRead(ctx, (r) => r.admin.carnetReports());
  if (!rows) return <p>Cargando…</p>;
  return (
    <>
      <h3>{CARNET_MOD.heading}</h3>
      {rows.length === 0 ? (
        <p className="admin-meta" data-testid="carnets-reportados-vacio">
          {CARNET_MOD.empty}
        </p>
      ) : (
        <ul className="admin-list" data-testid="carnets-reportados">
          {rows.map((row) => (
            <CarnetRow key={`${row.userId}|${row.open}`} ctx={ctx} row={row} />
          ))}
        </ul>
      )}
    </>
  );
}

/** Moderación (REQ-ADM-027, REQ-ADM-028, REQ-ADM-040): Carnets y botellas reportados; recompensas implausibles. */
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
        lead="Carnets y botellas reportados. En la versión de prueba sólo están los de muestra y los de este navegador."
      />
      <CarnetReports ctx={ctx} />
      <h3>Botellas</h3>
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
