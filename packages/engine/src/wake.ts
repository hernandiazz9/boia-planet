import { clamp } from './math';

export interface WakeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
}

export interface WakeConfig {
  /** Partículas por segundo a velocidad máxima sin drift. muestra */
  rate: number;
  /** Multiplicador de intensidad durante el drift. muestra */
  driftBoost: number;
  /** Bajo esta velocidad (u/s) no se emite. muestra */
  minSpeed: number;
  maxParticles: number;
}

export const DEFAULT_WAKE: WakeConfig = {
  rate: 70,
  driftBoost: 1.7,
  minSpeed: 8,
  maxParticles: 500,
};

export interface WakeEmitter {
  /** Anclaje `wake_origin` en coordenadas de mundo. */
  x: number;
  y: number;
  heading: number;
  speed: number;
  maxSpeed: number;
  drifting: boolean;
}

/**
 * Estela de partículas en coordenadas de mundo: la intensidad crece con la
 * velocidad y con el drift, y cada partícula se desvanece al envejecer.
 */
export class WakeSystem {
  readonly particles: WakeParticle[] = [];
  private pending = 0;
  private seed = 1;

  constructor(readonly cfg: WakeConfig = DEFAULT_WAKE) {}

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  intensity(e: WakeEmitter): number {
    if (e.speed < this.cfg.minSpeed) return 0;
    return clamp(e.speed / e.maxSpeed, 0, 1) * (e.drifting ? this.cfg.driftBoost : 1);
  }

  update(dt: number, e: WakeEmitter): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.age += dt;
      if (p.age >= p.life) {
        this.particles[i] = this.particles[this.particles.length - 1]!;
        this.particles.pop();
        continue;
      }
      const k = Math.exp(-2.2 * dt);
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    const intensity = this.intensity(e);
    if (intensity === 0) {
      this.pending = 0;
      return;
    }
    this.pending += this.cfg.rate * intensity * dt;
    const fx = Math.cos(e.heading);
    const fy = Math.sin(e.heading);
    while (this.pending >= 1 && this.particles.length < this.cfg.maxParticles) {
      this.pending -= 1;
      const side = (this.rand() - 0.5) * 2;
      const spread = 14 + (e.drifting ? 30 : 0);
      this.particles.push({
        x: e.x - fy * side * 5,
        y: e.y + fx * side * 5,
        vx: -fx * e.speed * 0.12 - fy * side * spread,
        vy: -fy * e.speed * 0.12 + fx * side * spread,
        age: 0,
        life: 0.8 + intensity * 0.9,
        size: 2.5 + intensity * 3.5,
      });
    }
    if (this.pending > 1) this.pending = 0;
  }
}
