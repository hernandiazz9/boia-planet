import { expect, test, type Page } from '@playwright/test';

/**
 * Entrada cinemática planeta → mar → landing (T03; REQ-ENT-001…020, ENT 01–03).
 * Cada prueba abre un contexto nuevo: sin almacenamiento, es primera visita.
 * El estado se lee de `window.__boiaIntro` (diagnóstico público de la entrada).
 */

type Diag = NonNullable<Window['__boiaIntro']>;

const diag = (page: Page) => page.evaluate(() => window.__boiaIntro ?? null);

async function waitLanded(page: Page, timeout = 10_000): Promise<Diag> {
  await page.waitForFunction(() => window.__boiaIntro?.phase === 'landed', null, { timeout });
  await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
  return (await diag(page))!;
}

const hero = (page: Page) => page.locator('.hero');
const exploreCta = (page: Page) => hero(page).getByRole('link', { name: /explorar el universo/i });
const heroTickets = (page: Page) => hero(page).getByRole('link', { name: 'Tickets', exact: true });
const ticketsPanel = (page: Page) => page.getByRole('dialog', { name: 'Elige tu evento' });
const canvases = (page: Page) => page.locator('.hero__scene canvas');

async function landingViews(page: Page) {
  return page.evaluate(() =>
    (window.__boiaAnalytics ?? [])
      .filter((e) => e.event === 'landing_view')
      .map((e) => e.properties.intro),
  );
}

/** El elemento que recibe un toque en el centro de `el` es `el` o algo suyo (ENT 02). */
async function receivesTaps(page: Page, name: string) {
  const el = hero(page).getByRole('link', { name, exact: name === 'Tickets' });
  const box = (await el.boundingBox())!;
  const hit = await page.evaluate(
    ({ x, y, name }) => {
      const t = document.elementFromPoint(x, y);
      const link = t?.closest('a');
      return link?.textContent?.toLowerCase().includes(name.toLowerCase()) ?? false;
    },
    { x: box.x + box.width / 2, y: box.y + box.height / 2, name },
  );
  expect(hit, `${name} recibe el toque`).toBe(true);
}

test('primera visita: planeta → mar → landing sin ningún clic (ENT 01, 02)', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-entry', 'intro');

  // Antes de la landing sólo hay una acción visible, y no es obligatoria: Saltar.
  const visibleActions = await page
    .locator('a:visible, button:visible, input:visible, select:visible')
    .allInnerTexts();
  expect(visibleActions).toEqual(['Saltar animación']);
  await expect(page.locator('.intro-overlay__title')).toHaveText('BOIA.PLANET');

  const d = await waitLanded(page);
  expect(d.mode).toBe('intro');
  expect(d.history).toEqual(['waiting', 'playing', 'landed']);
  expect(d.outcome).toBe('played');
  expect(d.cameraMoves, 'la cámara se movió durante la entrada').toBeGreaterThan(0);
  // ~3 s de secuencia (REQ-ENT-007), medido con el reloj del navegador. Aquí
  // sólo el mínimo: con las pruebas en paralelo y WebGL por software los
  // fotogramas se alargan; la medida limpia se toma con --workers=1 (ESTADO.md).
  expect(d.playedMs).toBeGreaterThanOrEqual(3000);
  info.annotations.push({
    type: 'medida',
    description: `secuencia ${d.playedMs?.toFixed(0)} ms; carga→landing ${d.landedAtMs?.toFixed(0)} ms`,
  });

  // Un mundo, ninguna partida, y la landing responde ya.
  expect(d.scenesCreated).toBe(1);
  expect(d.worldsAlive).toBe(1);
  expect(d.gamesStarted).toBe(0);
  await expect(canvases(page)).toHaveCount(1);
  await expect(page.locator('.intro-overlay')).toHaveCount(0);
  await expect(exploreCta(page)).toBeVisible();
  await receivesTaps(page, 'Explorar el universo');
  await receivesTaps(page, 'Tickets');
  expect(await landingViews(page)).toEqual(['played']);

  await heroTickets(page).click();
  await expect(ticketsPanel(page)).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
});

test('Saltar cinco veces y Escape: un solo mundo, la misma landing (REQ-ENT-008, ENT 03)', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__boiaIntro?.phase === 'playing');
  await page.evaluate(() => {
    const skip = document.querySelector<HTMLButtonElement>('[data-intro-skip]');
    for (let i = 0; i < 5; i++) skip?.click();
  });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  const d = await waitLanded(page, 2000);
  expect(d.outcome).toBe('skipped');
  expect(d.scenesCreated).toBe(1);
  expect(d.worldsAlive).toBe(1);
  expect(d.gamesStarted).toBe(0);
  await expect(canvases(page)).toHaveCount(1);
  expect(new URL(page.url()).pathname).toBe('/');
  expect(await landingViews(page)).toEqual(['skipped']);
  await receivesTaps(page, 'Tickets');
});

test('pestaña oculta a mitad: termina en la landing, sin animación pendiente (REQ-ENT-014)', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__boiaIntro?.phase === 'playing');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const d = await waitLanded(page, 2000);
  expect(d.outcome).toBe('played');
  expect(d.playedMs).toBeNull();
  expect(d.worldsAlive).toBe(1);
  await expect(canvases(page)).toHaveCount(1);
});

test('Atrás a mitad de la entrada: no la repite ni duplica el mundo (ENT 03)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__boiaIntro?.phase === 'playing');
  await page.goto('/legal/privacidad');
  await page.goBack();
  const d = await waitLanded(page);
  expect(d.history).not.toContain('playing');
  expect(d.gamesStarted).toBe(0);
  await expect(canvases(page)).toHaveCount(1);
});

test.describe('movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('escena quieta y fundido: la cámara no se mueve (REQ-ENT-010)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-entry', 'reduced');
    await expect(exploreCta(page)).toBeVisible();
    await page.waitForFunction(
      () => window.__boiaIntro?.sceneStatus === 'ready' && window.__boiaIntro.framesRendered > 0,
    );
    await page.waitForTimeout(800);
    const d = (await diag(page))!;
    expect(d.mode).toBe('reduced');
    expect(d.history).not.toContain('playing');
    expect(d.cameraMoves).toBe(0);
    expect(d.worldsAlive).toBe(1);
    await receivesTaps(page, 'Tickets');
  });
});

test('motor bloqueado: ilustración de la isla y Tickets funcionando (REQ-ENT-017, 038)', async ({
  page,
}) => {
  // Cualquier chunk JS con la escena de la entrada no llega.
  const blocked: string[] = [];
  await page.route(/\/_next\/static\/chunks\/.*\.js$/, async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    if (body.includes('boia-intro-scene')) {
      blocked.push(route.request().url());
      return route.abort('blockedbyclient');
    }
    return route.fulfill({ response: res, body });
  });
  await page
    .context()
    .route('https://example.com/**', (r) =>
      r.fulfill({ contentType: 'text/html', body: '<title>sandbox</title>' }),
    );

  await page.goto('/');
  const d = await waitLanded(page, 4000);
  expect(blocked.length, 'se bloqueó el bundle de la escena').toBeGreaterThan(0);
  expect(d.sceneStatus).toBe('failed');
  expect(d.worldsAlive).toBe(0);
  await expect(canvases(page)).toHaveCount(0);

  const island = page.locator('.hero__still-island');
  await expect(island).toBeVisible();
  expect(
    await island.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
  ).toBe(true);

  await heroTickets(page).click();
  await expect(ticketsPanel(page)).toBeVisible();
  const buy = ticketsPanel(page)
    .getByRole('link', { name: /comprar entradas/i })
    .first();
  await expect(buy).toBeVisible();
  const [popup] = await Promise.all([page.waitForEvent('popup'), buy.click()]);
  await popup.close();
});

test('recursos lentos: la landing ligera sale sin alargar la espera (REQ-ENT-007)', async ({
  page,
}) => {
  await page.route('**/api/art/**', async (route) => {
    await new Promise((r) => setTimeout(r, 5000));
    await route.continue().catch(() => {});
  });
  await page.goto('/', { waitUntil: 'commit' });
  const d = await waitLanded(page, 4000);
  expect(d.outcome).toBe('none');
  expect(d.history).not.toContain('playing');
  expect(d.landedAtMs).toBeLessThan(2600);
  await expect(exploreCta(page)).toBeVisible();
});

test('visita posterior, enlace directo y «Ver la introducción» (REQ-ENT-009, 011)', async ({
  page,
  browser,
}, info) => {
  await page.goto('/');
  await waitLanded(page);

  // Segunda carga: directa.
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-entry', 'direct');
  let d = await waitLanded(page);
  expect(d.history).toEqual(['landed']);

  // Enlace directo en un contexto nuevo (primera visita): directo al panel.
  const fresh = await browser.newContext({ baseURL: info.project.use.baseURL ?? '' });
  const other = await fresh.newPage();
  await other.goto('/#tickets');
  await expect(other.locator('html')).toHaveAttribute('data-entry', 'direct');
  await expect(ticketsPanel(other)).toBeVisible();
  expect((await diag(other))!.history).not.toContain('playing');
  await fresh.close();

  // Pedirla desde el pie la vuelve a reproducir.
  await page.getByRole('link', { name: 'Ver la introducción' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-entry', 'intro');
  d = await waitLanded(page);
  expect(d.history).toEqual(['waiting', 'playing', 'landed']);
});
