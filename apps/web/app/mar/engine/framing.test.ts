import { describe, expect, it } from 'vitest';
import {
  FOCUS_RATE,
  LOOK_AHEAD,
  SPEED_LEAD,
  START_ZOOM,
  lookAhead,
  portraitness,
  startZoom,
} from './framing';

describe('el encuadre de la cámara de /mar según la pantalla', () => {
  it('en apaisado (escritorio) sale y mira como siempre', () => {
    for (const aspect of [16 / 9, 4 / 3, 1]) {
      expect(portraitness(aspect)).toBe(0);
      expect(startZoom(aspect)).toBe(START_ZOOM.wide);
      expect(lookAhead(aspect)).toEqual({
        ahead: LOOK_AHEAD.wide,
        lead: SPEED_LEAD.wide,
        catchUp: 0,
      });
    }
  });

  it('en un móvil en vertical (360–430 px de ancho) sale más lejos y con el barco centrado', () => {
    for (const [w, h] of [
      [360, 640],
      [390, 844],
      [430, 932],
    ] as const) {
      const aspect = w / h;
      expect(startZoom(aspect)).toBeGreaterThan(START_ZOOM.wide);
      expect(startZoom(aspect)).toBeLessThanOrEqual(START_ZOOM.portrait);
      const look = lookAhead(aspect);
      expect(look.ahead).toBeLessThan(LOOK_AHEAD.wide / 3);
      expect(look.lead).toBeLessThan(SPEED_LEAD.wide / 3);
      // El retraso del foco al navegar, compensado.
      expect(look.catchUp).toBeCloseTo(portraitness(aspect) / FOCUS_RATE, 9);
    }
    expect(startZoom(390 / 844)).toBe(START_ZOOM.portrait);
  });

  it('entre medias (una tableta en vertical) pasa de uno a otro sin saltos', () => {
    const a = startZoom(0.8);
    const b = startZoom(0.79);
    expect(a).toBeGreaterThan(START_ZOOM.wide);
    expect(a).toBeLessThan(START_ZOOM.portrait);
    expect(Math.abs(a - b)).toBeLessThan(0.002);
  });
});
