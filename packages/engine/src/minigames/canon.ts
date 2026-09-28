import { between, rng } from './rng';
import { outline, wash } from './skin';
import type {
  BaseConfig,
  DrawOptions,
  Ending,
  MinigameDefinition,
  MinigameInput,
  MinigameSim,
  MinigameSkin,
  Point,
  SimEvent,
  StatusItem,
} from './types';

/**
 * Cañón contra tiburones (REQ-AVE-037). Se apunta arrastrando (el punto de
 * caída sigue al dedo), con el puntero o con las flechas; al soltar o con
 * FUEGO sale una bola en arco que salpica al caer. Un tiburón en superficie
 * dentro de la salpicadura se asusta y se va: nunca hay heridas. Los
 * tiburones siguen patrones versionados, se sumergen y cambian de rumbo.
 *
 * Fin: 3 tiburones ahuyentados (gana), o se acaba el tiempo o la munición
 * (pierde). Todo `muestra`.
 */

export type SharkPattern = 'recto' | 'zigzag' | 'circulo';

/** Patrones de tiburón, por versión: cambiar uno sube `patternVersion`. */
export const SHARK_PATTERNS: Record<number, readonly SharkPattern[]> = {
  1: ['recto', 'zigzag', 'circulo'],
};

export interface CanonConfig extends BaseConfig {
  ammo: number;
  reloadS: number;
  flightS: number;
  /** Radio de la salpicadura (lógico): generoso, no exige precisión de un píxel. */
  splashRadius: number;
  /** Velocidad del punto de mira con el teclado (lógico/s). */
  aimSpeed: number;
  sharks: {
    patternVersion: number;
    concurrent: number;
    speedMin: number;
    speedMax: number;
    fleeSpeed: number;
    respawnS: number;
    diveEveryS: readonly [number, number];
    diveForS: readonly [number, number];
    turnEveryS: readonly [number, number];
  };
}

export const CANON_DEFAULTS: CanonConfig = {
  version: 1,
  goal: 3,
  timeLimitS: 60,
  ammo: 10,
  reloadS: 0.7,
  flightS: 0.9,
  splashRadius: 0.09,
  aimSpeed: 0.55,
  sharks: {
    patternVersion: 1,
    concurrent: 2,
    speedMin: 0.06,
    speedMax: 0.11,
    fleeSpeed: 0.4,
    respawnS: 1.2,
    diveEveryS: [3, 6],
    diveForS: [1, 1.8],
    turnEveryS: [2, 4],
  },
  reward: { policy: 'season', points: 20, coins: 8, maxPoints: 40, maxCoins: 16 },
};

export const CANNON: Point = { x: 0.5, y: 0.9 };
/** Zona de mar donde nadan los tiburones y cae la bola. */
export const SEA_AREA = { left: 0.06, right: 0.94, top: 0.14, bottom: 0.72 } as const;
const SHARK_RADIUS = 0.03;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export interface Shark {
  id: number;
  x: number;
  y: number;
  /** Rumbo base (rad; x = cos, y = sin). */
  heading: number;
  speed: number;
  pattern: SharkPattern;
  phase: number;
  spin: 1 | -1;
  submerged: boolean;
  diveTimer: number;
  turnTimer: number;
  state: 'swimming' | 'fleeing' | 'gone';
}

interface Ball {
  from: Point;
  to: Point;
  t: number;
}

interface Mark {
  kind: 'scare' | 'miss';
  x: number;
  y: number;
  age: number;
}

export class CanonSim implements MinigameSim {
  time = 0;
  score = 0;
  ammo: number;
  ended: Ending | null = null;
  readonly sharks: Shark[] = [];
  readonly balls: Ball[] = [];
  private target: Point = { x: 0.5, y: 0.42 };
  private reload = 0;
  private nextId = 0;
  private pendingSpawns: number[] = [];
  private marks: Mark[] = [];
  private readonly r: () => number;
  private readonly patterns: readonly SharkPattern[];

  constructor(
    seed: number,
    readonly config: CanonConfig,
  ) {
    this.r = rng(seed);
    this.ammo = config.ammo;
    this.patterns = SHARK_PATTERNS[config.sharks.patternVersion] ?? SHARK_PATTERNS[1]!;
    for (let i = 0; i < config.sharks.concurrent; i++) this.spawn();
  }

  aim(): Point {
    return { ...this.target };
  }

  private spawn() {
    const s = this.config.sharks;
    const r = this.r;
    const pattern = this.patterns[Math.floor(r() * this.patterns.length)] ?? 'recto';
    this.sharks.push({
      id: this.nextId++,
      x: between(r, SEA_AREA.left + 0.05, SEA_AREA.right - 0.05),
      y: between(r, SEA_AREA.top + 0.04, SEA_AREA.bottom - 0.12),
      heading: between(r, 0, Math.PI * 2),
      speed: between(r, s.speedMin, s.speedMax),
      pattern,
      phase: between(r, 0, Math.PI * 2),
      spin: r() < 0.5 ? 1 : -1,
      submerged: false,
      diveTimer: between(r, s.diveEveryS[0], s.diveEveryS[1]),
      turnTimer: between(r, s.turnEveryS[0], s.turnEveryS[1]),
      state: 'swimming',
    });
  }

  /** Rumbo real del tiburón según su patrón. */
  static course(k: Shark): number {
    return k.pattern === 'zigzag' ? k.heading + 0.8 * Math.sin(k.phase) : k.heading;
  }

  step(dt: number, input: MinigameInput): SimEvent[] {
    if (this.ended) return [];
    const c = this.config;
    const out: SimEvent[] = [];
    this.time += dt;
    this.reload = Math.max(0, this.reload - dt);
    for (const m of this.marks) m.age += dt;
    this.marks = this.marks.filter((m) => m.age < 1.2);

    // Mira: el dedo la pone donde está; el teclado la mueve.
    if (input.aim) this.target = { ...input.aim };
    if (input.turn) this.target.x += clamp(input.turn, -1, 1) * c.aimSpeed * dt;
    if (input.lift) this.target.y -= clamp(input.lift, -1, 1) * c.aimSpeed * dt;
    this.target.x = clamp(this.target.x, SEA_AREA.left, SEA_AREA.right);
    this.target.y = clamp(this.target.y, SEA_AREA.top, SEA_AREA.bottom);

    this.moveSharks(dt);

    if (input.action && this.reload === 0 && this.ammo > 0) {
      this.ammo--;
      this.reload = c.reloadS;
      this.balls.push({ from: { ...CANNON }, to: { ...this.target }, t: 0 });
      out.push({ kind: 'fire', x: this.target.x, y: this.target.y });
    }

    for (const b of this.balls) b.t += dt;
    for (const b of this.balls.filter((x) => x.t >= c.flightS)) {
      this.balls.splice(this.balls.indexOf(b), 1);
      out.push({ kind: 'splash', x: b.to.x, y: b.to.y });
      let scared = 0;
      for (const k of this.sharks) {
        if (k.state !== 'swimming' || k.submerged) continue;
        if (Math.hypot(k.x - b.to.x, k.y - b.to.y) > c.splashRadius + SHARK_RADIUS) continue;
        // Se asusta y se va, lejos de la salpicadura. Sin heridas.
        k.state = 'fleeing';
        k.heading = Math.atan2(k.y - b.to.y || -0.01, k.x - b.to.x || 0.01);
        k.speed = c.sharks.fleeSpeed;
        scared++;
        this.score++;
        this.pendingSpawns.push(this.time + c.sharks.respawnS);
      }
      this.marks.push({ kind: scared ? 'scare' : 'miss', x: b.to.x, y: b.to.y, age: 0 });
      out.push({ kind: scared ? 'scare' : 'miss', x: b.to.x, y: b.to.y });
    }

    const due = this.pendingSpawns.filter((t) => t <= this.time);
    if (due.length) {
      this.pendingSpawns = this.pendingSpawns.filter((t) => t > this.time);
      for (let i = 0; i < due.length; i++) this.spawn();
    }

    this.ended = this.checkEnd();
    if (this.ended) out.push({ kind: 'end' });
    return out;
  }

  private moveSharks(dt: number) {
    for (const k of this.sharks) advanceShark(k, dt, this.config.sharks, this.r);
  }

  private checkEnd(): Ending | null {
    const c = this.config;
    if (this.score >= c.goal) return { outcome: 'won', reason: 'goal' };
    if (this.time >= c.timeLimitS) return { outcome: 'lost', reason: 'time' };
    if (this.ammo === 0 && this.balls.length === 0) return { outcome: 'lost', reason: 'ammo' };
    return null;
  }

  status(): StatusItem[] {
    const c = this.config;
    const left = Math.max(0, Math.ceil(c.timeLimitS - this.time));
    return [
      { label: 'Tiburones', value: `${this.score}/${c.goal}` },
      { label: 'Bolas', value: `${this.ammo}/${c.ammo}` },
      { label: 'Tiempo', value: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` },
    ];
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, skin: MinigameSkin, o: DrawOptions) {
    drawCanon(this, ctx, w, h, skin, o);
  }

  get drawMarks(): readonly Mark[] {
    return this.marks;
  }
}

/**
 * Mueve un tiburón `dt` s según su patrón: se sumerge y sale, cambia de
 * rumbo y rebota en el borde de la zona de mar. El azar sólo se usa cuando
 * vence un temporizador.
 */
export function advanceShark(
  k: Shark,
  dt: number,
  s: CanonConfig['sharks'],
  r: () => number,
): void {
  if (k.state === 'gone') return;
  if (k.state === 'fleeing') {
    k.x += Math.cos(k.heading) * k.speed * dt;
    k.y += Math.sin(k.heading) * k.speed * dt;
    if (k.x < -0.1 || k.x > 1.1 || k.y < 0 || k.y > 0.85) k.state = 'gone';
    return;
  }
  k.diveTimer -= dt;
  if (k.diveTimer <= 0) {
    k.submerged = !k.submerged;
    k.diveTimer = k.submerged
      ? between(r, s.diveForS[0], s.diveForS[1])
      : between(r, s.diveEveryS[0], s.diveEveryS[1]);
  }
  k.turnTimer -= dt;
  if (k.turnTimer <= 0) {
    k.turnTimer = between(r, s.turnEveryS[0], s.turnEveryS[1]);
    if (k.pattern === 'circulo') k.spin = k.spin === 1 ? -1 : 1;
    else k.heading += (r() < 0.5 ? -1 : 1) * between(r, 0.5, 1.4);
  }
  if (k.pattern === 'zigzag') k.phase += dt * Math.PI * 2 * 0.7;
  if (k.pattern === 'circulo') k.heading += k.spin * 0.9 * dt;
  const course = CanonSim.course(k);
  k.x += Math.cos(course) * k.speed * dt;
  k.y += Math.sin(course) * k.speed * dt;
  // Rebota en el borde de la zona de mar.
  if (k.x < SEA_AREA.left || k.x > SEA_AREA.right) {
    k.heading = Math.PI - k.heading;
    k.x = clamp(k.x, SEA_AREA.left, SEA_AREA.right);
  }
  if (k.y < SEA_AREA.top || k.y > SEA_AREA.bottom) {
    k.heading = -k.heading;
    k.y = clamp(k.y, SEA_AREA.top, SEA_AREA.bottom);
  }
}

export function canonMinPlausibleMs(score: number, _seed: number, c: CanonConfig): number {
  if (score <= 0) return 0;
  // Una salpicadura puede asustar a varios a la vez; entre disparo y disparo, la recarga.
  const shots = Math.ceil(score / Math.max(1, c.sharks.concurrent));
  return (c.flightS + (shots - 1) * c.reloadS) * 1000;
}

export const canon: MinigameDefinition<CanonConfig> = {
  id: 'canon',
  title: 'Cañón contra tiburones',
  summary:
    'Los tiburones rondan la cala. Con el cañón del puerto se les asusta a base de salpicones: nadie sale herido.',
  instructions: [
    'Arrastra el dedo o el ratón por el mar: el círculo marca dónde cae la bola.',
    'Suelta o pulsa FUEGO (o Espacio) para disparar. Flechas para apuntar.',
    'La bola cae en arco y salpica: asusta a los tiburones que están en superficie.',
    'Ahuyenta a 3 antes de quedarte sin bolas o sin tiempo.',
  ],
  actionLabel: 'FUEGO',
  defaults: CANON_DEFAULTS,
  create: (seed, config) => new CanonSim(seed, config),
  minPlausibleMs: canonMinPlausibleMs,
  endText(e) {
    switch (e.reason) {
      case 'goal':
        return '¡Cala despejada! Los tiburones se han ido a otra parte.';
      case 'ammo':
        return 'Sin bolas en la santabárbara. Los tiburones siguen rondando.';
      default:
        return 'Se acabó el tiempo. Los tiburones siguen rondando.';
    }
  },
};

// --- Dibujo ------------------------------------------------------------------

/** Punto de la bola a lo largo del arco (t de 0 a 1), y su sombra en el agua. */
export function arcPoint(from: Point, to: Point, t: number): { ball: Point; shadow: Point } {
  const shadow = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  const height = 0.35 * Math.hypot(to.x - from.x, to.y - from.y);
  return { ball: { x: shadow.x, y: shadow.y - 4 * height * t * (1 - t) }, shadow };
}

function drawCanon(
  sim: CanonSim,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  skin: MinigameSkin,
  o: DrawOptions,
) {
  const u = Math.min(w, h);
  const X = (x: number) => x * w;
  const Y = (y: number) => y * h;
  const c = sim.config;

  ctx.fillStyle = skin.sea;
  ctx.fillRect(0, 0, w, h);
  // Costa al fondo.
  wash(ctx, skin, skin.land, () => {
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, Y(0.07));
    for (let i = 10; i >= 0; i--) ctx.lineTo(X(i / 10), Y(0.07 + (i % 2) * 0.02));
    ctx.closePath();
  });
  outline(ctx, skin, u);

  // Olas.
  ctx.save();
  ctx.strokeStyle = skin.wave;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(1, u * 0.004);
  const drift = o.reducedMotion ? 0 : Math.sin(o.clock * 0.8) * 0.01;
  for (let row = 0; row < 8; row++) {
    const y = 0.16 + row * 0.1;
    for (let col = 0; col < 6; col++) {
      const x = col * 0.18 + (row % 2) * 0.09 + drift;
      ctx.beginPath();
      ctx.arc(X(x), Y(y), u * 0.03, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  }
  ctx.restore();

  for (const k of sim.sharks) {
    if (k.state === 'gone') continue;
    drawShark(ctx, skin, u, X(k.x), Y(k.y), k);
  }

  // Ayuda de trayectoria: arco punteado y círculo de caída del tamaño real de la salpicadura.
  const aim = sim.aim();
  if (!sim.ended) {
    ctx.save();
    ctx.strokeStyle = skin.crest;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = Math.max(2, u * 0.006);
    ctx.setLineDash([u * 0.012, u * 0.018]);
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const p = arcPoint(CANNON, aim, i / 24).ball;
      if (i === 0) ctx.moveTo(X(p.x), Y(p.y));
      else ctx.lineTo(X(p.x), Y(p.y));
    }
    ctx.stroke();
    ctx.strokeStyle = skin.accent;
    ctx.setLineDash([u * 0.02, u * 0.012]);
    ctx.beginPath();
    ctx.ellipse(X(aim.x), Y(aim.y), c.splashRadius * w, c.splashRadius * h, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(X(aim.x) - u * 0.02, Y(aim.y));
    ctx.lineTo(X(aim.x) + u * 0.02, Y(aim.y));
    ctx.moveTo(X(aim.x), Y(aim.y) - u * 0.02);
    ctx.lineTo(X(aim.x), Y(aim.y) + u * 0.02);
    ctx.stroke();
    ctx.restore();
  }

  for (const b of sim.balls) {
    const { ball, shadow } = arcPoint(b.from, b.to, Math.min(1, b.t / c.flightS));
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = skin.ink;
    ctx.beginPath();
    ctx.ellipse(X(shadow.x), Y(shadow.y), u * 0.018, u * 0.009, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(X(ball.x), Y(ball.y), u * 0.018, 0, Math.PI * 2);
    ctx.fill();
    outline(ctx, skin, u);
  }

  // Salpicaduras: anillo y gotas; sin destellos.
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(u * 0.05)}px system-ui, sans-serif`;
  for (const m of sim.drawMarks) {
    const alpha = Math.max(0, 1 - m.age / 1.2);
    const grow = o.reducedMotion ? 1 : 0.6 + m.age;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = skin.crest;
    ctx.lineWidth = Math.max(2, u * 0.006);
    ctx.beginPath();
    ctx.ellipse(
      X(m.x),
      Y(m.y),
      c.splashRadius * w * grow,
      c.splashRadius * h * grow * 0.6,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.fillStyle = skin.crest;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const d = u * 0.03 * grow;
      ctx.beginPath();
      ctx.arc(
        X(m.x) + Math.cos(a) * d,
        Y(m.y) + Math.sin(a) * d * 0.6 - u * 0.01,
        u * 0.006,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    if (m.kind === 'scare') {
      ctx.fillStyle = skin.good;
      ctx.fillText('✓', X(m.x), Y(m.y) - u * 0.07);
    }
  }
  ctx.restore();

  // Cañón en el muelle, orientado a la mira.
  const ang = Math.atan2(Y(aim.y) - Y(CANNON.y), X(aim.x) - X(CANNON.x));
  wash(ctx, skin, skin.land, () => {
    ctx.rect(0, Y(0.95), w, h - Y(0.95));
  });
  ctx.save();
  ctx.translate(X(CANNON.x), Y(CANNON.y));
  ctx.rotate(ang);
  wash(ctx, skin, '#3a3a3a', () => ctx.rect(0, -u * 0.022, u * 0.1, u * 0.044));
  outline(ctx, skin, u);
  ctx.fillStyle = skin.accent;
  ctx.fillRect(u * 0.07, -u * 0.024, u * 0.012, u * 0.048);
  ctx.restore();
  wash(ctx, skin, skin.accent, () => ctx.arc(X(CANNON.x), Y(CANNON.y), u * 0.04, 0, Math.PI * 2));
  outline(ctx, skin, u);
}

function drawShark(
  ctx: CanvasRenderingContext2D,
  skin: MinigameSkin,
  u: number,
  x: number,
  y: number,
  k: Shark,
) {
  const s = u * 0.045;
  ctx.save();
  ctx.translate(x, y);
  if (k.submerged && k.state === 'swimming') {
    // Sumergido: sólo una onda discontinua; no se le puede asustar.
    ctx.strokeStyle = skin.crest;
    ctx.globalAlpha = 0.45;
    ctx.setLineDash([s * 0.2, s * 0.2]);
    ctx.lineWidth = Math.max(1, u * 0.003);
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const course = k.state === 'fleeing' ? k.heading : CanonSim.course(k);
  const dir = Math.cos(course) >= 0 ? 1 : -1;
  // Estela en V detrás de la aleta.
  ctx.strokeStyle = skin.crest;
  ctx.lineWidth = Math.max(1.5, u * 0.004);
  ctx.globalAlpha = k.state === 'fleeing' ? 0.9 : 0.6;
  ctx.beginPath();
  ctx.moveTo(-dir * s * 0.2, s * 0.15);
  ctx.lineTo(-dir * s * (k.state === 'fleeing' ? 2 : 1.2), -s * 0.1);
  ctx.moveTo(-dir * s * 0.2, s * 0.15);
  ctx.lineTo(-dir * s * (k.state === 'fleeing' ? 2 : 1.2), s * 0.45);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Aleta, sin heridas: siempre entera.
  wash(ctx, skin, '#5b6772', () => {
    ctx.moveTo(-dir * s * 0.45, s * 0.15);
    ctx.quadraticCurveTo(dir * s * 0.05, -s * 0.9, dir * s * 0.5, -s * 0.75);
    ctx.quadraticCurveTo(dir * s * 0.25, -s * 0.3, dir * s * 0.45, s * 0.15);
    ctx.closePath();
  });
  outline(ctx, skin, u);
  ctx.restore();
}
