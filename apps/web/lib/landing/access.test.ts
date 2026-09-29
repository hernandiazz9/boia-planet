import { SETTINGS_KEY, parseSettings } from '@boia/engine/ui';
import { commonIslandId, effectiveEvents } from '@boia/contracts';
import { describe, expect, it } from 'vitest';
import { resolveHome } from './resolve';
import { SAMPLE_CONTENT } from './sample-content';
import { SOUND_SETTINGS_KEY, soundOn, withSound } from './sound-pref';

/**
 * Cabecera y pie de la landing (T44): el interruptor de sonido escribe los
 * ajustes que lee el juego, y la vista trae los enlaces oficiales y la isla
 * del acceso de Tickets.
 */

describe('sonido de la cabecera (REQ-ENT-029)', () => {
  it('usa la misma clave que los ajustes del juego', () => {
    expect(SOUND_SETTINGS_KEY).toBe(SETTINGS_KEY);
  });

  it('apaga y enciende música y efectos a la vez, sin tocar el resto', () => {
    expect(soundOn(null)).toBe(true);
    const saved = JSON.stringify({ keyboardMode: 'tank', music: { enabled: true, volume: 0.3 } });
    const off = withSound(saved, false);
    expect(soundOn(off)).toBe(false);
    const game = parseSettings(JSON.parse(off));
    expect(game.music).toEqual({ enabled: false, volume: 0.3 });
    expect(game.sfx.enabled).toBe(false);
    expect(game.keyboardMode).toBe('tank');
    const on = parseSettings(JSON.parse(withSound(off, true)));
    expect(on.music.enabled && on.sfx.enabled).toBe(true);
  });

  it('lo que no se entiende cuenta como sonido activado', () => {
    expect(soundOn('{roto')).toBe(true);
    expect(soundOn('[]')).toBe(true);
  });
});

describe('vista de la home: enlaces oficiales e isla de Tickets', () => {
  const now = new Date('2026-09-29T12:00:00Z');
  const view = resolveHome(SAMPLE_CONTENT, now);

  it('Instagram y WhatsApp salen de los enlaces del contenido (O13, REQ-ENT-032)', () => {
    const links = SAMPLE_CONTENT.blocks.flatMap((b) =>
      b.type === 'footer' ? b.officialLinks : b.type === 'contact' ? b.links : [],
    );
    expect(view.social.instagram).toBe(links.find((l) => /instagram/i.test(l.label))?.url);
    expect(view.social.whatsapp).toBe(links.find((l) => /whatsapp/i.test(l.label))?.url);
  });

  it('la isla del evento destacado o, sin isla, la localización común (O7)', () => {
    const featured = view.tickets.featured;
    expect(view.ticketsIsland).toBe(
      featured?.islandId ?? commonIslandId(effectiveEvents(SAMPLE_CONTENT.events, now), now),
    );
  });
});
