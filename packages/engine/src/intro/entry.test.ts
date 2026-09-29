import { describe, expect, it } from 'vitest';
import { bootScript, decideEntry, mountMode, type BootEntry } from './entry';

const base = { pathname: '/', search: '', hash: '', reducedMotion: false };

describe('qué entrada toca (D-21: según la URL)', () => {
  it('`/` a secas: cinemática; con movimiento reducido, variante quieta', () => {
    expect(decideEntry(base)).toBe('intro');
    expect(decideEntry({ ...base, reducedMotion: true })).toBe('reduced');
    // Un `#` vacío no apunta a nada.
    expect(decideEntry({ ...base, hash: '#' })).toBe('intro');
  });

  it('una URL que apunta a algo entra directa (REQ-ENT-011)', () => {
    expect(decideEntry({ ...base, hash: '#tickets' })).toBe('direct');
    expect(decideEntry({ ...base, hash: '#fotos', reducedMotion: true })).toBe('direct');
    expect(decideEntry({ ...base, search: '?menu=carnet' })).toBe('direct');
    expect(decideEntry({ ...base, search: '?intro=0' })).toBe('direct');
    expect(decideEntry({ ...base, search: '?evento' })).toBe('direct');
    expect(decideEntry({ ...base, pathname: '/artistas' })).toBe('direct');
    expect(decideEntry({ ...base, pathname: '/juego', search: '?menu=carnet' })).toBe('direct');
  });

  it('los parámetros de campaña no apuntan a nada: sigue la entrada', () => {
    expect(decideEntry({ ...base, search: '?utm_source=instagram&utm_medium=bio' })).toBe('intro');
    expect(decideEntry({ ...base, search: '?fbclid=abc' })).toBe('intro');
    expect(decideEntry({ ...base, search: '?utm_source=ig&menu=carnet' })).toBe('direct');
  });

  it('«Ver la introducción» (?intro=1) la pide aunque la URL apunte a otra cosa', () => {
    expect(decideEntry({ ...base, search: '?intro=1' })).toBe('intro');
    expect(decideEntry({ ...base, search: '?a=b&intro=1' })).toBe('intro');
    expect(decideEntry({ ...base, search: '?intro=1', hash: '#tickets' })).toBe('intro');
    expect(decideEntry({ ...base, search: '?intro=1', reducedMotion: true })).toBe('reduced');
    expect(decideEntry({ ...base, search: '?intro=10' })).toBe('direct');
    expect(decideEntry({ ...base, search: '?xintro=1' })).toBe('direct');
  });
});

describe('modo del montaje', () => {
  it('reproduce la entrada que el script de esta carga pidió y nadie resolvió', () => {
    expect(mountMode({ mode: 'intro', claimed: false, landed: null })).toBe('intro');
    expect(mountMode({ mode: 'reduced', claimed: false, landed: null })).toBe('reduced');
  });

  it('volver a `/` dentro de la app no la repite: entrada ya resuelta o ninguna', () => {
    // Se cargó `/`, se vio la entrada y se volvió a `/` desde el juego.
    expect(mountMode({ mode: 'intro', claimed: false, landed: 'played' })).toBe('direct');
    expect(mountMode({ mode: 'intro', claimed: false, landed: 'skipped' })).toBe('direct');
    // Se cargó otra ruta (sin script de arranque) y se navegó a `/`.
    expect(mountMode(undefined)).toBe('direct');
    // Otro montaje ya la reclamó.
    expect(mountMode({ mode: 'intro', claimed: true, landed: null })).toBe('direct');
  });
});

/** Ejecuta el script de arranque contra un navegador de mentira. */
function runBoot(opts: {
  /** Almacenamiento de una visita anterior (p. ej. la marca antigua `boia.intro.v2`). */
  stored?: Record<string, string>;
  pathname?: string;
  search?: string;
  hash?: string;
  reduced?: boolean;
  storageThrows?: boolean;
}) {
  const attrs = new Map<string, string>();
  const timers: Array<{ fn: () => void; ms: number }> = [];
  const events: string[] = [];
  const preloaded: string[] = [];
  const store = new Map<string, string>(Object.entries(opts.stored ?? {}));
  let clickListener: ((e: { target: unknown }) => void) | null = null;
  const win: Record<string, unknown> = {
    matchMedia: () => ({ matches: !!opts.reduced }),
    dispatchEvent: (e: { type: string; detail: { intro: string } }) =>
      events.push(`${e.type}:${e.detail.intro}`),
  };
  const env = {
    window: win,
    document: {
      documentElement: {
        setAttribute: (k: string, v: string) => attrs.set(k, v),
        removeAttribute: (k: string) => attrs.delete(k),
      },
      addEventListener: (_: string, fn: typeof clickListener) => (clickListener = fn),
    },
    location: { pathname: opts.pathname ?? '/', search: opts.search ?? '', hash: opts.hash ?? '' },
    localStorage: {
      getItem: (k: string) => {
        if (opts.storageThrows) throw new Error('bloqueado');
        return store.get(k) ?? null;
      },
      setItem: (k: string, v: string) => {
        if (opts.storageThrows) throw new Error('bloqueado');
        store.set(k, v);
      },
    },
    performance: { now: () => 0 },
    Image: class {
      set src(v: string) {
        preloaded.push(v);
      }
    },
    setTimeout: (fn: () => void, ms: number) => timers.push({ fn, ms }),
    clearTimeout: () => {},
    CustomEvent: class {
      constructor(
        readonly type: string,
        readonly init: { detail: unknown },
      ) {}
      get detail() {
        return this.init.detail;
      }
    },
  };
  const src = bootScript({ loadBudgetMs: 2000, hardCapMs: 9000, preload: ['/a.png', '/b.png'] });
  new Function(...Object.keys(env), src)(...Object.values(env));
  return {
    attrs,
    timers,
    events,
    store,
    preloaded,
    entry: win.__boiaEntry as BootEntry,
    click: (skip: boolean) =>
      clickListener?.({
        target: { closest: (s: string) => (skip && s === '[data-intro-skip]' ? {} : null) },
      }),
  };
}

describe('script de arranque', () => {
  it('`/` a secas: oculta la landing y se da un plazo', () => {
    const b = runBoot({});
    expect(b.attrs.get('data-entry')).toBe('intro');
    expect(b.attrs.get('data-intro')).toBe('play');
    expect(b.timers.map((t) => t.ms)).toEqual([2000, 9000]);
    expect(b.preloaded).toEqual(['/a.png', '/b.png']);
    expect(b.entry.landed).toBeNull();
  });

  it('si nadie toma el relevo a tiempo, la landing ligera aparece (REQ-ENT-007)', () => {
    const b = runBoot({});
    b.timers[0]!.fn();
    expect(b.attrs.has('data-intro')).toBe(false);
    expect(b.entry.landed).toBe('none');
    expect(b.events).toEqual(['boia:landed:none']);
    // El tope final no repite nada.
    b.timers[1]!.fn();
    expect(b.events).toHaveLength(1);
  });

  it('Saltar antes de hidratar funciona y es idempotente', () => {
    const b = runBoot({});
    b.click(false);
    expect(b.attrs.get('data-intro')).toBe('play');
    b.click(true);
    b.click(true);
    expect(b.attrs.has('data-intro')).toBe(false);
    expect(b.entry.skipped).toBe(true);
    expect(b.events).toEqual(['boia:landed:skipped']);
  });

  it('una segunda carga completa de `/` vuelve a reproducir la entrada (D-21)', () => {
    const first = runBoot({});
    // La segunda carga hereda lo que la primera dejó guardado, más la marca
    // de «ya la vio» de antes de D-21: no cuenta.
    const second = runBoot({
      stored: { ...Object.fromEntries(first.store), 'boia.intro.v2': 'seen' },
    });
    for (const b of [first, second]) {
      expect(b.attrs.get('data-entry')).toBe('intro');
      expect(b.attrs.get('data-intro')).toBe('play');
      expect(b.entry.landed).toBeNull();
    }
    // Y no escribe nada: no hay marca que dejar.
    expect(first.store.size).toBe(0);
  });

  it('enlace directo, parámetro u otra ruta: nada oculto', () => {
    for (const b of [
      runBoot({ hash: '#tickets' }),
      runBoot({ search: '?menu=carnet' }),
      runBoot({ pathname: '/artistas' }),
    ]) {
      expect(b.attrs.get('data-entry')).toBe('direct');
      expect(b.attrs.has('data-intro')).toBe(false);
      expect(b.entry.landed).toBe('none');
      expect(b.preloaded).toEqual([]);
    }
  });

  it('sin almacenamiento (navegador interno, modo privado) sigue funcionando', () => {
    const b = runBoot({ storageThrows: true });
    expect(b.attrs.get('data-entry')).toBe('intro');
  });

  it('con movimiento reducido también espera al botón (mini-mundo quieto, D-19)', () => {
    const b = runBoot({ reduced: true });
    expect(b.attrs.get('data-entry')).toBe('reduced');
    expect(b.attrs.get('data-intro')).toBe('play');
    expect(b.entry.landed).toBeNull();
  });

  it('tomado el relevo, ni el plazo ni el tope muestran la landing: la pausa espera al botón', () => {
    const b = runBoot({});
    b.entry.claimed = true;
    for (const t of b.timers) t.fn();
    expect(b.attrs.get('data-intro')).toBe('play');
    expect(b.entry.landed).toBeNull();
    expect(b.events).toEqual([]);
  });

  it('«Ver la introducción» (?intro=1) la reproduce', () => {
    const b = runBoot({ search: '?intro=1' });
    expect(b.attrs.get('data-entry')).toBe('intro');
    expect(b.attrs.get('data-intro')).toBe('play');
  });
});
