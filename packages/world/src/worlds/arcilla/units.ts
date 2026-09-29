import type { CollisionPart } from '../../schema';

/**
 * De la maqueta de `mundos/arcilla/mapa.json` (u_maq) al motor (u), T20.
 *
 * - Tamaños a 1:1 con el barco: 1 u_maq = `U` u (`unidades.u_motor_por_u_maq`,
 *   la eslora del B05 en la maqueta frente a `SHIP_LENGTH`). Islas, piezas,
 *   radios y el arte de T18 miden lo mismo que en la maqueta.
 * - Posiciones × `ritmo.factor_juego`: el agua entre zonas es `FACTOR`
 *   veces más larga (diseno.md, «Ruta y ritmo»: un minuto de ruta directa).
 * - Composiciones locales (el puerto, el remanso de la Fiestera, el
 *   semáforo junto a la salida del circuito): el ancla va a escala de
 *   posiciones y cada pieza queda a su distancia 1:1 del ancla, así el arte
 *   encaja como en la maqueta.
 *
 * Todo es `muestra` (diseno.md propone probar ×10 y ×15 en móvil).
 */

/** u de motor por u_maq (`mapa.json` → `unidades.u_motor_por_u_maq`). */
export const U = 24.87;
/** `mapa.json` → `ritmo.factor_juego`. */
export const FACTOR = 15;
/** u de motor por u_maq en posiciones. */
export const POS = U * FACTOR;

/** Un punto de la maqueta, en u_maq. */
export type Maq = readonly [number, number];

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Posición en el mar (u de motor) de un punto de la maqueta. */
export function at([x, y]: Maq): { x: number; y: number } {
  return { x: r2(x * POS), y: r2(y * POS) };
}

/** Posición de una pieza de una composición local: el ancla escala, la pieza no. */
export function near(anchor: Maq, [x, y]: Maq): { x: number; y: number } {
  return {
    x: r2(anchor[0] * POS + (x - anchor[0]) * U),
    y: r2(anchor[1] * POS + (y - anchor[1]) * U),
  };
}

/** Un tamaño de la maqueta (radio, semieje) en u de motor. */
export function size(v: number): number {
  return r2(v * U);
}

/**
 * Radio de proximidad a partir del de la maqueta. Las islas lo doblan
 * (REQ-AVE-012: radio amplio, el panel se abre sin atracar); los encuentros
 * pequeños lo estiran un cuarto, para que el bocadillo salte al pasar al lado
 * sin saltar desde el anillo de salida. muestra
 */
export function proximity(v: number, kind: 'isla' | 'encuentro'): number {
  return r2(v * U * (kind === 'isla' ? 2 : 1.25));
}

/**
 * Colisión de una isla o escollera elíptica de la maqueta (`a`, `b`, `giro`
 * en grados desde +x hacia +y) con círculos: uno central de radio `b` y más
 * a lo largo del eje mayor, sin huecos. Cubre la elipse (queda una cápsula).
 */
export function ellipseCollision(
  a: number,
  b: number,
  giro: number,
): { collision: { shape: 'circle'; radius: number }; collisionParts?: CollisionPart[] } {
  const radius = size(b);
  const half = (a - b) * U;
  if (half <= radius * 0.15) return { collision: { shape: 'circle', radius: size(a) } };
  const step = radius * 0.75;
  const n = Math.ceil(half / step);
  const c = Math.cos((giro * Math.PI) / 180);
  const s = Math.sin((giro * Math.PI) / 180);
  const parts: CollisionPart[] = [];
  for (let k = 1; k <= n; k++) {
    const t = (half * k) / n;
    parts.push({ dx: r2(c * t), dy: r2(s * t), radius });
    parts.push({ dx: r2(-c * t), dy: r2(-s * t), radius });
  }
  return { collision: { shape: 'circle', radius }, collisionParts: parts };
}
