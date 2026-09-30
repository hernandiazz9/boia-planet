'use client';

import type { Artist } from '@boia/contracts';
import { useState } from 'react';
import { slugify } from '../../../lib/admin/actions';
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
import { t } from '../../../lib/i18n';

const genresOf = (s: string) =>
  s
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);

function ArtistRow({
  ctx,
  artist,
  changed,
}: {
  ctx: AdminContext;
  artist: Artist;
  changed: boolean;
}) {
  const [name, setName] = useState(artist.name);
  const [genres, setGenres] = useState(artist.genres.join(', '));
  const [photo, setPhoto] = useState(artist.photoUrl ?? '');
  const { status, busy, run } = useRun();
  return (
    <li className="admin-card" data-testid={`artista-${artist.id}`}>
      <div className="admin-grid">
        <Field label={t('admin.artists.nombre')}>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('admin.artists.generosSeparadosPorComas')}>
          <input value={genres} onChange={(e) => setGenres(e.target.value)} />
        </Field>
        <Field
          label={t('admin.artists.fotoUrlOpcional')}
          hint={t('admin.artists.sinFotoAprobadaAvatar')}
        >
          <input type="url" value={photo} onChange={(e) => setPhoto(e.target.value)} />
        </Field>
      </div>
      <div className="admin-row">
        <Changed on={changed} />
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() =>
            void run(() =>
              ctx.repo.admin.upsert(
                'artists',
                {
                  id: artist.id,
                  name,
                  genres: genresOf(genres),
                  ...(photo ? { photoUrl: photo } : {}),
                },
                { reason: 'artista' },
              ),
            )
          }
        >
          {t('admin.artists.guardar')}
        </button>
        <DeleteButton ctx={ctx} area="artists" id={artist.id} />
      </div>
      <StatusLine status={status} />
    </li>
  );
}

/** Artistas (REQ-ADM-019): la lista de la home y de /artistas. */
export function ArtistsSection({ ctx }: { ctx: AdminContext }) {
  const artists = useRead(ctx, (r) => r.content.list('artists'));
  const changed = useRead(ctx, (r) => r.admin.overridden('artists'));
  const [name, setName] = useState('');
  const [genres, setGenres] = useState('');
  const { status, busy, run } = useRun();
  if (!artists) return <p>{t('empty.loading')}</p>;
  const changedSet = new Set(changed ?? []);
  const ids = new Set(artists.map((a) => a.id));
  return (
    <section>
      <SectionHead
        title={t('admin.artists.artistas')}
        lead={t('admin.artists.artistasLaHomeLos', { length: artists.length })}
      >
        <ResetButton ctx={ctx} areas={['artists']} />
      </SectionHead>
      <form
        className="admin-card admin-form"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const id = slugify(name);
            if (!id) throw new Error('falta el nombre');
            if (ids.has(id)) throw new Error(`ya existe «${name}»`);
            await ctx.repo.admin.upsert(
              'artists',
              { id, name: name.trim(), genres: genresOf(genres) },
              { reason: t('admin.artists.nuevoArtista') },
            );
            setName('');
            setGenres('');
          }, t('admin.artists.artistaAnadido'));
        }}
      >
        <h3>{t('admin.artists.nuevoArtista2')}</h3>
        <div className="admin-grid">
          <Field label={t('admin.artists.nombre')}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="artista-nombre"
            />
          </Field>
          <Field label={t('admin.artists.generosSeparadosPorComas')}>
            <input
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              data-testid="artista-generos"
            />
          </Field>
        </div>
        <button type="submit" className="admin-button" disabled={busy} data-testid="artista-anadir">
          {t('admin.artists.anadir')}
        </button>
        <StatusLine status={status} />
      </form>
      <TrashInline ctx={ctx} area="artists" />
      <ul className="admin-list">
        {artists.map((a) => (
          <ArtistRow
            key={`${a.id}|${a.name}|${a.genres.join()}|${a.photoUrl}`}
            ctx={ctx}
            artist={a}
            changed={changedSet.has(a.id)}
          />
        ))}
      </ul>
    </section>
  );
}
