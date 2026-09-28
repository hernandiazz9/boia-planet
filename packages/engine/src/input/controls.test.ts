import { describe, expect, it } from 'vitest';
import { KeyboardControls, TouchControls, readShipInput } from './controls';

describe('joystick táctil', () => {
  it('nace donde toca el primer dedo, con zona muerta y radio', () => {
    const t = new TouchControls({ radius: 56, deadZone: 8 });
    t.down(1, 300, 500);
    expect(t.view()).toMatchObject({ originX: 300, originY: 500 });
    t.move(1, 305, 500);
    expect(t.vector().magnitude).toBe(0);
    t.move(1, 300 + 32, 500);
    expect(t.vector().magnitude).toBeCloseTo((32 - 8) / (56 - 8), 9);
    t.move(1, 300 + 200, 500);
    expect(t.vector().magnitude).toBe(1);
    expect(t.view()!.knobX).toBe(356);
  });

  it('el segundo dedo mantiene el drift; soltarlo lo quita', () => {
    const t = new TouchControls();
    t.down(1, 0, 0);
    t.move(1, 0, -60);
    expect(t.drift).toBe(false);
    t.down(2, 100, 100);
    expect(t.drift).toBe(true);
    t.move(2, 500, 500);
    expect(t.view()!.originX).toBe(0);
    t.up(2);
    expect(t.drift).toBe(false);
  });

  it('perder el dedo del joystick deja el acelerador a cero aunque siga el otro', () => {
    const t = new TouchControls();
    const k = new KeyboardControls();
    t.down(1, 0, 0);
    t.move(1, 60, 0);
    t.down(2, 50, 50);
    expect(readShipInput(t, k).throttle).toBe(1);
    t.up(1);
    expect(readShipInput(t, k)).toMatchObject({ throttle: 0, drift: false });
    // Un dedo nuevo crea un joystick nuevo en su punto.
    t.down(3, 200, 200);
    expect(t.view()).toMatchObject({ originX: 200, originY: 200 });
  });

  it('soltar todo (cambio de pestaña) no deja nada pegado', () => {
    const t = new TouchControls();
    const k = new KeyboardControls();
    t.down(1, 0, 0);
    t.move(1, 0, -60);
    t.down(2, 1, 1);
    k.down('KeyW');
    k.down('ShiftLeft');
    t.releaseAll();
    k.releaseAll();
    expect(readShipInput(t, k)).toEqual({ dirX: 0, dirY: 0, throttle: 0, drift: false });
  });

  it('la dirección de pantalla del joystick pasa al plano del agua (y ×2)', () => {
    const t = new TouchControls();
    t.down(1, 0, 0);
    t.move(1, 60, -60);
    const input = readShipInput(t, new KeyboardControls());
    expect(input.dirX).toBeCloseTo(1 / Math.sqrt(5), 9);
    expect(input.dirY).toBeCloseTo(-2 / Math.sqrt(5), 9);
  });
});

describe('teclado', () => {
  it('flechas y WASD dan dirección de pantalla; Shift, drift', () => {
    const k = new KeyboardControls();
    const t = new TouchControls();
    k.down('ArrowUp');
    expect(readShipInput(t, k)).toMatchObject({ dirX: 0, dirY: -1, throttle: 1, drift: false });
    k.down('KeyD');
    k.down('ShiftRight');
    const i = readShipInput(t, k);
    expect(i.dirX).toBeGreaterThan(0);
    expect(i.dirY).toBeLessThan(0);
    expect(i.drift).toBe(true);
    k.up('ArrowUp');
    k.up('KeyD');
    expect(readShipInput(t, k).throttle).toBe(0);
  });

  it('el joystick tiene prioridad sobre el teclado', () => {
    const k = new KeyboardControls();
    const t = new TouchControls();
    k.down('ArrowUp');
    t.down(1, 0, 0);
    t.move(1, 60, 0);
    expect(readShipInput(t, k)).toMatchObject({ dirX: 1, dirY: 0 });
  });
});
