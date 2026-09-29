import {
  Color,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector4,
} from 'three';
import type { SceneRect } from './coast';

/**
 * El agua del mar 3D: un plano con un shader propio, sin texturas ni
 * geometría de olas (en móvil, lo que cuenta es el píxel). Bajíos turquesa
 * alrededor de cada isla y de la costa, espuma que late en la orilla, bandas
 * de ola y destellos que se apagan de lejos para no hacer ruido. Niebla de
 * three.js para que el horizonte se funda.
 */

export const MAX_SHORES = 24;

const vertex = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uFoam;
  uniform vec4 uShores[${MAX_SHORES}];
  uniform int uShoreCount;
  uniform vec4 uBounds;
  uniform float uSparkle;
  varying vec3 vWorld;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec2 p = vWorld.xz;
    // d: distancia a la orilla más cercana; dn: la misma, en anchos de bajío
    // de esa orilla (una roca tiene un bajío corto, una isla uno ancho).
    float d = 1e4;
    float dn = 1e4;
    for (int i = 0; i < ${MAX_SHORES}; i++) {
      if (i >= uShoreCount) break;
      vec4 s = uShores[i];
      float di = length(p - s.xy) - s.z;
      d = min(d, di);
      dn = min(dn, di / s.w);
    }
    float dc = min(min(p.x - uBounds.x, uBounds.y - p.x), uBounds.w - p.y);
    d = min(d, dc);
    dn = min(dn, dc / 10.0);

    float n = noise(p * 0.35 + uTime * 0.05);
    float dd = d + (n - 0.5) * 1.4;
    float shallow = 1.0 - smoothstep(0.0, 1.0, dn + (n - 0.5) * 0.14);
    vec3 col = mix(uDeep, uShallow, shallow * 0.9);

    // Manchas grandes: el mar no es un color plano.
    float big = noise(p * 0.018 + vec2(uTime * 0.008, 0.0));
    col *= 0.9 + big * 0.2;

    // Olitas dibujadas: trazos cortos y casi horizontales que se mecen,
    // más visibles cerca (la derivada dice cuánto mide un píxel).
    float fw = fwidth(p.x);
    float detail = 1.0 - smoothstep(0.12, 0.7, fw);
    float w1 = sin(dot(p, vec2(0.22, 0.975)) * 1.5 + uTime * 1.1 + noise(p * 0.18) * 5.0);
    float w2 = sin(dot(p, vec2(-0.3, 0.95)) * 1.1 - uTime * 0.8 + noise(p * 0.13 + 7.0) * 5.0);
    float dash1 = smoothstep(0.6, 0.74, noise(p * vec2(1.1, 1.6) + vec2(uTime * 0.06, 0.0)));
    float dash2 = smoothstep(0.62, 0.76, noise(p * vec2(1.0, 1.5) + vec2(3.0, uTime * 0.05)));
    float crest = max(smoothstep(0.93, 0.99, w1) * dash1, smoothstep(0.94, 0.995, w2) * dash2 * 0.7);
    col = mix(col, uFoam, crest * detail * 0.45 * uSparkle);

    // Espuma de la orilla: una línea que respira y salpicones.
    float breathe = sin(uTime * 1.3 + n * 6.0) * 0.4;
    float foamLine = 1.0 - smoothstep(0.0, 0.75 + fw, abs(dd - 0.6 - breathe));
    float spray = (1.0 - smoothstep(0.0, 2.8, dd)) * step(0.58, noise(p * 1.7 + uTime * 0.3));
    col = mix(col, uFoam, clamp(foamLine * 0.85 + spray * 0.45, 0.0, 1.0) * (dd > -0.5 ? 1.0 : 0.0));

    // Destellos: estrellitas que parpadean sobre el agua.
    vec2 q = p * 0.8;
    vec2 cell = floor(q);
    vec2 f = fract(q);
    float h = hash(cell);
    vec2 c = vec2(hash(cell + 3.1), hash(cell + 7.7)) * 0.7 + 0.15;
    float tw = sin(uTime * 2.2 + h * 40.0) * 0.5 + 0.5;
    vec2 e = (f - c) * vec2(1.0, 2.4);
    float sp = smoothstep(0.1, 0.0, length(e)) * step(0.7, h) * tw;
    col += uFoam * sp * detail * uSparkle;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export interface Water {
  mesh: Mesh;
  material: ShaderMaterial;
  /** Orillas: centro, radio y ancho del bajío. */
  setShores(shores: readonly { x: number; z: number; r: number; w?: number }[]): void;
}

export function createWater(b: SceneRect): Water {
  const shores = Array.from({ length: MAX_SHORES }, () => new Vector4(0, 0, 0, 0));
  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDeep: { value: new Color('#1a7aa6') },
        uShallow: { value: new Color('#3aa3c4') },
        uFoam: { value: new Color('#f4efe6') },
        uShores: { value: shores },
        uShoreCount: { value: 0 },
        uBounds: { value: new Vector4(b.left, b.right, b.top, b.bottom) },
        uSparkle: { value: 0.9 },
      },
    ]),
  });
  // UniformsUtils.merge clona: se vuelve a poner el array para editarlo en sitio.
  material.uniforms.uShores!.value = shores;
  const w = b.right - b.left + 900;
  const h = b.bottom - b.top + 900;
  const mesh = new Mesh(new PlaneGeometry(w, h, 1, 1), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((b.left + b.right) / 2, 0, (b.top + b.bottom) / 2);
  mesh.frustumCulled = false;
  return {
    mesh,
    material,
    setShores(list) {
      const n = Math.min(list.length, MAX_SHORES);
      for (let i = 0; i < n; i++) {
        const s = list[i]!;
        shores[i]!.set(s.x, s.z, s.r, s.w ?? 10);
      }
      material.uniforms.uShoreCount!.value = n;
    },
  };
}
