/**
 * Configuración versionada de la entrada (REQ-ENT-015): tiempos, curvas,
 * encuadres por ancho de vista, textos, punto de aterrizaje y variante
 * reducida. Es un documento de datos separado de los recursos (los
 * manifiestos de `art/` y el mundo) y de los bloques de la landing; el Admin
 * podrá editarlo en L2 (REQ-ENT-016). Todos los valores son `muestra` hasta
 * que Hernán y Álvaro revisen la entrada en móviles reales (D-19, P6).
 *
 * v2 (T14, D-19): intro «mini-mundo» en tres actos (docs/propuestas/
 * 2026-09-28-intro-mini-mundo.md §5):
 * 0. carga, sólo si hace falta (boia dibujada y «Cargando»);
 * 1. aparición: el mundo real enrollado en una esfera sube, crece y gira;
 * 2. pausa: «BOIA» y el botón de entrar; no avanza sola (salvo el avance
 *    automático, apagado hasta que Hernán lo confirme);
 * 3. aterrizaje: gira hasta el punto de aterrizaje, acerca con aceleración y
 *    frenada y aplana la curvatura (k 1 → 0) hasta el isométrico del juego.
 *
 * Unidades:
 * - Tiempos: ms. Tramos dentro de un acto: fracciones del acto (0..1).
 * - Mundo: coordenadas del mundo (`@boia/world`); en pantalla, px de juego a
 *   zoom 1 (`worldToScreen`).
 * - `zoom` de un encuadre: múltiplo de la escala de juego (D-15).
 */

export const INTRO_CONFIG_VERSION = 2 as const;

export type Easing = 'linear' | 'easeInOutSine' | 'easeInOutCubic';
export const EASINGS: readonly Easing[] = ['linear', 'easeInOutSine', 'easeInOutCubic'];

/** Tramo [inicio, fin] como fracciones de un acto. */
export type Span = readonly [number, number];

export interface Framing {
  /** Se usa a partir de este ancho de vista (px CSS). */
  minWidth: number;
  /** Llegada: múltiplo de la escala de juego. */
  zoom: number;
  /** Llegada: punto de la vista (fracciones de ancho y alto) donde cae el punto de aterrizaje. */
  anchor: readonly [number, number];
  /** Mini-mundo: diámetro como fracción del lado corto de la vista. */
  planetFit: number;
  /** Mini-mundo: centro, fracciones de la vista. */
  planetAnchor: readonly [number, number];
  /** Título «BOIA»: centro vertical, fracción del alto. */
  titleY: number;
  /** Botón de entrar: centro vertical, fracción del alto. */
  buttonY: number;
}

export const SHIP_VIEWS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'] as const;
export type ShipView = (typeof SHIP_VIEWS)[number];

export interface IntroConfig {
  version: typeof INTRO_CONFIG_VERSION;
  id: string;
  status: 'muestra' | 'aprobada';
  copy: {
    /** Título de la cinemática (REQ-ENT-003). */
    title: string;
    /** Botón de entrar. muestra: lo aprueba Álvaro (D-19, P9). */
    enter: string;
    /** Enlace a Tickets visible desde el primer momento (REQ-ENT-002). */
    ticketsOnly: string;
    /** Acto 0. */
    loading: string;
  };
  /** Si la escena no está lista en este tiempo desde la carga, se muestra la landing ligera. */
  loadBudgetMs: number;
  /** Acto 0: la boia y «Cargando» sólo aparecen si la carga pasa de este tiempo. */
  loading: { showAfterMs: number };
  /** Acto 1. */
  appear: {
    durationMs: number;
    easing: Easing;
    /** Parte desde tantas alturas de vista por debajo de su sitio. */
    riseFrom: number;
    /** Tamaño inicial como fracción del final. */
    growFrom: number;
  };
  /** Giro lento del mini-mundo (actos 1 y 2). */
  spin: {
    /** Segundos por vuelta. */
    periodS: number;
    /** Inclinación en reposo: se ve un poco desde arriba, grados. */
    tiltDeg: number;
  };
  clouds: {
    /** Las nubes giran este múltiplo del giro del suelo (> 1: más rápido). */
    speed: number;
    /** Opacidad máxima. */
    opacity: number;
    /** Número de nubes y semilla del dibujo (siempre las mismas). */
    count: number;
    seed: number;
    /** Altura de la capa sobre el suelo, fracción del radio. */
    lift: number;
  };
  /** Acto 2. */
  pause: {
    /** Fundido de entrada de título y botón, ms. */
    uiInMs: number;
    /**
     * Avance automático sin interacción. Implementado pero apagado hasta que
     * Hernán lo confirme (propuesta §5, acto 2).
     */
    autoAdvance: { enabled: boolean; afterMs: number };
  };
  /** Acto 3. */
  landing: {
    durationMs: number;
    easing: Easing;
    /** Parte del acto en la que el mini-mundo termina de girar hasta el punto. */
    turnShare: number;
    /** Tramo del acto en el que se van título y botón. */
    uiOut: Span;
    /** Tramo del acto en el que se van las nubes. */
    cloudsOut: Span;
    /** Tramo del acto en el que el mundo vivo sustituye a la esfera (ya casi plana). */
    live: Span;
    /** Tramo del acto en el que entra la landing encima (titular, botones, navegación). */
    content: Span;
  };
  /**
   * Punto de aterrizaje en coordenadas del mundo. muestra: la isla de evento
   * del mundo de muestra, con el encuadre de llegada de T03 (D-19 §4.3).
   */
  landingPoint: { x: number; y: number };
  framings: readonly Framing[];
  /** Movimiento reducido: mini-mundo quieto, título y botón; al pulsar, este fundido. */
  reduced: { fadeMs: number };
  /** Textura del mundo en la esfera: ancho en px (el alto sale del mundo). */
  texturePx: number;
  ship: {
    /** Eslora en pantalla a escala de juego (D-15). */
    lengthPx: number;
    view: ShipView;
    /** Posición respecto al punto de aterrizaje, px de juego a zoom 1. */
    dx: number;
    dy: number;
    /** Balanceo vertical, px de pantalla. 0 lo apaga. */
    bobPx: number;
  };
}

/** Configuración de muestra v2 (D-19). */
export const DEFAULT_INTRO_CONFIG: IntroConfig = {
  version: INTRO_CONFIG_VERSION,
  id: 'entrada-mini-mundo-muestra-v2',
  status: 'muestra',
  copy: {
    title: 'BOIA',
    enter: 'Zarpar',
    ticketsOnly: 'Solo quiero ver las entradas',
    loading: 'Cargando',
  },
  loadBudgetMs: 2000,
  loading: { showAfterMs: 250 },
  appear: { durationMs: 2000, easing: 'easeInOutCubic', riseFrom: 0.55, growFrom: 0.35 },
  spin: { periodS: 40, tiltDeg: 16 },
  clouds: { speed: 1.8, opacity: 0.8, count: 16, seed: 7, lift: 0.035 },
  pause: { uiInMs: 450, autoAdvance: { enabled: false, afterMs: 8000 } },
  landing: {
    durationMs: 2000,
    easing: 'easeInOutCubic',
    turnShare: 0.55,
    uiOut: [0, 0.12],
    cloudsOut: [0.05, 0.4],
    live: [0.9, 0.97],
    content: [0.8, 1],
  },
  landingPoint: { x: 600, y: 760 },
  framings: [
    {
      minWidth: 0,
      zoom: 0.72,
      anchor: [0.5, 0.27],
      planetFit: 0.8,
      planetAnchor: [0.5, 0.47],
      titleY: 0.14,
      buttonY: 0.8,
    },
    {
      minWidth: 900,
      zoom: 1,
      anchor: [0.5, 0.32],
      planetFit: 0.6,
      planetAnchor: [0.5, 0.5],
      titleY: 0.12,
      buttonY: 0.86,
    },
  ],
  reduced: { fadeMs: 400 },
  texturePx: 2048,
  ship: { lengthPx: 48, view: 'W', dx: 150, dy: 45, bobPx: 1.5 },
};

export type ConfigResult = { ok: true; config: IntroConfig } | { ok: false; error: string };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isFrac = (v: unknown): v is number => isNum(v) && v >= 0 && v <= 1;
const inRange = (v: unknown, lo: number, hi: number): v is number => isNum(v) && v >= lo && v <= hi;
const isSpan = (v: unknown): v is Span =>
  Array.isArray(v) && v.length === 2 && isFrac(v[0]) && isFrac(v[1]) && v[0] <= v[1];
const isPoint = (v: unknown): v is readonly [number, number] =>
  Array.isArray(v) && v.length === 2 && isFrac(v[0]) && isFrac(v[1]);
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/**
 * Valida un documento de configuración de entrada. Sin dependencias (el
 * motor no carga zod) y con mensajes que dicen qué campo falla.
 */
export function validateIntroConfig(input: unknown): ConfigResult {
  const errors: string[] = [];
  const need = (cond: boolean, path: string, what: string) => {
    if (!cond) errors.push(`${path}: ${what}`);
  };
  const obj = (v: unknown, path: string): Obj => {
    if (isObj(v)) return v;
    errors.push(`${path}: objeto`);
    return {};
  };
  if (!isObj(input)) return { ok: false, error: 'la configuración no es un objeto' };
  const c = input;

  need(c.version === INTRO_CONFIG_VERSION, 'version', `debe ser ${INTRO_CONFIG_VERSION}`);
  need(isText(c.id), 'id', 'texto no vacío');
  need(c.status === 'muestra' || c.status === 'aprobada', 'status', 'muestra | aprobada');

  const copy = obj(c.copy, 'copy');
  for (const k of ['title', 'enter', 'ticketsOnly', 'loading'] as const) {
    need(isText(copy[k]), `copy.${k}`, 'texto no vacío');
  }

  need(inRange(c.loadBudgetMs, 0, 10_000), 'loadBudgetMs', '0–10000');
  need(inRange(obj(c.loading, 'loading').showAfterMs, 0, 2000), 'loading.showAfterMs', '0–2000');

  const appear = obj(c.appear, 'appear');
  need(inRange(appear.durationMs, 200, 6000), 'appear.durationMs', '200–6000');
  need(EASINGS.includes(appear.easing as Easing), 'appear.easing', EASINGS.join(' | '));
  need(inRange(appear.riseFrom, 0, 2), 'appear.riseFrom', '0–2');
  need(inRange(appear.growFrom, 0.05, 1), 'appear.growFrom', '0,05–1');

  const spin = obj(c.spin, 'spin');
  need(inRange(spin.periodS, 4, 600), 'spin.periodS', '4–600');
  need(inRange(spin.tiltDeg, -60, 60), 'spin.tiltDeg', '±60');

  const clouds = obj(c.clouds, 'clouds');
  need(inRange(clouds.speed, 0, 10), 'clouds.speed', '0–10');
  need(isFrac(clouds.opacity), 'clouds.opacity', '0..1');
  need(
    Number.isInteger(clouds.count) && inRange(clouds.count, 0, 64),
    'clouds.count',
    'entero 0–64',
  );
  need(isNum(clouds.seed), 'clouds.seed', 'número');
  need(inRange(clouds.lift, 0, 0.2), 'clouds.lift', '0–0,2');

  const pause = obj(c.pause, 'pause');
  need(inRange(pause.uiInMs, 0, 3000), 'pause.uiInMs', '0–3000');
  const auto = obj(pause.autoAdvance, 'pause.autoAdvance');
  need(typeof auto.enabled === 'boolean', 'pause.autoAdvance.enabled', 'true | false');
  need(inRange(auto.afterMs, 1000, 120_000), 'pause.autoAdvance.afterMs', '1000–120000');

  const landing = obj(c.landing, 'landing');
  need(inRange(landing.durationMs, 300, 8000), 'landing.durationMs', '300–8000');
  need(EASINGS.includes(landing.easing as Easing), 'landing.easing', EASINGS.join(' | '));
  need(
    isNum(landing.turnShare) && landing.turnShare > 0 && landing.turnShare <= 1,
    'landing.turnShare',
    '(0, 1]',
  );
  for (const k of ['uiOut', 'cloudsOut', 'live', 'content'] as const) {
    need(isSpan(landing[k]), `landing.${k}`, '[inicio, fin] en 0..1, inicio ≤ fin');
  }
  const content = landing.content;
  need(!isSpan(content) || content[1] === 1, 'landing.content', 'debe acabar en 1');

  const lp = obj(c.landingPoint, 'landingPoint');
  need(isNum(lp.x) && isNum(lp.y), 'landingPoint', '{ x, y } en coordenadas del mundo');

  if (Array.isArray(c.framings) && c.framings.length > 0) {
    c.framings.forEach((f: unknown, i) => {
      const ok =
        isObj(f) &&
        inRange(f.minWidth, 0, Infinity) &&
        isNum(f.zoom) &&
        f.zoom > 0.1 &&
        f.zoom <= 4 &&
        isPoint(f.anchor) &&
        isNum(f.planetFit) &&
        f.planetFit > 0.1 &&
        f.planetFit <= 1.2 &&
        isPoint(f.planetAnchor) &&
        isFrac(f.titleY) &&
        isFrac(f.buttonY);
      need(
        ok,
        `framings[${i}]`,
        '{ minWidth ≥ 0, zoom 0,1–4, anchor, planetFit 0,1–1,2, planetAnchor, titleY, buttonY }',
      );
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
    inRange(obj(c.reduced, 'reduced').fadeMs, 0, 1000),
    'reduced.fadeMs',
    '0–1000 (un fundido breve)',
  );
  need(
    Number.isInteger(c.texturePx) && inRange(c.texturePx, 512, 4096),
    'texturePx',
    'entero 512–4096',
  );

  const s = obj(c.ship, 'ship');
  need(inRange(s.lengthPx, 16, 128), 'ship.lengthPx', '16–128');
  need(SHIP_VIEWS.includes(s.view as ShipView), 'ship.view', SHIP_VIEWS.join(' | '));
  need(isNum(s.dx) && isNum(s.dy), 'ship.dx/dy', 'números');
  need(inRange(s.bobPx, 0, 8), 'ship.bobPx', '0–8');

  return errors.length > 0
    ? { ok: false, error: errors.join('\n') }
    : { ok: true, config: input as unknown as IntroConfig };
}

/** Encuadre para un ancho de vista: el último cuyo `minWidth` se cumple. */
export function pickFraming(config: IntroConfig, width: number): Framing {
  let chosen = config.framings[0]!;
  for (const f of config.framings) if (width >= f.minWidth) chosen = f;
  return chosen;
}
