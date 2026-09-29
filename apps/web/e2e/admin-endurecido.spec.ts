import { SAMPLE_ARTISTS, SAMPLE_EVENTS } from '@boia/store';
import { WORLD_REGISTRY } from '@boia/world';
import { expect, test, type Page } from '@playwright/test';
import { es } from '../lib/i18n/es';
import { PARAM_RANGES } from '../lib/admin/validate';
import { SAMPLE_CONTENT } from '../lib/landing/sample-content';

/**
 * Admin endurecido (T48): la home se edita en borrador y no se ve en la
 * landing hasta «Publicar» (REQ-ADM-015, REQ-ADM-017); borrar enseña el
 * impacto y pide el nombre exacto, y purgar lo pide otra vez (REQ-ADM-029,
 * REQ-ADM-030); un parámetro fuera de rango se rechaza con su motivo
 * (REQ-ADM-013). Corre en móvil 360×640 y en escritorio.
 */

test.describe.configure({ timeout: 120_000 });

const hero = SAMPLE_CONTENT.blocks.find((b) => b.type === 'hero')!;
const TITLE = 'Titular del borrador e2e';
const CTA = 'Zarpa e2e';
// Un artista del cartel de algún evento de muestra: su impacto no está vacío.
const artist = SAMPLE_ARTISTS.find((a) => SAMPLE_EVENTS.some((e) => e.artistIds?.includes(a.id)))!;
const event = SAMPLE_EVENTS.find((e) => e.artistIds?.includes(artist.id))!;
const swirl = WORLD_REGISTRY.map.places.find((p) => p.params && 'swirl' in p.params)!;

async function section(page: Page, id: string) {
  await page.getByTestId(`admin-nav-${id}`).click();
  await expect(page.getByTestId(`admin-seccion-${id}`)).toBeVisible();
}

async function landing(page: Page) {
  await page.goto('/?intro=0');
  await expect(page.locator('main')).toHaveAttribute('data-contenido', 'repositorio');
}

test('la home en borrador no se ve hasta publicar', async ({ page }) => {
  await page.goto('/admin');
  await section(page, 'inicio');
  const portada = page.getByTestId('portada');
  await portada.locator('summary').click();
  await portada.getByTestId('portada-titular').fill(TITLE);
  await portada.getByTestId('cta-explorar').fill(CTA);
  await portada.getByTestId('portada-guardar').click();
  await expect(portada.getByTestId('admin-ok')).toBeVisible();
  await expect(page.getByTestId(`bloque-${hero.id}`)).toContainText('borrador');
  await expect(page.getByTestId('borrador')).not.toHaveAttribute('data-pendientes', '0');

  // La landing sigue enseñando lo publicado.
  await landing(page);
  await expect(page.locator('#hero-title')).toHaveText(hero.type === 'hero' ? hero.title : '');
  await expect(page.locator('.cta-explore__label').first()).toHaveText(es['hero.explore']);

  // La vista previa privada, sí.
  await page.goto('/admin/vista-previa');
  await expect(page.getByTestId('vista-previa-borrador').locator('#hero-title')).toHaveText(TITLE);

  // Publicar: ahora la ve todo el mundo (en este navegador).
  await page.goto('/admin');
  await section(page, 'inicio');
  await page.getByTestId('publicar').click();
  await expect(page.getByTestId('borrador')).toHaveAttribute('data-pendientes', '0');
  await landing(page);
  await expect(page.locator('#hero-title')).toHaveText(TITLE);
  await expect(page.locator('.cta-explore__label').first()).toHaveText(CTA);
});

test('borrar enseña el impacto y pide el nombre; purgar lo pide otra vez', async ({ page }) => {
  await page.goto('/admin');
  await section(page, 'artistas');
  await page.getByTestId(`borrar-artists-${artist.id}`).click();
  const panel = page.getByTestId('borrar-panel');
  await expect(panel.getByTestId('borrar-impacto')).toContainText(event.name);
  const confirm = panel.getByTestId('borrar-confirmar');
  await expect(confirm).toBeDisabled();
  await panel.getByTestId('borrar-nombre').fill(artist.name.toUpperCase());
  await expect(confirm).toBeDisabled();
  await panel.getByTestId('borrar-nombre').fill(artist.name);
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByTestId('papelera-artists')).toContainText(artist.name);

  await section(page, 'papelera');
  const row = page.getByTestId(`papelera-artists-${artist.id}`);
  await expect(row).toContainText(artist.name);
  await row.getByTestId(`papelera-purgar-${artist.id}`).click();
  const purge = page.getByTestId('purgar-panel');
  await expect(purge.getByTestId('purgar-confirmar')).toBeDisabled();
  await purge.getByTestId('purgar-nombre').fill(artist.name);
  await purge.getByTestId('purgar-confirmar').click();
  await expect(row).toHaveCount(0);
  await expect(page.getByTestId('papelera')).toContainText('vacía');

  // Queda en la auditoría.
  await section(page, 'auditoria');
  await expect(page.getByTestId('auditoria')).toContainText(`Artistas · purge · ${artist.id}`);
});

test('un parámetro fuera de rango se rechaza con su motivo', async ({ page }) => {
  const r = PARAM_RANGES['swirl.strength']!;
  await page.goto('/admin');
  await section(page, 'mundo');
  await page.getByTestId('lugar-selector').selectOption(swirl.id);
  const editor = page.getByTestId('lugar-editor');
  await editor
    .getByTestId('lugar-params')
    .fill(JSON.stringify({ swirl: { strength: r.max + 1, pull: 0 } }));
  await editor.getByTestId('lugar-guardar').click();
  await expect(editor.getByTestId('admin-error')).toContainText(`${r.label} fuera de rango`);
});
