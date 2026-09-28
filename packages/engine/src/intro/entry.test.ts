import { describe, expect, it } from 'vitest';
import { bootScript, decideEntry, INTRO_SEEN_KEY, type BootEntry } from './entry';

const base = { search: '', hash: '', seen: false, reducedMotion: false };

describe('qué entrada toca', () => {
  it('primera visita: cinemática; con movimiento reducido: variante quieta', () => {
    expect(decideEntry(base)).toBe('intro');
    expect(decideEntry({ ...base, reducedMotion: true })).toBe('reduced');
  });

  it('visita posterior y enlaces directos: sin introducción (REQ-ENT-009, 011)', () => {
    expect(decideEntry({ ...base, seen: true })).toBe('direct');
    expect(decideEntry({ ...base, hash: '#tickets' })).toBe('direct');
    expect(decideEntry({ ...base, hash: '#fotos', reducedMotion: true })).toBe('direct');
  });

  it('«Ver introducción» (?intro=1) la repite aunque ya se viera', () => {
    expect(decideEntry({ ...base, seen: true, search: '?intro=1' })).toBe('intro');
    expect(decideEntry({ ...base, seen: true, search: '?a=b&intro=1' })).toBe('intro');
    expect(decideEntry({ ...base, seen: true, search: '?intro=10' })).toBe('direct');
  });
});

/** Ejecuta el script de arranque contra un navegador de mentira. */
function runBoot(opts: {
  seen?: boolean;
  hash?: string;
  reduced?: boolean;
  storageThrows?: boolean;
}) {
  const attrs = new Map<string, string>();
  const timers: Array<{ fn: () => void; ms: number }> = [];
  const events: string[] = [];
  const preloaded: string[] = [];
  const store = new Map<string, string>(opts.seen ? [[INTRO_SEEN_KEY, 'seen']] : []);
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
    location: { search: '', hash: opts.hash ?? '' },
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
  it('primera visita: oculta la landing, se marca como vista y se da un plazo', () => {
    const b = runBoot({});
    expect(b.attrs.get('data-entry')).toBe('intro');
    expect(b.attrs.get('data-intro')).toBe('play');
    expect(b.store.get(INTRO_SEEN_KEY)).toBe('seen');
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

  it('visita posterior o enlace directo: nada oculto', () => {
    for (const b of [runBoot({ seen: true }), runBoot({ hash: '#tickets' })]) {
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

  it('con movimiento reducido no oculta la landing', () => {
    const b = runBoot({ reduced: true });
    expect(b.attrs.get('data-entry')).toBe('reduced');
    expect(b.attrs.has('data-intro')).toBe(false);
  });
});
