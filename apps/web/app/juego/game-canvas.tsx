'use client';

import { EVENT_STATE_BEHAVIOR } from '@boia/contracts';
import type { Game, GameStats, WorldEvent } from '@boia/engine';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SAMPLE_CONTENT } from '../../lib/landing/sample-content';
import { demoWorld } from './demo-world';
import './juego.css';
import { ShipStyleSelector, loadStyledShip, type ShipStyleState } from './ship-style-selector';
import { EventPanel, MenuAnchor, MinimapPlaceholder, plop } from './world-ui';

const MANIFEST_URL = '/api/art/barco/manifest.json?optional=1';

/** Eventos de muestra (T02) hasta que haya capa de datos. */
const findEvent = (id: string | undefined) => SAMPLE_CONTENT.events.find((e) => e.id === id);
const ticketAvailable = (id: string) => {
  const e = findEvent(id);
  return !!e && EVENT_STATE_BEHAVIOR[e.state].purchasable;
};

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shipStyle, setShipStyle] = useState<ShipStyleState | null>(null);
  const [menuPulse, setMenuPulse] = useState(0);
  const [minimapPulse, setMinimapPulse] = useState(0);
  const [panel, setPanel] = useState<{ objectId: string; eventId: string } | null>(null);
  const [ticketFor, setTicketFor] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let game: Game | null = null;

    (async () => {
      const { createGame } = await import('@boia/engine');
      const query = new URLSearchParams(window.location.search);
      // `?barco=provisional` fuerza el barco dibujado por código, para comparar.
      const forceProvisional = query.get('barco') === 'provisional';
      // `?estilo=<id>` (o el último elegido) elige el estilo del barco (T11).
      const styled = forceProvisional ? null : await loadStyledShip(MANIFEST_URL);
      const manifest = styled?.manifest ?? null;
      if (cancelled) return;
      setShipStyle(styled?.style ?? null);
      const onWorldEvent = (e: WorldEvent) => {
        switch (e.type) {
          case 'dialogue_line':
            plop();
            if (e.cue === 'pulse_menu') setMenuPulse((n) => n + 1);
            if (e.cue === 'pulse_minimap') setMinimapPulse((n) => n + 1);
            break;
          case 'content_open':
            if (e.target === 'event' && e.ref && findEvent(e.ref)) {
              setPanel({ objectId: e.objectId, eventId: e.ref });
            }
            break;
          case 'content_close':
            setPanel((p) => (p?.objectId === e.objectId ? null : p));
            break;
          case 'ticket':
            setTicketFor(e.eventId);
            break;
          default:
            break;
        }
      };
      const g = await createGame(canvas, {
        world: demoWorld,
        manifest,
        onStats: setStats,
        onWorldEvent,
        runtime: { ticketAvailable },
        // `?arte=marcadores`: el mismo mundo sin arte, para ver que se comporta igual.
        ...(query.get('arte') === 'marcadores' ? { artUrl: null } : {}),
      });
      if (cancelled) {
        g.destroy();
        return;
      }
      game = g;
      // `?pasajera=1` muestra el slot TRIPULANTE (oculto hasta la misión Fiestera).
      if (query.get('pasajera') === '1') g.setPassenger(true);
      // Acceso para pruebas desde la consola; no existe en producción.
      if (process.env.NODE_ENV !== 'production') {
        (window as Window & { __boiaGame?: Game }).__boiaGame = g;
      }
    })().catch((err: unknown) => {
      console.error(err);
      if (!cancelled) setError('No se pudo arrancar el motor en este navegador.');
    });

    return () => {
      cancelled = true;
      game?.destroy();
    };
  }, []);

  const panelEvent = panel ? findEvent(panel.eventId) : undefined;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        overscrollBehavior: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        background: '#0f5f7d',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 'max(8px, env(safe-area-inset-top))',
          left: 'max(8px, env(safe-area-inset-left))',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
          pointerEvents: 'none',
          font: '600 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
          textShadow: '0 1px 2px rgba(0,0,0,.6)',
        }}
      >
        <div
          data-testid="hud"
          style={{ background: 'rgba(18,35,63,.55)', padding: '4px 8px', borderRadius: 6 }}
        >
          <div>FPS {stats ? stats.fps.toFixed(0) : '–'}</div>
          <div>vel {stats ? stats.speed.toFixed(0) : '–'} u/s</div>
          <div>drift {stats?.drifting ? 'sí' : 'no'}</div>
          <div style={{ opacity: 0.6 }}>
            {stats
              ? `${stats.direction} · ${stats.shipSource === 'manifest' ? 'sprites 01' : 'barco provisional'}`
              : ''}
          </div>
        </div>
        <Link
          href="/"
          style={{
            pointerEvents: 'auto',
            background: 'rgba(18,35,63,.55)',
            padding: '8px 12px',
            borderRadius: 6,
            textDecoration: 'none',
          }}
        >
          Inicio
        </Link>
      </div>
      <div className="juego-side">
        <MinimapPlaceholder pulse={minimapPulse} />
        <MenuAnchor pulse={menuPulse} />
      </div>
      {panelEvent && (
        <EventPanel
          event={panelEvent}
          showTicket={ticketFor === panelEvent.id}
          onClose={() => setPanel(null)}
        />
      )}
      <ShipStyleSelector state={shipStyle} />
      {error && (
        <p style={{ position: 'absolute', bottom: 16, left: 16, right: 16, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  );
}
