'use client';

import { useState } from 'react';
import { es, type MessageKey } from '../../../lib/i18n/es';
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
      <MusicPanel ctx={ctx} />
    </section>
  );
}

/** Lee un archivo del dispositivo como data URL. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('no se pudo leer el archivo'));
    r.readAsDataURL(file);
  });
}

/**
 * Música de ambiente y efectos con su licencia u origen (REQ-ADM-020). En la
 * versión de prueba el audio se guarda en este navegador como data URL y es
 * siempre `muestra`; la música de cada mundo sigue siendo su loop generado
 * (O10) hasta que haya pistas con licencia (P18).
 */
function MusicPanel({ ctx }: { ctx: AdminContext }) {
  const tracks = useRead(ctx, (r) => r.content.list('music'));
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'ambient' | 'effect'>('ambient');
  const [worldId, setWorldId] = useState('');
  const [licence, setLicence] = useState('');
  const [origin, setOrigin] = useState('');
  const [licenceUrl, setLicenceUrl] = useState('');
  const { status, busy, run } = useRun();
  return (
    <>
      <h3>Música</h3>
      <p className="admin-lead">
        Música de ambiente y efectos, cada pista con su licencia y su origen. Se guarda sólo en este
        navegador (muestra). Ranura de cada mundo:{' '}
        {ctx.registry
          .ids()
          .map((id) => {
            const w = ctx.registry.get(id);
            return `${w.theme.name}: ${w.theme.music ?? 'loop generado'}`;
          })
          .join(' · ')}
        .
      </p>
      <form
        className="admin-card admin-form"
        data-testid="musica-form"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            if (!file) throw new Error('elige un archivo de audio');
            const src = await readAsDataUrl(file);
            await ctx.actions.saveMusic({
              title,
              kind,
              src,
              licence,
              origin,
              ...(worldId ? { worldId } : {}),
              ...(licenceUrl.trim() ? { licenceUrl: licenceUrl.trim() } : {}),
            });
            setFile(null);
            setTitle('');
            setLicence('');
            setOrigin('');
            setLicenceUrl('');
          }, 'Pista guardada en este navegador (muestra).');
        }}
      >
        <div className="admin-grid">
          <Field label="Archivo de audio" hint="mp3, ogg o wav; hasta ~1 MB en la demo.">
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              data-testid="musica-archivo"
            />
          </Field>
          <Field label="Título">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="musica-titulo"
            />
          </Field>
          <Field label="Tipo">
            <select value={kind} onChange={(e) => setKind(e.target.value as 'ambient' | 'effect')}>
              <option value="ambient">Música de ambiente</option>
              <option value="effect">Efecto de sonido</option>
            </select>
          </Field>
          <Field label="Mundo">
            <select value={worldId} onChange={(e) => setWorldId(e.target.value)}>
              <option value="">Todos</option>
              {ctx.registry.list().map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Licencia" hint="CC BY 4.0, propia, cedida por…">
            <input
              value={licence}
              onChange={(e) => setLicence(e.target.value)}
              data-testid="musica-licencia"
            />
          </Field>
          <Field label="Autor u origen">
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              data-testid="musica-origen"
            />
          </Field>
          <Field label="Enlace de la licencia (opcional)">
            <input type="url" value={licenceUrl} onChange={(e) => setLicenceUrl(e.target.value)} />
          </Field>
        </div>
        <button type="submit" className="admin-button" disabled={busy} data-testid="musica-subir">
          Subir pista
        </button>
        <StatusLine status={status} />
      </form>
      <TrashInline ctx={ctx} area="music" />
      <ul className="admin-list" data-testid="musica-lista">
        {(tracks ?? []).map((t) => (
          <li key={t.id} className="admin-card" data-testid={`musica-${t.id}`}>
            <div className="admin-row admin-row--between">
              <div>
                <strong>{t.title}</strong> · {t.kind === 'ambient' ? 'ambiente' : 'efecto'} ·{' '}
                {t.worldId ?? 'todos los mundos'} · muestra
                <p className="admin-meta">
                  Licencia: {t.licence}
                  {t.licenceUrl ? (
                    <>
                      {' '}
                      (
                      <a href={t.licenceUrl} target="_blank" rel="noreferrer">
                        enlace
                      </a>
                      )
                    </>
                  ) : null}{' '}
                  · Origen: {t.origin}
                </p>
              </div>
              <DeleteButton ctx={ctx} area="music" id={t.id} />
            </div>
            <audio controls preload="none" src={t.src}>
              <track kind="captions" />
            </audio>
          </li>
        ))}
        {tracks && tracks.length === 0 ? (
          <li className="admin-meta">Sin pistas subidas todavía.</li>
        ) : null}
      </ul>
    </>
  );
}
