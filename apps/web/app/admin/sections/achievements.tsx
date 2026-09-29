'use client';

import {
  ACHIEVEMENT_SCOPES,
  ACHIEVEMENT_TRIGGERS,
  type AchievementScope,
  type AchievementTrigger,
} from '@boia/contracts';
import type { AchievementDefinition, Cosmetic, Rank } from '@boia/store';
import { useState } from 'react';
import {
  type TriggerChoices,
  MINIGAMES,
  TRIGGER_LABELS,
  TRIGGER_PARAMS,
  paramsFromForm,
} from '../../../lib/admin/achievements';
import { ACHIEVEMENT_ICONS, type AchievementInput } from '../../../lib/admin/actions';
import { DEFAULT_TIME_ZONE, isoToLocal, localToIso } from '../../../lib/admin/dates';
import { circuitIds } from '../../../lib/admin/validate';
import { EMPTY_WORLD_CONTENT, composeLiveWorld } from '../../../lib/admin/world';
import type { AdminContext } from '../use-admin';
import { useRead, useRun } from '../use-admin';
import {
  Changed,
  DeleteButton,
  Field,
  ResetButton,
  SectionHead,
  StatusLine,
  TrashInline,
} from '../ui';

const int = (s: string) => {
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

const SCOPE_LABELS: Record<AchievementScope, string> = {
  global: 'Global (todos los mundos)',
  season: 'De una temporada (un mundo)',
};

/** Lo que se escribe en el formulario de un logro (todo texto). */
interface Form {
  id?: string;
  title: string;
  description: string;
  trigger: AchievementTrigger;
  params: Record<string, string>;
  points: string;
  coins: string;
  iconKey: string;
  cosmeticKey: string;
  scope: AchievementScope;
  seasonId: string;
  startsAt: string;
  endsAt: string;
  secret: boolean;
  active: boolean;
  /** Lo que el formulario no toca y se conserva (insignia, muestra). */
  keep: Partial<AchievementDefinition>;
}

const EMPTY: Form = {
  title: '',
  description: '',
  trigger: 'visit_island',
  params: { count: '3' },
  points: '10',
  coins: '5',
  iconKey: '',
  cosmeticKey: '',
  scope: 'global',
  seasonId: '',
  startsAt: '',
  endsAt: '',
  secret: false,
  active: true,
  keep: {},
};

function formOf(a: AchievementDefinition): Form {
  return {
    id: a.id,
    title: a.title,
    description: a.description ?? '',
    trigger: a.trigger,
    params: Object.fromEntries(
      Object.entries(a.triggerParams ?? {}).map(([k, v]) => [k, v === null ? '' : String(v)]),
    ),
    points: String(a.points),
    coins: String(a.coins),
    iconKey: a.iconKey ?? '',
    cosmeticKey: a.cosmeticKey ?? '',
    scope: a.scope,
    seasonId: a.seasonId ?? '',
    startsAt: isoToLocal(a.startsAt),
    endsAt: isoToLocal(a.endsAt),
    secret: a.secret,
    active: a.active,
    keep: {
      ...(a.badgeKey ? { badgeKey: a.badgeKey } : {}),
      sample: a.sample,
    },
  };
}

/** La condición en castellano: «Visitar islas · count 3». */
function conditionText(a: AchievementDefinition): string {
  const params = Object.entries(a.triggerParams ?? {})
    .map(([k, v]) => `${k} ${String(v)}`)
    .join(', ');
  return `${TRIGGER_LABELS[a.trigger]}${params ? ` (${params})` : ''}`;
}

function AchievementForm({
  ctx,
  initial,
  cosmetics,
  onDone,
}: {
  ctx: AdminContext;
  initial: Form;
  cosmetics: readonly Cosmetic[];
  onDone: () => void;
}) {
  const [f, setF] = useState<Form>(initial);
  const { status, busy, run } = useRun();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const world = composeLiveWorld(ctx.registry, ctx.registry.defaultId, EMPTY_WORLD_CONTENT).config;
  const choices: TriggerChoices = {
    circuits: circuitIds(world),
    games: MINIGAMES,
    worlds: ctx.registry.ids(),
  };
  const original = initial.id ? initial : null;
  const conditionChanged =
    original !== null &&
    (original.trigger !== f.trigger ||
      JSON.stringify(paramsFromForm(original.trigger, original.params)) !==
        JSON.stringify(paramsFromForm(f.trigger, f.params)));

  const save = () =>
    run(
      async () => {
        const points = int(f.points);
        const coins = int(f.coins);
        if (points === null || coins === null) throw new Error('puntos y monedas son enteros ≥ 0');
        const startsAt = f.startsAt ? localToIso(f.startsAt, DEFAULT_TIME_ZONE) : undefined;
        const endsAt = f.endsAt ? localToIso(f.endsAt, DEFAULT_TIME_ZONE) : undefined;
        if (f.startsAt && !startsAt) throw new Error('inicio: fecha no válida');
        if (f.endsAt && !endsAt) throw new Error('fin: fecha no válida');
        const input: AchievementInput = {
          ...f.keep,
          ...(f.id ? { id: f.id } : {}),
          title: f.title,
          trigger: f.trigger,
          triggerParams: paramsFromForm(f.trigger, f.params),
          points,
          coins,
          scope: f.scope,
          secret: f.secret,
          active: f.active,
          ...(f.description.trim() ? { description: f.description.trim() } : {}),
          ...(f.iconKey ? { iconKey: f.iconKey } : {}),
          ...(f.cosmeticKey ? { cosmeticKey: f.cosmeticKey } : {}),
          ...(f.scope === 'season' && f.seasonId ? { seasonId: f.seasonId } : {}),
          ...(startsAt ? { startsAt } : {}),
          ...(endsAt ? { endsAt } : {}),
        };
        const saved = await ctx.actions.saveAchievement(
          input,
          f.id ? 'editar logro' : 'nuevo logro',
        );
        onDone();
        return saved;
      },
      conditionChanged ? 'Guardado como versión nueva.' : 'Logro guardado.',
    );

  return (
    <form
      className="admin-card admin-form"
      data-testid="logro-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h3>{f.id ? `Editar «${initial.title}»` : 'Nuevo logro'}</h3>
      <div className="admin-grid">
        <Field label="Título">
          <input
            required
            value={f.title}
            onChange={(e) => set('title', e.target.value)}
            data-testid="logro-titulo"
          />
        </Field>
        <Field label="Condición" hint="Del catálogo: sin lógica libre.">
          <select
            value={f.trigger}
            onChange={(e) => {
              const trigger = e.target.value as AchievementTrigger;
              setF((x) => ({ ...x, trigger, params: {} }));
            }}
            data-testid="logro-condicion"
          >
            {ACHIEVEMENT_TRIGGERS.map((t) => (
              <option key={t} value={t}>
                {TRIGGER_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        {TRIGGER_PARAMS[f.trigger].map((p) => (
          <Field
            key={p.key}
            label={p.label}
            hint={p.kind === 'int' ? `De ${p.min} a ${p.max}.` : undefined}
          >
            {p.kind === 'choice' ? (
              <select
                value={f.params[p.key] ?? ''}
                onChange={(e) => set('params', { ...f.params, [p.key]: e.target.value })}
                data-testid={`logro-param-${p.key}`}
              >
                <option value="">{p.optional ? 'Cualquiera' : 'Elige…'}</option>
                {choices[p.source].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                inputMode={p.kind === 'int' ? 'numeric' : 'text'}
                value={f.params[p.key] ?? ''}
                onChange={(e) => set('params', { ...f.params, [p.key]: e.target.value })}
                data-testid={`logro-param-${p.key}`}
              />
            )}
          </Field>
        ))}
        <Field label="Puntos">
          <input
            inputMode="numeric"
            value={f.points}
            onChange={(e) => set('points', e.target.value)}
            data-testid="logro-puntos"
          />
        </Field>
        <Field label="Monedas">
          <input
            inputMode="numeric"
            value={f.coins}
            onChange={(e) => set('coins', e.target.value)}
            data-testid="logro-monedas"
          />
        </Field>
        <Field label="Icono">
          <select
            value={f.iconKey}
            onChange={(e) => set('iconKey', e.target.value)}
            data-testid="logro-icono"
          >
            <option value="">Sin icono</option>
            {ACHIEVEMENT_ICONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Premio (cosmético o barco)">
          <select value={f.cosmeticKey} onChange={(e) => set('cosmeticKey', e.target.value)}>
            <option value="">Sólo puntos y monedas</option>
            {cosmetics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.slot})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ámbito">
          <select
            value={f.scope}
            onChange={(e) => set('scope', e.target.value as AchievementScope)}
            data-testid="logro-ambito"
          >
            {ACHIEVEMENT_SCOPES.map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        {f.scope === 'season' ? (
          <Field label="Temporada">
            <select
              value={f.seasonId}
              onChange={(e) => set('seasonId', e.target.value)}
              data-testid="logro-temporada"
            >
              <option value="">Elige un mundo…</option>
              {ctx.registry.list().map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Desde (opcional)">
          <input
            type="datetime-local"
            value={f.startsAt}
            onChange={(e) => set('startsAt', e.target.value)}
            data-testid="logro-desde"
          />
        </Field>
        <Field label="Hasta (opcional)">
          <input
            type="datetime-local"
            value={f.endsAt}
            onChange={(e) => set('endsAt', e.target.value)}
            data-testid="logro-hasta"
          />
        </Field>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={f.active}
            onChange={(e) => set('active', e.target.checked)}
          />
          Activo (desactivar sólo evita concesiones nuevas)
        </label>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={f.secret}
            onChange={(e) => set('secret', e.target.checked)}
          />
          Secreto («???» hasta conseguirlo)
        </label>
      </div>
      <Field label="Descripción">
        <input value={f.description} onChange={(e) => set('description', e.target.value)} />
      </Field>
      {conditionChanged ? (
        <p className="admin-meta" data-testid="logro-version-aviso">
          Cambias la condición: se guarda como una versión nueva. Quien ya lo tiene lo conserva
          (REQ-ADM-022).
        </p>
      ) : null}
      <div className="admin-row">
        <button type="submit" className="admin-button" disabled={busy} data-testid="logro-guardar">
          Guardar logro
        </button>
        <button type="button" className="admin-button admin-button--ghost" onClick={onDone}>
          Cancelar
        </button>
      </div>
      <StatusLine status={status} />
    </form>
  );
}

function AchievementRow({
  ctx,
  a,
  changed,
  onEdit,
}: {
  ctx: AdminContext;
  a: AchievementDefinition;
  changed: boolean;
  onEdit: () => void;
}) {
  const { status, busy, run } = useRun();
  return (
    <li className="admin-card" data-testid={`logro-${a.id}`}>
      <div className="admin-row admin-row--between">
        <div>
          <strong>{a.title}</strong> <Changed on={changed} />
          <p className="admin-meta">
            {a.id} · v{a.version} · {conditionText(a)}
          </p>
          <p className="admin-meta">
            {a.points} puntos · {a.coins} monedas
            {a.cosmeticKey ? ` · premio ${a.cosmeticKey}` : ''}
            {a.iconKey ? ` · icono ${a.iconKey}` : ''} ·{' '}
            {a.scope === 'season' ? `temporada ${a.seasonId ?? '?'}` : 'global'}
            {a.startsAt ? ` · desde ${isoToLocal(a.startsAt).replace('T', ' ')}` : ''}
            {a.endsAt ? ` · hasta ${isoToLocal(a.endsAt).replace('T', ' ')}` : ''}
            {a.secret ? ' · secreto' : ''}
            {a.active ? '' : ' · desactivado'}
          </p>
        </div>
        <span className="admin-row">
          <button
            type="button"
            className="admin-button admin-button--ghost"
            onClick={onEdit}
            data-testid={`logro-editar-${a.id}`}
          >
            Editar
          </button>
          <button
            type="button"
            className="admin-button admin-button--ghost"
            disabled={busy}
            data-testid={`logro-duplicar-${a.id}`}
            onClick={() =>
              void run(
                () => ctx.actions.duplicateAchievement(a.id),
                'Duplicado, desactivado hasta revisarlo.',
              )
            }
          >
            Duplicar
          </button>
          <DeleteButton ctx={ctx} area="achievements" id={a.id} />
        </span>
      </div>
      <StatusLine status={status} />
    </li>
  );
}

function CosmeticRow({ ctx, c, changed }: { ctx: AdminContext; c: Cosmetic; changed: boolean }) {
  const [name, setName] = useState(c.name);
  const [price, setPrice] = useState(c.priceCoins === null ? '' : String(c.priceCoins));
  const [active, setActive] = useState(c.active);
  const { status, busy, run } = useRun();
  return (
    <li className="admin-card" data-testid={`cosmetico-${c.id}`}>
      <p className="admin-meta">
        {c.id} · ranura {c.slot} <Changed on={changed} />
      </p>
      <div className="admin-grid">
        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Precio en monedas" hint="Vacío: sólo con un logro.">
          <input
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            data-testid={`cosmetico-precio-${c.id}`}
          />
        </Field>
        <label className="admin-check">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Activo
        </label>
      </div>
      <button
        type="button"
        className="admin-button"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const p = price.trim() === '' ? null : int(price);
            if (price.trim() !== '' && p === null) throw new Error('el precio es un entero ≥ 0');
            await ctx.repo.admin.upsert(
              'cosmetics',
              { ...c, name, priceCoins: p, active },
              { reason: 'cosmético' },
            );
          })
        }
      >
        Guardar
      </button>
      <StatusLine status={status} />
    </li>
  );
}

function RankRow({ ctx, r, changed }: { ctx: AdminContext; r: Rank; changed: boolean }) {
  const [name, setName] = useState(r.name);
  const [min, setMin] = useState(String(r.minPoints));
  const { status, busy, run } = useRun();
  return (
    <li className="admin-card" data-testid={`rango-${r.id}`}>
      <div className="admin-row admin-row--end">
        <Field label="Rango">
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Desde (puntos)">
          <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} />
        </Field>
        <Changed on={changed} />
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const m = int(min);
              if (m === null) throw new Error('el umbral es un entero ≥ 0');
              await ctx.repo.admin.upsert(
                'ranks',
                { ...r, name, minPoints: m },
                { reason: 'rango' },
              );
            })
          }
        >
          Guardar
        </button>
      </div>
      <StatusLine status={status} />
    </li>
  );
}

/**
 * Logros y cosméticos (REQ-ADM-021, REQ-ADM-022, REQ-ADM-008): crear,
 * duplicar, editar y borrar logros con condición del catálogo, icono, ámbito
 * y fechas (cambiar la condición es una versión nueva); precios de
 * cosméticos y umbrales de rango.
 */
export function AchievementsSection({ ctx }: { ctx: AdminContext }) {
  const achievements = useRead(ctx, (r) => r.content.list('achievements'));
  const cosmetics = useRead(ctx, (r) => r.content.list('cosmetics'));
  const ranks = useRead(ctx, (r) => r.content.list('ranks'));
  const changedA = useRead(ctx, (r) => r.admin.overridden('achievements'));
  const changedC = useRead(ctx, (r) => r.admin.overridden('cosmetics'));
  const changedR = useRead(ctx, (r) => r.admin.overridden('ranks'));
  const [editing, setEditing] = useState<Form | null>(null);
  if (!achievements || !cosmetics || !ranks) return <p>Cargando…</p>;
  const key = (x: object) => JSON.stringify(x);
  return (
    <section>
      <SectionHead
        title="Logros y cosméticos"
        lead="Las condiciones son del catálogo (sin lógica libre). Cambiar la condición de un logro es una versión nueva: quien ya lo tiene lo conserva (REQ-ADM-022). Desactivar sólo evita concesiones nuevas."
      >
        <button
          type="button"
          className="admin-button"
          data-testid="logro-nuevo"
          onClick={() => setEditing({ ...EMPTY })}
        >
          Nuevo logro
        </button>
        <ResetButton ctx={ctx} areas={['achievements', 'cosmetics', 'ranks']} />
      </SectionHead>
      {editing ? (
        <AchievementForm
          key={editing.id ?? 'nuevo'}
          ctx={ctx}
          initial={editing}
          cosmetics={cosmetics}
          onDone={() => setEditing(null)}
        />
      ) : null}
      <h3>Logros</h3>
      <TrashInline ctx={ctx} area="achievements" />
      <ul className="admin-list" data-testid="logros-admin">
        {achievements.map((a) => (
          <AchievementRow
            key={key(a)}
            ctx={ctx}
            a={a}
            changed={(changedA ?? []).includes(a.id)}
            onEdit={() => setEditing(formOf(a))}
          />
        ))}
      </ul>
      <h3>Cosméticos del barco</h3>
      <ul className="admin-list">
        {cosmetics.map((c) => (
          <CosmeticRow key={key(c)} ctx={ctx} c={c} changed={(changedC ?? []).includes(c.id)} />
        ))}
      </ul>
      <h3>Rangos</h3>
      <ul className="admin-list">
        {ranks.map((r) => (
          <RankRow key={key(r)} ctx={ctx} r={r} changed={(changedR ?? []).includes(r.id)} />
        ))}
      </ul>
    </section>
  );
}
