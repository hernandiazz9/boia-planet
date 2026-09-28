import { CanonSim, SEA_AREA, type Shark, advanceShark } from './canon';
import { type MinigameController, STEP_S } from './controller';
import { FaroSim, LAMP } from './faro';
import type { MinigameInput, MinigameSim, Point } from './types';

/**
 * Jugadores automáticos para las pruebas (`@boia/engine/minigames/testing`).
 * Leen el estado interno de la simulación, cosa que un jugador no puede:
 * sirven para llegar a cada final sin esperar en tiempo real.
 */

export type Bot = (sim: MinigameSim) => MinigameInput;

/** Faro: lleva el haz al pirata más avanzado y da la alarma sólo si es él. */
export const faroExpert: Bot = (sim) => {
  const f = sim as FaroSim;
  const pirates = f.ships.filter(
    (s) => s.kind === 'pirate' && s.state === 'sailing' && s.x > 0.02 && s.x < 0.98,
  );
  if (!pirates.length) return {};
  // El que antes se escaparía.
  const next = pirates.reduce((a, b) => (edgeLeft(a) < edgeLeft(b) ? a : b));
  return { aim: { x: next.x, y: next.y }, action: f.target() === next };
};
const edgeLeft = (s: { x: number; dir: 1 | -1; speed: number }) =>
  (s.dir === 1 ? 1 - s.x : s.x) / s.speed;

/** Faro: haz al extremo derecho (nunca ilumina un barco) y alarma sin parar. */
export const faroPanic: Bot = () => ({ aim: { x: 1, y: LAMP.y + 0.1 }, action: true });

/** Nada: deja pasar el tiempo. */
export const idle: Bot = () => ({});

const predict = (k: Shark, s: CanonSim, seconds: number): Point => {
  const copy = { ...k };
  for (let t = 0; t < seconds; t += STEP_S) advanceShark(copy, STEP_S, s.config.sharks, () => 0.5);
  return { x: copy.x, y: copy.y };
};

/** Cañón: dispara sólo a un tiburón que seguirá en superficie y sin girar al caer la bola. */
export const canonExpert: Bot = (sim) => {
  const c = sim as CanonSim;
  const margin = c.config.flightS + 0.15;
  const ok = c.sharks.find(
    (k) => k.state === 'swimming' && !k.submerged && k.diveTimer > margin && k.turnTimer > margin,
  );
  if (!ok || c.balls.length) return {};
  return { aim: predict(ok, c, c.config.flightS), action: true };
};

/** Cañón: dispara lo más lejos posible de cualquier tiburón. */
export const canonWaster: Bot = (sim) => {
  const c = sim as CanonSim;
  const spots = c.sharks
    .filter((k) => k.state === 'swimming')
    .map((k) => predict(k, c, c.config.flightS));
  let best: Point = { x: SEA_AREA.left, y: SEA_AREA.top };
  let bestD = -1;
  for (let x = SEA_AREA.left; x <= SEA_AREA.right; x += 0.04) {
    for (let y = SEA_AREA.top; y <= SEA_AREA.bottom; y += 0.04) {
      const d = Math.min(Infinity, ...spots.map((p) => Math.hypot(p.x - x, p.y - y)));
      if (d > bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  }
  return { aim: best, action: true };
};

/**
 * Juega una partida entera con paso fijo; `advance` mueve el reloj de la
 * autoridad al mismo ritmo (ms), como si pasara el tiempo de verdad.
 */
export function playHeadless(
  controller: MinigameController,
  bot: Bot,
  advance: (ms: number) => void = () => {},
  maxSeconds = 600,
): void {
  if (controller.phase !== 'playing') controller.start();
  for (let t = 0; t < maxSeconds && controller.phase === 'playing'; t += STEP_S) {
    advance(STEP_S * 1000);
    controller.tick(STEP_S, bot(controller.sim!));
  }
}

export { CanonSim, FaroSim };
