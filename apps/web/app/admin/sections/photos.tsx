'use client';

import type { Photo } from '@boia/contracts';
import { useState } from 'react';
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

function PhotoRow({
  ctx,
  photo,
  albums,
  changed,
}: {
  ctx: AdminContext;
  photo: Photo;
  albums: { id: string; title: string }[];
  changed: boolean;
}) {
  const [alt, setAlt] = useState(photo.alt);
  const [src, setSrc] = useState(photo.src ?? '');
  const [albumId, setAlbumId] = useState(photo.albumId);
  const { status, busy, run } = useRun();
  return (
    <li className="admin-card" data-testid={`foto-${photo.id}`}>
      <div className="admin-grid">
        <Field
          label={t('admin.photos.textoAlternativo')}
          hint={t('admin.photos.obligatorioReqCom031')}
        >
          <input value={alt} onChange={(e) => setAlt(e.target.value)} />
        </Field>
        <Field label={t('admin.photos.imagenUrl')} hint={t('admin.photos.vaciaMarcadorDeMuestra')}>
          <input type="url" value={src} onChange={(e) => setSrc(e.target.value)} />
        </Field>
        <Field label={t('admin.photos.album')}>
          <select value={albumId} onChange={(e) => setAlbumId(e.target.value)}>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="admin-row">
        <Changed on={changed} />
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() => {
            const next: Photo = { ...photo, alt, albumId };
            if (src) next.src = src;
            else delete next.src;
            void run(() => ctx.repo.admin.upsert('photos', next, { reason: 'foto' }));
          }}
        >
          {t('admin.photos.guardar')}
        </button>
        <DeleteButton ctx={ctx} area="photos" id={photo.id} />
      </div>
      <StatusLine status={status} />
    </li>
  );
}

/** Fotos y vídeos (REQ-ADM-019): álbumes y fotos de la home y del Puerto de Fotos. */
export function PhotosSection({ ctx }: { ctx: AdminContext }) {
  const photos = useRead(ctx, (r) => r.content.list('photos'));
  const albums = useRead(ctx, (r) => r.content.list('albums'));
  const changed = useRead(ctx, (r) => r.admin.overridden('photos'));
  const [alt, setAlt] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const { status, busy, run } = useRun();
  if (!photos || !albums) return <p>{t('empty.loading')}</p>;
  const changedSet = new Set(changed ?? []);
  const nextId = () => {
    let n = photos.length + 1;
    while (photos.some((p) => p.id === `foto-${n}`)) n++;
    return `foto-${n}`;
  };
  return (
    <section>
      <SectionHead title={t('admin.photos.fotosYVideos')} lead={t('admin.photos.losVideosYLa')}>
        <ResetButton ctx={ctx} areas={['photos', 'albums']} />
      </SectionHead>
      <div className="admin-grid">
        <form
          className="admin-card admin-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              if (!alt.trim()) throw new Error('falta el texto alternativo');
              await ctx.repo.admin.upsert(
                'photos',
                {
                  id: nextId(),
                  albumId: albums[0]?.id ?? 'album-muestra',
                  alt: alt.trim(),
                  width: 4,
                  height: 3,
                },
                { reason: t('admin.photos.nuevaFoto') },
              );
              setAlt('');
            }, t('admin.photos.fotoAnadida'));
          }}
        >
          <h3>{t('admin.photos.nuevaFoto2')}</h3>
          <Field label={t('admin.photos.textoAlternativo')}>
            <input value={alt} onChange={(e) => setAlt(e.target.value)} data-testid="foto-alt" />
          </Field>
          <button type="submit" className="admin-button" disabled={busy} data-testid="foto-anadir">
            {t('admin.photos.anadir')}
          </button>
        </form>
        <form
          className="admin-card admin-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              if (!albumTitle.trim()) throw new Error('falta el título');
              let n = albums.length + 1;
              while (albums.some((a) => a.id === `album-${n}`)) n++;
              await ctx.repo.admin.upsert(
                'albums',
                { id: `album-${n}`, title: albumTitle.trim() },
                { reason: t('admin.photos.nuevoAlbum') },
              );
              setAlbumTitle('');
            }, t('admin.photos.albumCreado'));
          }}
        >
          <h3>{t('admin.photos.nuevoAlbum2')}</h3>
          <Field label={t('admin.photos.titulo')}>
            <input value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} />
          </Field>
          <button type="submit" className="admin-button" disabled={busy}>
            {t('admin.photos.crear')}
          </button>
        </form>
      </div>
      <StatusLine status={status} />
      <p className="admin-meta">
        {t('admin.photos.albumes', { v1: albums.map((a) => a.title).join(' · ') })}
      </p>
      <TrashInline ctx={ctx} area="photos" />
      <ul className="admin-list">
        {photos.map((p) => (
          <PhotoRow
            key={`${p.id}|${p.alt}|${p.src}|${p.albumId}`}
            ctx={ctx}
            photo={p}
            albums={albums}
            changed={changedSet.has(p.id)}
          />
        ))}
      </ul>
    </section>
  );
}
