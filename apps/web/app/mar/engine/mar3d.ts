import {
  type DialogueView,
  DEFAULT_SHIP_CONFIG,
  IDLE_INPUT,
  type RuntimeOptions,
  type ShipConfig,
  type ShipInput,
  type ShipState,
  type WorldEvent,
  WorldRuntime,
  createShipState,
  shipSpeed,
  stepShip,
} from '@boia/engine/headless';
import type { MissionHost } from '@boia/engine/mission';
import type { WorldConfig } from '@boia/world';
import type { Color, ShaderMaterial } from 'three';
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  type Object3D,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  type Boat,
  type FaceTextures,
  chestGeometry,
  createBoat,
  createCoin,
  createCroc,
  createDolphin,
  createFaceTextures,
  createJelly,
  createMascot,
  debrisGeometry,
  litMaterial,
} from './characters';
import { type SceneRect, buildCoast } from './coast';
import { toScene } from './compress';
import { Clouds, Confetti, CourseMarker, Wake, glowPoints, whirlpool } from './effects';
import {
  type IslandBuild,
  amphora,
  buildIsland,
  buildSandbank,
  sleepingRing,
  textTexture,
} from './islands';
import { Kit, clamp01, lerp, rng, seedOf, smooth } from './kit';
import { C, type Mood, type MoodId, cloneMood, mixMood, moods } from './palette';
import { Glows, buoy, crag, crate, rock } from './props';
import { type ShipModel, modelLength } from './ship-model';
import { createWater } from './water';

/**
 * El mar 3D: three.js sobre el mismo `WorldRuntime` que /juego. Aquí sólo
 * vive la vista y el control: cámara con zoom continuo desde el barco hasta
 * el mapa entero, joystick táctil desde el punto tocado, pellizco y rueda,
 * rumbo por toque (piloto automático que esquiva islas), turbo y los tres
 * momentos del día. Lo que pasa en el mundo (premios, paneles, misión,
 * circuito) llega a la web por `onWorldEvent`, igual que en el 2D.
 */

export interface PinSpec {
  id: string;
  text: string;
  icon: string;
  /** Rótulo destacado (la isla del evento). */
  accent?: boolean;
  /** Siempre visible, también de cerca (lo que vende). */
  always?: boolean;
}

export interface Stats {
  fps: number;
  /** Nudos de juego (velocidad en u/s ÷ 10). */
  knots: number;
  zoom: number;
  mapMode: boolean;
  turbo: number;
  /** 0..1: listo cuando llega a 1. */
  turboReady: number;
  course: CourseInfo | null;
  /** Barco lejos del centro de la vista (vista de mapa desplazada). */
  panned: boolean;
}

export interface CourseInfo {
  placeId: string | null;
  /** Metros de juego hasta el destino. */
  meters: number;
}

export interface Mar3DOptions {
  canvas: HTMLCanvasElement;
  overlay: HTMLElement;
  world: WorldConfig;
  runtime: RuntimeOptions;
  mood: MoodId;
  sea?: { base: string; wave: string; crest: string };
  pins: PinSpec[];
  onWorldEvent(e: WorldEvent): void;
  onStep?(ship: ShipState, dt: number): void;
  onPin?(id: string): void;
  onStats?(s: Stats): void;
  /** El barco empezó a moverse por primera vez (para quitar la ayuda). */
  onFirstMove?(): void;
}

/** A partir de este zoom el arrastre mueve el mapa en vez del barco. */
export const MAP_ZOOM = 0.55;
const BOAT_ZOOM = 0.2;
/** Eslora del barco en la escena (unidades): algo mayor que la del motor, para leerse en el móvil. */
const SHIP_LENGTH = 3.9;
const STEP = 1 / 60;
const TURBO_S = 2.4;
const TURBO_COOLDOWN_S = 7;
const METERS_PER_U = 0.25;

interface View {
  id: string;
  obj: Object3D;
  kind: string;
  /** Altura base (sobre el agua) y fase de balanceo. */
  y: number;
  phase: number;
  update?: (
    v: View,
    t: number,
    dt: number,
    present: boolean,
    x: number,
    z: number,
    h: number,
  ) => void;
  labelY: number;
  shown: number;
}

interface PinView {
  spec: PinSpec;
  el: HTMLButtonElement;
  x: number;
  z: number;
  y: number;
  vis: boolean;
}

interface Anchor {
  el: HTMLElement;
  target: string;
  dy: number;
}

const tmpV = new Vector3();

export class Mar3D {
  readonly world: WorldConfig;
  readonly runtime: WorldRuntime;
  readonly ship: ShipState;
  readonly missionHost: MissionHost;

  private readonly opts: Mar3DOptions;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(40, 1, 0.5, 5000);
  private readonly hemi = new HemisphereLight();
  private readonly sun = new DirectionalLight();
  private readonly water;
  private readonly boat: Boat;
  private readonly faces: FaceTextures;
  private readonly wake = new Wake();
  private readonly marker = new CourseMarker();
  private readonly confetti = new Confetti();
  private readonly clouds: Clouds;
  private readonly glow;
  private readonly views = new Map<string, View>();
  private readonly islands: { x: number; z: number; R: number; build: IslandBuild }[] = [];
  private readonly animated: ((t: number, glow: number) => void)[] = [];
  private readonly pins: PinView[] = [];
  private readonly anchors: Anchor[] = [];
  private readonly b: SceneRect;
  // Radio de choque acorde con el barco que se ve (más grande que en el 2D).
  private readonly cfg: ShipConfig = { ...DEFAULT_SHIP_CONFIG, radius: 18 };
  private sternX = -1.3;
  private readonly moods: Record<MoodId, Mood>;
  private mood: Mood;
  private moodFrom: Mood;
  private moodTo: Mood;
  private moodT = 1;
  private crew: Group | null = null;
  private prev = { x: 0, y: 0, heading: 0 };
  private acc = 0;
  private time = 0;
  private last = 0;
  private raf = 0;
  private destroyed = false;

  // Cámara.
  private zoom = BOAT_ZOOM;
  private zoomGoal = BOAT_ZOOM;
  private lastBoatZoom = BOAT_ZOOM;
  private readonly pan = new Vector2();
  private readonly focus = new Vector3();
  private readonly look = new Vector3();
  private dFar = 700;
  /** px tapados abajo por la ficha: la cámara sube el barco por encima. */
  private insetGoal = 0;
  private inset = 0;
  private shake = 0;
  private fovKick = 0;

  // Control.
  private readonly pointers = new Map<
    number,
    { x: number; y: number; sx: number; sy: number; t: number }
  >();
  private mode: 'none' | 'pending' | 'stick' | 'pan' | 'pinch' = 'none';
  private stick = { ox: 0, oy: 0, dx: 0, dy: 0 };
  private pinch = { d: 0, zoom: 0 };
  private readonly keys = new Set<string>();
  private readonly stickEl: HTMLDivElement;
  private readonly knobEl: HTMLDivElement;
  private course: { x: number; y: number; placeId: string | null } | null = null;
  private moved = false;
  private turboLeft = 0;
  private turboCool = 0;
  private turnRate = 0;
  private statsAt = 0;
  private frames = 0;
  private fps = 60;
  private perfWindow: number[] = [];
  private dpr = 1;
  private readonly maxDpr: number;
  private readonly raycaster = new Raycaster();
  private readonly waterPlane = new Plane(new Vector3(0, 1, 0), 0);
  private semaphore: MeshBasicMaterial[] = [];
  /** Sin control (un diálogo modal encima: la compra de prueba). */
  inputEnabled = true;
  /** Sin simular ni pintar (un minijuego a pantalla completa encima). */
  paused = false;
  private gates = new Map<number, MeshBasicMaterial[]>();

  constructor(opts: Mar3DOptions) {
    this.opts = opts;
    this.world = opts.world;
    this.runtime = new WorldRuntime(opts.world, opts.runtime);
    const spawn = opts.world.spawn ?? { x: 0, y: 0, heading: -Math.PI / 2 };
    this.ship = createShipState(spawn.x, spawn.y, spawn.heading);
    Object.assign(this.prev, { x: spawn.x, y: spawn.y, heading: spawn.heading });
    const bounds = opts.world.bounds;
    this.b = {
      left: toScene(bounds.left),
      right: toScene(bounds.right),
      top: toScene(bounds.top),
      bottom: toScene(bounds.bottom),
    };

    this.maxDpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = Math.min(this.maxDpr, 1.5);
    this.renderer = new WebGLRenderer({
      canvas: opts.canvas,
      antialias: this.maxDpr < 2,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(this.dpr);

    this.moods = moods(opts.sea);
    this.mood = cloneMood(this.moods[opts.mood]);
    this.moodFrom = cloneMood(this.mood);
    this.moodTo = this.moods[opts.mood];

    this.scene.fog = new Fog(this.mood.fog, 60, 400);
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.water = createWater(this.b);
    this.scene.add(this.water.mesh);

    this.faces = createFaceTextures();
    this.boat = createBoat(this.faces);
    this.boat.body.scale.setScalar(SHIP_LENGTH / 3);
    this.scene.add(this.boat.group);
    this.scene.add(this.wake.mesh, this.marker.group, this.confetti.mesh);

    const glows: Glows[] = [];
    const cave = this.world.objects.find((o) => o.identity.id === 'secreto-cueva');
    const coast = buildCoast(
      this.b,
      cave
        ? {
            z: toScene(cave.position.y),
            side: toScene(cave.position.x) < (this.b.left + this.b.right) / 2 ? -1 : 1,
          }
        : null,
    );
    this.scene.add(coast.group);
    glows.push(coast.glows);

    const shores = this.buildPlaces(glows);
    this.water.setShores(shores);
    this.glow = glowPoints(glows);
    this.scene.add(this.glow);

    this.clouds = new Clouds(this.b);
    this.scene.add(this.clouds.group);

    this.missionHost = {
      moveObject: (id, x, y, z) => this.runtime.moveObject(id, x, y, z),
      setObjectPresent: (id, on) => this.runtime.setObjectPresent(id, on),
      setObjectInteractive: (id, on) => this.runtime.setObjectInteractive(id, on),
      setPassenger: (on) => this.setPassenger(on),
    };

    // Joystick visible donde se toca.
    this.stickEl = document.createElement('div');
    this.stickEl.className = 'mar-stick';
    this.knobEl = document.createElement('div');
    this.knobEl.className = 'mar-stick__knob';
    this.stickEl.append(this.knobEl);
    opts.overlay.append(this.stickEl);
    this.setPins(opts.pins);

    this.bindInput();
    this.resize();
    window.addEventListener('resize', this.resize);
    this.applyMood();
    this.updateCamera(0, true);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // --- API -------------------------------------------------------------------

  setMood(id: MoodId): void {
    this.moodFrom = cloneMood(this.mood);
    this.moodTo = this.moods[id];
    this.moodT = 0;
  }

  /** Lo que tapa la ficha de abajo (px): el barco se ve por encima de ella. */
  setBottomInset(px: number): void {
    this.insetGoal = Math.max(0, px);
  }

  zoomBy(d: number): void {
    this.zoomGoal = clamp01(this.zoomGoal + d);
    if (this.zoomGoal < MAP_ZOOM) this.lastBoatZoom = this.zoomGoal;
  }

  get zoomLevel(): number {
    return this.zoom;
  }

  /** Vista de mapa ↔ vista de barco. */
  toggleMap(): void {
    if (this.zoomGoal >= MAP_ZOOM) this.backToBoat();
    else {
      this.lastBoatZoom = this.zoomGoal;
      this.zoomGoal = 1;
    }
  }

  backToBoat(): void {
    this.zoomGoal = Math.min(this.lastBoatZoom, MAP_ZOOM - 0.1);
    this.pan.set(0, 0);
  }

  /** Fija rumbo a un lugar (hasta su orilla) o a un punto; null lo quita. */
  setCourse(target: { placeId: string } | { x: number; y: number } | null): void {
    if (!target) {
      this.course = null;
      this.marker.show(false);
      return;
    }
    if ('placeId' in target) {
      const o = this.world.objects.find((x) => x.identity.id === target.placeId);
      if (!o) return;
      const st = this.runtime.objectState(o.identity.id);
      const px = st?.x ?? o.position.x;
      const py = st?.y ?? o.position.y;
      const reach =
        Math.max(o.geometry.collision?.radius ?? 0, o.geometry.activation?.radius ?? 0) +
        this.cfg.radius +
        40;
      const dx = this.ship.x - px;
      const dy = this.ship.y - py;
      const d = Math.hypot(dx, dy) || 1;
      this.course = { x: px + (dx / d) * reach, y: py + (dy / d) * reach, placeId: o.identity.id };
    } else {
      const p = this.runtime.safePoint(target.x, target.y, this.cfg.radius + 6);
      this.course = { x: p.x, y: p.y, placeId: null };
    }
    this.marker.show(true);
  }

  /** Pone el barco al sur de un lugar, fuera de su radio (`?cerca=` y enlaces). */
  startNear(placeId: string): boolean {
    const o = this.world.objects.find((x) => x.identity.id === placeId);
    if (!o) return false;
    const reach = Math.max(
      o.geometry.proximityRadius ?? 0,
      o.geometry.activation?.radius ?? 0,
      o.geometry.collision?.radius ?? 0,
    );
    const p = this.runtime.safePoint(o.position.x, o.position.y + reach + 90, this.cfg.radius);
    Object.assign(this.ship, { x: p.x, y: p.y, vx: 0, vy: 0, heading: -Math.PI / 2 });
    Object.assign(this.prev, { x: p.x, y: p.y, heading: -Math.PI / 2 });
    this.updateCamera(0, true);
    return true;
  }

  turbo(): boolean {
    if (this.turboCool > 0) return false;
    this.turboLeft = TURBO_S;
    this.turboCool = TURBO_COOLDOWN_S;
    this.fovKick = 1;
    return true;
  }

  /** Pone el barco del 2D (su modelo de Blender) en lugar del provisional. */
  setShipModel(m: ShipModel): void {
    const body = this.boat.body;
    for (const c of [...body.children]) {
      if (c === this.boat.crewSlot) continue;
      body.remove(c);
      c.traverse((o) => (o as Mesh).geometry?.dispose());
    }
    this.boat.sail = null;
    this.boat.captain = null;
    body.scale.setScalar(1);
    m.object.scale.setScalar(1);
    m.object.position.set(0, 0, 0);
    m.object.updateMatrixWorld(true);
    const { length, minX, maxX } = modelLength(m.object);
    const k = SHIP_LENGTH / (length || 1);
    m.object.scale.setScalar(k);
    m.object.position.set(-((minX + maxX) / 2) * k, 0, 0);
    body.add(m.object);
    this.boat.crewSlot.position.set(m.slot.x * k + m.object.position.x, m.slot.y * k, m.slot.z * k);
    this.sternX = -SHIP_LENGTH / 2;
  }

  setPassenger(on: boolean): void {
    if (on && !this.crew) {
      this.crew = createMascot(this.faces.pink, { cap: 'party', band: C.yellow, scale: 0.32 });
      this.boat.crewSlot.add(this.crew);
    } else if (!on && this.crew) {
      this.boat.crewSlot.remove(this.crew);
      this.crew = null;
    }
  }

  /** Confeti sobre un lugar (la entrega de la Fiestera, una meta). */
  celebrate(placeId: string | null): void {
    const v = placeId ? this.views.get(placeId) : null;
    const x = v ? v.obj.position.x : toScene(this.ship.x);
    const z = v ? v.obj.position.z : toScene(this.ship.y);
    this.confetti.burst(x, (v?.labelY ?? 3) * 0.6, z);
  }

  /** Pone un elemento HTML sobre un lugar (o sobre el barco) y lo sigue. */
  anchor(el: HTMLElement | null, target: string, dy = 0): void {
    const i = this.anchors.findIndex((a) => a.target === target);
    if (i >= 0) this.anchors.splice(i, 1);
    if (el) this.anchors.push({ el, target, dy });
  }

  release(el: HTMLElement): void {
    const i = this.anchors.findIndex((a) => a.el === el);
    if (i >= 0) this.anchors.splice(i, 1);
  }

  setPins(pins: PinSpec[]): void {
    for (const p of this.pins) p.el.remove();
    this.pins.length = 0;
    for (const spec of pins) {
      const v = this.views.get(spec.id);
      if (!v) continue;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `mar-pin${spec.accent ? ' mar-pin--accent' : ''}`;
      el.dataset.pin = spec.id;
      el.innerHTML = `<span class="mar-pin__icon" aria-hidden="true">${spec.icon}</span><span class="mar-pin__text"></span>`;
      el.querySelector('.mar-pin__text')!.textContent = spec.text;
      el.setAttribute('aria-label', spec.text);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.opts.onPin?.(spec.id);
      });
      this.opts.overlay.append(el);
      this.pins.push({
        spec,
        el,
        x: v.obj.position.x,
        z: v.obj.position.z,
        y: v.labelY,
        vis: false,
      });
    }
  }

  /** Semáforo del circuito: apagado, rojo, ámbar o verde. */
  setSemaphore(state: 'off' | 'red' | 'amber' | 'green'): void {
    const on = { off: -1, red: 0, amber: 1, green: 2 }[state];
    const base = ['#5a1a1a', '#5a4a1a', '#1a4a2a'];
    const lit = ['#ff3b30', '#ffc53d', '#3dff7a'];
    this.semaphore.forEach((m, i) => m.color.set(i === on ? lit[i]! : base[i]!));
  }

  /** Resalta el arco que toca pasar (null: ninguno). */
  setNextGate(order: number | null): void {
    for (const [o, mats] of this.gates) {
      for (const m of mats) m.color.set(o === order ? '#ffd23f' : '#fff4e2');
    }
  }

  dialogue(): DialogueView | null {
    return this.runtime.dialogue();
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.unbindInput();
    for (const p of this.pins) p.el.remove();
    this.stickEl.remove();
    this.scene.traverse((o) => {
      const m = o as Mesh;
      m.geometry?.dispose();
      const mat = m.material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
  }

  // --- Mundo ----------------------------------------------------------------

  private addView(v: Omit<View, 'shown'>): void {
    this.views.set(v.id, { ...v, shown: 1 });
    this.scene.add(v.obj);
  }

  /** Construye cada lugar; devuelve las orillas para el agua. */
  private buildPlaces(glows: Glows[]): { x: number; z: number; r: number; w: number }[] {
    const shores: { x: number; z: number; r: number; w: number }[] = [];
    const statics = new Kit();
    const staticGlows = new Glows();
    glows.push(staticGlows);
    const lit = litMaterial();

    const gateList = this.circuitGates();

    for (const o of this.world.objects) {
      if (!o.identity.active) continue;
      const id = o.identity.id;
      const cat = o.identity.category;
      const x = toScene(o.position.x);
      const z = toScene(o.position.y);
      const r = toScene(o.geometry.collision?.radius ?? o.geometry.activation?.radius ?? 12);
      const rnd = rng(seedOf(id));
      const phase = rnd() * Math.PI * 2;

      if (cat === 'isla' || cat === 'naufrago') {
        const R = cat === 'isla' ? r : Math.max(1.5, r * 1.2);
        const build = cat === 'isla' ? buildIsland(id, R) : buildSandbank(R);
        const g = new Group();
        g.position.set(x, 0, z);
        g.add(new Mesh(build.parts.lit.build(), lit));
        if (!build.parts.glow.empty) {
          g.add(new Mesh(build.parts.glow.build(), new MeshBasicMaterial({ vertexColors: true })));
        }
        for (const a of build.animated) g.add(a);
        if (build.update) this.animated.push(build.update);
        const gl = build.parts.glows;
        for (let i = 0; i < gl.pos.length; i += 3) {
          gl.pos[i] = gl.pos[i]! + x;
          gl.pos[i + 2] = gl.pos[i + 2]! + z;
        }
        glows.push(gl);
        this.islands.push({ x, z, R, build });
        shores.push({ x, z, r: R, w: Math.min(11, 3 + R * 0.7) });
        this.addView({ id, obj: g, kind: cat, y: 0, phase, labelY: build.labelY });
        continue;
      }
      if (id === 'puerto') continue;

      switch (cat) {
        case 'boia': {
          if (id.includes('whatsapp')) {
            const g = new Group();
            const k = new Kit();
            buoy(k, 0, 0, C.green, C.white, 1.1);
            k.add(new SphereGeometry(0.45, 10, 8), C.white, {
              p: [0, 1.45, 0],
              s: [1.2, 0.9, 0.5],
            });
            k.add(new ConeGeometry(0.16, 0.3, 4), C.white, {
              p: [-0.35, 1.05, 0],
              r: [0, 0, -0.6],
            });
            g.add(new Mesh(k.build(), lit));
            g.position.set(x, 0, z);
            this.addView({ id, obj: g, kind: 'boia', y: 0, phase, labelY: 2.6, update: bob(0.08) });
          } else {
            const g = new Group();
            const k = new Kit();
            k.add(new CylinderGeometry(0.9, 1.1, 0.5, 12), C.white, { p: [0, 0.1, 0] });
            k.add(new CylinderGeometry(0.2, 0.2, 0.2, 8), C.orange, { p: [0, 0.4, 0] });
            g.add(new Mesh(k.build(), lit));
            const m = createMascot(this.faces.orange, {
              cap: 'beanie',
              band: C.white,
              scale: 0.75,
            });
            m.position.y = 0.35;
            m.rotation.y = Math.PI / 2;
            g.add(m);
            g.position.set(x, 0, z);
            this.addView({
              id,
              obj: g,
              kind: 'boia',
              y: 0,
              phase,
              labelY: 3.2,
              update: (v, t) => {
                v.obj.position.y = Math.sin(t * 1.8 + v.phase) * 0.12;
                m.rotation.z = Math.sin(t * 2.4) * 0.08;
              },
            });
          }
          break;
        }
        case 'encuentro': {
          const g = new Group();
          const m = createMascot(this.faces.pink, { cap: 'party', band: C.yellow, scale: 0.55 });
          m.rotation.y = Math.PI / 2;
          g.add(m);
          g.position.set(x, 0, z);
          this.addView({
            id,
            obj: g,
            kind: 'encuentro',
            y: 0,
            phase,
            labelY: 3,
            update: (v, t, _dt, present, px, pz, h) => {
              v.obj.visible = present;
              v.obj.position.set(px, h + Math.abs(Math.sin(t * 3 + v.phase)) * 0.25, pz);
              m.rotation.z = Math.sin(t * 3) * 0.15;
            },
          });
          break;
        }
        case 'cocodrilo': {
          const g = createCroc();
          g.position.set(x, 0, z);
          g.rotation.y = phase;
          g.scale.setScalar(0.9);
          let lastX = x;
          let lastZ = z;
          this.addView({
            id,
            obj: g,
            kind: 'cocodrilo',
            y: 0,
            phase,
            labelY: 2,
            update: (v, t, dt, present, px, pz) => {
              const target = present ? 0 : -1.2;
              v.y += (target - v.y) * Math.min(1, dt * 4);
              const dx = px - lastX;
              const dz = pz - lastZ;
              if (Math.hypot(dx, dz) > 0.002) v.obj.rotation.y = -Math.atan2(dz, dx);
              else v.obj.rotation.y = v.phase + Math.sin(t * 0.4 + v.phase) * 0.6;
              lastX = px;
              lastZ = pz;
              v.obj.position.set(px, v.y + Math.sin(t * 2 + v.phase) * 0.05, pz);
              v.obj.visible = v.y > -1.1;
            },
          });
          break;
        }
        case 'restos':
        case 'cofre':
        case 'secreto': {
          if (id === 'secreto-cueva') {
            staticGlows.add([x + 1.5, 1.2, z], '#9fe8ff', 2);
            break;
          }
          if (id === 'secreto-circulo') {
            const k = new Kit();
            sleepingRing(k, 2.4);
            const g = new Group();
            g.add(new Mesh(k.build(), lit));
            g.position.set(x, 0, z);
            this.addView({ id, obj: g, kind: cat, y: 0, phase, labelY: 2, update: bob(0.05) });
            break;
          }
          if (id === 'secreto-campana') {
            staticGlows.add([x, 0.3, z], '#bfe8ff', 3.5);
            break;
          }
          const collectible = o.behaviors.some((b) => b.type === 'collectible');
          const g = new Group();
          let body: Mesh;
          if (cat === 'cofre') body = new Mesh(chestGeometry(), lit);
          else if (id === 'secreto-anfora') body = new Mesh(amphora(), lit);
          else body = new Mesh(debrisGeometry(rnd), lit);
          g.add(body);
          const coin = collectible ? createCoin() : null;
          if (coin) {
            coin.position.y = cat === 'cofre' ? 2 : 1.4;
            coin.rotation.x = Math.PI / 2;
            g.add(coin);
          }
          g.position.set(x, 0, z);
          this.addView({
            id,
            obj: g,
            kind: cat,
            y: 0,
            phase,
            labelY: 2.4,
            update: (v, t, dt, present, px, pz) => {
              v.shown += ((present ? 1 : 0) - v.shown) * Math.min(1, dt * 6);
              v.obj.visible = v.shown > 0.02;
              v.obj.scale.setScalar(v.shown);
              v.obj.position.set(px, Math.sin(t * 1.6 + v.phase) * 0.1 - 0.05, pz);
              body.rotation.set(
                Math.sin(t + v.phase) * 0.06,
                v.phase,
                Math.cos(t * 0.8 + v.phase) * 0.06,
              );
              if (coin) {
                coin.rotation.z = t * 2.4;
                coin.position.y = (cat === 'cofre' ? 2 : 1.4) + Math.sin(t * 2.2 + v.phase) * 0.15;
              }
            },
          });
          break;
        }
        case 'delfin': {
          const g = new Group();
          const d = createDolphin();
          g.add(d);
          g.position.set(x, 0, z);
          this.addView({
            id,
            obj: g,
            kind: 'delfin',
            y: 0,
            phase,
            labelY: 2,
            update: (v, t, _dt, present, px, pz) => {
              v.obj.visible = present;
              // Salta en arcos alrededor de su sitio.
              const cycle = (t * 0.45 + v.phase) % 1;
              const a = t * 0.35 + v.phase;
              const cx = px + Math.cos(a) * 3;
              const cz = pz + Math.sin(a) * 3;
              const jump = Math.sin(cycle * Math.PI);
              v.obj.position.set(cx, jump * 2.2 - 0.6, cz);
              v.obj.rotation.y = -(a + Math.PI / 2);
              d.rotation.z = Math.cos(cycle * Math.PI) * 0.9;
            },
          });
          break;
        }
        case 'remolino': {
          const R = toScene(o.geometry.proximityRadius ?? 80) * 1.1;
          const m = whirlpool(R);
          m.position.set(x, 0.08, z);
          this.addView({
            id,
            obj: m,
            kind: 'remolino',
            y: 0,
            phase,
            labelY: 2,
            update: (v, t) => {
              ((v.obj as Mesh).material as ShaderMaterial).uniforms.uTime!.value = t;
            },
          });
          break;
        }
        case 'circuito': {
          const gate = gateList.get(id);
          if (!gate) break;
          const g = new Group();
          const k = new Kit();
          const half = Math.max(2.6, r * 0.9);
          for (const s of [-1, 1]) {
            for (let i = 0; i < 4; i++) {
              k.add(new CylinderGeometry(0.22, 0.24, 0.9, 8), i % 2 ? C.white : C.orange, {
                p: [0, 0.45 + i * 0.9, s * half],
              });
            }
            k.add(new CylinderGeometry(0.5, 0.6, 0.4, 8), C.purple, { p: [0, 0, s * half] });
          }
          g.add(new Mesh(k.build(), lit));
          const bannerMat = new MeshBasicMaterial({ color: '#fff4e2' });
          const text =
            gate.order === 0 ? 'SALIDA · EL FREU' : gate.finish ? 'META' : `CP ${gate.order}`;
          const banner = new Mesh(new BoxGeometry(0.2, 0.9, half * 2 + 0.4), bannerMat);
          banner.position.y = 3.7;
          g.add(banner);
          const tex = textTexture([text], { w: 512, h: 96, bg: '#3b2a8f', fg: '#fff4e2' });
          for (const s of [-1, 1]) {
            const face = new Mesh(
              new BoxGeometry(0.02, 0.7, half * 2),
              new MeshBasicMaterial({ map: tex }),
            );
            face.position.set(s * 0.12, 3.7, 0);
            face.rotation.y = s > 0 ? 0 : Math.PI;
            g.add(face);
          }
          const mats = this.gates.get(gate.order) ?? [];
          mats.push(bannerMat);
          this.gates.set(gate.order, mats);
          g.position.set(x, 0, z);
          g.rotation.y = -gate.dir;
          this.addView({ id, obj: g, kind: 'circuito', y: 0, phase, labelY: 5 });
          break;
        }
        case 'carril':
          buoy(
            statics,
            x,
            z,
            id.endsWith('d') ? C.red : C.white,
            id.endsWith('d') ? C.white : C.red,
            0.8,
          );
          break;
        case 'decorado': {
          if (id === 'puerto-anillo') {
            const k = new Kit();
            k.add(new TorusGeometry(3.2, 0.22, 6, 28), C.orange, { r: [Math.PI / 2, 0, 0] });
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2;
              k.add(new SphereGeometry(0.3, 8, 6), i % 2 ? C.white : C.orange, {
                p: [Math.cos(a) * 3.2, 0.1, Math.sin(a) * 3.2],
              });
            }
            const g = new Group();
            g.add(new Mesh(k.build(), lit));
            g.position.set(x, 0.05, z);
            this.addView({
              id,
              obj: g,
              kind: 'decorado',
              y: 0.05,
              phase,
              labelY: 2,
              update: bob(0.04),
            });
          } else if (id.includes('posidonia')) {
            for (let i = 0; i < 14; i++) {
              const a = rnd() * Math.PI * 2;
              const d = 1 + rnd() * 3;
              statics.add(new ConeGeometry(0.08, 0.7, 3), C.leafDark, {
                p: [x + Math.cos(a) * d, 0.15, z + Math.sin(a) * d],
                r: [(rnd() - 0.5) * 0.6, 0, (rnd() - 0.5) * 0.6],
              });
            }
          } else if (id.includes('semaforo')) {
            statics.add(new CylinderGeometry(0.1, 0.12, 4.2, 6), C.iron, { p: [x, 2.1, z] });
            statics.add(new BoxGeometry(0.7, 2, 0.5), C.speaker, { p: [x, 4.4, z] });
            for (let i = 0; i < 3; i++) {
              const mat = new MeshBasicMaterial({ color: '#333' });
              const lamp = new Mesh(new SphereGeometry(0.24, 10, 8), mat);
              lamp.position.set(x, 5.05 - i * 0.62, z + 0.26);
              this.scene.add(lamp);
              this.semaphore.push(mat);
            }
            this.setSemaphore('off');
          }
          break;
        }
        case 'obstaculo': {
          const name = o.identity.name.toLowerCase();
          if (id.includes('baliza')) {
            const color = id.includes('verde') ? C.green : C.red;
            statics.add(new CylinderGeometry(0.35, 0.5, 2.4, 8), color, { p: [x, 1.0, z] });
            statics.add(new CylinderGeometry(0.4, 0.4, 0.2, 8), C.white, { p: [x, 2.3, z] });
            statics.add(new SphereGeometry(0.22, 8, 6), color, { p: [x, 2.6, z] });
            staticGlows.add([x, 2.65, z], id.includes('verde') ? '#5bff9a' : '#ff5a4a', 2.2);
          } else if (id.includes('escollera')) {
            for (let i = 0; i < 6; i++) {
              rock(
                statics,
                x + (rnd() - 0.5) * r * 2.4,
                0.2,
                z + (rnd() - 0.5) * r * 1.2,
                r * (0.55 + rnd() * 0.5),
                rnd,
              );
            }
            shores.push({ x, z, r: r * 1.1, w: 2.5 });
          } else if (name.includes('medusa')) {
            const g = createJelly();
            g.position.set(x, 0, z);
            this.addView({
              id,
              obj: g,
              kind: 'medusa',
              y: 0,
              phase,
              labelY: 2,
              update: (v, t, _dt, present, px, pz) => {
                v.obj.visible = present;
                v.obj.position.set(px, Math.sin(t * 2 + v.phase) * 0.2, pz);
                v.obj.scale.set(1, 0.9 + Math.sin(t * 3) * 0.1, 1);
              },
            });
            staticGlows.add([x, 0.4, z], '#d99bff', 2);
          } else if (name.includes('cartel')) {
            statics.add(new CylinderGeometry(0.08, 0.1, 2.4, 5), C.woodDark, { p: [x, 1.0, z] });
            const tex = textTexture(['ATAJO →'], { w: 256, h: 96, bg: '#ffd23f', fg: '#231c1a' });
            const sign = new Mesh(new BoxGeometry(2.2, 0.8, 0.1), [
              new MeshLambertMaterial({ color: '#e0b92f' }),
              new MeshLambertMaterial({ color: '#e0b92f' }),
              new MeshLambertMaterial({ color: '#e0b92f' }),
              new MeshLambertMaterial({ color: '#e0b92f' }),
              new MeshLambertMaterial({ map: tex }),
              new MeshLambertMaterial({ map: tex }),
            ]);
            sign.position.set(x, 2.3, z);
            this.scene.add(sign);
          } else {
            const big = r > 1.2;
            if (big) {
              crag(statics, x, z, r, rnd);
              shores.push({ x, z, r: r * 0.9, w: 3.5 });
            } else {
              rock(statics, x, 0.1, z, r * 1.1, rnd);
              if (r > 0.5) shores.push({ x, z, r: r * 0.7, w: 1.6 });
            }
          }
          break;
        }
        default:
          break;
      }
    }
    // Restos del puerto (cajas en el muelle) para vestir la salida.
    const sp = this.world.spawn;
    if (sp) crate(statics, toScene(sp.x) + 9, 0.7, toScene(sp.y) + 7, 0.9, 0.3);

    if (!statics.empty) this.scene.add(new Mesh(statics.build(), lit));
    return shores;
  }

  /** Arcos del circuito: orden y rumbo de paso (del arco anterior al siguiente). */
  private circuitGates(): Map<string, { order: number; dir: number; finish: boolean }> {
    const list: { id: string; order: number; x: number; y: number }[] = [];
    for (const o of this.world.objects) {
      if (o.identity.category !== 'circuito') continue;
      for (const b of o.behaviors) {
        if (b.type === 'checkpoint')
          list.push({ id: o.identity.id, order: b.params.order, x: o.position.x, y: o.position.y });
      }
    }
    const max = Math.max(0, ...list.map((g) => g.order));
    const avg = (order: number) => {
      const g = list.filter((x) => x.order === order);
      if (g.length === 0) return null;
      return {
        x: g.reduce((s, x) => s + x.x, 0) / g.length,
        y: g.reduce((s, x) => s + x.y, 0) / g.length,
      };
    };
    const out = new Map<string, { order: number; dir: number; finish: boolean }>();
    for (const g of list) {
      const prev = avg(g.order - 1) ?? g;
      const next = avg(g.order + 1) ?? g;
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      out.set(g.id, { order: g.order, dir: Math.atan2(dy, dx), finish: g.order === max });
    }
    return out;
  }

  private groundAt(x: number, z: number): number {
    for (const i of this.islands) {
      const dx = x - i.x;
      const dz = z - i.z;
      if (dx * dx + dz * dz < i.R * i.R * 1.1) return Math.max(0, i.build.heightAt(dx, dz));
    }
    return 0;
  }

  // --- Control ----------------------------------------------------------------

  private bindInput(): void {
    const c = this.opts.canvas;
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onUp);
    c.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  private unbindInput(): void {
    const c = this.opts.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onUp);
    c.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  private readonly onBlur = () => {
    this.keys.clear();
    this.pointers.clear();
    this.endStick();
    this.mode = 'none';
  };

  private readonly onDown = (e: PointerEvent) => {
    if (!this.inputEnabled) return;
    this.opts.canvas.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      sx: e.clientX,
      sy: e.clientY,
      t: performance.now(),
    });
    if (this.pointers.size === 1) {
      this.mode = 'pending';
    } else if (this.pointers.size === 2) {
      this.endStick();
      this.mode = 'pinch';
      this.pinch = { d: this.pinchDistance(), zoom: this.zoomGoal };
    }
  };

  private readonly onMove = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const px = p.x;
    const py = p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.mode === 'pinch' && this.pointers.size >= 2) {
      const d = this.pinchDistance();
      if (this.pinch.d > 0 && d > 0) {
        const ratio = Math.log(this.pinch.d / d) / Math.log(this.dFar / 16);
        this.zoomGoal = clamp01(this.pinch.zoom + ratio);
        if (this.zoomGoal < MAP_ZOOM) this.lastBoatZoom = this.zoomGoal;
      }
      return;
    }
    if (this.mode === 'pending' && Math.hypot(p.x - p.sx, p.y - p.sy) > 9) {
      if (this.zoom >= MAP_ZOOM) {
        this.mode = 'pan';
      } else {
        this.mode = 'stick';
        this.stick = { ox: p.sx, oy: p.sy, dx: 0, dy: 0 };
        this.course = null;
        this.marker.show(false);
        this.stickEl.classList.add('is-on');
      }
    }
    if (this.mode === 'stick') {
      this.stick.dx = p.x - this.stick.ox;
      this.stick.dy = p.y - this.stick.oy;
      const len = Math.hypot(this.stick.dx, this.stick.dy);
      const max = 64;
      const k = len > max ? max / len : 1;
      const r = this.opts.overlay.getBoundingClientRect();
      this.stickEl.style.transform = `translate(${this.stick.ox - r.left}px, ${this.stick.oy - r.top}px)`;
      this.knobEl.style.transform = `translate(${this.stick.dx * k}px, ${this.stick.dy * k}px)`;
    } else if (this.mode === 'pan') {
      const w = this.worldPerPixel();
      this.pan.x -= (p.x - px) * w;
      this.pan.y -= (p.y - py) * w;
      this.clampPan();
    }
  };

  private readonly onUp = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (!p) return;
    if (this.mode === 'pending' && performance.now() - p.t < 400) this.tap(p.x, p.y);
    if (this.pointers.size === 0) {
      this.endStick();
      this.mode = 'none';
    } else if (this.mode === 'pinch' && this.pointers.size === 1) {
      // Queda un dedo: no vuelve a ser joystick hasta soltar.
      this.mode = 'none';
    }
  };

  private readonly onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    this.zoomBy(d * 0.0011);
  };

  private readonly onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (!this.inputEnabled) return;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
      e.preventDefault();
      this.keys.add(k);
      this.course = null;
      this.marker.show(false);
    } else if (k === '+' || k === '=') this.zoomBy(-0.12);
    else if (k === '-' || k === '_') this.zoomBy(0.12);
    else if (k === 'm') this.toggleMap();
    else if (k === 't' || k === 'shift') this.turbo();
    else if (k === ' ' || k === 'enter') {
      if (this.runtime.dialogue()) {
        e.preventDefault();
        this.runtime.advanceDialogue();
      }
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private endStick(): void {
    this.stick.dx = 0;
    this.stick.dy = 0;
    this.stickEl.classList.remove('is-on');
  }

  private pinchDistance(): number {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private tap(cx: number, cy: number): void {
    // Un toque con diálogo abierto lo avanza.
    if (this.runtime.dialogue()) {
      this.runtime.advanceDialogue();
      return;
    }
    const r = this.opts.canvas.getBoundingClientRect();
    const ndc = new Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.waterPlane, tmpV);
    if (!hit) return;
    // ¿Cerca de un lugar con rótulo? Rumbo a él.
    let best: { id: string; d: number } | null = null;
    for (const p of this.pins) {
      const d = Math.hypot(p.x - hit.x, p.z - hit.z);
      const v = this.views.get(p.spec.id);
      const reach =
        v && (v.kind === 'isla' || v.kind === 'naufrago') ? this.islandR(p.spec.id) + 2 : 3;
      if (d < reach && (!best || d < best.d)) best = { id: p.spec.id, d };
    }
    if (best) {
      this.opts.onPin?.(best.id);
      return;
    }
    this.setCourse({ x: hit.x * 16, y: hit.z * 16 });
  }

  private islandR(id: string): number {
    const v = this.views.get(id);
    if (!v) return 0;
    return this.islands.find((i) => i.x === v.obj.position.x && i.z === v.obj.position.z)?.R ?? 0;
  }

  private worldPerPixel(): number {
    const h = this.opts.canvas.clientHeight || 1;
    const d = this.camera.position.distanceTo(this.look);
    return (2 * d * Math.tan((this.camera.fov * Math.PI) / 360)) / h;
  }

  private clampPan(): void {
    const w = (this.b.right - this.b.left) * 0.6;
    const h = (this.b.bottom - this.b.top) * 0.6;
    this.pan.x = Math.max(-w, Math.min(w, this.pan.x));
    this.pan.y = Math.max(-h, Math.min(h, this.pan.y));
  }

  private readInput(): ShipInput {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('arrowleft') || this.keys.has('a')) dx -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) dx += 1;
    if (this.keys.has('arrowup') || this.keys.has('w')) dy -= 1;
    if (this.keys.has('arrowdown') || this.keys.has('s')) dy += 1;
    if (dx || dy) return { dirX: dx, dirY: dy, throttle: 1, drift: false };
    if (this.mode === 'stick') {
      const len = Math.hypot(this.stick.dx, this.stick.dy);
      if (len > 8) {
        return {
          dirX: this.stick.dx,
          dirY: this.stick.dy,
          throttle: Math.min(1, (len - 8) / 56),
          drift: false,
        };
      }
      return IDLE_INPUT;
    }
    if (this.course) return this.autopilot();
    return IDLE_INPUT;
  }

  /** Rumbo al destino, apartándose de lo sólido que hay delante. */
  private autopilot(): ShipInput {
    const c = this.course!;
    const s = this.ship;
    let dx = c.x - s.x;
    let dy = c.y - s.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 34) {
      this.course = null;
      this.marker.show(false);
      return IDLE_INPUT;
    }
    dx /= dist;
    dy /= dist;
    const look = Math.min(dist, 420);
    let sx = 0;
    let sy = 0;
    for (const o of this.runtime.solidObstacles()) {
      const ox = o.x - s.x;
      const oy = o.y - s.y;
      const proj = ox * dx + oy * dy;
      if (proj < -o.radius || proj > look + o.radius) continue;
      const lat = ox * -dy + oy * dx;
      const clear = o.radius + this.cfg.radius + 36;
      if (Math.abs(lat) >= clear) continue;
      const push =
        ((clear - Math.abs(lat)) / clear) * (1 - (Math.max(0, proj) / (look + clear)) * 0.6);
      const side = lat > 0 ? -1 : 1;
      sx += -dy * side * push * 1.8;
      sy += dx * side * push * 1.8;
    }
    const throttle = Math.max(0.35, Math.min(1, dist / 260));
    return { dirX: dx + sx, dirY: dy + sy, throttle, drift: false };
  }

  // --- Bucle ------------------------------------------------------------------

  private readonly resize = () => {
    const c = this.opts.canvas;
    const w = c.clientWidth || window.innerWidth;
    const h = c.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const t = Math.tan((this.camera.fov * Math.PI) / 360);
    const W = this.b.right - this.b.left;
    const H = this.b.bottom - this.b.top;
    this.dFar = Math.max((H * 0.62) / t, (W * 0.58) / (t * this.camera.aspect));
    const gm = this.glow.material as ShaderMaterial;
    gm.uniforms.uScale!.value = ((h * this.dpr) / (2 * t)) * 0.5;
  };

  private readonly frame = (now: number) => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.paused) return;
    this.time += dt;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < 6) {
      this.simulate(STEP);
      this.acc -= STEP;
      steps++;
    }
    if (steps === 6) this.acc = 0;
    for (const e of this.runtime.drainEvents()) this.opts.onWorldEvent(e);
    this.render(dt, this.acc / STEP);
    this.measure(dt, now);
  };

  private simulate(dt: number): void {
    const s = this.ship;
    this.prev.x = s.x;
    this.prev.y = s.y;
    this.prev.heading = s.heading;
    const input = this.readInput();
    let cfg = this.runtime.shipConfig(this.cfg);
    if (this.turboLeft > 0) {
      cfg = { ...cfg, maxSpeed: cfg.maxSpeed * 1.6, acceleration: cfg.acceleration * 2.4 };
      this.turboLeft -= dt;
    }
    if (this.turboCool > 0) this.turboCool -= dt;
    const before = shipSpeed(s);
    stepShip(s, input, cfg, dt);
    this.runtime.step(s, this.cfg, dt);
    const after = shipSpeed(s);
    if (before - after > 60) this.shake = Math.min(1, this.shake + (before - after) / 250);
    const dh = Math.atan2(
      Math.sin(s.heading - this.prev.heading),
      Math.cos(s.heading - this.prev.heading),
    );
    this.turnRate += (dh / dt - this.turnRate) * Math.min(1, dt * 6);
    if (!this.moved && after > 30) {
      this.moved = true;
      this.opts.onFirstMove?.();
    }
    this.opts.onStep?.(s, dt);
  }

  private applyMood(): void {
    const m = this.mood;
    this.hemi.color.copy(m.hemiSky);
    this.hemi.groundColor.copy(m.hemiGround);
    this.hemi.intensity = m.hemi;
    this.sun.color.copy(m.sun);
    this.sun.intensity = m.sunI;
    this.scene.background = m.fog;
    (this.scene.fog as Fog).color.copy(m.fog);
    const u = this.water.material.uniforms;
    (u.uDeep!.value as Color).copy(m.deep);
    (u.uShallow!.value as Color).copy(m.shallow);
    (u.uFoam!.value as Color).copy(m.foam);
    u.uSparkle!.value = 0.55 + (1 - m.glow) * 0.45;
    (this.glow.material as ShaderMaterial).uniforms.uGlow!.value = 0.25 + m.glow * 0.95;
  }

  private updateCamera(dt: number, snap = false): void {
    const k = snap ? 1 : 1 - Math.exp(-dt * 6);
    this.zoom += (this.zoomGoal - this.zoom) * k;
    if (this.zoom < 0.3) this.pan.multiplyScalar(1 - Math.min(1, dt * 3));
    const z = this.zoom;
    const dNear = 17;
    const dist = dNear * Math.pow(this.dFar / dNear, z);
    const elev = lerp(0.6, 1.28, smooth(0, 1, z));
    const sx = toScene(this.ship.x);
    const sz = toScene(this.ship.y);
    const lead = 0.28 * (1 - smooth(0, 0.4, z));
    const w = smooth(0.4, 0.95, z);
    // El barco va en el tercio de abajo: se ve más mar por delante (al norte).
    const ahead = dist * 0.2 * (1 - w);
    const bx = sx + toScene(this.ship.vx) * lead;
    const bz = sz + toScene(this.ship.vy) * lead - ahead;
    const cx = (this.b.left + this.b.right) / 2;
    const cz = (this.b.top + this.b.bottom) / 2;
    this.inset += (this.insetGoal - this.inset) * (snap ? 1 : 1 - Math.exp(-dt * 5));
    const h = this.opts.canvas.clientHeight || 1;
    const perPx = (2 * dist * Math.tan((this.camera.fov * Math.PI) / 360)) / h;
    const lift = this.inset * 0.5 * perPx * (1 - w);
    const fx = lerp(bx, cx, w) + this.pan.x;
    const fz = lerp(bz, cz, w) + this.pan.y + lift;
    if (snap) this.focus.set(fx, 0, fz);
    else this.focus.lerp(tmpV.set(fx, 0, fz), 1 - Math.exp(-dt * 8));
    this.look.copy(this.focus);
    let ox = 0;
    let oz = 0;
    if (this.shake > 0) {
      ox = (Math.random() - 0.5) * this.shake * 0.5;
      oz = (Math.random() - 0.5) * this.shake * 0.5;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.camera.position.set(
      this.focus.x + ox,
      Math.sin(elev) * dist,
      this.focus.z + Math.cos(elev) * dist + oz,
    );
    this.camera.lookAt(this.look);
    const fov = 40 + this.fovKick * 7;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.fovKick = Math.max(0, this.fovKick - dt * 0.5);
    const fog = this.scene.fog as Fog;
    fog.near = dist * 1.1;
    fog.far = dist * 3.4 + 80;
    this.camera.far = dist * 4 + 400;
    this.camera.updateProjectionMatrix();
    // Sol: sigue al foco para que la luz sea la misma en todo el mapa.
    const d = this.mood.sunDir;
    this.sun.position.set(this.focus.x + d[0] * 100, d[1] * 100, this.focus.z + d[2] * 100);
    this.sun.target.position.copy(this.focus);
  }

  private render(dt: number, alpha: number): void {
    const t = this.time;
    if (this.moodT < 1) {
      this.moodT = Math.min(1, this.moodT + dt / 1.6);
      mixMood(this.mood, this.moodFrom, this.moodTo, smooth(0, 1, this.moodT));
      this.applyMood();
    }
    const glow = this.mood.glow;
    this.water.material.uniforms.uTime!.value = t;
    (this.glow.material as ShaderMaterial).uniforms.uTime!.value = t;

    // Barco (interpolado entre pasos).
    const s = this.ship;
    const x = toScene(lerp(this.prev.x, s.x, alpha));
    const z = toScene(lerp(this.prev.y, s.y, alpha));
    const h =
      this.prev.heading +
      Math.atan2(Math.sin(s.heading - this.prev.heading), Math.cos(s.heading - this.prev.heading)) *
        alpha;
    const speed = shipSpeed(s);
    const v01 = Math.min(1.4, speed / this.cfg.maxSpeed);
    const bg = this.boat.group;
    bg.position.set(x, 0, z);
    bg.rotation.y = -h;
    const body = this.boat.body;
    body.position.y = Math.sin(t * 1.9) * 0.07 + Math.sin(t * 3.3) * 0.03 + v01 * 0.08;
    body.rotation.x =
      Math.max(-0.35, Math.min(0.35, -this.turnRate * 0.14)) + Math.sin(t * 1.5) * 0.03;
    body.rotation.z = v01 * 0.07 + Math.sin(t * 2.1) * 0.025;
    if (this.boat.sail) {
      this.boat.sail.rotation.y =
        Math.max(-0.5, Math.min(0.5, this.turnRate * 0.25)) + Math.sin(t * 0.9) * 0.05;
    }
    if (this.boat.captain) this.boat.captain.rotation.y = Math.sin(t * 1.3) * 0.25;
    if (this.crew) this.crew.position.y = Math.abs(Math.sin(t * 5)) * 0.08;
    const sternX = x + Math.cos(h) * this.sternX;
    const sternZ = z + Math.sin(h) * this.sternX;
    this.wake.update(dt, sternX, sternZ, h, Math.min(1, v01 * (this.turboLeft > 0 ? 1.4 : 1)), t);

    // Lugares.
    for (const v of this.views.values()) {
      if (!v.update) continue;
      const st = this.runtime.objectState(v.id);
      const px = st ? toScene(st.x) : v.obj.position.x;
      const pz = st ? toScene(st.y) : v.obj.position.z;
      const pzUp = st?.z ? toScene(st.z) : 0;
      const ground = v.kind === 'encuentro' ? Math.max(this.groundAt(px, pz), pzUp) : 0;
      v.update(v, t, dt, st ? st.present : true, px, pz, ground);
    }
    for (const a of this.animated) a(t, glow);
    this.confetti.update(dt);

    this.updateCamera(dt);
    this.clouds.update(dt, this.camera.position.y, this.b);

    if (this.course) {
      this.marker.update(
        { x, z },
        { x: toScene(this.course.x), z: toScene(this.course.y) },
        t,
        1 + this.zoom * 8,
      );
    }

    this.renderer.render(this.scene, this.camera);
    this.placeOverlay();
  }

  private project(
    x: number,
    y: number,
    z: number,
    out: { x: number; y: number; on: boolean },
  ): void {
    tmpV.set(x, y, z).project(this.camera);
    const w = this.opts.canvas.clientWidth;
    const h = this.opts.canvas.clientHeight;
    out.x = (tmpV.x * 0.5 + 0.5) * w;
    out.y = (-tmpV.y * 0.5 + 0.5) * h;
    out.on = tmpV.z < 1 && out.x > -60 && out.x < w + 60 && out.y > -60 && out.y < h + 60;
  }

  private readonly scr = { x: 0, y: 0, on: false };

  private placeOverlay(): void {
    const bx = this.boat.group.position.x;
    const bz = this.boat.group.position.z;
    const far = this.zoom > 0.28;
    for (const p of this.pins) {
      const near = Math.hypot(p.x - bx, p.z - bz) < 70;
      const want = far || near || !!p.spec.always;
      this.project(p.x, p.y, p.z, this.scr);
      const vis = want && this.scr.on;
      if (vis !== p.vis) {
        p.vis = vis;
        p.el.classList.toggle('is-on', vis);
      }
      if (vis) {
        p.el.style.transform = `translate3d(${this.scr.x.toFixed(1)}px, ${this.scr.y.toFixed(1)}px, 0)`;
        p.el.classList.toggle('is-map', far);
      }
    }
    for (const a of this.anchors) {
      let x = bx;
      let y = 2.4;
      let z = bz;
      if (a.target !== 'ship') {
        const v = this.views.get(a.target);
        if (!v) continue;
        x = v.obj.position.x;
        z = v.obj.position.z;
        y = v.labelY * 0.8;
      }
      this.project(x, y + a.dy, z, this.scr);
      // Que no se salga por los lados ni por arriba.
      const half = a.el.offsetWidth / 2;
      const W = this.opts.canvas.clientWidth;
      const sx = Math.max(half + 8, Math.min(W - half - 8, this.scr.x));
      const sy = Math.max(a.el.offsetHeight + 70, this.scr.y);
      a.el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
      a.el.style.visibility = this.scr.on ? 'visible' : 'hidden';
    }
  }

  private measure(dt: number, now: number): void {
    this.frames++;
    this.perfWindow.push(dt);
    if (now - this.statsAt < 250) return;
    const elapsed = (now - this.statsAt) / 1000;
    this.fps = this.statsAt ? this.frames / elapsed : 60;
    this.frames = 0;
    this.statsAt = now;
    // Resolución adaptativa: baja si el móvil no llega, sube con margen.
    if (this.perfWindow.length >= 90) {
      const avg = this.perfWindow.reduce((a, b) => a + b, 0) / this.perfWindow.length;
      this.perfWindow.length = 0;
      let next = this.dpr;
      if (avg > 1 / 40 && this.dpr > 1) next = Math.max(1, this.dpr - 0.25);
      else if (avg < 1 / 58 && this.dpr < this.maxDpr)
        next = Math.min(this.maxDpr, this.dpr + 0.25);
      if (next !== this.dpr) {
        this.dpr = next;
        this.renderer.setPixelRatio(next);
        this.resize();
      }
    }
    const c = this.course;
    this.opts.onStats?.({
      fps: Math.round(this.fps),
      knots: Math.round(shipSpeed(this.ship) / 10),
      zoom: this.zoom,
      mapMode: this.zoomGoal >= MAP_ZOOM,
      turbo: Math.max(0, this.turboLeft / TURBO_S),
      turboReady: 1 - Math.max(0, this.turboCool) / TURBO_COOLDOWN_S,
      course: c
        ? {
            placeId: c.placeId,
            meters: Math.round(Math.hypot(c.x - this.ship.x, c.y - this.ship.y) * METERS_PER_U),
          }
        : null,
      panned: this.pan.lengthSq() > 25,
    });
  }
}

/** Balanceo simple sobre el agua. */
function bob(amount: number) {
  return (v: View, t: number) => {
    v.obj.position.y = v.y + Math.sin(t * 1.7 + v.phase) * amount;
    v.obj.rotation.z = Math.sin(t * 1.3 + v.phase) * amount * 0.6;
  };
}
