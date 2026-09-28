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
import { type ComposedWorld, chooseWorld as chooseWorldIn } from '@boia/world';
import Link from 'next/link';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ShipCatalog } from '../../lib/barco/catalog';
import { SAMPLE_CONTENT } from '../../lib/landing/sample-content';
import { claimWorld } from '../../lib/world-handoff';
import { worlds } from './demo-world';
import { Compass, MenuAnchor } from './hud-buttons';
import './hud.css';
import './juego.css';
import { OnboardMenu } from './menu/onboard-menu';
import type { MenuContext, ShipMenu, WorldMenu } from './menu/types';
import { ExpandedMap, Minimap } from './minimap';
import { discoveryNotice, noticeFromWorldEvent } from './notice-copy';
import { NoticeToast, useNoticeQueue } from './notices';
import { type ShipLook, rememberLook, requestedLook, syncStyleParam } from './ship-look';
import { applyAudioSettings, chime, plop } from './sound';
import { useViewport } from './use-viewport';
import { currentWorld, syncWorldParam, visitorWorldChoice } from './world-choice';
import { EventPanel } from './world-ui';

const MANIFEST_URL = '/api/art/barco/manifest.json?optional=1';

/** Eventos de muestra (T02) hasta que haya capa de datos. */
const findEvent = (id: string | undefined) => SAMPLE_CONTENT.events.find((e) => e.id === id);
const ticketAvailable = (id: string) => {
  const e = findEvent(id);
  return !!e && EVENT_STATE_BEHAVIOR[e.state].purchasable;
};

export function GameCanvas({ shipCatalog = null }: { shipCatalog?: ShipCatalog | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vp = useViewport();
  const storeRef = useRef<KeyValueStore | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Aspecto del barco aplicado por el motor (T12) y si la superficie vino de la landing.
  const [shipLook, setShipLook] = useState<ShipLook | null>(null);
  const [shipPending, setShipPending] = useState(false);
  const [adopted, setAdopted] = useState<boolean | null>(null);
  const [menuPulse, setMenuPulse] = useState(0);
  const [minimapPulse, setMinimapPulse] = useState(0);
  const [panel, setPanel] = useState<{ objectId: string; eventId: string } | null>(null);
  const [ticketFor, setTicketFor] = useState<string | null>(null);

  // Preferencias guardadas (se leen al montar: el HUD no se pinta en servidor).
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [zonePref, setZonePref] = useState<MinimapZone | null>(null);

  // Mundo que se juega (T17). Arranca con el por defecto; al montar se elige el
  // de la URL o el guardado. Lo que el minimapa dibuja y la brújula persigue
  // sale de sus datos.
  const [world, setWorld] = useState<ComposedWorld>(() => worlds.get(worlds.defaultId));
  const [worldPending, setWorldPending] = useState(false);
  // El motor ya arrancó: se puede cambiar de mundo.
  const [worldReady, setWorldReady] = useState(false);
  const targets = useMemo(() => discoveryTargets(world.config), [world]);
  const markers = useMemo(() => mapMarkers(world.config), [world]);

  // Descubrimiento, brújula y avisos. Lo descubierto va por id de lugar: sobrevive
  // al cambio de mundo, también si un mundo oculta el lugar (REQ-AVE-011).
  const foundRef = useRef(new Set<string>());
  const trackerRef = useRef<DiscoveryTracker | null>(null);
  trackerRef.current ??= new DiscoveryTracker(targets);
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
    const t = trackerRef.current!;
    const fresh = t.update(s);
    if (fresh.length) {
      for (const f of fresh) foundRef.current.add(f.id);
      setDiscovered(t.discovered());
      for (const f of fresh) if (f.kind === 'island') notify(discoveryNotice(f));
    }
    setSelectedId(t.selected?.id ?? null);
  };

  /** Pasa la interfaz a otro mundo: objetivos nuevos, lo descubierto y lo elegido se quedan. */
  const adoptWorld = useCallback((w: ComposedWorld) => {
    const selected = trackerRef.current?.selected?.id ?? null;
    const next = new DiscoveryTracker(discoveryTargets(w.config), foundRef.current);
    next.select(selected);
    trackerRef.current = next;
    setWorld(w);
    setDiscovered(next.discovered());
    setSelectedId(next.selected?.id ?? null);
    setPanel(null);
  }, []);

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
    // `?mundo=<id>`, el elegido en este navegador o el activo del Admin (T17).
    const initial = currentWorld(window.location.search);
    adoptWorld(initial);
    // `?evento=<id>`: al entrar desde un evento, la brújula señala su isla.
    const fromEvent = query.get('evento');
    if (fromEvent && trackerRef.current?.selectEvent(fromEvent)) {
      setSelectedId(trackerRef.current.selected?.id ?? null);
    }

    (async () => {
      const { createGame, loadShipStyle } = await import('@boia/engine');
      // `?barco=provisional` fuerza el barco dibujado por código, para comparar.
      const forceProvisional = query.get('barco') === 'provisional';
      // `?estilo=<id>` (o el último elegido) y la skin guardada eligen el aspecto (T11, T12);
      // si no hay ninguno, el barco del mundo (T17).
      const want = requestedLook(window.location.search, shipCatalog);
      const styled = forceProvisional
        ? null
        : await loadShipStyle(
            MANIFEST_URL,
            want.style ?? initial.theme.ship.style,
            want.skin ?? initial.theme.ship.skin ?? null,
          );
      const manifest = styled?.loaded ?? null;
      if (cancelled) return;
      // Un ?estilo= válido queda guardado; uno desconocido no pisa lo guardado.
      const look = styled?.style && manifest ? { style: styled.style.id, skin: styled.skin } : null;
      if (look && want.style === look.style) rememberLook(look);
      // EXPLORAR desde la landing: el juego adopta su canvas, su WebGL y su mar (REQ-ENT-012).
      const surface = claimWorld();
      let target = canvas;
      if (surface) {
        target = surface.app.canvas;
        target.className = 'juego-canvas';
        target.removeAttribute('style');
        delete target.dataset.ready;
        // El canvas de React se queda oculto: React sigue siendo dueño de su nodo.
        canvas.style.display = 'none';
        canvas.before(target);
      }
      const created = await createGame(target, {
        world: initial.config,
        sea: initial.theme.sea,
        manifest,
        surface,
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
      setShipLook(created.stats().shipSource === 'manifest' ? look : null);
      setAdopted(created.adoptedSurface);
      // Por si los ajustes cambiaron mientras cargaba.
      created.setKeyboardMode(settingsRef.current.keyboardMode);
      // `?pasajera=1` muestra el slot TRIPULANTE (oculto hasta la misión Fiestera).
      if (query.get('pasajera') === '1') created.setPassenger(true);
      // Acceso para pruebas desde la consola; no existe en producción.
      if (process.env.NODE_ENV !== 'production') {
        (window as Window & { __boiaGame?: Game }).__boiaGame = created;
      }
      setWorldReady(true);
    })().catch((err: unknown) => {
      console.error(err);
      if (!cancelled) setError('No se pudo arrancar el motor en este navegador.');
    });

    return () => {
      cancelled = true;
      gameRef.current = null;
      g?.destroy();
    };
  }, [shipCatalog, adoptWorld]);

  // Sección «Barco»: aplica estilo y skin al barco en el agua, sin recargar.
  // `remember: false` (el barco por defecto de un mundo) no lo guarda como elección.
  const shipRequest = useRef(0);
  const chooseShip = (want: ShipLook, remember = true) => {
    const g = gameRef.current;
    if (!g) return;
    const request = ++shipRequest.current;
    setShipPending(true);
    (async () => {
      const { loadShipStyle } = await import('@boia/engine');
      const r = await loadShipStyle(MANIFEST_URL, want.style, want.skin);
      if (!r.loaded || !r.style) return;
      const ok = await g.setShip(r.loaded);
      if (!ok || request !== shipRequest.current || gameRef.current !== g) return;
      const look = { style: r.style.id, skin: r.skin };
      setShipLook(look);
      if (!remember) return;
      rememberLook(look);
      syncStyleParam(look.style);
    })()
      .catch((err: unknown) => console.warn('[boia] no se pudo cambiar el barco', err))
      .finally(() => {
        if (request === shipRequest.current) setShipPending(false);
      });
  };

  // Cambio de mundo (T17): mismo mapa, otra piel. El barco sigue donde está.
  const worldRequest = useRef(0);
  const chooseWorld = (id: string) => {
    const g = gameRef.current;
    if (!g || id === world.id) return;
    const next = chooseWorldIn(worlds, visitorWorldChoice(), id);
    if (!next) return;
    const request = ++worldRequest.current;
    setWorldPending(true);
    g.setWorld(next.config, { sea: next.theme.sea })
      .then((ok) => {
        if (!ok || request !== worldRequest.current || gameRef.current !== g) return;
        adoptWorld(next);
        syncWorldParam(next.id);
        // Sin barco elegido (ni en la URL ni guardado), el del mundo nuevo.
        const want = requestedLook(window.location.search, shipCatalog);
        if (want.style === null && shipLook) {
          chooseShip(
            { style: next.theme.ship.style, skin: next.theme.ship.skin ?? shipLook.skin },
            false,
          );
        }
      })
      .catch((err: unknown) => console.warn('[boia] no se pudo cambiar de mundo', err))
      .finally(() => {
        if (request === worldRequest.current) setWorldPending(false);
      });
  };

  // Cambio de mundo para pruebas desde la consola; no existe en producción.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as Window & { __boiaWorld?: (id: string) => void }).__boiaWorld = chooseWorld;
  });

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
    const t = trackerRef.current!;
    t.select(id);
    setSelectedId(t.selected?.id ?? null);
  };

  const panelEvent = panel ? findEvent(panel.eventId) : undefined;
  const layout = vp ? hudLayout(vp, zonePref) : null;
  const ship = stats ? { x: stats.x, y: stats.y, heading: stats.heading } : null;
  const target = ship ? tracker.nextTarget(ship) : null;
  const discoveredSet = new Set(discovered);
  const mapData = {
    world: world.config,
    markers,
    targets,
    discovered: discoveredSet,
    selectedId,
    ship,
  };

  const menuCtx: MenuContext | null = layout
    ? {
        settings,
        updateSettings,
        achievements,
        discovered: targets.filter((t) => discoveredSet.has(t.id)),
        minimapZone: layout.minimapZone,
        minimapZones: safeMinimapZones(vp!),
        setMinimapZone,
        ship: {
          catalog: shipCatalog,
          current: shipLook,
          pending: shipPending,
          choose: chooseShip,
        } satisfies ShipMenu,
        world: {
          worlds: worlds.list(),
          current: world.id,
          pending: worldPending || !worldReady,
          choose: chooseWorld,
        } satisfies WorldMenu,
        game,
        close: () => setMenuOpen(false),
      }
    : null;

  return (
    <div
      data-testid="juego"
      data-world={adopted === null ? undefined : adopted ? 'adoptado' : 'nuevo'}
      data-ship-style={shipLook?.style}
      data-ship-skin={shipLook?.skin}
      data-mundo={world.id}
      style={{
        ...({
          '--mundo-acento': world.theme.ui.accent,
          '--mundo-sobre-acento': world.theme.ui.onAccent,
        } as CSSProperties),
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        overscrollBehavior: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        background: world.theme.sea.base,
      }}
    >
      <canvas ref={canvasRef} className="juego-canvas" />
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
