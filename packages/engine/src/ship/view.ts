import { DIRECTIONS, type Direction, type Vec2, findShipImage, screenToWorld } from '@boia/world';
import { Assets, Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { LoadedShipManifest } from '../manifest-loader';
import { DirectionPicker } from './direction';
import {
  BOIA_NAVY,
  BOIA_ORANGE,
  SAIL_WHITE,
  SHIP_LENGTH,
  provisionalShipView,
} from './provisional';

/**
 * Escala de los PNG para que la eslora (roda–popa en la vista W, que no se
 * acorta) mida `SHIP_LENGTH`. Sin anclaje `bow`, 0,35. muestra
 */
function manifestScale(loaded: LoadedShipManifest): number {
  const w = loaded.manifest.anchors.W;
  if (!w.bow) return 0.35;
  const len = Math.hypot(w.bow.x - w.wake_origin.x, w.bow.y - w.wake_origin.y);
  return len > 1 ? SHIP_LENGTH / len : 0.35;
}

interface Frame {
  node: Container;
  /** `wake_origin` en px de pantalla relativos al pivote. */
  wakeOrigin: Vec2;
}

/**
 * Sprite del barco: una imagen por cada una de las 8 vistas, elegida por el
 * rumbo real del casco. El pivote (contacto con el agua) queda en (0, 0).
 */
export class ShipSprite {
  readonly view = new Container();
  readonly source: 'manifest' | 'provisional';
  private readonly frames: Map<Direction, Frame>;
  private readonly picker: DirectionPicker;
  private shown: Direction | null = null;

  private constructor(
    frames: Map<Direction, Frame>,
    source: 'manifest' | 'provisional',
    heading: number,
  ) {
    this.frames = frames;
    this.source = source;
    this.picker = new DirectionPicker(heading);
    for (const f of frames.values()) {
      f.node.visible = false;
      this.view.addChild(f.node);
    }
    this.update(heading);
  }

  static provisional(heading: number): ShipSprite {
    const frames = new Map<Direction, Frame>();
    for (const d of DIRECTIONS) {
      const v = provisionalShipView(d);
      const g = new Graphics();
      // Sombra sobre el agua.
      g.ellipse(0, 0, 30, 12).fill({ color: 0x05202c, alpha: 0.28 });
      for (const face of v.hull) {
        g.poly(face.points).fill({ color: face.fill }).stroke({ width: 1.5, color: BOIA_NAVY });
      }
      g.poly(v.deck.points).fill({ color: v.deck.fill }).stroke({ width: 1.5, color: BOIA_NAVY });
      g.poly(v.prow).fill({ color: BOIA_NAVY });
      g.poly(v.sail)
        .fill({ color: SAIL_WHITE })
        .stroke({ width: 1.5, color: BOIA_NAVY, join: 'round' });
      g.moveTo(v.mast[0].x, v.mast[0].y)
        .lineTo(v.mast[1].x, v.mast[1].y)
        .stroke({ width: 3, color: BOIA_NAVY, cap: 'round' });
      g.poly(v.flag).fill({ color: BOIA_ORANGE }).stroke({ width: 1, color: BOIA_NAVY });
      frames.set(d, { node: g, wakeOrigin: v.anchors.wake_origin });
    }
    return new ShipSprite(frames, 'provisional', heading);
  }

  /** Carga las 8 vistas de la skin; `null` si falta alguna imagen. */
  static async fromManifest(
    loaded: LoadedShipManifest,
    heading: number,
  ): Promise<ShipSprite | null> {
    const skin = loaded.skin ?? 'base';
    const scale = loaded.displayScale ?? manifestScale(loaded);
    const frames = new Map<Direction, Frame>();
    try {
      await Promise.all(
        DIRECTIONS.map(async (d) => {
          const img = findShipImage(loaded.manifest, skin, d, false);
          if (!img) throw new Error(`falta ${skin}/${d}`);
          const texture: Texture = await Assets.load(new URL(img.file, loaded.baseUrl).href);
          const a = loaded.manifest.anchors[d];
          const s = new Sprite(texture);
          s.anchor.set(a.pivot.x / texture.width, a.pivot.y / texture.height);
          s.scale.set(scale);
          frames.set(d, {
            node: s,
            wakeOrigin: {
              x: (a.wake_origin.x - a.pivot.x) * scale,
              y: (a.wake_origin.y - a.pivot.y) * scale,
            },
          });
        }),
      );
    } catch (err) {
      console.warn('[boia] sprites del barco incompletos; se usa el provisional', err);
      return null;
    }
    return new ShipSprite(frames, 'manifest', heading);
  }

  get direction(): Direction {
    return this.picker.current;
  }

  update(heading: number): void {
    const d = this.picker.pick(heading);
    if (d === this.shown) return;
    if (this.shown) this.frames.get(this.shown)!.node.visible = false;
    this.frames.get(d)!.node.visible = true;
    this.shown = d;
  }

  /** `wake_origin` de la vista actual, en coordenadas de mundo relativas al barco. */
  wakeOriginOffset(): Vec2 {
    const o = this.frames.get(this.picker.current)!.wakeOrigin;
    const w = screenToWorld(o, 0);
    return { x: w.x, y: w.y };
  }
}
