'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ADMIN_PATH } from '../../../lib/admin/copy';
import { type HomeView, resolveHome } from '../../../lib/landing/resolve';
import { setTextOverrides } from '../../../lib/landing/texts';
import { gameRepository } from '../../../lib/repo';
import { HomeBlocks } from '../../(landing)/components/blocks';

/**
 * La home del borrador: `admin.draftHome()` y `admin.draftTexts()` resueltos
 * con `resolveHome`, como la landing pinta lo publicado. Se vuelve a pintar
 * con cada cambio del Admin (también desde otra pestaña).
 */
export function DraftPreview() {
  const [view, setView] = useState<HomeView | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const repo = gameRepository();
    let alive = true;
    const refresh = async () => {
      const [content, texts, changes] = await Promise.all([
        repo.admin.draftHome(),
        repo.admin.draftTexts(),
        repo.admin.pendingDrafts(),
      ]);
      if (!alive) return;
      setTextOverrides(texts);
      setPending(changes.length);
      setView(resolveHome(content, new Date()));
    };
    void refresh();
    const off = repo.subscribe(({ areas }) => {
      if (areas.includes('content')) void refresh();
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  return (
    <div className="landing-root" data-testid="vista-previa-borrador" data-pendientes={pending}>
      <p
        role="note"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          margin: 0,
          padding: '8px 16px',
          background: '#1d2b53',
          color: '#fff',
          fontSize: 14,
        }}
      >
        Vista previa del borrador ({pending === 1 ? '1 cambio' : `${pending} cambios`} sin
        publicar): así quedará la home al pulsar «Publicar».{' '}
        <Link href={ADMIN_PATH}>Volver al Admin</Link>
      </p>
      {view ? (
        <>
          <main id="contenido" data-contenido="borrador">
            <HomeBlocks blocks={view.main} artists={view.artists} buyable={new Set(view.buyable)} />
          </main>
          <HomeBlocks blocks={view.footer} artists={view.artists} buyable={new Set(view.buyable)} />
        </>
      ) : (
        <p style={{ padding: 16 }}>Cargando el borrador…</p>
      )}
    </div>
  );
}
