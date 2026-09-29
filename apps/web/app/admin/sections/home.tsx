'use client';

import type { HomeBlock } from '@boia/contracts';
import { useState } from 'react';
import { isoToLocal, localToIso } from '../../../lib/admin/dates';
import type { AdminContext } from '../use-admin';
import { useRead, useRun } from '../use-admin';
import { Changed, Field, ResetButton, SectionHead, StatusLine } from '../ui';

const BLOCK_LABELS: Record<HomeBlock['type'], string> = {
  hero: 'Portada (hero)',
  priority_event: 'Evento prioritario',
  upcoming_events: 'Próximos eventos',
  artists: 'Artistas',
  philosophy: 'Filosofía',
  photos: 'Fotos',
  store: 'Tienda',
  contact: 'Contacto',
  footer: 'Pie',
};

function Schedule({ ctx, block }: { ctx: AdminContext; block: HomeBlock }) {
  const [from, setFrom] = useState(isoToLocal(block.showFrom));
  const [until, setUntil] = useState(isoToLocal(block.showUntil));
  const { status, busy, run } = useRun();
  return (
    <details className="admin-details">
      <summary>Programar</summary>
      <div className="admin-row">
        <Field label="Desde">
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            data-testid={`bloque-desde-${block.id}`}
          />
        </Field>
        <Field label="Hasta">
          <input
            type="datetime-local"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            data-testid={`bloque-hasta-${block.id}`}
          />
        </Field>
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() =>
            void run(() =>
              ctx.actions.scheduleBlock(
                block.id,
                from ? localToIso(from) : null,
                until ? localToIso(until) : null,
              ),
            )
          }
        >
          Guardar programación
        </button>
      </div>
      <StatusLine status={status} />
    </details>
  );
}

function HeroTexts({
  ctx,
  block,
}: {
  ctx: AdminContext;
  block: Extract<HomeBlock, { type: 'hero' }>;
}) {
  const [title, setTitle] = useState(block.title);
  const [positioning, setPositioning] = useState(block.positioning);
  const { status, busy, run } = useRun();
  return (
    <details className="admin-details">
      <summary>Titular y subtítulo</summary>
      <Field label="Titular">
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Subtítulo">
        <input value={positioning} onChange={(e) => setPositioning(e.target.value)} />
      </Field>
      <button
        type="button"
        className="admin-button"
        disabled={busy}
        onClick={() =>
          void run(() =>
            ctx.repo.admin.upsert(
              'homeBlocks',
              { ...block, title, positioning },
              { reason: 'portada' },
            ),
          )
        }
      >
        Guardar portada
      </button>
      <StatusLine status={status} />
    </details>
  );
}

/** Vista previa de la home en móvil o escritorio, con los cambios de este navegador. */
function Preview({ revision }: { revision: number }) {
  const [mode, setMode] = useState<'movil' | 'escritorio' | null>(null);
  const size = mode === 'movil' ? { w: 390, h: 760 } : { w: 1280, h: 800 };
  const scale = mode === 'movil' ? 0.8 : 0.45;
  return (
    <div className="admin-preview">
      <div className="admin-row">
        <button
          type="button"
          className="admin-button admin-button--ghost"
          aria-pressed={mode === 'movil'}
          data-testid="vista-movil"
          onClick={() => setMode(mode === 'movil' ? null : 'movil')}
        >
          Vista previa móvil
        </button>
        <button
          type="button"
          className="admin-button admin-button--ghost"
          aria-pressed={mode === 'escritorio'}
          data-testid="vista-escritorio"
          onClick={() => setMode(mode === 'escritorio' ? null : 'escritorio')}
        >
          Vista previa escritorio
        </button>
      </div>
      {mode ? (
        <div
          className="admin-preview__frame"
          style={{ width: size.w * scale, height: size.h * scale }}
        >
          <iframe
            key={`${mode}-${revision}`}
            title={`Vista previa ${mode}`}
            src="/?intro=0"
            width={size.w}
            height={size.h}
            style={{ transform: `scale(${scale})` }}
            data-testid="vista-previa"
          />
        </div>
      ) : null}
    </div>
  );
}

/** Página principal (REQ-ADM-017): orden, mostrar u ocultar, programar, evento prioritario, vista previa. */
export function HomeSection({ ctx }: { ctx: AdminContext }) {
  const blocks = useRead(ctx, (r) => r.content.list('homeBlocks'));
  const events = useRead(ctx, (r) => r.content.events());
  const changed = useRead(ctx, (r) => r.admin.overridden('homeBlocks'));
  const { status, busy, run } = useRun();
  if (!blocks || !events) return <p>Cargando…</p>;
  const priority = blocks.find((b) => b.type === 'priority_event');
  const changedSet = new Set(changed ?? []);

  return (
    <section aria-labelledby="admin-h-home">
      <SectionHead
        title="Página principal"
        lead="Ordena, muestra u oculta y programa los bloques de la home. Todo con formularios, sin HTML."
      >
        <ResetButton ctx={ctx} areas={['homeBlocks']} />
      </SectionHead>
      <h3 id="admin-h-home" className="visually-hidden">
        Bloques
      </h3>
      <ol className="admin-list" data-testid="bloques">
        {blocks.map((b, i) => (
          <li key={b.id} className="admin-card" data-testid={`bloque-${b.id}`}>
            <div className="admin-row admin-row--between">
              <strong>
                {i + 1}. {BLOCK_LABELS[b.type]} <Changed on={changedSet.has(b.id)} />
              </strong>
              <span className="admin-row">
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={b.visible}
                    disabled={busy}
                    data-testid={`bloque-visible-${b.id}`}
                    onChange={(e) =>
                      void run(() => ctx.actions.setBlockVisible(b.id, e.target.checked))
                    }
                  />
                  Visible
                </label>
                <button
                  type="button"
                  className="admin-icon"
                  aria-label={`Subir ${BLOCK_LABELS[b.type]}`}
                  disabled={busy || i === 0}
                  data-testid={`bloque-subir-${b.id}`}
                  onClick={() => void run(() => ctx.actions.moveBlock(b.id, -1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-icon"
                  aria-label={`Bajar ${BLOCK_LABELS[b.type]}`}
                  disabled={busy || i === blocks.length - 1}
                  data-testid={`bloque-bajar-${b.id}`}
                  onClick={() => void run(() => ctx.actions.moveBlock(b.id, 1))}
                >
                  ↓
                </button>
              </span>
            </div>
            {b.showFrom || b.showUntil ? (
              <p className="admin-meta">
                Programado {b.showFrom ? `desde ${isoToLocal(b.showFrom).replace('T', ' ')}` : ''}{' '}
                {b.showUntil ? `hasta ${isoToLocal(b.showUntil).replace('T', ' ')}` : ''}
              </p>
            ) : null}
            {b.type === 'priority_event' ? (
              <Field
                label="Evento prioritario"
                hint="Si deja de estar vigente, la home elige otro (REQ-COM-009)."
              >
                <select
                  value={priority?.type === 'priority_event' ? (priority.eventId ?? '') : ''}
                  disabled={busy}
                  data-testid="evento-prioritario"
                  onChange={(e) =>
                    void run(() => ctx.actions.setPriorityEvent(e.target.value || null))
                  }
                >
                  <option value="">El próximo a la venta</option>
                  {events
                    .filter((e) => e.state !== 'draft')
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
              </Field>
            ) : null}
            {b.type === 'hero' ? (
              <HeroTexts key={`${b.title}|${b.positioning}`} ctx={ctx} block={b} />
            ) : null}
            <Schedule key={`${b.showFrom}|${b.showUntil}`} ctx={ctx} block={b} />
          </li>
        ))}
      </ol>
      <StatusLine status={status} />
      <h3>Vista previa</h3>
      <Preview revision={ctx.revision} />
    </section>
  );
}
