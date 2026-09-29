import { Color } from 'three';

/**
 * Colores del mar 3D. Las piezas salen de la paleta de barro de Arcilla
 * (`mundos/arcilla/paleta.json`) y de la del prototipo v0.4.0 (naranja BOIA,
 * morado de la gorra de la mascota, rocas lila). Todo `muestra`.
 */
export const C = {
  orange: '#f26a1b',
  orangeDeep: '#d9531a',
  purple: '#3b2a8f',
  purpleSoft: '#6a4fc4',
  navy: '#12233f',
  cream: '#fff4e2',
  white: '#fbf7ef',
  sand: '#ebcf9e',
  sandWet: '#c9a877',
  grass: '#7db043',
  grassDark: '#4f8a36',
  leaf: '#5fae3a',
  leafDark: '#3f7f2e',
  trunk: '#9c6b45',
  wood: '#b8763f',
  woodDark: '#7c4b2b',
  rock: '#6f6784',
  rockDark: '#4d4763',
  rockLight: '#8d86a0',
  cliff: '#d69b5f',
  cliffDark: '#a86e3e',
  terracotta: '#c8643a',
  roof: '#c4553a',
  wall: '#f4efe6',
  blueDoor: '#2f6fb0',
  pine: '#4e7d3a',
  red: '#e43b30',
  green: '#2f9e5b',
  yellow: '#ffd23f',
  gold: '#f2c230',
  pink: '#f2557a',
  croc: '#5e9a3c',
  crocDark: '#3f6e28',
  crocBelly: '#d6e08a',
  dolphin: '#6f97bd',
  dolphinBelly: '#e4ecf0',
  speaker: '#2d3550',
  iron: '#4b3b3e',
  skin: '#e8b98f',
  flame: '#ffb13b',
  bulb: '#ffd98a',
} as const;

/** Un momento del día: luces, niebla y agua. */
export interface Mood {
  sky: Color;
  fog: Color;
  hemiSky: Color;
  hemiGround: Color;
  hemi: number;
  sun: Color;
  sunI: number;
  /** Dirección hacia el sol (de la escena al sol). */
  sunDir: [number, number, number];
  deep: Color;
  shallow: Color;
  foam: Color;
  /** 0 de día, 1 de noche: cuánto brillan antorchas, guirnaldas y escenario. */
  glow: number;
}

function mood(m: {
  sky: string;
  fog: string;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  sun: string;
  sunI: number;
  sunDir: [number, number, number];
  deep: string;
  shallow: string;
  foam: string;
  glow: number;
}): Mood {
  return {
    ...m,
    sky: new Color(m.sky),
    fog: new Color(m.fog),
    hemiSky: new Color(m.hemiSky),
    hemiGround: new Color(m.hemiGround),
    sun: new Color(m.sun),
    deep: new Color(m.deep),
    shallow: new Color(m.shallow),
    foam: new Color(m.foam),
  };
}

export type MoodId = 'dia' | 'tarde' | 'noche';

export const MOOD_IDS: readonly MoodId[] = ['dia', 'tarde', 'noche'];

export const MOOD_LABEL: Record<MoodId, string> = {
  dia: 'Día',
  tarde: 'Atardecer',
  noche: 'Noche BOIA',
};

/** Los tres momentos; el agua de día sale del tema del mundo si lo trae. */
export function moods(sea?: { base: string; wave: string; crest: string }): Record<MoodId, Mood> {
  return {
    dia: mood({
      sky: '#bfe7f2',
      fog: '#a9dbe8',
      hemiSky: '#fff6e8',
      hemiGround: '#5a7fa0',
      hemi: 1.55,
      sun: '#fff1d6',
      sunI: 2.1,
      sunDir: [0.45, 0.8, 0.35],
      deep: sea?.base ?? '#1a7aa6',
      shallow: sea?.wave ?? '#3aa3c4',
      foam: sea?.crest ?? '#f4efe6',
      glow: 0.12,
    }),
    tarde: mood({
      sky: '#ffc38f',
      fog: '#e9a88a',
      hemiSky: '#ffd3a8',
      hemiGround: '#4a3f8c',
      hemi: 1.35,
      sun: '#ffb070',
      sunI: 2.3,
      sunDir: [-0.7, 0.42, 0.25],
      deep: '#1d5a93',
      shallow: '#3fb2bf',
      foam: '#ffe9d2',
      glow: 0.55,
    }),
    noche: mood({
      sky: '#231a5c',
      fog: '#2a1f66',
      hemiSky: '#7a6ae0',
      hemiGround: '#140f38',
      hemi: 1.05,
      sun: '#9fb4ff',
      sunI: 0.85,
      sunDir: [0.35, 0.75, -0.4],
      deep: '#15245e',
      shallow: '#2a6fa6',
      foam: '#c9d6ff',
      glow: 1,
    }),
  };
}

/** Mezcla dos momentos en `out` (transición suave al cambiar). */
export function mixMood(out: Mood, a: Mood, b: Mood, t: number): Mood {
  out.sky.lerpColors(a.sky, b.sky, t);
  out.fog.lerpColors(a.fog, b.fog, t);
  out.hemiSky.lerpColors(a.hemiSky, b.hemiSky, t);
  out.hemiGround.lerpColors(a.hemiGround, b.hemiGround, t);
  out.hemi = a.hemi + (b.hemi - a.hemi) * t;
  out.sun.lerpColors(a.sun, b.sun, t);
  out.sunI = a.sunI + (b.sunI - a.sunI) * t;
  for (let i = 0; i < 3; i++) out.sunDir[i] = a.sunDir[i]! + (b.sunDir[i]! - a.sunDir[i]!) * t;
  out.deep.lerpColors(a.deep, b.deep, t);
  out.shallow.lerpColors(a.shallow, b.shallow, t);
  out.foam.lerpColors(a.foam, b.foam, t);
  out.glow = a.glow + (b.glow - a.glow) * t;
  return out;
}

export function cloneMood(m: Mood): Mood {
  return {
    ...m,
    sky: m.sky.clone(),
    fog: m.fog.clone(),
    hemiSky: m.hemiSky.clone(),
    hemiGround: m.hemiGround.clone(),
    sun: m.sun.clone(),
    sunDir: [...m.sunDir],
    deep: m.deep.clone(),
    shallow: m.shallow.clone(),
    foam: m.foam.clone(),
  };
}
