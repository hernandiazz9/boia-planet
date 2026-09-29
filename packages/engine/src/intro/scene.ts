import { type SeaPalette, type WorldConfig, coastAssets } from '@boia/world';
import type {
  Application} from 'pixi.js';
import {
  Assets,
  Container,
  Geometry,
  Graphics,
  Mesh,
  RenderTexture,
  Shader,
  Sprite,
  Texture,
  type UniformGroup,
} from 'pixi.js';
import type { GameSurface } from '../game';
import { newApplication } from '../pixi-app';
import { Water } from '../water';
import { type ArtUrl, DEV_ART_URL, loadArt, manifestsOf } from '../world/assets';
import { createWorldCoastView } from '../world/coast-view';
import { ObjectView } from '../world/object-view';
import { resolveObjectVisual } from '../world/visual';
import type { IntroAssets } from './assets';
import type { IntroConfig } from './config';
import type { IntroSceneHandle, IntroSceneView } from './controller';
import { rhoOf, type IntroGeometry } from './sphere';
import type { IntroFrame } from './timeline';

/**
 * Escena de la entrada «mini-mundo» (D-19, opción A de T13). Una sola
 * aplicación Pixi con dos capas:
 * 1. La esfera: el mundo real (el mismo `WorldConfig`, arte, costas y barco
 *    que `/juego`) pintado una vez en una textura, y un shader en una malla a
 *    pantalla completa que la proyecta como planeta (proyección ortográfica
 *    de una esfera de radio `rho / k`, con giro, inclinación, luz, atmósfera
 *    y una capa de nubes algo por encima que gira más deprisa). Con k = 0 el
 *    shader es la cámara plana del juego.
 * 2. El mundo vivo: mar animado, costas, objetos y barco, con la misma
 *    cámara que la esfera ya plana. Entra encima al final del aterrizaje y
 *    se queda: es lo que EXPLORAR cede al juego (REQ-ENT-012).
 *
 * Pinta sólo cuando se le pide (`render`): el bucle lo lleva quien la usa.
 * No lee input ni arranca el juego.
 */

/** Marca del bundle de la escena (las pruebas e2e la usan para bloquearlo). */
export const INTRO_SCENE_MARKER = 'boia-intro-scene';

const SPACE = 0x0b1830;
/** Ancho en px de la textura de nubes (alto = la mitad, equirectangular). */
const CLOUDS_PX = 1024;

const VERTEX = /* glsl */ `
in vec2 aPosition;
out vec2 vPos;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform vec2 uView;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vPos = aPosition * uView;
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
in vec2 vPos;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uClouds;
uniform vec2 uCenter;     // px CSS donde está el punto delantero
uniform float uZoom;      // px CSS por px de mundo
uniform float uK;         // curvatura
uniform float uFlat;      // 1 = cámara plana exacta
uniform float uRho;       // radio a k = 1 (px de mundo)
uniform vec2 uFront;      // longitud y latitud del punto delantero (rad)
uniform vec2 uTexCenter;  // centro de la textura (px de mundo)
uniform vec2 uTexSize;    // px de mundo que cubre la textura
uniform float uTexelV;    // medio texel en v: más allá de los polos, la fila de mar del borde
uniform vec2 uLanding;    // punto de aterrizaje (px de mundo)
uniform vec3 uSpace;
uniform float uCloudLon;
uniform float uCloudAlpha;
uniform float uCloudLift;

const float PI = 3.14159265;
const vec3 LIGHT = vec3(-0.4152, -0.5075, 0.7551);

vec3 ground(vec2 tp) {
  vec2 uv = (tp - uTexCenter) / uTexSize + 0.5;
  uv.y = clamp(uv.y, uTexelV, 1.0 - uTexelV);
  return texture(uTexture, uv).rgb;
}

void main() {
  vec2 s = (vPos - uCenter) / uZoom;
  if (uFlat > 0.5) {
    finalColor = vec4(ground(uLanding + s), 1.0);
    return;
  }
  float R = uRho / uK;
  float cl = cos(uFront.y);
  float sl = sin(uFront.y);
  vec3 col;
  vec2 q = s / R;
  float r2 = dot(q, q);
  if (r2 >= 1.0) {
    // Fuera del disco: espacio con un halo de atmósfera que se va con k.
    float d = (sqrt(r2) - 1.0) * R * uZoom;
    col = mix(uSpace, vec3(0.55, 0.8, 1.0), uK * 0.55 * exp(-d / 14.0));
  } else {
    float z = sqrt(1.0 - r2);
    vec3 g = vec3(q.x, q.y * cl + z * sl, -q.y * sl + z * cl);
    float lon = uFront.x + atan(g.x, g.z);
    float lat = asin(clamp(g.y, -1.0, 1.0));
    float diff = max(dot(vec3(q, z), LIGHT), 0.0);
    float shade = mix(1.0, 0.5 + 0.6 * diff, uK);
    float rim = uK * pow(1.0 - z, 3.0);
    col = mix(ground(uTexCenter + vec2(lon, lat) * R) * shade, vec3(0.62, 0.85, 1.0), rim * 0.6);
  }
  if (uCloudAlpha > 0.0) {
    // Nubes: otra esfera un poco mayor, con su propio giro.
    vec2 qc = s / (R * (1.0 + uCloudLift));
    float rc2 = dot(qc, qc);
    if (rc2 < 1.0) {
      float zc = sqrt(1.0 - rc2);
      vec3 gc = vec3(qc.x, qc.y * cl + zc * sl, -qc.y * sl + zc * cl);
      float lonc = uCloudLon + atan(gc.x, gc.z);
      float latc = asin(clamp(gc.y, -1.0, 1.0));
      float a = texture(uClouds, vec2(lonc / (2.0 * PI) + 0.5, latc / PI + 0.5)).a;
      float light = 0.78 + 0.3 * max(dot(vec3(qc, zc), LIGHT), 0.0);
      col = mix(col, vec3(light), a * uCloudAlpha * smoothstep(0.0, 0.2, zc));
    }
  }
  finalColor = vec4(col, 1.0);
}
`;

export interface IntroScene extends IntroSceneHandle {
  /** GPU (o SwiftShader, si se pinta por software): para el diagnóstico. */
  readonly renderer: string;
  resize(width: number, height: number): void;
  /**
   * EXPLORAR (REQ-ENT-012): cede la aplicación, su canvas y el mar vivo al
   * juego en vez de destruirlos. Quita la esfera y el resto del mundo; lo
   * último pintado sigue en pantalla hasta que el juego pinte. Después,
   * `render` y `destroy` no hacen nada. `null` si ya no hay escena.
   */
  release(): GameSurface | null;
}

export interface CreateIntroSceneOptions {
  /** Canvas nuevo y exclusivo de esta escena; `destroy` lo quita del DOM. */
  canvas: HTMLCanvasElement;
  world: WorldConfig;
  config: IntroConfig;
  geometry: IntroGeometry;
  /** Escala de juego y barco (una vista quieta: el de la ilustración ligera). */
  assets: IntroAssets;
  width: number;
  height: number;
  resolution: number;
  artUrl?: ArtUrl;
  /** Colores del mar del mundo (los mismos que pondrá el juego). */
  sea?: SeaPalette;
  /**
   * Lo que la escena sabe del mundo activo (aterrizaje, geometría y puerto de
   * este navegador): el controlador lo adopta al llegar la escena (T28).
   */
  view?: IntroSceneView;
}

function rng(seed: number) {
  let s = Math.abs(Math.floor(seed)) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Nubes en una textura equirectangular (longitud × latitud), siempre las
 * mismas para una semilla: racimos de bolas blandas, lejos de los polos.
 */
function cloudTexture(config: IntroConfig): Texture {
  const w = CLOUDS_PX;
  const h = w / 2;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas 2D no disponible');
  const r = rng(config.clouds.seed);
  const puff = (x: number, y: number, rad: number) => {
    for (const dx of [-w, 0, w]) {
      const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.8)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + dx, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  for (let i = 0; i < config.clouds.count; i++) {
    const cx = r() * w;
    const cy = h / 2 + (r() - 0.5) * h * 0.6;
    const size = 10 + r() * 14;
    const n = 4 + Math.floor(r() * 4);
    for (let j = 0; j < n; j++) {
      puff(
        cx + (j - n / 2) * size * 0.9 + r() * size * 0.5,
        cy + (r() - 0.5) * size * 0.8,
        size * (0.7 + r() * 0.6),
      );
    }
  }
  const tex = Texture.from(c);
  tex.source.addressMode = 'repeat';
  tex.source.scaleMode = 'linear';
  return tex;
}

/** Nombre de la GPU (o de SwiftShader, si se pinta por software). */
function glRenderer(app: Application): string {
  const gl = (app.renderer as unknown as { gl?: WebGLRenderingContext }).gl;
  if (!gl) return 'desconocido';
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
}

export async function createIntroScene(opts: CreateIntroSceneOptions): Promise<IntroScene> {
  const { canvas, world, config, geometry: geo } = opts;
  canvas.dataset.scene = INTRO_SCENE_MARKER;

  // Recursos primero: el arte que falta se dibuja con marcadores, como en /juego.
  // El barco es una sola vista quieta (no las ocho del juego): menos que cargar.
  const [shipTexture, art] = await Promise.all([
    Assets.load<Texture>(opts.assets.ship.url),
    loadArt(
      [...world.objects.map((o) => o.appearance.asset), ...coastAssets(world.coast)],
      opts.artUrl ?? DEV_ART_URL,
    ),
  ]);

  const app = newApplication();
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
  const textures: Texture[] = [];
  try {
    // --- El mundo real, como en /juego (misma escala de arte, D-15).
    const artScale = opts.assets.artScale;
    const manifests = manifestsOf(art);
    const objectViews = await Promise.all(
      world.objects
        .filter((o) => o.identity.active)
        .map((o) => ObjectView.create(o, resolveObjectVisual(o, manifests, artScale), art)),
    );
    // Las mismas costas que el juego: losas de T01 o tiras de lugar de T18 (Arcilla).
    const coasts = await createWorldCoastView(world.bounds, world.coast, art, artScale);
    const water = new Water(opts.sea);
    const objects = new Container();
    objects.sortableChildren = true;
    for (const o of objectViews) {
      objects.addChild(o.view);
      o.animate(0);
    }
    const shipArt = opts.assets.ship;
    const ship = new Sprite(shipTexture);
    ship.anchor.set(shipArt.pivot[0] / shipArt.width, shipArt.pivot[1] / shipArt.height);
    ship.scale.set(shipArt.scale * artScale);
    const shipPos = { x: geo.landing.x + config.ship.dx, y: geo.landing.y + config.ship.dy };
    ship.position.set(shipPos.x, shipPos.y);
    // zIndex en y de mundo (las vistas de objetos usan y de mundo = 2·y de pantalla).
    ship.zIndex = shipPos.y * 2;
    objects.addChild(ship);
    const land = new Container();
    land.addChild(coasts, objects);
    const worldLayer = new Container();
    worldLayer.addChild(water.view, land);

    // --- 1. Textura: el mundo entero, una vez, con mar de relleno arriba y abajo.
    const texW = config.texturePx;
    const texH = Math.round((texW * geo.texSize.y) / geo.texSize.x);
    const tex = RenderTexture.create({ width: texW, height: texH, resolution: 1 });
    tex.source.addressMode = 'repeat';
    tex.source.scaleMode = 'linear';
    textures.push(tex);
    const texScale = texW / geo.texSize.x;
    const origin = {
      x: geo.texCenter.x - geo.texSize.x / 2,
      y: geo.texCenter.y - geo.texSize.y / 2,
    };
    water.view.position.set(origin.x, origin.y);
    water.update(geo.texSize.x, geo.texSize.y, origin.x, origin.y, 0);
    // Tierra y objetos sólo en las filas del mundo: el relleno es mar.
    const rows = new Graphics()
      .rect(origin.x, geo.texCenter.y - geo.worldHeight / 2, geo.texSize.x, geo.worldHeight)
      .fill(0xffffff);
    land.mask = rows;
    const bake = new Container();
    bake.addChild(worldLayer, rows);
    bake.scale.set(texScale);
    bake.position.set(-origin.x * texScale, -origin.y * texScale);
    app.renderer.render({ container: bake, target: tex, clear: true, clearColor: [0, 0, 0, 1] });
    bake.removeChild(worldLayer);
    land.mask = null;
    bake.destroy({ children: true });

    const clouds = cloudTexture(config);
    textures.push(clouds);

    // --- 2. La esfera: malla a pantalla completa con el shader.
    const mesh = new Geometry({
      attributes: { aPosition: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]) },
      indexBuffer: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });
    const shader = Shader.from({
      gl: { vertex: VERTEX, fragment: FRAGMENT, name: 'boia-intro-sphere' },
      resources: {
        uTexture: tex.source,
        uClouds: clouds.source,
        sphere: {
          uView: { value: new Float32Array([width, height]), type: 'vec2<f32>' },
          uCenter: { value: new Float32Array(2), type: 'vec2<f32>' },
          uZoom: { value: 1, type: 'f32' },
          uK: { value: 1, type: 'f32' },
          uFlat: { value: 0, type: 'f32' },
          uRho: { value: rhoOf(geo), type: 'f32' },
          uFront: { value: new Float32Array(2), type: 'vec2<f32>' },
          uTexCenter: {
            value: new Float32Array([geo.texCenter.x, geo.texCenter.y]),
            type: 'vec2<f32>',
          },
          uTexSize: {
            value: new Float32Array([geo.texSize.x, geo.texSize.y]),
            type: 'vec2<f32>',
          },
          uTexelV: { value: 0.5 / texH, type: 'f32' },
          uLanding: {
            value: new Float32Array([geo.landing.x, geo.landing.y]),
            type: 'vec2<f32>',
          },
          uSpace: {
            value: new Float32Array([0x0b / 255, 0x18 / 255, 0x30 / 255]),
            type: 'vec3<f32>',
          },
          uCloudLon: { value: 0, type: 'f32' },
          uCloudAlpha: { value: 0, type: 'f32' },
          uCloudLift: { value: config.clouds.lift, type: 'f32' },
        },
      },
    });
    const sphere = new Mesh({ geometry: mesh, shader });
    sphere.scale.set(width, height);
    const u = (shader.resources.sphere as UniformGroup).uniforms as Record<string, unknown>;

    // --- 3. El mundo vivo, encima al final.
    const live = new Container();
    live.addChild(worldLayer);
    live.visible = false;
    app.stage.addChild(sphere, live);

    /** Reloj del mundo vivo: su mar empieza en t = 0, como el de la textura. */
    let liveT0: number | null = null;

    const apply = (f: IntroFrame, clock: number) => {
      const p = f.sphere;
      sphere.visible = f.planet > 0;
      sphere.alpha = f.planet;
      if (sphere.visible) {
        (u.uCenter as Float32Array).set([p.center.x, p.center.y]);
        u.uZoom = p.zoom;
        u.uK = Math.max(p.k, 1e-6);
        u.uFlat = p.flat ? 1 : 0;
        (u.uFront as Float32Array).set([p.front.x, p.front.y]);
        u.uCloudLon = f.cloudLon;
        u.uCloudAlpha = f.clouds;
      }
      live.visible = f.live > 0;
      live.alpha = f.live;
      if (live.visible) {
        liveT0 ??= clock;
        const t = clock - liveT0;
        const { zoom, x, y, ax, ay } = f.camera;
        const ox = ax - x * zoom;
        const oy = ay - y * zoom;
        // Quieta al final: píxel entero para que el arte no tiemble.
        worldLayer.scale.set(zoom);
        worldLayer.position.set(f.done ? Math.round(ox) : ox, f.done ? Math.round(oy) : oy);
        const vx = x - ax / zoom;
        const vy = y - ay / zoom;
        water.view.position.set(vx, vy);
        water.update(width / zoom, height / zoom, vx, vy, t);
        for (const o of objectViews) o.animate(t);
        const bob = config.ship.bobPx > 0 ? Math.sin(t * Math.PI * 0.7) * config.ship.bobPx : 0;
        ship.position.set(shipPos.x, shipPos.y + bob / zoom);
      }
    };

    // Calentamiento: un pintado con la esfera, las nubes y el mundo vivo a la
    // vez sube a la GPU lo que el aterrizaje usará por primera vez; sin él,
    // SwiftShader se para ~300 ms en el primer fotograma del cruce (T13). El
    // canvas aún no se ve, y el primer fotograma de verdad lo borra.
    apply(
      {
        act: 'landing',
        t: 0,
        sphere: {
          k: 0.5,
          zoom: 1,
          center: { x: width / 2, y: height / 2 },
          front: { x: 0, y: 0 },
          flat: false,
        },
        planet: 1,
        clouds: 0.5,
        cloudLon: 0,
        live: 0.5,
        camera: { x: geo.landing.x, y: geo.landing.y, zoom: 0.5, ax: width / 2, ay: height / 2 },
        title: 0,
        button: 0,
        content: 0,
        done: false,
      },
      0,
    );
    app.render();
    sphere.visible = false;
    live.visible = false;
    app.render();
    liveT0 = null;

    const renderer = glRenderer(app);
    let destroyed = false;
    const disposeTextures = () => {
      for (const t of textures.splice(0)) t.destroy(true);
    };
    return {
      renderer,
      ...(opts.view ? { view: opts.view } : {}),
      resize(w, h) {
        if (destroyed || (w === width && h === height)) return;
        width = w;
        height = h;
        app.renderer.resize(w, h);
        sphere.scale.set(w, h);
        (u.uView as Float32Array).set([w, h]);
      },

      render(f: IntroFrame, clock: number) {
        if (destroyed) return;
        apply(f, clock);
        app.render();
      },

      release() {
        if (destroyed) return null;
        destroyed = true;
        water.view.removeFromParent();
        // El juego pinta el mar en el escenario, en el origen: aquí iba dentro
        // del mundo, desplazado a la cámara (con las coordenadas de Arcilla,
        // miles de px fuera de la vista: se veía sólo el fondo).
        water.view.position.set(0, 0);
        water.view.scale.set(1);
        for (const c of app.stage.removeChildren()) c.destroy({ children: true });
        disposeTextures();
        delete canvas.dataset.scene;
        return { app, water };
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        // Cada escena tiene su propio canvas: se va con ella.
        app.destroy({ removeView: true }, { children: true, texture: false });
        disposeTextures();
      },
    };
  } catch (err) {
    app.destroy({ removeView: false }, { children: true, texture: false });
    for (const t of textures) t.destroy(true);
    throw err;
  }
}
