import { describe, expect, it } from 'vitest';
import { BOTTLE_MESSAGE_MAX } from '@boia/contracts';
import { SAMPLE_BOTTLES, SAMPLE_CREW } from './sample';
import { makeRepo } from './test-helpers';

async function member(nickname = 'Marinera de prueba') {
  const ctx = makeRepo();
  await ctx.repo.carnet.create({ nickname });
  return ctx;
}

describe('botellas', () => {
  it('sin Carnet no se escriben botellas', async () => {
    const { repo } = makeRepo();
    await expect(repo.bottles.place({ message: 'hola', x: 0, y: 0 })).rejects.toMatchObject({
      code: 'no_carnet',
    });
  });

  it(`hasta ${BOTTLE_MESSAGE_MAX} caracteres, contados como Postgres (un emoji es uno)`, async () => {
    const { repo } = await member();
    const tooLong = 'a'.repeat(BOTTLE_MESSAGE_MAX + 1);
    await expect(repo.bottles.place({ message: tooLong, x: 1, y: 1 })).rejects.toMatchObject({
      code: 'invalid',
    });
    await expect(repo.bottles.place({ message: '   ', x: 1, y: 1 })).rejects.toMatchObject({
      code: 'invalid',
    });
    const emojis = '🌊'.repeat(BOTTLE_MESSAGE_MAX);
    expect(emojis.length).toBeGreaterThan(BOTTLE_MESSAGE_MAX);
    const b = await repo.bottles.place({ message: emojis, x: 1, y: 1 });
    expect(b.message).toBe(emojis);
    await expect(repo.bottles.edit(b.id, { message: `${emojis}!` })).rejects.toMatchObject({
      code: 'invalid',
    });
  });

  it('una botella activa por identidad; al retirarla se puede echar otra', async () => {
    const { repo, reload } = await member();
    const first = await repo.bottles.place({ message: 'la primera', x: 10, y: 20 });
    await expect(repo.bottles.place({ message: 'la segunda', x: 30, y: 40 })).rejects.toMatchObject(
      {
        code: 'conflict',
      },
    );
    // También después de recargar.
    const later = reload();
    await expect(
      later.bottles.place({ message: 'la segunda', x: 30, y: 40 }),
    ).rejects.toMatchObject({
      code: 'conflict',
    });
    await later.bottles.retire(first.id);
    const second = await later.bottles.place({ message: 'la segunda', x: 30, y: 40 });
    expect((await later.bottles.mine())?.id).toBe(second.id);
    const mineActive = (await later.bottles.list()).filter((b) => b.isMine);
    expect(mineActive.map((b) => b.id)).toEqual([second.id]);
  });

  it('editar cambia mensaje y posición; la posición la valida quien conoce el mar', async () => {
    const { repo } = makeRepo({
      validate: { bottlePosition: (p) => (p.x < 0 ? 'eso es tierra' : null) },
    });
    await repo.carnet.create({ nickname: 'Validadora' });
    await expect(repo.bottles.place({ message: 'hola', x: -1, y: 0 })).rejects.toMatchObject({
      code: 'invalid',
    });
    const b = await repo.bottles.place({ message: 'hola', x: 5, y: 5 });
    const e = await repo.bottles.edit(b.id, { message: 'adiós', x: 6 });
    expect(e).toMatchObject({ message: 'adiós', x: 6, y: 5 });
  });

  it('leer no la quita del mar y deja la lectura; se ve el apodo y el Carnet del autor', async () => {
    const { repo } = makeRepo();
    const sample = SAMPLE_BOTTLES[0];
    if (!sample) throw new Error('sin botellas de muestra');
    const read = await repo.bottles.read(sample.id);
    expect(read.read).toBe(true);
    const author = SAMPLE_CREW.find((c) => c.userId === sample.userId);
    expect(read.authorNickname).toBe(author?.nickname);
    expect((await repo.bottles.list()).map((b) => b.id)).toContain(sample.id);
    const carnet = await repo.carnet.get(read.authorId);
    expect(carnet?.nickname).toBe(author?.nickname);
    expect(carnet?.isSample).toBe(true);
  });

  it('no dan puntos ni monedas (REQ-IDE-042)', async () => {
    const { repo } = await member();
    await repo.bottles.place({ message: 'hola', x: 1, y: 1 });
    const sample = SAMPLE_BOTTLES[0];
    if (sample) await repo.bottles.read(sample.id);
    expect(await repo.progress.balances()).toMatchObject({ points: 0, coins: 0 });
    expect(await repo.progress.ledger()).toHaveLength(0);
  });

  it('reportar una vez; el Admin la retira y desaparece del mar', async () => {
    const { repo } = await member();
    const sample = SAMPLE_BOTTLES[1];
    if (!sample) throw new Error('sin botellas de muestra');
    expect(await repo.bottles.report(sample.id, 'no me gusta')).toEqual({ first: true });
    expect(await repo.bottles.report(sample.id)).toEqual({ first: false });
    const flagged = (await repo.admin.bottles()).find((b) => b.id === sample.id);
    expect(flagged?.reports).toHaveLength(1);
    await repo.admin.removeBottle(sample.id, { reason: 'reportada' });
    expect((await repo.bottles.list()).map((b) => b.id)).not.toContain(sample.id);
    const removed = (await repo.admin.bottles()).find((b) => b.id === sample.id);
    expect(removed?.status).toBe('removed');
    expect(removed?.reports[0]?.resolvedAt).not.toBeNull();
    expect((await repo.admin.audit({ area: 'bottles' }))[0]?.action).toBe('moderate');
  });

  it('el autor no deshace una retirada por moderación', async () => {
    const { repo } = await member();
    const b = await repo.bottles.place({ message: 'hola', x: 1, y: 1 });
    await repo.admin.removeBottle(b.id);
    await expect(repo.bottles.edit(b.id, { message: 'otra' })).rejects.toMatchObject({
      code: 'forbidden',
    });
    await expect(repo.bottles.retire(b.id)).rejects.toMatchObject({ code: 'forbidden' });
    // Retirada por moderación no cuenta como activa: puede echar otra.
    await repo.bottles.place({ message: 'otra', x: 2, y: 2 });
  });
});
