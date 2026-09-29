'use client';

import { CARNET_QUESTIONS } from '@boia/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CarnetCard } from '../../carnet/carnet-card';
import { CarnetEditor } from '../../carnet/carnet-editor';
import { LOCAL_ONLY_NOTICE } from '../../carnet/carnet-editor';
import { carnetPath } from '../../carnet/share';
import { useCarnet } from '../../carnet/use-carnet';
import { INVITE_COPY } from '../../../../lib/landing/invitations';
import { useRepoData } from '../../repo';
import type { MenuContext, MenuSection } from '../types';

/**
 * 🪪 Mi Carnet (REQ-IDE-011): al entrar se ve primero como lo ven otros, con
 * «Editar mi Carnet»; sin Carnet, la invitación es «Crear mi Carnet». Desde
 * aquí también se comparte y se llega a la botella propia.
 */
function Carnet({ ctx }: { ctx: MenuContext }) {
  const { data, repo } = useCarnet(null);
  const { data: bottle } = useRepoData((r) => r.bottles.mine());
  const [editing, setEditing] = useState(false);
  // Al pasar de ver a editar (o al guardar), se empieza por arriba.
  useEffect(() => {
    document.getElementById('menu-panel')?.scrollTo({ top: 0 });
  }, [editing, data?.carnet?.userId]);

  if (!data || !repo) return <p className="juego-muted">Cargando tu Carnet…</p>;
  const { carnet, extras } = data;

  if (editing) {
    return (
      <CarnetEditor
        repo={repo}
        questions={CARNET_QUESTIONS}
        before={carnet}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  if (!carnet) {
    return (
      <div data-testid="carnet-invitacion">
        <p>
          Tu Carnet BOIA es tu identidad musical en el mar: tu apodo, tus respuestas, los sellos de
          los eventos a los que vas, tu barco y tus logros. Con él puedes echar botellas.
        </p>
        <button
          type="button"
          className="juego-button"
          data-testid="carnet-crear"
          onClick={() => setEditing(true)}
        >
          Crear mi Carnet
        </button>
        <p className="juego-muted">Sin email. {LOCAL_ONLY_NOTICE}</p>
        {/* REQ-IDE-007 (T44): los límites del progreso local, antes de registrarse. */}
        <p className="juego-muted" data-testid="aviso-progreso-local">
          {INVITE_COPY.localLimit}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="carnet-mio">
      <p className="juego-muted" data-testid="carnet-aviso-local">
        Así lo verán los demás cuando BOIA.PLANET abra. {LOCAL_ONLY_NOTICE}
      </p>
      <CarnetCard carnet={carnet} extras={extras} />
      <div className="carnet-actions">
        <button
          type="button"
          className="juego-button"
          data-testid="carnet-editar"
          onClick={() => setEditing(true)}
        >
          Editar mi Carnet
        </button>
      </div>
      <p>
        <Link href={carnetPath(carnet.userId)} className="juego-link">
          Ver mi Carnet a pantalla completa
        </Link>
      </p>
      <h3>Tu botella</h3>
      {bottle ? (
        <p data-testid="carnet-botella">
          🍾 «{bottle.message}»{' '}
          <button type="button" className="juego-link" onClick={ctx.openBottles}>
            Editar o retirar
          </button>
        </p>
      ) : (
        <p>
          Aún no has echado ninguna botella.{' '}
          <button type="button" className="juego-link" onClick={ctx.openBottles}>
            Echar una botella
          </button>
        </p>
      )}
    </div>
  );
}

export const carnetSection: MenuSection = {
  id: 'carnet',
  icon: '🪪',
  label: 'Mi Carnet',
  group: 'progress',
  Component: Carnet,
};
