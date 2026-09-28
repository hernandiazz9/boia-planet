import { screenVectorToWorld } from '@boia/world';
import { clamp } from '../math';
import type { ShipInput } from '../ship/controller';

export interface JoystickConfig {
  /** Radio del joystick en px CSS. muestra */
  radius: number;
  /** Zona muerta en px CSS. muestra */
  deadZone: number;
}

export const DEFAULT_JOYSTICK: JoystickConfig = { radius: 56, deadZone: 8 };

export interface JoystickView {
  originX: number;
  originY: number;
  knobX: number;
  knobY: number;
}

interface Stick {
  id: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
}

/**
 * Estado táctil sin DOM. El primer dedo crea el joystick donde toca (D-12);
 * cualquier dedo más mantiene el drift mientras esté apoyado. Soltar el dedo
 * del joystick deja el acelerador a cero aunque siga otro dedo apoyado.
 */
export class TouchControls {
  private stick: Stick | null = null;
  private readonly extra = new Set<number>();

  constructor(readonly cfg: JoystickConfig = DEFAULT_JOYSTICK) {}

  down(id: number, x: number, y: number): void {
    if (this.stick?.id === id || this.extra.has(id)) return;
    if (!this.stick) this.stick = { id, originX: x, originY: y, x, y };
    else this.extra.add(id);
  }

  move(id: number, x: number, y: number): void {
    if (this.stick?.id !== id) return;
    this.stick.x = x;
    this.stick.y = y;
  }

  up(id: number): void {
    if (this.stick?.id === id) this.stick = null;
    this.extra.delete(id);
  }

  releaseAll(): void {
    this.stick = null;
    this.extra.clear();
  }

  get active(): boolean {
    return this.stick !== null;
  }

  /** Vector de pantalla con módulo 0..1 (0 dentro de la zona muerta). */
  vector(): { x: number; y: number; magnitude: number } {
    if (!this.stick) return { x: 0, y: 0, magnitude: 0 };
    const dx = this.stick.x - this.stick.originX;
    const dy = this.stick.y - this.stick.originY;
    const len = Math.hypot(dx, dy);
    const { radius, deadZone } = this.cfg;
    if (len <= deadZone) return { x: 0, y: 0, magnitude: 0 };
    const magnitude = clamp((len - deadZone) / (radius - deadZone), 0, 1);
    return { x: dx / len, y: dy / len, magnitude };
  }

  get drift(): boolean {
    return this.stick !== null && this.extra.size > 0;
  }

  view(): JoystickView | null {
    if (!this.stick) return null;
    const dx = this.stick.x - this.stick.originX;
    const dy = this.stick.y - this.stick.originY;
    const len = Math.hypot(dx, dy);
    const k = len > this.cfg.radius ? this.cfg.radius / len : 1;
    return {
      originX: this.stick.originX,
      originY: this.stick.originY,
      knobX: this.stick.originX + dx * k,
      knobY: this.stick.originY + dy * k,
    };
  }
}

const KEY_UP = new Set(['ArrowUp', 'KeyW']);
const KEY_DOWN = new Set(['ArrowDown', 'KeyS']);
const KEY_LEFT = new Set(['ArrowLeft', 'KeyA']);
const KEY_RIGHT = new Set(['ArrowRight', 'KeyD']);
const KEY_DRIFT = new Set(['ShiftLeft', 'ShiftRight']);

export function isControlKey(code: string): boolean {
  return [KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT, KEY_DRIFT].some((s) => s.has(code));
}

/**
 * Modo del teclado (D-14). `screen`, por defecto: flechas o WASD dan la
 * dirección en pantalla, igual que el joystick. `tank`: arriba acelera,
 * izquierda y derecha giran el casco, abajo suelta (el barco frena suave).
 */
export type KeyboardMode = 'screen' | 'tank';
export const KEYBOARD_MODES: readonly KeyboardMode[] = ['screen', 'tank'];
export const DEFAULT_KEYBOARD_MODE: KeyboardMode = 'screen';

export function isKeyboardMode(v: unknown): v is KeyboardMode {
  return v === 'screen' || v === 'tank';
}

/**
 * Tanque: ángulo que se pide por delante del rumbo al girar. El controlador
 * limita el giro a `turnRate` por paso, así que basta con que supere ese
 * tope; pequeño para no restar mucho empuje (el controlador acelera menos
 * cuanto más de espaldas queda el rumbo pedido). muestra
 */
export const TANK_STEER_ANGLE = 0.6;
/** Tanque: acelerador al girar sin pulsar arriba (un barco no gira parado). muestra */
export const TANK_TURN_THROTTLE = 0.4;

/**
 * Teclado: flechas o WASD, según el modo (D-14); Shift, drift.
 * Se usa `KeyboardEvent.code`, que no depende de la distribución.
 */
export class KeyboardControls {
  private readonly pressed = new Set<string>();

  constructor(public mode: KeyboardMode = DEFAULT_KEYBOARD_MODE) {}

  down(code: string): void {
    this.pressed.add(code);
  }

  up(code: string): void {
    this.pressed.delete(code);
  }

  releaseAll(): void {
    this.pressed.clear();
  }

  private any(keys: Set<string>): boolean {
    for (const k of keys) if (this.pressed.has(k)) return true;
    return false;
  }

  /** Modo `screen`: vector de pantalla con módulo 0 o 1. */
  vector(): { x: number; y: number; magnitude: number } {
    const x = (this.any(KEY_RIGHT) ? 1 : 0) - (this.any(KEY_LEFT) ? 1 : 0);
    const y = (this.any(KEY_DOWN) ? 1 : 0) - (this.any(KEY_UP) ? 1 : 0);
    const len = Math.hypot(x, y);
    return len === 0 ? { x: 0, y: 0, magnitude: 0 } : { x: x / len, y: y / len, magnitude: 1 };
  }

  /**
   * Modo `tank`: giro (-1 izquierda, +1 derecha en pantalla) y acelerador.
   * Abajo gana a arriba: frena.
   */
  tank(): { turn: number; throttle: number } {
    const turn = (this.any(KEY_RIGHT) ? 1 : 0) - (this.any(KEY_LEFT) ? 1 : 0);
    const forward = this.any(KEY_UP) && !this.any(KEY_DOWN);
    const throttle = forward ? 1 : turn !== 0 && !this.any(KEY_DOWN) ? TANK_TURN_THROTTLE : 0;
    return { turn, throttle };
  }

  get drift(): boolean {
    return this.any(KEY_DRIFT);
  }
}

const IDLE = { dirX: 0, dirY: 0, throttle: 0, drift: false };

/**
 * Combina táctil y teclado en la entrada del barco, en coordenadas de mundo.
 * `heading` (rumbo actual del casco) sólo lo usa el modo tanque.
 */
export function readShipInput(
  touch: TouchControls,
  keys: KeyboardControls,
  heading = 0,
): ShipInput {
  if (!touch.active && keys.mode === 'tank') {
    const { turn, throttle } = keys.tank();
    if (throttle === 0) return { ...IDLE };
    // La proyección sólo aplasta y: el sentido de giro en pantalla y en el
    // plano del agua coincide (ángulo positivo = horario en pantalla).
    const a = heading + turn * TANK_STEER_ANGLE;
    return { dirX: Math.cos(a), dirY: Math.sin(a), throttle, drift: keys.drift };
  }
  const useTouch = touch.active;
  const v = useTouch ? touch.vector() : keys.vector();
  if (v.magnitude === 0) return { ...IDLE };
  const w = screenVectorToWorld(v);
  const len = Math.hypot(w.x, w.y);
  return {
    dirX: w.x / len,
    dirY: w.y / len,
    throttle: v.magnitude,
    drift: useTouch ? touch.drift : keys.drift,
  };
}
