'use client';

import { type BoiaEvent, type Discount, discountStatus } from '@boia/contracts';
import { useState } from 'react';
import type { DiscountFormInput } from '../../../lib/admin/actions';
import { isoToLocal, localToIso } from '../../../lib/admin/dates';
import { discountHidingPlaces } from '../../../lib/admin/world';
import type { AdminContext } from '../use-admin';
import { useRead, useRun } from '../use-admin';
import { Changed, Field, ResetButton, SectionHead, StatusLine } from '../ui';

/** Valor del selector de destino: la tienda o un evento. */
const STORE = 'tienda';

const STATUS_LABEL = { active: 'vigente', upcoming: 'todavía no vale', expired: 'caducado' };

interface Draft {
  code: string;
  label: string;
  /** `tienda` o el id del evento. */
  target: string;
  kind: 'percent' | 'amount';
  /** Porcentaje o euros, como se escribe. */
  value: string;
  startsAt: string;
  endsAt: string;
  priority: string;
  hiddenAt: string;
  conditions: string;
  url: string;
}

function draftOf(d: Discount | null, events: readonly BoiaEvent[]): Draft {
  return {
    code: d?.code ?? '',
    label: d?.label ?? '',
    target: d ? (d.scope === 'store' ? STORE : (d.eventId ?? '')) : (events[0]?.id ?? STORE),
    kind: d?.kind ?? 'percent',
    value: d ? String(d.kind === 'amount' ? d.value / 100 : d.value) : '10',
    startsAt: isoToLocal(d?.startsAt),
    endsAt: isoToLocal(d?.endsAt),
    priority: String(d?.priority ?? 0),
    hiddenAt: d?.hiddenAt ?? '',
    conditions: d?.conditions ?? '',
    url: d?.url ?? '',
  };
}

/** El borrador del formulario, como lo guarda el Admin (`saveDiscount`). */
function inputOf(draft: Draft, base: Discount | null): DiscountFormInput {
  const value = Number(draft.value.replace(',', '.'));
  const store = draft.target === STORE;
  const startsAt = draft.startsAt ? localToIso(draft.startsAt) : null;
  const endsAt = draft.endsAt ? localToIso(draft.endsAt) : null;
  if (draft.startsAt && !startsAt) throw new Error('la fecha de inicio no es válida');
  if (draft.endsAt && !endsAt) throw new Error('la fecha de fin no es válida');
  return {
    ...(base ? { id: base.id, sample: base.sample } : {}),
    code: draft.code,
    label: draft.label,
    scope: store ? 'store' : 'event',
    ...(store || !draft.target ? {} : { eventId: draft.target }),
    kind: draft.kind,
    value: draft.kind === 'amount' ? Math.round(value * 100) : Math.round(value),
    ...(startsAt ? { startsAt } : {}),
    ...(endsAt ? { endsAt } : {}),
    priority: Math.round(Number(draft.priority) || 0),
    ...(draft.hiddenAt ? { hiddenAt: draft.hiddenAt } : {}),
    ...(draft.conditions.trim() ? { conditions: draft.conditions.trim() } : {}),
    ...(draft.url.trim() ? { url: draft.url.trim() } : {}),
  };
}

function DiscountFields({
  ctx,
  draft,
  set,
  events,
  prefix,
}: {
  ctx: AdminContext;
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
  events: readonly BoiaEvent[];
  prefix: string;
}) {
  const places = discountHidingPlaces(ctx.registry.map);
  return (
    <div className="admin-grid">
      <Field label="Código" hint="En mayúsculas, como se copia.">
        <input
          value={draft.code}
          onChange={(e) => set({ code: e.target.value.toUpperCase() })}
          data-testid={`${prefix}-codigo`}
        />
      </Field>
      <Field label="Texto de la tarjeta">
        <input
          value={draft.label}
          onChange={(e) => set({ label: e.target.value })}
          data-testid={`${prefix}-texto`}
        />
      </Field>
      <Field label="Para" hint="Un evento (lleva «Ir a la isla») o la tienda externa.">
        <select
          value={draft.target}
          onChange={(e) => set({ target: e.target.value })}
          data-testid={`${prefix}-destino`}
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              Entradas · {e.name}
            </option>
          ))}
          <option value={STORE}>Tienda</option>
        </select>
      </Field>
      <Field label="Tipo">
        <select
          value={draft.kind}
          onChange={(e) => set({ kind: e.target.value as Draft['kind'] })}
          data-testid={`${prefix}-tipo`}
        >
          <option value="percent">Porcentaje (%)</option>
          <option value="amount">Importe (€)</option>
        </select>
      </Field>
      <Field label={draft.kind === 'percent' ? 'Porcentaje' : 'Euros'}>
        <input
          inputMode="decimal"
          value={draft.value}
          onChange={(e) => set({ value: e.target.value })}
          data-testid={`${prefix}-valor`}
        />
      </Field>
      <Field label="Prioridad" hint="Si valen varios en una compra, gana la más alta (0–100).">
        <input
          type="number"
          min={0}
          max={100}
          value={draft.priority}
          onChange={(e) => set({ priority: e.target.value })}
          data-testid={`${prefix}-prioridad`}
        />
      </Field>
      <Field label="Desde (opcional)">
        <input
          type="datetime-local"
          value={draft.startsAt}
          onChange={(e) => set({ startsAt: e.target.value })}
        />
      </Field>
      <Field label="Hasta (opcional)">
        <input
          type="datetime-local"
          value={draft.endsAt}
          onChange={(e) => set({ endsAt: e.target.value })}
          data-testid={`${prefix}-hasta`}
        />
      </Field>
      <Field label="Escondido en" hint="Dónde lo encuentra quien navega.">
        <select
          value={draft.hiddenAt}
          onChange={(e) => set({ hiddenAt: e.target.value })}
          data-testid={`${prefix}-escondite`}
        >
          <option value="">Donde diga el mapa</option>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.id})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Condiciones (opcional)">
        <input value={draft.conditions} onChange={(e) => set({ conditions: e.target.value })} />
      </Field>
      {draft.target === STORE ? (
        <Field label="Enlace de la tienda (opcional)" hint="Sin él, el de la tienda de la home.">
          <input type="url" value={draft.url} onChange={(e) => set({ url: e.target.value })} />
        </Field>
      ) : null}
    </div>
  );
}

function DiscountRow({
  ctx,
  discount,
  events,
  changed,
}: {
  ctx: AdminContext;
  discount: Discount;
  events: readonly BoiaEvent[];
  changed: boolean;
}) {
  const [draft, setDraft] = useState(() => draftOf(discount, events));
  const { status, busy, run } = useRun();
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const state = discountStatus(discount, new Date());
  const target =
    discount.scope === 'store'
      ? 'tienda'
      : (events.find((e) => e.id === discount.eventId)?.name ?? 'cualquier evento');
  return (
    <li className="admin-card" data-testid={`descuento-${discount.id}`} data-estado={state}>
      <p className="admin-meta">
        <strong>{discount.code}</strong> · {target} · {STATUS_LABEL[state]} · prioridad{' '}
        {discount.priority}
        {discount.hiddenAt ? ` · escondido en ${discount.hiddenAt}` : ''}
        {discount.sample ? ' · muestra' : ''} <Changed on={changed} />
      </p>
      <DiscountFields
        ctx={ctx}
        draft={draft}
        set={set}
        events={events}
        prefix={`descuento-${discount.id}`}
      />
      <div className="admin-row">
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() =>
            void run(() => ctx.actions.saveDiscount(inputOf(draft, discount), 'editar descuento'))
          }
        >
          Guardar
        </button>
        <button
          type="button"
          className="admin-button admin-button--ghost"
          disabled={busy || state === 'expired'}
          data-testid={`descuento-${discount.id}-caducar`}
          onClick={() =>
            void run(async () => {
              const next = await ctx.actions.expireDiscount(discount.id);
              setDraft(draftOf(next, events));
            }, 'Caducado: quien lo tenga lo verá caducado.')
          }
        >
          Caducar ya
        </button>
        <button
          type="button"
          className="admin-button admin-button--ghost"
          disabled={busy}
          onClick={() =>
            void run(() => ctx.repo.admin.remove('discounts', discount.id, { reason: 'papelera' }))
          }
        >
          A la papelera
        </button>
      </div>
      <StatusLine status={status} />
    </li>
  );
}

/**
 * Descuentos (T43, REQ-COM-020, REQ-COM-036): crear, editar, caducar y
 * esconder códigos, ligados a un evento o a la tienda y con prioridad. Pasa
 * por los cambios del Admin de la demo (en este navegador) y queda en la
 * auditoría. Los códigos son inventados (`muestra`) hasta que Álvaro dé los
 * reales (P16).
 */
export function DiscountsSection({ ctx }: { ctx: AdminContext }) {
  const discounts = useRead(ctx, (r) => r.content.list('discounts'));
  const events = useRead(ctx, (r) => r.content.events());
  const changed = useRead(ctx, (r) => r.admin.overridden('discounts'));
  const [draft, setDraft] = useState<Draft | null>(null);
  const { status, busy, run } = useRun();
  if (!discounts || !events) return <p>Cargando…</p>;
  const listed = events.filter((e) => e.state !== 'draft');
  const form = draft ?? draftOf(null, listed);
  const changedSet = new Set(changed ?? []);
  const ids = new Set(discounts.map((d) => d.id));
  const trashed = (changed ?? []).filter((id) => !ids.has(id));
  return (
    <section>
      <SectionHead
        title="Descuentos"
        lead={`${discounts.length} códigos. Se esconden en el mar; el de un evento lleva «Ir a la isla» y se aplica en la compra de prueba; el de la tienda se copia y lo valida la tienda. Inventados hasta tener los reales.`}
      >
        <ResetButton ctx={ctx} areas={['discounts']} />
      </SectionHead>
      <form
        className="admin-card admin-form"
        data-testid="descuento-nuevo"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await ctx.actions.saveDiscount(inputOf(form, null), 'nuevo descuento');
            setDraft(null);
          }, 'Descuento creado.');
        }}
      >
        <h3>Nuevo descuento</h3>
        <DiscountFields
          ctx={ctx}
          draft={form}
          set={(patch) => setDraft({ ...form, ...patch })}
          events={listed}
          prefix="descuento-nuevo"
        />
        <button
          type="submit"
          className="admin-button"
          disabled={busy}
          data-testid="descuento-nuevo-crear"
        >
          Crear
        </button>
        <StatusLine status={status} />
      </form>
      {trashed.length ? (
        <p className="admin-meta">
          En la papelera:{' '}
          {trashed.map((id) => (
            <button
              key={id}
              type="button"
              className="admin-link"
              onClick={() => void run(() => ctx.repo.admin.restore('discounts', id), 'Recuperado.')}
            >
              recuperar {id}
            </button>
          ))}
        </p>
      ) : null}
      <ul className="admin-list" data-testid="descuentos-admin">
        {discounts.map((d) => (
          <DiscountRow
            key={JSON.stringify(d)}
            ctx={ctx}
            discount={d}
            events={listed}
            changed={changedSet.has(d.id)}
          />
        ))}
      </ul>
    </section>
  );
}
