'use client';

import {
  IntroController,
  viewMoved,
  type BootEntry,
  type IntroFrame,
  type IntroMode,
  type IntroOutcome,
} from '@boia/engine/intro';
import type { IntroScene } from '@boia/engine/intro/scene';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { IntroDiagnostics } from '../../../lib/intro/bridge';
import type { IntroData } from '../../../lib/intro/load';
import { offerWorld } from '../../../lib/world-handoff';

/** Vistas de k guardadas en el diagnóstico durante el aterrizaje (tope). */
const MAX_K_SAMPLES = 600;

/**
 * Escena del hero y entrada «mini-mundo» (D-19, REQ-ENT-001…020). Lo que
 * pinta el servidor funciona solo: mar en CSS con la isla y el barco en
 * `<img>` (ilustración ligera, REQ-ENT-038), y los textos de la entrada. Al
 * hidratar carga bajo demanda la escena Pixi y la pone encima. En la primera
 * visita: carga (sólo si hace falta) → el mini-mundo aparece y gira → «BOIA»
 * y el botón → al pulsar, aterrizaje continuo en el mar y la landing encima.
 * El script de arranque ya ocultó la landing antes del primer pintado (ver
 * `bootScript`).
 */
export function IntroStage({ data, skipLabel }: { data: IntroData | null; skipLabel: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const controllerRef = useRef<IntroController<IntroScene> | null>(null);
  const [overlay, setOverlay] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const host = hostRef.current;
    const html = document.documentElement;
    const entry: BootEntry | undefined = window.__boiaEntry;
    if (!host || !data) {
      entry?.reveal('none');
      setOverlay(false);
      return;
    }
    const { config, geometry } = data;

    // La entrada sólo se reproduce en la carga en la que el script de
    // arranque la pidió y aún no se resolvió (saltada antes de hidratar,
    // plazo agotado o ya reclamada por otro montaje).
    let mode: IntroMode = entry?.mode ?? 'direct';
    if (mode !== 'direct' && (!entry || entry.claimed || entry.landed)) mode = 'direct';
    if (entry) {
      entry.claimed = true;
      clearTimeout(entry.timer);
    }

    const diag: IntroDiagnostics = {
      mode,
      phase: 'idle',
      sceneStatus: 'none',
      outcome: null,
      scenesCreated: 0,
      worldsAlive: 0,
      gamesStarted: 0,
      framesRendered: 0,
      cameraMoves: 0,
      k: null,
      landingK: [],
      enteredBy: null,
      appearedMs: null,
      playedMs: null,
      renderer: null,
      sceneReadyMs: null,
      landedAtMs: null,
      longestFrameMs: 0,
      slowFrames: 0,
      history: [],
      explored: false,
    };
    window.__boiaIntro = diag;

    const t0 = entry?.t0 ?? performance.now();
    const mountedAt = performance.now();
    const reduced = mode === 'reduced';
    let scene: IntroScene | null = null;
    let raf = 0;
    let visible = true;
    let lastFrame: IntroFrame | null = null;
    let lastSize = '';
    let lastFrameAt = 0;
    let focused = false;

    const viewport = () => ({
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
    });

    const sync = () => {
      const c = controllerRef.current;
      if (!c) return;
      if (diag.phase !== c.phase) diag.history.push(c.phase);
      diag.phase = c.phase;
      diag.sceneStatus = c.sceneStatus;
      diag.outcome = c.outcome;
      diag.scenesCreated = c.scenesCreated;
      diag.worldsAlive = c.worldsAlive;
      diag.gamesStarted = c.gamesStarted;
      diag.enteredBy = c.enteredBy;
      diag.appearedMs = c.appearedMs;
      diag.playedMs = c.playedMs;
      host.dataset.phase = c.phase;
      // Acto en curso, para el CSS de la capa de la entrada (carga, título, botón).
      if (c.phase === 'destroyed' || c.phase === 'landed') delete html.dataset.introAct;
      else html.dataset.introAct = c.phase;
      // La escena llega con el canvas ya borrado (color del espacio): se
      // muestra enseguida, así el navegador lo compone antes del primer
      // fotograma y no en mitad de la aparición.
      if (c.sceneStatus === 'ready') host.dataset.ready = '';
      else delete host.dataset.ready;
      // Acto 2: el botón recibe el foco (Enter lo activa).
      if (c.phase === 'paused' && !focused) {
        focused = true;
        enterRef.current?.focus({ preventScroll: true });
      }
      kick();
    };

    const onLanded = (outcome: IntroOutcome) => {
      diag.landedAtMs = performance.now() - t0;
      setOverlay(false);
      if (entry) entry.reveal(outcome);
      else html.removeAttribute('data-intro');
    };

    const controller = new IntroController<IntroScene>({
      mode,
      config,
      geometry,
      now: () => performance.now(),
      elapsedSinceBoot: mountedAt - t0,
      async createScene() {
        const [{ createIntroScene }, { demoWorld }] = await Promise.all([
          import('@boia/engine/intro/scene'),
          import('../../juego/demo-world'),
        ]);
        const canvas = document.createElement('canvas');
        canvas.className = 'hero__canvas';
        host.appendChild(canvas);
        const vp = viewport();
        try {
          scene = await createIntroScene({
            canvas,
            world: demoWorld,
            config,
            geometry,
            assets: data.assets,
            width: vp.width,
            height: vp.height,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
          });
          diag.renderer = scene.renderer;
          diag.sceneReadyMs = performance.now() - t0;
          return scene;
        } catch (err) {
          console.warn('[boia] la escena de entrada no arrancó; se queda la landing ligera', err);
          canvas.remove();
          throw err;
        }
      },
      setTimer(fn, ms) {
        const id = window.setTimeout(fn, ms);
        return () => window.clearTimeout(id);
      },
      onLanded,
      onChange: sync,
      // EXPLORAR (REQ-ENT-012): la escena no se destruye; cede canvas, WebGL y
      // mar al juego, que los recoge en /juego tras una navegación sin recarga.
      startGame() {
        const surface = scene?.release();
        if (surface) offerWorld(surface);
      },
    });
    controllerRef.current = controller;

    // Bucle de pintado: sólo mientras haya algo que mover y se vea.
    const loop = () => {
      raf = 0;
      if (document.hidden || controller.phase === 'destroyed') return;
      const vp = viewport();
      const size = `${vp.width}x${vp.height}`;
      if (size !== lastSize) {
        scene?.resize(vp.width, vp.height);
        lastFrame = null;
      }
      const clock = reduced ? 0 : (performance.now() - mountedAt) / 1000;
      const before = performance.now();
      const phase = controller.phase;
      const f = controller.render(vp, clock);
      if (phase === 'appearing' || phase === 'landing') {
        const dt = lastFrameAt ? before - lastFrameAt : 0;
        diag.longestFrameMs = Math.max(diag.longestFrameMs, dt);
        if (dt > 50) diag.slowFrames++;
        lastFrameAt = before;
      } else lastFrameAt = 0;
      if (f) {
        diag.framesRendered++;
        diag.k = f.planet > 0 ? f.sphere.k : 0;
        if (phase === 'landing' && diag.landingK.length < MAX_K_SAMPLES) diag.landingK.push(diag.k);
        if (lastFrame && size === lastSize && viewMoved(lastFrame, f)) diag.cameraMoves++;
        lastFrame = f;
        if (titleRef.current) titleRef.current.style.opacity = String(f.title);
        if (enterRef.current) enterRef.current.style.opacity = String(f.button);
        if (controller.phase === 'landing' && f.content > 0)
          html.setAttribute('data-intro', 'arrive');
      }
      lastSize = size;
      const next = controller.phase;
      // Movimiento reducido: la pausa es una escena quieta; sólo se pinta
      // mientras entran título y botón. Tras llegar, el mar sigue vivo.
      const moving =
        next === 'waiting' ||
        next === 'appearing' ||
        next === 'landing' ||
        (next === 'paused' && (!reduced || (f?.title ?? 0) < 1));
      const idle = !reduced && controller.sceneStatus === 'ready' && visible;
      if (moving || idle) raf = requestAnimationFrame(loop);
    };
    function kick() {
      if (!raf && !document.hidden) raf = requestAnimationFrame(loop);
    }

    // Lo que interrumpe una animación la termina en su estado final.
    const interrupt = () => {
      controller.interrupt();
      kick();
    };
    const onVisibility = () => (document.hidden ? interrupt() : kick());
    // Rotar o cambiar el ancho termina la animación; un cambio sólo de alto
    // (barras del navegador móvil al cargar) no la corta.
    let lastWidth = window.innerWidth;
    const animating = () => controller.phase === 'appearing' || controller.phase === 'landing';
    const onResize = () => {
      if (window.innerWidth !== lastWidth && animating()) controller.interrupt();
      lastWidth = window.innerWidth;
      kick();
    };
    const onOrientation = () => {
      if (animating()) controller.interrupt();
      kick();
    };
    const onPageShow = (e: PageTransitionEvent) => e.persisted && interrupt();
    // Atrás o un cambio de ancla durante la entrada: se sale de ella.
    const onNavigate = () => {
      controller.skip();
      kick();
    };
    const onKey = (e: KeyboardEvent) => {
      controller.touch();
      if (e.key === 'Escape') controller.skip();
    };
    const onPointer = () => controller.touch();
    // EXPLORAR sin recargar: el enlace sigue siendo /juego (sin JS, o con
    // Cmd/Ctrl para otra pestaña, navega normal y el juego arranca en limpio).
    const onExplore = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const link = e.target instanceof Element ? e.target.closest('a.cta-explore') : null;
      if (!link) return;
      e.preventDefault();
      diag.explored = controller.explore();
      router.push(link.getAttribute('href') ?? '/juego');
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onOrientation);
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('hashchange', onNavigate);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('click', onExplore);
    const io =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(([e]) => {
            visible = !!e?.isIntersecting;
            if (visible) kick();
          })
        : null;
    io?.observe(host);

    controller.start();
    sync();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientation);
      window.removeEventListener('popstate', onNavigate);
      window.removeEventListener('hashchange', onNavigate);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('click', onExplore);
      io?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      const unfinished = controller.phase !== 'landed' && controller.phase !== 'destroyed';
      controller.destroy();
      sync();
      delete html.dataset.introAct;
      controllerRef.current = null;
      if (entry) {
        // Un remontaje inmediato (StrictMode en desarrollo) vuelve a reclamar la
        // entrada; si no llega, la landing no se queda oculta en otra ruta.
        entry.claimed = false;
        if (unfinished) {
          window.setTimeout(() => {
            if (!entry.claimed) entry.reveal('none');
          }, 0);
        }
      }
    };
  }, [data, router]);

  const still = data && (
    <div className="hero__still">
      {/* eslint-disable-next-line @next/next/no-img-element -- arte servido desde art/ (D-16) */}
      <img
        className="hero__still-island"
        src={data.assets.island.url}
        alt=""
        width={data.assets.island.width}
        height={data.assets.island.height}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- arte servido desde art/ (D-16) */}
      <img
        className="hero__still-ship"
        src={data.assets.ship.url}
        alt=""
        width={data.assets.ship.width}
        height={data.assets.ship.height}
      />
    </div>
  );

  const copy = data?.config.copy;
  return (
    <>
      <div className="hero__scene" ref={hostRef} aria-hidden="true">
        {still}
      </div>
      {copy && overlay && (
        <div className="intro-overlay">
          <div className="intro-loading" aria-hidden="true">
            <BoiaDrawing />
            <p className="intro-loading__label">{copy.loading}</p>
          </div>
          <p className="intro-overlay__title" ref={titleRef}>
            {copy.title}
          </p>
          <button
            type="button"
            className="intro-overlay__enter"
            data-intro-enter=""
            ref={enterRef}
            onClick={() => controllerRef.current?.enter('button')}
          >
            {copy.enter}
          </button>
          <div className="intro-overlay__links">
            {/* Tickets sin pasar por el botón ni por la animación (REQ-ENT-002). */}
            <a
              className="intro-overlay__tickets"
              href="#tickets"
              data-intro-skip=""
              data-tickets-open="hero"
              onClick={() => controllerRef.current?.skip()}
            >
              {copy.ticketsOnly}
            </a>
            <button
              type="button"
              className="intro-overlay__skip"
              data-intro-skip=""
              onClick={() => controllerRef.current?.skip()}
            >
              {skipLabel}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Acto 0: una boia dibujada (muestra, hasta que haya arte o logo de BOIA). */
function BoiaDrawing() {
  return (
    <svg
      className="intro-loading__boia"
      viewBox="0 0 64 80"
      width="64"
      height="80"
      aria-hidden="true"
    >
      <circle cx="32" cy="10" r="4" fill="#ffd166" />
      <rect x="30.5" y="13" width="3" height="12" fill="#c9d4e6" />
      <path d="M16 58 L22 26 H42 L48 58 Z" fill="#f26a1b" />
      <path d="M19.2 42 H44.8 L46.4 50 H17.6 Z" fill="#ffffff" />
      <ellipse cx="32" cy="60" rx="20" ry="5" fill="#b9a6ff" />
      <path
        d="M4 70 Q12 64 20 70 T36 70 T52 70 T68 70"
        fill="none"
        stroke="#1b4a73"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
