'use client';

import type { PlacePatch, SkinPatch } from '@boia/store';
import type { ComposedWorld, Place, SharedMap } from '@boia/world';
import { useMemo, useState } from 'react';
import { ADMIN_COPY } from '../../../lib/admin/copy';
import {
  MAP_POINTS,
  MAP_POINT_KEYS,
  MAP_POINT_LABELS,
  type MapPointKey,
  PROXIMITY_PARAM,
  composeLiveWorld,
  liveMap,
  mapPoint,
  placeTexts,
} from '../../../lib/admin/world';
import type { AdminContext } from '../use-admin';
import { useRead, useRun } from '../use-admin';
import { Changed, Field, ResetButton, SectionHead, StatusLine } from '../ui';

type Selection = { kind: 'place'; id: string } | { kind: 'point'; key: MapPointKey };

const CATEGORY_COLORS: Record<string, string> = {
  isla: '#e8b04a',
  puerto: '#9fb7c9',
  boia: '#f26a1b',
  encuentro: '#d45cc4',
  secreto: '#8c7cf0',
  circuito: '#39c28a',
  carril: '#2f7f63',
  obstaculo: '#5a6b7c',
};

const TEXT_KEYS = ['title', 'kicker', 'body'] as const;
const TEXT_LABELS: Record<(typeof TEXT_KEYS)[number], string> = {
  title: 'Título del panel',
  kicker: 'Antetítulo',
  body: 'Texto del panel',
};

/** Mapa compartido en miniatura: cada lugar es un punto; se elige tocándolo. */
function MapPreview({
  map,
  world,
  places,
  selection,
  onSelect,
}: {
  map: SharedMap;
  world: ComposedWorld;
  places: Readonly<Record<string, PlacePatch>>;
  selection: Selection | null;
  onSelect: (s: Selection) => void;
}) {
  const b = map.bounds;
  const w = b.right - b.left;
  const h = b.bottom - b.top;
  const r = w / 120;
  const shown = new Set(world.config.objects.map((o) => o.identity.id));
  const selectedPos =
    selection?.kind === 'place'
      ? map.places.find((p) => p.id === selection.id)?.position
      : selection
        ? mapPoint(map, selection.key, places)
        : null;
  return (
    <svg
      className="admin-map"
      viewBox={`${b.left} ${b.top} ${w} ${h}`}
      role="img"
      aria-label="Mapa compartido con sus lugares"
      data-testid="mapa-preview"
    >
      <rect x={b.left} y={b.top} width={w} height={h} fill="#1f7a9c" />
      {map.places.map((p) => {
        const hidden = !shown.has(p.id);
        const moved = places[p.id] !== undefined;
        return (
          <circle
            key={p.id}
            cx={p.position.x}
            cy={p.position.y}
            r={p.category === 'isla' ? r * 2 : p.category === 'carril' ? r * 0.5 : r}
            fill={CATEGORY_COLORS[p.category] ?? '#dfe7ee'}
            opacity={!p.active || hidden ? 0.35 : 1}
            stroke={moved ? '#fff' : 'none'}
            strokeWidth={r * 0.5}
            data-lugar={p.id}
            data-x={Math.round(p.position.x)}
            data-y={Math.round(p.position.y)}
            onClick={() => onSelect({ kind: 'place', id: p.id })}
          >
            <title>{world.places.find((x) => x.id === p.id)?.name ?? p.name}</title>
          </circle>
        );
      })}
      {MAP_POINT_KEYS.map((k) => {
        const p = mapPoint(map, k, places);
        if (!p) return null;
        return (
          <rect
            key={k}
            x={p.x - r}
            y={p.y - r}
            width={r * 2}
            height={r * 2}
            fill="#fff"
            stroke="#12233f"
            strokeWidth={r * 0.3}
            onClick={() => onSelect({ kind: 'point', key: k })}
          >
            <title>{MAP_POINT_LABELS[k]}</title>
          </rect>
        );
      })}
      {selectedPos ? (
        <circle
          cx={selectedPos.x}
          cy={selectedPos.y}
          r={r * 4}
          fill="none"
          stroke="#fff"
          strokeWidth={r * 0.6}
          strokeDasharray={`${r} ${r}`}
        />
      ) : null}
    </svg>
  );
}

function num(v: string): number | undefined {
  const n = Number(v.replace(',', '.'));
  return v.trim() !== '' && Number.isFinite(n) ? n : undefined;
}

/** Lo compartido de un lugar: posición, activado y parámetros (valen en todos los mundos). */
function PlaceEditor({
  ctx,
  place,
  patch,
}: {
  ctx: AdminContext;
  place: Place;
  patch: PlacePatch | undefined;
}) {
  const baseParams = { ...(place.params ?? {}) } as Record<string, unknown>;
  const [x, setX] = useState(String(Math.round(place.position.x)));
  const [y, setY] = useState(String(Math.round(place.position.y)));
  const [enabled, setEnabled] = useState(place.active);
  const [radius, setRadius] = useState(
    place.geometry.proximityRadius !== undefined
      ? String(Math.round(place.geometry.proximityRadius))
      : '',
  );
  const [params, setParams] = useState(
    Object.keys(baseParams).length ? JSON.stringify(baseParams, null, 2) : '',
  );
  const { status, busy, run } = useRun();

  const save = () =>
    run(async () => {
      const next: PlacePatch = {};
      const nx = num(x);
      const ny = num(y);
      if (nx === undefined || ny === undefined) throw new Error('la posición necesita dos números');
      if (Math.round(place.position.x) !== nx) next.x = nx;
      if (Math.round(place.position.y) !== ny) next.y = ny;
      if (enabled !== place.active) next.enabled = enabled;
      const p: Record<string, number | string | boolean | null | object> = {};
      const nr = num(radius);
      if (radius.trim() && nr === undefined) throw new Error('el radio de proximidad es un número');
      if (nr !== undefined && nr !== Math.round(place.geometry.proximityRadius ?? -1)) {
        if (nr <= 0 || nr > 2000) throw new Error('radio de proximidad fuera de rango (1–2000)');
        p[PROXIMITY_PARAM] = nr;
      }
      if (params.trim()) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(params);
        } catch {
          throw new Error('los parámetros no son JSON válido');
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('los parámetros tienen que ser un objeto');
        }
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (JSON.stringify(v) !== JSON.stringify(baseParams[k])) p[k] = v as object;
        }
      }
      if (Object.keys(p).length) next.params = p as PlacePatch['params'];
      if (Object.keys(next).length === 0) throw new Error('no hay cambios que guardar');
      await ctx.actions.editPlace(place.id, next, 'editar lugar');
    }, 'Guardado: el lugar cambia en todos los mundos.');

  return (
    <form
      className="admin-card admin-form"
      data-testid="lugar-editor"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h3>
        En el mapa compartido <Changed on={!!patch} />
      </h3>
      <p className="admin-lead">{ADMIN_COPY.sharedMapNote}</p>
      <div className="admin-grid">
        <Field label="x">
          <input
            inputMode="decimal"
            value={x}
            onChange={(e) => setX(e.target.value)}
            data-testid="lugar-x"
          />
        </Field>
        <Field label="y">
          <input
            inputMode="decimal"
            value={y}
            onChange={(e) => setY(e.target.value)}
            data-testid="lugar-y"
          />
        </Field>
        <Field label="Radio de proximidad">
          <input
            inputMode="decimal"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            data-testid="lugar-radio"
          />
        </Field>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            data-testid="lugar-activo"
          />
          Activo en todos los mundos
        </label>
      </div>
      <Field
        label="Parámetros (JSON)"
        hint="Vaivén, remolino, destino de misión… Rangos seguros de @boia/world."
      >
        <textarea
          rows={4}
          value={params}
          onChange={(e) => setParams(e.target.value)}
          data-testid="lugar-params"
          spellCheck={false}
        />
      </Field>
      <div className="admin-row">
        <button type="submit" className="admin-button" disabled={busy} data-testid="lugar-guardar">
          Guardar en todos los mundos
        </button>
        {patch ? (
          <button
            type="button"
            className="admin-button admin-button--ghost"
            disabled={busy}
            onClick={() =>
              void run(() => ctx.actions.clearPlace(place.id), 'El lugar vuelve a la muestra.')
            }
          >
            Volver a la muestra
          </button>
        ) : null}
      </div>
      <StatusLine status={status} />
    </form>
  );
}

/** Lo de un mundo: nombre (con la pregunta de dónde renombrar), textos y si se ve. */
function SkinEditor({
  ctx,
  world,
  place,
  map,
  patch,
}: {
  ctx: AdminContext;
  world: ComposedWorld;
  place: Place;
  map: SharedMap;
  patch: SkinPatch | undefined;
}) {
  const status0 = world.places.find((p) => p.id === place.id);
  const skin = ctx.registry.skin(world.id);
  const texts = placeTexts(map, skin, place.id);
  const [name, setName] = useState(status0?.name ?? place.name);
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({
    ...Object.fromEntries(TEXT_KEYS.map((k) => [k, ''])),
    ...texts,
    ...(patch?.texts ?? {}),
  });
  const { status, busy, run } = useRun();
  const hidden = status0?.status === 'hidden';

  return (
    <div className="admin-card admin-form" data-testid="piel-editor">
      <h3>
        En el mundo {world.theme.name} <Changed on={!!patch} />
      </h3>
      <p className="admin-lead">{ADMIN_COPY.skinNote}</p>
      <div className="admin-row admin-row--end">
        <Field label="Nombre">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="lugar-nombre"
          />
        </Field>
        <button
          type="button"
          className="admin-button"
          disabled={busy || !name.trim() || name === status0?.name}
          data-testid="lugar-renombrar"
          onClick={() => setAsking(true)}
        >
          Renombrar
        </button>
      </div>
      {asking ? (
        <div
          className="admin-ask"
          role="group"
          aria-label={ADMIN_COPY.renameAsk}
          data-testid="renombrar-pregunta"
        >
          <p>{ADMIN_COPY.renameAsk}</p>
          <div className="admin-row">
            <button
              type="button"
              className="admin-button"
              data-testid="renombrar-mundo"
              onClick={() => {
                setAsking(false);
                void run(
                  () => ctx.actions.renamePlace(place.id, name, { world: world.id }),
                  'Renombrado sólo en este mundo.',
                );
              }}
            >
              {ADMIN_COPY.renameThisWorld}
            </button>
            <button
              type="button"
              className="admin-button"
              data-testid="renombrar-todos"
              onClick={() => {
                setAsking(false);
                void run(
                  () => ctx.actions.renamePlace(place.id, name, 'all'),
                  'Renombrado en todos los mundos.',
                );
              }}
            >
              {ADMIN_COPY.renameAllWorlds}
            </button>
            <button
              type="button"
              className="admin-button admin-button--ghost"
              onClick={() => setAsking(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="admin-grid">
        {Object.keys(draft).map((k) => (
          <Field key={k} label={TEXT_LABELS[k as (typeof TEXT_KEYS)[number]] ?? k}>
            <textarea
              rows={k === 'body' ? 3 : 1}
              value={draft[k]}
              onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
              data-testid={`lugar-texto-${k}`}
            />
          </Field>
        ))}
      </div>
      <div className="admin-row">
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          data-testid="lugar-textos-guardar"
          onClick={() =>
            void run(() =>
              ctx.actions.setPlaceTexts(
                world.id,
                place.id,
                Object.fromEntries(Object.entries(draft).filter(([, v]) => v.trim() !== '')),
              ),
            )
          }
        >
          Guardar textos
        </button>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={hidden}
            disabled={busy}
            data-testid="lugar-oculto"
            onChange={(e) =>
              void run(() => ctx.actions.setHiddenInWorld(world.id, place.id, e.target.checked))
            }
          />
          Oculto en este mundo
        </label>
      </div>
      <StatusLine status={status} />
    </div>
  );
}

function PointEditor({
  ctx,
  pointKey,
  map,
  places,
}: {
  ctx: AdminContext;
  pointKey: MapPointKey;
  map: SharedMap;
  places: Readonly<Record<string, PlacePatch>>;
}) {
  const p = mapPoint(map, pointKey, places);
  const [x, setX] = useState(p ? String(Math.round(p.x)) : '');
  const [y, setY] = useState(p ? String(Math.round(p.y)) : '');
  const { status, busy, run } = useRun();
  return (
    <form
      className="admin-card admin-form"
      data-testid="punto-editor"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          const nx = num(x);
          const ny = num(y);
          if (nx === undefined || ny === undefined)
            throw new Error('la posición necesita dos números');
          await ctx.actions.setMapPoint(pointKey, { x: nx, y: ny });
        }, 'Guardado: vale en todos los mundos.');
      }}
    >
      <h3>
        {MAP_POINT_LABELS[pointKey]} <Changed on={places[MAP_POINTS[pointKey]] !== undefined} />
      </h3>
      <p className="admin-lead">
        {pointKey === 'spawn'
          ? 'Donde aparece el barco al entrar en /juego.'
          : pointKey === 'port'
            ? 'El puerto de salida (El Varadero en Arcilla).'
            : 'Donde aterriza la cámara de la entrada (la usa la entrada desde T28).'}{' '}
        Nunca en tierra.
      </p>
      <div className="admin-grid">
        <Field label="x">
          <input
            inputMode="decimal"
            value={x}
            onChange={(e) => setX(e.target.value)}
            data-testid="punto-x"
          />
        </Field>
        <Field label="y">
          <input
            inputMode="decimal"
            value={y}
            onChange={(e) => setY(e.target.value)}
            data-testid="punto-y"
          />
        </Field>
      </div>
      <div className="admin-row">
        <button type="submit" className="admin-button" disabled={busy} data-testid="punto-guardar">
          Guardar punto
        </button>
        {places[MAP_POINTS[pointKey]] ? (
          <button
            type="button"
            className="admin-button admin-button--ghost"
            disabled={busy}
            onClick={() =>
              void run(
                () => ctx.actions.clearPlace(MAP_POINTS[pointKey]),
                'El punto vuelve a la muestra.',
              )
            }
          >
            Volver a la muestra
          </button>
        ) : null}
      </div>
      <StatusLine status={status} />
    </form>
  );
}

/** Mundo (REQ-ADM-008, D-20): el mapa compartido, sus lugares y la piel de cada mundo. */
export function WorldSection({ ctx }: { ctx: AdminContext }) {
  const places = useRead(ctx, (r) => r.content.places());
  const skins = useRead(ctx, (r) => r.content.skins());
  const events = useRead(ctx, (r) => r.content.events());
  const [worldId, setWorldId] = useState(ctx.registry.defaultId);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [filter, setFilter] = useState('');

  const content = useMemo(
    () => (places && skins && events ? { places, skins, events } : null),
    [places, skins, events],
  );
  const view = useMemo(() => {
    if (!content) return null;
    try {
      return {
        map: liveMap(ctx.registry, content),
        world: composeLiveWorld(ctx.registry, worldId, content),
      };
    } catch {
      return null;
    }
  }, [ctx.registry, content, worldId]);

  if (!content || !view) return <p>Cargando…</p>;
  const { map, world } = view;
  const patches = content.places;
  const skinPatches = content.skins;
  const nameOf = (id: string) => world.places.find((p) => p.id === id)?.name ?? id;
  const q = filter.trim().toLowerCase();
  const list = map.places.filter(
    (p) =>
      !q || p.id.includes(q) || nameOf(p.id).toLowerCase().includes(q) || p.category.includes(q),
  );
  const place =
    selection?.kind === 'place' ? map.places.find((p) => p.id === selection.id) : undefined;
  const selectValue = selection
    ? selection.kind === 'place'
      ? selection.id
      : MAP_POINTS[selection.key]
    : '';

  return (
    <section>
      <SectionHead title="Mundo" lead={ADMIN_COPY.sharedMapNote}>
        <ResetButton ctx={ctx} areas={['places', 'skins']} />
      </SectionHead>
      <div className="admin-row">
        <Field label="Mundo (piel)">
          <select
            value={worldId}
            onChange={(e) => setWorldId(e.target.value)}
            data-testid="mundo-selector"
          >
            {ctx.registry.list().map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Buscar lugar">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="isla, cofre, faro…"
          />
        </Field>
        <Field label="Lugar">
          <select
            value={selectValue}
            data-testid="lugar-selector"
            onChange={(e) => {
              const v = e.target.value;
              const point = MAP_POINT_KEYS.find((k) => MAP_POINTS[k] === v);
              setSelection(
                point ? { kind: 'point', key: point } : v ? { kind: 'place', id: v } : null,
              );
            }}
          >
            <option value="">Elige un lugar…</option>
            <optgroup label="Puntos del mapa">
              {MAP_POINT_KEYS.map((k) => (
                <option key={k} value={MAP_POINTS[k]}>
                  {MAP_POINT_LABELS[k]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Lugares">
              {list.map((p) => (
                <option key={p.id} value={p.id}>
                  {nameOf(p.id)} · {p.id}
                  {patches[p.id] ? ' · cambiado' : ''}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
      </div>
      <div className="admin-world">
        <MapPreview
          map={map}
          world={world}
          places={patches}
          selection={selection}
          onSelect={setSelection}
        />
        <div className="admin-world__side">
          {place ? (
            <>
              <p className="admin-meta">
                <strong>{nameOf(place.id)}</strong> · {place.id} · {place.category}
              </p>
              <PlaceEditor
                key={`${place.id}|${place.position.x}|${place.position.y}|${place.active}|${JSON.stringify(place.params)}|${place.geometry.proximityRadius}`}
                ctx={ctx}
                place={place}
                patch={patches[place.id]}
              />
              <SkinEditor
                key={`${worldId}|${place.id}|${JSON.stringify(skinPatches[worldId]?.[place.id] ?? null)}`}
                ctx={ctx}
                world={world}
                place={place}
                map={map}
                patch={skinPatches[worldId]?.[place.id]}
              />
            </>
          ) : selection?.kind === 'point' ? (
            <PointEditor
              key={`${selection.key}|${JSON.stringify(patches[MAP_POINTS[selection.key]] ?? null)}`}
              ctx={ctx}
              pointKey={selection.key}
              map={ctx.registry.map}
              places={patches}
            />
          ) : (
            <p className="admin-lead">Elige un lugar en la lista o tócalo en el mapa.</p>
          )}
        </div>
      </div>
    </section>
  );
}
