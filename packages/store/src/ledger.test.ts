import { describe, expect, it } from 'vitest';
import { Constants } from '@boia/db';
import {
  ACHIEVEMENT_TRIGGERS,
  BOTTLE_STATUSES,
  LEDGER_KINDS,
  PURCHASE_STATUSES,
} from '@boia/contracts';
import { STORE_KEY } from './storage';
import { SAMPLE_ACHIEVEMENTS, SAMPLE_COSMETICS } from './sample';
import { makeRepo } from './test-helpers';
import { isStoreError } from './errors';

describe('vocabulario compartido con el esquema de T06', () => {
  it('los enums de @boia/contracts son los de la base de datos', () => {
    const e = Constants.public.Enums;
    expect([...LEDGER_KINDS]).toEqual([...e.ledger_kind]);
    expect([...ACHIEVEMENT_TRIGGERS]).toEqual([...e.achievement_trigger]);
    expect([...BOTTLE_STATUSES]).toEqual([...e.bottle_status]);
    expect([...PURCHASE_STATUSES]).toEqual([...e.purchase_status]);
  });
});

describe('libro de recompensas', () => {
  it('una recompensa con el mismo id se concede una vez, también tras recargar', async () => {
    const { repo, reload } = makeRepo();
    const first = await repo.progress.grantWorldReward({
      sourceRef: 'cofre-cala',
      coins: 7,
      points: 3,
    });
    const again = await repo.progress.grantWorldReward({
      sourceRef: 'cofre-cala',
      coins: 7,
      points: 3,
    });
    expect(first.granted).toBe(true);
    expect(again.granted).toBe(false);
    if (!again.granted) {
      expect(again.reason).toBe('duplicate');
      expect(again.entry?.id).toBe(first.entry?.id);
    }
    const later = reload();
    const third = await later.progress.grantWorldReward({ sourceRef: 'cofre-cala', coins: 99 });
    expect(third.granted).toBe(false);
    expect(await later.progress.balances()).toMatchObject({ points: 3, coins: 7 });
    expect(await later.progress.ledger()).toHaveLength(1);
  });

  it('el id lo decide el repositorio a partir del origen y la política', async () => {
    const { repo, clock } = makeRepo();
    const once = await repo.progress.grantWorldReward({ sourceRef: 'minigame:faro', coins: 5 });
    const daily1 = await repo.progress.grantWorldReward({
      sourceRef: 'minigame:faro',
      coins: 5,
      policy: 'daily',
    });
    const daily1b = await repo.progress.grantWorldReward({
      sourceRef: 'minigame:faro',
      coins: 5,
      policy: 'daily',
    });
    clock.advance(24 * 60 * 60 * 1000);
    const daily2 = await repo.progress.grantWorldReward({
      sourceRef: 'minigame:faro',
      coins: 5,
      policy: 'daily',
    });
    expect([once.granted, daily1.granted, daily1b.granted, daily2.granted]).toEqual([
      true,
      true,
      false,
      true,
    ]);
    const ids = (await repo.progress.ledger()).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);

    await repo.admin.setActiveWorld('arcilla');
    const s1 = await repo.progress.grantWorldReward({
      sourceRef: 'boia-x',
      points: 1,
      policy: 'season',
    });
    const s1b = await repo.progress.grantWorldReward({
      sourceRef: 'boia-x',
      points: 1,
      policy: 'season',
    });
    await repo.admin.setActiveWorld('acuarela');
    const s2 = await repo.progress.grantWorldReward({
      sourceRef: 'boia-x',
      points: 1,
      policy: 'season',
    });
    expect([s1.granted, s1b.granted, s2.granted]).toEqual([true, false, true]);
    const b = await repo.progress.balances();
    expect(b.seasonPoints).toEqual({ arcilla: 1, acuarela: 1 });
  });

  it('una recompensa del mundo sin premio o con premio negativo se rechaza', async () => {
    const { repo } = makeRepo();
    await expect(repo.progress.grantWorldReward({ sourceRef: 'x' })).rejects.toMatchObject({
      code: 'invalid',
    });
    await expect(
      repo.progress.grantWorldReward({ sourceRef: 'x', coins: -5, points: 10 }),
    ).rejects.toMatchObject({ code: 'invalid' });
    await expect(
      repo.progress.grantWorldReward({ sourceRef: 'Con Espacios', coins: 1 }),
    ).rejects.toMatchObject({ code: 'invalid' });
  });
});

describe('saldos derivados', () => {
  it('no hay forma de fijar un saldo: la API no lo ofrece y lo devuelto no se puede cambiar', async () => {
    const { repo } = makeRepo();
    await repo.progress.grantWorldReward({ sourceRef: 'boia-1', points: 10, coins: 4 });
    const api = repo.progress as unknown as Record<string, unknown>;
    for (const name of Object.keys(api)) expect(name).not.toMatch(/^set(Balance|Points|Coins)/i);
    const b = await repo.progress.balances();
    expect(Object.isFrozen(b)).toBe(true);
    expect(() => {
      (b as { points: number }).points = 9999;
    }).toThrow();
    expect((await repo.progress.balances()).points).toBe(10);
  });

  it('un saldo o un libro alterados a mano en el almacenamiento no fabrican saldo', async () => {
    const { repo, storage, reload } = makeRepo();
    const me = await repo.identity.ensure();
    await repo.progress.grantWorldReward({ sourceRef: 'boia-1', points: 10, coins: 4 });
    const doc = JSON.parse(storage.getItem(STORE_KEY) ?? '{}');
    const good = doc.ledger[0];
    doc.balances = { points: 5000, coins: 5000 };
    doc.pointBalances = { [me.id]: 5000 };
    doc.ledger.push(
      { ...good }, // id repetido
      { ...good, id: 'world_reward:trampa', coinsDelta: -3, pointsDelta: 500 }, // premio negativo
      {
        ...good,
        id: 'x',
        kind: 'compensation',
        compensatesId: 'no-existe',
        reason: 'r',
        pointsDelta: 100,
      },
      { ...good, id: 'y', kind: 'cosmetic', cosmeticKey: 'z', pointsDelta: 0, coinsDelta: -1000 }, // sin saldo
    );
    storage.setItem(STORE_KEY, JSON.stringify(doc));
    const later = reload();
    expect(await later.progress.balances()).toMatchObject({ points: 10, coins: 4 });
    expect(await later.progress.ledger()).toHaveLength(1);
    expect(later.status().droppedOnLoad).toBeGreaterThanOrEqual(4);
  });

  it('puntos y monedas van separados: gastar monedas no toca los puntos', async () => {
    const { repo } = makeRepo();
    const buyable = SAMPLE_COSMETICS.find((c) => c.priceCoins !== null && c.priceCoins > 0);
    if (!buyable || buyable.priceCoins === null || buyable.priceCoins === undefined)
      throw new Error('la muestra no tiene cosméticos a la venta');
    const price = buyable.priceCoins;
    await expect(repo.progress.buyCosmetic(buyable.id)).rejects.toMatchObject({
      code: 'insufficient_coins',
    });
    await repo.progress.grantWorldReward({ sourceRef: 'tesoro', points: 20, coins: price + 1 });
    const r = await repo.progress.buyCosmetic(buyable.id);
    expect(r.granted).toBe(true);
    expect(await repo.progress.balances()).toMatchObject({ points: 20, coins: 1 });
    expect((await repo.progress.buyCosmetic(buyable.id)).granted).toBe(false);
    expect((await repo.progress.balances()).coins).toBe(1);
    await repo.progress.equip(buyable.slot, buyable.id);
    expect(await repo.progress.equipped()).toEqual({ [buyable.slot]: buyable.id });
  });
});

describe('logros', () => {
  it('se conceden una vez, con el premio de la definición y su cosmético', async () => {
    const { repo } = makeRepo();
    const def = SAMPLE_ACHIEVEMENTS.find((a) => a.cosmeticKey);
    if (!def) throw new Error('la muestra no tiene logros con cosmético');
    const r = await repo.progress.grantAchievement(def.id);
    expect(r.granted).toBe(true);
    expect((await repo.progress.grantAchievement(def.id)).granted).toBe(false);
    expect(await repo.progress.balances()).toMatchObject({ points: def.points, coins: def.coins });
    expect((await repo.progress.cosmetics()).map((c) => c.id)).toEqual([def.cosmeticKey]);
    const list = await repo.progress.achievements();
    expect(list.find((a) => a.definition.id === def.id)?.obtained).toBe(true);
  });

  it('los secretos no se listan hasta obtenerlos; un logro desactivado no se concede', async () => {
    const { repo } = makeRepo();
    const secret = SAMPLE_ACHIEVEMENTS.find((a) => a.secret);
    const other = SAMPLE_ACHIEVEMENTS.find((a) => !a.secret);
    if (!secret || !other) throw new Error('muestra sin logro secreto');
    expect((await repo.progress.achievements()).some((a) => a.definition.id === secret.id)).toBe(
      false,
    );
    await repo.progress.grantAchievement(secret.id);
    expect((await repo.progress.achievements()).some((a) => a.definition.id === secret.id)).toBe(
      true,
    );
    await repo.admin.upsert('achievements', { ...other, active: false });
    await expect(repo.progress.grantAchievement(other.id)).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('una compensación del Admin retira el logro y su premio, una sola vez', async () => {
    const { repo } = makeRepo();
    const def = SAMPLE_ACHIEVEMENTS[0];
    if (!def) throw new Error('muestra vacía');
    const r = await repo.progress.grantAchievement(def.id);
    if (!r.granted) throw new Error('no concedido');
    const c = await repo.admin.compensate(r.entry.id, 'prueba');
    expect(c.pointsDelta).toBe(-def.points);
    expect(await repo.progress.balances()).toMatchObject({ points: 0, coins: 0 });
    expect(
      (await repo.progress.achievements()).find((a) => a.definition.id === def.id)?.obtained,
    ).toBe(false);
    const again = await repo.admin.compensate(r.entry.id, 'otra vez').catch((e: unknown) => e);
    expect(isStoreError(again, 'conflict')).toBe(true);
    expect((await repo.admin.audit({ area: 'ledger' })).length).toBe(1);
  });
});
