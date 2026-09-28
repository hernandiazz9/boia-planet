/**
 * Las ocho vistas del barco renderizadas por el encargo 01, en el orden en
 * que gira el casco con la cámara fija. S = proa hacia el espectador.
 */
export const DIRECTIONS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'] as const;
export type Direction = (typeof DIRECTIONS)[number];

/**
 * Rumbo en el plano del agua de cada vista, en radianes: 0 = este (+x),
 * π/2 = sur (+y, hacia el espectador). S → SW → W … aumenta el ángulo.
 */
export function directionHeading(d: Direction): number {
  return Math.PI / 2 + (DIRECTIONS.indexOf(d) * Math.PI) / 4;
}
