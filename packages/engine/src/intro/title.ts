import type { TitleMotion } from './config';
import { clamp01 } from './math';

/**
 * Título 3D «BOIA» del acto 2 (T27). Las letras se modelan y se iluminan en
 * Blender (`tools/blender/intro/titulo.py`): cada una girada sobre su eje
 * vertical de `yawMin` a `yawMax` en una hoja de sprites (fila = letra,
 * columna = fotograma). Aquí, código puro:
 *
 * - `resolveTitleSheet`: el manifiesto de `art/intro/titulo/` → la hoja, o
 *   un error (y entonces se queda el título plano en HTML).
 * - `titlePoses`: (movimiento, tiempo) → la pose de cada letra. Suben una a
 *   una, luego se balancean y bambolean cada una a su aire con un giro suave
 *   que les pasa la luz, en un bucle de `idle.periodMs` que cierra sin salto
 *   (todas las ondas son armónicos enteros del periodo); al aterrizar, salen
 *   una a una. Con movimiento reducido, un fotograma quieto.
 *
 * El navegador sólo compone sprites en un canvas 2D (D-05: sin 3D en el
 * navegador).
 */

export interface TitleLetter {
  char: string;
  /** Fila de la hoja. */
  row: number;
  /** Centro de la letra en la palabra y ancho de su tinta a guiñada 0 (px de la hoja). */
  centerPx: number;
  widthPx: number;
}

export interface TitleSheet {
  /** URL de la hoja (WebP con alfa). */
  url: string;
  width: number;
  height: number;
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  /** Guiñada de la primera y de la última columna, grados. */
  yawMin: number;
  yawMax: number;
  /** Altura de la mayúscula en px de la hoja. */
  capPx: number;
  letters: readonly TitleLetter[];
  /** Ancho de la palabra (de la primera tinta a la última), px de la hoja. */
  wordWidthPx: number;
}

/** Manifiesto del título (lo lee la web al construir la página). */
export const TITLE_MANIFEST_ID = 'intro/titulo';

export type TitleSheetResult = { ok: true; sheet: TitleSheet } | { ok: false; error: string };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const pos = (v: unknown): v is number => num(v) && v > 0;

/**
 * @param text el título de la configuración: si no es el de la hoja (se
 *   cambió el texto y no se volvió a renderizar), no hay título 3D.
 */
export function resolveTitleSheet(
  manifest: unknown,
  baseUrl: string,
  text: string,
): TitleSheetResult {
  const fail = (error: string): TitleSheetResult => ({ ok: false, error });
  if (!isObj(manifest)) return fail(`falta el manifiesto ${TITLE_MANIFEST_ID}`);
  if (manifest.kind !== 'title-sheet') return fail('kind no es title-sheet');
  if (manifest.text !== text)
    return fail(`la hoja dice ${String(manifest.text)} y el título, ${text}`);
  const images = isObj(manifest.images) ? manifest.images : {};
  const sheet = isObj(manifest.sheet) ? manifest.sheet : {};
  const frames = isObj(manifest.frames) ? manifest.frames : {};
  const word = isObj(manifest.word) ? manifest.word : {};
  const cell = Array.isArray(sheet.cell) ? sheet.cell : [];
  const yaw = Array.isArray(frames.yaw_deg) ? frames.yaw_deg : [];
  const file = images.webp;
  if (typeof file !== 'string' || !file) return fail('images.webp');
  const { width, height, cols, rows } = sheet;
  const [cellW, cellH] = cell;
  if (!pos(width) || !pos(height) || !pos(cols) || !pos(rows) || !pos(cellW) || !pos(cellH))
    return fail('sheet');
  if (width !== cols * cellW || height !== rows * cellH) return fail('sheet: la rejilla no cuadra');
  const [yawMin, yawMax] = yaw;
  if (!num(yawMin) || !num(yawMax) || yawMin >= yawMax || frames.count !== cols || cols < 2)
    return fail('frames');
  if (!pos(manifest.cap_px) || !pos(word.width_px)) return fail('cap_px / word');
  const raw = Array.isArray(manifest.letters) ? manifest.letters : [];
  if (raw.length !== text.length || rows !== text.length) return fail('letters');
  const letters: TitleLetter[] = [];
  for (const [i, l] of raw.entries()) {
    if (!isObj(l) || l.char !== text[i] || l.row !== i || !num(l.center_px) || !pos(l.width_px))
      return fail(`letters[${i}]`);
    letters.push({ char: text[i]!, row: i, centerPx: l.center_px, widthPx: l.width_px });
  }
  const url = `${baseUrl.replace(/\/$/, '')}/${TITLE_MANIFEST_ID}/${encodeURIComponent(file)}`;
  return {
    ok: true,
    sheet: {
      url,
      width,
      height,
      cols,
      rows,
      cellW,
      cellH,
      yawMin,
      yawMax,
      capPx: manifest.cap_px,
      letters,
      wordWidthPx: word.width_px,
    },
  };
}

export interface LetterPose {
  /** Desplazamiento desde su sitio en la palabra, en alturas de mayúscula (y hacia abajo). */
  x: number;
  y: number;
  /** Bamboleo en el plano de la pantalla, radianes. */
  roll: number;
  scale: number;
  alpha: number;
  /** Guiñada (grados) y la columna de la hoja que le corresponde. */
  yawDeg: number;
  frame: number;
}

export interface TitleClock {
  /** ms desde que el título empezó a entrar (el reloj del bucle; sigue durante la salida). */
  shownMs: number;
  /** ms desde que empezó la salida, o null. */
  exitMs: number | null;
  reduced: boolean;
}

/** Columna de la hoja más cercana a una guiñada. */
export function frameForYaw(
  yawDeg: number,
  sheet: Pick<TitleSheet, 'cols' | 'yawMin' | 'yawMax'>,
): number {
  const u = clamp01((yawDeg - sheet.yawMin) / (sheet.yawMax - sheet.yawMin));
  return Math.round(u * (sheet.cols - 1));
}

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const smooth = (u: number) => u * u * (3 - 2 * u);
/** Sube con un pequeño rebote al final (easeOutBack). */
function outBack(u: number, k: number): number {
  const v = u - 1;
  return 1 + (k + 1) * v * v * v + k * v * v;
}
/** Fase de cada letra: repartidas, sin que dos vayan a la par. */
const phase = (i: number, salt: number) => (((i + 1) * 0.618034 + salt) % 1) * TAU;

/** Momento en que la última letra termina de subir (ms desde que empieza el título). */
export function titleSettledMs(m: TitleMotion, count: number): number {
  return m.rise.delayMs + Math.max(0, count - 1) * m.rise.staggerMs + m.rise.durationMs;
}

/** Momento en que la última letra termina de salir (ms desde que empieza la salida). */
export function titleExitMs(m: TitleMotion, count: number): number {
  return Math.max(0, count - 1) * m.exit.staggerMs + m.exit.durationMs;
}

/** Pose de cada letra. `count` letras; `sheet` da la guiñada de cada columna. */
export function titlePoses(
  m: TitleMotion,
  sheet: Pick<TitleSheet, 'cols' | 'yawMin' | 'yawMax'>,
  count: number,
  clock: TitleClock,
): LetterPose[] {
  const out: LetterPose[] = [];
  for (let i = 0; i < count; i++) {
    if (clock.reduced) {
      const yawDeg = m.stillYawDeg;
      out.push({
        x: 0,
        y: 0,
        roll: 0,
        scale: 1,
        alpha: 1,
        yawDeg,
        frame: frameForYaw(yawDeg, sheet),
      });
      continue;
    }
    // Entrada: sube desde abajo, con rebote, girando hasta su guiñada de reposo.
    const r = m.rise;
    const u =
      r.durationMs > 0 ? clamp01((clock.shownMs - r.delayMs - i * r.staggerMs) / r.durationMs) : 1;
    const up = outBack(u, r.overshoot);
    let y = r.from * (1 - up);
    let alpha = clamp01(u / Math.max(1e-6, r.fadeShare));
    let scale = r.scaleFrom + (1 - r.scaleFrom) * smooth(u);
    let yawDeg = m.idle.restYawDeg + r.spinDeg * (1 - smooth(u));

    // Reposo: balanceo, bamboleo y giro, armónicos enteros del periodo (bucle sin salto).
    const w = TAU * (clock.shownMs / m.idle.periodMs);
    const env = smooth(u);
    y += env * m.idle.bob * Math.sin(w + phase(i, 0.11));
    let roll = env * m.idle.rollDeg * DEG * Math.sin(2 * w + phase(i, 0.47));
    yawDeg += env * m.idle.yawDeg * Math.sin(w + phase(i, 0.73));

    // Salida: un saltito y se hunde, una a una, girando hacia el final de la hoja.
    if (clock.exitMs !== null) {
      const e = m.exit;
      const v = e.durationMs > 0 ? clamp01((clock.exitMs - i * e.staggerMs) / e.durationMs) : 1;
      y += -4 * e.hop * v * (1 - v) + e.drop * v * v * v;
      roll += (i % 2 === 0 ? -1 : 1) * e.rollDeg * DEG * v;
      yawDeg += (sheet.yawMax - yawDeg) * smooth(v);
      scale *= 1 - e.shrink * v;
      alpha *= 1 - smooth(clamp01((v - 0.45) / 0.55));
    }
    out.push({ x: 0, y, roll, scale, alpha, yawDeg, frame: frameForYaw(yawDeg, sheet) });
  }
  return out;
}
