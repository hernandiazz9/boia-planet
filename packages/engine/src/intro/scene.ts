import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { Water } from '../water';
import { introImageUrls, type ArtImage, type IntroAssets } from './assets';
import type { IntroConfig } from './config';
import type { IntroSceneHandle } from './controller';
import type { IntroFrame } from './timeline';

/**
 * Escena de la entrada en Pixi: una sola escena con capas 2D (§4.4, D-05).
 * Detrás, el espacio; encima, el planeta (globo, banda de mar, nubes e isla)
 * en coordenadas de escena; luego el mar vivo del juego (`Water`) en
 * coordenadas de pantalla; y encima el mundo de la landing: islas, rocas,
 * boia y barco. Pinta sólo cuando se le pide (`render`): el bucle lo lleva
 * quien la usa, así una pestaña oculta o el movimiento reducido no gastan
 * batería. No lee input ni arranca el juego.
 */

/** Marca del bundle de la escena (las pruebas e2e la usan para bloquearlo). */
export const INTRO_SCENE_MARKER = 'boia-intro-scene';

const SPACE = 0x0b1830;
const STAR_COUNT = 42;

export interface IntroScene extends IntroSceneHandle {
  resize(width: number, height: number): void;
}

export interface CreateIntroSceneOptions {
  /** Canvas nuevo y exclusivo de esta escena; `destroy` lo quita del DOM. */
  canvas: HTMLCanvasElement;
  assets: IntroAssets;
  config: IntroConfig;
  width: number;
  height: number;
  resolution: number;
}

function sprite(tex: Texture, art: ArtImage): Sprite {
  const s = new Sprite(tex);
  s.anchor.set(art.pivot[0] / art.width, art.pivot[1] / art.height);
  s.scale.set(art.scale);
  return s;
}

/**
 * Máscara vertical de la banda de mar: opaca arriba y desvanecida abajo, para
 * que su borde inferior se funda con el globo (es el mismo globo, más nítido).
 */
function fadeMask(): Texture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas 2D no disponible');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(0.95, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  return Texture.from(c);
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export async function createIntroScene(opts: CreateIntroSceneOptions): Promise<IntroScene> {
  const { assets, config, canvas } = opts;
  canvas.dataset.scene = INTRO_SCENE_MARKER;

  // Texturas primero: si falta una imagen, falla antes de tocar el canvas.
  const urls = introImageUrls(assets);
  const textures = new Map<string, Texture>();
  await Promise.all(
    urls.map(async (src) => {
      const tex = await Assets.load<Texture>({ src, data: { autoGenerateMipmaps: true } });
      textures.set(src, tex);
    }),
  );
  const tex = (url: string) => {
    const t = textures.get(url);
    if (!t) throw new Error(`[boia] textura sin cargar: ${url}`);
    return t;
  };

  const app = new Application();
  await app.init({
    canvas,
    width: opts.width,
    height: opts.height,
    resolution: opts.resolution,
    autoDensity: true,
    antialias: true,
    background: SPACE,
    // Sólo WebGL: si no hay, la landing ligera es mejor que un render a medias.
    preference: ['webgl'],
    autoStart: false,
    sharedTicker: false,
  });
  app.ticker.stop();

  let width = opts.width;
  let height = opts.height;

  // Espacio: unas pocas estrellas quietas.
  const stars = new Graphics();
  const drawStars = () => {
    const r = rng(7);
    stars.clear();
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.circle(r() * width, r() * height, 0.6 + r() * 1.1);
    }
    stars.fill({ color: 0xffffff, alpha: 0.55 });
  };
  drawStars();

  // Planeta, en px de escena con el polo en el origen.
  const p = assets.planet;
  const planet = new Container();
  const globe = sprite(tex(p.globe.url), p.globe);
  const band = sprite(tex(p.band.url), p.band);
  const bandMask = new Sprite(fadeMask());
  bandMask.anchor.copyFrom(band.anchor);
  bandMask.width = p.band.width * p.band.scale;
  bandMask.height = p.band.height * p.band.scale;
  band.mask = bandMask;
  const clouds = new Sprite(tex(p.clouds.url));
  clouds.anchor.set(p.clouds.centre[0] / p.clouds.width, p.clouds.centre[1] / p.clouds.height);
  clouds.scale.set(p.clouds.scale);
  clouds.position.set(
    (p.clouds.centre[0] - p.clouds.pivot[0]) * p.clouds.scale,
    (p.clouds.centre[1] - p.clouds.pivot[1]) * p.clouds.scale,
  );
  const planetIsland = sprite(tex(p.island.url), p.island);
  planet.addChild(globe, band, bandMask, clouds, planetIsland);

  // Mar vivo del juego, en px de pantalla.
  const water = new Water();

  // Mundo de la landing, ordenado por profundidad.
  const world = new Container();
  world.sortableChildren = true;
  const objects = config.objects.map((o) => {
    const art = assets.sprites[o.asset];
    const frames = art.frames.map(tex);
    const s = sprite(frames[0]!, art);
    s.position.set(o.x, o.y);
    s.zIndex = o.y;
    world.addChild(s);
    return { id: o.id, sprite: s, frames, fps: art.fps };
  });
  const ship = sprite(tex(assets.ship.url), assets.ship);
  ship.position.set(config.ship.x, config.ship.y);
  ship.zIndex = config.ship.y;
  world.addChild(ship);

  app.stage.addChild(stars, planet, water.view, world);

  // Calentamiento: un pintado con todo visible sube las texturas a la GPU
  // ahora (el canvas sigue invisible), no en mitad del acercamiento.
  stars.alpha = 1;
  for (const c of [planet, world]) c.scale.set(0.05);
  app.render();
  // Y se borra: nada de ese pintado debe llegar a verse.
  for (const c of [stars, planet, water.view, world]) c.visible = false;
  app.render();
  for (const c of [stars, planet, water.view, world]) c.visible = true;

  let destroyed = false;
  return {
    resize(w, h) {
      if (destroyed || (w === width && h === height)) return;
      width = w;
      height = h;
      app.renderer.resize(w, h);
      drawStars();
    },

    render(f: IntroFrame, clock: number) {
      if (destroyed) return;
      const { zoom, x, y, ax, ay } = f.camera;
      const ox = ax - x * zoom;
      const oy = ay - y * zoom;
      // Quieta al final: píxel entero para que el arte no tiemble.
      const px = f.done ? Math.round(ox) : ox;
      const py = f.done ? Math.round(oy) : oy;
      for (const c of [planet, world]) {
        c.scale.set(zoom);
        c.position.set(px, py);
      }

      stars.alpha = f.space;
      stars.visible = f.space > 0;
      planet.visible = f.globe > 0 || f.planetIsland > 0;
      globe.alpha = f.globe;
      band.alpha = f.band;
      band.visible = f.band > 0;
      clouds.alpha = f.clouds;
      clouds.visible = f.clouds > 0;
      clouds.rotation = f.cloudTurn;
      planetIsland.alpha = f.planetIsland;

      water.view.visible = f.water > 0;
      water.view.alpha = f.water;
      if (f.water > 0) {
        // El mar del juego se pinta a escala de juego; aquí, al zoom de la cámara.
        const s = zoom / assets.artScale;
        water.view.scale.set(s);
        water.update(
          width / s,
          height / s,
          (x - ax / zoom) * assets.artScale,
          (y - ay / zoom) * assets.artScale,
          clock,
        );
      }

      for (const o of objects) {
        const a = f.objects[o.id] ?? 1;
        o.sprite.alpha = a;
        o.sprite.visible = a > 0;
        if (o.frames.length > 1 && o.fps > 0) {
          const i = Math.floor(clock * o.fps) % o.frames.length;
          o.sprite.texture = o.frames[i]!;
        }
      }
      ship.alpha = f.ship;
      ship.visible = f.ship > 0;
      const bob = config.ship.bobPx > 0 ? Math.sin(clock * Math.PI * 0.7) * config.ship.bobPx : 0;
      ship.position.set(config.ship.x, config.ship.y + bob / zoom);

      app.render();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      // Cada escena tiene su propio canvas: se va con ella.
      app.destroy({ removeView: true }, { children: true, texture: false });
    },
  };
}
