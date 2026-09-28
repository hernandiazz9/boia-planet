import type { WorldConfigInput } from './schema';
import { composeWorld } from './worlds/compose';
import { type PlaceInput, type SharedMapInput, parseSharedMap } from './worlds/map';
import { type WorldSkinInput, WorldSkin } from './worlds/skin';

/**
 * Mundo de MUESTRA de la demo L1 (plan 001, T04), hecho sólo de datos y
 * partido en mapa compartido + skins (T17, D-20): `SAMPLE_MAP` lleva los
 * lugares (posición, geometría, comportamientos) y `MUESTRA_SKIN` el arte de
 * T01 (`art/`). `PRUEBA_SKIN` es un segundo mundo mínimo sobre los mismos
 * lugares, sólo para probar el cambio de mundo. Se quedan hasta que T20/T24
 * pongan el mapa de Arcilla. Todo es `muestra`: posiciones, radios y textos
 * se ajustan en el hito 1.
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

const tutorialBoia: PlaceInput = {
  id: 'boia-tutorial',
  name: 'Boia tutorial',
  category: 'boia',
  tags: TAGS,
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

const eventIsland: PlaceInput = {
  id: 'isla-primavera',
  // Isla de evento: sólo el nombre común, igual en todos los mundos.
  name: 'Isla del All Day BOIA · Primavera',
  category: 'isla',
  tags: TAGS,
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

const smallIsland: PlaceInput = {
  id: 'isla-pequena-1',
  name: 'Isla pequeña',
  category: 'isla',
  tags: TAGS,
  position: { x: 190, y: 1080 },
  geometry: { collision: { shape: 'circle', radius: 56 } },
  behaviors: [{ type: 'collision', params: { mode: 'block' } }, { type: 'decorative' }],
};

const ROCKS = [
  { id: 'roca-1', asset: 'roca-a', x: 300, y: 1960, r: 16, mode: 'bounce' as const },
  { id: 'roca-2', asset: 'roca-b', x: 780, y: 1720, r: 22, mode: 'bounce' as const },
  { id: 'roca-3', asset: 'roca-a', x: 430, y: 1420, r: 16, mode: 'block' as const },
  { id: 'roca-4', asset: 'roca-b', x: 820, y: 1120, r: 22, mode: 'bounce' as const },
];

const rocks: PlaceInput[] = ROCKS.map((r) => ({
  id: r.id,
  name: 'Roca',
  category: 'obstaculo',
  tags: TAGS,
  position: { x: r.x, y: r.y },
  geometry: { collision: { shape: 'circle', radius: r.r } },
  behaviors: [{ type: 'collision', params: { mode: r.mode } }],
}));

/** El mapa compartido de la demo de plan 001. */
export const SAMPLE_MAP: SharedMapInput = {
  id: 'demo-l1',
  version: 1,
  bounds: { left: 0, right: 1000, top: 0, bottom: 2600 },
  spawn: { x: 500, y: 2420, heading: -Math.PI / 2 },
  // El punto de aterrizaje de la entrada de T14 (la isla de evento).
  introLanding: { x: 600, y: 760 },
  sectors: [
    {
      id: 'sector-inicial',
      name: 'Sector inicial (muestra)',
      area: { left: 0, right: 1000, top: 0, bottom: 2600 },
    },
  ],
  places: [tutorialBoia, ...rocks, smallIsland, eventIsland],
};

/** Mundo `muestra`: el arte de T01 y el barco por defecto de `art/barco`. */
export const MUESTRA_SKIN: WorldSkinInput = {
  id: 'muestra',
  name: 'Muestra',
  tagline: 'El mar de pruebas de la demo: una boia, cuatro rocas y la isla del All Day.',
  ship: { style: 'muestra' },
  ui: { accent: '#f2632a' },
  music: null,
  coast: { asset: 'costa' },
  places: {
    'boia-tutorial': { asset: 'boia-tutorial' },
    ...Object.fromEntries(ROCKS.map((r) => [r.id, { asset: r.asset }])),
    'isla-pequena-1': { asset: 'isla-pequena' },
    'isla-primavera': { asset: 'isla-evento' },
  },
};

/**
 * Mundo `prueba`: el mínimo para probar el cambio de mundo sobre el mismo
 * mapa. Otro barco (acuarela), otro mar, otros nombres y las rocas cambiadas;
 * reutiliza el arte de T01, no trae arte ni historia propios.
 */
export const PRUEBA_SKIN: WorldSkinInput = {
  id: 'prueba',
  name: 'Prueba',
  tagline: 'Mundo de prueba: los mismos lugares con otra piel.',
  ship: { style: 'acuarela' },
  sea: { base: '#1d4f6e', wave: '#4d8fb5', crest: '#f4ead8' },
  ui: { accent: '#3f7fbf' },
  music: null,
  coast: { asset: 'costa' },
  places: {
    'boia-tutorial': { asset: 'boia-tutorial' },
    ...Object.fromEntries(
      ROCKS.map((r) => [r.id, { asset: r.asset === 'roca-a' ? 'roca-b' : 'roca-a' }]),
    ),
    'isla-pequena-1': { asset: 'isla-pequena' },
    'isla-primavera': { asset: 'isla-evento' },
  },
  names: {
    'boia-tutorial': 'Boia de prueba',
    'isla-pequena-1': 'Islote de prueba',
  },
};

/** El mundo `muestra` ya compuesto, en el formato del editor y del motor. */
export const SAMPLE_WORLD: WorldConfigInput = composeWorld(
  parseSharedMap(SAMPLE_MAP),
  WorldSkin.parse(MUESTRA_SKIN),
).config;
