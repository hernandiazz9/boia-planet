/**
 * Nombres visibles del formato y la serie de un evento. Sin zod ni esquemas:
 * lo importa la tarjeta de evento de la landing, que no puede cargar
 * `@boia/contracts` entero en su ruta crítica (T29). Textos `muestra`.
 */

export const EVENT_FORMAT_LABELS: Readonly<Record<'all_day' | 'satelite', string>> = {
  all_day: 'All Day BOIA',
  satelite: 'Satélite',
};

/** Series conocidas; una serie nueva sin nombre aquí se enseña con su clave. */
export const EVENT_SERIES_LABELS: Readonly<Record<string, string>> = {
  'boia-club': 'BOIA Club',
  noche: 'BOIA Noche',
};

export function seriesLabel(series: string): string {
  return EVENT_SERIES_LABELS[series] ?? series;
}

/** Lo que va encima del nombre en una tarjeta: la serie si la tiene; si no, el formato. */
export function eventKicker(e: {
  format: 'all_day' | 'satelite';
  series?: string | undefined;
}): string {
  return e.series ? seriesLabel(e.series) : EVENT_FORMAT_LABELS[e.format];
}
