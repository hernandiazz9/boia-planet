import {
  chromium,
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type TestInfo,
} from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Grabación y storyboard de la entrada para la revisión visual (ENT 06,
 * REQ-ENT-023). No corre con `pnpm e2e`; se pide aparte:
 *
 *   RECORD_INTRO=1 pnpm e2e record.spec.ts --workers=1
 *
 * Deja en docs/informes/img/:
 * - p001-t03-entrada-{movil,escritorio}.webm: primera visita en tiempo real;
 * - p001-t03-storyboard-{movil,escritorio}.png: fotogramas exactos de la
 *   secuencia con reloj simulado (0, 0,6, 1,2, 1,8, 2,4 y 3,1 s), si hay ffmpeg.
 */

test.skip(!process.env.RECORD_INTRO, 'sólo con RECORD_INTRO=1');

const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../docs/informes/img',
);
const NAME: Record<string, string> = { mobile: 'movil', desktop: 'escritorio' };
// El último, un poco pasado de 3 s: el primer fotograma llega tras el primer tic.
const STORY_MS = [0, 600, 1200, 1800, 2400, 3100];

// Chromium sin cabeza pinta WebGL por software (SwiftShader): un primer
// fotograma de ~1 s y ~20 fps en el mar. Para grabar se usa la GPU del Mac
// (ANGLE sobre Metal); en otra máquina estos argumentos no hacen nada.
let gpu: Browser;
test.beforeAll(async () => {
  gpu = await chromium.launch({
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
  });
});
test.afterAll(async () => gpu?.close());

/** Opciones del proyecto (móvil o escritorio) para un contexto del navegador con GPU. */
function contextOptions(info: TestInfo, baseURL: string | undefined): BrowserContextOptions {
  const u = info.project.use;
  const o: BrowserContextOptions = { baseURL: baseURL ?? '' };
  if (u.viewport) o.viewport = u.viewport;
  if (u.deviceScaleFactor) o.deviceScaleFactor = u.deviceScaleFactor;
  if (u.isMobile !== undefined) o.isMobile = u.isMobile;
  if (u.hasTouch !== undefined) o.hasTouch = u.hasTouch;
  if (u.userAgent) o.userAgent = u.userAgent;
  return o;
}

test('grabación de la primera visita', async ({ baseURL }, info) => {
  const vp = info.project.use.viewport!;
  const tmp = mkdtempSync(path.join(tmpdir(), 'boia-intro-'));
  const ctx = await gpu.newContext({
    ...contextOptions(info, baseURL),
    recordVideo: { dir: tmp, size: vp },
  });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.waitForFunction(() => window.__boiaIntro?.phase === 'landed', null, {
    timeout: 15_000,
  });
  await page.waitForTimeout(1500);
  const video = page.video()!;
  await ctx.close();
  mkdirSync(OUT, { recursive: true });
  const dest = path.join(OUT, `p001-t03-entrada-${NAME[info.project.name]}.webm`);
  renameSync(await video.path(), dest);
  info.annotations.push({ type: 'grabación', description: dest });
});

test('storyboard con reloj simulado', async ({ baseURL }, info) => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'boia-story-'));
  const ctx = await gpu.newContext(contextOptions(info, baseURL));
  const page = await ctx.newPage();
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto('/');
  await page.waitForFunction(() => window.__boiaIntro?.phase === 'playing', null, {
    polling: 50,
  });
  const frames: string[] = [];
  let at = 0;
  for (const t of STORY_MS) {
    if (t > at) await page.clock.runFor(t - at);
    at = t;
    await page.waitForTimeout(100);
    const file = path.join(tmp, `${String(t).padStart(4, '0')}.png`);
    await page.screenshot({ path: file });
    frames.push(file);
  }
  expect((await page.evaluate(() => window.__boiaIntro))?.phase).toBe('landed');
  await ctx.close();

  const dest = path.join(OUT, `p001-t03-storyboard-${NAME[info.project.name]}.png`);
  const inputs = frames.flatMap((f) => ['-i', f]);
  const cols = info.project.name === 'mobile' ? STORY_MS.length : 3;
  // Rejilla de xstack: la celda (col, fila) empieza tras `col` anchos y `fila` altos.
  const offset = (n: number, v: 'w' | 'h') =>
    n === 0 ? '0' : Array.from({ length: n }, (_, k) => `${v}${k}`).join('+');
  const layout = frames
    .map((_, i) => `${offset(i % cols, 'w')}_${offset(Math.floor(i / cols), 'h')}`)
    .join('|');
  try {
    mkdirSync(OUT, { recursive: true });
    execFileSync('ffmpeg', [
      '-loglevel',
      'error',
      '-y',
      ...inputs,
      '-filter_complex',
      `xstack=inputs=${frames.length}:layout=${layout}:fill=white,scale='min(2400,iw)':-2`,
      dest,
    ]);
    info.annotations.push({ type: 'storyboard', description: dest });
  } catch {
    info.annotations.push({ type: 'storyboard', description: `sin ffmpeg; fotogramas en ${tmp}` });
  }
});
