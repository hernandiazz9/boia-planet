/**
 * Dónde vive el documento: `localStorage` si el navegador deja, memoria si
 * no. Se elige localStorage y no IndexedDB porque el documento es pequeño
 * (decenas de KB), la lectura síncrona permite arrancar sin esperas y es lo
 * que ya usa el resto de la demo (preferencias del HUD, aspecto del barco).
 *
 * Nada de esto lanza: modo privado, cookies bloqueadas, cuota llena, servidor
 * (SSR) o datos borrados a mitad de visita acaban en memoria, y `status()`
 * lo dice con un motivo y un texto para la interfaz.
 */

/** Lo mínimo de `Storage` que usa la tienda. Las pruebas pasan uno falso. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type Persistence = 'local' | 'memory';

export type StorageIssue =
  /** No hay almacenamiento (servidor, navegador sin localStorage). */
  | 'unavailable'
  /** El navegador lo bloquea (modo privado, cookies bloqueadas). */
  | 'blocked'
  /** Cuota llena al escribir. */
  | 'quota'
  /** Lo guardado no se podía leer: se guardó una copia y se empezó de cero. */
  | 'corrupt'
  /** Lo guardó una versión más nueva: no se toca y esta visita va en memoria. */
  | 'newer_schema'
  /** Faltaba un paso de migración: copia y de cero. */
  | 'migration_failed';

export interface StorageStatus {
  backend: 'local';
  persistence: Persistence;
  issue: StorageIssue | null;
  schemaVersion: number;
  /** Filas guardadas que no eran válidas y se descartaron al leer. */
  droppedOnLoad: number;
  /** Texto para la interfaz (`muestra`, pendiente Álvaro); null si todo va bien. */
  message: string | null;
}

export const STORAGE_MESSAGES: Record<StorageIssue, string> = {
  unavailable:
    'Este navegador no deja guardar datos: lo que hagas durará mientras tengas la página abierta.',
  blocked:
    'Este navegador no deja guardar datos: lo que hagas durará mientras tengas la página abierta.',
  quota:
    'No queda espacio para guardar en este navegador: desde ahora, lo nuevo durará mientras tengas la página abierta.',
  corrupt: 'Lo que había guardado en este navegador no se podía leer y se ha empezado de nuevo.',
  newer_schema:
    'Estos datos los guardó una versión más nueva de BOIA.PLANET: no se tocan y esta visita no se guardará.',
  migration_failed:
    'Lo que había guardado en este navegador no se podía actualizar y se ha empezado de nuevo.',
};

/** Clave del documento en localStorage. */
export const STORE_KEY = 'boia.store';
/** Copia de lo que no se pudo leer o migrar, para no perderlo del todo. */
export const STORE_BACKUP_KEY = 'boia.store.backup';

const PROBE_KEY = 'boia.store.probe';

function isQuotaError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const name = (e as { name?: unknown }).name;
  const code = (e as { code?: unknown }).code;
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  );
}

export type StorageSource = StorageLike | null | undefined | (() => StorageLike | null | undefined);

/** localStorage del navegador sin lanzar (acceder a la propiedad ya puede lanzar). */
export function defaultStorage(): StorageLike | null {
  try {
    return (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Canal hacia el almacenamiento. Si una operación falla pasa a memoria para
 * el resto de la visita, y `issue` lo explica.
 */
export class DocChannel {
  private storage: StorageLike | null;
  private memory: string | null = null;
  issue: StorageIssue | null = null;

  constructor(
    source: StorageSource,
    private readonly key: string = STORE_KEY,
  ) {
    let s: StorageLike | null | undefined;
    try {
      s = typeof source === 'function' ? source() : source;
    } catch {
      s = null;
      this.issue = 'blocked';
    }
    this.storage = s ?? null;
    if (!this.storage) {
      this.issue ??= 'unavailable';
      return;
    }
    // Sonda de escritura: Safari antiguo en privado lee pero no escribe.
    try {
      this.storage.setItem(PROBE_KEY, '1');
      this.storage.removeItem(PROBE_KEY);
    } catch (e) {
      this.toMemory(isQuotaError(e) ? 'quota' : 'blocked');
    }
  }

  get persistence(): Persistence {
    return this.storage ? 'local' : 'memory';
  }

  /** Pasa a memoria para el resto de la visita. */
  toMemory(issue: StorageIssue): void {
    this.storage = null;
    this.issue = issue;
  }

  read(): string | null {
    if (!this.storage) return this.memory;
    try {
      return this.storage.getItem(this.key);
    } catch {
      this.toMemory('blocked');
      return this.memory;
    }
  }

  /** Guarda; devuelve false si tuvo que pasar a memoria. */
  write(value: string): boolean {
    this.memory = value;
    if (!this.storage) return false;
    try {
      this.storage.setItem(this.key, value);
      return true;
    } catch (e) {
      this.toMemory(isQuotaError(e) ? 'quota' : 'blocked');
      return false;
    }
  }

  /** Copia de seguridad de algo que no se pudo leer. No lanza. */
  backup(value: string): void {
    try {
      this.storage?.setItem(STORE_BACKUP_KEY, value);
    } catch {
      // sin sitio para la copia: se pierde, como antes de esta visita
    }
  }

  /** Escucha cambios de otra pestaña (evento `storage`). Devuelve cómo dejar de escuchar. */
  watch(onChange: () => void): () => void {
    const target = globalThis as {
      addEventListener?: (type: string, fn: (e: { key: string | null }) => void) => void;
      removeEventListener?: (type: string, fn: (e: { key: string | null }) => void) => void;
    };
    if (!this.storage || typeof target.addEventListener !== 'function') return () => {};
    const fn = (e: { key: string | null }) => {
      // key null: otra pestaña hizo clear().
      if (e.key === this.key || e.key === null) onChange();
    };
    target.addEventListener('storage', fn);
    return () => target.removeEventListener?.('storage', fn);
  }
}

/** Almacenamiento en memoria con la interfaz de `Storage` (pruebas y servidor). */
export class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}
