import type { Mesh } from 'three';
import { Box3, Group, MeshLambertMaterial, type MeshStandardMaterial, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Los barcos del 2D en el mar 3D: los mismos modelos de Blender de cada
 * estilo (`tools/blender/export_barcos_glb.py` → `art/barco/3d/<id>.glb`),
 * con un color por pieza sacado de su hoja. Aquí se cargan y se pasan a
 * Lambert, que en el móvil cuesta menos que el material físico.
 */

export const SHIP_MODELS_URL = '/api/art/barco/3d';

export interface ShipModelEntry {
  id: string;
  file: string;
  barco: string;
  label: string;
  /** Hueco de la pasajera en cubierta (x, y de Blender). */
  slot: [number, number];
}

export interface ShipModel {
  id: string;
  object: Object3D;
  /** Hueco de la pasajera en coordenadas del modelo (three, y arriba). */
  slot: { x: number; y: number; z: number };
}

export async function loadShipManifest(): Promise<ShipModelEntry[]> {
  try {
    const r = await fetch(`${SHIP_MODELS_URL}/manifest.json`);
    if (!r.ok) return [];
    const j = (await r.json()) as { barcos?: ShipModelEntry[] };
    return j.barcos ?? [];
  } catch {
    return [];
  }
}

export async function loadShipModel(entry: ShipModelEntry): Promise<ShipModel> {
  const gltf = await new GLTFLoader().loadAsync(`${SHIP_MODELS_URL}/${entry.file}`);
  const root = new Group();
  root.add(gltf.scene);
  const cache = new Map<string, MeshLambertMaterial>();
  gltf.scene.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const src = m.material as MeshStandardMaterial;
    let mat = cache.get(src.uuid);
    if (!mat) {
      const glowing = src.emissive && src.emissive.getHex() !== 0;
      mat = new MeshLambertMaterial({
        color: src.color,
        ...(glowing ? { emissive: src.emissive, emissiveIntensity: 0.9 } : {}),
      });
      cache.set(src.uuid, mat);
      src.dispose();
    }
    m.material = mat;
  });
  // Cubierta: la altura del casco en el hueco; se busca en la caja del modelo.
  const box = new Box3().setFromObject(gltf.scene);
  const deck = Math.max(0.3, box.max.y * 0.32);
  return {
    id: entry.id,
    object: root,
    slot: { x: entry.slot[0], y: deck, z: -entry.slot[1] },
  };
}

/** Eslora del modelo en su eje X (proa a +X). */
export function modelLength(o: Object3D): { length: number; minX: number; maxX: number } {
  const box = new Box3().setFromObject(o);
  return { length: box.max.x - box.min.x, minX: box.min.x, maxX: box.max.x };
}
