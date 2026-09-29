import { minimapProjection } from '@boia/engine/ui';
import { WORLD_REGISTRY } from '@boia/world';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { worldIntroFor } from '../lib/intro/worlds';
import { SAMPLE_CONTENT } from '../lib/landing/sample-content';

/**
 * Demo de punta a punta (T12), con datos de muestra y sin Supabase: entrada
 * «mini-mundo» (T14; en cada carga de `/`, D-21) → landing → EXPLORAR (la
 * cámara se aleja hasta el puerto, T28) → /juego con el mismo mundo y el
 * barco en el puerto → isla de evento → menú «Barco» → artistas. Corre en móvil 360×640 y en escritorio.
 *
 * Con DEMO_SHOTS=1 guarda además capturas del recorrido en docs/informes/img/
 * (p001-t12-<paso>-<móvil|escritorio>.png).
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const SHOTS = path.join(ROOT, 'docs/informes/img');

// Estilos y skins del arte real: la prueba sigue a lo que haya en art/barco.
const shipRoot = JSON.parse(readFileSync(path.join(ROOT, 'art/barco/manifest.json'), 'utf8')) as {
  style: string;
  skins: string[];
  style_variants: { id: string }[];
};
const DEFAULT_STYLE = shipRoot.style;
const OTHER_STYLE = shipRoot.style_variants.at(-1)!.id;
const THEMED_SKIN = shipRoot.skins.find((s) => s !== 'base')!;

// El mundo por defecto (Arcilla desde T20) trae su barco y su isla de evento.
const defaultWorld = WORLD_REGISTRY.get(WORLD_REGISTRY.defaultId);
const WORLD_SHIP_STYLE = defaultWorld.theme.ship.style;
const EVENT_ID = 'ev-all-day-primavera';
const eventIsland = defaultWorld.config.objects.find((o) =>
  o.behaviors.some(
    (b) =>
      b.type === 'content' &&
      (b.params as { target?: string; ref?: string }).target === 'event' &&
      (b.params as { ref?: string }).ref === EVENT_ID,
  ),
)!;

async function shot(page: Page, info: TestInfo, name: string) {
  if (!process.env.DEMO_SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  const device = info.project.name === 'mobile' ? 'movil' : 'escritorio';
  await page.screenshot({ path: path.join(SHOTS, `p001-t12-${name}-${device}.png`) });
}

const game = (page: Page) => page.getByTestId('juego');

/** Salida del barco y puerto del mapa compartido (T20, T28). */
const SPAWN = WORLD_REGISTRY.map.spawn;

/**
 * El barco está en la salida del puerto: la flecha del minimapa cae donde el
 * minimapa proyecta la salida del mapa (a un par de px: el minimapa es pequeño).
 */
async function expectShipAtPort(page: Page) {
  const minimap = page.getByTestId('minimapa').locator('svg').first();
  await expect(minimap.locator('polygon')).toHaveCount(1, { timeout: 30_000 });
  const got = await minimap.evaluate((svg) => {
    const poly = svg.querySelector('polygon')!;
    const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(poly.getAttribute('transform') ?? '');
    return {
      w: Number(svg.getAttribute('width')),
      h: Number(svg.getAttribute('height')),
      x: Number(m?.[1]),
      y: Number(m?.[2]),
    };
  });
  const want = minimapProjection(defaultWorld.config.bounds, got.w, got.h).project(SPAWN);
  expect(Math.abs(got.x - want.x), 'barco en la salida (x del minimapa)').toBeLessThan(2);
  expect(Math.abs(got.y - want.y), 'barco en la salida (y del minimapa)').toBeLessThan(2);
}

/** El motor corre (y escucha el teclado) cuando la caja de datos da FPS. */
async function gameRunning(page: Page) {
  await expect(page.getByTestId('hud')).toContainText(/\d+ fps/, { timeout: 30_000 });
}

async function openBarco(page: Page) {
  await page.getByTestId('menu-ancla').click();
  const menu = page.getByTestId('menu');
  await menu.getByRole('tab', { name: 'Barco', exact: true }).click();
  await expect(menu.getByTestId('barco')).toBeVisible();
  return menu;
}

test('`/` → mini-mundo → «Zarpar» → landing → EXPLORAR → /juego con el mismo mundo → isla de evento', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.goto('/');
  // Entrada «mini-mundo» (T14): aparece, espera al botón y aterriza en la landing.
  await expect(page.locator('html')).toHaveAttribute('data-entry', 'intro');
  await page.waitForFunction(() => window.__boiaIntro?.phase === 'paused', null, {
    timeout: 20_000,
  });
  await page.getByRole('button', { name: 'Zarpar' }).click();
  await page.waitForFunction(() => window.__boiaIntro?.phase === 'landed', null, {
    timeout: 20_000,
  });
  await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
  const explore = page.locator('.hero').getByRole('link', { name: /explorar el universo/i });
  await expect(explore).toBeVisible();
  await page.waitForFunction(() => window.__boiaIntro?.sceneStatus === 'ready', null, {
    timeout: 20_000,
  });
  // La entrada es la del mundo activo: aterriza en su punto (el puerto, T28).
  const arrived = (await page.evaluate(() => window.__boiaIntro))!;
  expect(arrived.world).toBe(defaultWorld.id);
  expect(arrived.landingPoint).toEqual({
    x: WORLD_REGISTRY.map.introLanding.x,
    y: WORLD_REGISTRY.map.introLanding.y,
  });
  await shot(page, info, '1-landing');

  // Tickets abre el panel de muestra.
  await page.locator('.hero').getByRole('link', { name: 'Tickets', exact: true }).click();
  const tickets = page.getByRole('dialog', { name: 'Elige tu evento' });
  await expect(tickets).toBeVisible();
  await shot(page, info, '2-tickets');
  await page.keyboard.press('Escape');
  await expect(tickets).toBeHidden();

  // EXPLORAR: navegación sin recarga; el juego adopta la escena de la entrada (REQ-ENT-012).
  await page.evaluate(() => ((window as Window & { __sinRecarga?: boolean }).__sinRecarga = true));
  await explore.click();
  await expect(page).toHaveURL(/\/juego$/);
  await gameRunning(page);
  await expect(game(page)).toHaveAttribute('data-world', 'adoptado');
  expect(
    await page.evaluate(() => (window as Window & { __sinRecarga?: boolean }).__sinRecarga),
    'la página no se recargó',
  ).toBe(true);
  const intro = await page.evaluate(() => window.__boiaIntro);
  expect(intro?.explored).toBe(true);
  expect(intro?.scenesCreated).toBe(1);
  // EXPLORAR se aleja un poco hasta el puerto (T28, D-20 punto 6): el último
  // encuadre es el del juego, a su escala, con el barco y el puerto a la vista.
  const h = intro!.history;
  expect(h.indexOf('explored'), 'se alejó y luego cedió la escena').toBe(
    h.indexOf('exploring') + 1,
  );
  expect(h).toContain('exploring');
  const reveal = intro!.reveal;
  expect(reveal.finishedMs, 'el alejamiento terminó').not.toBeNull();
  // Se vio el alejamiento entero (no se saltó a /juego).
  expect(reveal.finishedMs! - reveal.startedMs!).toBeGreaterThanOrEqual(
    worldIntroFor(defaultWorld.id).explore.durationMs - 50,
  );
  expect(reveal.camera!.zoom).toBe(1);
  const view = reveal.view!;
  expect(view).toEqual(page.viewportSize());
  for (const [what, p] of [
    ['barco', reveal.ship!],
    ['puerto', reveal.port!],
  ] as const) {
    expect(p.x, `${what} a la vista (x)`).toBeGreaterThan(0);
    expect(p.x, `${what} a la vista (x)`).toBeLessThan(view.width);
    expect(p.y, `${what} a la vista (y)`).toBeGreaterThan(0);
    expect(p.y, `${what} a la vista (y)`).toBeLessThan(view.height);
  }
  // Y el juego lo recoge con el barco en la salida del puerto.
  await expectShipAtPort(page);
  // Ni segunda entrada ni un segundo canvas: uno solo, el de la landing.
  await expect(page.locator('.intro-overlay')).toHaveCount(0);
  await expect(page.locator('canvas:visible')).toHaveCount(1);
  await expect(page.getByTestId('minimapa')).toBeVisible();
  await shot(page, info, '3-juego');

  // Rumbo norte hasta la isla de evento: su proximidad abre el panel del evento.
  // El mapa de Arcilla es grande y la isla queda lejos del puerto: se sigue
  // junto a ella con `?cerca=`.
  expect(eventIsland, `el mundo ${defaultWorld.id} tiene la isla de ${EVENT_ID}`).toBeDefined();
  await page.goto(`/juego?cerca=${eventIsland.identity.id}`);
  await gameRunning(page);
  await page
    .locator('canvas:visible')
    .first()
    .focus()
    .catch(() => {});
  await page.keyboard.down('ArrowUp');
  const panel = page.getByTestId('panel-evento');
  await expect(panel).toBeVisible({ timeout: 45_000 });
  await page.keyboard.up('ArrowUp');
  const event = SAMPLE_CONTENT.events.find((e) => e.id === EVENT_ID)!;
  await expect(panel.getByRole('heading', { name: event.name })).toBeVisible();
  await shot(page, info, '4-isla');
});

test('«Barco»: otro estilo y otra skin cambian el barco al momento y sobreviven a recargar', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.goto('/juego');
  await gameRunning(page);
  // Sin elección guardada, el barco del mundo (T17).
  await expect(game(page)).toHaveAttribute('data-ship-style', WORLD_SHIP_STYLE);
  await expect(game(page)).toHaveAttribute('data-ship-skin', 'base');
  await expect(game(page)).toHaveAttribute('data-world', 'nuevo');
  // Un enlace directo a /juego empieza en limpio en el puerto del mundo activo (T28).
  await expectShipAtPort(page);

  // Otro estilo: se aplica sin recargar.
  let menu = await openBarco(page);
  await page.evaluate(() => ((window as Window & { __sinRecarga?: boolean }).__sinRecarga = true));
  await menu.getByTestId(`barco-estilo-${OTHER_STYLE}`).click();
  await expect(game(page)).toHaveAttribute('data-ship-style', OTHER_STYLE);
  await expect(menu.getByTestId(`barco-estilo-${OTHER_STYLE}`)).toHaveAttribute(
    'aria-checked',
    'true',
  );
  expect(
    await page.evaluate(() => (window as Window & { __sinRecarga?: boolean }).__sinRecarga),
  ).toBe(true);
  await shot(page, info, '5-barco-menu');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('menu')).toBeHidden();
  await shot(page, info, '6-barco-estilo');

  await page.reload();
  await gameRunning(page);
  await expect(game(page)).toHaveAttribute('data-ship-style', OTHER_STYLE);

  // El estilo por defecto del arte con una skin temática; el otro estilo no la ofrece.
  menu = await openBarco(page);
  await expect(menu.getByTestId(`barco-skin-${THEMED_SKIN}`)).toHaveCount(0);
  await menu.getByTestId(`barco-estilo-${DEFAULT_STYLE}`).click();
  await expect(game(page)).toHaveAttribute('data-ship-style', DEFAULT_STYLE);
  await menu.getByTestId(`barco-skin-${THEMED_SKIN}`).click();
  await expect(game(page)).toHaveAttribute('data-ship-skin', THEMED_SKIN);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('menu')).toBeHidden();
  await shot(page, info, '7-barco-skin');

  await page.reload();
  await gameRunning(page);
  await expect(game(page)).toHaveAttribute('data-ship-style', DEFAULT_STYLE);
  await expect(game(page)).toHaveAttribute('data-ship-skin', THEMED_SKIN);

  // ?estilo= sigue mandando (T11) y el menú lo refleja.
  await page.goto(`/juego?estilo=${OTHER_STYLE}`);
  await gameRunning(page);
  await expect(game(page)).toHaveAttribute('data-ship-style', OTHER_STYLE);
  menu = await openBarco(page);
  await expect(menu.getByTestId(`barco-estilo-${OTHER_STYLE}`)).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

test('«Ver todos los artistas» enseña los 26 artistas', async ({ page }, info) => {
  // Enlace directo: sin cinemática (REQ-ENT-011).
  await page.goto('/#artistas');
  await page.getByTestId('ver-artistas').click();
  await expect(page).toHaveURL(/\/artistas$/);
  const list = page.getByTestId('artistas-lista');
  await expect(list.locator('li')).toHaveCount(SAMPLE_CONTENT.artists.length);
  expect(SAMPLE_CONTENT.artists.length).toBe(26);
  for (const a of SAMPLE_CONTENT.artists) {
    await expect(list.getByRole('heading', { name: a.name, exact: true })).toBeVisible();
  }
  await shot(page, info, '8-artistas');
});

test.describe('sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('/artistas se abre por enlace directo y desde la landing', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('ver-artistas').click();
    await expect(page).toHaveURL(/\/artistas$/);
    await expect(page.getByTestId('artistas-lista').locator('li')).toHaveCount(
      SAMPLE_CONTENT.artists.length,
    );
  });
});
