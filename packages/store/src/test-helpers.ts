import { MemoryStorage, type StorageLike } from './storage';
import { createLocalRepository, type LocalRepositoryOptions } from './local';

/** Reloj controlable para pruebas. */
export function fakeClock(start = '2026-10-01T10:00:00Z') {
  let t = new Date(start).getTime();
  return {
    now: () => new Date(t),
    advance(ms: number) {
      t += ms;
    },
    set(iso: string) {
      t = new Date(iso).getTime();
    },
  };
}

/** Repositorio sobre un almacenamiento en memoria compartible (para «recargar»). */
export function makeRepo(
  opts: Omit<LocalRepositoryOptions, 'storage'> & { storage?: StorageLike | null } = {},
) {
  const storage = opts.storage === undefined ? new MemoryStorage() : opts.storage;
  const clock = fakeClock();
  const make = (extra: Partial<LocalRepositoryOptions> = {}) =>
    createLocalRepository({ now: clock.now, watch: false, ...opts, storage, ...extra });
  // Con `storage: null` no hay almacenamiento que mirar; las pruebas que lo miran no pasan null.
  return { repo: make(), storage: storage as StorageLike, clock, reload: make };
}
