import { describe, expect, it } from 'vitest';
import {
  NOTICE_DURATION_MS,
  NOTICE_GAP_MS,
  NOTICE_MAX_PENDING,
  type Notice,
  NoticeQueue,
  READABLE_FREE_CHARS,
  READABLE_MAX_MS,
  READABLE_MIN_MS,
  READABLE_MS_PER_CHAR,
  noticeText,
  readableDurationMs,
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

describe('tiempo de lectura (D-22, REQ-AVE-002, REQ-IDE-026)', () => {
  const text = (chars: number) => 'x'.repeat(chars);
  /** La regla escrita tal cual: máx(3 s, 3 s + 60 ms por carácter desde el 50), tope 8 s. */
  const rule = (chars: number) =>
    Math.min(
      READABLE_MAX_MS,
      Math.max(
        READABLE_MIN_MS,
        READABLE_MIN_MS + (chars - READABLE_FREE_CHARS) * READABLE_MS_PER_CHAR,
      ),
    );

  it('es de al menos 3 s, 60 ms más por carácter a partir del 50 y como mucho 8 s', () => {
    expect(READABLE_MIN_MS).toBe(3000);
    expect(READABLE_MAX_MS).toBe(8000);
    expect(readableDurationMs('')).toBe(READABLE_MIN_MS);
    expect(readableDurationMs('¡Plop!')).toBe(READABLE_MIN_MS);
    expect(readableDurationMs(text(READABLE_FREE_CHARS))).toBe(READABLE_MIN_MS);
    expect(readableDurationMs(text(READABLE_FREE_CHARS + 1))).toBe(
      READABLE_MIN_MS + READABLE_MS_PER_CHAR,
    );
    for (const chars of [0, 10, 49, 50, 51, 80, 100, 120, 133, 134, 140, 500]) {
      expect(readableDurationMs(text(chars))).toBe(rule(chars));
    }
    // El tope llega antes de los 140 caracteres de un bocadillo.
    const capAt = READABLE_FREE_CHARS + (READABLE_MAX_MS - READABLE_MIN_MS) / READABLE_MS_PER_CHAR;
    expect(readableDurationMs(text(Math.ceil(capAt)))).toBe(READABLE_MAX_MS);
    expect(readableDurationMs(text(Math.ceil(capAt) + 60))).toBe(READABLE_MAX_MS);
  });

  it('cuenta caracteres, no bytes: las tildes y los emojis cuentan uno', () => {
    expect(readableDurationMs('á'.repeat(READABLE_FREE_CHARS + 10))).toBe(
      rule(READABLE_FREE_CHARS + 10),
    );
    expect(readableDurationMs('🎈'.repeat(READABLE_FREE_CHARS + 10))).toBe(
      rule(READABLE_FREE_CHARS + 10),
    );
  });

  it('con `readable`, cada aviso dura el tiempo de lectura de su título y cuerpo', () => {
    const short: Notice = { id: 'corto', kind: 'discovery', title: 'Isla descubierta' };
    const long: Notice = {
      id: 'largo',
      kind: 'achievement',
      title: 'Logro: Capitana del Freu',
      body: 'Has dado la vuelta al circuito de El Freu por debajo del minuto y medio. ¡Qué timón!',
    };
    const q = new NoticeQueue({ readable: true });
    expect(q.durationOf(short)).toBe(READABLE_MIN_MS);
    expect(q.durationOf(long)).toBe(readableDurationMs(noticeText(long)));
    expect(q.durationOf(long)).toBeGreaterThan(READABLE_MIN_MS);
    q.push(short, 0);
    q.push(long, 0);
    expect(q.update(READABLE_MIN_MS - 1)?.notice.id).toBe('corto');
    expect(q.update(READABLE_MIN_MS)).toBeNull();
    const longAt = READABLE_MIN_MS + NOTICE_GAP_MS;
    expect(q.update(longAt)?.notice.id).toBe('largo');
    expect(q.update(longAt + q.durationOf(long) - 1)?.notice.id).toBe('largo');
    expect(q.update(longAt + q.durationOf(long))).toBeNull();
    // Sin la opción, los 4 s de siempre (D-07).
    expect(new NoticeQueue().durationOf(long)).toBe(NOTICE_DURATION_MS);
  });

  it('cerrar (×) lo quita al momento y el siguiente espera su pausa', () => {
    const q = new NoticeQueue({ readable: true });
    q.push(n('a'), 0);
    q.push(n('b'), 0);
    expect(q.update(1000)?.notice.id).toBe('a');
    q.dismiss(1000);
    expect(q.current).toBeNull();
    expect(q.update(1000)).toBeNull();
    expect(q.update(1000 + NOTICE_GAP_MS - 1)).toBeNull();
    expect(q.nextChangeAt()).toBe(1000 + NOTICE_GAP_MS);
    const b = q.update(1000 + NOTICE_GAP_MS);
    expect(b?.notice.id).toBe('b');
    expect(b!.until - b!.shownAt).toBe(READABLE_MIN_MS);
    // Cerrar sin nada en pantalla no adelanta ni retrasa nada.
    q.dismiss(1000 + NOTICE_GAP_MS + 10);
    q.dismiss(1000 + NOTICE_GAP_MS + 20);
    expect(q.current).toBeNull();
    expect(q.size).toBe(0);
  });
});
