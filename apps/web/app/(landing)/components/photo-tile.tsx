import type { Photo } from '@boia/contracts';
import { FOTOS_COPY } from '../../../lib/landing/eventos-copy';

/** Una foto con su texto alternativo, o su marcador de muestra si aún no hay imagen. */
export function PhotoTile({ photo, index }: { photo: Photo; index: number }) {
  if (photo.src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fotos del Admin, dominio aún sin fijar
      <img
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className={`photo-placeholder photo-placeholder--${index % 3}`}
      role="img"
      aria-label={photo.alt}
      style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
    >
      <span aria-hidden="true">{FOTOS_COPY.placeholder}</span>
    </div>
  );
}

export function PhotoGrid({ photos, label }: { photos: readonly Photo[]; label?: string }) {
  return (
    <ul className="photo-grid" aria-label={label}>
      {photos.map((p, i) => (
        <li key={p.id}>
          <PhotoTile photo={p} index={i} />
        </li>
      ))}
    </ul>
  );
}
