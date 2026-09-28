import { describe, expect, it } from 'vitest';
import { SAMPLE_CONTENT } from './sample-content';
import { TRIO_SIZE, cycleLength, shuffledOrder, trioAt } from './rotation';

const sampleCount = SAMPLE_CONTENT.artists.length;

describe('rotación de artistas', () => {
  it.each([3, 4, 5, 6, 7, 9, 12, sampleCount, 31])(
    'con %i artistas ningún trío repite a nadie',
    (n) => {
      for (let step = 0; step < 3 * cycleLength(n) + 2; step++) {
        const trio = trioAt(n, step);
        expect(trio).toHaveLength(Math.min(n, TRIO_SIZE));
        expect(new Set(trio).size).toBe(trio.length);
        for (const i of trio) expect(i).toBeGreaterThanOrEqual(0);
        for (const i of trio) expect(i).toBeLessThan(n);
      }
    },
  );

  it.each([6, 7, 8, sampleCount, 31])(
    'con %i artistas dos tríos seguidos no comparten a nadie',
    (n) => {
      for (let step = 0; step < 2 * cycleLength(n); step++) {
        const a = new Set(trioAt(n, step));
        for (const i of trioAt(n, step + 1)) expect(a.has(i)).toBe(false);
      }
    },
  );

  it.each([4, 5, 6, sampleCount, 31])('con %i artistas la rotación es equilibrada', (n) => {
    const counts = new Array<number>(n).fill(0);
    for (let step = 0; step < n; step++) for (const i of trioAt(n, step)) counts[i]! += 1;
    expect(new Set(counts)).toEqual(new Set([TRIO_SIZE]));
  });

  it('sigue funcionando con pasos negativos y listas vacías', () => {
    expect(trioAt(0, 5)).toEqual([]);
    expect(new Set(trioAt(sampleCount, -1)).size).toBe(TRIO_SIZE);
  });

  it('el orden barajado es una permutación estable por semilla', () => {
    const a = shuffledOrder(sampleCount, 42);
    expect([...a].sort((x, y) => x - y)).toEqual([...Array(sampleCount).keys()]);
    expect(shuffledOrder(sampleCount, 42)).toEqual(a);
    expect(shuffledOrder(sampleCount, 43)).not.toEqual(a);
  });
});
