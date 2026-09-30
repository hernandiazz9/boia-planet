import { DEFAULT_LOCALE, fill, type Locale } from './core';
import { esLibEventos } from './es-lib-eventos';
import { esWeb } from './es-web';
import { esZonasEventos } from './es-zonas-eventos';

/**
 * La web pública más los textos de la ficha de evento y de «Fotos y eventos»
 * (lib/landing/eventos-copy.ts). Aparte de `./web` para que la home no los
 * cargue (presupuesto de la landing, T14).
 */
export const esEventos = { ...esWeb, ...esZonasEventos, ...esLibEventos } as const;
export type EventosKey = keyof typeof esEventos;

const catalogs: Record<Locale, Record<EventosKey, string>> = { es: esEventos };

export function t(
  key: EventosKey,
  vars?: Record<string, string | number>,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return fill(catalogs[locale][key], vars);
}
