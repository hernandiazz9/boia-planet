import { describe, expect, it } from 'vitest';
import { V5_AUDIT_REASON, migrate } from './migrations';
import { SAMPLE_ACHIEVEMENTS, SAMPLE_ARTISTS, SAMPLE_EVENTS, SAMPLE_HOME_BLOCKS } from './sample';
import { SCHEMA_VERSION, TRASH_RETENTION_DEFAULT_DAYS, TRASH_RETENTION_MAX_DAYS } from './schema';
import { MemoryStorage, STORE_KEY } from './storage';
import { makeRepo } from './test-helpers';

/**
 * Endurecimiento del Admin en el repositorio (T48): borrador y publicación
 * (REQ-ADM-015), papelera con plazo y purga (REQ-ADM-030), versiones de logro
 * (REQ-ADM-022) y compras y sellos en la auditoría (REQ-ADM-007).
 */

const DAY = 86_400_000;
const onSale = SAMPLE_EVENTS.find((e) => e.state === 'on_sale')!;
const hero = SAMPLE_HOME_BLOCKS.find((b) => b.type === 'hero')!;

describe('borrador y publicación de la home y los eventos', () => {
  it('un borrador no se ve en lo publicado hasta «Publicar»', async () => {
    const { repo, reload } = makeRepo();
    const title = 'Titular en borrador';
    await repo.admin.draftUpsert('homeBlocks', { ...hero, title } as never);
    await repo.admin.draftText('hero.explore', 'Zarpa ya');
    const published = (await repo.content.home()).blocks.find((b) => b.id === hero.id);
    expect(published).toMatchObject({ title: hero.title });
    expect((await repo.content.texts())['hero.explore']).toBeUndefined();
    const preview = (await repo.admin.draftHome()).blocks.find((b) => b.id === hero.id);
    expect(preview).toMatchObject({ title });
    expect((await repo.admin.draftTexts())['hero.explore']).toBe('Zarpa ya');
    expect(await repo.admin.pendingDrafts()).toHaveLength(2);

    const later = reload();
    const r = await later.admin.publish({ reason: 'prueba' });
    expect(r.revision).toBe(1);
    expect((await later.content.home()).blocks.find((b) => b.id === hero.id)).toMatchObject({
      title,
    });
    expect((await later.content.texts())['hero.explore']).toBe('Zarpa ya');
    expect(await later.admin.pendingDrafts()).toEqual([]);
    expect((await later.admin.audit())[0]).toMatchObject({ action: 'publish' });
  });

  it('un evento nuevo en borrador no existe para la web; descartarlo no deja rastro', async () => {
    const { repo } = makeRepo();
    const draft = { ...onSale, id: 'ev-en-borrador', slug: 'ev-en-borrador', name: 'Borrador' };
    await repo.admin.draftUpsert('events', draft as never);
    expect((await repo.content.events()).some((e) => e.id === 'ev-en-borrador')).toBe(false);
    expect(await repo.admin.pendingDrafts()).toEqual([
      { area: 'events', id: 'ev-en-borrador', kind: 'item', isNew: true },
    ]);
    await repo.admin.discardDrafts({ area: 'events', id: 'ev-en-borrador' });
    expect(await repo.admin.pendingDrafts()).toEqual([]);
    await expect(repo.admin.publish()).rejects.toMatchObject({ code: 'invalid' });
  });

  it('guardar y publicar un elemento a la vez quita su borrador', async () => {
    const { repo } = makeRepo();
    await repo.admin.draftUpsert('events', { ...onSale, name: 'Viejo borrador' } as never);
    await repo.admin.upsert('events', { ...onSale, name: 'Publicado' } as never);
    expect(await repo.admin.pendingDrafts()).toEqual([]);
    expect((await repo.content.get('events', onSale.id))?.name).toBe('Publicado');
  });
});

describe('papelera con plazo y purga', () => {
  const artist = SAMPLE_ARTISTS[0]!;
  const other = SAMPLE_ARTISTS[1]!;

  it('lo tirado se recupera dentro del plazo y se purga solo al cumplirlo', async () => {
    const { repo, clock } = makeRepo();
    await repo.admin.remove('artists', artist.id);
    const [item] = await repo.admin.trash();
    expect(item).toMatchObject({ area: 'artists', id: artist.id, expired: false });
    expect(new Date(item!.expiresAt).getTime() - new Date(item!.deletedAt).getTime()).toBe(
      TRASH_RETENTION_DEFAULT_DAYS * DAY,
    );
    clock.advance(TRASH_RETENTION_DEFAULT_DAYS * DAY + 1);
    expect((await repo.admin.trash())[0]?.expired).toBe(true);
    // El siguiente cambio de la papelera purga lo caducado.
    await repo.admin.remove('artists', other.id);
    expect((await repo.admin.trash()).map((t) => t.id)).toEqual([other.id]);
    await expect(repo.admin.restore('artists', artist.id)).rejects.toMatchObject({
      code: 'forbidden',
    });
    // Purgado no vuelve, aunque sea de la muestra.
    expect((await repo.content.list('artists')).some((a) => a.id === artist.id)).toBe(false);
    const purge = (await repo.admin.audit()).find((a) => a.action === 'purge');
    expect(purge).toMatchObject({ area: 'artists', targetId: artist.id });
  });

  it('purgar a mano sólo vale para lo que está en la papelera', async () => {
    const { repo } = makeRepo();
    await expect(repo.admin.purge('artists', artist.id)).rejects.toMatchObject({
      code: 'not_found',
    });
    await repo.admin.remove('artists', artist.id);
    await repo.admin.purge('artists', artist.id, { reason: 'segunda confirmación' });
    expect(await repo.admin.trash()).toEqual([]);
  });

  it('el plazo se ajusta dentro de su rango, con auditoría', async () => {
    const { repo } = makeRepo();
    expect(await repo.admin.settings()).toEqual({
      trashRetentionDays: TRASH_RETENTION_DEFAULT_DAYS,
    });
    await repo.admin.setSettings({ trashRetentionDays: 7 });
    expect((await repo.admin.settings()).trashRetentionDays).toBe(7);
    await expect(
      repo.admin.setSettings({ trashRetentionDays: TRASH_RETENTION_MAX_DAYS + 1 }),
    ).rejects.toMatchObject({ code: 'invalid' });
    expect((await repo.admin.audit())[0]).toMatchObject({ area: 'settings', action: 'settings' });
  });
});

describe('versiones de logro', () => {
  const base = SAMPLE_ACHIEVEMENTS.find((a) => a.trigger === 'find_buoy')!;

  it('cambiar la condición sube la versión; cambiar el título, no', async () => {
    const { repo } = makeRepo();
    const v = (await repo.content.get('achievements', base.id))!.version;
    const renamed = await repo.admin.upsert('achievements', { ...base, title: 'Otro título' });
    expect(renamed.version).toBe(v);
    const params = { ...(base.triggerParams ?? {}), count: 99 };
    const changed = await repo.admin.upsert('achievements', { ...base, triggerParams: params });
    expect(changed.version).toBe(v + 1);
    // La versión no se fija desde fuera.
    const forced = await repo.admin.upsert('achievements', { ...changed, version: 50 });
    expect(forced.version).toBe(v + 1);
  });

  it('uno nuevo empieza en la versión 1', async () => {
    const { repo } = makeRepo();
    const created = await repo.admin.upsert('achievements', {
      ...base,
      id: 'logro-nuevo',
      version: 7,
    });
    expect(created.version).toBe(1);
  });
});

describe('compras y sellos en la auditoría (REQ-ADM-007)', () => {
  it('la compra de prueba y su sello quedan anotados con el visitante como autor', async () => {
    const { repo } = makeRepo();
    await repo.purchases.confirmSandbox({ purchaseId: 'p-1', eventId: onSale.id });
    const me = (await repo.identity.current())!.id;
    const audit = await repo.admin.audit();
    expect(audit.find((a) => a.action === 'purchase')).toMatchObject({
      area: 'purchases',
      targetId: 'p-1',
      actor: me,
    });
    expect(audit.find((a) => a.action === 'stamp')).toMatchObject({ area: 'ledger', actor: me });
    // Confirmar otra vez la misma compra no anota nada nuevo.
    const n = audit.length;
    await repo.purchases.confirmSandbox({ purchaseId: 'p-1', eventId: onSale.id });
    expect(await repo.admin.audit()).toHaveLength(n);
  });
});

describe('migración v4 → v5', () => {
  const at = '2026-09-20T10:00:00.000Z';
  const v4Doc = {
    schemaVersion: 4,
    identity: { id: 'u-1', kind: 'guest', createdAt: at },
    carnets: {},
    players: {},
    ledger: [
      {
        id: 'stamp:p-1',
        userId: 'u-1',
        kind: 'stamp',
        pointsDelta: 0,
        coinsDelta: 0,
        seasonId: null,
        eventId: onSale.id,
        purchaseId: 'p-1',
        metadata: {},
        createdAt: at,
      },
    ],
    purchases: [
      {
        id: 'p-1',
        userId: 'u-1',
        eventId: onSale.id,
        provider: 'sandbox',
        providerOrderId: 'sandbox-p-1',
        status: 'confirmed',
        quantity: 1,
        discountId: null,
        amountCents: null,
        confirmedAt: at,
        createdAt: at,
      },
    ],
    bottles: [],
    bottleReads: [],
    bottleReports: [],
    content: { items: {}, order: {}, places: {}, skins: {}, texts: { 'hero.explore': 'Hola' } },
    audit: [],
  };

  it('añade borrador vacío y plazo, y anota compras y sellos sin tocar lo publicado', () => {
    const m = migrate(v4Doc, 5);
    expect(m.status).toBe('ok');
    if (m.status !== 'ok') return;
    const content = m.doc.content as Record<string, unknown>;
    expect(content.drafts).toEqual({ items: {}, order: {}, texts: {} });
    expect(content.revision).toBe(0);
    expect(content.settings).toEqual({ trashRetentionDays: 30 });
    expect(content.texts).toEqual({ 'hero.explore': 'Hola' });
    const audit = m.doc.audit as { action: string; actor: string; reason: string }[];
    expect(audit.map((a) => a.action).sort()).toEqual(['purchase', 'stamp']);
    expect(audit.every((a) => a.actor === 'u-1' && a.reason === V5_AUDIT_REASON)).toBe(true);
    // Idempotente: migrar lo ya migrado no duplica.
    const again = migrate({ ...m.doc, schemaVersion: 4 }, 5);
    expect(again.status === 'ok' && (again.doc.audit as unknown[]).length).toBe(2);
  });

  it('el repositorio abre un documento v4 y lo deja en la versión actual', async () => {
    const storage = new MemoryStorage();
    storage.setItem(STORE_KEY, JSON.stringify(v4Doc));
    const { repo } = makeRepo({ storage });
    expect(repo.status()).toMatchObject({ issue: null, schemaVersion: SCHEMA_VERSION });
    expect(await repo.purchases.list()).toHaveLength(1);
    expect((await repo.admin.audit()).map((a) => a.action).sort()).toEqual(['purchase', 'stamp']);
    expect(await repo.admin.pendingDrafts()).toEqual([]);
  });
});
