import type { MinigameSkin } from './types';

/**
 * Estilo de los minijuegos en cada mundo (D-20): vectorial simple con la
 * paleta del mundo. Arcilla (B05) va en barro con contorno grueso; Acuarela
 * (B02), en aguadas suaves sin contorno. Un mundo sin entrada toma los
 * colores de su tema (mar y acento) con trazo liso. Todo `muestra`.
 */

const BASE: MinigameSkin = {
  style: 'plain',
  night: '#0b1830',
  sea: '#0f5f7d',
  wave: '#2a8fae',
  crest: '#d9f3f7',
  land: '#3d4a5c',
  ink: '#0a1220',
  beam: '#fff3c4',
  accent: '#ff6b3d',
  onAccent: '#ffffff',
  good: '#3ddc84',
  bad: '#ff5c5c',
};

const WORLD_SKINS: Record<string, Partial<MinigameSkin>> = {
  arcilla: {
    style: 'clay',
    night: '#2a1812',
    sea: '#2f6f73',
    wave: '#4f8f86',
    crest: '#f3dcc0',
    land: '#b8643a',
    ink: '#3b2218',
    beam: '#ffe2a8',
    accent: '#d9713f',
    onAccent: '#fff7ee',
    good: '#8fd16a',
    bad: '#ff7a59',
  },
  acuarela: {
    style: 'wash',
    night: '#1d2c47',
    sea: '#5d8fb5',
    wave: '#8db4d3',
    crest: '#f4f8fb',
    land: '#9fbfae',
    ink: '#2d4a63',
    beam: '#fff6d8',
    accent: '#e58fa3',
    onAccent: '#1d2c47',
    good: '#7fd3a8',
    bad: '#f28b82',
  },
};

export interface WorldLook {
  sea?: { base: string; wave: string; crest: string };
  ui?: { accent: string; onAccent: string };
}

export function minigameSkin(worldId: string | null | undefined, theme?: WorldLook): MinigameSkin {
  const own = worldId ? WORLD_SKINS[worldId] : undefined;
  if (own) return { ...BASE, ...own };
  return {
    ...BASE,
    ...(theme?.sea ? { sea: theme.sea.base, wave: theme.sea.wave, crest: theme.sea.crest } : {}),
    ...(theme?.ui ? { accent: theme.ui.accent, onAccent: theme.ui.onAccent } : {}),
  };
}

/** Trazo del estilo: contorno grueso en barro, ninguno en acuarela. */
export function outline(ctx: CanvasRenderingContext2D, skin: MinigameSkin, u: number): void {
  if (skin.style === 'wash') return;
  ctx.lineWidth = skin.style === 'clay' ? Math.max(2, u * 0.006) : Math.max(1, u * 0.003);
  ctx.strokeStyle = skin.ink;
  ctx.stroke();
}

/** Relleno del estilo: en acuarela, una aguada algo transparente y desplazada. */
export function wash(
  ctx: CanvasRenderingContext2D,
  skin: MinigameSkin,
  color: string,
  path: () => void,
): void {
  ctx.fillStyle = color;
  if (skin.style === 'wash') {
    ctx.save();
    ctx.globalAlpha *= 0.55;
    ctx.translate(1.5, 1);
    ctx.beginPath();
    path();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= 0.8;
    ctx.beginPath();
    path();
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.beginPath();
  path();
  ctx.fill();
}
