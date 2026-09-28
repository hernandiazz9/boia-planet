import { type Rect, worldToScreen } from '@boia/world';
import { Container, Graphics, TilingSprite } from 'pixi.js';
import { drawCoasts } from '../views';
import { type LoadedArt, loadTextures } from './assets';

/** u de tierra que se pintan más allá de los límites. */
const FAR = 4000;

function hex(color: string): number {
  return Number.parseInt(color.slice(1), 16);
}

/**
 * Costas laterales con el arte de T01 (losas que se repiten en vertical): la
 * línea `collision_x_px` de cada losa cae exactamente sobre el límite del
 * mundo, donde el casco se para. Más allá, el color de tierra del manifiesto.
 * El borde inferior (T01 no tiene costa inferior) y la marca del borde
 * superior abierto se dibujan por código. Sin arte, todo por código.
 */
export async function createCoastView(
  bounds: Rect,
  coast: LoadedArt | undefined,
  artScale: number,
): Promise<Container> {
  const variants = coast?.manifest.tile?.variants;
  const sides = variants ? Object.values(variants) : [];
  if (!coast || sides.length === 0) return drawCoasts(bounds);

  const view = new Container();
  const top = worldToScreen({ x: 0, y: bounds.top - FAR }).y;
  const bottom = worldToScreen({ x: 0, y: bounds.bottom }).y;
  const land = new Graphics();
  view.addChild(land);
  let fill = 0xb1d181;

  try {
    for (const v of sides) {
      const [texture] = await loadTextures(coast.baseUrl, [v.file]);
      if (!texture) continue;
      fill = hex(v.outer_fill);
      const edge = v.land_side === 'left' ? bounds.left : bounds.right;
      const x = edge - v.collision_x_px * artScale;
      const w = texture.width * artScale;
      const tile = new TilingSprite({
        texture,
        width: texture.width,
        height: (bottom - top) / artScale,
      });
      tile.scale.set(artScale);
      tile.position.set(x, top);
      view.addChild(tile);
      // Tierra más allá de la losa (1 px de solape para que no quede costura).
      if (v.land_side === 'left') land.rect(x - FAR, top, FAR + 1, bottom - top);
      else land.rect(x + w - 1, top, FAR, bottom - top);
      land.fill({ color: fill });
    }
  } catch (err) {
    console.warn('[boia] costas sin arte; se dibujan por código', err);
    return drawCoasts(bounds);
  }

  // Borde inferior: orilla clara y tierra.
  const g = new Graphics();
  const l = bounds.left - FAR;
  const r = bounds.right + FAR;
  g.rect(l, bottom, r - l, FAR).fill({ color: fill });
  g.rect(l, bottom, r - l, 6).fill({ color: 0xf6e6c4 });
  // Borde superior publicado: abierto, sólo una marca tenue.
  const a = worldToScreen({ x: bounds.left, y: bounds.top });
  const b = worldToScreen({ x: bounds.right, y: bounds.top });
  for (let x = a.x; x < b.x; x += 28) g.moveTo(x, a.y).lineTo(Math.min(x + 14, b.x), a.y);
  g.stroke({ width: 2, color: 0xffffff, alpha: 0.25 });
  view.addChild(g);
  return view;
}
