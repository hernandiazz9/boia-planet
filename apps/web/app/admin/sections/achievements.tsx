'use client';

import type { AchievementDefinition, Cosmetic, Rank } from '@boia/store';
import { useState } from 'react';
import type { AdminContext } from '../use-admin';
import { useRead, useRun } from '../use-admin';
import { Changed, Field, ResetButton, SectionHead, StatusLine } from '../ui';

const int = (s: string) => {
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

function AchievementRow({
  ctx,
  a,
  changed,
}: {
  ctx: AdminContext;
  a: AchievementDefinition;
  changed: boolean;
}) {
  const [title, setTitle] = useState(a.title);
  const [points, setPoints] = useState(String(a.points));
  const [coins, setCoins] = useState(String(a.coins));
  const [active, setActive] = useState(a.active);
  const [secret, setSecret] = useState(a.secret);
  const { status, busy, run } = useRun();
  return (
    <li className="admin-card" data-testid={`logro-${a.id}`}>
      <p className="admin-meta">
        {a.id} · condición: {a.trigger}
        {Object.keys(a.triggerParams).length ? ` ${JSON.stringify(a.triggerParams)}` : ''} · v
        {a.version} <Changed on={changed} />
      </p>
      <div className="admin-grid">
        <Field label="Título">
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Puntos">
          <input inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value)} />
        </Field>
        <Field label="Monedas">
          <input inputMode="numeric" value={coins} onChange={(e) => setCoins(e.target.value)} />
        </Field>
        <label className="admin-check">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Activo (desactivar sólo evita concesiones nuevas)
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
          Secreto
        </label>
      </div>
      <button
        type="button"
        className="admin-button"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const p = int(points);
            const c = int(coins);
            if (p === null || c === null) throw new Error('puntos y monedas son enteros ≥ 0');
            await ctx.repo.admin.upsert(
              'achievements',
              { ...a, title, points: p, coins: c, active, secret },
              { reason: 'logro' },
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

/** Logros y cosméticos (REQ-ADM-021, REQ-ADM-008): premios, precios y umbrales de rango. */
export function AchievementsSection({ ctx }: { ctx: AdminContext }) {
  const achievements = useRead(ctx, (r) => r.content.list('achievements'));
  const cosmetics = useRead(ctx, (r) => r.content.list('cosmetics'));
  const ranks = useRead(ctx, (r) => r.content.list('ranks'));
  const changedA = useRead(ctx, (r) => r.admin.overridden('achievements'));
  const changedC = useRead(ctx, (r) => r.admin.overridden('cosmetics'));
  const changedR = useRead(ctx, (r) => r.admin.overridden('ranks'));
  if (!achievements || !cosmetics || !ranks) return <p>Cargando…</p>;
  const key = (x: object) => JSON.stringify(x);
  return (
    <section>
      <SectionHead
        title="Logros y cosméticos"
        lead="Las condiciones son del catálogo (sin lógica libre). Cambiar la condición de un logro ya obtenido es un logro nuevo (REQ-ADM-022)."
      >
        <ResetButton ctx={ctx} areas={['achievements', 'cosmetics', 'ranks']} />
      </SectionHead>
      <h3>Logros</h3>
      <ul className="admin-list">
        {achievements.map((a) => (
          <AchievementRow key={key(a)} ctx={ctx} a={a} changed={(changedA ?? []).includes(a.id)} />
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
