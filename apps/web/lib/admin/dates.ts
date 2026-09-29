/**
 * Fechas de los formularios del Admin: `<input type="datetime-local">` da la
 * hora de pared sin zona; los eventos y la programación de bloques guardan
 * ISO 8601 con zona (`@boia/contracts`). Se interpreta en la zona del evento
 * (Europe/Madrid por defecto).
 */

export const DEFAULT_TIME_ZONE = 'Europe/Madrid';

/** Desfase de `timeZone` en el instante `date`, como «+02:00». */
function offsetAt(date: Date, timeZone: string): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value;
  const m = part?.match(/GMT([+-]\d{2}):?(\d{2})?/);
  return m ? `${m[1]}:${m[2] ?? '00'}` : '+00:00';
}

/** «2027-04-17T12:00» (hora de pared en `timeZone`) → «2027-04-17T12:00:00+02:00». null si no es fecha. */
export function localToIso(local: string, timeZone = DEFAULT_TIME_ZONE): string | null {
  const m = local.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const guess = new Date(`${m[1]}T${m[2]}:00Z`);
  if (Number.isNaN(guess.getTime())) return null;
  // El desfase de la hora de pared: se prueba con el del instante aproximado y se corrige una vez.
  let off = offsetAt(guess, timeZone);
  const real = new Date(`${m[1]}T${m[2]}:00${off}`);
  off = offsetAt(real, timeZone);
  return `${m[1]}T${m[2]}:00${off}`;
}

/** ISO con zona → «2027-04-17T12:00» en `timeZone`, para el `<input>`. */
export function isoToLocal(iso: string | undefined, timeZone = DEFAULT_TIME_ZONE): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
