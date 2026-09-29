import { expect, test, type Page } from '@playwright/test';

/**
 * Entrada «mini-mundo» en tres actos (T14, D-19; REQ-ENT-001…020, ENT 01–03).
 * La entrada depende sólo de la URL (D-21): `/` a secas la reproduce en cada
 * carga completa; una URL que apunta a algo concreto entra directa.
 * El estado se lee de `window.__boiaIntro` (diagnóstico público de la entrada).
 */

type Diag = NonNullable<Window['__boiaIntro']>;

const diag = (page: Page) => page.evaluate(() => window.__boiaIntro ?? null);
const phaseIs = (page: Page, phase: string, timeout = 15_000) =>
  page.waitForFunction((p) => window.__boiaIntro?.phase === p, phase, { timeout });

async function waitLanded(page: Page, timeout = 15_000): Promise<Diag> {
  await phaseIs(page, 'landed', timeout);
  await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
  return (await diag(page))!;
}

const hero = (page: Page) => page.locator('.hero');
const exploreCta = (page: Page) => hero(page).getByRole('link', { name: /explorar el universo/i });
const heroTickets = (page: Page) => hero(page).getByRole('link', { name: 'Tickets', exact: true });
const ticketsPanel = (page: Page) => page.getByRole('dialog', { name: 'Elige tu evento' });
const canvases = (page: Page) => page.locator('.hero__scene canvas');
const title = (page: Page) => page.locator('.intro-overlay__title');
const enterButton = (page: Page) => page.getByRole('button', { name: 'Zarpar' });
const ticketsOnly = (page: Page) =>
  page.getByRole('link', { name: 'Solo quiero ver las entradas' });
const title3d = (page: Page) => page.locator('.intro-title3d');
/** Píxeles con tinta en el canvas del título 3D. */
const titleInk = (page: Page) =>
  title3d(page).evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i]! > 0) n++;
    return n;
  });
const titlePose = async (page: Page) => (await diag(page))!.title.pose;
const opacity = (page: Page, sel: string) =>
  page.locator(sel).evaluate((el) => Number(getComputedStyle(el).opacity));

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

/** Un mundo, ninguna partida (REQ-ENT-013, 014). */
async function oneWorldNoGame(page: Page) {
  const d = (await diag(page))!;
  expect(d.scenesCreated).toBe(1);
  expect(d.worldsAlive).toBe(1);
  expect(d.gamesStarted).toBe(0);
  await expect(canvases(page)).toHaveCount(1);
  return d;
}

test('`/`: el mini-mundo, luego «BOIA» y el botón; al pulsar, aterriza en la landing (ENT 01, 02)', async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-entry', 'intro');

  // Acto 1: el mini-mundo aparece. Sólo hay dos acciones, y ninguna obligatoria.
  await phaseIs(page, 'appearing');
  await expect(canvases(page)).toHaveCount(1);
  const actions = await page
    // Sin el gancho de accesibilidad táctil de Pixi (un botón de 1 px fuera de la vista).
    .locator(
      ':is(a, button, input, select):visible:not([title="select to enable accessibility for this content"])',
    )
    .allInnerTexts();
  expect(actions).toEqual(['Solo quiero ver las entradas', 'Saltar animación']);

  // Acto 2: «BOIA» y el botón, con el foco; la pausa no avanza sola.
  await phaseIs(page, 'paused');
  await expect(title(page)).toHaveText('BOIA');
  await expect(enterButton(page)).toBeVisible();
  await expect(enterButton(page)).toBeFocused();
  // Título 3D (T27): la hoja de Blender llega después del mini-mundo y las
  // letras se ven en el canvas; se mueven solas (balanceo y giro).
  await expect(title(page)).toHaveAttribute('data-title', '3d', { timeout: 10_000 });
  await page.waitForTimeout(2500);
  expect((await diag(page))!.phase).toBe('paused');
  expect(await opacity(page, '.intro-overlay__title')).toBe(1);
  await expect(title3d(page)).toBeVisible();
  expect(await titleInk(page), 'las letras tienen tinta').toBeGreaterThan(2000);
  const t = (await diag(page))!.title;
  expect(t.requestedMs!, 'la hoja se pide después del mini-mundo').toBeGreaterThanOrEqual(
    (await diag(page))!.sceneReadyMs!,
  );
  const pose = await titlePose(page);
  await page.waitForTimeout(400);
  expect(await titlePose(page), 'las letras se mueven en reposo').not.toBe(pose);
  await expect(ticketsOnly(page)).toBeVisible();

  // Acto 3: Enter (el botón tiene el foco) → aterrizaje continuo.
  await page.keyboard.press('Enter');
  const d = await waitLanded(page);
  expect(d.history).toEqual(['waiting', 'appearing', 'paused', 'landing', 'landed']);
  expect(d.outcome).toBe('played');
  expect(d.enteredBy).toBe('button');
  expect(d.cameraMoves, 'la cámara se movió').toBeGreaterThan(0);
  // La curvatura baja de 1 a 0 sin retroceder: termina en el isométrico del juego.
  expect(d.landingK.length).toBeGreaterThan(2);
  expect(d.landingK.every((k, i) => i === 0 || k <= d.landingK[i - 1]!)).toBe(true);
  expect(d.k).toBe(0);
  // ~2 s por tramo (REQ-ENT-007), con el reloj del navegador; aquí sólo el
  // mínimo: con WebGL por software los fotogramas se alargan.
  expect(d.appearedMs).toBeGreaterThanOrEqual(2000);
  expect(d.playedMs).toBeGreaterThanOrEqual(2000);
  info.annotations.push({
    type: 'medida',
    description: `escena lista a ${d.sceneReadyMs?.toFixed(0)} ms, aparición ${d.appearedMs?.toFixed(0)} ms, aterrizaje ${d.playedMs?.toFixed(0)} ms, fotograma más largo ${d.longestFrameMs.toFixed(0)} ms · ${d.renderer}`,
  });

  // La landing sobre el mar responde ya; un mundo y ninguna partida.
  await oneWorldNoGame(page);
  await expect(page.locator('.intro-overlay')).toHaveCount(0);
  await expect(exploreCta(page)).toBeVisible();
  await receivesTaps(page, 'Explorar el universo');
  await receivesTaps(page, 'Tickets');
  expect(await landingViews(page)).toEqual(['played']);

  await heroTickets(page).click();
  await expect(ticketsPanel(page)).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
});

test('«Solo quiero ver las entradas» lleva a Tickets sin el botón ni la animación (REQ-ENT-002)', async ({
  page,
}) => {
  await page.goto('/');
  await phaseIs(page, 'appearing');
  await ticketsOnly(page).click();
  await expect(ticketsPanel(page)).toBeVisible();
  const d = await waitLanded(page, 3000);
  expect(d.outcome).toBe('skipped');
  expect(d.history).not.toContain('landing');
  expect(d.gamesStarted).toBe(0);
  expect(new URL(page.url()).pathname).toBe('/');
  expect(await landingViews(page)).toEqual(['skipped']);
});

test('botón pulsado dos veces: un solo aterrizaje, un solo mundo (ENT 03)', async ({ page }) => {
  await page.goto('/');
  await phaseIs(page, 'paused');
  await page.evaluate(() => {
    const b = document.querySelector<HTMLButtonElement>('[data-intro-enter]');
    b?.click();
    b?.click();
  });
  await page.keyboard.press('Enter');
  const d = await waitLanded(page);
  expect(d.outcome).toBe('played');
  expect(d.history.filter((p) => p === 'landing')).toHaveLength(1);
  expect(d.landingK.every((k, i) => i === 0 || k <= d.landingK[i - 1]!)).toBe(true);
  await oneWorldNoGame(page);
  expect(await landingViews(page)).toEqual(['played']);
});

test('«Saltar» cinco veces y Escape en la pausa: la misma landing (REQ-ENT-008, ENT 03)', async ({
  page,
}) => {
  await page.goto('/');
  await phaseIs(page, 'paused');
  await page.evaluate(() => {
    const skip = document.querySelector<HTMLButtonElement>('.intro-overlay__skip');
    for (let i = 0; i < 5; i++) skip?.click();
  });
  await page.keyboard.press('Escape');
  const d = await waitLanded(page, 2000);
  expect(d.outcome).toBe('skipped');
  expect(d.history).not.toContain('landing');
  await oneWorldNoGame(page);
  expect(new URL(page.url()).pathname).toBe('/');
  expect(await landingViews(page)).toEqual(['skipped']);
  await receivesTaps(page, 'Tickets');
});

test('«Saltar» durante el aterrizaje: termina una vez, sin duplicar el mundo', async ({ page }) => {
  await page.goto('/');
  await phaseIs(page, 'paused');
  await enterButton(page).click();
  await phaseIs(page, 'landing');
  await page.evaluate(() => {
    const skip = document.querySelector<HTMLButtonElement>('.intro-overlay__skip');
    skip?.click();
    skip?.click();
  });
  const d = await waitLanded(page, 2000);
  expect(d.outcome).toBe('skipped');
  await oneWorldNoGame(page);
});

test('pestaña oculta: la aparición acaba en la pausa; el aterrizaje, en la landing (REQ-ENT-014)', async ({
  page,
}) => {
  const hide = (hidden: boolean) =>
    page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => (h ? 'hidden' : 'visible'),
      });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
  await page.goto('/');
  await phaseIs(page, 'appearing');
  await hide(true);
  await phaseIs(page, 'paused', 2000);
  await hide(false);
  await page.waitForTimeout(500);
  expect((await diag(page))!.phase).toBe('paused');

  await enterButton(page).click();
  await phaseIs(page, 'landing');
  await hide(true);
  const d = await waitLanded(page, 2000);
  expect(d.outcome).toBe('played');
  expect(d.playedMs).toBeNull();
  await hide(false);
  await oneWorldNoGame(page);
});

test('Atrás en la pausa: no repite la entrada ni duplica el mundo (ENT 03)', async ({ page }) => {
  await page.goto('/');
  await phaseIs(page, 'paused');
  await page.goto('/legal/privacidad');
  await page.goBack();
  // Vuelta desde la caché del navegador (la pausa sigue) o carga nueva de `/`
  // (la entrada vuelve a empezar, D-21).
  await page.waitForFunction(() => ['paused', 'landed'].includes(window.__boiaIntro?.phase ?? ''));
  const d = (await diag(page))!;
  expect(d.history).not.toContain('landing');
  expect(d.gamesStarted).toBe(0);
  expect(d.worldsAlive).toBeLessThanOrEqual(1);
  expect(await canvases(page).count()).toBeLessThanOrEqual(1);
});

test.describe('movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('mini-mundo quieto, título y botón; al pulsar, fundido sin mover la cámara (REQ-ENT-010)', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-entry', 'reduced');
    await phaseIs(page, 'paused');
    await expect(title(page)).toHaveText('BOIA');
    await expect(enterButton(page)).toBeVisible();
    // Título 3D quieto: un solo fotograma, que no cambia (T27).
    await expect(title(page)).toHaveAttribute('data-title', '3d', { timeout: 10_000 });
    await expect(title3d(page)).toBeVisible();
    await page.waitForFunction(
      () =>
        Number(getComputedStyle(document.querySelector('.intro-overlay__title')!).opacity) === 1,
    );
    expect(await titleInk(page)).toBeGreaterThan(2000);
    const still = await titlePose(page);
    const draws = (await diag(page))!.title.draws;
    await page.waitForTimeout(800);
    expect((await diag(page))!.phase).toBe('paused');
    expect(await titlePose(page)).toBe(still);
    expect((await diag(page))!.title.draws, 'no se repinta en reposo').toBe(draws);
    await enterButton(page).click();
    const d = await waitLanded(page);
    expect(d.mode).toBe('reduced');
    expect(d.history).not.toContain('appearing');
    expect(d.outcome).toBe('played');
    expect(d.framesRendered).toBeGreaterThan(0);
    expect(d.cameraMoves).toBe(0);
    await oneWorldNoGame(page);
    await receivesTaps(page, 'Tickets');
  });
});

test('motor bloqueado: ilustración del puerto y Tickets funcionando (REQ-ENT-017, 038)', async ({
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

  // La ilustración ligera: las piezas junto al aterrizaje (el puerto, T28) y el barco.
  const pieces = page.locator('.hero__still-piece, .hero__still-ship');
  expect(await pieces.count()).toBeGreaterThan(1);
  await expect(page.locator('.hero__still-ship')).toBeVisible();
  for (const img of await pieces.all()) {
    await expect
      .poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0))
      .toBe(true);
  }

  await heroTickets(page).click();
  await expect(ticketsPanel(page)).toBeVisible();
  const buy = ticketsPanel(page)
    .getByRole('button', { name: /comprar entradas/i })
    .first();
  await expect(buy).toBeVisible();
  // Sin escena, la compra de prueba (D-20) se abre igual.
  await buy.click();
  await expect(page.getByTestId('checkout-confirmar')).toBeVisible({ timeout: 20_000 });
});

test('recursos lentos: «Cargando» y luego la landing ligera, sin alargar la espera (REQ-ENT-007)', async ({
  page,
}) => {
  await page.route('**/api/art/**', async (route) => {
    await new Promise((r) => setTimeout(r, 5000));
    await route.continue().catch(() => {});
  });
  await page.goto('/', { waitUntil: 'commit' });
  // Acto 0: la boia dibujada y «Cargando» mientras no hay escena.
  await expect(page.locator('.intro-loading')).toBeVisible();
  await expect(page.locator('.intro-loading')).toContainText('Cargando');
  await expect(ticketsOnly(page)).toBeVisible();
  const d = await waitLanded(page, 4000);
  expect(d.outcome).toBe('none');
  expect(d.history).not.toContain('appearing');
  expect(d.landedAtMs).toBeLessThan(2600);
  await expect(exploreCta(page)).toBeVisible();
});

test('cada carga completa de `/` reproduce la entrada, aunque ya se viera (D-21, REQ-ENT-009)', async ({
  page,
}) => {
  // La marca de «ya la vio» de antes de D-21 ya no cuenta.
  await page.addInitScript(() => localStorage.setItem('boia.intro.v2', 'seen'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-entry', 'intro');
  await phaseIs(page, 'paused');
  await enterButton(page).click();
  await waitLanded(page);

  // Recarga: otra vez la entrada entera.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-entry', 'intro');
  await phaseIs(page, 'paused');
  expect((await diag(page))!.history).toEqual(['waiting', 'appearing', 'paused']);

  // Y abrir `/` de nuevo, igual.
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-entry', 'intro');
  await phaseIs(page, 'paused');
});

test('una URL que apunta a algo entra directa; «Ver la introducción» la repite (REQ-ENT-009, 011)', async ({
  page,
  browser,
}, info) => {
  // Enlace directo a Tickets: directo al panel.
  const fresh = await browser.newContext({ baseURL: info.project.use.baseURL ?? '' });
  const other = await fresh.newPage();
  await other.goto('/#tickets');
  await expect(other.locator('html')).toHaveAttribute('data-entry', 'direct');
  await expect(ticketsPanel(other)).toBeVisible();
  expect((await diag(other))!.history).not.toContain('appearing');
  await fresh.close();

  // Un parámetro: directa a la landing.
  await page.goto('/?menu=carnet');
  await expect(page.locator('html')).toHaveAttribute('data-entry', 'direct');
  const d = await waitLanded(page);
  expect(d.history).toEqual(['landed']);
  await expect(page.locator('.intro-overlay')).toHaveCount(0);

  // Pedirla desde el pie la vuelve a reproducir.
  await page.getByRole('link', { name: 'Ver la introducción' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-entry', 'intro');
  await phaseIs(page, 'paused');
  expect((await diag(page))!.history).toEqual(['waiting', 'appearing', 'paused']);
});

test('volver a `/` navegando dentro de la app no repite la entrada (D-21)', async ({ page }) => {
  test.setTimeout(90_000);
  const home = page.locator('[data-hud="inicio"]');
  const backHomeWithoutIntro = async () => {
    await page.evaluate(
      () => ((window as Window & { __sinRecarga?: boolean }).__sinRecarga = true),
    );
    await home.click();
    await expect(page).toHaveURL(/\/$/);
    await page.waitForFunction(
      () => window.__boiaIntro?.mode === 'direct' && window.__boiaIntro.phase === 'landed',
    );
    expect(
      await page.evaluate(() => (window as Window & { __sinRecarga?: boolean }).__sinRecarga),
      'sin recarga',
    ).toBe(true);
    await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
    await expect(page.locator('.intro-overlay')).toHaveCount(0);
    await expect(exploreCta(page)).toBeVisible();
  };

  // `/` con su entrada → EXPLORAR → «Inicio».
  await page.goto('/');
  await phaseIs(page, 'paused');
  await page.getByRole('button', { name: 'Saltar animación' }).click();
  await waitLanded(page);
  await exploreCta(page).click();
  await expect(page).toHaveURL(/\/juego$/);
  await expect(home).toBeVisible({ timeout: 30_000 });
  await backHomeWithoutIntro();

  // Carga completa de /juego (sin script de arranque) → «Inicio».
  await page.goto('/juego');
  await expect(home).toBeVisible({ timeout: 30_000 });
  await backHomeWithoutIntro();
});
