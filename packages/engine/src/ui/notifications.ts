/**
 * Cola de avisos de descubrimiento y logro (§14, REQ-IDE-026, D-07): uno a
 * la vez, 4 s cada uno, en orden de llegada. Sin DOM ni reloj propio: quien
 * la usa le pasa la hora (ms) y pinta sólo `current`.
 */

export type NoticeKind = 'discovery' | 'achievement' | 'reward' | 'info';

export interface Notice {
  /** Identifica el aviso: el mismo id no se encola dos veces a la vez. */
  id: string;
  kind: NoticeKind;
  title: string;
  body?: string;
}

export interface ShownNotice {
  notice: Notice;
  shownAt: number;
  until: number;
}

export const NOTICE_DURATION_MS = 4000;
/** Pausa entre dos avisos seguidos, para que se lean como dos. muestra */
export const NOTICE_GAP_MS = 300;
/** Avisos pendientes como mucho; los que sobran se descartan. muestra */
export const NOTICE_MAX_PENDING = 8;

export interface NoticeQueueOptions {
  durationMs?: number;
  gapMs?: number;
  maxPending?: number;
  /** Se llama al empezar a verse cada aviso (sonido corto). */
  onShow?: (n: Notice) => void;
}

export class NoticeQueue {
  private readonly pending: Array<{ notice: Notice; queuedAt: number }> = [];
  private shown: ShownNotice | null = null;
  /** Cuándo se puede enseñar el siguiente (fin del anterior + pausa). */
  private freeAt = -Infinity;
  private readonly duration: number;
  private readonly gap: number;
  private readonly max: number;
  private readonly onShow: ((n: Notice) => void) | undefined;

  constructor(opts: NoticeQueueOptions = {}) {
    this.duration = opts.durationMs ?? NOTICE_DURATION_MS;
    this.gap = opts.gapMs ?? NOTICE_GAP_MS;
    this.max = opts.maxPending ?? NOTICE_MAX_PENDING;
    this.onShow = opts.onShow;
  }

  /** Encola un aviso. Devuelve false si ya estaba (visible o pendiente) o la cola está llena. */
  push(n: Notice, now: number): boolean {
    this.update(now);
    if (this.shown?.notice.id === n.id || this.pending.some((p) => p.notice.id === n.id))
      return false;
    if (this.pending.length >= this.max) return false;
    this.pending.push({ notice: n, queuedAt: now });
    this.update(now);
    return true;
  }

  /**
   * Avanza hasta `now` y devuelve el aviso visible. Si pasó mucho tiempo (la
   * pestaña estuvo oculta), recorre la cola como si hubiera corrido el reloj:
   * cada aviso sigue durando lo suyo y nunca hay dos a la vez.
   */
  update(now: number): ShownNotice | null {
    for (;;) {
      if (this.shown && now >= this.shown.until) {
        this.freeAt = this.shown.until + this.gap;
        this.shown = null;
      }
      const next = this.pending[0];
      if (this.shown || !next) break;
      const shownAt = Math.max(this.freeAt, next.queuedAt);
      if (now < shownAt) break;
      this.pending.shift();
      this.shown = { notice: next.notice, shownAt, until: shownAt + this.duration };
      if (now < this.shown.until) this.onShow?.(next.notice);
    }
    return this.shown;
  }

  get current(): ShownNotice | null {
    return this.shown;
  }

  get size(): number {
    return this.pending.length;
  }

  /** Próximo instante en que cambia algo (para programar un temporizador). */
  nextChangeAt(): number | null {
    if (this.shown) return this.shown.until;
    const next = this.pending[0];
    if (next) return Math.max(this.freeAt, next.queuedAt);
    return null;
  }

  /** Cierra el aviso visible antes de tiempo (toque); el siguiente espera la pausa. */
  dismiss(now: number): void {
    if (!this.shown) return;
    this.shown = null;
    this.freeAt = now + this.gap;
  }

  clear(): void {
    this.pending.length = 0;
    this.shown = null;
  }
}
