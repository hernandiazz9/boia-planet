import type { WorldEvent } from '@boia/engine';
import { type AchievementDefinition, MemoryStorage, createLocalRepository } from '@boia/store';
import { WORLD_REGISTRY } from '@boia/world';
import { describe, expect, it } from 'vitest';
import {
  type AchievementSignal,
  TIME_PLAYED_TICK_S,
  WORLD_TRIGGER_ALIASES,
  achievementFacts,
  achievementGoal,
  recordSignal,
  signalFromWorldEvent,
} from './achievements';

/**
 * Logros con el repositorio local de verdad (T21, REQ-IDE-024…027): cada
 * logro del catálogo (la lista base de REQ-IDE-025, leída del repositorio,
 * también los secretos) se concede una sola vez, cuando se cumple su
 * condición y no antes, y no vuelve tras recargar. Cada «visita» es un
 * repositorio nuevo sobre el mismo almacenamiento.
 */

function browser() {
  const storage = new MemoryStorage();
  const clock = new Date('2026-09-29T18:00:00Z');
  return () => createLocalRepository({ storage, now: () => clock, watch: false });
}

const param = (d: AchievementDefinition, k: string) =>
  (d.triggerParams as Record<string, unknown>)[k];
const num = (v: unknown, fallback: number) => (typeof v === 'number' && v > 0 ? v : fallback);
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);

/** Las señales que cumplen la condición de un logro, en orden (la última la cumple). */
function signalsFor(d: AchievementDefinition): AchievementSignal[] {
  const n = num(param(d, 'count'), 1);
  switch (d.trigger) {
    case 'find_buoy':
      return Array.from({ length: n }, (_, i) => ({ trigger: 'find_buoy', objectId: `boia-${i}` }));
    case 'visit_island':
      return Array.from({ length: n }, (_, i) => ({
        trigger: 'visit_island',
        objectId: `isla-${i}`,
      }));
    case 'collect_objects': {
      const category = str(param(d, 'category'), 'objeto');
      return Array.from({ length: n }, (_, i) => ({
        trigger: 'collect_objects',
        objectId: `${category}-${i}`,
        category,
      }));
    }
    case 'time_played': {
      const ticks = Math.ceil((num(param(d, 'minutes'), 1) * 60) / TIME_PLAYED_TICK_S);
      return Array.from({ length: ticks }, () => ({
        trigger: 'time_played',
        seconds: TIME_PLAYED_TICK_S,
      }));
    }
    case 'rescue_character':
    case 'deliver_character':
      return [{ trigger: d.trigger, character: str(param(d, 'character'), 'alguien') }];
    case 'complete_circuit':
      return [{ trigger: d.trigger, circuit: str(param(d, 'circuit'), 'circuito') }];
    case 'buy_ticket':
      return [{ trigger: d.trigger, eventId: 'ev' }];
  }
}

const defs = await createLocalRepository({ storage: null }).content.list('achievements');

describe('cada logro base se concede una vez', () => {
  it('el catálogo tiene la lista base de REQ-IDE-025', () => {
    const triggers = new Set(defs.map((d) => d.trigger));
    for (const t of [
      'find_buoy',
      'visit_island',
      'buy_ticket',
      'time_played',
      'rescue_character',
      'deliver_character',
      'complete_circuit',
      'collect_objects',
    ] as const) {
      expect(triggers, t).toContain(t);
    }
  });

  for (const d of defs) {
    it(`${d.id} (${d.trigger})`, async () => {
      const open = browser();
      const repo = open();
      const signals = signalsFor(d);
      const id = `logro:${d.id}`;
      // Antes de la última señal, no.
      for (const s of signals.slice(0, -1)) {
        expect((await recordSignal(repo, s)).map((n) => n.id)).not.toContain(id);
      }
      const now = await recordSignal(repo, signals.at(-1)!);
      expect(now.filter((n) => n.id === id)).toHaveLength(1);
      expect(now.find((n) => n.id === id)).toMatchObject({ kind: 'achievement', title: d.title });
      // Repetir la señal, en la misma visita o tras recargar, no la vuelve a dar.
      expect((await recordSignal(repo, signals.at(-1)!)).map((n) => n.id)).not.toContain(id);
      const again = open();
      expect((await recordSignal(again, signals.at(-1)!)).map((n) => n.id)).not.toContain(id);
      const got = (await again.progress.ledger()).filter(
        (e) => e.kind === 'achievement' && e.achievementId === d.id,
      );
      expect(got).toHaveLength(1);
    });
  }

  it('puntos y monedas del logro van a saldos separados del libro', async () => {
    const repo = browser()();
    const d = defs.find((x) => x.trigger === 'deliver_character')!;
    const before = await repo.progress.balances();
    await recordSignal(repo, signalsFor(d)[0]!);
    const after = await repo.progress.balances();
    expect(after.points - before.points).toBe(d.points);
    expect(after.coins - before.coins).toBe(d.coins);
  });

  it('la misma boia dos veces cuenta una', async () => {
    const repo = browser()();
    await recordSignal(repo, { trigger: 'find_buoy', objectId: 'a' });
    await recordSignal(repo, { trigger: 'find_buoy', objectId: 'a' });
    expect((await achievementFacts(repo.progress)).buoys).toBe(1);
    const six = defs.find((x) => x.trigger === 'find_buoy' && num(param(x, 'count'), 1) > 1);
    if (six) {
      expect(achievementGoal(six, await achievementFacts(repo.progress))).toMatchObject({
        have: 1,
        need: num(param(six, 'count'), 1),
      });
    }
  });
});

describe('del mundo a las señales', () => {
  const world = WORLD_REGISTRY.get(WORLD_REGISTRY.defaultId).config;
  const achievementsOf = world.objects.flatMap((o) =>
    o.behaviors.flatMap((b) =>
      b.type === 'achievement' ? [{ o, trigger: b.params.trigger }] : [],
    ),
  );

  it('cada disparador del mapa es del catálogo (o tiene alias)', () => {
    const catalog = new Set(defs.map((d) => d.trigger as string));
    for (const { o, trigger } of achievementsOf) {
      expect(catalog, `${o.identity.id}: ${trigger}`).toContain(
        WORLD_TRIGGER_ALIASES[trigger] ?? trigger,
      );
    }
  });

  it('un secreto cuenta por su categoría', () => {
    const secret = achievementsOf.find(({ trigger }) => trigger === 'collect_objects')!;
    const e: WorldEvent = {
      type: 'achievement',
      objectId: secret.o.identity.id,
      trigger: 'collect_objects',
      amount: 1,
    };
    expect(signalFromWorldEvent(e, world)).toEqual({
      trigger: 'collect_objects',
      objectId: secret.o.identity.id,
      category: secret.o.identity.category,
    });
  });
});
