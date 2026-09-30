import { WORLD_REGISTRY } from '@boia/world';
import { Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { marWorld } from './compact';
import { MODEL_FILES, MODEL_TUNING, ModelStore, modelFor, planModels } from './models';

/**
 * Los modelos de Blender del mar 3D por distancia (T51): qué lugar lleva qué
 * modelo, cuándo se pide y se suelta, y que un modelo sin nadie se descarga.
 */

const world = marWorld(WORLD_REGISTRY.get(WORLD_REGISTRY.defaultId).config);
const active = world.objects.filter((o) => o.identity.active);

function fakeModel() {
  const g = new Group();
  g.add(new Mesh(new SphereGeometry(1), new MeshStandardMaterial({ color: '#ff5219' })));
  return g;
}

describe('modelFor', () => {
  it('cada boia del mapa lleva la mascota (T39) y la Fiestera la suya', () => {
    const boias = active.filter((o) => o.identity.category === 'boia');
    expect(boias.length).toBeGreaterThan(0);
    for (const b of boias) expect(modelFor(b)).not.toBeNull();
    // Las informativas (O12) llevan la de cartel; la de WhatsApp, la suya.
    for (const b of boias.filter((o) => o.identity.id.startsWith('boia-'))) {
      expect(modelFor(b)).toBe('boia-info');
    }
    for (const b of boias.filter((o) => o.identity.id.includes('whatsapp'))) {
      expect(modelFor(b)).toBe('boia-whatsapp');
    }
    const fiestera = active.find((o) => o.identity.category === 'encuentro');
    if (fiestera) expect(modelFor(fiestera)).toBe('boia-fiestera');
  });

  it('las islas se hacen a mano: sin modelo', () => {
    for (const o of active.filter((x) => x.identity.category === 'isla')) {
      expect(modelFor(o)).toBeNull();
    }
  });

  it('cada modelo tiene su archivo', () => {
    for (const f of Object.values(MODEL_FILES)) expect(f).toMatch(/\.glb$/);
  });
});

describe('planModels', () => {
  const ship = { x: 0, y: 0 };
  it('pide lo cercano y suelta lo lejano, con histéresis', () => {
    const near = { id: 'cerca', x: MODEL_TUNING.preload - 1, y: 0 };
    const middle = { id: 'medio', x: (MODEL_TUNING.preload + MODEL_TUNING.release) / 2, y: 0 };
    const far = { id: 'lejos', x: MODEL_TUNING.release + 1, y: 0 };
    const { want, keep } = planModels([near, middle, far], ship);
    expect([...want]).toEqual(['cerca']);
    expect(keep.has('cerca')).toBe(true);
    // Entre pedir y soltar: no se pide, pero si ya estaba se queda.
    expect(want.has('medio')).toBe(false);
    expect(keep.has('medio')).toBe(true);
    expect(keep.has('lejos')).toBe(false);
  });
});

describe('ModelStore', () => {
  it('carga una vez, da copias y descarga cuando nadie lo usa', async () => {
    let loads = 0;
    const store = new ModelStore(async () => {
      loads++;
      return fakeModel();
    });
    const a = await store.acquire('boia-info');
    const b = await store.acquire('boia-info');
    expect(loads).toBe(1);
    expect(a).not.toBeNull();
    expect(a).not.toBe(b);
    expect(store.loaded).toEqual(['boia-info']);
    store.release('boia-info');
    expect(store.loaded).toEqual(['boia-info']);
    store.release('boia-info');
    expect(store.loaded).toEqual([]);
    // Pedirlo otra vez lo vuelve a cargar.
    await store.acquire('boia-info');
    expect(loads).toBe(2);
  });

  it('si el modelo falla, null (se queda la mascota a mano)', async () => {
    const store = new ModelStore(() => Promise.reject(new Error('sin red')));
    const warn = console.warn;
    console.warn = () => undefined;
    try {
      expect(await store.acquire('boia-mascota')).toBeNull();
    } finally {
      console.warn = warn;
    }
  });

  it('soltado antes de llegar: no se queda en memoria', async () => {
    let resolve: (o: Group) => void = () => undefined;
    const store = new ModelStore(() => new Promise<Group>((r) => (resolve = r)));
    const pending = store.acquire('boia-fiestera');
    store.release('boia-fiestera');
    resolve(fakeModel());
    await pending;
    expect(store.loaded).toEqual([]);
  });
});
