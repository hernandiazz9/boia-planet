import { describe, expect, it } from 'vitest';
import { wrapAngle } from '../math';
import { DEFAULT_SHIP_CONFIG } from '../ship/config';
import { createShipState, stepShip } from '../ship/controller';
import {
  DEFAULT_KEYBOARD_MODE,
  KeyboardControls,
  TANK_TURN_THROTTLE,
  SENSITIVITY_RANGE,
  TouchControls,
  controlSensitivity,
  isKeyboardMode,
  readShipInput,
  setControlSensitivity,
} from './controls';

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

describe('modos de teclado (D-14)', () => {
  /** Navega `seconds` con el teclado tal como está y devuelve el barco. */
  function sail(k: KeyboardControls, heading: number, seconds: number) {
    const ship = createShipState(0, 0, heading);
    const t = new TouchControls();
    const dt = 1 / 60;
    for (let i = 0; i < seconds * 60; i++) {
      stepShip(ship, readShipInput(t, k, ship.heading), DEFAULT_SHIP_CONFIG, dt);
    }
    return ship;
  }

  it('por defecto es dirección de pantalla; sólo hay dos modos válidos', () => {
    expect(DEFAULT_KEYBOARD_MODE).toBe('screen');
    expect(new KeyboardControls().mode).toBe(DEFAULT_KEYBOARD_MODE);
    expect(isKeyboardMode('screen')).toBe(true);
    expect(isKeyboardMode('tank')).toBe(true);
    expect(isKeyboardMode('joystick')).toBe(false);
    expect(isKeyboardMode(undefined)).toBe(false);
  });

  it('pantalla: arriba lleva el barco hacia arriba sea cual sea su rumbo', () => {
    const k = new KeyboardControls('screen');
    k.down('ArrowUp');
    // Mirando al este, a la derecha de la pantalla.
    expect(readShipInput(new TouchControls(), k, 0)).toMatchObject({ dirX: 0, dirY: -1 });
    const ship = sail(k, 0, 3);
    expect(wrapAngle(ship.heading - -Math.PI / 2)).toBeCloseTo(0, 3);
    expect(ship.y).toBeLessThan(-50);
  });

  it('tanque: arriba avanza en el rumbo actual, no hacia arriba', () => {
    const k = new KeyboardControls('tank');
    k.down('ArrowUp');
    const i = readShipInput(new TouchControls(), k, 0);
    expect(i).toMatchObject({ dirX: 1, dirY: 0, throttle: 1, drift: false });
    const ship = sail(k, 0, 2);
    expect(ship.heading).toBeCloseTo(0, 9);
    expect(ship.x).toBeGreaterThan(50);
    expect(Math.abs(ship.y)).toBeLessThan(1e-6);
  });

  it('tanque: derecha gira en sentido horario, izquierda al revés, sin soltar el rumbo', () => {
    const right = new KeyboardControls('tank');
    right.down('ArrowUp');
    right.down('KeyD');
    const r = readShipInput(new TouchControls(), right, 0);
    expect(r.dirY).toBeGreaterThan(0); // horario en pantalla = hacia el espectador
    const after = sail(right, 0, 0.5);
    expect(after.heading).toBeGreaterThan(0.3);

    const left = new KeyboardControls('tank');
    left.down('ArrowUp');
    left.down('ArrowLeft');
    expect(sail(left, 0, 0.5).heading).toBeLessThan(-0.3);

    // Sin tecla de giro el rumbo se queda donde lo dejó el giro.
    right.up('KeyD');
    const held = readShipInput(new TouchControls(), right, 1.234);
    expect(Math.atan2(held.dirY, held.dirX)).toBeCloseTo(1.234, 9);
  });

  it('tanque: girar sin acelerar da un empuje mínimo; abajo suelta; Shift, drift', () => {
    const k = new KeyboardControls('tank');
    const t = new TouchControls();
    expect(readShipInput(t, k, 0)).toEqual({ dirX: 0, dirY: 0, throttle: 0, drift: false });
    k.down('ArrowRight');
    expect(readShipInput(t, k, 0).throttle).toBe(TANK_TURN_THROTTLE);
    k.down('ArrowDown');
    expect(readShipInput(t, k, 0).throttle).toBe(0);
    k.up('ArrowDown');
    k.down('ArrowUp');
    k.down('ShiftLeft');
    expect(readShipInput(t, k, 0)).toMatchObject({ throttle: 1, drift: true });
  });

  it('el joystick manda también en modo tanque', () => {
    const k = new KeyboardControls('tank');
    k.down('ArrowUp');
    const t = new TouchControls();
    t.down(1, 0, 0);
    t.move(1, 0, -60);
    expect(readShipInput(t, k, 0)).toMatchObject({ dirX: 0, dirY: -1 });
  });

  it('cambiar de modo en caliente cambia la lectura de las mismas teclas', () => {
    const k = new KeyboardControls();
    k.down('ArrowRight');
    const t = new TouchControls();
    expect(readShipInput(t, k, -Math.PI / 2)).toMatchObject({ dirX: 1, dirY: 0, throttle: 1 });
    k.mode = 'tank';
    const i = readShipInput(t, k, -Math.PI / 2);
    expect(i.throttle).toBe(TANK_TURN_THROTTLE);
    expect(i.dirX).toBeGreaterThan(0);
    expect(i.dirY).toBeLessThan(0);
  });
});

describe('sensibilidad (REQ-MUN-008)', () => {
  it('teclado y dedo llevan su propia sensibilidad a la entrada del barco', () => {
    const sens = { keyboard: 1.4, touch: 0.6 };
    const k = new KeyboardControls();
    const t = new TouchControls();
    k.down('ArrowRight');
    expect(readShipInput(t, k, 0, sens).turnScale).toBe(sens.keyboard);
    k.mode = 'tank';
    expect(readShipInput(t, k, 0, sens).turnScale).toBe(sens.keyboard);
    t.down(1, 0, 0);
    t.move(1, 100, 0);
    expect(readShipInput(t, k, 0, sens).turnScale).toBe(sens.touch);
  });

  it('más sensibilidad, el barco gira antes hacia el rumbo pedido', () => {
    const turnAfter = (keyboard: number) => {
      const k = new KeyboardControls();
      const t = new TouchControls();
      k.down('ArrowDown');
      const s = createShipState(0, 0, 0);
      for (let i = 0; i < 20; i++) {
        const input = readShipInput(t, k, s.heading, { keyboard, touch: 1 });
        stepShip(s, input, DEFAULT_SHIP_CONFIG, 1 / 60);
      }
      return Math.abs(wrapAngle(s.heading));
    };
    const { min, max } = SENSITIVITY_RANGE;
    expect(turnAfter(max)).toBeGreaterThan(turnAfter(1));
    expect(turnAfter(1)).toBeGreaterThan(turnAfter(min));
  });

  it('setControlSensitivity cambia la que usa el juego y recorta al rango', () => {
    const before = controlSensitivity();
    try {
      setControlSensitivity({ keyboard: 9 });
      expect(controlSensitivity()).toEqual({
        keyboard: SENSITIVITY_RANGE.max,
        touch: before.touch,
      });
      const k = new KeyboardControls();
      k.down('ArrowUp');
      expect(readShipInput(new TouchControls(), k).turnScale).toBe(SENSITIVITY_RANGE.max);
    } finally {
      setControlSensitivity(before);
    }
  });
});
