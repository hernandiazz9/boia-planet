import { describe, expect, it } from 'vitest';
import { migrate } from './migrations';
import { MemoryStorage, STORE_KEY } from './storage';
import { makeRepo } from './test-helpers';

/**
 * v3 → v4 (T43): los descuentos que el Admin guardó antes ganan destino
 * (entradas) y prioridad (0) sin cambiar a qué se aplican; los encontrados
 * por el visitante siguen encontrados.
 */
const at = '2026-09-20T10:00:00.000Z';

const v3Doc = {
  schemaVersion: 3,
  identity: { id: 'u-1', kind: 'guest', createdAt: at },
  carnets: {},
  players: {
    'u-1': {
      discoveries: {},
      discounts: { 'dto-del-admin': { at, worldId: 'arcilla' } },
      missions: {},
      records: {},
      counters: {},
      equipped: {},
      prefs: {},
      achievements: {},
    },
  },
  ledger: [],
  purchases: [],
  bottles: [],
  bottleReads: [],
  bottleReports: [],
  content: {
    items: {
      discounts: {
        'dto-del-admin': {
          value: {
            id: 'dto-del-admin',
            code: 'ADMIN10',
            label: '-10 % del Admin',
            eventId: 'ev-all-day-primavera',
            kind: 'percent',
            value: 10,
            sample: false,
          },
          deleted: false,
          at,
        },
      },
    },
    order: {},
    places: {},
    skins: {},
    texts: {},
  },
  audit: [],
};

describe('migración v3 → v4: descuentos (T43)', () => {
  it('destino de entradas y prioridad 0, explícitos', () => {
    const out = migrate(v3Doc);
    expect(out.status).toBe('ok');
    if (out.status !== 'ok') return;
    const items = (out.doc.content as { items: { discounts: Record<string, { value: unknown }> } })
      .items.discounts;
    expect(items['dto-del-admin']!.value).toMatchObject({
      scope: 'event',
      priority: 0,
      eventId: 'ev-all-day-primavera',
    });
    expect(items['dto-del-admin']!.value).not.toHaveProperty('hiddenAt');
  });

  it('el repositorio lo carga y el visitante lo sigue teniendo', async () => {
    const storage = new MemoryStorage();
    storage.setItem(STORE_KEY, JSON.stringify(v3Doc));
    const { repo } = makeRepo({ storage });
    expect(repo.status().droppedOnLoad).toBe(0);
    const [found] = await repo.progress.discounts();
    expect(found).toMatchObject({
      discount: { id: 'dto-del-admin', scope: 'event', priority: 0 },
      usedAt: null,
    });
  });
});
