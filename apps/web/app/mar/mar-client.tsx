'use client';

import type { ShipState, WorldEvent } from '@boia/engine/headless';
import { EVENT_STATE_BEHAVIOR } from '@boia/contracts';
import {
  CircuitRace,
  type CircuitSpec,
  circuitFromWorld,
  formatRaceTime,
} from '@boia/engine/circuit';
import { MINIGAME_REGISTRY } from '@boia/engine/minigames';
import {
  type MissionEvent,
  RescueMission,
  type RescuePhase,
  rescueMissionOf,
} from '@boia/engine/mission';
import {
  type Notice,
  SHIP_STYLE_STORAGE_KEY,
  browserStore,
  loadSettings,
  requestedShipStyle,
} from '@boia/engine/ui';
import { CIRCUIT_ID, type ComposedWorld, type WorldConfig } from '@boia/world';
import Link from 'next/link';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { liveWorld } from '../../lib/admin/live-world';
import { SandboxCheckout } from '../../lib/ticketing/checkout';
import { purchaseNotices } from '../../lib/ticketing/notices';
import { ClaimBadge, claimLabel } from '../../lib/logros/claim-badge';
import { lockedShipText, useReadyCount, useShipLocks } from '../../lib/logros/use-logros';
import {
  TIME_PLAYED_TICK_S,
  onAchievementNotices,
  recordSignal,
  signalFromWorldEvent,
} from '../juego/achievements';
import { finishLap, lapNotices } from '../juego/circuit-hud';
import { worlds } from '../juego/demo-world';
import type { DolphinTrail } from '../juego/encounters';
import { WhirlpoolTimer, findDolphin } from '../juego/encounters';
import { type MinigameOffer, MinigameLayer } from '../juego/minigame-layer';
import { boardedNotice, deliveredNotice, loadMission, persistMissionEvent } from '../juego/mission';
import { useNoticeQueue } from '../juego/notices';
import { gameRepository, useRepoData } from '../juego/repo';
import { chime, fanfare, plop } from '../juego/sound';
import { adminWorldId, currentWorld } from '../juego/world-choice';
import {
  type ProgressOutcome,
  discoverPlace,
  grantEncounter,
  persistWorldEvent,
} from '../juego/world-progress';
import { marWorld } from './engine/compact';
import type { CourseInfo, Mar3D, PinSpec, Stats, VoyageEnd } from './engine/mar3d';
import { MOOD_IDS, MOOD_LABEL, type MoodId } from './engine/palette';
import { type ShipModelEntry, loadShipManifest, loadShipModel } from './engine/ship-model';
import { MarLogros } from './logros';
import { MarMinimap } from './minimap';
import { raceCheckpoint } from './race';
import {
  type EventTrip,
  Sheet,
  type SheetState,
  currentEventTrip,
  eventOfPlace,
  findEvent,
} from './sheet';
import './mar.css';

/**
 * /mar: el mar de BOIA en 3D, la otra forma de explorar junto a /juego. Mismo
 * mapa compartido, mismo motor de comportamientos y mismo repositorio (lo que
 * se gana aquí sale en el Carnet y en /juego, y al revés); la vista, la
 * cámara y los controles son nuevos: pensados para el móvil, con zoom
 * continuo desde la cubierta hasta el mapa entero. Textos `muestra`.
 */

const progressApi = () => gameRepository().progress;
const newSessionId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const MOOD_KEY = 'boia:mar3d:momento';
const HELP_KEY = 'boia:mar3d:ayuda';

const ticketAvailable = (id: string) => {
  const e = findEvent(id);
  return !!e && EVENT_STATE_BEHAVIOR[e.state].purchasable;
};

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * «Entradas» vuela (experimento): el barco despliega alas y vuela a la isla
 * del evento. `?vuelo=0` vuelve al viaje en turbo por el mar, para comparar.
 */
function ticketsFly(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('vuelo') !== '0';
  } catch {
    return true;
  }
}

function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writePref(key: string, v: string): void {
  try {
    window.localStorage.setItem(key, v);
  } catch {
    // Sin almacenamiento (modo privado): no se recuerda y ya.
  }
}

const PIN_ICON: Record<string, string> = {
  allday: '🎤',
  cala: '🏺',
  fotos: '📷',
  tienda: '🛍️',
  ultima: '🌅',
  faro: '🗼',
  canon: '💣',
};

function pinsOf(world: WorldConfig, phase: RescuePhase | null): PinSpec[] {
  const out: PinSpec[] = [];
  for (const o of world.objects) {
    if (!o.identity.active) continue;
    const id = o.identity.id;
    const cat = o.identity.category;
    if (cat === 'isla') {
      const ev = eventOfPlace(o);
      out.push({
        id,
        text: o.identity.name,
        icon: PIN_ICON[id] ?? '🏝️',
        ...(ev ? { accent: true, always: true } : {}),
      });
    } else if (cat === 'naufrago') {
      out.push({ id, text: o.identity.name, icon: '🆘' });
    } else if (
      cat === 'encuentro' &&
      (phase === null || phase === 'waiting' || phase === 'loading')
    ) {
      out.push({ id, text: o.identity.name, icon: '🎈', always: true });
    } else if (
      cat === 'circuito' &&
      o.behaviors.some((b) => b.type === 'checkpoint' && b.params.order === 0)
    ) {
      out.push({ id, text: o.identity.name, icon: '🏁' });
    }
  }
  return out;
}

type Status = 'loading' | 'ready' | 'error';

export function MarClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Mar3D | null>(null);
  const worldRef = useRef<WorldConfig | null>(null);
  const liveRef = useRef<ComposedWorld | null>(null);
  const worldIdRef = useRef('arcilla');
  const phaseRef = useRef<RescuePhase | null>(null);
  const missionRef = useRef<RescueMission | null>(null);
  const raceRef = useRef<{ race: CircuitRace; spec: CircuitSpec } | null>(null);
  const dolphinRef = useRef<DolphinTrail | null>(null);
  const whirlRef = useRef(new WhirlpoolTimer());
  const rescueNotices = useRef<Promise<Notice[]> | null>(null);

  const [sessionId] = useState(newSessionId);
  const [status, setStatus] = useState<Status>('loading');
  const [stats, setStats] = useState<Stats | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [checkoutFor, setCheckoutFor] = useState<string | null>(null);
  // Viaje en turbo del botón «Entradas» (REQ-ENT-040) y lo que sube la ficha abierta.
  const [trip, setTrip] = useState<EventTrip | null>(null);
  const tripRef = useRef<EventTrip | null>(null);
  tripRef.current = trip;
  const [sheetLift, setSheetLift] = useState(0);
  const [minigameOffer, setMinigameOffer] = useState<MinigameOffer | null>(null);
  const [minigameOpen, setMinigameOpen] = useState(false);
  const [mood, setMood] = useState<MoodId>('tarde');
  const [dialogue, setDialogue] = useState<{
    objectId: string;
    text: string;
    last: boolean;
  } | null>(null);
  const [phase, setPhase] = useState<RescuePhase | null>(null);
  const [race, setRace] = useState<{
    phase: string;
    countdown: number | null;
    ms: number | null;
    next: number;
  } | null>(null);
  const [help, setHelp] = useState(false);
  const [menu, setMenu] = useState(false);
  const [worldName, setWorldName] = useState('');
  const [ships, setShips] = useState<ShipModelEntry[]>([]);
  const [shipId, setShipId] = useState<string | null>(null);
  const [settings] = useState(() =>
    typeof window === 'undefined' ? null : loadSettings(browserStore()),
  );
  const { data: balances } = useRepoData((r) => r.progress.balances());
  // Logros (T37): el icono del HUD con su número y el panel para reclamar.
  const [logros, setLogros] = useState(false);
  const readyToClaim = useReadyCount();
  const shipLocks = useShipLocks() ?? [];

  // Avisos con tiempo de lectura (D-22): al menos 3 s, más si el texto es largo.
  const notices = useNoticeQueue(
    (n) => {
      if (n.kind === 'reward' || n.kind === 'achievement') chime();
    },
    { readable: true },
  );
  const push = notices.push;

  const persist = useCallback(
    (p: Promise<ProgressOutcome[]>) => {
      p.then((outs) => {
        for (const o of outs) {
          push(o.notice);
          if (o.kind === 'discount') setSheet({ kind: 'discount', found: o.found });
        }
      }).catch((err: unknown) => console.warn('[boia] no se pudo guardar el progreso', err));
    },
    [push],
  );

  const pushAll = useCallback(
    (p: Promise<Notice[]>) => {
      p.then((ns) => ns.forEach(push)).catch((err: unknown) =>
        console.warn('[boia] no se pudo apuntar el logro', err),
      );
    },
    [push],
  );

  // Los logros de las señales sueltas (minijuegos, mundo, botellas, Carnet)
  // también avisan aquí, como en /juego (T37).
  useEffect(() => onAchievementNotices((ns) => ns.forEach(push)), [push]);

  // --- Eventos del mundo ------------------------------------------------------

  const syncDialogue = () => {
    const d = engineRef.current?.dialogue();
    setDialogue(
      d ? { objectId: d.objectId, text: d.text, last: d.reaction || d.index >= d.count - 1 } : null,
    );
  };

  const raceEvents = (evs: ReturnType<CircuitRace['tick']>) => {
    const r = raceRef.current;
    const g = engineRef.current;
    if (!r || !g) return;
    for (const e of evs) {
      switch (e.type) {
        case 'countdown':
          g.setSemaphore('red');
          g.setNextGate(1);
          plop();
          break;
        case 'go':
          g.setSemaphore('green');
          chime();
          window.setTimeout(() => engineRef.current?.setSemaphore('off'), 2500);
          break;
        case 'checkpoint':
          g.setNextGate(e.order + 1);
          plop();
          break;
        case 'finish': {
          g.setNextGate(null);
          g.celebrate(null);
          fanfare();
          // Con la ruta: el atajo cuenta también en /mar (T37).
          finishLap(progressApi(), r.spec, e.ms, e.route)
            .then((res) => lapNotices(e.ms, res).forEach(push))
            .catch((err: unknown) => console.warn('[boia] no se pudo guardar la vuelta', err));
          break;
        }
        case 'invalid':
          g.setNextGate(null);
          g.setSemaphore('off');
          push({
            id: `circuito:anulada:${Date.now()}`,
            kind: 'info',
            title: 'Vuelta anulada',
            body: 'Vuelve a pasar por la salida.',
          });
          break;
      }
    }
  };

  const onWorldEvent = (e: WorldEvent) => {
    const world = worldRef.current;
    if (!world) return;
    const ctx = { sessionId, worldId: worldIdRef.current };
    const repo = gameRepository();
    const r = raceRef.current;
    if (r && e.type === 'checkpoint') {
      raceEvents(raceCheckpoint(r.race, e.objectId, performance.now() / 1000));
    }
    switch (e.type) {
      case 'reward':
        persist(persistWorldEvent(progressApi(), e, ctx));
        break;
      case 'achievement': {
        const s = signalFromWorldEvent(e, world);
        if (s) pushAll(recordSignal(repo, s));
        break;
      }
      case 'proximity_enter': {
        const o = world.objects.find((x) => x.identity.id === e.objectId);
        if (o?.identity.category === 'isla') {
          void discoverPlace(progressApi(), e.objectId, ctx)
            .then((first) => {
              if (first)
                push({
                  id: `descubierta:${e.objectId}`,
                  kind: 'discovery',
                  title: `Isla descubierta: ${o.identity.name}`,
                });
            })
            .catch(() => undefined);
        }
        const d = dolphinRef.current;
        if (d && e.objectId === d.objectId) {
          const step = d.reached();
          engineRef.current?.runtime.moveObject(d.objectId, step.moveTo.x, step.moveTo.y);
          plop();
          if (step.reward)
            persist(grantEncounter(progressApi(), `lugar:${d.objectId}:seguir`, d.coins, 'daily'));
        }
        if (o?.identity.category === 'remolino') whirlRef.current.enter(performance.now());
        break;
      }
      case 'proximity_exit': {
        setMinigameOffer((m) => (m?.objectId === e.objectId ? null : m));
        const o = world.objects.find((x) => x.identity.id === e.objectId);
        if (o?.identity.category === 'remolino') {
          const { tiers } = whirlRef.current.exit(performance.now());
          for (const t of tiers) {
            persist(
              grantEncounter(progressApi(), `lugar:remolino:${t.seconds}s`, t.coins, 'daily'),
            );
          }
        }
        setSheet((s) => (s && s.kind === 'preview' && s.placeId === e.objectId ? null : s));
        break;
      }
      case 'dialogue_line':
        plop();
        syncDialogue();
        break;
      case 'dialogue_reaction':
      case 'dialogue_end':
        syncDialogue();
        break;
      case 'content_open':
        if (r?.race.active) raceEvents([r.race.invalidate('panel')!].filter(Boolean));
        if (e.target === 'event' && e.ref && findEvent(e.ref)) {
          setSheet({ kind: 'event', placeId: e.objectId, eventId: e.ref });
        } else if (e.target === 'info' || e.target === 'photos' || e.target === 'store') {
          setSheet((s) =>
            s?.kind === 'discount'
              ? s
              : {
                  kind: 'content',
                  placeId: e.objectId,
                  target: e.target as 'info',
                  ...(e.ref ? { ref: e.ref } : {}),
                },
          );
        }
        break;
      case 'content_close':
        setSheet((s) => (s && s.kind !== 'discount' && s.placeId === e.objectId ? null : s));
        break;
      case 'minigame':
        if (e.available && e.gameId) setMinigameOffer({ objectId: e.objectId, gameId: e.gameId });
        break;
      case 'contact':
        if (e.mode === 'block' || e.mode === 'bounce') navigator.vibrate?.(12);
        break;
      default:
        break;
    }
  };

  const onMissionEvent = (e: MissionEvent) => {
    const ctx = { worldId: worldIdRef.current };
    switch (e.type) {
      case 'croc_dive':
      case 'croc_emerge':
        plop();
        break;
      case 'rescued':
        rescueNotices.current = persistMissionEvent(gameRepository(), e, ctx).catch(() => []);
        break;
      case 'boarded': {
        chime();
        push(boardedNotice(e.missionId));
        const granted = rescueNotices.current;
        rescueNotices.current = null;
        if (granted) pushAll(granted);
        break;
      }
      case 'delivered':
        fanfare();
        engineRef.current?.celebrate(e.destination);
        push(deliveredNotice(e.missionId));
        pushAll(persistMissionEvent(gameRepository(), e, ctx));
        break;
      default:
        break;
    }
  };

  const onStep = (ship: ShipState, dt: number) => {
    const m = missionRef.current;
    const g = engineRef.current;
    if (!m || !g) return;
    const evs = m.step(g.missionHost, ship, dt);
    for (const e of evs) onMissionEvent(e);
    if (m.phase !== phaseRef.current) {
      phaseRef.current = m.phase;
      setPhase(m.phase);
    }
  };

  const onStats = (s: Stats) => {
    setStats(s);
    const r = raceRef.current;
    if (r) {
      const now = performance.now() / 1000;
      raceEvents(r.race.tick(now));
      const v = r.race.view(now);
      if (v.phase === 'countdown' && v.countdown !== null && v.countdown < 1)
        engineRef.current?.setSemaphore('amber');
      setRace(
        v.phase === 'idle'
          ? null
          : { phase: v.phase, countdown: v.countdown, ms: v.elapsedMs, next: v.next },
      );
    }
  };

  const onPin = (id: string) => {
    setSheet((s) => (s?.kind === 'discount' ? s : { kind: 'preview', placeId: id }));
  };

  // --- Botón «Entradas» (REQ-ENT-040) -----------------------------------------

  /** Abre la compra de prueba del evento, cortando el viaje si lo había. */
  const openCheckout = (eventId: string) => {
    engineRef.current?.stopVoyage();
    setTrip(null);
    setSheet((s) => (s?.kind === 'discount' ? s : null));
    setCheckoutFor(eventId);
  };

  const onVoyageEnd = (placeId: string, how: VoyageEnd) => {
    const t = tripRef.current;
    if (!t || t.placeId !== placeId) return;
    if (how === 'cancelled') setTrip(null);
    else openCheckout(t.eventId);
  };

  /**
   * Primer toque: turbo hasta la isla del evento vigente y, al llegar, su
   * checkout. Otro toque (o «Saltar») lo abre ya; con movimiento reducido se
   * abre directo; sin evento vigente, a las entradas de la landing.
   */
  const onTickets = () => {
    const current = tripRef.current;
    if (current) {
      openCheckout(current.eventId);
      return;
    }
    const w = worldRef.current;
    const next = w ? currentEventTrip(w) : null;
    if (!next) {
      window.location.assign('/#tickets');
      return;
    }
    const g = engineRef.current;
    const started = g
      ? ticketsFly()
        ? g.startFlight(next.placeId)
        : g.startVoyage(next.placeId)
      : false;
    if (prefersReducedMotion() || !started) {
      openCheckout(next.eventId);
      return;
    }
    navigator.vibrate?.(20);
    setSheet((s) => (s?.kind === 'discount' ? s : null));
    setTrip(next);
  };

  const handlers = useRef({ onWorldEvent, onStep, onStats, onPin, onVoyageEnd });
  handlers.current = { onWorldEvent, onStep, onStats, onPin, onVoyageEnd };

  // --- Arranque ---------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;
    let cancelled = false;
    let engine: Mar3D | null = null;
    const saved = readPref(MOOD_KEY);
    const startMood: MoodId = MOOD_IDS.includes(saved as MoodId) ? (saved as MoodId) : 'tarde';
    setMood(startMood);
    setHelp(readPref(HELP_KEY) !== 'visto');

    (async () => {
      const chosen = currentWorld(window.location.search, await adminWorldId());
      const live = await liveWorld(gameRepository(), worlds, chosen);
      // El mundo compacto de /mar (T50): el mapa compartido a escala, sin tocarlo.
      const world = marWorld(live.config);
      // three.js, el mar y el barco llegan aparte: la página pinta su pantalla de carga antes.
      const [{ Mar3D }, shipList] = await Promise.all([
        import('./engine/mar3d'),
        loadShipManifest(),
      ]);
      // El barco del 2D: el elegido en «Barco» (o ?estilo=), si no el del mundo.
      const want = requestedShipStyle(window.location.search, window.localStorage);
      const entry =
        shipList.find((b) => b.id === want) ??
        shipList.find((b) => b.id === live.theme.ship.style) ??
        shipList.find((b) => b.id === 'arcilla') ??
        shipList[0];
      const shipModel = entry ? await loadShipModel(entry).catch(() => null) : null;
      if (cancelled) return;
      worldRef.current = world;
      liveRef.current = live;
      worldIdRef.current = live.id;
      setWorldName(live.theme.name);
      dolphinRef.current = findDolphin(world.objects);
      const spec = circuitFromWorld(world, CIRCUIT_ID);
      raceRef.current = spec ? { race: new CircuitRace(spec), spec } : null;

      const mspec = rescueMissionOf(world);
      const mission = mspec ? new RescueMission(world, mspec) : null;
      if (mission && mspec) {
        const savedMission = await loadMission(progressApi(), mspec.missionId).catch(() => null);
        mission.restore(savedMission);
      }
      if (cancelled) return;
      missionRef.current = mission;
      phaseRef.current = mission?.phase ?? null;

      engine = new Mar3D({
        canvas,
        overlay,
        world,
        mood: startMood,
        sea: live.theme.sea,
        pins: pinsOf(world, mission?.phase ?? null),
        runtime: {
          ticketAvailable,
          minigames: MINIGAME_REGISTRY,
          sessionId,
          seasonId: live.id,
          // Bocadillos con tiempo de lectura (D-22), como en /juego.
          readableDialogue: true,
          seed: (Date.now() % 2147483646) + 1,
        },
        onWorldEvent: (e) => handlers.current.onWorldEvent(e),
        onStep: (s, dt) => handlers.current.onStep(s, dt),
        onStats: (s) => handlers.current.onStats(s),
        onPin: (id) => handlers.current.onPin(id),
        onVoyageEnd: (id, how) => handlers.current.onVoyageEnd(id, how),
        onFirstMove: () => {
          setHelp(false);
          writePref(HELP_KEY, 'visto');
        },
      });
      engineRef.current = engine;
      if (shipModel) engine.setShipModel(shipModel);
      setShips(shipList);
      setShipId(shipModel?.id ?? null);
      const near = new URLSearchParams(window.location.search).get('cerca');
      if (near) engine.startNear(near);
      setPhase(mission?.phase ?? null);
      setStatus('ready');
    })().catch((err: unknown) => {
      console.error('[boia] el mar 3D no pudo arrancar', err);
      if (!cancelled) setStatus('error');
    });

    return () => {
      cancelled = true;
      engine?.destroy();
      engineRef.current = null;
    };
  }, [sessionId]);

  // Pines: la Fiestera deja de tener rótulo cuando sube a bordo.
  useEffect(() => {
    const g = engineRef.current;
    const w = worldRef.current;
    if (g && w) g.setPins(pinsOf(w, phase));
  }, [phase]);

  // El bocadillo sigue a quien habla.
  useEffect(() => {
    const g = engineRef.current;
    const el = bubbleRef.current;
    if (!g || !el) return;
    if (dialogue) g.anchor(el, dialogue.objectId, 1.4);
    return () => g.release(el);
  }, [dialogue]);

  // Navegar en este mundo cuenta (logro «Entre dos mundos»), con su aviso,
  // como al arrancar /juego (T37: antes sólo se apuntaba, sin aviso).
  useEffect(() => {
    if (status !== 'ready') return;
    pushAll(
      recordSignal(gameRepository(), { trigger: 'visit_world', worldId: worldIdRef.current }),
    );
  }, [status, pushAll]);

  // Tiempo a bordo (logros de tiempo jugado), sólo con la pestaña a la vista.
  useEffect(() => {
    if (status !== 'ready') return;
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      pushAll(
        recordSignal(gameRepository(), { trigger: 'time_played', seconds: TIME_PLAYED_TICK_S }),
      );
    }, TIME_PLAYED_TICK_S * 1000);
    return () => window.clearInterval(t);
  }, [status, pushAll]);

  // La ficha tapa la parte de abajo en el móvil: la cámara sube el barco y
  // el botón «Entradas» se pone encima de ella (nunca queda tapado).
  useEffect(() => {
    const g = engineRef.current;
    if (!g) return;
    const el = document.querySelector<HTMLElement>('.mar-sheet, .mar .juego-panel');
    const measure = () => {
      const narrow = window.innerWidth < 760;
      g.setBottomInset(el && narrow ? el.offsetHeight + 10 : 0);
      setSheetLift(el ? el.offsetHeight : 0);
    };
    measure();
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sheet, minigameOffer, status]);

  // Encima del mar hay un diálogo modal o un minijuego: sin control (y sin pintar).
  useEffect(() => {
    const g = engineRef.current;
    if (!g) return;
    g.inputEnabled = !checkoutFor && !minigameOpen && !logros;
    g.paused = minigameOpen;
  }, [checkoutFor, minigameOpen, logros, status]);

  /** Abre el panel de logros; como cualquier panel, anula la vuelta en curso (REQ-AVE-032). */
  const openLogros = () => {
    const r = raceRef.current;
    if (r?.race.active) raceEvents([r.race.invalidate('panel')!].filter(Boolean));
    setMenu(false);
    setLogros(true);
  };

  useEffect(() => {
    // La capa del minijuego se monta en su propio nodo: se observa si tiene hijos.
    const host = document.querySelector('[data-testid="minijuego-capa"]');
    if (!host) return;
    const mo = new MutationObserver(() => setMinigameOpen(host.childElementCount > 0));
    mo.observe(host, { childList: true });
    return () => mo.disconnect();
  }, [status]);

  const chooseMood = (m: MoodId) => {
    setMood(m);
    writePref(MOOD_KEY, m);
    engineRef.current?.setMood(m);
  };

  const chooseShip = (entry: ShipModelEntry) => {
    setShipId(entry.id);
    writePref(SHIP_STYLE_STORAGE_KEY, entry.id);
    loadShipModel(entry)
      .then((m) => engineRef.current?.setShipModel(m))
      .catch((err: unknown) => console.warn('[boia] no se pudo cargar el barco', err));
  };

  const courseTo = (placeId: string) => {
    const g = engineRef.current;
    if (!g) return;
    g.setCourse({ placeId });
    if (g.zoomLevel >= 0.5) g.backToBoat();
    setSheet(null);
  };

  /** Ir en nave a un lugar (experimento): despega, vuela y se posa en su orilla. */
  const flyTo = (placeId: string) => {
    const g = engineRef.current;
    if (!g) return;
    // Sin animaciones (o si no despega), navega como siempre.
    if (prefersReducedMotion() || !g.startFlight(placeId)) {
      courseTo(placeId);
      return;
    }
    navigator.vibrate?.(20);
    setSheet(null);
  };

  const steerToEvent = (eventId: string) => {
    const w = worldRef.current;
    const o = w?.objects.find((x) => eventOfPlace(x) === eventId);
    if (o) courseTo(o.identity.id);
  };

  const world = worldRef.current;
  // Los rótulos también van al minimapa (la isla del evento, destacada).
  const pins = useMemo(() => (world ? pinsOf(world, phase) : []), [world, phase]);
  const sheetObject = useMemo(() => {
    if (!sheet || sheet.kind === 'discount' || !world) return undefined;
    return world.objects.find((o) => o.identity.id === sheet.placeId);
  }, [sheet, world]);

  const engine = engineRef.current;
  const ship = engine?.ship;
  // Por el camino más corto: el planeta da la vuelta (D-22).
  const distance =
    sheet && sheet.kind === 'preview' && sheetObject && ship && engine
      ? Math.round(
          engine.runtime.distance(ship.x, ship.y, sheetObject.position.x, sheetObject.position.y) *
            0.25,
        )
      : null;

  const courseName = (c: CourseInfo) =>
    c.placeId
      ? (world?.objects.find((o) => o.identity.id === c.placeId)?.identity.name ?? 'Destino')
      : 'Punto marcado';

  const aboard = phase === 'aboard' || phase === 'boarding';
  const destinationId = missionRef.current?.destination ?? null;
  const destinationName = destinationId
    ? world?.objects.find((o) => o.identity.id === destinationId)?.identity.name
    : null;
  const turboReady = (stats?.turboReady ?? 1) >= 1;
  const countdown =
    race?.phase === 'countdown' && race.countdown !== null ? Math.ceil(race.countdown) : null;

  return (
    <main
      className="mar"
      data-status={status}
      data-mood={mood}
      data-flight={stats?.flight ?? undefined}
    >
      <canvas
        ref={canvasRef}
        className="mar-canvas"
        data-testid="mar-canvas"
        aria-label="El mar de BOIA en 3D"
      />
      <div ref={overlayRef} className="mar-overlay" />
      {/* Líneas de velocidad del vuelo de «Entradas» (sólo se ven en crucero). */}
      <div className="mar-speedlines" aria-hidden="true" />

      {status !== 'ready' ? (
        <div className="mar-splash" role="status">
          {status === 'error' ? (
            <>
              <p className="mar-splash__title">Este móvil no puede con el 3D</p>
              <p>Prueba la versión clásica: el mismo mar, en 2D.</p>
              <Link className="mar-btn mar-btn--primary" href="/juego">
                Ir al mar 2D
              </Link>
            </>
          ) : (
            <>
              <div className="mar-splash__boia" aria-hidden="true" />
              <p className="mar-splash__title">Preparando el mar…</p>
            </>
          )}
        </div>
      ) : null}

      {/* Barra de arriba */}
      <header className="mar-top">
        <Link className="mar-round" href="/" aria-label="Volver a BOIA">
          ←
        </Link>
        <button
          type="button"
          className="mar-brand"
          onClick={() => setMenu((m) => !m)}
          aria-expanded={menu}
        >
          <span className="mar-brand__logo">BOIA</span>
          <span className="mar-brand__sub">Mar 3D{worldName ? ` · ${worldName}` : ''}</span>
          <span aria-hidden="true">▾</span>
        </button>
        <div className="mar-balances" data-testid="mar-saldos" aria-label="Saldos">
          <span title="Puntos">★ {balances?.points ?? '–'}</span>
          <span title="Monedas">🪙 {balances?.coins ?? '–'}</span>
        </div>
        {/* Logros (T37): arriba a la derecha, sobre el minimapa; nunca junto a «Entradas». */}
        <button
          type="button"
          className="mar-round mar-logros-btn"
          data-testid="mar-logros"
          data-por-reclamar={readyToClaim}
          aria-label={claimLabel('Logros', readyToClaim)}
          aria-expanded={logros}
          aria-haspopup="dialog"
          title={claimLabel('Logros', readyToClaim)}
          onClick={() => (logros ? setLogros(false) : openLogros())}
        >
          <span aria-hidden="true">🏆</span>
          <ClaimBadge count={readyToClaim} testId="mar-logros-contador" />
        </button>
      </header>

      {menu ? (
        <nav className="mar-menu" aria-label="Menú">
          <p className="mar-menu__label">Momento del día</p>
          <div className="mar-menu__moods">
            {MOOD_IDS.map((m) => (
              <button
                key={m}
                type="button"
                className={`mar-chip${m === mood ? ' is-on' : ''}`}
                onClick={() => chooseMood(m)}
              >
                {m === 'dia' ? '☀️' : m === 'tarde' ? '🌅' : '🌙'} {MOOD_LABEL[m]}
              </button>
            ))}
          </div>
          {ships.length ? (
            <>
              <p className="mar-menu__label">Barco</p>
              <div className="mar-menu__moods" data-testid="mar-barcos">
                {ships.map((b) => {
                  // Los que se ganan con un logro, con candado hasta tenerlos (T37).
                  const lock = shipLocks.find((l) => l.style === b.id && !l.owned);
                  if (lock && b.id !== shipId) {
                    return (
                      <button
                        key={b.id}
                        type="button"
                        className="mar-chip is-locked"
                        data-testid={`mar-barco-${b.id}`}
                        data-bloqueado="si"
                        aria-disabled="true"
                        aria-label={`${b.label}: bloqueado. ${lockedShipText(lock)}`}
                        title={lockedShipText(lock)}
                      >
                        🔒 {b.label}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={`mar-chip${b.id === shipId ? ' is-on' : ''}`}
                      data-testid={`mar-barco-${b.id}`}
                      onClick={() => chooseShip(b)}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
              {shipLocks.some((l) => !l.owned && ships.some((b) => b.id === l.style)) ? (
                <ul className="mar-menu__locks" data-testid="mar-barcos-bloqueados">
                  {shipLocks
                    .filter((l) => !l.owned && ships.some((b) => b.id === l.style))
                    .map((l) => (
                      <li key={l.style}>
                        🔒 <strong>{l.name}</strong>: {lockedShipText(l)}
                      </li>
                    ))}
                </ul>
              ) : null}
            </>
          ) : null}
          <button type="button" className="mar-menu__link" onClick={openLogros}>
            🏆 Logros{readyToClaim > 0 ? ` · ${readyToClaim} por reclamar` : ''}
          </button>
          <Link className="mar-menu__link" href="/#tickets">
            🎟️ Entradas
          </Link>
          <Link className="mar-menu__link" href="/carnet">
            🪪 Mi Carnet
          </Link>
          <Link className="mar-menu__link" href="/juego">
            🗺️ Versión clásica 2D
          </Link>
          <p className="mar-menu__help">
            Arrastra para navegar · Pellizca o usa la rueda para el zoom · Toca el mar o una isla
            para fijar rumbo · Teclado: flechas, +/−, M mapa, T turbo.
          </p>
        </nav>
      ) : null}

      {/* Avisos */}
      <div className="mar-notices" role="status" aria-live="polite">
        {notices.current ? (
          <button
            key={`${notices.current.notice.id}@${notices.current.shownAt}`}
            type="button"
            className={`mar-notice is-${notices.current.notice.kind}`}
            data-testid="mar-aviso"
            data-kind={notices.current.notice.kind}
            onClick={() => {
              // «¡Logro completado! Reclama tu premio»: tocarlo lleva al panel (T37).
              const toClaim = notices.current?.notice.kind === 'achievement';
              notices.dismiss();
              if (toClaim) openLogros();
            }}
          >
            <strong>{notices.current.notice.title}</strong>
            {notices.current.notice.body ? <span>{notices.current.notice.body}</span> : null}
          </button>
        ) : null}
        {notices.current ? (
          <button
            type="button"
            className="mar-x mar-notices__x"
            data-testid="mar-aviso-cerrar"
            aria-label="Cerrar aviso"
            onClick={notices.dismiss}
          >
            ×
          </button>
        ) : null}
      </div>

      {/* Rumbo, circuito y misión */}
      <div className="mar-chips">
        {race ? (
          <div className="mar-chip mar-chip--race" data-testid="mar-crono">
            ⏱ {race.ms !== null ? formatRaceTime(race.ms) : 'Preparados…'}
            {race.phase === 'racing' ? <span className="mar-chip__sub">CP {race.next}</span> : null}
          </div>
        ) : null}
        {stats?.course ? (
          <div className="mar-chip mar-chip--course" data-testid="mar-rumbo-activo">
            🧭 {courseName(stats.course)} · {stats.course.meters} m
            <button
              type="button"
              className="mar-chip__x"
              aria-label="Quitar rumbo"
              onClick={() => engineRef.current?.setCourse(null)}
            >
              ×
            </button>
          </div>
        ) : null}
        {aboard && destinationId && !stats?.course ? (
          <button
            type="button"
            className="mar-chip mar-chip--mission"
            onClick={() => courseTo(destinationId)}
          >
            🎈 Lleva a la Fiestera a {destinationName ?? 'su isla'} · rumbo
          </button>
        ) : null}
      </div>

      {countdown !== null ? (
        <div className="mar-countdown" aria-live="assertive" key={countdown}>
          {countdown > 0 ? countdown : '¡Ya!'}
        </div>
      ) : null}

      {/* Controles de la derecha */}
      <div className="mar-rail" aria-label="Zoom">
        <button
          type="button"
          className="mar-round"
          aria-label="Acercar"
          onClick={() => engineRef.current?.zoomBy(-0.14)}
        >
          +
        </button>
        <div className="mar-zoom" aria-hidden="true">
          <span style={{ height: `${Math.round((1 - (stats?.zoom ?? 0)) * 100)}%` }} />
        </div>
        <button
          type="button"
          className="mar-round"
          aria-label="Alejar"
          onClick={() => engineRef.current?.zoomBy(0.14)}
        >
          −
        </button>
      </div>

      {/* Minimapa: el planeta girando; tocarlo abre (o cierra) el mapa grande (T34). */}
      {status === 'ready' ? (
        <div className={`mar-globe${stats?.mapMode ? ' is-map' : ''}`}>
          <MarMinimap
            engineRef={engineRef}
            pins={pins}
            mapMode={!!stats?.mapMode}
            onToggle={() => engineRef.current?.toggleMap()}
          />
        </div>
      ) : null}

      <button
        type="button"
        className={`mar-turbo${turboReady ? ' is-ready' : ''}${(stats?.turbo ?? 0) > 0 ? ' is-on' : ''}`}
        style={{ '--p': stats?.turboReady ?? 1 } as CSSProperties}
        aria-label="Turbo"
        data-testid="mar-turbo"
        onClick={() => {
          if (engineRef.current?.turbo()) navigator.vibrate?.(20);
        }}
      >
        <span>⚡</span>
        <small>{turboReady ? 'Turbo' : '…'}</small>
      </button>

      <div className="mar-speed" aria-hidden="true">
        <strong>{stats?.knots ?? 0}</strong>
        <small>nudos</small>
      </div>

      {stats?.mapMode && !sheet ? (
        <div className="mar-maphint">
          <p>Toca una isla para ver qué hay · arrastra para mover el mapa</p>
          <button
            type="button"
            className="mar-maphint__close"
            data-testid="mar-mapa-cerrar"
            onClick={() => engineRef.current?.backToBoat()}
          >
            ✕ Cerrar
          </button>
        </div>
      ) : null}

      {help && status === 'ready' ? (
        <div className="mar-help" aria-live="polite">
          <span className="mar-help__hand" aria-hidden="true">
            👆
          </span>
          <p>
            <strong>Toca y arrastra</strong> para navegar
            <br />
            Pellizca para el zoom · toca una isla para ir
          </p>
        </div>
      ) : null}

      {dialogue ? (
        <div ref={bubbleRef} className="mar-bubble" data-testid="mar-bocadillo">
          <button
            type="button"
            className="mar-bubble__text"
            onClick={() => {
              engineRef.current?.runtime.advanceDialogue();
              window.setTimeout(syncDialogue, 0);
            }}
          >
            <span>{dialogue.text}</span>
            {!dialogue.last ? <small>Toca para seguir ▸</small> : null}
          </button>
          <button
            type="button"
            className="mar-x mar-bubble__x"
            data-testid="mar-bocadillo-cerrar"
            aria-label="Cerrar diálogo"
            onClick={() => {
              engineRef.current?.runtime.skipDialogue();
              window.setTimeout(syncDialogue, 0);
            }}
          >
            ×
          </button>
        </div>
      ) : null}

      {status === 'ready' ? (
        <div
          className={`mar-tickets${trip ? ' is-sailing' : ''}`}
          style={{ '--lift': `${sheetLift}px` } as CSSProperties}
        >
          {trip ? (
            <button
              type="button"
              className="mar-tickets__skip"
              data-testid="mar-entradas-saltar"
              onClick={() => openCheckout(trip.eventId)}
            >
              Saltar ›
            </button>
          ) : null}
          <button
            type="button"
            className="mar-tickets__btn"
            data-testid="mar-entradas"
            aria-label={
              trip ? `Entradas: rumbo a ${trip.placeName}. Toca para comprar ya` : 'Entradas'
            }
            onClick={onTickets}
          >
            <span aria-hidden="true">🎟️</span>
            <strong>Entradas</strong>
            {trip ? (
              <small>
                {stats?.flight ? 'Volando' : 'Rumbo'} a {trip.placeName}…
              </small>
            ) : null}
          </button>
        </div>
      ) : null}

      {sheet ? (
        <Sheet
          state={sheet}
          object={sheetObject}
          distance={distance}
          onClose={() => setSheet(null)}
          onCourse={courseTo}
          onFly={flyTo}
          onBuy={(id) => setCheckoutFor(id)}
          onSteerEvent={steerToEvent}
        />
      ) : null}

      {status === 'ready' && liveRef.current && settings ? (
        <div className="mar-minigame">
          <MinigameLayer
            offer={sheet || checkoutFor ? null : minigameOffer}
            onDismiss={() => setMinigameOffer(null)}
            world={liveRef.current}
            settings={settings}
            sink={progressApi}
          />
        </div>
      ) : null}

      {logros ? <MarLogros onClose={() => setLogros(false)} /> : null}

      {checkoutFor ? (
        <SandboxCheckout
          eventId={checkoutFor}
          onClose={() => setCheckoutFor(null)}
          onConfirmed={(o, s) => {
            for (const n of purchaseNotices(o, s.event.name)) push(n);
          }}
          carnet={{ href: '/carnet' }}
        />
      ) : null}
    </main>
  );
}
