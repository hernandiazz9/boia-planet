import { canBuy } from '@boia/contracts';
import { READABLE_MIN_MS } from '@boia/engine/ui';
import { WORLD_REGISTRY } from '@boia/world';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { marWorld, seaRoute } from '../app/mar/engine/compact';
import { periodOf, planetRect, shortest } from '../app/mar/engine/wrap';
import { SAMPLE_CONTENT } from '../lib/landing/sample-content';

/**
 * El mar 3D (/mar): arranca sin errores, pasa a la vista de mapa, el rótulo
 * de la isla del evento abre su ficha y «Navegar aquí» fija el rumbo. Y la
 * landing lo enlaza junto a EXPLORAR. El botón «Entradas» siempre a la vista
 * (REQ-ENT-040) y los bocadillos que se leen y se cierran (REQ-AVE-002).
 * El mar es un planeta que da la vuelta (D-22, REQ-MUN-038), compacto y con
 * una ruta de boyas que une las islas (T50). Móvil y escritorio.
 */

const world = WORLD_REGISTRY.get(WORLD_REGISTRY.defaultId).config;
// El evento vigente del mar: el que se vende en una isla (el All Day de la demo).
const islandEvent = SAMPLE_CONTENT.events.find((e) => canBuy(e) && e.islandId)!;
const islandName = world.objects.find((o) => o.identity.id === islandEvent.islandId)!.identity.name;
// La primera boia con diálogo (la del tutorial) y su primera línea.
const talkingBoia = world.objects.find(
  (o) => o.identity.category === 'boia' && o.behaviors.some((b) => b.type === 'dialogue'),
)!;
const firstLine = (() => {
  const b = talkingBoia.behaviors.find((x) => x.type === 'dialogue');
  return b?.type === 'dialogue' ? b.params.lines[0]!.text : '';
})();

async function openMar(page: Page, query = '') {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/mar${query}`);
  await expect(page.getByTestId('mar-canvas')).toBeVisible();
  await expect(page.locator('.mar-splash')).toHaveCount(0, { timeout: 30_000 });
  return errors;
}

/** Visible, entero en pantalla y encima de todo en su centro (nada lo tapa). */
async function expectOnTop(el: Locator) {
  await expect(el).toBeVisible();
  await expect(el).toBeInViewport({ ratio: 1 });
  const onTop = await el.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && node.contains(hit);
  });
  expect(onTop, 'nada tapa el botón').toBe(true);
}

const checkoutEvent = (page: Page) => page.getByTestId('checkout').getByTestId('checkout-evento');

test('el mar 3D arranca, pasa a mapa y fija rumbo a la isla del evento', async ({ page }) => {
  const errors = await openMar(page);
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

test('«Entradas» se ve de cerca, en el mapa y con la ficha; «Saltar» abre el checkout', async ({
  page,
}) => {
  expect(islandEvent, 'hay un evento a la venta con isla').toBeDefined();
  const errors = await openMar(page);
  const button = page.getByTestId('mar-entradas');

  // De cerca (cubierta), en el mapa y con la ficha de una isla abierta.
  await expectOnTop(button);
  await page.getByTestId('mar-mapa').click();
  await expect(page.getByTestId('mar-mapa')).toContainText('Barco');
  await expectOnTop(button);
  await page.locator('[data-pin="allday"]').click();
  await expect(page.getByTestId('mar-ficha')).toBeVisible();
  await expectOnTop(button);

  // Tocarlo: rumbo en turbo a la isla del evento, de vuelta a la vista del barco.
  await button.click();
  await expect(button).toContainText(`Rumbo a ${islandName}`);
  await expect(page.getByTestId('mar-rumbo-activo')).toContainText(islandName);
  await expect(page.getByTestId('mar-turbo')).toHaveClass(/is-on/);
  await expect(page.getByTestId('mar-mapa')).toContainText('Mapa');
  await expectOnTop(button);

  // «Saltar»: el checkout del evento vigente al momento.
  await page.getByTestId('mar-entradas-saltar').click();
  await expect(checkoutEvent(page)).toHaveText(islandEvent.name, { timeout: 20_000 });
  await expect(page.getByTestId('mar-entradas-saltar')).toHaveCount(0);
  await expect(page.getByTestId('mar-rumbo-activo')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('«Entradas»: otro toque abre el checkout ya; el viaje en turbo llega y lo abre', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = await openMar(page);
  const button = page.getByTestId('mar-entradas');

  // Pulsar otra vez el botón durante el viaje abre el checkout al momento.
  await button.click();
  await expect(page.getByTestId('mar-entradas-saltar')).toBeVisible();
  await button.click();
  await expect(checkoutEvent(page)).toHaveText(islandEvent.name, { timeout: 20_000 });
  await page.getByTestId('checkout-cerrar').click();
  await expect(page.getByTestId('checkout')).toHaveCount(0);

  // Sin tocar nada más: navega solo (la distancia baja) y, al llegar (o al
  // tope de tiempo del viaje), se abre el checkout del evento.
  await button.click();
  const meters = async () => {
    const text = (await page.getByTestId('mar-rumbo-activo').textContent()) ?? '';
    return Number(text.match(/(\d+) m/)?.[1] ?? NaN);
  };
  const start = await meters();
  await expect.poll(meters, { timeout: 10_000 }).toBeLessThan(start - 20);
  await expect(checkoutEvent(page)).toHaveText(islandEvent.name, { timeout: 40_000 });
  await expect(page.getByTestId('mar-entradas-saltar')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('«Entradas» con movimiento reducido abre el checkout directo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openMar(page);
  await page.getByTestId('mar-entradas').click();
  await expect(checkoutEvent(page)).toHaveText(islandEvent.name, { timeout: 20_000 });
  await expect(page.getByTestId('mar-entradas-saltar')).toHaveCount(0);
  await expect(page.getByTestId('mar-rumbo-activo')).toHaveCount(0);
});

test('un bocadillo tiene botón de cerrar y sigue a la vista pasados 2,5 s', async ({ page }) => {
  expect(READABLE_MIN_MS).toBeGreaterThan(2500);
  const errors = await openMar(page, `?cerca=${talkingBoia.identity.id}`);
  const bubble = page.getByTestId('mar-bocadillo');
  // Rumbo norte hasta la boia: saluda con su primera línea.
  await page.keyboard.down('ArrowUp');
  await expect(bubble).toBeVisible({ timeout: 15_000 });
  await page.keyboard.up('ArrowUp');
  await expect(bubble).toContainText(firstLine);
  const close = page.getByTestId('mar-bocadillo-cerrar');
  await expect(close).toBeVisible();
  await expect(close).toHaveAttribute('aria-label', 'Cerrar diálogo');

  await page.waitForTimeout(2500);
  await expect(bubble).toBeVisible();
  await expect(bubble).toContainText(firstLine);

  // Tocar el texto sigue avanzando; el × lo cierra al momento.
  await bubble.locator('.mar-bubble__text').click();
  await expect(bubble).not.toContainText(firstLine);
  await close.click();
  await expect(bubble).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('el planeta da la vuelta: desde la cueva del oeste, El Freu (al este) queda a un paso', async ({
  page,
}) => {
  // Las posiciones del mar 3D salen del mapa compartido, como en el motor.
  const sea = marWorld(world);
  const at = (id: string) => sea.objects.find((o) => o.identity.id === id)!;
  const cave = at('secreto-cueva');
  const freu = at('circuito');
  const reach = Math.max(
    cave.geometry.proximityRadius ?? 0,
    cave.geometry.activation?.radius ?? 0,
    cave.geometry.collision?.radius ?? 0,
  );
  // `?cerca=` deja el barco al sur del lugar (Mar3D.startNear).
  const start = { x: cave.position.x, y: cave.position.y + reach + 90 };
  const flat = Math.hypot(freu.position.x - start.x, freu.position.y - start.y) * 0.25;
  const { dx, dy } = shortest(start, freu.position, periodOf(planetRect(sea.bounds)));
  const around = Math.hypot(dx, dy) * 0.25;
  expect(around, 'dando la vuelta está mucho más cerca').toBeLessThan(flat / 2);

  const errors = await openMar(page, '?cerca=secreto-cueva');
  await page.getByTestId('mar-mapa').click();
  // En el móvil el rótulo de El Freu queda bajo la barra del zoom: el toque va al rótulo.
  await page.locator('[data-pin="circuito"]').dispatchEvent('click');
  const ficha = page.getByTestId('mar-ficha');
  await expect(ficha).toContainText(' m');
  const meters = Number(
    ((await ficha.locator('.mar-sheet__kicker').textContent()) ?? '').match(/(\d+) m/)?.[1],
  );
  expect(meters).toBeGreaterThan(around * 0.8);
  expect(meters).toBeLessThan(around * 1.2);
  // Y el rumbo va por ahí: la distancia que queda es la corta.
  await page.getByTestId('mar-rumbo').click();
  await expect(page.getByTestId('mar-rumbo-activo')).toBeVisible();
  const left = Number(
    ((await page.getByTestId('mar-rumbo-activo').textContent()) ?? '').match(/(\d+) m/)?.[1],
  );
  expect(left).toBeLessThan(flat / 2);
  expect(errors).toEqual([]);
});

test('el mundo compacto: boyas en el agua y la isla del evento a unos segundos del puerto', async ({
  page,
}) => {
  test.setTimeout(90_000);
  // El mundo de /mar y su ruta, como los calcula el motor.
  const sea = marWorld(world);
  const route = seaRoute(sea);
  const errors = await openMar(page);
  await expect(page.getByTestId('mar-canvas')).toHaveAttribute(
    'data-route-buoys',
    String(route.buoys.length),
  );

  // Rumbo a la isla del evento desde el anillo: la distancia es la del mundo
  // compacto por el camino corto, hasta su orilla (Mar3D.setCourse).
  const allday = sea.objects.find((o) => o.identity.id === 'allday')!;
  const spawn = sea.spawn!;
  const { dx, dy } = shortest(spawn, allday.position, periodOf(planetRect(sea.bounds)));
  const reach =
    Math.max(allday.geometry.collision?.radius ?? 0, allday.geometry.activation?.radius ?? 0) +
    18 +
    40;
  const expected = (Math.hypot(dx, dy) - reach) * 0.25;
  await page.getByTestId('mar-mapa').click();
  await page.locator('[data-pin="allday"]').click();
  await page.getByTestId('mar-rumbo').click();
  const chip = page.getByTestId('mar-rumbo-activo');
  await expect(chip).toBeVisible();
  const meters = Number(((await chip.textContent()) ?? '').match(/(\d+) m/)?.[1]);
  expect(meters).toBeGreaterThan(expected * 0.9);
  expect(meters).toBeLessThan(expected * 1.1);
  // Y llega sola, a velocidad normal (sin turbo), en unos segundos.
  await expect(chip).toHaveCount(0, { timeout: 45_000 });
  expect(errors).toEqual([]);
});
