import { t as baseT, type WebKey as MessageKey } from '../i18n/web';

export type { WebKey as MessageKey } from '../i18n/web';
export { formatEventDate } from '../i18n/web';

/**
 * Textos de la landing con los cambios del Admin de la demo encima (T26,
 * «Textos y música»). En el servidor y en la primera pintada del navegador no
 * hay cambios (lo mismo que pinta el servidor); `LiveLanding` los pone al leer
 * el repositorio y vuelve a pintar. Sólo textos sin variables: los que llevan
 * `{nombre}` siguen saliendo del catálogo.
 */
let overrides: Readonly<Record<string, string>> = {};

export function setTextOverrides(next: Readonly<Record<string, string>>): void {
  overrides = next;
}

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  if (!vars) {
    const o = overrides[key];
    if (o !== undefined && o.trim() !== '') return o;
  }
  return baseT(key, vars);
}
