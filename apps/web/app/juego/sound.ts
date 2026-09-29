'use client';

import { type Settings, channelGain } from '@boia/engine/ui';

/**
 * Sonido del juego con dos canales separados (§20, REQ-IDE-037): música y
 * efectos. Aún no hay música ni efectos grabados: los efectos se sintetizan
 * y el canal de música queda listo (su ganancia ya obedece a Ajustes).
 */

let audio: AudioContext | null = null;
let sfx: GainNode | null = null;
let music: GainNode | null = null;
let gains = { sfx: 0.8, music: 0.6 };

function context(): { ctx: AudioContext; sfx: GainNode } | null {
  try {
    if (!audio) {
      audio = new AudioContext();
      sfx = audio.createGain();
      music = audio.createGain();
      sfx.connect(audio.destination);
      music.connect(audio.destination);
      sfx.gain.value = gains.sfx;
      music.gain.value = gains.music;
    }
    if (audio.state === 'suspended') void audio.resume();
    return { ctx: audio, sfx: sfx! };
  } catch {
    // Sin Web Audio o sin gesto previo (iOS): el juego sigue en silencio.
    return null;
  }
}

export function applyAudioSettings(s: Settings): void {
  gains = { sfx: channelGain(s.sfx), music: channelGain(s.music) };
  if (sfx) sfx.gain.value = gains.sfx;
  if (music) music.gain.value = gains.music;
}

function tone(freqFrom: number, freqTo: number, at: number, length: number, peak: number): void {
  if (gains.sfx === 0) return;
  const a = context();
  if (!a) return;
  const t = a.ctx.currentTime + at;
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freqFrom, t);
  o.frequency.exponentialRampToValueAtTime(freqTo, t + length * 0.75);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  o.connect(g).connect(a.sfx);
  o.start(t);
  o.stop(t + length + 0.01);
}

/** «Plop» corto de cada bocadillo (REQ-AVE-001). */
export function plop(): void {
  tone(620, 180, 0, 0.12, 0.18);
}

/** Aviso de descubrimiento o logro: dos notas cortas, ascendentes (REQ-IDE-026). */
export function chime(): void {
  tone(660, 700, 0, 0.12, 0.14);
  tone(990, 1040, 0.09, 0.18, 0.14);
}

/** Celebración de la entrega de la Fiestera: arpegio corto hacia arriba (REQ-AVE-008). */
export function fanfare(): void {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((f, i) => tone(f, f * 1.01, i * 0.11, 0.22, 0.16));
  tone(1047, 1568, notes.length * 0.11, 0.5, 0.12);
}
