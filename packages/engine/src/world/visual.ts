import {
  type ArtManifest,
  type ShipManifest,
  type Vec2,
  type WorldObject,
  artFrames,
} from '@boia/world';
import { SHIP_LENGTH } from '../ship/provisional';

/**
 * Cómo se dibuja un objeto del mundo, sin Pixi: qué PNG, con qué pivote y a
 * qué escala. Depende sólo de `appearance` y del manifiesto del asset; los
 * comportamientos no intervienen (§48.1). Es la mitad visual de la prueba de
 * sustitución: cambiar el asset cambia esto y nada de la simulación.
 */
export type ObjectVisual =
  | {
      kind: 'sprite';
      assetId: string;
      version: string;
      /** Archivos relativos a la carpeta del asset, en orden de fotograma. */
      frames: string[];
      fps: number;
      loop: boolean;
      /** Pivote en px de la imagen: se coloca sobre la posición del objeto. */
      pivot: Vec2;
      /** px de pantalla por px de imagen. */
      scale: number;
      /** Anclajes en px de pantalla relativos al pivote, ya escalados. */
      anchors: Record<string, Vec2>;
    }
  | {
      kind: 'placeholder';
      /** `roca`, `isla`, `boia`… (de `placeholder:<forma>` o de la categoría). */
      shape: string;
      /** u de mundo. */
      radius: number;
      /** Por qué es provisional: sin arte asignado o manifiesto no cargado. */
      reason: 'placeholder' | 'missing';
    };

/**
 * Longitud roda–popa (vista W, que no se acorta) del barco de arte T01 en
 * px de su PNG. Sólo se usa si no se ha cargado el manifiesto del barco.
 */
const REFERENCE_SHIP_PX = 148.31;

/**
 * px de pantalla por px de los PNG del pipeline: la eslora del barco (vista W)
 * mide `SHIP_LENGTH` (D-15). Todo el arte del mundo está a la densidad del
 * barco, así que esta es también la escala de islas, boies, rocas y costas.
 */
export function shipArtScale(ship: ShipManifest | null | undefined): number {
  const w = ship?.anchors.W;
  if (w?.bow) {
    const len = Math.hypot(w.bow.x - w.wake_origin.x, w.bow.y - w.wake_origin.y);
    if (len > 1) return SHIP_LENGTH / len;
  }
  return SHIP_LENGTH / REFERENCE_SHIP_PX;
}

function placeholderRadius(o: WorldObject): number {
  return o.geometry.collision?.radius ?? o.geometry.activation?.radius ?? 20;
}

export function resolveObjectVisual(
  o: WorldObject,
  art: ReadonlyMap<string, ArtManifest>,
  artScale: number,
): ObjectVisual {
  const asset = o.appearance.asset;
  if (asset.startsWith('placeholder:')) {
    return {
      kind: 'placeholder',
      shape: asset.slice('placeholder:'.length) || o.identity.category,
      radius: placeholderRadius(o),
      reason: 'placeholder',
    };
  }
  const m = art.get(asset);
  const deco = o.behaviors.find((b) => b.type === 'decorative');
  const animation = deco?.type === 'decorative' ? deco.params.animation : 'idle';
  const frames = m ? artFrames(m, animation) : null;
  const pivot = m?.pivot_px ?? m?.anchors.pivot;
  if (!m || !frames || frames.files.length === 0 || !pivot) {
    return {
      kind: 'placeholder',
      shape: o.identity.category,
      radius: placeholderRadius(o),
      reason: 'missing',
    };
  }
  const scale = artScale * o.appearance.scale;
  const anchors: Record<string, Vec2> = {};
  for (const [k, p] of Object.entries(m.anchors)) {
    anchors[k] = { x: (p.x - pivot.x) * scale, y: (p.y - pivot.y) * scale };
  }
  return {
    kind: 'sprite',
    assetId: m.id,
    version: m.version,
    frames: frames.files,
    fps: frames.fps,
    loop: frames.loop,
    pivot,
    scale,
    anchors,
  };
}

/**
 * Dónde nace el bocadillo de un objeto, en px de pantalla relativos a su
 * posición: el anclaje `bocadillo` del arte, o encima del objeto.
 */
export function bubbleAnchor(v: ObjectVisual): Vec2 {
  if (v.kind === 'sprite') {
    const a = v.anchors.bocadillo ?? v.anchors.rotulo ?? v.anchors.tope;
    if (a) return a;
    return { x: 0, y: -v.pivot.y * v.scale };
  }
  return { x: 0, y: -v.radius * 1.4 - 10 };
}
