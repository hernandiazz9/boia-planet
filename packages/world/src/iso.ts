/**
 * Proyección dimétrica 2:1 del mundo de BOIA.PLANET.
 *
 * Coordenadas del mundo: plano del agua con `x` hacia la derecha de la
 * pantalla e `y` hacia el espectador (abajo en pantalla); `z` es altura.
 * Una unidad de mundo en `x` mide 1 px en pantalla a zoom 1. Así los bordes
 * del mapa (costas laterales, borde superior abierto, §49.7) son rectas de
 * pantalla y la física es isótropa en el plano.
 *
 * La rejilla isométrica (la de los sprites de Blender) va girada 45° (azimut)
 * respecto a esos ejes. Una losa de la rejilla proyecta a un rombo 2:1 de
 * 64×32 px. Para que la cara superior de un cubo dé exactamente 2:1 la cámara
 * ortográfica tiene elevación asin(1/2) = 30°; las aristas de la rejilla
 * quedan entonces a atan(1/2) ≈ 26,57° de la horizontal en pantalla. Ese
 * 26,57° es el ángulo de las aristas, no el de la cámara (ver informe 03).
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 extends Vec2 {
  z: number;
}

const DEG = Math.PI / 180;

export const CAMERA_AZIMUTH_DEG = 45;
export const CAMERA_ELEVATION_DEG = 30;
export const EDGE_ANGLE_DEG = Math.atan(0.5) / DEG;

/** Compresión vertical del plano del agua: sin(elevación) = 0,5. */
export const GROUND_Y_SCALE = Math.sin(CAMERA_ELEVATION_DEG * DEG);
/** Una unidad de altura mide cos(elevación) ≈ 0,866 px en pantalla. */
export const HEIGHT_SCALE = Math.cos(CAMERA_ELEVATION_DEG * DEG);

/** Rombo de una celda de la rejilla isométrica en pantalla, en px a zoom 1. */
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = TILE_WIDTH * GROUND_Y_SCALE;
/** Lado de una celda de la rejilla en unidades de mundo. */
export const GRID_CELL = TILE_WIDTH / Math.SQRT2;

export function worldToScreen(p: Vec2 & { z?: number }): Vec2 {
  const z = p.z ?? 0;
  return { x: p.x, y: p.y * GROUND_Y_SCALE - z * HEIGHT_SCALE };
}

/** Inversa de `worldToScreen` sobre el plano de altura `z` (0 = agua). */
export function screenToWorld(p: Vec2, z = 0): Vec3 {
  return { x: p.x, y: (p.y + z * HEIGHT_SCALE) / GROUND_Y_SCALE, z };
}

/**
 * Pasa coordenadas de la rejilla isométrica (a hacia abajo-derecha, b hacia
 * abajo-izquierda en pantalla, c altura, en celdas) a coordenadas de mundo.
 */
export function gridToWorld(a: number, b: number, c = 0): Vec3 {
  const h = GRID_CELL / Math.SQRT2;
  return { x: (a - b) * h, y: (a + b) * h, z: c * GRID_CELL };
}

export function worldToGrid(p: Vec2 & { z?: number }): Vec3 {
  const h = GRID_CELL / Math.SQRT2;
  return { x: (p.x / h + p.y / h) / 2, y: (p.y / h - p.x / h) / 2, z: (p.z ?? 0) / GRID_CELL };
}

/** Vector de pantalla (p. ej. el del joystick) a dirección en el plano del agua. */
export function screenVectorToWorld(v: Vec2): Vec2 {
  return { x: v.x, y: v.y / GROUND_Y_SCALE };
}
