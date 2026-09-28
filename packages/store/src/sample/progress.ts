import type { AreaInput } from '../schema';

/**
 * Logros, cosméticos y rangos de MUESTRA. La lista de logros sigue la base de
 * REQ-IDE-025 (primera boia, X/6 boies, islas, entrada, 5/20 minutos, Boia
 * Fiestera rescatada y entregada, circuito, secretos); títulos, puntos,
 * monedas, precios y umbrales son muestra [pendiente Álvaro, REQ-IDE-029].
 * Los ids son estables: los usa el juego para conceder (T21).
 */
export const SAMPLE_ACHIEVEMENTS: AreaInput<'achievements'>[] = [
  {
    id: 'primera-boia',
    title: 'Primera boia',
    description: 'Habla con tu primera boia.',
    trigger: 'find_buoy',
    triggerParams: { count: 1 },
    points: 10,
    coins: 5,
    sample: true,
  },
  {
    id: 'boies-6',
    title: 'Seis boies',
    description: 'Encuentra las 6 boies del mar.',
    trigger: 'find_buoy',
    triggerParams: { count: 6 },
    points: 60,
    coins: 20,
    sample: true,
  },
  {
    id: 'islas-3',
    title: 'Isla a isla',
    description: 'Descubre 3 islas.',
    trigger: 'visit_island',
    triggerParams: { count: 3 },
    points: 30,
    coins: 10,
    sample: true,
  },
  {
    id: 'entrada',
    title: 'Con entrada',
    description: 'Compra una entrada para un evento de BOIA.',
    trigger: 'buy_ticket',
    triggerParams: {},
    points: 100,
    coins: 30,
    sample: true,
  },
  {
    id: 'minutos-5',
    title: 'Cinco minutos a bordo',
    trigger: 'time_played',
    triggerParams: { minutes: 5 },
    points: 10,
    coins: 5,
    sample: true,
  },
  {
    id: 'minutos-20',
    title: 'Veinte minutos a bordo',
    trigger: 'time_played',
    triggerParams: { minutes: 20 },
    points: 30,
    coins: 10,
    sample: true,
  },
  {
    id: 'fiestera-rescatada',
    title: 'Boia Fiestera rescatada',
    description: 'Saca a la Boia Fiestera de entre los cocodrilos.',
    trigger: 'rescue_character',
    triggerParams: { character: 'boia-fiestera' },
    points: 50,
    coins: 20,
    sample: true,
  },
  {
    id: 'fiestera-entregada',
    title: 'Hasta el amanecer',
    description: 'Lleva a la Boia Fiestera a la última isla.',
    trigger: 'deliver_character',
    triggerParams: { character: 'boia-fiestera' },
    points: 150,
    coins: 50,
    cosmeticKey: 'bandera-fiestera',
    sample: true,
  },
  {
    id: 'circuito',
    title: 'Por El Freu',
    description: 'Completa el circuito.',
    trigger: 'complete_circuit',
    triggerParams: { circuit: 'el-freu' },
    points: 40,
    coins: 15,
    sample: true,
  },
  {
    id: 'secretos',
    title: 'Ojo de marinera',
    description: 'Encuentra los secretos del mapa.',
    trigger: 'collect_objects',
    triggerParams: { category: 'secreto', count: 4 },
    points: 80,
    coins: 25,
    secret: true,
    sample: true,
  },
];

export const SAMPLE_COSMETICS: AreaInput<'cosmetics'>[] = [
  { id: 'bandera-boia', name: 'Bandera BOIA', slot: 'flag', priceCoins: 30, sample: true },
  { id: 'estela-naranja', name: 'Estela naranja', slot: 'wake', priceCoins: 50, sample: true },
  { id: 'farolillo', name: 'Farolillo de proa', slot: 'accessory', priceCoins: 40, sample: true },
  {
    id: 'bandera-fiestera',
    name: 'Bandera de la Fiestera',
    slot: 'flag',
    priceCoins: null,
    sample: true,
  },
];

/** Rangos lúdicos, no jerarquía (REQ-IDE-012, REQ-IDE-028). */
export const SAMPLE_RANKS: AreaInput<'ranks'>[] = [
  { id: 'grumete', name: 'Grumete', minPoints: 0, sample: true },
  { id: 'marinera', name: 'Marinera', minPoints: 100, sample: true },
  { id: 'timonel', name: 'Timonel', minPoints: 300, sample: true },
  { id: 'capitana', name: 'Capitana de la fiesta', minPoints: 600, sample: true },
];
