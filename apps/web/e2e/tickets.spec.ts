import { canBuy } from '@boia/contracts';
import { SAMPLE_ACHIEVEMENTS, SAMPLE_EVENTS } from '@boia/store';
import { expect, test, type Page } from '@playwright/test';
import { SAMPLE_CONTENT } from '../lib/landing/sample-content';
import { CHECKOUT_COPY } from '../lib/ticketing/copy';
import { TICKET_TRIGGER } from '../lib/ticketing/sandbox';

/**
 * Compra de prueba (T25, D-20, REQ-COM-035), sin ticketera ni servidor:
 * se compra un evento desde el panel de Tickets de la landing y el de la isla
 * desde su panel en el mar; los dos sellos aparecen en Mi Carnet. Corre en
 * móvil 360×640 y en escritorio.
 */

// El evento de la isla (el de la isla de la demo) y otro a la venta sin isla.
const islandEvent = SAMPLE_CONTENT.events.find((e) => canBuy(e) && e.islandId)!;
const landingEvent = SAMPLE_CONTENT.events.find((e) => canBuy(e) && !e.islandId)!;
// Mi Carnet lee los nombres del repositorio.
const storeName = (id: string) => SAMPLE_EVENTS.find((e) => e.id === id)!.name;
const ticketAchievement = SAMPLE_ACHIEVEMENTS.find((a) => a.trigger === TICKET_TRIGGER)!;
// En la landing el checkout y el repositorio se cargan al pulsar.
const CHECKOUT_LOAD = 20_000;

async function gameRunning(page: Page) {
  await expect(page.getByTestId('hud')).toContainText(/\d+ fps/, { timeout: 30_000 });
}

test('landing → compra de prueba → Mi Carnet; isla → compra de prueba → los dos sellos', async ({
  page,
}, info) => {
  test.setTimeout(150_000);
  expect(islandEvent, 'hay un evento a la venta con isla').toBeDefined();
  expect(landingEvent, 'hay otro evento a la venta').toBeDefined();

  // Landing → Tickets → «Comprar entradas». Con un parámetro, sin cinemática (D-21).
  await page.goto('/?intro=0');
  await page.locator('.hero').getByRole('link', { name: 'Tickets', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Elige tu evento' });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: CHECKOUT_COPY.buyAria(landingEvent.name) }).click();

  // El checkout se rotula como prueba y enseña evento, precio y total.
  const checkout = page.getByTestId('checkout');
  await expect(checkout.getByTestId('checkout-confirmar')).toBeVisible({ timeout: CHECKOUT_LOAD });
  await expect(checkout.getByTestId('checkout-prueba')).toHaveText(CHECKOUT_COPY.kicker);
  await expect(checkout.getByTestId('checkout-evento')).toHaveText(landingEvent.name);
  await expect(checkout.getByTestId('checkout-aviso')).toContainText('este navegador');
  await expect(checkout.getByTestId('checkout-total')).toContainText('€');
  await expect(checkout.getByTestId('checkout-sin-descuento')).toBeVisible();
  await checkout.getByTestId('checkout-confirmar').click();
  const result = checkout.getByTestId('checkout-resultado');
  await expect(result).toContainText(CHECKOUT_COPY.stamp.granted);
  await expect(checkout.getByTestId('checkout-logro')).toContainText(ticketAchievement.title);

  // «Ver Mi Carnet»: el juego abre en Mi Carnet; al crearlo, el sello ya está.
  await checkout.getByTestId('checkout-carnet').click();
  await expect(page).toHaveURL(/\/juego\?menu=carnet/);
  await gameRunning(page);
  const menu = page.getByTestId('menu');
  await menu.getByTestId('carnet-crear').click();
  await menu.getByTestId('carnet-apodo-input').fill(`Compradora ${info.project.name}`);
  await menu.getByTestId('carnet-guardar').click();
  const stamps = menu.getByTestId('carnet-sellos');
  await expect(stamps).toContainText(storeName(landingEvent.id));
  await expect(stamps).not.toContainText(storeName(islandEvent.id));
  await menu.getByRole('button', { name: 'Cerrar menú' }).click();
  await expect(menu).toBeHidden();

  // Rumbo norte hasta la isla del evento: su panel ofrece la compra de prueba.
  await page.keyboard.down('ArrowUp');
  const islandPanel = page.getByTestId('panel-evento');
  await expect(islandPanel).toBeVisible({ timeout: 45_000 });
  const buy = islandPanel.getByTestId('panel-evento-comprar');
  await expect(buy).toBeVisible({ timeout: 10_000 });
  await page.keyboard.up('ArrowUp');
  await buy.click();

  await expect(checkout.getByTestId('checkout-confirmar')).toBeVisible({ timeout: CHECKOUT_LOAD });
  await expect(checkout.getByTestId('checkout-prueba')).toBeVisible();
  await expect(checkout.getByTestId('checkout-evento')).toHaveText(storeName(islandEvent.id));
  await checkout.getByTestId('checkout-confirmar').click();
  await expect(checkout.getByTestId('checkout-resultado')).toContainText(
    CHECKOUT_COPY.stamp.granted,
  );
  // El logro de la entrada ya estaba: no se repite.
  await expect(checkout.getByTestId('checkout-logro')).toHaveCount(0);
  // El aviso del mar.
  await expect(page.getByTestId('aviso').first()).toBeVisible();

  await checkout.getByTestId('checkout-carnet').click();
  await expect(checkout).toBeHidden();
  const sellos = page.getByTestId('menu').getByTestId('carnet-sellos');
  await expect(sellos).toContainText(storeName(landingEvent.id));
  await expect(sellos).toContainText(storeName(islandEvent.id));
  await expect(sellos.locator('li')).toHaveCount(2);
});
