import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MINIMAP_ZONE,
  MINIMAP_DESKTOP,
  MINIMAP_MAX_WIDTH_FRACTION,
  MINIMAP_MOBILE,
  MINIMAP_ZONES,
  MINIMAP_ZONE_KEY,
  type MinimapZone,
  type Rect,
  type Viewport,
  hudLayout,
  inside,
  intersects,
  joystickZone,
  loadMinimapZone,
  minimapSize,
  minimapZoneRects,
  resolveMinimapZone,
  safeMinimapZones,
  saveMinimapZone,
  snapMinimap,
} from './hud-layout';
import { MemoryStore } from './storage';

const VIEWPORTS: Viewport[] = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844, insets: { top: 47, right: 0, bottom: 34, left: 0 } },
  { width: 412, height: 915 },
  { width: 640, height: 360 },
  { width: 844, height: 390, insets: { top: 0, right: 47, bottom: 21, left: 47 } },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
];

const name = (vp: Viewport) => `${vp.width}×${vp.height}`;
const centerOf = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

describe('tamaño del minimapa (D-07)', () => {
  it('96 px en móvil sin pasar del 22 % del ancho; 128 px en escritorio', () => {
    for (const vp of VIEWPORTS) {
      const s = minimapSize(vp.width);
      if (vp.width >= 1024) expect(s, name(vp)).toBe(MINIMAP_DESKTOP);
      else {
        expect(s, name(vp)).toBeLessThanOrEqual(MINIMAP_MOBILE);
        expect(s / vp.width, name(vp)).toBeLessThanOrEqual(MINIMAP_MAX_WIDTH_FRACTION);
      }
    }
    expect(minimapSize(480)).toBe(MINIMAP_MOBILE);
  });
});

describe('zonas seguras del minimapa', () => {
  it('ninguna zona segura pisa la zona del joystick ni el HUD fijo, y todas caben', () => {
    for (const vp of VIEWPORTS) {
      // Con `?debug` sale además la caja de datos: el caso con más cosas.
      const safe = safeMinimapZones(vp, { debug: true });
      expect(safe.length, name(vp)).toBeGreaterThan(0);
      const layout = hudLayout(vp, null, { debug: true });
      const fixed = [
        layout.home,
        layout.compass,
        layout.menu,
        layout.stats,
        layout.balances,
      ].filter((r): r is Rect => r !== null);
      const rects = minimapZoneRects(vp);
      for (const z of safe) {
        expect(inside(rects[z], vp), `${name(vp)} ${z}`).toBe(true);
        expect(intersects(rects[z], joystickZone(vp)), `${name(vp)} ${z}`).toBe(false);
        for (const f of fixed) expect(intersects(rects[z], f), `${name(vp)} ${z}`).toBe(false);
      }
    }
  });

  it('el HUD fijo tampoco toca la zona del joystick ni se pisa entre sí', () => {
    for (const vp of VIEWPORTS) {
      const l = hudLayout(vp, null, { debug: true });
      const all = [l.home, l.compass, l.menu, l.stats, l.balances, l.minimap].filter(
        (r): r is Rect => r !== null,
      );
      for (const [i, a] of all.entries()) {
        expect(inside(a, vp), name(vp)).toBe(true);
        expect(intersects(a, l.joystick), name(vp)).toBe(false);
        for (const b of all.slice(i + 1)) expect(intersects(a, b), name(vp)).toBe(false);
      }
      expect(intersects(l.notice, l.joystick), `aviso ${name(vp)}`).toBe(false);
    }
  });

  it('los saldos caben en la fila de arriba en móvil y escritorio, antes que los datos', () => {
    for (const vp of VIEWPORTS.filter((v) => v.width >= 360)) {
      const l = hudLayout(vp, null, { debug: true });
      expect(l.balances, name(vp)).not.toBeNull();
      expect(l.balances!.y, name(vp)).toBe(l.home.y);
      if (l.stats) expect(l.stats.x, name(vp)).toBeGreaterThan(l.balances!.x);
    }
  });

  it('la caja de fps sólo sale con ?debug (O11); lo demás no cambia de sitio', () => {
    for (const vp of VIEWPORTS) {
      const plain = hudLayout(vp);
      const debug = hudLayout(vp, null, { debug: true });
      expect(plain.stats, name(vp)).toBeNull();
      expect(plain.home).toEqual(debug.home);
      expect(plain.balances).toEqual(debug.balances);
      expect(plain.compass).toEqual(debug.compass);
      expect(plain.menu).toEqual(debug.menu);
    }
    expect(hudLayout({ width: 1280, height: 800 }, null, { debug: true }).stats).not.toBeNull();
  });

  it('en vertical están las cuatro; en horizontal bajo, sólo las de arriba', () => {
    expect(safeMinimapZones({ width: 360, height: 640 })).toEqual([...MINIMAP_ZONES]);
    const landscape = safeMinimapZones({ width: 640, height: 360 });
    expect(landscape).toContain('top-right');
    expect(landscape).toContain('top-left');
    expect(landscape).not.toContain('middle-right');
  });

  it('soltar ajusta a la zona segura más cercana', () => {
    for (const vp of VIEWPORTS) {
      const rects = minimapZoneRects(vp);
      for (const z of safeMinimapZones(vp)) {
        const c = centerOf(rects[z]);
        // Soltado cerca (desplazado unos px) de cada zona, vuelve a ella.
        expect(snapMinimap(vp, { x: c.x + 6, y: c.y - 5 }), `${name(vp)} ${z}`).toBe(z);
      }
    }
  });

  it('soltar sobre la zona del joystick lleva a la zona segura más cercana, nunca abajo', () => {
    const vp = { width: 360, height: 640 };
    const safe = safeMinimapZones(vp);
    expect(snapMinimap(vp, { x: 20, y: 620 })).toBe('middle-left');
    expect(snapMinimap(vp, { x: 350, y: 620 })).toBe('middle-right');
    expect(safe).toContain(snapMinimap(vp, { x: 180, y: 320 }));
    const land = { width: 640, height: 360 };
    expect(snapMinimap(land, { x: 600, y: 340 })).toBe('top-right');
    expect(snapMinimap(land, { x: 10, y: 340 })).toBe('top-left');
  });

  it('una preferencia que no cabe en este viewport cae arriba de su mismo lado y no se olvida', () => {
    const land = { width: 640, height: 360 };
    expect(resolveMinimapZone(land, 'middle-left')).toBe('top-left');
    expect(resolveMinimapZone(land, 'middle-right')).toBe('top-right');
    expect(resolveMinimapZone({ width: 360, height: 640 }, 'middle-left')).toBe('middle-left');
    expect(resolveMinimapZone(land, null)).toBe(DEFAULT_MINIMAP_ZONE);
  });
});

describe('posición guardada del minimapa', () => {
  it('se guarda y se recupera cada zona', () => {
    for (const z of MINIMAP_ZONES) {
      const store = new MemoryStore();
      saveMinimapZone(store, z);
      expect(loadMinimapZone(store)).toBe(z);
      expect(hudLayout({ width: 390, height: 844 }, loadMinimapZone(store)).minimapZone).toBe(z);
    }
  });

  it('sin nada guardado o con basura, la zona por defecto', () => {
    const store = new MemoryStore();
    expect(loadMinimapZone(store)).toBeNull();
    expect(hudLayout({ width: 360, height: 640 }, loadMinimapZone(store)).minimapZone).toBe(
      DEFAULT_MINIMAP_ZONE,
    );
    store.setItem(MINIMAP_ZONE_KEY, 'bottom-center');
    expect(loadMinimapZone(store)).toBeNull();
  });

  it('arrastrar, soltar y recargar deja el minimapa donde se soltó', () => {
    const vp = { width: 360, height: 640 };
    const store = new MemoryStore();
    const target: MinimapZone = 'middle-left';
    const c = centerOf(minimapZoneRects(vp)[target]);
    saveMinimapZone(store, snapMinimap(vp, c));
    // «Recarga»: sólo se conserva lo guardado.
    const layout = hudLayout(vp, loadMinimapZone(store));
    expect(layout.minimapZone).toBe(target);
    expect(layout.minimap).toEqual(minimapZoneRects(vp)[target]);
  });
});
