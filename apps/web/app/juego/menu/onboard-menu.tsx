'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { orderedSections } from './sections';
import type { MenuContext } from './types';

/**
 * Menú de a bordo (§19, REQ-IDE-034): barra superior de iconos grandes, con
 * el título dentro de cada sección, tooltip en escritorio (`title`), icono
 * activo resaltado y separación antes de Controles y Ajustes. No para el
 * juego: el barco sigue en el agua detrás.
 */
export function OnboardMenu({ ctx, initial }: { ctx: MenuContext; initial?: string }) {
  const sections = orderedSections();
  const [activeId, setActiveId] = useState(
    sections.find((s) => s.id === initial)?.id ?? sections[0]!.id,
  );
  const active = sections.find((s) => s.id === activeId) ?? sections[0]!;
  const firstTool = sections.findIndex((s) => s.group === 'tools');
  const ref = useRef<HTMLElement>(null);
  // El foco entra en el menú: Escape lo cierra y el teclado no mueve el barco.
  useEffect(() => ref.current?.focus(), []);

  return (
    <div className="juego-overlay" onClick={ctx.close}>
      <section
        ref={ref}
        tabIndex={-1}
        className="juego-menu"
        role="dialog"
        aria-label="Menú de a bordo"
        data-testid="menu"
        onClick={(e) => e.stopPropagation()}
        // El teclado del menú no mueve el barco ni avanza bocadillos.
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') ctx.close();
        }}
      >
        <nav className="juego-menu-bar" role="tablist" aria-label="Secciones del menú">
          {sections.map((s, i) => (
            <Fragment key={s.id}>
              {i === firstTool && i > 0 ? (
                <span className="juego-menu-sep" aria-hidden="true" />
              ) : null}
              <button
                type="button"
                role="tab"
                id={`menu-tab-${s.id}`}
                aria-controls="menu-panel"
                aria-selected={s.id === active.id}
                aria-label={s.label}
                title={s.label}
                data-testid={`menu-${s.id}`}
                className={`juego-menu-icon${s.id === active.id ? ' is-active' : ''}`}
                onClick={() => setActiveId(s.id)}
              >
                <span aria-hidden="true">{s.icon}</span>
              </button>
            </Fragment>
          ))}
        </nav>
        <div
          className="juego-menu-body"
          role="tabpanel"
          id="menu-panel"
          aria-labelledby={`menu-tab-${active.id}`}
        >
          <header className="juego-sheet-head">
            <h2>{active.label}</h2>
            <button
              type="button"
              className="juego-close"
              onClick={ctx.close}
              aria-label="Cerrar menú"
            >
              ×
            </button>
          </header>
          <active.Component ctx={ctx} />
        </div>
      </section>
    </div>
  );
}
