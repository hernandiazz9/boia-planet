import { describe, expect, it } from 'vitest';
import {
  EVENT_STATES,
  EVENT_STATE_BEHAVIOR,
  canBuy,
  resolvePriorityEvent,
  upcomingEvents,
  type BoiaEvent,
  type EventState,
} from './events';
import { CLIENT_FUNNEL_EVENTS, FUNNEL_EVENTS } from './analytics';
import { homeBlocksSchema } from './home-blocks';

const NOW = new Date('2030-01-10T10:00:00Z');

function ev(id: string, state: EventState, daysFromNow: number): BoiaEvent {
  return {
    id,
    slug: id,
    name: id,
    format: 'All Day BOIA',
    startsAt: new Date(NOW.getTime() + daysFromNow * 86_400_000).toISOString(),
    timeZone: 'Europe/Madrid',
    placeLabel: 'Alicante',
    state,
    description: '',
    artistIds: [],
    ticketUrl: 'https://example.com/t',
    sample: true,
  };
}

describe('estados de evento', () => {
  it('sólo «a la venta» es comprable', () => {
    for (const s of EVENT_STATES) expect(canBuy(ev('x', s, 5))).toBe(s === 'on_sale');
  });

  it('borrador y finalizado no salen en próximos; el resto sí, por fecha', () => {
    const events = EVENT_STATES.map((s, i) => ev(s, s, 10 - i));
    const listed = upcomingEvents(events, NOW).map((e) => e.state);
    expect(new Set(listed)).toEqual(
      new Set(EVENT_STATES.filter((s) => EVENT_STATE_BEHAVIOR[s].listed)),
    );
    expect(listed).not.toContain('draft');
    expect(listed).not.toContain('finished');
    const dates = upcomingEvents(events, NOW).map((e) => e.startsAt);
    expect(dates).toEqual([...dates].sort());
  });

  it('un evento pasado o excluido a mano no sale en próximos', () => {
    const events = [ev('pasado', 'on_sale', -3), ev('fuera', 'on_sale', 3), ev('ok', 'on_sale', 4)];
    expect(upcomingEvents(events, NOW, ['fuera']).map((e) => e.id)).toEqual(['ok']);
  });

  it('el prioritario cae al primer comprable si el elegido ya no está vigente', () => {
    const events = [
      ev('cancelado', 'cancelled', 2),
      ev('pronto', 'coming_soon', 3),
      ev('venta', 'on_sale', 9),
    ];
    expect(resolvePriorityEvent(events, 'cancelado', NOW)?.id).toBe('venta');
    expect(resolvePriorityEvent(events, 'pronto', NOW)?.id).toBe('pronto');
    expect(resolvePriorityEvent([], undefined, NOW)).toBeUndefined();
  });
});

describe('contratos', () => {
  it('purchase_confirmed no es un evento de cliente', () => {
    expect(FUNNEL_EVENTS).toContain('purchase_confirmed');
    expect(CLIENT_FUNNEL_EVENTS).not.toContain('purchase_confirmed');
    expect(CLIENT_FUNNEL_EVENTS).toHaveLength(FUNNEL_EVENTS.length - 1);
  });

  it('la lista de bloques rechaza ids repetidos', () => {
    const block = {
      id: 'a',
      type: 'store',
      visible: true,
      url: 'https://example.com',
      products: [],
    };
    expect(homeBlocksSchema.safeParse([block, { ...block }]).success).toBe(false);
    expect(homeBlocksSchema.safeParse([block, { ...block, id: 'b' }]).success).toBe(true);
  });
});
