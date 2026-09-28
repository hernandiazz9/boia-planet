import type { IntroAssets } from './assets';
import { pickFraming, type Easing, type IntroConfig, type Span } from './config';

/**
 * Línea de tiempo de la entrada: función pura de (configuración, geometría,
 * vista, tiempo) → fotograma. No sabe de Pixi ni del DOM; la escena sólo
 * pinta lo que dice el fotograma. Así el último fotograma se puede comparar
 * con el encuadre de la landing (REQ-ENT-014) y la variante reducida se
 * puede probar sin navegador (REQ-ENT-010).
 *
 * Cuatro tiempos (§4.4, REQ-ENT-006): planeta con flotación y nubes que
 * giran; acercamiento con aceleración y frenada; revelación por capas (el
 * mar plano sustituye al globo y aparecen islas, rocas, boia y barco);
 * llegada con la cámara quieta y la landing entrando encima.
 */

export type IntroMode = 'intro' | 'reduced' | 'direct';

export interface Viewport {
  width: number;
  height: number;
}

/** El punto de escena (x, y) se pinta en el punto de pantalla (ax, ay), con `zoom` px por px de escena. */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
  ax: number;
  ay: number;
}

export interface IntroFrame {
  /** ms desde el inicio de la secuencia, recortado a su duración. */
  t: number;
  camera: Camera;
  /** Opacidades 0..1 de cada capa. */
  space: number;
  globe: number;
  band: number;
  clouds: number;
  /** Giro de las nubes, radianes. */
  cloudTurn: number;
  planetIsland: number;
  water: number;
  objects: Readonly<Record<string, number>>;
  ship: number;
  /** Título «BOIA.PLANET» (HTML). */
  title: number;
  /** Contenido de la landing (HTML). */
  content: number;
  /** La secuencia terminó: la cámara está en el encuadre de la landing. */
  done: boolean;
}

/** Lo que la línea de tiempo necesita de los recursos. */
export interface SceneGeometry {
  artScale: IntroAssets['artScale'];
  planet: {
    globe: { scale: number };
    globeCentre: IntroAssets['planet']['globeCentre'];
    globeRadius: number;
  };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

export const EASING_FNS: Record<Easing, (u: number) => number> = {
  linear: (u) => u,
  easeInOutSine: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
  easeInOutCubic: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
};

/** 0 antes del tramo, 1 después, rampa suave (smoothstep) dentro. */
export function ramp(v: number, [a, b]: Span): number {
  if (b <= a) return v >= b ? 1 : 0;
  const u = clamp01((v - a) / (b - a));
  return u * u * (3 - 2 * u);
}

/** Encuadre inicial: el globo entero, centrado. */
export function planetCamera(cfg: IntroConfig, geo: SceneGeometry, vp: Viewport): Camera {
  const short = Math.min(vp.width, vp.height);
  return {
    x: geo.planet.globeCentre[0],
    y: geo.planet.globeCentre[1],
    zoom: (cfg.planet.fit * short) / (2 * geo.planet.globeRadius),
    ax: cfg.planet.anchor[0] * vp.width,
    ay: cfg.planet.anchor[1] * vp.height,
  };
}

/** Encuadre de la landing: la isla de evento en el ancla del dispositivo. */
export function landingCamera(cfg: IntroConfig, geo: SceneGeometry, vp: Viewport): Camera {
  const f = pickFraming(cfg, vp.width);
  return {
    x: 0,
    y: 0,
    zoom: f.zoom * geo.artScale,
    ax: Math.round(f.anchor[0] * vp.width),
    ay: Math.round(f.anchor[1] * vp.height),
  };
}

function finalFrame(cfg: IntroConfig, geo: SceneGeometry, vp: Viewport, t: number): IntroFrame {
  const objects: Record<string, number> = {};
  for (const o of cfg.objects) objects[o.id] = 1;
  return {
    t,
    camera: landingCamera(cfg, geo, vp),
    space: 0,
    globe: 0,
    band: 0,
    clouds: 0,
    cloudTurn: 0,
    planetIsland: 0,
    water: 1,
    objects,
    ship: 1,
    title: 0,
    content: 1,
    done: true,
  };
}

const FLOAT_PERIOD_MS = 2400;
const APPEAR_SPAN = 0.12;

export function frameAt(
  cfg: IntroConfig,
  geo: SceneGeometry,
  vp: Viewport,
  tMs: number,
  mode: IntroMode,
): IntroFrame {
  if (mode === 'direct') return finalFrame(cfg, geo, vp, 0);

  if (mode === 'reduced') {
    // Escena quieta en el encuadre final y un fundido breve del contenido.
    const t = Math.max(0, Math.min(tMs, cfg.reduced.fadeMs));
    const f = finalFrame(cfg, geo, vp, t);
    const fade = cfg.reduced.fadeMs > 0 ? t / cfg.reduced.fadeMs : 1;
    return { ...f, content: fade, done: t >= cfg.reduced.fadeMs };
  }

  const t = Math.max(0, Math.min(tMs, cfg.durationMs));
  if (t >= cfg.durationMs) return finalFrame(cfg, geo, vp, t);
  const tf = t / cfg.durationMs;
  const ph = cfg.phases;
  const ease = EASING_FNS[cfg.easing];

  const from = planetCamera(cfg, geo, vp);
  const to = landingCamera(cfg, geo, vp);
  const u = ease(clamp01((tf - ph.approach[0]) / (ph.approach[1] - ph.approach[0] || 1)));
  const zoom = from.zoom * (to.zoom / from.zoom) ** u;
  // Flotación del planeta: se apaga durante el acercamiento para que la
  // cámara llegue exacta al encuadre de la landing.
  const float = Math.sin((2 * Math.PI * t) / FLOAT_PERIOD_MS) * cfg.planet.floatPx * (1 - u);
  const camera: Camera = {
    x: lerp(from.x, to.x, u),
    y: lerp(from.y, to.y, u) + float / zoom,
    zoom,
    ax: lerp(from.ax, to.ax, u),
    ay: lerp(from.ay, to.ay, u),
  };

  const water = ease(ramp(tf, ph.reveal));
  const planet = 1 - water;
  const magnification = zoom * geo.planet.globe.scale;
  const objects: Record<string, number> = {};
  for (const o of cfg.objects) {
    objects[o.id] =
      o.asset === 'isla-evento'
        ? water
        : ramp(tf, [o.appearAt, Math.min(1, o.appearAt + APPEAR_SPAN)]);
  }

  return {
    t,
    camera,
    space: planet,
    globe: planet,
    band: planet * ramp(magnification, cfg.planet.bandFromMagnification),
    clouds: planet * (1 - ramp(tf, [ph.approach[0] + 0.1, ph.reveal[0]])),
    cloudTurn: ((cfg.planet.cloudTurnDeg * Math.PI) / 180) * tf,
    planetIsland: planet,
    water,
    objects,
    ship: ramp(tf, [cfg.ship.appearAt, Math.min(1, cfg.ship.appearAt + APPEAR_SPAN)]),
    title: 1 - ramp(tf, ph.titleOut),
    content: ramp(tf, ph.arrival),
    done: false,
  };
}

/** Dos cámaras son iguales (a medio píxel de pantalla). */
export function sameCamera(a: Camera, b: Camera): boolean {
  return (
    Math.abs(a.zoom - b.zoom) < 1e-6 &&
    Math.abs(a.ax - b.ax) < 0.5 &&
    Math.abs(a.ay - b.ay) < 0.5 &&
    Math.abs((a.x - b.x) * a.zoom) < 0.5 &&
    Math.abs((a.y - b.y) * a.zoom) < 0.5
  );
}
