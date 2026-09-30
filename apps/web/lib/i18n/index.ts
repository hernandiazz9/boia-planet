import { DEFAULT_LOCALE, fill, type Locale } from './core';
import { es, type MessageKey, type Messages } from './es';

export type { MessageKey } from './es';
export { DEFAULT_LOCALE, formatEventDate, LOCALES, type Locale } from './core';

const catalogs: Record<Locale, Messages> = { es };

/**
 * Traduce una clave del catálogo entero. `{nombre}` se sustituye por
 * `vars.nombre`. La web pública usa `./web` (sólo su parte del catálogo).
 */
export function t(
  key: MessageKey,
  vars?: Record<string, string | number>,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return fill(catalogs[locale][key], vars);
}
