'use client';

import {
  IntroController,
  sameCamera,
  type BootEntry,
  type Camera,
  type IntroMode,
  type IntroOutcome,
} from '@boia/engine/intro';
import type { IntroScene } from '@boia/engine/intro/scene';
import { useEffect, useRef, useState } from 'react';
import type { IntroDiagnostics } from '../../../lib/intro/bridge';
import type { IntroData } from '../../../lib/intro/load';

/**
 * Escena del hero y entrada cinemática (v14 §4.4, §47-B). Lo que pinta el
 * servidor funciona solo: mar en CSS con la isla y el barco en `<img>`
 * (ilustración ligera, REQ-ENT-038). Al hidratar carga bajo demanda la
 * escena Pixi y la pone encima con el mismo encuadre. En la primera visita
 * la escena reproduce planeta → mar → landing; el script de arranque ya
 * ocultó la landing antes del primer pintado (ver `bootScript`).
 */
export function IntroStage({ data, skipLabel }: { data: IntroData | null; skipLabel: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const controllerRef = useRef<IntroController<IntroScene> | null>(null);
  const [overlay, setOverlay] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    const html = document.documentElement;
    const entry: BootEntry | undefined = window.__boiaEntry;
    if (!host || !data) {
      entry?.reveal('none');
      setOverlay(false);
      return;
    }
    const { config, assets } = data;

    // La cinemática sólo se reproduce en la carga en la que el script de
    // arranque la pidió y aún no se resolvió (saltada antes de hidratar,
    // plazo agotado o ya reclamada por otro montaje).
    let mode: IntroMode = entry?.mode ?? 'direct';
    if (mode === 'intro' && (!entry || entry.claimed || entry.landed)) mode = 'direct';
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
      playedMs: null,
      landedAtMs: null,
      longestFrameMs: 0,
      slowFrames: 0,
      history: [],
    };
    window.__boiaIntro = diag;

    const t0 = entry?.t0 ?? performance.now();
    const mountedAt = performance.now();
    const reduced = mode === 'reduced';
    let scene: IntroScene | null = null;
    let raf = 0;
    let visible = true;
    let lastCamera: Camera | null = null;
    let lastSize = '';
    let lastFrameAt = 0;

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
      diag.playedMs = c.playedMs;
      host.dataset.phase = c.phase;
      // La escena llega con el canvas ya borrado (color del espacio): se
      // muestra enseguida, así el navegador lo compone antes del primer
      // fotograma de la secuencia y no en mitad de ella.
      if (c.sceneStatus === 'ready') host.dataset.ready = '';
      else delete host.dataset.ready;
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
      geometry: assets,
      now: () => performance.now(),
      elapsedSinceBoot: mountedAt - t0,
      async createScene() {
        const { createIntroScene } = await import('@boia/engine/intro/scene');
        const canvas = document.createElement('canvas');
        canvas.className = 'hero__canvas';
        host.appendChild(canvas);
        const vp = viewport();
        try {
          scene = await createIntroScene({
            canvas,
            assets,
            config,
            width: vp.width,
            height: vp.height,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
          });
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
        lastCamera = null;
      }
      const clock = reduced ? 0 : (performance.now() - mountedAt) / 1000;
      const before = performance.now();
      const wasPlaying = controller.phase === 'playing';
      const f = controller.render(vp, clock);
      if (wasPlaying) {
        const dt = lastFrameAt ? before - lastFrameAt : 0;
        diag.longestFrameMs = Math.max(diag.longestFrameMs, dt);
        if (dt > 50) diag.slowFrames++;
        lastFrameAt = before;
      }
      if (f) {
        diag.framesRendered++;
        if (lastCamera && size === lastSize && !sameCamera(lastCamera, f.camera))
          diag.cameraMoves++;
        lastCamera = f.camera;
        if (titleRef.current) titleRef.current.style.opacity = String(f.title);
        if (controller.phase === 'playing' && f.content > 0)
          html.setAttribute('data-intro', 'arrive');
      }
      lastSize = size;
      const animating = controller.phase === 'waiting' || controller.phase === 'playing';
      // Movimiento reducido: una escena quieta; no hace falta repintar.
      const idle = !reduced && controller.sceneStatus === 'ready' && visible;
      if (animating || idle) raf = requestAnimationFrame(loop);
    };
    function kick() {
      if (!raf && !document.hidden) raf = requestAnimationFrame(loop);
    }

    // Todo lo que interrumpe la animación la termina en su estado final.
    const interrupt = () => {
      controller.interrupt();
      kick();
    };
    const onVisibility = () => (document.hidden ? interrupt() : kick());
    // Rotar o cambiar el ancho termina la animación; un cambio sólo de alto
    // (barras del navegador móvil al cargar) no la corta.
    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth !== lastWidth && controller.phase === 'playing') controller.interrupt();
      lastWidth = window.innerWidth;
      kick();
    };
    const onOrientation = () => {
      if (controller.phase === 'playing') controller.interrupt();
      kick();
    };
    const onPageShow = (e: PageTransitionEvent) => e.persisted && interrupt();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') controller.skip();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onOrientation);
    window.addEventListener('popstate', interrupt);
    window.addEventListener('hashchange', interrupt);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('keydown', onKey);
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
      window.removeEventListener('popstate', interrupt);
      window.removeEventListener('hashchange', interrupt);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('keydown', onKey);
      io?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      const unfinished = controller.phase === 'waiting' || controller.phase === 'playing';
      controller.destroy();
      sync();
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
  }, [data]);

  const still = data && (
    <div className="hero__still">
      {/* eslint-disable-next-line @next/next/no-img-element -- arte servido desde art/ (D-16) */}
      <img
        className="hero__still-island"
        src={data.assets.sprites['isla-evento'].url}
        alt=""
        width={data.assets.sprites['isla-evento'].width}
        height={data.assets.sprites['isla-evento'].height}
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

  return (
    <>
      <div className="hero__scene" ref={hostRef} aria-hidden="true">
        {still}
      </div>
      {data && overlay && (
        <div className="intro-overlay">
          <p className="intro-overlay__title" ref={titleRef} aria-hidden="true">
            {data.config.copy.title}
          </p>
          <button
            type="button"
            className="intro-overlay__skip"
            data-intro-skip=""
            onClick={() => controllerRef.current?.skip()}
          >
            {skipLabel}
          </button>
        </div>
      )}
    </>
  );
}
