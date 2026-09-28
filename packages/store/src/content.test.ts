import { describe, expect, it } from 'vitest';
import { EVENT_STATES, homeContentSchema } from '@boia/contracts';
import { CONTENT_AREAS, ENTITY_AREAS } from './schema';
import { DEFAULT_SAMPLE_INPUT, SAMPLE_EVENTS, SAMPLE_HOME_BLOCKS } from './sample';
import { makeRepo } from './test-helpers';

const firstEvent = SAMPLE_EVENTS[0];
if (!firstEvent) throw new Error('muestra sin eventos');

describe('contenido: muestra + cambios del Admin', () => {
  it('la muestra se valida y la home tiene la forma de @boia/contracts', async () => {
    const { repo } = makeRepo();
    const home = await repo.content.home();
    expect(homeContentSchema.safeParse(home).success).toBe(true);
    expect(home.events.map((e) => e.id)).toEqual(SAMPLE_EVENTS.map((e) => e.id));
    for (const area of ENTITY_AREAS) {
      expect(await repo.content.list(area)).toHaveLength(DEFAULT_SAMPLE_INPUT[area].length);
    }
  });

  it('un cambio del Admin gana a la muestra y se puede restablecer', async () => {
    const { repo, reload } = makeRepo();
    const other = EVENT_STATES.find((s) => s !== firstEvent.state) ?? 'cancelled';
    await repo.admin.upsert(
      'events',
      { ...firstEvent, state: other, stateNote: 'Muestra' },
      {
        reason: 'prueba',
      },
    );
    expect((await repo.content.get('events', firstEvent.id))?.state).toBe(other);
    // Sobrevive a recargar.
    const later = reload();
    expect((await later.content.get('events', firstEvent.id))?.state).toBe(other);
    expect(await later.admin.overridden('events')).toEqual([firstEvent.id]);
    // Un área no toca a las demás.
    await later.admin.setText('hud.tickets', 'Entradas');
    await later.admin.reset('events');
    expect((await later.content.get('events', firstEvent.id))?.state).toBe(firstEvent.state);
    expect(await later.admin.overridden('events')).toEqual([]);
    expect(await later.content.texts()).toEqual({ 'hud.tickets': 'Entradas' });
    const audit = await later.admin.audit();
    expect(audit.map((a) => a.action)).toEqual(['reset', 'set', 'upsert']);
    expect(audit[2]).toMatchObject({ area: 'events', targetId: firstEvent.id, reason: 'prueba' });
    expect((audit[2]?.before as { state: string }).state).toBe(firstEvent.state);
  });

  it('un cambio inválido se rechaza con su motivo y no toca nada', async () => {
    const { repo } = makeRepo();
    await expect(
      repo.admin.upsert('events', { ...firstEvent, state: 'nope' as never }),
    ).rejects.toMatchObject({ code: 'invalid' });
    expect(await repo.admin.audit()).toEqual([]);
  });

  it('crear, borrar a la papelera y recuperar', async () => {
    const { repo } = makeRepo();
    await repo.admin.upsert('events', {
      ...firstEvent,
      id: 'ev-nuevo',
      slug: 'nuevo',
      name: 'Nuevo',
    });
    expect((await repo.content.events()).at(-1)?.id).toBe('ev-nuevo');
    await repo.admin.remove('events', firstEvent.id);
    expect(await repo.content.get('events', firstEvent.id)).toBeNull();
    await repo.admin.restore('events', firstEvent.id);
    expect(await repo.content.get('events', firstEvent.id)).toEqual(
      await makeRepo().repo.content.get('events', firstEvent.id),
    );
    // Recuperar un elemento de la muestra sin cambios lo deja como muestra.
    expect(await repo.admin.overridden('events')).toEqual(['ev-nuevo']);
  });

  it('ordenar bloques de la home', async () => {
    const { repo } = makeRepo();
    const ids = SAMPLE_HOME_BLOCKS.map((b) => b.id);
    const reversed = [...ids].reverse();
    await repo.admin.reorder('homeBlocks', reversed);
    expect((await repo.content.home()).blocks.map((b) => b.id)).toEqual(reversed);
    await expect(repo.admin.reorder('homeBlocks', ['no-existe'])).rejects.toMatchObject({
      code: 'invalid',
    });
    await repo.admin.reset('homeBlocks');
    expect((await repo.content.home()).blocks.map((b) => b.id)).toEqual(ids);
  });

  it('lugares por id compartido y pieles por (mundo, lugar); cada área se restablece sola', async () => {
    const { repo } = makeRepo({
      validate: {
        placePatch: (_id, p) => (p.x !== undefined && p.x > 1000 ? 'fuera del mapa' : null),
      },
    });
    await repo.admin.setPlace('allday', { x: 10, y: 20 });
    await repo.admin.setPlace('allday', { enabled: false, params: { radius: 3 } });
    expect(await repo.content.places()).toEqual({
      allday: { x: 10, y: 20, enabled: false, params: { radius: 3 } },
    });
    await expect(repo.admin.setPlace('allday', { x: 5000 })).rejects.toMatchObject({
      code: 'invalid',
    });
    await expect(
      repo.admin.setPlace('allday', { x: 1, extra: true } as never),
    ).rejects.toMatchObject({ code: 'invalid' });
    await repo.admin.setSkin('arcilla', 'allday', { name: 'Escenario de barro' });
    await repo.admin.setSkin('acuarela', 'allday', { name: 'Escenario de papel', hidden: false });
    const skins = await repo.content.skins();
    expect(skins.arcilla?.allday?.name).toBe('Escenario de barro');
    expect(skins.acuarela?.allday?.name).toBe('Escenario de papel');
    await repo.admin.setActiveWorld('acuarela');
    expect(await repo.content.activeWorldId()).toBe('acuarela');

    await repo.admin.reset('places');
    expect(await repo.content.places()).toEqual({});
    expect(Object.keys(await repo.content.skins())).toEqual(['arcilla', 'acuarela']);
    await repo.admin.reset('all');
    expect(await repo.content.skins()).toEqual({});
    expect(await repo.content.activeWorldId()).toBe(DEFAULT_SAMPLE_INPUT.activeWorldId);
    for (const area of CONTENT_AREAS) expect(await repo.admin.overridden(area)).toEqual([]);
  });

  it('la auditoría sólo crece', async () => {
    const { repo } = makeRepo();
    await repo.admin.setText('a', '1');
    await repo.admin.setText('a', '2');
    await repo.admin.setText('a', null);
    await repo.admin.reset('texts');
    const audit = await repo.admin.audit({ area: 'texts' });
    expect(audit.map((a) => [a.action, a.before, a.after])).toEqual([
      ['reset', {}, null],
      ['set', '2', null],
      ['set', '1', '2'],
      ['set', null, '1'],
    ]);
    expect(await repo.admin.audit({ limit: 1 })).toHaveLength(1);
  });
});
