'use client';

import type { Game, GameStats } from '@boia/engine';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { demoWorld } from './demo-world';

const MANIFEST_URL = '/api/art/barco/manifest.json?optional=1';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let game: Game | null = null;

    (async () => {
      const { createGame, loadShipManifest } = await import('@boia/engine');
      // `?barco=provisional` fuerza el barco dibujado por código, para comparar.
      const forceProvisional =
        new URLSearchParams(window.location.search).get('barco') === 'provisional';
      const manifest = forceProvisional ? null : await loadShipManifest(MANIFEST_URL);
      if (cancelled) return;
      const g = await createGame(canvas, { world: demoWorld, manifest, onStats: setStats });
      if (cancelled) {
        g.destroy();
        return;
      }
      game = g;
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
          right: 'max(8px, env(safe-area-inset-right))',
          display: 'flex',
          justifyContent: 'space-between',
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
      {error && (
        <p style={{ position: 'absolute', bottom: 16, left: 16, right: 16, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  );
}
