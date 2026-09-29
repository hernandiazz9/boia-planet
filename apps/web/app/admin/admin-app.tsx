'use client';

import Link from 'next/link';
import { type ComponentType, useEffect, useState } from 'react';
import { ADMIN_COPY } from '../../lib/admin/copy';
import { AchievementsSection } from './sections/achievements';
import { ArtistsSection } from './sections/artists';
import { DiscountsSection } from './sections/discounts';
import { EventsSection } from './sections/events';
import { HomeSection } from './sections/home';
import {
  AuditSection,
  IntegrationsSection,
  SeasonsSection,
  TrashSection,
  UsersSection,
} from './sections/misc';
import { ModerationSection } from './sections/moderation';
import { PhotosSection } from './sections/photos';
import { TextsSection } from './sections/texts';
import { WorldSection } from './sections/world';
import { type AdminContext, useAdminContext } from './use-admin';

/** Secciones de L1 (REQ-ADM-008), con su ancla en la URL (`/admin#mundo`). */
const SECTIONS: { id: string; label: string; Component: ComponentType<{ ctx: AdminContext }> }[] = [
  { id: 'inicio', label: 'Página principal', Component: HomeSection },
  { id: 'eventos', label: 'Eventos', Component: EventsSection },
  { id: 'descuentos', label: 'Descuentos', Component: DiscountsSection },
  { id: 'mundo', label: 'Mundo', Component: WorldSection },
  { id: 'artistas', label: 'Artistas', Component: ArtistsSection },
  { id: 'fotos', label: 'Fotos y vídeos', Component: PhotosSection },
  { id: 'logros', label: 'Logros y cosméticos', Component: AchievementsSection },
  { id: 'moderacion', label: 'Moderación', Component: ModerationSection },
  { id: 'textos', label: 'Textos y música', Component: TextsSection },
  { id: 'temporadas', label: 'Temporadas', Component: SeasonsSection },
  { id: 'usuarios', label: 'Usuarios de administración', Component: UsersSection },
  { id: 'integraciones', label: 'Integraciones', Component: IntegrationsSection },
  { id: 'papelera', label: 'Papelera', Component: TrashSection },
  { id: 'auditoria', label: 'Auditoría y muestra', Component: AuditSection },
];

function sectionFromHash(): string {
  const id = window.location.hash.slice(1);
  return SECTIONS.some((s) => s.id === id) ? id : SECTIONS[0]!.id;
}

/**
 * El Admin de la demo (T26, D-20, REQ-ADM-039): sin login, con un aviso
 * permanente de que es una prueba y de que los cambios se quedan en este
 * navegador. Lee y escribe el repositorio local, el mismo que la landing y
 * /juego: lo que se cambia aquí se ve allí, en este navegador.
 */
export function AdminApp() {
  const ctx = useAdminContext();
  const [active, setActive] = useState(SECTIONS[0]!.id);
  useEffect(() => {
    setActive(sectionFromHash());
    const onHash = () => setActive(sectionFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0]!;
  const storage = ctx?.repo.status();

  return (
    <div className="admin" data-testid="admin">
      <div className="admin-banner" role="note" data-testid="admin-aviso">
        <strong>{ADMIN_COPY.bannerTitle}.</strong> {ADMIN_COPY.banner}
        {storage?.message ? <span className="admin-banner__warn"> {storage.message}</span> : null}
      </div>
      <header className="admin-top">
        <h1>BOIA · Admin</h1>
        <nav className="admin-top__links" aria-label="Ver los cambios">
          <Link href="/?intro=0" prefetch={false} data-testid="admin-ver-web">
            Ver la web
          </Link>
          <Link href="/juego" prefetch={false} data-testid="admin-ver-mundo">
            Ver el mundo
          </Link>
        </nav>
      </header>
      <div className="admin-layout">
        <nav className="admin-nav" aria-label="Secciones del Admin">
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={s.id === section.id ? 'page' : undefined}
                  data-testid={`admin-nav-${s.id}`}
                  onClick={() => setActive(s.id)}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main className="admin-main" data-testid={`admin-seccion-${section.id}`}>
          {ctx ? <section.Component ctx={ctx} /> : <p>Cargando el Admin…</p>}
        </main>
      </div>
    </div>
  );
}
