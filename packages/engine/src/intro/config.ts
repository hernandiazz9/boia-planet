/**
 * Configuración versionada de la entrada (REQ-ENT-015): duración, curvas,
 * encuadres por dispositivo, capas, momentos de aparición y variante
 * reducida. Es un documento de datos separado de los recursos (los
 * manifiestos de `art/`) y de los bloques de la landing; el Admin podrá
 * editarlo en L2 (REQ-ENT-016). Todos los valores son `muestra` hasta que
 * Hernán y Álvaro revisen la entrada en móviles reales (ENT 04–06).
 *
 * Unidades:
 * - Tiempos de fase: fracciones de `durationMs` (0..1), así cambiar la
 *   duración estira la secuencia entera sin rehacer los tiempos.
 * - Posiciones de escena: px de arte a la densidad del barco (88,28 px por
 *   unidad de Blender); el origen es el pivote de la isla de evento, que es
 *   también el ancla `polo` del planeta.
 * - `zoom` de un encuadre: múltiplo de la escala de juego (la que deja el
 *   barco con `ship.lengthPx` de eslora, D-15).
 */

export const INTRO_CONFIG_VERSION = 1 as const;

export type Easing = 'linear' | 'easeInOutSine' | 'easeInOutCubic';
export const EASINGS: readonly Easing[] = ['linear', 'easeInOutSine', 'easeInOutCubic'];

/** Tramo [inicio, fin] como fracciones de la duración. */
export type Span = readonly [number, number];

export interface Framing {
  /** Se usa a partir de este ancho de vista (px CSS). */
  minWidth: number;
  /** Múltiplo de la escala de juego. */
  zoom: number;
  /** Punto de la vista (fracciones de ancho y alto) donde cae el pivote de la isla. */
  anchor: readonly [number, number];
}

export type SceneAsset = 'isla-evento' | 'isla-pequena' | 'roca-a' | 'roca-b' | 'boia-tutorial';
export const SCENE_ASSETS: readonly SceneAsset[] = [
  'isla-evento',
  'isla-pequena',
  'roca-a',
  'roca-b',
  'boia-tutorial',
];

export interface SceneObject {
  id: string;
  asset: SceneAsset;
  x: number;
  y: number;
  /** Fracción de la duración en la que empieza a aparecer (no aplica a `isla-evento`). */
  appearAt: number;
}

export const SHIP_VIEWS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'] as const;
export type ShipView = (typeof SHIP_VIEWS)[number];

export interface IntroConfig {
  version: typeof INTRO_CONFIG_VERSION;
  id: string;
  status: 'muestra' | 'aprobada';
  copy: { title: string };
  durationMs: number;
  /** Si la escena no está lista en este tiempo desde la carga, se muestra la landing ligera. */
  loadBudgetMs: number;
  easing: Easing;
  phases: {
    /** Planeta quieto con flotación y nubes que giran. */
    planet: Span;
    /** Acercamiento de cámara. */
    approach: Span;
    /** Revelación: el mar plano sustituye al planeta. */
    reveal: Span;
    /** Llegada: entra la landing (titular, botones, navegación). */
    arrival: Span;
    /** El título «BOIA.PLANET» se desvanece en este tramo. */
    titleOut: Span;
  };
  planet: {
    /** Diámetro del globo como fracción del lado corto de la vista. */
    fit: number;
    /** Punto de la vista donde cae el centro del globo. */
    anchor: readonly [number, number];
    /** Amplitud de la flotación, px de pantalla. */
    floatPx: number;
    /** Giro de las nubes en toda la secuencia, grados. */
    cloudTurnDeg: number;
    /**
     * Aumento del arte del globo (px de pantalla por px de imagen) en el que
     * la banda de mar, más nítida, sustituye al globo.
     */
    bandFromMagnification: Span;
  };
  framings: readonly Framing[];
  reduced: { fadeMs: number };
  ship: {
    /** Eslora en pantalla a escala de juego (D-15). */
    lengthPx: number;
    view: ShipView;
    x: number;
    y: number;
    /** Balanceo vertical, px de pantalla. 0 lo apaga. */
    bobPx: number;
    appearAt: number;
  };
  objects: readonly SceneObject[];
}

/** Configuración de muestra v1 (3 s, §4.4). */
export const DEFAULT_INTRO_CONFIG: IntroConfig = {
  version: INTRO_CONFIG_VERSION,
  id: 'entrada-muestra-v1',
  status: 'muestra',
  copy: { title: 'BOIA.PLANET' },
  durationMs: 3000,
  loadBudgetMs: 2000,
  easing: 'easeInOutCubic',
  phases: {
    planet: [0, 0.2],
    approach: [0.2, 0.8],
    reveal: [0.5, 0.8],
    arrival: [0.8, 1],
    titleOut: [0.2, 0.38],
  },
  planet: {
    fit: 0.62,
    anchor: [0.5, 0.56],
    floatPx: 4,
    cloudTurnDeg: 10,
    bandFromMagnification: [0.45, 0.75],
  },
  framings: [
    { minWidth: 0, zoom: 0.72, anchor: [0.5, 0.27] },
    { minWidth: 900, zoom: 1, anchor: [0.5, 0.32] },
  ],
  reduced: { fadeMs: 400 },
  ship: { lengthPx: 48, view: 'W', x: 560, y: 150, bobPx: 1.5, appearAt: 0.66 },
  objects: [
    { id: 'isla-evento', asset: 'isla-evento', x: 0, y: 0, appearAt: 0 },
    { id: 'boia', asset: 'boia-tutorial', x: 1040, y: 420, appearAt: 0.7 },
    { id: 'isla-pequena', asset: 'isla-pequena', x: -1700, y: 420, appearAt: 0.6 },
    { id: 'roca-norte', asset: 'roca-b', x: 1250, y: -560, appearAt: 0.62 },
    { id: 'roca-oeste', asset: 'roca-a', x: -900, y: -380, appearAt: 0.64 },
    { id: 'roca-sur', asset: 'roca-a', x: 1900, y: 700, appearAt: 0.66 },
  ],
};

export type ConfigResult = { ok: true; config: IntroConfig } | { ok: false; error: string };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isFrac = (v: unknown): v is number => isNum(v) && v >= 0 && v <= 1;
const isSpan = (v: unknown): v is Span =>
  Array.isArray(v) && v.length === 2 && isFrac(v[0]) && isFrac(v[1]) && v[0] <= v[1];
const isPoint = (v: unknown): v is readonly [number, number] =>
  Array.isArray(v) && v.length === 2 && isFrac(v[0]) && isFrac(v[1]);

/**
 * Valida un documento de configuración de entrada. Sin dependencias (el
 * motor no carga zod) y con mensajes que dicen qué campo falla.
 */
export function validateIntroConfig(input: unknown): ConfigResult {
  const errors: string[] = [];
  const need = (cond: boolean, path: string, what: string) => {
    if (!cond) errors.push(`${path}: ${what}`);
  };
  if (!isObj(input)) return { ok: false, error: 'la configuración no es un objeto' };
  const c = input;

  need(c.version === INTRO_CONFIG_VERSION, 'version', `debe ser ${INTRO_CONFIG_VERSION}`);
  need(typeof c.id === 'string' && c.id.length > 0, 'id', 'texto no vacío');
  need(c.status === 'muestra' || c.status === 'aprobada', 'status', 'muestra | aprobada');
  need(
    isObj(c.copy) && typeof c.copy.title === 'string' && c.copy.title.trim().length > 0,
    'copy.title',
    'texto no vacío',
  );
  need(
    isNum(c.durationMs) && c.durationMs >= 500 && c.durationMs <= 10_000,
    'durationMs',
    '500–10000',
  );
  need(
    isNum(c.loadBudgetMs) && c.loadBudgetMs >= 0 && c.loadBudgetMs <= 10_000,
    'loadBudgetMs',
    '0–10000',
  );
  need(EASINGS.includes(c.easing as Easing), 'easing', EASINGS.join(' | '));

  if (isObj(c.phases)) {
    for (const k of ['planet', 'approach', 'reveal', 'arrival', 'titleOut'] as const) {
      need(isSpan(c.phases[k]), `phases.${k}`, '[inicio, fin] en 0..1, inicio ≤ fin');
    }
    const arrival = c.phases.arrival;
    need(!isSpan(arrival) || arrival[1] === 1, 'phases.arrival', 'debe acabar en 1');
  } else errors.push('phases: objeto');

  if (isObj(c.planet)) {
    const p = c.planet;
    need(isNum(p.fit) && p.fit > 0 && p.fit <= 1.5, 'planet.fit', '0–1,5');
    need(isPoint(p.anchor), 'planet.anchor', '[x, y] en 0..1');
    need(isNum(p.floatPx) && p.floatPx >= 0 && p.floatPx <= 24, 'planet.floatPx', '0–24');
    need(isNum(p.cloudTurnDeg) && Math.abs(p.cloudTurnDeg) <= 90, 'planet.cloudTurnDeg', '±90');
    const b = p.bandFromMagnification;
    need(
      Array.isArray(b) && b.length === 2 && isNum(b[0]) && isNum(b[1]) && b[0] > 0 && b[0] < b[1],
      'planet.bandFromMagnification',
      '[desde, hasta] con 0 < desde < hasta',
    );
  } else errors.push('planet: objeto');

  if (Array.isArray(c.framings) && c.framings.length > 0) {
    c.framings.forEach((f: unknown, i) => {
      const ok =
        isObj(f) &&
        isNum(f.minWidth) &&
        f.minWidth >= 0 &&
        isNum(f.zoom) &&
        f.zoom > 0.1 &&
        f.zoom <= 4 &&
        isPoint(f.anchor);
      need(ok, `framings[${i}]`, '{ minWidth ≥ 0, zoom 0,1–4, anchor [x, y] en 0..1 }');
    });
    const first = c.framings[0] as Obj | undefined;
    need(isObj(first) && first.minWidth === 0, 'framings[0].minWidth', 'debe ser 0');
    const widths = c.framings.map((f: unknown) => (isObj(f) ? f.minWidth : NaN));
    need(
      widths.every((w, i) => i === 0 || (w as number) > (widths[i - 1] as number)),
      'framings',
      'ordenados por minWidth creciente',
    );
  } else errors.push('framings: lista no vacía');

  need(
    isObj(c.reduced) &&
      isNum(c.reduced.fadeMs) &&
      c.reduced.fadeMs >= 0 &&
      c.reduced.fadeMs <= 1000,
    'reduced.fadeMs',
    '0–1000 (un fundido breve)',
  );

  if (isObj(c.ship)) {
    const s = c.ship;
    need(isNum(s.lengthPx) && s.lengthPx >= 16 && s.lengthPx <= 128, 'ship.lengthPx', '16–128');
    need(SHIP_VIEWS.includes(s.view as ShipView), 'ship.view', SHIP_VIEWS.join(' | '));
    need(isNum(s.x) && isNum(s.y), 'ship.x/y', 'números');
    need(isNum(s.bobPx) && s.bobPx >= 0 && s.bobPx <= 8, 'ship.bobPx', '0–8');
    need(isFrac(s.appearAt), 'ship.appearAt', '0..1');
  } else errors.push('ship: objeto');

  if (Array.isArray(c.objects)) {
    const ids = new Set<string>();
    c.objects.forEach((o: unknown, i) => {
      const ok =
        isObj(o) &&
        typeof o.id === 'string' &&
        SCENE_ASSETS.includes(o.asset as SceneAsset) &&
        isNum(o.x) &&
        isNum(o.y) &&
        isFrac(o.appearAt);
      need(ok, `objects[${i}]`, `{ id, asset (${SCENE_ASSETS.join(' | ')}), x, y, appearAt 0..1 }`);
      if (isObj(o) && typeof o.id === 'string') {
        need(!ids.has(o.id), `objects[${i}].id`, `repetido: ${o.id}`);
        ids.add(o.id);
      }
    });
    const hero = c.objects.filter((o: unknown) => isObj(o) && o.asset === 'isla-evento');
    need(
      hero.length === 1 && isObj(hero[0]) && hero[0].x === 0 && hero[0].y === 0,
      'objects',
      'una sola isla-evento, en (0, 0): es el polo del planeta',
    );
  } else errors.push('objects: lista');

  return errors.length > 0
    ? { ok: false, error: errors.join('\n') }
    : { ok: true, config: input as unknown as IntroConfig };
}

/** Encuadre de landing para un ancho de vista: el último cuyo `minWidth` se cumple. */
export function pickFraming(config: IntroConfig, width: number): Framing {
  let chosen = config.framings[0]!;
  for (const f of config.framings) if (width >= f.minWidth) chosen = f;
  return chosen;
}
