import { describe, expect, it } from 'vitest';
import {
  NOTICE_DURATION_MS,
  NOTICE_GAP_MS,
  NOTICE_MAX_PENDING,
  type Notice,
  NoticeQueue,
} from './notifications';

const n = (id: string): Notice => ({ id, kind: 'achievement', title: id });

/**
 * Recorre el reloj en pasos de `step` ms, empujando avisos en su momento, y
 * devuelve los intervalos en que se vio cada uno (según lo que se pintaría).
 */
function run(
  q: NoticeQueue,
  pushes: Array<[number, Notice]>,
  until: number,
  step = 10,
): Array<{ id: string; from: number; to: number }> {
  const seen: Array<{ id: string; from: number; to: number }> = [];
  let t = 0;
  for (; t <= until; t += step) {
    for (const [at, notice] of pushes) if (at === t) q.push(notice, t);
    const cur = q.update(t);
    const last = seen.at(-1);
    if (cur && last && last.id === cur.notice.id && last.to === t - step) last.to = t;
    else if (cur) seen.push({ id: cur.notice.id, from: t, to: t });
  }
  return seen;
}

describe('cola de avisos (REQ-IDE-026, D-07)', () => {
  it('nunca enseña dos a la vez: cinco avisos en el mismo instante salen uno tras otro', () => {
    const q = new NoticeQueue();
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const seen = run(
      q,
      ids.map((id) => [0, n(id)] as [number, Notice]),
      ids.length * (NOTICE_DURATION_MS + NOTICE_GAP_MS) + 1000,
    );
    expect(seen.map((s) => s.id)).toEqual(ids);
    for (const [i, s] of seen.entries()) {
      // Se ve casi 4 s (el último paso visible queda un paso antes del fin).
      expect(s.to - s.from).toBeGreaterThanOrEqual(NOTICE_DURATION_MS - 10);
      expect(s.to - s.from).toBeLessThan(NOTICE_DURATION_MS);
      const next = seen[i + 1];
      if (next) expect(next.from - s.to).toBeGreaterThanOrEqual(NOTICE_GAP_MS);
    }
  });

  it('en cada instante hay como mucho uno visible, lleguen como lleguen', () => {
    const q = new NoticeQueue();
    const pushes: Array<[number, Notice]> = [
      [0, n('a')],
      [1000, n('b')],
      [1010, n('c')],
      [9000, n('d')],
      [20_000, n('e')],
    ];
    const seen = run(q, pushes, 40_000);
    expect(seen.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    for (const [i, s] of seen.entries()) {
      for (const o of seen.slice(i + 1)) expect(o.from > s.to || s.from > o.to).toBe(true);
    }
    // Un aviso que llega con la cola vacía sale al momento.
    expect(seen.find((s) => s.id === 'e')!.from).toBe(20_000);
  });

  it('dura 4 s y avisa (sonido) una sola vez al empezar', () => {
    const shown: string[] = [];
    const q = new NoticeQueue({ onShow: (x) => shown.push(x.id) });
    q.push(n('a'), 1000);
    expect(q.current?.notice.id).toBe('a');
    expect(q.update(1000 + NOTICE_DURATION_MS - 1)?.notice.id).toBe('a');
    expect(q.update(1000 + NOTICE_DURATION_MS)).toBeNull();
    expect(shown).toEqual(['a']);
    expect(NOTICE_DURATION_MS).toBe(4000);
  });

  it('el mismo aviso no se encola dos veces mientras sigue en cola', () => {
    const q = new NoticeQueue();
    expect(q.push(n('a'), 0)).toBe(true);
    expect(q.push(n('a'), 10)).toBe(false);
    expect(q.push(n('b'), 10)).toBe(true);
    expect(q.push(n('b'), 20)).toBe(false);
    expect(q.size).toBe(1);
  });

  it('con la pestaña oculta (salto de reloj) no se amontonan: se recorren en orden', () => {
    const shown: string[] = [];
    const q = new NoticeQueue({ onShow: (x) => shown.push(x.id) });
    q.push(n('a'), 0);
    q.push(n('b'), 0);
    q.push(n('c'), 0);
    // Vuelve a los 6 s: `a` ya pasó; `b` está a mitad.
    const cur = q.update(6000);
    expect(cur?.notice.id).toBe('b');
    expect(cur!.shownAt).toBe(NOTICE_DURATION_MS + NOTICE_GAP_MS);
    expect(q.size).toBe(1);
    // Los que no llegaron a verse en pantalla no suenan.
    expect(shown).toEqual(['a', 'b']);
  });

  it('tocar el aviso lo cierra y el siguiente espera la pausa', () => {
    const q = new NoticeQueue();
    q.push(n('a'), 0);
    q.push(n('b'), 0);
    q.dismiss(500);
    expect(q.update(500)).toBeNull();
    expect(q.nextChangeAt()).toBe(500 + NOTICE_GAP_MS);
    expect(q.update(500 + NOTICE_GAP_MS)?.notice.id).toBe('b');
  });

  it('la cola tiene tope', () => {
    const q = new NoticeQueue();
    q.push(n('visible'), 0);
    for (let i = 0; i < NOTICE_MAX_PENDING; i++) expect(q.push(n(`p${i}`), 0)).toBe(true);
    expect(q.push(n('sobra'), 0)).toBe(false);
  });
});
