import {
  BackSide,
  Color,
  LessEqualDepth,
  type Material,
  Matrix3,
  Mesh,
  type Object3D,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';

/**
 * El planeta de agua de `/mar` en la GPU (D-22, REQ-MUN-038). Dos cosas en
 * el vertex shader de todo lo que se pinta:
 *
 * - la curva: la superficie cae `bend · r²` con la distancia horizontal a la
 *   cámara, así el horizonte se dobla y se ve el cielo por encima;
 * - la vuelta: lo que no tiene sitio propio en la escena (las piezas
 *   fusionadas y los resplandores) se dibuja en la copia más cercana al foco
 *   de la cámara. Lo demás (lugares, barco, estela) lo coloca `Mar3D` en su
 *   copia más cercana antes de pintar.
 *
 * Y el cielo: una cúpula con el degradado del momento del día, estrellas
 * (muchas de noche, apenas de día), nubes bajas y alguna estrella fugaz,
 * que gira despacio (el planeta gira sin mover el barco). Todo `muestra`.
 */

/** Uniformes compartidos por todos los materiales curvados (se editan en sitio). */
export const planetUniforms = {
  uPlanetFocus: { value: new Vector2() },
  uPlanetPeriod: { value: new Vector2(1e6, 1e6) },
  uBendCenter: { value: new Vector2() },
  uBend: { value: 0 },
};

export const PLANET_PARS = /* glsl */ `
  uniform vec2 uPlanetFocus;
  uniform vec2 uPlanetPeriod;
  uniform vec2 uBendCenter;
  uniform float uBend;
  vec3 planetCurve(vec3 w) {
    #ifdef PLANET_WRAP
      vec2 d = w.xz - uPlanetFocus;
      d -= uPlanetPeriod * floor(d / uPlanetPeriod + 0.5);
      w.xz = uPlanetFocus + d;
    #endif
    vec2 r = w.xz - uBendCenter;
    w.y -= uBend * dot(r, r);
    return w;
  }
`;

const PROJECT = /* glsl */ `
  vec4 mvPosition = vec4( transformed, 1.0 );
  #ifdef USE_BATCHING
    mvPosition = batchingMatrix * mvPosition;
  #endif
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
  #endif
  vec4 planetWorld = modelMatrix * mvPosition;
  planetWorld.xyz = planetCurve( planetWorld.xyz );
  mvPosition = viewMatrix * planetWorld;
  gl_Position = projectionMatrix * mvPosition;
`;

const CUSTOM_POSITION =
  'gl_Position = projectionMatrix * viewMatrix * vec4(planetCurve((modelMatrix * vec4(position, 1.0)).xyz), 1.0);';

type Curved = Material & { userData: { planet?: 'bend' | 'wrap' | 'skip' } };

function addUniforms(u: Record<string, { value: unknown }>): void {
  Object.assign(u, planetUniforms);
}

/**
 * Curva un material (una vez). `wrap`: además, cada vértice va a la copia
 * más cercana al foco (piezas fusionadas y resplandores, sin sitio propio).
 */
export function curveMaterial(material: Material, wrap = false): void {
  const m = material as Curved;
  if (m.userData.planet) return;
  m.userData.planet = wrap ? 'wrap' : 'bend';
  if (wrap) m.defines = { ...(m.defines ?? {}), PLANET_WRAP: '' };
  if (m instanceof ShaderMaterial) {
    addUniforms(m.uniforms);
    const vs = m.vertexShader;
    const main = vs.indexOf('void main');
    const last = vs.lastIndexOf('gl_Position');
    if (main < 0 || last < 0) return;
    const end = vs.indexOf(';', last);
    m.vertexShader =
      vs.slice(0, main) + PLANET_PARS + vs.slice(main, last) + CUSTOM_POSITION + vs.slice(end + 1);
    m.needsUpdate = true;
    return;
  }
  m.onBeforeCompile = (shader) => {
    addUniforms(shader.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${PLANET_PARS}`)
      .replace('#include <project_vertex>', PROJECT);
  };
  m.customProgramCacheKey = () => (wrap ? 'planet-wrap' : 'planet');
  m.needsUpdate = true;
}

/** Curva todo lo que cuelga de `root` (y quita el recorte por la caja: la curva lo movería). */
export function curveTree(root: Object3D, wrap = false): void {
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.material) return;
    o.frustumCulled = false;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if ((m as Curved).userData.planet === 'skip') continue;
      curveMaterial(m, wrap);
    }
  });
}

// --- El cielo ------------------------------------------------------------------

/** Lo que el cielo toma del momento del día. */
export interface SkyMood {
  horizon: Color;
  sky: Color;
  zenith: Color;
  /** 0..1: cuántas estrellas se ven. */
  stars: number;
  /** Dirección hacia el sol, para el resplandor del horizonte. */
  sunDir: readonly [number, number, number];
  sun: Color;
  /** 0 de día, 1 de noche. */
  glow: number;
}

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    // En el plano lejano: sólo se pinta donde no hay nada delante (se dibuja lo último).
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uSky;
  uniform vec3 uZenith;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  uniform float uStars;
  uniform float uGlow;
  uniform float uTime;
  uniform float uDip;
  uniform mat3 uSpin;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  // Estrellas en celdas sobre la esfera: una por celda como mucho, de 1 a 2,5 píxeles,
  // con brillo y parpadeo propios.
  float starLayer(vec3 d, float cells, float keep, float px) {
    vec2 uv = vec2(atan(d.z, d.x) * cells / 3.14159, asin(clamp(d.y, -1.0, 1.0)) * cells / 3.14159);
    vec2 c = floor(uv);
    vec2 f = fract(uv);
    float h = hash(c);
    if (h < 1.0 - keep) return 0.0;
    vec2 at = vec2(hash(c + 5.3), hash(c + 9.1)) * 0.7 + 0.15;
    // Tamaño en píxeles de pantalla (la derivada dice cuánto mide uno en celdas).
    float w = max(length(fwidth(uv)), 1e-5);
    float r = w * px * (0.6 + 0.8 * fract(h * 31.0));
    float s = 1.0 - smoothstep(r * 0.4, r, length((f - at) * vec2(cos(d.y), 1.0)));
    float tw = 0.6 + 0.4 * sin(uTime * (1.5 + h * 3.0) + h * 40.0);
    return s * tw * (0.35 + 0.65 * fract(h * 17.0));
  }

  void main() {
    vec3 d = normalize(vDir);
    // El horizonte del planeta está algo por debajo de la horizontal (uDip).
    float h = d.y + uDip;
    float t1 = smoothstep(0.0, 0.18, h);
    float t2 = smoothstep(0.1, 0.55, h);
    vec3 col = mix(mix(uHorizon, uSky, t1), uZenith, t2);

    // Resplandor hacia el sol, pegado al horizonte (atardecer).
    vec3 sd = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
    float toward = max(dot(normalize(vec3(d.x, 0.0, d.z)), sd), 0.0);
    col += uSun * pow(toward, 3.0) * exp(-max(h, 0.0) * 7.0) * 0.28;

    // El cielo gira despacio con el planeta.
    vec3 s = uSpin * d;
    float above = smoothstep(0.0, 0.08, h);

    // Nubes bajas: bandas suaves que se desvanecen hacia arriba.
    vec2 cp = vec2(atan(s.z, s.x) * 3.0, h * 9.0);
    float cn = noise(cp * vec2(1.0, 1.6)) * 0.65 + noise(cp * 2.3 + 4.0) * 0.35;
    float band = smoothstep(0.04, 0.16, h) * (1.0 - smoothstep(0.22, 0.5, h));
    float cloud = smoothstep(0.5, 0.78, cn) * band;
    vec3 cloudCol = mix(vec3(1.0, 0.98, 0.95), uSky * 0.7 + uHorizon * 0.4, uGlow * 0.7);
    col = mix(col, cloudCol, cloud * (0.75 - uGlow * 0.45));

    // Estrellas: dos capas (muchas pequeñas, pocas grandes); las nubes las tapan.
    float st = starLayer(s, 110.0, 0.42, 1.5) + starLayer(s, 36.0, 0.3, 2.6) * 1.4;
    col += vec3(1.0, 0.97, 0.9) * st * uStars * above * (1.0 - cloud);

    // Estrella fugaz: una cada pocos segundos, de noche y al atardecer.
    float slot = floor(uTime / 5.0);
    float k = fract(uTime / 5.0) * 5.0;
    if (uStars > 0.2 && k < 0.9 && hash(vec2(slot, 3.7)) > 0.35) {
      float a0 = hash(vec2(slot, 1.0)) * 6.2831;
      vec3 start = normalize(vec3(cos(a0), 0.25 + hash(vec2(slot, 2.0)) * 0.35, sin(a0)));
      vec3 dir = normalize(cross(start, vec3(0.0, 1.0, 0.0)) * (hash(vec2(slot, 4.0)) > 0.5 ? 1.0 : -1.0) - vec3(0.0, 0.35, 0.0));
      float len = 0.18;
      vec3 head = normalize(start + dir * len * (k / 0.9));
      vec3 rel = d - head;
      float along = dot(rel, dir);
      float across = length(rel - dir * along);
      float tail = smoothstep(-len * 0.6, 0.0, along) * (1.0 - smoothstep(0.0, 0.004, along));
      float line = smoothstep(0.0025, 0.0, across) * tail * sin(k / 0.9 * 3.14159);
      col += vec3(1.0, 0.95, 0.85) * line * uStars * above * 1.6;
    }

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const tmpAxis = new Vector3();

export class Sky {
  readonly mesh: Mesh;
  readonly material: ShaderMaterial;
  /** Ángulo que ha girado el planeta (rad); lo lee el minimapa redondo. */
  spin = 0;
  private readonly m3 = new Matrix3();

  constructor() {
    this.material = new ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: BackSide,
      depthWrite: false,
      depthTest: true,
      depthFunc: LessEqualDepth,
      fog: false,
      uniforms: {
        uHorizon: { value: new Color() },
        uSky: { value: new Color() },
        uZenith: { value: new Color() },
        uSun: { value: new Color() },
        uSunDir: { value: new Vector3(0, 1, 0) },
        uStars: { value: 0 },
        uGlow: { value: 0 },
        uTime: { value: 0 },
        uDip: { value: 0 },
        uSpin: { value: new Matrix3() },
      },
    });
    this.material.userData.planet = 'skip';
    this.mesh = new Mesh(new SphereGeometry(10, 32, 16), this.material);
    this.mesh.frustumCulled = false;
    // Después de todo lo opaco: los píxeles tapados por el mar no pagan el cielo.
    this.mesh.renderOrder = 1000;
  }

  setMood(m: SkyMood): void {
    const u = this.material.uniforms;
    (u.uHorizon!.value as Color).copy(m.horizon);
    (u.uSky!.value as Color).copy(m.sky);
    (u.uZenith!.value as Color).copy(m.zenith);
    (u.uSun!.value as Color).copy(m.sun);
    (u.uSunDir!.value as Vector3).set(m.sunDir[0], m.sunDir[1], m.sunDir[2]);
    u.uStars!.value = m.stars;
    u.uGlow!.value = m.glow;
  }

  /**
   * Sigue a la cámara; `spin` avanza despacio (el planeta gira por su
   * cuenta); `dip` es cuánto baja el horizonte (seno del ángulo).
   */
  update(camera: Object3D, time: number, dt: number, dip: number): void {
    this.mesh.position.copy(camera.position);
    this.spin += dt * SPIN_RATE;
    const u = this.material.uniforms;
    u.uTime!.value = time;
    u.uDip!.value = dip;
    // Eje algo inclinado: las estrellas suben por un lado y bajan por el otro.
    tmpAxis.set(0.35, 1, 0.2).normalize();
    const c = Math.cos(this.spin);
    const s = Math.sin(this.spin);
    const { x, y, z } = tmpAxis;
    const t = 1 - c;
    this.m3.set(
      t * x * x + c,
      t * x * y - s * z,
      t * x * z + s * y,
      t * x * y + s * z,
      t * y * y + c,
      t * y * z - s * x,
      t * x * z - s * y,
      t * y * z + s * x,
      t * z * z + c,
    );
    (u.uSpin!.value as Matrix3).copy(this.m3);
  }
}

/** rad/s que gira el cielo: una vuelta en ~17 min. muestra */
export const SPIN_RATE = 0.006;
