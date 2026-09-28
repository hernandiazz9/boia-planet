/**
 * Rotación de artistas de la home (v14 §18, REQ-COM-026): tres a la vez, sin
 * duplicados en el trío, sin repetir a nadie del trío anterior y equilibrada
 * (todos salen las mismas veces).
 *
 * Se recorre un orden fijo en ventanas consecutivas de tres, dando la vuelta
 * al final: el trío k son las posiciones 3k, 3k+1 y 3k+2 módulo n. Con n ≥ 3
 * ninguna ventana repite a nadie; con n ≥ 6 dos tríos seguidos no comparten
 * a nadie; y en cada n tríos seguidos cada artista sale exactamente 3 veces.
 */
export const TRIO_SIZE = 3;

/** Índices del trío número `step` sobre `count` elementos. */
export function trioAt(count: number, step: number): number[] {
  if (count <= 0) return [];
  if (count <= TRIO_SIZE) return Array.from({ length: count }, (_, i) => i);
  const start = mod(step * TRIO_SIZE, count);
  return Array.from({ length: TRIO_SIZE }, (_, i) => (start + i) % count);
}

/** Cuántos tríos distintos hay antes de que la secuencia se repita. */
export function cycleLength(count: number): number {
  if (count <= TRIO_SIZE) return 1;
  return count / gcd(count, TRIO_SIZE);
}

/**
 * Orden de recorrido barajado con una semilla (Fisher–Yates con un generador
 * congruente). Con la misma semilla da el mismo orden en servidor y cliente,
 * así la hidratación no cambia el primer trío.
 */
export function shuffledOrder(count: number, seed: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  let state = seed >>> 0 || 1;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
