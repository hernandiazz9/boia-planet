# monorepo-y-motor-base — 2026-09-28

## Resumen
- Existe el monorepo pnpm (`apps/web`, `packages/world`, `packages/engine`) con TS estricto, ESLint, Prettier y vitest. `/juego` monta el motor a pantalla completa con HUD. Commit `b9dd060`.
- Suites: `pnpm test` → **42 pasados, 0 fallados**, 8 archivos, exit 0 (0,3 s). `pnpm typecheck` y `pnpm lint` exit 0.
- Corrida real en Chrome sin cabeza (teclado, ratón y toques CDP): 0→220 u/s en 0,93 s (esperado 0,917); drift gira N→NE; costa izquierda deja el barco en x = 18 (= borde + radio) y desliza a ≤ 220 u/s; roca: distancia mínima 64,0 u (límite 64) con rebote; pasa el borde superior hasta 166 u y la corriente lo retiene; pestaña oculta con tecla pulsada → 0 u/s en 2 s. Consola sin errores ni avisos.
- FPS en el Mac: **120** (navegador integrado, pantalla de 120 Hz), parado y a toda velocidad con drift. Sin cabeza, 60 (tope del modo).
- Peso de `/juego` en producción: **287 kB gzip de JS + 114 kB de PNG** del barco ≈ 0,40 MB de los 5 MB de presupuesto.
- Ya lee los sprites reales del 01 (`art/barco/manifest.json`, forma `directions.<D>.anchors`); sin manifiesto o con `?barco=provisional`, barco dibujado por código.
- Desviación principal: la cámara es de **30°**, no 26,57°. Con 26,57° la losa da 2,236:1, no 2:1; 26,57° es el ángulo de las aristas en pantalla. El 01 llegó a lo mismo (su manifiesto dice `camera_elevation_deg: 30`).
- Abierto: prueba en iPhone y Android (Hernán), y las cuatro preguntas del final (teclado, escala del barco, velocidad del HUD, arte en producción).

## Para Hernán
Probá `/juego` en iPhone y Android desde `http://192.168.1.149:3000/juego` con `pnpm dev`; la lista está abajo, en «Para que pruebe Hernán».

## Encargo
Monorepo base, esquema del mundo v0, motor PixiJS con barco navegable (paso fijo, drift, estela, agua, colisiones, joystick táctil) y `/juego` para el móvil.

## Hecho
Commit `b9dd060` (60 archivos). Todos los valores de ajuste llevan la etiqueta `muestra` en el código.

- **Raíz**: `package.json` con `dev`, `build`, `start`, `test`, `lint`, `typecheck`, `format`, `format:check`; `pnpm-workspace.yaml`; `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`); `eslint.config.mjs` (flat, typescript-eslint, plugin de Next, react-hooks, prettier); `.prettierrc.json`; `vitest.config.ts`. Versiones fijadas: next 15.5.26, react 19.3.0, pixi.js 8.21.0, zod 4.6.5, typescript 5.9.3, eslint 9.39.5, typescript-eslint 8.70.1, vitest 5.0.2, prettier 3.9.9. TS 7 no: typescript-eslint admite `<6.1` y Next 15 no lo soporta.
- **`packages/world`**: `WorldConfig` { id, version, bounds, spawn?, sectors[], objects[] } y `WorldObject` con las nueve partes de §48.2 (obligatorias sólo identidad, apariencia, posición y geometría; comportamientos como `{ type, params }` abiertos; rechaza IDs repetidos). Proyección `worldToScreen` / `screenToWorld` / `gridToWorld` / `worldToGrid` / `screenVectorToWorld`. Contrato del manifiesto `parseShipManifest` en tres formas: la real del 01 (`directions.<D>.anchors`), `anchors` en la raíz, o anclajes por imagen; `bow` opcional.
- **`packages/engine`**: `createGame(canvas, { world, manifest?, ship?, onStats? })`. `FixedStepLoop` a 60 Hz con tope de 0,25 s por imagen e interpolación. `stepShip`/`collideShip` puros: aceleración, velocidad máxima, giro dependiente de la velocidad, freno, drift (×1,8 de giro, agarre lateral 6 → 1,1/s) y tope absoluto de velocidad. `Camera` con anticipación de 0,55 s (máx. 150 u). `Water`: dos texturas de canvas a velocidades y ondulación distintas. `WakeSystem`: partículas desde `wake_origin`, intensidad por velocidad ×1,7 en drift, se desvanecen. Colisiones: costas laterales e inferior deslizan (restitución 0,15), borde superior abierto con corriente de vuelta, rocas circulares con rebote suave (0,45). `TouchControls` y `KeyboardControls` puros más `bindInput` para el DOM. `ShipSprite` de 8 vistas con histéresis de 3°, desde el manifiesto o provisional.
- **`apps/web`**: `/` («boia-planet · demo», botón a `/juego`); `/juego` a pantalla completa con HUD (FPS, velocidad, drift sí/no, vista y origen del barco) y enlace «Inicio»; `user-scalable=no` sólo en `/juego`. `pnpm dev` escucha en `0.0.0.0:3000` y `allowedDevOrigins` toma las IP de la red local al arrancar. `GET /api/art/<ruta>` sirve `art/` de la raíz en desarrollo (con `?optional=1`, 204 si no existe, para no ensuciar la consola). `?barco=provisional` fuerza el barco dibujado. `window.__boiaGame` sólo existe fuera de producción, para pruebas.
- Capturas en `docs/informes/img/`: `03-acelera.png`, `03-drift.png`, `03-costa.png`, `03-borde-superior.png`, `03-roca.png` (1280×800, sprites del 01) y `03-provisional-movil.png` (390×844 táctil, barco provisional, joystick con drift).
- No se tocó: `tools/**`, `art/**` (sólo se leyó el manifiesto), `docs/spec/**`, `docs/DECISIONES.md`, `.gitignore` de la raíz. Se añadió `apps/web/.gitignore` (`*.tsbuildinfo`, `next-env.d.ts`).

### Desviaciones respecto al prompt
1. **Cámara a 30°, no 26,57°.** La cara superior de un cubo mide 1/sin(elevación) de ancho por alto: 2:1 exige 30°. Con 26,57° da 2,236:1. 26,57° = atan(1/2) es el ángulo de las aristas en pantalla. El test del cubo afirma las dos cosas: losa 2:1 y aristas a 26,565°. El 01 usa 30° en su manifiesto.
2. **Coordenadas de mundo alineadas con la pantalla sobre el plano del agua** (x a la derecha, y hacia el espectador; 1 u = 1 px horizontal). La rejilla isométrica de 45° se obtiene con `gridToWorld`. Así las costas laterales y el borde superior abierto (§49.7) son rectas de pantalla y la física es igual en todas las direcciones.
3. **Teclado como dirección de pantalla**, igual que el joystick: flechas o WASD indican hacia dónde ir y el barco gira hasta ese rumbo. No es control de tanque. Ver pregunta 1.
4. **Borde superior**: además de abierto, una corriente (260 u/s como máximo, en 200 u) devuelve el barco a aguas navegables, como pide §49.7 («sin mar vacío ilimitado»). Con el acelerador a fondo se queda a unas 166 u del borde.
5. **Dedo del joystick levantado con el segundo dedo aún apoyado**: acelerador a 0 y sin drift. Un toque nuevo crea un joystick nuevo en su punto.
6. **Escala de los sprites del 01**: se deriva del anclaje `bow`, para que la eslora en la vista W mida 64 u, igual que el provisional (148 px de PNG → escala 0,43).

## Probado
| Qué | Comando | Resultado |
|---|---|---|
| Tests | `pnpm test` | exit 0; **42 pasados, 0 fallados**, 8 archivos; 0,32 s |
| Tipos | `pnpm typecheck` | exit 0; 2,6 s (3 paquetes) |
| Lint | `pnpm lint` (`--max-warnings 0`) | exit 0; 2,0 s |
| Formato | `pnpm format:check` | exit 0 |
| Build | `pnpm build` | exit 0; 19,5 s; First Load JS de `/juego` 136 kB (sin el chunk dinámico de Pixi) |

Tests por punto del prompt:
- (2) proyección: 500 idas y vueltas mundo↔pantalla con z, 200 mundo↔rejilla, cubo unidad → losa 64×32 (2:1), aristas a 26,565°, vector de pantalla a 45° ↔ mundo; esquema: cuatro partes obligatorias, defaults, comportamientos abiertos, límites invertidos e IDs repetidos; manifiesto: las tres formas y un caso incompleto.
- (3) paso fijo: 1 s con imágenes de 16 ms y de 33 ms, en trayectoria curva con aceleración → diferencia < 1 % y 60 pasos exactos en ambos; tope por pausa larga; alpha ∈ [0,1).
- controlador: llega a la máxima en `maxSpeed/acceleration` ± 1,5 pasos (derivado de la config, no fijado en el test); frena a 0; el drift gira más de 1,5× y derrapa más; costas: dentro en 600 pasos por cada uno de tres rumbos; desliza sin superar la máxima; borde superior abierto con retorno y sin vaivén; roca: nunca penetra y rebota.
- (5) dirección: cada vista con su rumbo; dos vueltas en sentido S→SW→W… dan 16 cambios de +1 y en sentido contrario 16 de −1; ±60° alrededor de N sólo dan NW/N/NE; la proa del provisional apunta según su vista y la estela sale de la popa.
- entrada: joystick con zona muerta y radio, drift con el segundo dedo, soltar deja todo a cero, prioridad del táctil sobre el teclado; estela: más partículas con más velocidad y con drift, y desaparece al parar.

Corrida real, `node drive.mjs` y `node prov.mjs` (puppeteer-core con el Chrome instalado, en el scratchpad de la sesión, sin añadir dependencias al repo) contra `pnpm dev`:

| Prueba | Resultado |
|---|---|
| Acelera (↑ 3 s) | 220 u/s a los 0,93 s (config: 0,917 s) |
| Drift (↑→ + Shift 0,6 s) | vista N → NE, `drift sí`, 220 u/s |
| Costa izquierda (← 6 s, luego ↖ 2 s) | x mínimo 18,0 (= 0 + radio 18); desliza hacia arriba a 219,7 u/s |
| Borde superior (↑ 12 s) | y mínimo −165,6 (pasa el borde 0 y queda retenido) |
| Pestaña oculta con ↑ pulsada | 0 u/s a los 2 s |
| Roca (560, 1720, r 46) con el joystick del ratón | distancia mínima 64,0 (límite 64), rebote detectado |
| Táctil 390×844: un dedo / dos dedos / soltar | 220 u/s / `drift sí`, vista NE / 0 u/s |
| Consola (dev y producción) | sin errores ni avisos, con y sin manifiesto |
| FPS en el Mac | 120 en el navegador integrado (pantalla de 120 Hz), parado y en drift |
| Peso de `/juego` (`next start`, caché desactivada) | 287 kB de JS gzip + 114 kB de 8 PNG (`art/barco/base/*.png`) ≈ 0,40 MB |

Los PNG se cargan en el worker de Pixi, así que su peso se midió en disco y no por la red.

## Queda abierto
- **Móviles reales**: no corrido. Lo prueba Hernán (abajo).
- **Arte en producción**: `/api/art` lee `art/` del repo y sólo sirve para desarrollo. En Vercel el arte tiene que salir de Storage (D-04) o copiarse a `public/` al construir. Ver pregunta 4.
- La velocidad del HUD es respecto al agua: retenido por la corriente del borde superior marca 220 u/s aunque esté quieto. Ver pregunta 3.
- Sólo se usa la skin `base` sin pasajera ni balanceo `S_bob_*`. El manifiesto ya los trae; hace falta decidir cuándo se muestran.
- La textura del agua (256×128) se ve repetida a simple vista. Sirve de provisional.
- `allowedDevOrigins` toma las IP al arrancar: si el Mac cambia de red, hay que reiniciar `pnpm dev`.
- En desarrollo Next muestra su indicador «N» abajo a la izquierda; en producción no aparece.
- La skill `encargo` §6 dice «Monorepo (encargo 04)»: fue el 03. Los comandos de prueba de §6 se pueden pasar como: `pnpm install` (13 s en frío), `pnpm test` (0,3 s), `pnpm typecheck` (2,6 s), `pnpm lint` (2,0 s), `pnpm build` (20 s), `pnpm dev`.
- Para el panel del navegador integrado hace falta un `.claude/launch.json` (`pnpm dev`, puerto 3000). Lo creé para probar y lo borré, porque `.claude/` no estaba entre mis archivos. Además, con el panel oculto, `requestAnimationFrame` se pausa y el juego se congela; por eso las pruebas se hicieron sin cabeza.

## Para que pruebe Hernán
```
pnpm install
pnpm dev
```
Abrí `http://192.168.1.149:3000/juego` en cada móvil (es la IP de `en0` hoy; si cambia, `ipconfig getifaddr en0`). En el escritorio sirve `http://localhost:3000/juego`.
1. Tocá en cualquier punto de la pantalla y arrastrá: el aro del joystick aparece donde tocaste y el barco gira y acelera hacia donde arrastrás, sin retraso.
2. Con el primer dedo apoyado, apoyá un segundo dedo: el pomo se vuelve naranja, el HUD dice `drift sí`, el barco gira más cerrado, derrapa y la estela se ensancha.
3. Soltá los dos dedos: el barco frena suave hasta 0 y no sigue acelerado. Probalo también cambiando de app o de pestaña con el dedo apoyado.
4. Navegá hacia arriba y date la vuelta hacia abajo: el barco cambia de vista de a una (N → NE → E …) y la proa nunca aparece invertida.
5. Anotá los FPS del HUD en cada móvil, parado y a toda velocidad con drift.
6. Opcional: `?barco=provisional` para comparar con el barco dibujado por código.

## Preguntas para el orquestador
1. **Teclado**: ¿dirección de pantalla (como ahora, igual que el joystick) o control de tanque (↑ acelera, ←/→ giran)? Cambiarlo es un cambio en `KeyboardControls` más sus tests, unos 30 minutos.
2. **Escala del barco**: 64 u de eslora, unos 64 px de pantalla, ocupan el 16 % del ancho de un iPhone de 390 px. ¿Se deja para el hito 1 con Álvaro o se fija ya? Es la constante `SHIP_LENGTH`.
3. **Velocidad del HUD**: ¿respecto al agua (como ahora) o respecto al fondo? Sólo cambia cuando hay corriente; más adelante también con remolinos (§11.4).
4. **Arte en producción**: (a) Supabase Storage con el manifiesto versionado (D-04), que necesita cuenta; (b) copiar `art/` a `apps/web/public/art` en `prebuild`, sin servicios y rehaciendo el despliegue en cada cambio de arte. Para el hito 1 basta (b).
