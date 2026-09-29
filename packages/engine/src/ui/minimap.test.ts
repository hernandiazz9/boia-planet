import { SAMPLE_WORLD, parseWorldConfig, worldToScreen } from '@boia/world';
import { describe, expect, it } from 'vitest';
import { DiscoveryTracker, compassAngle, discoveryTargets, mapMarkers } from './discovery';
import { LONG_PRESS_MS, MinimapGesture, TAP_SLOP_PX, minimapProjection } from './minimap';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  parseSettings,
  saveSettings,
  SETTINGS_KEY,
} from './settings';
import { MemoryStore } from './storage';
import { SENSITIVITY_RANGE } from '../input/controls';

const world = parseWorldConfig(SAMPLE_WORLD);

describe('gesto del minimapa', () => {
  it('toque corto = ampliar', () => {
    const g = new MinimapGesture();
    g.down(0, 10, 10);
    g.move(100, 12, 11);
    expect(g.up(200)).toEqual({ kind: 'tap' });
  });

  it('500 ms quieto = mover; soltar da el punto final', () => {
    const g = new MinimapGesture();
    g.down(0, 10, 10);
    expect(g.tick(LONG_PRESS_MS - 1)).toBe(false);
    expect(g.tick(LONG_PRESS_MS)).toBe(true);
    expect(g.dragging).toBe(true);
    g.move(LONG_PRESS_MS + 50, 110, 210);
    expect(g.offset()).toEqual({ dx: 100, dy: 200 });
    expect(g.up(LONG_PRESS_MS + 60)).toEqual({ kind: 'drop', x: 110, y: 210 });
    expect(g.dragging).toBe(false);
  });

  it('moverse antes de los 500 ms no abre ni arrastra', () => {
    const g = new MinimapGesture();
    g.down(0, 10, 10);
    g.move(100, 10 + TAP_SLOP_PX + 1, 10);
    expect(g.tick(LONG_PRESS_MS + 100)).toBe(false);
    expect(g.up(LONG_PRESS_MS + 200)).toEqual({ kind: 'cancel' });
  });

  it('la pulsación larga cuenta aunque no llegue un tick: la detecta el siguiente movimiento', () => {
    const g = new MinimapGesture();
    g.down(0, 0, 0);
    g.move(LONG_PRESS_MS + 1, 40, 0);
    expect(g.dragging).toBe(true);
  });
});

describe('proyección del minimapa', () => {
  it('usa la proyección del motor y mete el mundo entero en el cuadrado', () => {
    const size = 96;
    const p = minimapProjection(world.bounds, size, size);
    const { left, right, top, bottom } = world.bounds;
    for (const c of [
      { x: left, y: top },
      { x: right, y: bottom },
    ]) {
      const q = p.project(c);
      expect(q.x).toBeGreaterThanOrEqual(0);
      expect(q.y).toBeGreaterThanOrEqual(0);
      expect(q.x).toBeLessThanOrEqual(size);
      expect(q.y).toBeLessThanOrEqual(size);
    }
    // Relación de aspecto igual a la del mundo proyectado (REQ-MUN-014).
    const a = worldToScreen({ x: left, y: top });
    const b = worldToScreen({ x: right, y: bottom });
    expect(p.content.w / p.content.h).toBeCloseTo((b.x - a.x) / (b.y - a.y), 9);
  });

  it('con un hueco menor que el margen (viewport cambiando) no da tamaños negativos', () => {
    for (const [w, h] of [
      [0, 0],
      [3, 40],
      [-4, -4],
    ] as const) {
      const p = minimapProjection(world.bounds, w, h);
      expect(p.scale).toBeGreaterThanOrEqual(0);
      expect(p.content.w).toBeGreaterThanOrEqual(0);
      expect(p.content.h).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('descubrimiento y brújula', () => {
  it('objetivos: islas, boies y puntos con función; nunca rocas', () => {
    const targets = discoveryTargets(world);
    const ids = new Set(targets.map((t) => t.id));
    for (const o of world.objects) {
      const cat = o.identity.category;
      if (cat === 'isla' || cat === 'boia')
        expect(ids.has(o.identity.id), o.identity.id).toBe(true);
      if (cat === 'obstaculo') expect(ids.has(o.identity.id), o.identity.id).toBe(false);
    }
    expect(mapMarkers(world)).toHaveLength(world.objects.filter((o) => o.identity.active).length);
    const island = targets.find((t) => t.eventRef);
    expect(island?.functions).toContain('event');
  });

  it('el barco descubre al entrar en el radio; la brújula va a lo más cercano sin descubrir', () => {
    const targets = discoveryTargets(world);
    const t = new DiscoveryTracker(targets);
    const [first, second] = [...targets].sort(
      (a, b) =>
        Math.hypot(a.x - world.spawn!.x, a.y - world.spawn!.y) -
        Math.hypot(b.x - world.spawn!.x, b.y - world.spawn!.y),
    );
    expect(t.nextTarget(world.spawn!)?.id).toBe(first!.id);
    const fresh = t.update({ x: first!.x, y: first!.y + first!.discoverRadius - 1 });
    expect(fresh.map((f) => f.id)).toContain(first!.id);
    expect(t.update({ x: first!.x, y: first!.y })).toEqual([]);
    expect(t.isDiscovered(first!.id)).toBe(true);
    expect(t.nextTarget({ x: first!.x, y: first!.y })?.id).not.toBe(first!.id);
    expect(second).toBeDefined();
    // Todo descubierto: la brújula no señala nada.
    for (const x of targets) t.update(x);
    expect(t.nextTarget(world.spawn!)).toBeNull();
  });

  it('un objetivo elegido manda hasta que se llega a él', () => {
    const targets = discoveryTargets(world);
    const t = new DiscoveryTracker(targets);
    const far = targets.find((x) => x.eventRef)!;
    expect(t.selectEvent(far.eventRef!)).toBe(true);
    expect(t.nextTarget(world.spawn!)?.id).toBe(far.id);
    t.update(far);
    expect(t.selected).toBeNull();
    expect(t.selectEvent('no-existe')).toBe(false);
  });

  it('la aguja apunta en pantalla: arriba es −90°', () => {
    expect(compassAngle({ x: 0, y: 100 }, { x: 0, y: 0 })).toBeCloseTo(-Math.PI / 2, 9);
    expect(compassAngle({ x: 0, y: 0 }, { x: 100, y: 0 })).toBeCloseTo(0, 9);
    // 100 u hacia abajo en el agua son 50 px de pantalla.
    expect(compassAngle({ x: 0, y: 0 }, { x: 50, y: 100 })).toBeCloseTo(Math.PI / 4, 9);
  });
});

describe('ajustes guardados', () => {
  it('música y efectos por separado, modo de teclado, y todo sobrevive a una recarga', () => {
    const store = new MemoryStore();
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    const s = loadSettings(store);
    s.music.enabled = false;
    s.sfx.volume = 0.3;
    s.keyboardMode = 'tank';
    s.sensitivity = { keyboard: SENSITIVITY_RANGE.max, touch: SENSITIVITY_RANGE.min };
    saveSettings(store, s);
    const back = loadSettings(store);
    expect(back).toEqual(s);
    // Callar la música no toca los efectos.
    expect(back.sfx.enabled).toBe(true);
  });

  it('valores rotos caen a su valor por defecto sin tirar los demás', () => {
    const store = new MemoryStore();
    store.setItem(SETTINGS_KEY, '{no es json');
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    const s = parseSettings({
      language: 'en', // no publicado en L1 (D-03)
      music: { enabled: false, volume: 7 },
      sfx: 'fuerte',
      keyboardMode: 'joystick',
    });
    expect(s.language).toBe(DEFAULT_SETTINGS.language);
    expect(s.music).toEqual({ enabled: false, volume: 1 });
    expect(s.sfx).toEqual(DEFAULT_SETTINGS.sfx);
    expect(s.keyboardMode).toBe(DEFAULT_SETTINGS.keyboardMode);
  });

  it('la sensibilidad se guarda por separado y se recorta a su rango', () => {
    const s = parseSettings({ sensitivity: { keyboard: 99, touch: 'mucha' } });
    expect(s.sensitivity.keyboard).toBe(SENSITIVITY_RANGE.max);
    expect(s.sensitivity.touch).toBe(DEFAULT_SETTINGS.sensitivity.touch);
    expect(parseSettings({}).sensitivity).toEqual(DEFAULT_SETTINGS.sensitivity);
  });
});
