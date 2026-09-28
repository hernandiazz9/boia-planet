# 03 — Monorepo base y núcleo del motor: barco provisional navegable en el móvil

Para correr: `/encargo 03` en una sesión nueva. En paralelo con el 01 y el 02.
Leé antes: nada.

## Contexto
Hernán quiere una demo cuanto antes. El motor no puede esperar a los sprites
del encargo 01: arranca con un barco provisional dibujado por código y un
cargador que ya lee el contrato del manifiesto que el 01 va a producir. Stack
cerrado en D-04 (pnpm, TypeScript estricto, Next.js App Router, PixiJS v8,
motor propio sin Phaser). Decisión del orquestador para este encargo: el
joystick táctil nace **donde toca el primer dedo, en cualquier punto de la
zona de juego**, no sólo sobre el barco como dice literalmente el Prompt 1 de
la v14; acertar a un sprite de 64 px en un móvil es frustrante y §25 pide
feedback inmediato. Queda anotado como desviación (D-12); Álvaro lo verá en el
hito 1. Ajustala sólo si en la prueba resulta peor, y decilo.

Leer: `docs/DECISIONES.md` entero. De `docs/fuente/v14-maestro.md`: §6, §24,
§25, §49.7, §49.17, y dentro de §50 los párrafos "El control táctil nace…"
(Prompt 1) e "Implementa los controles táctiles…" (Prompt 3). Del prompt del
01, `docs/prompts/01-arte-barco-blender.md`, sólo el punto 6: es el contrato
del manifiesto que tenés que leer.

## Qué existe ya
Nada de código. `node` 24, `pnpm` 11. El `.gitignore` de la raíz ya ignora
`node_modules/`, `.next/`, `dist/`, `.turbo/`, `coverage/` y `.env*`.

## Encargo
1. Monorepo: `pnpm-workspace.yaml`, `package.json` raíz con `dev`, `build`,
   `test`, `lint`, `typecheck`; `tsconfig.base.json` estricto
   (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`);
   ESLint flat config + Prettier; vitest en la raíz. Versiones fijadas.
2. `packages/world`: esquemas zod v0 y transformaciones isométricas.
   `WorldConfig` { id, version, bounds, sectors[], objects[] } y `WorldObject`
   con las nueve partes de §48.2 (identidad, apariencia, posición, geometría,
   comportamientos como `{ type: string; params: Record<string, unknown> }[]`,
   parámetros, contenido, estado, recompensa); en v0 sólo identidad, apariencia,
   posición y geometría son obligatorias. `worldToScreen` / `screenToWorld`
   para dimétrica 2:1 (mismo ángulo que el 01: elevación 26,57°, azimut 45°),
   con tests de ida y vuelta y de un cubo unidad que proyecta a losa 2:1.
3. `packages/engine` (PixiJS v8): `createGame(canvas, { world, manifest? })`.
   Bucle de paso fijo a 60 Hz con render interpolado: la posición tras
   simular 1 s con pasos de 16 ms y con pasos de 33 ms difiere menos del 1 %.
   `ShipController` con aceleración, velocidad máxima, giro, freno y **drift**
   (menos fricción lateral y más giro mientras esté activo); todos los valores
   en un objeto de configuración con valores iniciales razonables y anotados
   como `muestra`. `Camera` que sigue con anticipación. `Water`: dos texturas
   generadas por código (sin arte) que se desplazan a velocidades distintas
   con ondulación. `Wake`: estela de partículas desde el anclaje `wake_origin`,
   con intensidad según velocidad y drift, que se desvanece. Colisiones con
   los bordes del mundo: costas laterales y borde inferior deslizan, el borde
   superior está abierto (§49.7); dos o tres obstáculos circulares del
   `WorldConfig` que bloquean con rebote suave.
4. Entrada: primer dedo crea el joystick en su punto (radio ~56 px, zona
   muerta ~8 px); segundo dedo mantiene drift; soltar todo frena suave. Sin
   aceleración bloqueada al perder un dedo o cambiar de pestaña (`visibilitychange`
   suelta todo). Teclado: flechas o WASD, Shift para drift.
5. `ShipSprite`: elige una de 8 direcciones (`S, SW, W, NW, N, NE, E, SE`,
   S = proa hacia el espectador) según el rumbo real del casco. Lee un
   manifiesto con la forma del punto 6 del prompt 01 (`art/barco/manifest.json`:
   imágenes por skin y dirección, `pivot`, `mast_top`, `slot_passenger`,
   `wake_origin` en píxeles). Si el archivo no existe, usa un **barco
   provisional** dibujado con `Graphics` (casco alargado con proa marcada,
   mástil, colores #F26A1B y #12233F) en las ocho direcciones, con anclajes
   equivalentes. Al girar por N la proa no puede invertirse (§49.17): cubrilo
   con un test que recorra los 8 rumbos y compruebe que la dirección elegida
   es monótona.
6. `apps/web` (Next.js 15, App Router): `/` con una página mínima
   "boia-planet · demo" que enlaza a `/juego`; `/juego` monta el motor a
   pantalla completa con un HUD pequeño: FPS, velocidad, `drift` sí/no y un
   enlace "Inicio". `pnpm dev` levanta con `--hostname 0.0.0.0` para abrirlo
   desde el móvil. Viewport con `user-scalable=no` sólo en `/juego`.
7. Tests vitest: transformaciones (punto 2), paso fijo (3), controlador
   (acelera hasta la máxima en un tiempo esperado, drift aumenta el giro, la
   pared deja el barco dentro), dirección monótona (5). Conteo en el informe.

NO: no landing real, no cinemática, no islas con contenido, no minimapa, no
comportamientos del catálogo (sólo el tipo abierto), no Supabase, no Admin,
no Phaser. No toques `tools/**`, `art/**`, `docs/spec/**`, `docs/DECISIONES.md`
ni el `.gitignore` de la raíz: si necesitás ignorar algo más, un `.gitignore`
dentro de `apps/web` o del paquete. No esperes los sprites del 01 ni intentes
generarlos. No optimices para 60 FPS todavía: medí y anotá.

## Cómo se prueba
```
pnpm install
pnpm typecheck && pnpm lint           # exit 0
pnpm test                             # exit 0; anotá "N pasados, 0 fallados"
pnpm dev                              # http://localhost:3000/juego y http://<ip-del-mac>:3000/juego
```
La sesión prueba en escritorio con teclado: que el barco acelera, gira, hace
drift con Shift, deja estela, rebota en los laterales y sale por arriba; que
la consola no tiene errores; y los FPS del HUD en el Mac. Si tenés navegador
integrado, usalo y guardá una captura en `docs/informes/img/03-*.png`; si no,
Playwright sin cabeza para comprobar que el canvas monta y la consola está
limpia. Anotá también el peso del bundle de `/juego` (`pnpm build`, tamaño
gzip): el presupuesto de la v14 para el primer sector es 5 MB.

## Front
Lo prueba Hernán en iPhone y Android desde `http://<ip-del-mac>:3000/juego`:
(1) tocar en cualquier punto crea el joystick ahí y el barco responde sin
retraso; (2) el segundo dedo hace drift y se nota en el giro y la estela;
(3) soltar los dedos frena sin que el barco siga acelerado; (4) el barco no
se invierte al pasar por N; (5) FPS del HUD en cada móvil.

## En paralelo
El 01 toca `tools/blender/**`, `tools/viewer/**`, `art/**`; el 02 toca
`docs/spec/**`, `tools/spec/**`. Este encargo toca: `package.json`,
`pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig*.json`, configs de
ESLint/Prettier/vitest en la raíz, `apps/**`, `packages/**`,
`docs/informes/img/03-*` y su sección de `ESTADO.md`. Si al cerrar
`ESTADO.md` trae una sección sin commitear de otra sesión, no lo commitees:
dejá tu sección en el informe y decilo.
