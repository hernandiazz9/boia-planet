'use client';

import { EVENT_STATE_BEHAVIOR } from '@boia/contracts';
import type { Game, GameStats, WorldEvent } from '@boia/engine';
import {
  DEFAULT_SETTINGS,
  DiscoveryTracker,
  type KeyValueStore,
  type MinimapZone,
  type Notice,
  type Settings,
  browserStore,
  compassAngle,
  discoveryTargets,
  hudLayout,
  loadMinimapZone,
  loadSettings,
  mapMarkers,
  parseSettings,
  safeMinimapZones,
  saveMinimapZone,
  saveSettings,
} from '@boia/engine/ui';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SAMPLE_CONTENT } from '../../lib/landing/sample-content';
import { demoWorld } from './demo-world';
import { Compass, MenuAnchor } from './hud-buttons';
import './hud.css';
import './juego.css';
import { OnboardMenu } from './menu/onboard-menu';
import type { MenuContext } from './menu/types';
import { ExpandedMap, Minimap } from './minimap';
import { discoveryNotice, noticeFromWorldEvent } from './notice-copy';
import { NoticeToast, useNoticeQueue } from './notices';
import { type ShipStyleState, loadStyledShip } from './ship-style-selector';
import { applyAudioSettings, chime, plop } from './sound';
import { useViewport } from './use-viewport';
import { EventPanel } from './world-ui';

const MANIFEST_URL = '/api/art/barco/manifest.json?optional=1';

/** Eventos de muestra (T02) hasta que haya capa de datos. */
const findEvent = (id: string | undefined) => SAMPLE_CONTENT.events.find((e) => e.id === id);
const ticketAvailable = (id: string) => {
  const e = findEvent(id);
  return !!e && EVENT_STATE_BEHAVIOR[e.state].purchasable;
};

/** Lo que el minimapa dibuja y la brújula persigue: sale de los datos del mundo. */
const TARGETS = discoveryTargets(demoWorld);
const MARKERS = mapMarkers(demoWorld);

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vp = useViewport();
  const storeRef = useRef<KeyValueStore | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shipStyle, setShipStyle] = useState<ShipStyleState | null>(null);
  const [menuPulse, setMenuPulse] = useState(0);
  const [minimapPulse, setMinimapPulse] = useState(0);
  const [panel, setPanel] = useState<{ objectId: string; eventId: string } | null>(null);
  const [ticketFor, setTicketFor] = useState<string | null>(null);

  // Preferencias guardadas (se leen al montar: el HUD no se pinta en servidor).
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [zonePref, setZonePref] = useState<MinimapZone | null>(null);

  // Descubrimiento, brújula y avisos.
  const trackerRef = useRef<DiscoveryTracker | null>(null);
  trackerRef.current ??= new DiscoveryTracker(TARGETS);
  const tracker = trackerRef.current;
  const [discovered, setDiscovered] = useState<readonly string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<readonly Notice[]>([]);
  const notified = useRef(new Set<string>());
  const notices = useNoticeQueue(() => chime());
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const notify = (n: Notice) => {
    if (notified.current.has(n.id)) return;
    notified.current.add(n.id);
    notices.push(n);
    if (n.kind === 'achievement') setAchievements((a) => [...a, n]);
  };

  const onStats = (s: GameStats) => {
    setStats(s);
    const fresh = tracker.update(s);
    if (fresh.length) {
      setDiscovered(tracker.discovered());
      for (const t of fresh) if (t.kind === 'island') notify(discoveryNotice(t));
    }
    setSelectedId(tracker.selected?.id ?? null);
  };

  const onWorldEvent = (e: WorldEvent) => {
    const n = noticeFromWorldEvent(e);
    if (n) notify(n);
    switch (e.type) {
      case 'dialogue_line':
        plop();
        if (e.cue === 'pulse_menu') setMenuPulse((x) => x + 1);
        if (e.cue === 'pulse_minimap') setMinimapPulse((x) => x + 1);
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

  // El motor arranca una vez; sus callbacks leen siempre la última versión.
  const handlers = useRef({ onStats, onWorldEvent });
  handlers.current = { onStats, onWorldEvent };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let g: Game | null = null;

    const store = browserStore();
    storeRef.current = store;
    const saved = loadSettings(store);
    settingsRef.current = saved;
    setSettings(saved);
    applyAudioSettings(saved);
    setZonePref(loadMinimapZone(store));

    const query = new URLSearchParams(window.location.search);
    // `?evento=<id>`: al entrar desde un evento, la brújula señala su isla.
    const fromEvent = query.get('evento');
    if (fromEvent && trackerRef.current?.selectEvent(fromEvent)) {
      setSelectedId(trackerRef.current.selected?.id ?? null);
    }

    (async () => {
      const { createGame } = await import('@boia/engine');
      // `?barco=provisional` fuerza el barco dibujado por código, para comparar.
      const forceProvisional = query.get('barco') === 'provisional';
      // `?estilo=<id>` (o el último elegido) elige el estilo del barco (T11).
      const styled = forceProvisional ? null : await loadStyledShip(MANIFEST_URL);
      const manifest = styled?.manifest ?? null;
      if (cancelled) return;
      setShipStyle(styled?.style ?? null);
      const created = await createGame(canvas, {
        world: demoWorld,
        manifest,
        keyboardMode: settingsRef.current.keyboardMode,
        onStats: (s) => handlers.current.onStats(s),
        onWorldEvent: (e) => handlers.current.onWorldEvent(e),
        runtime: { ticketAvailable },
        // `?arte=marcadores`: el mismo mundo sin arte, para ver que se comporta igual.
        ...(query.get('arte') === 'marcadores' ? { artUrl: null } : {}),
      });
      if (cancelled) {
        created.destroy();
        return;
      }
      g = created;
      gameRef.current = created;
      setGame(created);
      // Por si los ajustes cambiaron mientras cargaba.
      created.setKeyboardMode(settingsRef.current.keyboardMode);
      // `?pasajera=1` muestra el slot TRIPULANTE (oculto hasta la misión Fiestera).
      if (query.get('pasajera') === '1') created.setPassenger(true);
      // Acceso para pruebas desde la consola; no existe en producción.
      if (process.env.NODE_ENV !== 'production') {
        (window as Window & { __boiaGame?: Game }).__boiaGame = created;
      }
    })().catch((err: unknown) => {
      console.error(err);
      if (!cancelled) setError('No se pudo arrancar el motor en este navegador.');
    });

    return () => {
      cancelled = true;
      gameRef.current = null;
      g?.destroy();
    };
  }, []);

  const updateSettings = (change: (s: Settings) => Settings) => {
    const next = parseSettings(change(settingsRef.current));
    settingsRef.current = next;
    setSettings(next);
    if (storeRef.current) saveSettings(storeRef.current, next);
    applyAudioSettings(next);
    gameRef.current?.setKeyboardMode(next.keyboardMode);
  };

  const setMinimapZone = (z: MinimapZone) => {
    setZonePref(z);
    if (storeRef.current) saveMinimapZone(storeRef.current, z);
  };

  const selectTarget = (id: string | null) => {
    tracker.select(id);
    setSelectedId(tracker.selected?.id ?? null);
  };

  const panelEvent = panel ? findEvent(panel.eventId) : undefined;
  const layout = vp ? hudLayout(vp, zonePref) : null;
  const ship = stats ? { x: stats.x, y: stats.y, heading: stats.heading } : null;
  const target = ship ? tracker.nextTarget(ship) : null;
  const discoveredSet = new Set(discovered);
  const mapData = {
    world: demoWorld,
    markers: MARKERS,
    targets: TARGETS,
    discovered: discoveredSet,
    selectedId,
    ship,
  };

  const menuCtx: MenuContext | null = layout
    ? {
        settings,
        updateSettings,
        achievements,
        discovered: TARGETS.filter((t) => discoveredSet.has(t.id)),
        minimapZone: layout.minimapZone,
        minimapZones: safeMinimapZones(vp!),
        setMinimapZone,
        shipStyle,
        game,
        close: () => setMenuOpen(false),
      }
    : null;

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
      {layout && vp ? (
        <div className="juego-hud" data-testid="hud-capa" data-joystick-top={layout.joystick.y}>
          <Link
            href="/"
            className="juego-hud-button juego-home"
            data-hud="inicio"
            style={{
              left: layout.home.x,
              top: layout.home.y,
              width: layout.home.w,
              height: layout.home.h,
            }}
          >
            Inicio
          </Link>
          {layout.stats ? (
            <div
              data-testid="hud"
              data-hud="datos"
              className="juego-stats"
              style={{
                left: layout.stats.x,
                top: layout.stats.y,
                width: layout.stats.w,
                height: layout.stats.h,
              }}
            >
              <div>
                {stats ? stats.fps.toFixed(0) : '–'} fps · {stats ? stats.speed.toFixed(0) : '–'}{' '}
                u/s{stats?.drifting ? ' · drift' : ''}
              </div>
              <div style={{ opacity: 0.65 }}>
                {stats
                  ? `${stats.direction} · ${stats.shipSource === 'manifest' ? 'sprites 01' : 'provisional'}`
                  : ''}
              </div>
            </div>
          ) : null}
          <Compass
            rect={layout.compass}
            angle={ship && target ? compassAngle(ship, target) : null}
            selected={selectedId !== null}
            onClick={() => setMapOpen(true)}
          />
          <MenuAnchor
            rect={layout.menu}
            pulse={menuPulse}
            open={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          />
          <Minimap
            data={mapData}
            rect={layout.minimap}
            vp={vp}
            pulse={minimapPulse}
            onExpand={() => setMapOpen(true)}
            onZoneChange={setMinimapZone}
          />
          <NoticeToast shown={notices.current} rect={layout.notice} onDismiss={notices.dismiss} />
        </div>
      ) : null}
      {panelEvent && (
        <EventPanel
          event={panelEvent}
          showTicket={ticketFor === panelEvent.id}
          onClose={() => setPanel(null)}
        />
      )}
      {mapOpen && vp ? (
        <ExpandedMap
          data={mapData}
          vp={vp}
          onSelect={selectTarget}
          onClose={() => setMapOpen(false)}
        />
      ) : null}
      {menuOpen && menuCtx ? <OnboardMenu ctx={menuCtx} /> : null}
      {error && (
        <p style={{ position: 'absolute', bottom: 16, left: 16, right: 16, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  );
}
