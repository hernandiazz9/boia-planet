import type { WorldObject } from '@boia/world';

/**
 * Encuentros del mar vivo que el catálogo no guioniza solo (T20): el delfín
 * que se deja seguir (REQ-AVE-018) y el reto del remolino (REQ-AVE-019). Sin
 * React ni motor: la web los alimenta con los eventos de proximidad y aplica
 * lo que devuelven (mover el delfín, conceder el premio). Números `muestra`.
 */

type Point = { x: number; y: number };

function pointList(v: unknown): Point[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((p) => {
    const x = (p as Point | null)?.x;
    const y = (p as Point | null)?.y;
    return typeof x === 'number' && typeof y === 'number' ? [{ x, y }] : [];
  });
}

/**
 * El delfín: cada vez que el barco lo alcanza salta al siguiente punto de su
 * rastro (`params.trail`); tras el último salto, alcanzarlo da el premio y
 * vuelve a su sitio para otra vuelta.
 */
export class DolphinTrail {
  readonly objectId: string;
  readonly home: Point;
  readonly trail: Point[];
  readonly coins: number;
  private step = 0;

  constructor(o: WorldObject) {
    this.objectId = o.identity.id;
    this.home = { x: o.position.x, y: o.position.y };
    this.trail = pointList(o.params?.trail);
    const c = o.params?.rewardCoins;
    this.coins = typeof c === 'number' && c > 0 ? Math.round(c) : 10;
  }

  /** El barco llegó hasta el delfín: adónde salta y si toca premio. */
  reached(): { moveTo: Point; reward: boolean } {
    if (this.step < this.trail.length) {
      return { moveTo: this.trail[this.step++]!, reward: false };
    }
    this.step = 0;
    return { moveTo: this.home, reward: true };
  }

  get jumps(): number {
    return this.step;
  }
}

export function findDolphin(objects: readonly WorldObject[]): DolphinTrail | null {
  const o = objects.find((x) => x.identity.category === 'delfin' && x.identity.active);
  return o ? new DolphinTrail(o) : null;
}

/** Tramos del remolino: segundos dentro → monedas, cada tramo una vez al día. muestra */
export const WHIRLPOOL_TIERS: readonly { seconds: number; coins: number }[] = [
  { seconds: 3, coins: 2 },
  { seconds: 6, coins: 4 },
  { seconds: 10, coins: 6 },
];

/**
 * El reto del remolino: cuánto aguanta el barco dentro (más tiempo, más
 * premio). Devuelve los tramos alcanzados al salir.
 */
export class WhirlpoolTimer {
  private enteredAt: number | null = null;

  enter(now: number): void {
    this.enteredAt ??= now;
  }

  /** Salida: los tramos conseguidos (de menor a mayor). */
  exit(now: number): { seconds: number; tiers: typeof WHIRLPOOL_TIERS } {
    const t = this.enteredAt === null ? 0 : (now - this.enteredAt) / 1000;
    this.enteredAt = null;
    return { seconds: t, tiers: WHIRLPOOL_TIERS.filter((x) => t >= x.seconds) };
  }

  get inside(): boolean {
    return this.enteredAt !== null;
  }
}
