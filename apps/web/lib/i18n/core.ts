/** Idiomas publicados. L1 sólo español (D-03); el inglés entra en L2. */
export const LOCALES = ['es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

/** Sustituye `{nombre}` por `vars.nombre` en una plantilla del catálogo. */
export function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in vars ? String(vars[name]) : m,
  );
}

/** Fecha de un evento en su zona horaria, en el idioma activo. */
export function formatEventDate(
  iso: string,
  timeZone: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(new Date(iso));
}
