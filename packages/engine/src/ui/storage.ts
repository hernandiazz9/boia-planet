/**
 * Lo mínimo de `Storage` que usan las preferencias del HUD. Así las pruebas
 * pasan un mapa en memoria y el navegador pasa `localStorage`.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class MemoryStore implements KeyValueStore {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

/**
 * `localStorage` si existe y deja escribir; si no (modo privado, cookies
 * bloqueadas, servidor), memoria: la preferencia dura la sesión y nada falla.
 */
export function browserStore(): KeyValueStore {
  try {
    const ls = globalThis.localStorage;
    const probe = '__boia_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      getItem: (k) => {
        try {
          return ls.getItem(k);
        } catch {
          return null;
        }
      },
      setItem: (k, v) => {
        try {
          ls.setItem(k, v);
        } catch {
          // Cuota llena o almacenamiento bloqueado: se pierde la preferencia, no el juego.
        }
      },
    };
  } catch {
    return new MemoryStore();
  }
}
