import { expect, test, type Page } from '@playwright/test';

/**
 * Minijuegos (T23): cada uno se abre por su ruta de prueba
 * `/juego?minijuego=<id>`, se juega hasta un final y se vuelve al mar.
 */

// Se juega en tiempo real: el cañón necesita sus diez disparos.
test.describe.configure({ timeout: 90_000 });

const layer = (page: Page) => page.getByTestId('minijuego');

async function openMinigame(page: Page, id: 'faro' | 'canon') {
  await page.goto(`/juego?minijuego=${id}`);
  await expect(layer(page)).toBeVisible({ timeout: 20_000 });
  await expect(layer(page)).toHaveAttribute('data-game', id);
  await expect(layer(page)).toHaveAttribute('data-phase', 'intro');
  await expect(page.getByTestId('minijuego-intro')).toBeVisible();
  await page.getByTestId('minijuego-empezar').click();
  await expect(layer(page)).toHaveAttribute('data-phase', 'playing');
}

async function backToSea(page: Page) {
  await expect(page.getByTestId('minijuego-final')).toBeVisible();
  await page.getByTestId('minijuego-final').getByTestId('minijuego-volver').click();
  await expect(layer(page)).toHaveCount(0);
  await expect(page.getByTestId('juego')).toBeVisible();
  await expect(page.getByTestId('minimapa')).toBeVisible();
  // Al recargar no se vuelve a abrir: la ruta de prueba se consume.
  expect(new URL(page.url()).searchParams.has('minijuego')).toBe(false);
}

test('Vigilancia del faro: tres falsas alarmas acaban la guardia y se vuelve al mar', async ({
  page,
}) => {
  await openMinigame(page, 'faro');
  await expect(page.getByTestId('minijuego-estado')).toContainText('Falsas alarmas');
  const alarm = page.getByTestId('minijuego-accion');
  await expect(alarm).toHaveText('ALARMA');
  // Al empezar, ningún barco ha llegado aún al haz: dar la alarma es una falsa alarma.
  for (let i = 0; i < 3; i++) {
    await alarm.click();
    await page.waitForTimeout(800);
  }
  await expect(layer(page)).toHaveAttribute('data-phase', 'ended');
  await expect(layer(page)).toHaveAttribute('data-outcome', 'lost');
  await expect(page.getByTestId('minijuego-final')).toContainText('falsas alarmas');
  await backToSea(page);
});

test('Cañón contra tiburones: se dispara hasta acabar las bolas y se vuelve al mar', async ({
  page,
}) => {
  await openMinigame(page, 'canon');
  await expect(page.getByTestId('minijuego-estado')).toContainText('Bolas');
  const fire = page.getByTestId('minijuego-accion');
  await expect(fire).toHaveText('FUEGO');
  // Arrastrar por el mar apunta y soltar dispara.
  const box = (await page.locator('.mg-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.2, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  // Dispara hasta que se acaben las bolas (o, con suerte, los tiburones); la recarga dura 0,7 s.
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline && (await layer(page).getAttribute('data-phase')) === 'playing') {
    await fire.click({ timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  await expect(layer(page)).toHaveAttribute('data-phase', 'ended', { timeout: 5_000 });
  await expect(layer(page)).toHaveAttribute('data-outcome', /won|lost/);
  await backToSea(page);
});

test('la pausa detiene la partida y ocultar la pestaña quita el premio', async ({ page }) => {
  await openMinigame(page, 'canon');
  await page.getByTestId('minijuego-pausa').click();
  await expect(layer(page)).toHaveAttribute('data-phase', 'paused');
  await expect(page.getByTestId('minijuego-pausada')).toBeVisible();
  await page.getByTestId('minijuego-seguir').click();
  await expect(layer(page)).toHaveAttribute('data-phase', 'playing');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(layer(page)).toHaveAttribute('data-phase', 'paused');
  await expect(layer(page)).toContainText('ya no da premio');
  await page.getByTestId('minijuego-seguir').click();
  await expect(page.getByTestId('minijuego-estado')).toContainText('sin premio');
  await page.getByTestId('minijuego-salir').click();
  await expect(layer(page)).toHaveCount(0);
  await expect(page.getByTestId('juego')).toBeVisible();
});
