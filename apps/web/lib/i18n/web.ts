import { DEFAULT_LOCALE, fill, type Locale } from './core';
import { esWeb, type WebKey } from './es-web';

export type { WebKey } from './es-web';
export { DEFAULT_LOCALE, formatEventDate, LOCALES, type Locale } from './core';

const catalogs: Record<Locale, Record<WebKey, string>> = { es: esWeb };

/**
 * Traduce una clave de la web pública (landing, eventos, fotos, legales,
 * checkout). Igual que `t` de `./index`, pero con sólo esa parte del catálogo:
 * es lo que viaja al navegador en la landing (presupuesto de T14).
 */
export function t(
  key: WebKey,
  vars?: Record<string, string | number>,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return fill(catalogs[locale][key], vars);
}
