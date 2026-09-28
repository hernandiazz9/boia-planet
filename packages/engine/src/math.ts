export const TAU = Math.PI * 2;

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Lleva un ángulo a (-π, π]. */
export function wrapAngle(a: number): number {
  let r = a % TAU;
  if (r <= -Math.PI) r += TAU;
  else if (r > Math.PI) r -= TAU;
  return r;
}

/** Factor de amortiguación exponencial independiente de la tasa de imágenes. */
export function damp(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}
