import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Capturas de la marca (T50) para la revisión visual. No corre con `pnpm e2e`;
 * se pide aparte:
 *
 *   RECORD_MARCA=1 pnpm e2e record-marca.spec.ts --workers=1
 *
 * Deja en docs/informes/img/:
 * - p004-t50-intro-letras-{movil,escritorio}-crudo.png: el acto 2 de la
 *   entrada en reposo, con las letras 3D sacadas del wordmark;
 * - p004-t50-landing-logo.png (escritorio) y p004-t50-landing-logo-movil.png:
 *   la cabecera con el logo;
 * - p004-t50-landing-pie-{movil,escritorio}.png: el pie con el logo grande.
 * p004-t50-intro-letras.png (el recorte de escritorio debajo del wordmark
 * original) se compone aparte, ver ESTADO.md.
 */

test.skip(!process.env.RECORD_MARCA, 'sólo con RECORD_MARCA=1');

const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../docs/informes/img',
);
const NAME: Record<string, string> = { mobile: 'movil', desktop: 'escritorio' };

test('letras de la entrada', async ({ page }, info) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__boiaIntro?.phase === 'paused', null, {
    timeout: 20_000,
  });
  await page.waitForFunction(() => window.__boiaIntro?.title.mode === '3d', null, {
    timeout: 10_000,
  });
  await page.waitForTimeout(2500);
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({
    path: path.join(OUT, `p004-t50-intro-letras-${NAME[info.project.name]}-crudo.png`),
  });
});

test('logo en la landing', async ({ page }, info) => {
  await page.goto('/?intro=0');
  await page.locator('.site-header [data-testid="brand-logo"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  mkdirSync(OUT, { recursive: true });
  const name = NAME[info.project.name];
  const logo =
    name === 'escritorio' ? 'p004-t50-landing-logo.png' : `p004-t50-landing-logo-${name}.png`;
  await page.screenshot({ path: path.join(OUT, logo) });
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `p004-t50-landing-pie-${name}.png`) });
});
