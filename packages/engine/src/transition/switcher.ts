import { type SwitchMode, SwitchTimeline } from './timeline';

/**
 * Quién decide cuándo se cambia el mundo en pantalla (T41), sin Pixi: pide el
 * mundo nuevo mientras el de antes cae al agujero, lo pone cuando la pantalla
 * está a oscuras y abre. Sólo hay un mundo en escena: el que llega tarde
 * (otra petición lo adelantó) se destruye sin ponerse, y el que se quita se
 * destruye al quitarlo.
 *
 * El barco no es cosa suya: el juego lo deja quieto mientras `locked` y lo
 * encuentra donde estaba, con su rumbo, su pasajera y su misión.
 */

export interface SwitchScene {
  destroy(): void;
}

export interface SwitcherHooks<S extends SwitchScene> {
  /**
   * Pone `next` en lugar del mundo de ahora (y destruye el de ahora). Se
   * llama con la pantalla a oscuras (o, en el fundido, justo antes de abrir).
   */
  swap(next: S): void;
}

export class WorldSwitcher<S extends SwitchScene> {
  readonly timeline = new SwitchTimeline();
  private request = 0;
  private destroyed = false;

  constructor(private readonly hooks: SwitcherHooks<S>) {}

  /** Hay transición: entrada bloqueada y barco quieto. */
  get locked(): boolean {
    return this.timeline.active;
  }

  /**
   * Avanza el reloj de la transición `ms`. Devuelve si la simulación puede
   * correr en este fotograma (no, mientras hay transición).
   */
  advance(ms: number): boolean {
    this.timeline.tick(ms);
    return !this.timeline.active;
  }

  /**
   * Cambia al mundo que da `build`. Resuelve `true` si quedó puesto y
   * `false` si otra petición lo adelantó (o el juego se destruyó). Si
   * `build` falla y no hay otra petición, se abre sobre el mundo de antes.
   */
  async switchTo(build: () => Promise<S>, mode: SwitchMode): Promise<boolean> {
    const request = ++this.request;
    this.timeline.begin(mode);
    const stale = () => this.destroyed || request !== this.request;
    let next: S;
    try {
      next = await build();
    } catch (err) {
      if (!stale()) this.timeline.release();
      throw err;
    }
    if (stale()) {
      next.destroy();
      return false;
    }
    await this.timeline.whenDark();
    if (stale()) {
      next.destroy();
      return false;
    }
    this.hooks.swap(next);
    this.timeline.release();
    return true;
  }

  destroy(): void {
    this.destroyed = true;
    this.timeline.cancel();
  }
}
