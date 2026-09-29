'use client';

import {
  EVENT_FORMATS,
  EVENT_FORMAT_LABELS,
  EVENT_STATES,
  type BoiaEvent,
  type EventFormat,
  type EventState,
  type EventStateSource,
  effectiveEvents,
  eventState,
} from '@boia/contracts';
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

export const SOURCE_LABELS: Record<EventStateSource, string> = {
  dates: 'Por fechas',
  manual: 'A mano',
};

interface Draft {
  id?: string;
  slug?: string;
  name: string;
  format: EventFormat;
  series: string;
  startsAt: string;
  endsAt: string;
  saleOpensAt: string;
  placeLabel: string;
  state: EventState;
  stateSource: EventStateSource;
  stateNote: string;
  description: string;
  /** Una actividad por línea. */
  activities: string;
  posterUrl: string;
  /** Precio en euros, como se escribe («12,50»). */
  price: string;
  priceSample: boolean;
  ticketUrl: string;
  islandId: string;
  artistIds: string[];
  sample?: boolean;
}

const EMPTY: Draft = {
  name: '',
  format: 'all_day',
  series: '',
  startsAt: '',
  endsAt: '',
  saleOpensAt: '',
  placeLabel: 'Alicante',
  state: 'draft',
  stateSource: 'dates',
  stateNote: '',
  description: '',
  activities: '',
  posterUrl: '',
  price: '',
  priceSample: true,
  ticketUrl: '',
  islandId: '',
  artistIds: [],
};

const euros = (cents: number | undefined) =>
  cents === undefined ? '' : (cents / 100).toFixed(2).replace('.', ',');

/** «12,50» → 1250. null si no es un importe. */
export function centsOf(price: string): number | null {
  const m = price
    .trim()
    .replace(',', '.')
    .match(/^\d+(\.\d{1,2})?$/);
  return m ? Math.round(Number(m[0]) * 100) : null;
}

function draftOf(e: BoiaEvent): Draft {
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    format: e.format,
    series: e.series ?? '',
    startsAt: isoToLocal(e.startsAt, e.timeZone),
    endsAt: isoToLocal(e.endsAt, e.timeZone),
    saleOpensAt: isoToLocal(e.saleOpensAt, e.timeZone),
    placeLabel: e.placeLabel,
    state: e.state,
    stateSource: e.stateSource,
    stateNote: e.stateNote ?? '',
    description: e.description,
    activities: e.activities.join('\n'),
    posterUrl: e.posterUrl ?? '',
    price: euros(e.priceCents),
    priceSample: e.priceSample,
    ticketUrl: e.ticketUrl ?? '',
    islandId: e.islandId ?? '',
    artistIds: e.artistIds,
    sample: e.sample,
  };
}

/** Fecha opcional del formulario → ISO con zona, o undefined; lanza si está mal escrita. */
function optionalIso(local: string, what: string): string | undefined {
  if (!local) return undefined;
  const iso = localToIso(local, DEFAULT_TIME_ZONE);
  if (!iso) throw new Error(`${what}: fecha no válida`);
  return iso;
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
      const endsAt = optionalIso(d.endsAt, 'fin');
      const saleOpensAt = optionalIso(d.saleOpensAt, 'apertura de la venta');
      const priceCents = d.price.trim() ? centsOf(d.price) : undefined;
      if (priceCents === null) throw new Error('precio: escribe un importe en euros, p. ej. 12,50');
      // Con apertura de venta y estado por fechas, se guarda «a la venta»: las
      // fechas enseñan «próximamente» hasta que abre (REQ-COM-004).
      const state =
        d.stateSource === 'dates' && saleOpensAt && d.state === 'coming_soon' ? 'on_sale' : d.state;
      const series = d.series.trim();
      const input: EventInput = {
        ...(d.id ? { id: d.id } : {}),
        ...(d.slug ? { slug: d.slug } : {}),
        name: d.name,
        format: d.format,
        startsAt,
        timeZone: DEFAULT_TIME_ZONE,
        placeLabel: d.placeLabel,
        state,
        stateSource: d.stateSource,
        description: d.description,
        artistIds: d.artistIds,
        activities: d.activities
          .split('\n')
          .map((a) => a.trim())
          .filter(Boolean),
        priceSample: d.priceSample,
        ...(series ? { series } : {}),
        ...(endsAt ? { endsAt } : {}),
        ...(saleOpensAt ? { saleOpensAt } : {}),
        ...(priceCents !== undefined ? { priceCents } : {}),
        ...(d.posterUrl.trim() ? { posterUrl: d.posterUrl.trim() } : {}),
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
        <Field label="Formato" hint="Un satélite sin isla sale en la isla del próximo All Day.">
          <select
            value={d.format}
            onChange={(e) => set('format', e.target.value as EventFormat)}
            data-testid="evento-formato"
          >
            {EVENT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {EVENT_FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Serie" hint="Clave en minúsculas: boia-club, noche… Sale en las tarjetas.">
          <input
            value={d.series}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            onChange={(e) => set('series', e.target.value)}
            data-testid="evento-serie"
          />
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
        <Field label="Fin (opcional)" hint="Sin fin: 12 h después del inicio. Pasado, finaliza.">
          <input
            type="datetime-local"
            value={d.endsAt}
            onChange={(e) => set('endsAt', e.target.value)}
            data-testid="evento-fin"
          />
        </Field>
        <Field label="Apertura de la venta (opcional)" hint="Antes: «Próximamente».">
          <input
            type="datetime-local"
            value={d.saleOpensAt}
            onChange={(e) => set('saleOpensAt', e.target.value)}
            data-testid="evento-apertura"
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
        <Field
          label="Cambio de estado"
          hint="Por fechas: próximamente → a la venta → finalizado solos. A mano: no cambia."
        >
          <select
            value={d.stateSource}
            onChange={(e) => set('stateSource', e.target.value as EventStateSource)}
            data-testid="evento-origen-estado"
          >
            {(['dates', 'manual'] as const).map((src) => (
              <option key={src} value={src}>
                {SOURCE_LABELS[src]}
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
        <Field label="Precio (€)" hint="Precio de la compra de prueba.">
          <input
            inputMode="decimal"
            value={d.price}
            placeholder="20,00"
            onChange={(e) => set('price', e.target.value)}
            data-testid="evento-precio"
          />
        </Field>
        <Field label="Precio de muestra">
          <input
            type="checkbox"
            checked={d.priceSample}
            onChange={(e) => set('priceSample', e.target.checked)}
          />
        </Field>
        <Field label="Cartel (URL)" hint="Vacío: «Cartel próximamente».">
          <input
            value={d.posterUrl}
            placeholder="https://… o /…"
            onChange={(e) => set('posterUrl', e.target.value)}
            data-testid="evento-cartel"
          />
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
      <Field label="Actividades" hint="Una por línea.">
        <textarea
          rows={3}
          value={d.activities}
          onChange={(e) => set('activities', e.target.value)}
          data-testid="evento-actividades"
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
  const current = effectiveEvents(events, now);
  const islandName = (id: string | undefined) =>
    id ? (worldPlaces.find((p) => p.id === id)?.name ?? id) : '—';

  return (
    <section>
      <SectionHead
        title="Eventos"
        lead="Cada evento tiene uno de los siete estados: por fechas (próximamente → a la venta → finalizado) o fijado a mano, con auditoría. Puede ir a una isla."
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
                  {islandName(e.islandId)} · {EVENT_FORMAT_LABELS[e.format]}
                  {e.sample ? ' · muestra' : ''}
                </p>
                <p className="admin-meta" data-testid={`evento-ahora-${e.id}`}>
                  Ahora: {STATE_LABELS[eventState(e, now)]} (
                  {SOURCE_LABELS[e.stateSource].toLowerCase()})
                </p>
              </div>
              <label className="admin-field admin-field--inline">
                <span className="admin-field__label">Estado</span>
                <select
                  value={e.state}
                  disabled={busy}
                  data-testid={`evento-estado-${e.id}`}
                  onChange={(ev) => {
                    // Cambiarlo aquí es corregirlo a mano: las fechas ya no lo tocan (REQ-COM-004).
                    const state = ev.target.value as EventState;
                    void run(() =>
                      ctx.actions.saveEvent(
                        { ...e, state, stateSource: 'manual' },
                        `estado a mano: ${state}`,
                      ),
                    );
                  }}
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
          const opens = islandEvent(p.id, current, now);
          const memories = islandMemories(p.id, current, now);
          return (
            <li key={p.id} className="admin-card" data-testid={`isla-${p.id}`}>
              <strong>{islandName(p.id)}</strong>
              <p className="admin-meta">
                Abre ahora: {opens ? opens.name : 'su panel de isla (sin evento vigente)'}
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
