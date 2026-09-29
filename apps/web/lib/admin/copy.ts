/**
 * Textos del Admin de la demo (T26, D-20, REQ-ADM-039). Todo `muestra`
 * [pendiente Álvaro]. Sin dependencias: lo importan la landing y el menú de
 * /juego para el botón, sin cargar el Admin.
 */

/** Ruta del Admin de la demo. */
export const ADMIN_PATH = '/admin';
/** Vista previa privada del borrador de la home (REQ-ADM-015). */
export const ADMIN_PREVIEW_PATH = '/admin/vista-previa';

export const ADMIN_COPY = {
  tryAdmin: 'Probar admin',
  tryAdminHint: 'Versión de prueba: sin login, los cambios se quedan en este navegador.',
  bannerTitle: 'Admin de prueba',
  banner:
    'Esto es una demo sin login. Cada cambio se guarda sólo en este navegador (nadie más lo ve) y se puede volver a los datos de muestra.',
  saved: 'Guardado en este navegador.',
  resetArea: 'Volver a la muestra',
  resetAll: 'Volver todo a la muestra',
  confirmResetAll: '¿Seguro? Se pierden todos los cambios del Admin en este navegador.',
  sharedMapNote:
    'El mapa es compartido: cambiar la posición, los parámetros o si un lugar está activo lo cambia en todos los mundos.',
  skinNote: 'Nombre, textos y si se ve: sólo en el mundo elegido.',
  renameAsk: '¿Dónde cambia el nombre?',
  renameThisWorld: 'Solo en este mundo',
  renameAllWorlds: 'En todos los mundos',
  islandKeepsMemories:
    'La isla no es el evento: al quitar o terminar un evento, la isla se queda con sus recuerdos.',
} as const;
