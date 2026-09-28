import { type WorldConfig, parseWorldConfig } from '@boia/world';

/**
 * Mundo de demostración del encargo 03. Todo es `muestra`: tamaño, rocas y
 * punto de salida se ajustan cuando haya sectores reales.
 */
export const demoWorld: WorldConfig = parseWorldConfig({
  id: 'demo-03',
  version: 0,
  bounds: { left: 0, right: 1600, top: 0, bottom: 2400 },
  spawn: { x: 800, y: 2150, heading: -Math.PI / 2 },
  sectors: [
    {
      id: 'sector-inicial',
      name: 'Sector inicial (muestra)',
      area: { left: 0, right: 1600, top: 0, bottom: 2400 },
    },
  ],
  objects: [
    { x: 560, y: 1720, r: 46 },
    { x: 1080, y: 1300, r: 64 },
    { x: 720, y: 820, r: 40 },
  ].map((o, i) => ({
    identity: {
      id: `roca-${i + 1}`,
      name: `Roca ${i + 1} (muestra)`,
      category: 'obstaculo',
      tags: ['muestra'],
    },
    appearance: { asset: 'placeholder:roca' },
    position: { x: o.x, y: o.y },
    geometry: { collision: { shape: 'circle', radius: o.r } },
    behaviors: [{ type: 'rebotar', params: {} }],
  })),
});
