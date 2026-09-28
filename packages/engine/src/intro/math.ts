import type { Easing, Span } from './config';

/** Utilidades puras de la entrada: curvas, rampas y tipos de vista. */

export interface Vec2Like {
  x: number;
  y: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

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
