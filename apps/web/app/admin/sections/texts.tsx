'use client';

import { useState } from 'react';
import { es, type MessageKey } from '../../../lib/i18n/es';
import type { AdminContext } from '../use-admin';
import { useRead, useRun } from '../use-admin';
import { Changed, ResetButton, SectionHead, StatusLine } from '../ui';

/** Textos de la web que se pueden cambiar: los de la landing sin variables. */
const KEYS = (Object.keys(es) as MessageKey[]).filter((k) => !es[k].includes('{'));

const GROUPS: [string, string][] = [
  ['hero.', 'Portada'],
  ['nav.', 'Cabecera'],
  ['tickets.', 'Tickets'],
  ['event.', 'Eventos'],
  ['artists.', 'Artistas'],
  ['footer.', 'Pie'],
];

function groupOf(k: string): string {
  return GROUPS.find(([p]) => k.startsWith(p))?.[1] ?? 'Otros';
}

function TextRow({
  ctx,
  k,
  value,
}: {
  ctx: AdminContext;
  k: MessageKey;
  value: string | undefined;
}) {
  const [v, setV] = useState(value ?? es[k]);
  const { status, busy, run } = useRun();
  return (
    <li className="admin-text-row" data-testid={`texto-${k}`}>
      <label className="admin-field">
        <span className="admin-field__label">
          {k} <Changed on={value !== undefined} />
        </span>
        <input value={v} onChange={(e) => setV(e.target.value)} />
      </label>
      <button
        type="button"
        className="admin-button"
        disabled={busy}
        onClick={() =>
          void run(() =>
            ctx.repo.admin.setText(k, v.trim() === '' || v === es[k] ? null : v, {
              reason: 'texto',
            }),
          )
        }
      >
        Guardar
      </button>
      <StatusLine status={status} />
    </li>
  );
}

/** Textos y música (REQ-ADM-019, REQ-ADM-020). */
export function TextsSection({ ctx }: { ctx: AdminContext }) {
  const texts = useRead(ctx, (r) => r.content.texts());
  const [filter, setFilter] = useState('');
  if (!texts) return <p>Cargando…</p>;
  const q = filter.trim().toLowerCase();
  const keys = KEYS.filter((k) => !q || k.includes(q) || es[k].toLowerCase().includes(q));
  const groups = [...new Set(keys.map(groupOf))];
  return (
    <section>
      <SectionHead
        title="Textos y música"
        lead="Textos de la web. Los de cada lugar del mundo se cambian en Mundo, por mundo."
      >
        <ResetButton ctx={ctx} areas={['texts']} />
      </SectionHead>
      <label className="admin-field">
        <span className="admin-field__label">Buscar</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="explorar, tickets…"
        />
      </label>
      {groups.map((g) => (
        <details key={g} className="admin-details" open={!!q}>
          <summary>{g}</summary>
          <ul className="admin-list">
            {keys
              .filter((k) => groupOf(k) === g)
              .map((k) => (
                <TextRow key={`${k}|${texts[k] ?? ''}`} ctx={ctx} k={k} value={texts[k]} />
              ))}
          </ul>
        </details>
      ))}
      <h3>Música</h3>
      <p className="admin-lead">
        Música de ambiente y efectos, con su licencia u origen: pendiente de Álvaro (REQ-ADM-020).
        Ranura de cada mundo, sólo lectura:
      </p>
      <ul className="admin-list">
        {ctx.registry.ids().map((id) => {
          const w = ctx.registry.get(id);
          return (
            <li key={id} className="admin-meta">
              {w.theme.name}: {w.theme.music ?? 'sin música todavía'}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
