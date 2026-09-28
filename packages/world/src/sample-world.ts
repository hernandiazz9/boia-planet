import type { WorldConfigInput, WorldObjectInput } from './schema';

/**
 * Mundo de MUESTRA de la demo L1 (plan 001, T04), hecho sólo de datos: el
 * mismo formato que guardará el editor (T09). Usa el arte de T01 (`art/`).
 * Todo es `muestra`: posiciones, radios y textos se ajustan en el hito 1.
 *
 * Radios en u de mundo (1 u ≈ 1 px de pantalla en horizontal). Salen de los
 * `hitbox_hint` de cada manifiesto × la escala del arte con el barco de 48 u
 * (≈ 0,324): isla de evento ≈ 126, isla pequeña ≈ 59, boia ≈ 10, roca-a ≈ 17,
 * roca-b ≈ 23. La geometría vive aquí, no en la imagen (REQ-MUN-031).
 *
 * El diálogo de la boia tutorial es un borrador [pendiente Álvaro, REQ-AVE-003].
 */

const TAGS = ['muestra'];

/** Id del evento de muestra de la landing (`apps/web/lib/landing/sample-content.ts`). */
export const SAMPLE_EVENT_ID = 'ev-all-day-primavera';

const tutorialBoia: WorldObjectInput = {
  identity: { id: 'boia-tutorial', name: 'Boia tutorial', category: 'boia', tags: TAGS },
  appearance: { asset: 'boia-tutorial' },
  position: { x: 560, y: 2200 },
  geometry: { collision: { shape: 'circle', radius: 10 }, proximityRadius: 170 },
  behaviors: [
    { type: 'collision', params: { mode: 'bounce', intensity: 0.3 } },
    { type: 'proximity' },
    {
      type: 'dialogue',
      params: {
        once: true,
        lines: [
          '¡Hola! Soy la boia de bienvenida. Te doy la bienvenida a BOIA.PLANET.',
          'Toca en cualquier sitio y arrastra: el barco va hacia donde apuntes.',
          'Con un segundo dedo apoyado derrapas y giras más cerrado.',
          'Tu misión: encontrar a la Boia Fiestera y llevarla hasta la última isla.',
          'Por el mar hay descuentos, monedas y secretos. Mira bien al navegar.',
          {
            text: 'Arriba tienes el minimapa: tócalo para ampliar, mantenlo pulsado para moverlo.',
            cue: 'pulse_minimap',
          },
          { text: 'Y en el ancla está el Menú de a bordo. ¡Buen viaje!', cue: 'pulse_menu' },
        ],
      },
    },
    { type: 'achievement', params: { trigger: 'find_boia' } },
  ],
};

const eventIsland: WorldObjectInput = {
  identity: {
    id: 'isla-primavera',
    name: 'Isla del All Day BOIA · Primavera',
    category: 'isla',
    tags: TAGS,
  },
  appearance: { asset: 'isla-evento' },
  position: { x: 600, y: 760 },
  // Radio de proximidad amplio (REQ-AVE-012): el panel se abre sin atracar.
  geometry: { collision: { shape: 'circle', radius: 120 }, proximityRadius: 330 },
  behaviors: [
    { type: 'collision', params: { mode: 'block' } },
    { type: 'proximity' },
    { type: 'content', params: { target: 'event', ref: SAMPLE_EVENT_ID } },
    { type: 'ticket', params: { eventId: SAMPLE_EVENT_ID } },
    { type: 'achievement', params: { trigger: 'visit_island' } },
  ],
};

const smallIsland: WorldObjectInput = {
  identity: { id: 'isla-pequena-1', name: 'Isla pequeña', category: 'isla', tags: TAGS },
  appearance: { asset: 'isla-pequena' },
  position: { x: 190, y: 1080 },
  geometry: { collision: { shape: 'circle', radius: 56 } },
  behaviors: [{ type: 'collision', params: { mode: 'block' } }, { type: 'decorative' }],
};

const rocks: WorldObjectInput[] = [
  { id: 'roca-1', asset: 'roca-a', x: 300, y: 1960, r: 16, mode: 'bounce' as const },
  { id: 'roca-2', asset: 'roca-b', x: 780, y: 1720, r: 22, mode: 'bounce' as const },
  { id: 'roca-3', asset: 'roca-a', x: 430, y: 1420, r: 16, mode: 'block' as const },
  { id: 'roca-4', asset: 'roca-b', x: 820, y: 1120, r: 22, mode: 'bounce' as const },
].map((r) => ({
  identity: { id: r.id, name: `Roca (${r.asset})`, category: 'obstaculo', tags: TAGS },
  appearance: { asset: r.asset },
  position: { x: r.x, y: r.y },
  geometry: { collision: { shape: 'circle', radius: r.r } },
  behaviors: [{ type: 'collision', params: { mode: r.mode } }],
}));

export const SAMPLE_WORLD: WorldConfigInput = {
  id: 'muestra-demo-l1',
  version: 1,
  bounds: { left: 0, right: 1000, top: 0, bottom: 2600 },
  spawn: { x: 500, y: 2420, heading: -Math.PI / 2 },
  sectors: [
    {
      id: 'sector-inicial',
      name: 'Sector inicial (muestra)',
      area: { left: 0, right: 1000, top: 0, bottom: 2600 },
    },
  ],
  coast: { asset: 'costa' },
  objects: [tutorialBoia, ...rocks, smallIsland, eventIsland],
};
