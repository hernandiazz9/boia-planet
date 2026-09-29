import { expect, test } from '@playwright/test';

/**
 * El mar 3D (/mar): arranca sin errores, pasa a la vista de mapa, el rótulo
 * de la isla del evento abre su ficha y «Navegar aquí» fija el rumbo. Y la
 * landing lo enlaza junto a EXPLORAR. Móvil y escritorio.
 */

test('el mar 3D arranca, pasa a mapa y fija rumbo a la isla del evento', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/mar');
  await expect(page.getByTestId('mar-canvas')).toBeVisible();
  await expect(page.locator('.mar-splash')).toHaveCount(0, { timeout: 30_000 });

  await page.getByTestId('mar-mapa').click();
  await page.locator('[data-pin="allday"]').click();
  await expect(page.getByTestId('mar-ficha')).toContainText('Navegar aquí');
  await page.getByTestId('mar-rumbo').click();
  await expect(page.getByTestId('mar-rumbo-activo')).toBeVisible();
  expect(errors).toEqual([]);
});

test('la landing enlaza el mar 3D', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('cta-3d')).toHaveAttribute('href', '/mar');
});
