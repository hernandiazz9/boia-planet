'use client';

import { EVENT_STATES, type BoiaEvent, type EventState } from '@boia/contracts';
import { useState } from 'react';
import type { EventInput } from '../../../lib/admin/actions';
import { ADMIN_COPY } from '../../../lib/admin/copy';
import { DEFAULT_TIME_ZONE, isoToLocal, localToIso } from '../../../lib/admin/dates';
import { eventIslands, islandEvent, islandMemories } from '../../../lib/admin/world';
import type { AdminContext } from '../use-admin';
import { useRead, useRun } from '../use-admin';
import { Changed, Field, ResetButton, SectionHead, StatusLine } from '../ui';

export const STATE_LABELS: Record<EventState, string> = {
  draft: 'Borrador',
  coming_soon: 'Próximamente',
  on_sale: 'A la venta',
  sold_out: 'Agotado',
  postponed: 'Pospuesto',
  cancelled: 'Cancelado',
  finished: 'Finalizado',
};

const SANDBOX_TICKETS = 'https://example.com/boia-sandbox/tickets';

interface Draft {
  id?: string;
  slug?: string;
  name: string;
  format: string;
  startsAt: string;
  placeLabel: string;
  state: EventState;
  stateNote: string;
  description: string;
  ticketUrl: string;
  islandId: string;
  artistIds: string[];
  sample?: boolean;
}

const EMPTY: Draft = {
  name: '',
  format: 'All Day BOIA',
  startsAt: '',
  placeLabel: 'Alicante',
  state: 'draft',
  stateNote: '',
  description: '',
  ticketUrl: '',
  islandId: '',
  artistIds: [],
};

function draftOf(e: BoiaEvent): Draft {
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    format: e.format,
    startsAt: isoToLocal(e.startsAt, e.timeZone),
    placeLabel: e.placeLabel,
    state: e.state,
    stateNote: e.stateNote ?? '',
    description: e.description,
    ticketUrl: e.ticketUrl ?? '',
    islandId: e.islandId ?? '',
    artistIds: e.artistIds,
    sample: e.sample,
  };
}

function EventForm({
  ctx,
  initial,
  onDone,
}: {
  ctx: AdminContext;
  initial: Draft;
  onDone: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const artists = useRead(ctx, (r) => r.content.list('artists'));
  const { status, busy, run } = useRun();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const islands = eventIslands(ctx.registry.map);
  const worldName = (id: string) =>
    ctx.registry.get(ctx.registry.defaultId).places.find((p) => p.id === id)?.name ?? id;

  const save = () =>
    run(async () => {
      const startsAt = localToIso(d.startsAt, DEFAULT_TIME_ZONE);
      if (!startsAt) throw new Error('falta la fecha y hora del evento');
      const input: EventInput = {
        ...(d.id ? { id: d.id } : {}),
        ...(d.slug ? { slug: d.slug } : {}),
        name: d.name,
        format: d.format,
        startsAt,
        timeZone: DEFAULT_TIME_ZONE,
        placeLabel: d.placeLabel,
        state: d.state,
        description: d.description,
        artistIds: d.artistIds,
        ...(d.stateNote ? { stateNote: d.stateNote } : {}),
        ...(d.ticketUrl ? { ticketUrl: d.ticketUrl } : {}),
        ...(d.islandId ? { islandId: d.islandId } : {}),
        ...(d.sample !== undefined ? { sample: d.sample } : {}),
      };
      await ctx.actions.saveEvent(input, d.id ? 'editar evento' : 'nuevo evento');
      onDone();
    }, 'Evento guardado en este navegador.');

  return (
    <form
      className="admin-card admin-form"
      data-testid="evento-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h3>{d.id ? `Editar «${initial.name}»` : 'Nuevo evento'}</h3>
      <div className="admin-grid">
        <Field label="Nombre">
          <input
            required
            value={d.name}
            onChange={(e) => set('name', e.target.value)}
            data-testid="evento-nombre"
          />
        </Field>
        <Field label="Formato">
          <input required value={d.format} onChange={(e) => set('format', e.target.value)} />
        </Field>
        <Field label="Fecha y hora (Alicante)">
          <input
            type="datetime-local"
            required
            value={d.startsAt}
            onChange={(e) => set('startsAt', e.target.value)}
            data-testid="evento-fecha"
          />
        </Field>
        <Field label="Lugar público" hint="Nunca la dirección de una ubicación secreta.">
          <input
            required
            value={d.placeLabel}
            onChange={(e) => set('placeLabel', e.target.value)}
          />
        </Field>
        <Field label="Estado">
          <select
            value={d.state}
            onChange={(e) => set('state', e.target.value as EventState)}
            data-testid="evento-estado"
          >
            {EVENT_STATES.map((s) => (
              <option key={s} value={s}>
                {STATE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nota del estado" hint="Para pospuesto o cancelado.">
          <input value={d.stateNote} onChange={(e) => set('stateNote', e.target.value)} />
        </Field>
        <Field label="Isla del evento" hint={ADMIN_COPY.islandKeepsMemories}>
          <select
            value={d.islandId}
            onChange={(e) => set('islandId', e.target.value)}
            data-testid="evento-isla"
          >
            <option value="">Sin isla</option>
            {islands.map((p) => (
              <option key={p.id} value={p.id}>
                {worldName(p.id)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Enlace de entradas" hint="Sandbox hasta que haya ticketera (D-06, D-20).">
          <input
            type="url"
            value={d.ticketUrl}
            placeholder={`${SANDBOX_TICKETS}/…`}
            onChange={(e) => set('ticketUrl', e.target.value)}
            data-testid="evento-tickets"
          />
        </Field>
      </div>
      <Field label="Descripción">
        <textarea
          rows={3}
          value={d.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>
      <details className="admin-details">
        <summary>Cartel ({d.artistIds.length} artistas)</summary>
        <ul className="admin-checklist">
          {(artists ?? []).map((a) => (
            <li key={a.id}>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={d.artistIds.includes(a.id)}
                  onChange={(e) =>
                    set(
                      'artistIds',
                      e.target.checked
                        ? [...d.artistIds, a.id]
                        : d.artistIds.filter((x) => x !== a.id),
                    )
                  }
                />
                {a.name}
              </label>
            </li>
          ))}
        </ul>
      </details>
      <div className="admin-row">
        <button type="submit" className="admin-button" disabled={busy} data-testid="evento-guardar">
          Guardar evento
        </button>
        <button type="button" className="admin-button admin-button--ghost" onClick={onDone}>
          Cancelar
        </button>
        {!d.id && !d.ticketUrl && d.name ? (
          <button
            type="button"
            className="admin-button admin-button--ghost"
            onClick={() =>
              set(
                'ticketUrl',
                `${SANDBOX_TICKETS}/${encodeURIComponent(d.name.toLowerCase().replace(/\s+/g, '-'))}`,
              )
            }
          >
            Usar enlace sandbox
          </button>
        ) : null}
      </div>
      <StatusLine status={status} />
    </form>
  );
}

/** Eventos (REQ-ADM-018): crear, duplicar, editar, estados a mano, isla, papelera. */
export function EventsSection({ ctx }: { ctx: AdminContext }) {
  const events = useRead(ctx, (r) => r.content.events());
  const changed = useRead(ctx, (r) => r.admin.overridden('events'));
  const [editing, setEditing] = useState<Draft | null>(null);
  const { status, busy, run } = useRun();
  if (!events) return <p>Cargando…</p>;
  const ids = new Set(events.map((e) => e.id));
  const trashed = (changed ?? []).filter((id) => !ids.has(id));
  const changedSet = new Set(changed ?? []);
  const now = new Date();
  const worldPlaces = ctx.registry.get(ctx.registry.defaultId).places;
  const islandName = (id: string | undefined) =>
    id ? (worldPlaces.find((p) => p.id === id)?.name ?? id) : '—';

  return (
    <section>
      <SectionHead
        title="Eventos"
        lead="Cada evento tiene uno de los siete estados, que se cambia a mano, y puede ir a una isla."
      >
        <button
          type="button"
          className="admin-button"
          data-testid="evento-nuevo"
          onClick={() => setEditing({ ...EMPTY })}
        >
          Nuevo evento
        </button>
        <ResetButton ctx={ctx} areas={['events']} />
      </SectionHead>
      {editing ? (
        <EventForm
          key={editing.id ?? 'nuevo'}
          ctx={ctx}
          initial={editing}
          onDone={() => setEditing(null)}
        />
      ) : null}
      <ul className="admin-list" data-testid="eventos">
        {events.map((e) => (
          <li key={e.id} className="admin-card" data-testid={`evento-${e.id}`}>
            <div className="admin-row admin-row--between">
              <div>
                <strong>{e.name}</strong> <Changed on={changedSet.has(e.id)} />
                <p className="admin-meta">
                  {isoToLocal(e.startsAt, e.timeZone).replace('T', ' ')} · {e.placeLabel} · isla:{' '}
                  {islandName(e.islandId)}
                  {e.sample ? ' · muestra' : ''}
                </p>
              </div>
              <label className="admin-field admin-field--inline">
                <span className="admin-field__label">Estado</span>
                <select
                  value={e.state}
                  disabled={busy}
                  data-testid={`evento-estado-${e.id}`}
                  onChange={(ev) =>
                    void run(() =>
                      ctx.actions.setEventState(e.id, ev.target.value as EventState, e.stateNote),
                    )
                  }
                >
                  {EVENT_STATES.map((s) => (
                    <option key={s} value={s}>
                      {STATE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="admin-row">
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={() => setEditing(draftOf(e))}
                data-testid={`evento-editar-${e.id}`}
              >
                Editar
              </button>
              <button
                type="button"
                className="admin-button admin-button--ghost"
                disabled={busy}
                onClick={() =>
                  void run(() => ctx.actions.duplicateEvent(e.id), 'Duplicado como borrador.')
                }
              >
                Duplicar
              </button>
              <button
                type="button"
                className="admin-button admin-button--ghost"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => ctx.repo.admin.remove('events', e.id, { reason: 'papelera' }),
                    'Enviado a la papelera.',
                  )
                }
              >
                A la papelera
              </button>
            </div>
          </li>
        ))}
      </ul>
      {trashed.length > 0 ? (
        <div className="admin-card">
          <h3>Papelera</h3>
          <ul className="admin-list">
            {trashed.map((id) => (
              <li key={id} className="admin-row admin-row--between">
                <span>{id}</span>
                <button
                  type="button"
                  className="admin-button admin-button--ghost"
                  disabled={busy}
                  onClick={() =>
                    void run(() => ctx.repo.admin.restore('events', id), 'Recuperado.')
                  }
                >
                  Recuperar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <StatusLine status={status} />
      <h3>Islas y eventos</h3>
      <p className="admin-lead">{ADMIN_COPY.islandKeepsMemories}</p>
      <ul className="admin-list" data-testid="islas-eventos">
        {eventIslands(ctx.registry.map).map((p) => {
          const current = islandEvent(p.id, events, now);
          const memories = islandMemories(p.id, events, now);
          return (
            <li key={p.id} className="admin-card" data-testid={`isla-${p.id}`}>
              <strong>{islandName(p.id)}</strong>
              <p className="admin-meta">
                Abre ahora: {current ? current.name : 'su panel de isla (sin evento vigente)'}
              </p>
              <p className="admin-meta">
                Recuerdos:{' '}
                {memories.length ? memories.map((m) => m.name).join(' · ') : 'ninguno todavía'}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
