import { between, rng, shuffle } from './rng';
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
 * Vigilancia del faro (REQ-AVE-036). De noche, el haz del faro barre el mar;
 * los barcos pasan en silueta y la bandera sólo se reconoce tras iluminarla
 * un rato. ALARMA ante un pirata lo hace retirarse; ante un mercante, un
 * señuelo o el mar vacío es una falsa alarma. Los mercantes y los señuelos
 * tienen que llegar: no pasa nada si cruzan. Un pirata que cruza se escapa.
 *
 * Fin: 5 piratas identificados (gana), o se acaba el tiempo, las falsas
 * alarmas permitidas o los barcos por pasar (pierde). Todo `muestra`.
 */

export interface FaroConfig extends BaseConfig {
  maxErrors: number;
  /** s de luz continua para reconocer la bandera. */
  identifyS: number;
  /** Semiancho del haz, en radianes (generoso: no exige precisión de un píxel). */
  beamHalfWidth: number;
  /** rad/s del haz con el teclado. */
  turnSpeed: number;
  /** rad/s máximos del haz siguiendo al dedo. */
  followSpeed: number;
  beamMin: number;
  beamMax: number;
  alarmCooldownS: number;
  fleet: {
    count: number;
    pirates: number;
    decoys: number;
    intervalS: number;
    jitterS: number;
    /** Anchos de escena por segundo. */
    speedMin: number;
    speedMax: number;
    /** Carriles (y lógica) por donde pasan. */
    lanes: readonly number[];
  };
}

export const FARO_DEFAULTS: FaroConfig = {
  version: 1,
  goal: 5,
  timeLimitS: 90,
  maxErrors: 3,
  identifyS: 0.6,
  beamHalfWidth: 0.13,
  turnSpeed: 1.7,
  followSpeed: 5,
  beamMin: -1.3,
  beamMax: 1.3,
  alarmCooldownS: 0.6,
  fleet: {
    count: 16,
    pirates: 8,
    decoys: 4,
    intervalS: 4.2,
    jitterS: 1.4,
    speedMin: 0.06,
    speedMax: 0.1,
    lanes: [0.24, 0.34, 0.44, 0.54],
  },
  reward: { policy: 'daily', points: 15, coins: 5, maxPoints: 30, maxCoins: 10 },
};

/** Faro: la lámpara, en coordenadas lógicas de la escena. */
export const LAMP: Point = { x: 0.5, y: 0.84 };
const HORIZON = 0.13;
const EDGE = 0.07;

export type ShipKind = 'pirate' | 'merchant' | 'decoy';
type ShipState = 'waiting' | 'sailing' | 'retreating' | 'arrived' | 'escaped' | 'gone';

export interface FaroShip {
  id: number;
  kind: ShipKind;
  spawnAt: number;
  y: number;
  dir: 1 | -1;
  speed: number;
  x: number;
  state: ShipState;
  litFor: number;
  identified: boolean;
}

interface Mark {
  kind: 'hit' | 'false_alarm' | 'escape';
  x: number;
  y: number;
  age: number;
}

/** La flota de una semilla: siempre la misma. */
export function faroFleet(seed: number, c: FaroConfig): FaroShip[] {
  const r = rng(seed);
  const f = c.fleet;
  const kinds = shuffle(r, [
    ...Array<ShipKind>(f.pirates).fill('pirate'),
    ...Array<ShipKind>(f.decoys).fill('decoy'),
    ...Array<ShipKind>(Math.max(0, f.count - f.pirates - f.decoys)).fill('merchant'),
  ]);
  return kinds.map((kind, i) => {
    const dir: 1 | -1 = r() < 0.5 ? 1 : -1;
    return {
      id: i,
      kind,
      spawnAt: i * f.intervalS + between(r, 0, f.jitterS),
      y: f.lanes[Math.floor(r() * f.lanes.length)] ?? 0.4,
      dir,
      speed: between(r, f.speedMin, f.speedMax),
      x: dir === 1 ? -EDGE : 1 + EDGE,
      state: 'waiting',
      litFor: 0,
      identified: false,
    };
  });
}

/** s desde que aparece hasta que entra en la escena. */
const entryDelay = (s: FaroShip) => EDGE / s.speed;

const angleTo = (x: number, y: number) => Math.atan2(x - LAMP.x, LAMP.y - y);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class FaroSim implements MinigameSim {
  time = 0;
  score = 0;
  errors = 0;
  escaped = 0;
  ended: Ending | null = null;
  beam = 0;
  readonly ships: FaroShip[];
  private cooldown = 0;
  private marks: Mark[] = [];

  constructor(
    seed: number,
    readonly config: FaroConfig,
  ) {
    this.ships = faroFleet(seed, config);
  }

  aim(): Point {
    return { x: LAMP.x + Math.sin(this.beam) * 0.5, y: LAMP.y - Math.cos(this.beam) * 0.5 };
  }

  /** ¿Ilumina el haz este barco? */
  isLit(s: FaroShip): boolean {
    if (s.state !== 'sailing' || s.x <= 0 || s.x >= 1) return false;
    const dist = Math.hypot(s.x - LAMP.x, LAMP.y - s.y);
    return Math.abs(angleTo(s.x, s.y) - this.beam) <= this.config.beamHalfWidth + 0.035 / dist;
  }

  /** El barco que recibe la alarma: el iluminado más cerca del centro del haz. */
  target(): FaroShip | null {
    let best: FaroShip | null = null;
    let bestD = Infinity;
    for (const s of this.ships) {
      if (!this.isLit(s)) continue;
      const d = Math.abs(angleTo(s.x, s.y) - this.beam);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  step(dt: number, input: MinigameInput): SimEvent[] {
    if (this.ended) return [];
    const c = this.config;
    const out: SimEvent[] = [];
    this.time += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (const m of this.marks) m.age += dt;
    this.marks = this.marks.filter((m) => m.age < 1.4);

    // Haz: el teclado lo gira; el dedo o el puntero lo llevan hacia sí.
    if (input.turn) this.beam += clamp(input.turn, -1, 1) * c.turnSpeed * dt;
    if (input.aim) {
      const want =
        input.aim.y >= LAMP.y
          ? Math.sign(input.aim.x - LAMP.x) * c.beamMax
          : angleTo(input.aim.x, input.aim.y);
      const d = want - this.beam;
      const max = c.followSpeed * dt;
      this.beam += clamp(d, -max, max);
    }
    this.beam = clamp(this.beam, c.beamMin, c.beamMax);

    for (const s of this.ships) {
      if (s.state === 'waiting' && this.time >= s.spawnAt) s.state = 'sailing';
      if (s.state === 'sailing' || s.state === 'retreating') s.x += s.dir * s.speed * dt;
      const out1 = s.dir === 1 ? s.x > 1 + EDGE : s.x < -EDGE;
      if (s.state === 'sailing' && out1) {
        s.state = s.kind === 'pirate' ? 'escaped' : 'arrived';
        if (s.kind === 'pirate') {
          this.escaped++;
          const ev = { kind: 'escape' as const, x: clamp(s.x, 0.04, 0.96), y: s.y };
          out.push(ev);
          this.marks.push({ ...ev, age: 0 });
        }
      } else if (s.state === 'retreating' && out1) {
        s.state = 'gone';
      }
      if (this.isLit(s)) {
        s.litFor += dt;
        if (s.litFor >= c.identifyS) s.identified = true;
      } else {
        s.litFor = 0;
      }
    }

    if (input.action && this.cooldown === 0) {
      this.cooldown = c.alarmCooldownS;
      const t = this.target();
      if (t && t.kind === 'pirate') {
        this.score++;
        t.identified = true;
        t.state = 'retreating';
        t.dir = t.dir === 1 ? -1 : 1;
        t.speed *= 1.6;
        const ev = { kind: 'hit' as const, x: t.x, y: t.y };
        out.push(ev);
        this.marks.push({ ...ev, age: 0 });
      } else {
        this.errors++;
        const p = t ?? this.aim();
        const ev = { kind: 'false_alarm' as const, x: p.x, y: t ? t.y : 0.4 };
        out.push(ev);
        this.marks.push({ ...ev, age: 0 });
      }
    }

    this.ended = this.checkEnd();
    if (this.ended) out.push({ kind: 'end' });
    return out;
  }

  private checkEnd(): Ending | null {
    const c = this.config;
    if (this.score >= c.goal) return { outcome: 'won', reason: 'goal' };
    if (this.errors >= c.maxErrors) return { outcome: 'lost', reason: 'errors' };
    if (this.time >= c.timeLimitS) return { outcome: 'lost', reason: 'time' };
    if (this.ships.every((s) => s.state !== 'waiting' && s.state !== 'sailing')) {
      return { outcome: 'lost', reason: 'ships' };
    }
    return null;
  }

  status(): StatusItem[] {
    const c = this.config;
    const left = Math.max(0, Math.ceil(c.timeLimitS - this.time));
    const ships = this.ships.filter((s) => s.state === 'waiting' || s.state === 'sailing').length;
    return [
      { label: 'Piratas', value: `${this.score}/${c.goal}` },
      { label: 'Falsas alarmas', value: `${this.errors}/${c.maxErrors}` },
      { label: 'Tiempo', value: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` },
      { label: 'Barcos', value: String(ships) },
    ];
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, skin: MinigameSkin, o: DrawOptions) {
    drawFaro(this, ctx, w, h, skin, o);
  }

  get drawMarks(): readonly Mark[] {
    return this.marks;
  }
}

export function faroMinPlausibleMs(score: number, seed: number, c: FaroConfig): number {
  if (score <= 0) return 0;
  const entries = faroFleet(seed, c)
    .filter((s) => s.kind === 'pirate')
    .map((s) => s.spawnAt + entryDelay(s))
    .sort((a, b) => a - b);
  const kth = entries[score - 1];
  if (kth === undefined) return Infinity;
  return Math.max(kth, (score - 1) * c.alarmCooldownS) * 1000;
}

export const faro: MinigameDefinition<FaroConfig> = {
  id: 'faro',
  title: 'Vigilancia del faro',
  summary:
    'De noche, el faro vigila la bocana. Barre el mar con el haz, reconoce las banderas y da la alarma cuando veas un pirata.',
  instructions: [
    'Mueve el haz con el dedo, el ratón o las flechas.',
    'Deja la luz sobre un barco hasta ver su bandera.',
    'Calavera y huesos cruzados = pirata: pulsa ALARMA (o Espacio).',
    'Los mercantes y los barcos de rayas deben llegar: no les des la alarma.',
  ],
  actionLabel: 'ALARMA',
  defaults: FARO_DEFAULTS,
  create: (seed, config) => new FaroSim(seed, config),
  minPlausibleMs: faroMinPlausibleMs,
  endText(e) {
    switch (e.reason) {
      case 'goal':
        return '¡Bocana a salvo! Cinco piratas se han dado la vuelta.';
      case 'errors':
        return 'Demasiadas falsas alarmas: el puerto ya no se fía.';
      case 'ships':
        return 'Ya no quedan barcos por pasar esta noche.';
      default:
        return 'Se acabó la guardia de esta noche.';
    }
  },
};

// --- Dibujo ------------------------------------------------------------------

const STARS: readonly [number, number][] = [
  [0.08, 0.03],
  [0.2, 0.08],
  [0.33, 0.02],
  [0.47, 0.06],
  [0.61, 0.03],
  [0.72, 0.09],
  [0.86, 0.04],
  [0.94, 0.1],
];

function drawFaro(
  sim: FaroSim,
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

  // Cielo y mar de noche.
  ctx.fillStyle = skin.night;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = skin.sea;
  ctx.fillRect(0, Y(HORIZON), w, h - Y(HORIZON));
  ctx.restore();
  ctx.fillStyle = skin.crest;
  for (const [sx, sy] of STARS) ctx.fillRect(X(sx), Y(sy), 2, 2);
  ctx.save();
  ctx.strokeStyle = skin.wave;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1, u * 0.004);
  const drift = o.reducedMotion ? 0 : (o.clock * 0.02) % 0.2;
  for (let row = 0; row < 7; row++) {
    const y = HORIZON + 0.06 + row * 0.1;
    for (let col = -1; col < 6; col++) {
      const x = col * 0.2 + (row % 2) * 0.1 + drift * (row % 2 ? 1 : -1);
      ctx.beginPath();
      ctx.moveTo(X(x), Y(y));
      ctx.lineTo(X(x + 0.06), Y(y));
      ctx.stroke();
    }
  }
  ctx.restore();

  // Haz: luz atenuada, sin destellos.
  const R = 1.6;
  const a0 = sim.beam - c.beamHalfWidth;
  const a1 = sim.beam + c.beamHalfWidth;
  ctx.save();
  const g = ctx.createRadialGradient(X(LAMP.x), Y(LAMP.y), 0, X(LAMP.x), Y(LAMP.y), u * 1.1);
  g.addColorStop(0, skin.beam);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.32;
  ctx.beginPath();
  ctx.moveTo(X(LAMP.x), Y(LAMP.y));
  ctx.lineTo(X(LAMP.x + Math.sin(a0) * R), Y(LAMP.y - Math.cos(a0) * R));
  ctx.lineTo(X(LAMP.x + Math.sin(a1) * R), Y(LAMP.y - Math.cos(a1) * R));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  for (const s of sim.ships) {
    if (s.state !== 'sailing' && s.state !== 'retreating') continue;
    drawShip(ctx, skin, u, X(s.x), Y(s.y), s, sim.isLit(s), c.identifyS);
  }

  // Torre del faro.
  const top = LAMP.y + 0.02;
  wash(ctx, skin, skin.land, () => {
    ctx.moveTo(X(0.455), h);
    ctx.lineTo(X(0.475), Y(top));
    ctx.lineTo(X(0.525), Y(top));
    ctx.lineTo(X(0.545), h);
    ctx.closePath();
  });
  outline(ctx, skin, u);
  ctx.fillStyle = skin.accent;
  for (let i = 0; i < 2; i++) {
    const y0 = top + 0.035 + i * 0.05;
    ctx.fillRect(X(0.462 + i * 0.004), Y(y0), X(0.076 - i * 0.008), Y(0.018));
  }
  ctx.fillStyle = skin.beam;
  ctx.beginPath();
  ctx.arc(X(LAMP.x), Y(LAMP.y), u * 0.02, 0, Math.PI * 2);
  ctx.fill();
  outline(ctx, skin, u);

  // Marcas de acierto, falsa alarma y escape: anillo y símbolo, sin destellos.
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(u * 0.05)}px system-ui, sans-serif`;
  for (const m of sim.drawMarks) {
    const alpha = Math.max(0, 1 - m.age / 1.4);
    const color = m.kind === 'hit' ? skin.good : skin.bad;
    const r = u * (0.05 + (o.reducedMotion ? 0 : m.age * 0.03));
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, u * 0.006);
    ctx.beginPath();
    ctx.arc(X(m.x), Y(m.y), r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(
      m.kind === 'hit' ? '✓' : m.kind === 'escape' ? '!' : '✗',
      X(m.x),
      Y(m.y) - r - u * 0.03,
    );
  }
  ctx.restore();
}

function drawShip(
  ctx: CanvasRenderingContext2D,
  skin: MinigameSkin,
  u: number,
  x: number,
  y: number,
  s: FaroShip,
  lit: boolean,
  identifyS: number,
) {
  // Más lejos (arriba), más pequeño.
  const k = u * 0.05 * (0.65 + s.y);
  ctx.save();
  ctx.translate(x, y);
  // Casco en silueta; iluminado, se aclara.
  wash(ctx, skin, lit ? '#6f7f94' : '#141c28', () => {
    ctx.moveTo(-k, -k * 0.1);
    ctx.lineTo(k, -k * 0.1);
    ctx.lineTo(k * 0.7, k * 0.35);
    ctx.lineTo(-k * 0.7, k * 0.35);
    ctx.closePath();
  });
  if (lit) outline(ctx, skin, u);
  ctx.strokeStyle = lit ? '#c8d2de' : '#141c28';
  ctx.lineWidth = Math.max(1.5, k * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.1);
  ctx.lineTo(0, -k * 1.3);
  ctx.stroke();

  // Bandera: ondea hacia atrás. Sólo se reconoce tras iluminarla (identifyS).
  const fw = k * 0.8;
  const fh = k * 0.52;
  const fx = s.dir === 1 ? -fw : 0;
  const fy = -k * 1.3;
  const shown = s.identified || s.state === 'retreating';
  ctx.translate(fx, fy);
  if (!shown) {
    ctx.fillStyle = lit ? '#4a5566' : '#1d2633';
    ctx.fillRect(0, 0, fw, fh);
    if (lit) {
      // Progreso de identificación: la bandera se va revelando.
      ctx.strokeStyle = skin.beam;
      ctx.lineWidth = Math.max(2, k * 0.08);
      ctx.beginPath();
      ctx.arc(
        fw / 2,
        fh / 2,
        fh * 0.9,
        -Math.PI / 2,
        -Math.PI / 2 + (Math.PI * 2 * s.litFor) / identifyS,
      );
      ctx.stroke();
    }
  } else {
    drawFlag(ctx, s.kind, fw, fh, skin);
  }
  ctx.restore();
}

/**
 * Banderas con patrón además de color (REQ-AVE-039): pirata, negra con
 * calavera y huesos en aspa; señuelo, oscura con rayas horizontales;
 * mercante, clara con una banda diagonal.
 */
function drawFlag(
  ctx: CanvasRenderingContext2D,
  kind: ShipKind,
  w: number,
  h: number,
  skin: MinigameSkin,
) {
  ctx.save();
  ctx.lineCap = 'round';
  if (kind === 'pirate') {
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = Math.max(1.5, h * 0.1);
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h * 0.6);
    ctx.lineTo(w * 0.72, h * 0.92);
    ctx.moveTo(w * 0.72, h * 0.6);
    ctx.lineTo(w * 0.28, h * 0.92);
    ctx.stroke();
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.36, h * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'decoy') {
    ctx.fillStyle = '#1d2a44';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f5f5f5';
    for (let i = 0; i < 3; i++) ctx.fillRect(0, h * (0.14 + i * 0.3), w, h * 0.12);
  } else {
    ctx.fillStyle = '#f2efe6';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = skin.accent;
    ctx.lineWidth = h * 0.22;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();
  }
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}
