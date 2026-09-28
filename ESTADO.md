# Estado del trabajo

Dónde quedó el repo al cerrar la última sesión. Una sección por encargo, la
más nueva arriba: `## <fecha> — encargo NN: <título>`. Se lee después de los
documentos base y se actualiza al cerrar cada sesión.

## 2026-09-28 — plan 001 T12: demo de punta a punta con datos de muestra

Cómo abrir la demo:
1. En el ordenador: `pnpm demo` (o `PORT=3100 pnpm demo` si el 3000 está ocupado) y abrir la URL «En este ordenador» que imprime.
2. En el móvil, conectado a la misma Wi-Fi: abrir la URL «En el móvil (Wi-Fi)», por ejemplo `http://192.168.1.149:3000`. La primera carga de cada página compila unos segundos.
3. Ctrl+C lo para todo. Para ver otra vez la entrada: `/?intro=1`.

Qué existe:
- Recorrido completo sin Supabase ni correo: `/` reproduce la entrada y termina en la landing. Tickets abre el panel de muestra. EXPLORAR EL UNIVERSO entra en `/juego`, donde están el barco, la boia tutorial, las rocas, las costas y la isla de evento. Al acercarse a la isla se abre el panel del evento de muestra. Minimapa, brújula, menú y selector del barco funcionan.
- REQ-ENT-012, EXPLORAR sin reiniciar el mundo:
  - EXPLORAR navega sin recargar la página (`router.push`).
  - La escena de la entrada no se destruye: cede su aplicación Pixi, su canvas, su contexto WebGL y su mar vivo (`IntroScene.release()`, `lib/world-handoff.ts`).
  - `/juego` los adopta: `createGame({ surface })` vacía el escenario y pinta el mundo en el mismo canvas. No hay segunda entrada ni segundo canvas.
  - Sin JS, con Cmd/Ctrl-clic, con un enlace directo o si la escena no llegó a cargar, `/juego` arranca en limpio, como antes.
  - `data-world` en `/juego` vale `adoptado` o `nuevo`. `__boiaIntro.explored` dice si se exploró desde la landing.
- Sección «Barco» del menú (antes «Mi Barco», que tenía el selector de prueba de T11; `ship-style-selector.tsx` se borró):
  - Lista los 9 estilos de `art/barco/manifest.json`: el Toon actual y los 8 de exploración. Cada uno tiene una miniatura SE, un nombre (`estilo` de `docs/barcos/barcos.json`) y una muestra por grupo de `paleta`.
  - Del estilo elegido enseña su descripción (`aspecto`) y sus skins con miniatura. Hoy sólo el Toon tiene fiesta y noche.
  - `notas_render` quita skins: B01 sólo base, B05 sin temáticas, B06 sin fiesta. Cada regla sólo vale mientras su nota siga en el registro (`SKIN_RULES`).
  - La paleta se resuelve leyendo las constantes del script de Blender, como `guia_colores.py` (`lib/barco/python-constants.ts`). Una prueba la compara con el Python.
  - Elegir aplica el cambio al barco al momento, sin recargar (`Game.setShip`), y lo guarda en `boia:estilo-barco` y `boia:skin-barco`. `?estilo=` sigue mandando y se actualiza en la URL.
  - `data-ship-style` y `data-ship-skin` dicen lo que el motor aplicó.
- `/artistas`: los 26 artistas de v14 §18.1, de la A a la Z, con géneros y avatar neutro. Es una página estática: funciona sin JS y sin WebGL. «Ver todos los artistas» enlaza ahí; antes desplegaba una lista A–Z en la misma landing.
- `pnpm demo` (`apps/web/scripts/demo.mjs`):
  - Arranca `next dev` en 0.0.0.0 e imprime las URL local y de red. Si el puerto está ocupado, sale con 1 y lo dice.
  - Next corre en su propio grupo de procesos. Ctrl+C o SIGTERM matan el grupo entero.
  - `next.config.ts` admite 127.0.0.1 como origen de desarrollo.

Comandos:
```
pnpm test && pnpm typecheck && pnpm lint   # exit 0; 29 archivos, 302 pruebas (antes 27 y 273)
pnpm e2e                                   # exit 0; 42 pasadas y 4 omitidas (grabación). Spec nueva: e2e/demo.spec.ts
DEMO_SHOTS=1 pnpm e2e demo.spec.ts --workers=1   # regenera las capturas
PORT=3100 pnpm demo                        # probado: imprime localhost y la IP de la Wi-Fi; tras Ctrl+C no queda nada escuchando en 3100
pnpm --filter @boia/web budget             # ruta crítica de /: 161,2 kB gzip (antes 161,9)
```
Capturas en `docs/informes/img/p001-t12-<paso>-{movil,escritorio}.png`, con 8 pasos: `1-landing`, `2-tickets`, `3-juego`, `4-isla`, `5-barco-menu`, `6-barco-estilo`, `7-barco-skin` y `8-artistas`.

Desviaciones:
- La sección se llama «Barco», como pide la tarea; §19 la llama «Mi Barco». Mantiene el id `barco` y el icono ⛵.
- REQ-ENT-012: el barco del juego no es el mismo objeto Pixi que el barco de la escena de la entrada. Se conservan la aplicación, el canvas, el contexto WebGL y el mar. Compartir el objeto del barco exigiría fundir la escena de T03 con el motor de T04.
- La entrada y el juego tienen encuadres distintos: al entrar, el barco aparece en el spawn del mundo, no donde estaba en la landing.
- El estilo por defecto (Toon) no tiene entrada en `barcos.json`. Usa el rótulo del manifiesto y, como muestras, los colores de marca de `referencias.marca`. No lleva descripción.
- Se tocaron ficheros de otras tareas, con cambios pequeños:
  - `packages/engine/src/game.ts`: `surface`, `setShip` y `adoptedSurface`.
  - `packages/engine/src/intro/scene.ts`: `release`.
  - `packages/engine/src/ship-style.ts`: skins; también se exporta desde `@boia/engine/ui`.
  - `e2e/juego-hud.spec.ts`: el nombre de la sección.

Sin probar:
- Móviles reales en la Wi-Fi, y el traspaso de WebGL en Safari de iOS y en el navegador de Instagram. Se probó con Chromium sin cabeza a 360×640 táctil y 1280×720.
- La opinión de Álvaro sobre nombres, estilos y la lista de artistas (`status: muestra`).

## 2026-09-28 — plan 001 T03: entrada cinemática planeta → mar → landing

Qué existe:
- `packages/engine/src/intro/` (nuevo, `@boia/engine/intro`, puro y sin Pixi):
  - `config.ts`: configuración versionada de la entrada (REQ-ENT-015). Incluye duración (3 s), curva, fases en fracciones de la duración, encuadres por ancho de vista, variante reducida, barco, objetos de escena y copy «BOIA.PLANET». Tiene validador propio con mensajes por campo.
  - `assets.ts`: resuelve los manifiestos de `art/` (planeta, barco, islas, rocas, boia) en URL, pivotes y escalas de escena.
  - `timeline.ts`: función pura (config, geometría, vista, t) → fotograma. Tiene 4 tiempos: planeta con flotación y nubes que giran, acercamiento con zoom logarítmico y `easeInOutCubic`, revelación del mar y llegada. El último fotograma es el encuadre de la landing.
  - `controller.ts`: máquina de estados `idle → waiting → playing → landed`, más `destroyed`. Crea como mucho una escena en toda su vida, muestra la landing una sola vez y nunca arranca el juego. Saltar, interrumpir y destruir son idempotentes. Un fotograma no adelanta la secuencia más de 250 ms.
  - `entry.ts`: `decideEntry` y `bootScript`, un script en línea que decide la entrada antes del primer pintado.
- `@boia/engine/intro/scene` (Pixi, se carga bajo demanda): globo, banda de mar con máscara, nubes, isla, el mar vivo del juego (`Water`) y el mundo de la landing (isla de evento, isla pequeña, rocas, boia animada y barco con balanceo). Las texturas se precalientan en la GPU antes de empezar.
- La web:
  - `(landing)/components/intro-stage.tsx` (escena del hero, bucle de pintado, eventos de pestaña, rotación, Atrás y caché del navegador);
  - `lib/intro/load.ts` (lee los manifiestos al construir y genera el CSS de la ilustración ligera);
  - `lib/intro/bridge.ts` (`window.__boiaIntro` con diagnóstico y `onLanded`).
- El hero ocupa la pantalla entera también bajo la cabecera, con el contenido abajo sobre un velo. Sin motor o sin JS, el hero muestra el mar en CSS con la isla y el barco en `<img>`, en el mismo encuadre que el último fotograma.
- Cómo se entra según el caso:
  - Primera visita: cinemática sin clic, con «Saltar animación» (también Escape).
  - Visita posterior (`localStorage boia.intro.v1`) o enlace con `#…`: directo a la landing.
  - Movimiento reducido: escena quieta y fundido de 0,4 s.
  - `/?intro=1`, o «Ver la introducción» en el pie: la vuelve a reproducir.
  - Si la escena no está lista en 2 s, sale la landing ligera, y la escena entra luego de fondo. Si el motor falla, se queda la landing ligera.
- `landing_view` lleva `intro: played | skipped | none` y se emite cuando la landing se ve.

Comandos:
```
pnpm test        # exit 0, 27 archivos, 273 pruebas tras fusionar T04, T05 y T11. La máquina de estados está en packages/engine/src/intro/controller.test.ts
pnpm e2e         # exit 0, 34 pasadas y 4 omitidas (grabación), tras fusionar T04, T05 y T11. intro.spec.ts: primera visita sin clic, Saltar ×5 y Escape, pestaña oculta, Atrás, movimiento reducido (0 movimientos de cámara), bundle de la escena bloqueado (isla ilustrada y Tickets), recursos lentos, visita posterior, enlace directo y ?intro=1
pnpm build       # ruta crítica de /: 161,9 kB gzip (antes 155,2); Pixi y la escena no entran en ella
RECORD_INTRO=1 pnpm e2e record.spec.ts --workers=1   # regenera vídeos y storyboard (usa la GPU del Mac)
```
Grabaciones y storyboard (ENT 06): `docs/informes/img/p001-t03-entrada-{movil,escritorio}.webm` y `docs/informes/img/p001-t03-storyboard-{movil,escritorio}.png`.

Medida (build de producción, Chromium con la GPU del Mac, 5 primeras visitas por vista): la secuencia dura 3,01 s a ~60 fps, y la landing se ve entre 3,2 y 3,5 s después de cargar. En Chromium sin cabeza con WebGL por software (SwiftShader, lo que usa `pnpm e2e`) hay un tirón de ~0,9 s tras el primer fotograma, y el mar va a ~20 fps: por eso la e2e sólo exige la duración mínima.

Desviaciones:
- Se tocó `packages/engine/package.json`, fuera de `src/intro/**`: se añadieron las exportaciones `./intro` y `./intro/scene`. `index.ts` no cambia.
- `scene.ts` importa `Water` de `packages/engine/src/water.ts` sin tocarlo. Si T04 cambia su firma, habrá que ajustar la escena al fusionar.
- La ruta `/api/art` sirve con `max-age=3600` en producción y sigue con `no-store` en desarrollo, para que la precarga del planeta sirva.
- `e2e/landing.spec.ts` (de T02) abre sus páginas como visita posterior. La prueba sin WebGL ya no bloquea `/api/art`, porque la landing usa ese arte, y sólo exige que no se pida `/juego`.
- `<html suppressHydrationWarning>` en el layout raíz: el script de arranque marca `data-entry` y `data-intro` antes de hidratar.
- El título «BOIA.PLANET» va centrado encima del planeta, no superpuesto.

Sin probar (para Hernán en móviles reales, ENT 04 y 05, REQ-ENT-018, 021 y 022):
- La cinemática en iPhone y Android físicos, en vertical y horizontal, y dentro del navegador de Instagram. Hay que mirar fluidez, que no haya flashes al empezar, las áreas seguras y la ausencia de audio. En la consola, `window.__boiaIntro` da `playedMs`, `landedAtMs`, `longestFrameMs` y `slowFrames`.
- El plazo de 2 s en 4G real: si se agota a menudo, la cinemática no llegará a verse.
- Lector de pantalla durante la entrada.
- Dirección artística: composición, velo y encuadre móvil. Álvaro no la ha aprobado: la configuración es `status: muestra`.

## 2026-09-28 — plan 001 T05: minimapa, brújula, Menú de a bordo, ajustes y cola de avisos

Qué existe:
- `packages/engine/src/ui/` es la lógica del HUD, sin Pixi ni DOM. Se importa como `@boia/engine/ui`, una subruta nueva del paquete, para que la interfaz HTML no arrastre el motor:
  - `hud-layout.ts` (`hudLayout`): coloca cada elemento en px CSS. La fila superior lleva Inicio y los datos de depuración a la izquierda, y la brújula y el ancla a la derecha. El minimapa mide 96 px en móvil, sin pasar del 22 % del ancho, y 128 px desde 1024 px (D-07). La zona del joystick es el 45 % inferior de la pantalla: el HUD no entra nunca ahí. Hay 4 zonas seguras para el minimapa (arriba o en medio, a la izquierda o a la derecha) y se descartan las que no caben en el viewport. En horizontal, por ejemplo, desaparecen las de en medio. `snapMinimap` elige la zona más cercana al soltar. La zona se guarda en `boia.minimapa.zona`. Si la guardada no cabe, se usa la de arriba del mismo lado sin olvidar la preferencia.
  - `minimap.ts`: la proyección del motor (`worldToScreen`), que mete el mundo entero en el cuadrado, y `MinimapGesture`. Un toque corto amplía. 500 ms quieto activan el arrastre. Si el dedo se mueve antes, no pasa nada.
  - `discovery.ts`: los objetivos salen de los datos del mundo. Son las islas, las boies y todo punto con función (evento, entradas, guía, premio…); las rocas no cuentan. Un objetivo se descubre al entrar en su radio de proximidad, o en colisión + 160 u si no tiene. La brújula apunta al objetivo elegido y, si no hay ninguno, al más cercano sin descubrir. `?evento=<id>` señala la isla de ese evento.
  - `notifications.ts` (`NoticeQueue`): los avisos salen de uno en uno, 4 s cada uno, con 300 ms de pausa entre ellos, sin duplicados y como mucho 8 pendientes. Si el reloj salta (pestaña oculta), recorre la cola en orden y sólo suena lo que llega a verse.
  - `settings.ts`: idioma (sólo español publicado, D-03), música y efectos por separado (activación y volumen) y modo del teclado. Se guarda en `boia.ajustes` y se lee con tolerancia.
- Teclado (D-14, `input/controls.ts`): `KeyboardControls.mode` vale `screen` (por defecto) o `tank`. En tanque, arriba avanza por el rumbo, izquierda y derecha giran y abajo suelta. Girar sin acelerar da un empuje de 0,4. `readShipInput` recibe el rumbo. `createGame` acepta `keyboardMode`, `Game.setKeyboardMode` lo cambia en caliente y `GameStats` trae `heading`.
- `/juego`:
  - `minimap.tsx`: el minimapa se dibuja en SVG. Un toque abre el mapa ampliado con nombre y función de lo descubierto; lo no descubierto sale como «?». Tocar un sitio lo elige para la brújula. La pulsación larga lo arrastra y lo ajusta al soltar.
  - `hud-buttons.tsx`: brújula y ancla.
  - `notices.tsx`: aviso arriba, azul marino y naranja, con dos notas cortas. Sale con los logros y recompensas del mundo y al descubrir una isla. Cada aviso sale una vez por sesión.
  - `menu/`: Menú de a bordo con los 7 iconos de §19 y una separación antes de Controles y Ajustes. Cada sección es un módulo en `menu/sections/` y se registra con una línea en `sections/index.ts`.
    - Con contenido: Welcome Aboard (borrador), Logros (los de esta sesión), Controles (explicación y modo de teclado; el sitio del minimapa también se elige ahí) y Ajustes.
    - Esqueleto: Mi Carnet y Ranking.
    - Mi Barco: por ahora, sólo el selector de estilos de T11.
  - `sound.ts`: canales de música y efectos. El «plop» y el aviso respetan Ajustes.
- Todo el HUD lleva `data-hud`, y la capa lleva `data-joystick-top`. El e2e comprueba con ellos que nada toca la zona del joystick.

Comandos:
```
pnpm test                   # exit 0, 23 archivos, 235 pruebas (con T11 en main; T04 dejó 18 y 179)
pnpm test --filter engine/src/ui   # zonas seguras, posición guardada, cola de avisos, gesto, brújula, ajustes
pnpm typecheck && pnpm lint # exit 0
pnpm e2e                    # exit 0; spec nueva e2e/juego-hud.spec.ts (4 pruebas × móvil 360×640 y escritorio)
```

Desviaciones:
- Se tocaron dos ficheros fuera de `ui/` e `input/`, con cambios pequeños. En `packages/engine/src/game.ts`: la opción `keyboardMode`, `setKeyboardMode` y `heading` en las estadísticas. En `packages/engine/package.json`: la subruta `./ui`.
- El selector de estilos de prueba de T11 estaba abajo a la izquierda, dentro de la zona del joystick. Ahora está en la sección Mi Barco del menú y funciona igual (guarda el estilo y recarga con `?estilo=`). T12 lo sustituye.
- Descubrimientos y logros se guardan sólo en memoria: al recargar se pierden. Guardarlos es de T07. Las boies se descubren sin aviso; las islas, con aviso.
- En la fila superior, el aviso tapa Inicio, la brújula y el ancla durante 4 s. Tocarlo lo cierra.
- Con 320–360 px de ancho, los iconos del menú encogen hasta 36 px para que quepan los 7 y la separación.
- La zona del joystick (el 45 % inferior de la pantalla) es una decisión `muestra`. El joystick sigue naciendo donde toca el dedo (D-12).

Sin probar:
- Móviles reales. Se probó con Playwright sin cabeza (360×640 táctil y escritorio) y con capturas fuera del repo en `/tmp/orchestrator-attach/boia-planet-T05/`: menú, mapa, arrastre y aviso.
- La vibración al empezar el arrastre y el sonido en iOS, que necesita un gesto previo.
- La música: todavía no hay ninguna pista. El canal existe y obedece a Ajustes.

## 2026-09-28 — plan 001 T11: el barco en los 8 estilos de exploración, elegible en el juego

Qué existe:
- `tools/blender/ship_styles.py` envuelve los 8 estudios de `tools/blender/styles/NN_*.py` sin modificarlos: misma cámara (`rig.py`, 30°, D-13), la luz y el postproceso de cada estudio, un empty de balanceo, la pasajera de `ship.py` con materiales del estilo y los anclajes calculados de la geometría (`bow`/`wake_origin` en los extremos del casco en el agua, `mast_top` en el punto más alto, `slot_passenger` sobre la cubierta en un punto elegido por estilo). Nombre y descripción de cada estilo salen del registro `docs/barcos/barcos.json` (`estilo`, `aspecto`, id `B0N`).
- `art/barco/estilos/<id>/`: por estilo, la skin `base` con los mismos fotogramas que el barco actual (8 direcciones sin y con pasajera y 8 de balanceo `S_bob_N`, 24 PNG) y su `manifest.json` completo (`status: muestra`, `style: <id>`). Ids: `boceto-lapiz`, `acuarela`, `low-poly`, `semi-realista`, `arcilla`, `cartoon-30`, `cel-shaded`, `pixel-art`. Noche y fiesta siguen sólo en el estilo actual (`muestra`), cuyos 56 PNG no cambian.
- `art/barco/manifest.json` gana `style_label` y `style_variants` (id, label, barco, description, manifest). El esquema los admite; `check.py` valida cada estilo con las mismas reglas que el barco (skin base) y exige que no haya carpetas sin listar.
- Motor: `packages/engine/src/ship-style.ts` (`loadShipStyle`, `requestedShipStyle`, `resolveShipStyle`, `readShipStyleIndex`). `?estilo=<id>` gana; sin parámetro, el guardado en `localStorage` (`boia:estilo-barco`); un id desconocido vuelve al por defecto.
- `/juego`: selector de prueba abajo a la izquierda (`apps/web/app/juego/ship-style-selector.tsx`). Elegir un estilo lo guarda y recarga con `?estilo=<id>`, sin perder el resto de la URL (`?pasajera=1`, `?arte=marcadores`). Funciona sobre la vista de barco de T04: 8 direcciones, pasajera y fotogramas `bob` del manifiesto del estilo.
- Escala: T04 saca la escala de todo el mundo del manifiesto del barco. Para que un estilo no encoja o agrande el mundo, `loadShipStyle` le pone el `displayScale` del estilo por defecto. Todo sale de la misma cámara, así que cada remolcador se ve a su tamaño modelado: de 49 a 57 px de eslora, contra los 48 del barco actual.
- Hoja de contacto a escala de juego (la del motor; densidad 2) sobre agua: `docs/informes/img/p001-t11-barco-estilos.png`. Una fila por estilo (muestra arriba, luego el orden de arriba); en cada fila, las 8 direcciones sin y con pasajera.

Comandos:
```
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/render.py -- --all                          # exit 0, 270 imágenes
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/render.py -- --all --out tools/blender/out/rerun
diff -r art tools/blender/out/rerun              # sin salida, exit 0: 286 archivos idénticos
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/render.py -- --ship-style pixel-art        # un solo estilo
python3 tools/blender/check.py [--diff]          # exit 0, "16 manifiestos válidos, 270 imágenes"
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/contact_sheet_estilos.py                   # hoja de contacto
python3 tools/barcos/guia_colores.py --check     # exit 0, 0 referencias rotas (no se tocan los scripts de estilo)
```

Desviaciones:
- Reproducibilidad: `bmesh.ops` crea las mismas caras en distinto orden en cada proceso de Blender (arcilla y lápiz salían con 1 o 2 niveles de diferencia en unos pocos píxeles). `ship_styles.canonical_order()` ordena vértices, aristas y caras por geometría antes de renderizar, y con eso las dos corridas son idénticas byte a byte.
- Cambiar `render.py` cambia el `sources_sha256` de los manifiestos del mundo, pero no sus PNG. Como T11 no puede tocar `art/` fuera de `barco`, esos 7 manifiestos quedan con el hash anterior. El próximo `--all` que se commitee los pone al día. `check.py` no verifica ese hash.
- La pasajera está en la cubierta de proa, en un punto elegido por estilo para que se vea en las 8 direcciones. En semi-realista y pixel-art hubo que adelantarla porque la caseta la tapaba en NW. En lápiz es gris, como todo el estilo. En cartoon usa la paleta del estilo (rojo y crema).
- D-15 fija 48 px de eslora para el barco actual. Los remolcadores de exploración miden entre 49 y 57 px a la escala del mundo. Se prefirió no reescalarlos, para no romper la densidad compartida con el mundo.

Sin probar:
- En un teléfono real: se probó en el navegador de escritorio y con emulación de 375 px.
- La opinión de Álvaro sobre los estilos.
- Las texturas de pantalla de lápiz, acuarela y cartoon con el balanceo en movimiento.

## 2026-09-28 — plan 001 T04: catálogo de objetos y comportamientos v1, boia tutorial, isla de prueba

Qué existe:
- `packages/world/src/behaviors.ts`: el catálogo v1 de §48.3 con un esquema zod de parámetros por módulo, compartido por motor y editor. Son 13 tipos: `collision` (`mode`: block, bounce, brake, slow, boost; `intensity`, `duration`, `solid`), `proximity`, `dialogue` (líneas de 140 caracteres como máximo, con señal opcional `pulse_menu`/`pulse_minimap`; `interval` 1,5 s; `leaveReaction`; `once`), `collectible`, `reward` (`frequency`: once, session, season, repeatable), `content`, `ticket`, `checkpoint`, `teleport`, `spawn`, `achievement`, `decorative` y `start_minigame` (punto de extensión vacío). Los rangos son seguros (§48.8) y hay valores por defecto `muestra`. Las acciones llevan `on` opcional; si falta, se disparan al recoger, al entrar en proximidad o al contacto, por ese orden.
- `WorldObject.behaviors` sólo admite tipos del catálogo y exige la geometría que cada uno necesita. `WorldConfig.coast` nombra el arte de las costas. `WORLD_SCHEMA_VERSION` sigue en 0: los objetos de muestra de T06 ya usaban estos tipos, y `schema.test.ts` de `@boia/db` los sigue validando.
- `packages/world/src/art.ts`: contrato de los manifiestos del mundo de T01 (`sprite` y `tile`: pivote, anclajes, sugerencias, animaciones, variantes de costa). `sample-world.ts` contiene el mundo de muestra, que es sólo datos: spawn, boia tutorial con 7 líneas (borrador, pendiente Álvaro), 4 rocas (`roca-a`/`roca-b`, que rebotan o bloquean), una isla pequeña decorativa y la isla de evento (`isla-evento`, proximidad de 330 u, que abre el evento de muestra `ev-all-day-primavera`, más ticket y logro), con costas a ambos lados.
- `packages/engine/src/world/`:
  - `runtime.ts` (`WorldRuntime`): motor de comportamientos puro, sin Pixi. Da la física con efectos (`shipConfig`); en cada paso resuelve colisiones con restitución por objeto, contacto, recogida, proximidad con histéresis, diálogo, recompensas con clave de idempotencia, spawn con semilla y teletransporte a agua segura. Emite `WorldEvent`s. `MINIGAMES` está vacío.
  - `simulate.ts`: simulación sin render, con traza.
  - `visual.ts`: qué PNG, pivote y escala tiene cada objeto, y la escala del arte a partir del barco.
  - `assets.ts`, `object-view.ts`, `coast-view.ts` y `bubble.ts`: la parte Pixi. La boia tutorial usa su bucle `idle`. Las costas son losas repetidas cuya `collision_x_px` cae sobre el límite del mundo. El bocadillo se toca para avanzar y tiene un botón «Saltar».
- Barco: `SHIP_LENGTH` pasa a 48 (D-15) y el radio de colisión a 13,5. Todo el arte usa la escala del barco. En parado se balancea: con los fotogramas `bob` del manifiesto en la vista S y con ±0,9 px por código en el resto. El slot TRIPULANTE carga las imágenes `_p` y está oculto por defecto (`setPassenger`).
- `createGame` acepta `onWorldEvent`, `runtime` y `artUrl` (`null` = sin arte). `Game` expone `runtime`, `advanceDialogue`, `skipDialogue` y `setPassenger`. Espacio o Intro avanzan el bocadillo; Escape lo salta. La cámara no enseña más de 56 px de tierra bajo el borde inferior.
- `/juego`: marcadores de minimapa (96 px, como mucho el 22 % del ancho; 128 px en escritorio) y del ancla del menú, que pulsan cuando lo pide la boia. El panel del evento (HTML, no modal) se abre al acercarse a la isla y se cierra al alejarse o con ×; muestra el botón Entradas si el evento está a la venta. Cada bocadillo hace un «plop» sintetizado. `?pasajera=1` enseña la pasajera; `?arte=marcadores`, el mismo mundo sin arte.

Comandos:
```
pnpm test                 # exit 0, 18 archivos, 179 pruebas (antes 13 y 123)
pnpm test --filter engine # 8 archivos, 58 pruebas: runtime, sustitución de asset, visual
pnpm typecheck && pnpm lint   # exit 0
```
Pruebas nuevas:
- `runtime.test.ts`, una o varias por comportamiento: ralentizar quita su intensidad durante su duración y después se recupera; bloquear y rebotar; frenar; boost; la proximidad dispara entrada y salida una vez aunque el barco dude en el borde; el diálogo avanza a 1,5 s, se toca, se salta, reacciona al alejarse y respeta `once`; el recogible concede según `once`/`session`/`season`/`repeatable` a lo largo de tres sesiones; contenido, ticket y logro; checkpoint; teletransporte fuera de tierra; spawn con semilla; decorativo; minijuego no disponible.
- `swap.test.ts`: roca-a → roca-b, isla-pequena o marcador, y el mundo de muestra entero con arte o con marcadores. Se dibuja distinto y la traza es idéntica.
- `behaviors.test.ts` y `sample-world.test.ts`: validan contra los manifiestos reales de `art/`.

Desviaciones:
- «Snapshot de la traza»: la prueba de sustitución compara la traza del asset B con la del asset A en la misma ejecución, no con un archivo `.snap`. Así no se rompe cuando otra tarea ajusta la física.
- Los textos de `/juego` están en el componente, no en `apps/web/lib/i18n`, que queda fuera del alcance.
- `obstaclesFromWorld` ahora sólo cuenta los objetos con una COLISIÓN sólida del catálogo. Una geometría de colisión sin comportamiento ya no bloquea.
- La costa inferior se dibuja por código: T01 no tiene losa inferior.

Sin probar:
- Móviles reales. Se probó con Playwright sin cabeza (390×844 táctil y 1280×800): el toque en el bocadillo avanza, Espacio avanza, pulsan minimapa y ancla, el panel se abre a unos 5,6 s de salir y se cierra al alejarse o con ×, la pasajera y los marcadores funcionan, y no hay errores en consola. Capturas fuera del repo, en `/tmp/orchestrator-attach/boia-planet-T04/`.
- El sonido «plop» en iOS, que exige un gesto previo.
- Recompensas y logros sólo se emiten: nadie los guarda ni los muestra (T05 avisos; T07 progreso).

## 2026-09-28 — plan 001 T01: primer lote de arte del mundo desde Blender

Qué existe:
- `tools/blender/style.py` y `tools/blender/styles/muestra.py`: el estilo del barco (toon de 3 tonos, sombras violeta, contorno de casco invertido) y la paleta de muestra del mundo, sacados de `ship.py`. `render.py -- --style <nombre>` elige otro archivo de `styles/` con la misma API. Cambiar de estilo es volver a renderizar. Los `NN_*.py` de exploración siguen siendo scripts sueltos.
- `tools/blender/world.py`: recursos procedurales con la cámara del barco (30°, D-13) y su misma densidad (88,28 px por unidad), así que el motor les aplica la escala del barco. Un plano *holdout* a z=0 recorta lo que queda bajo el agua.
- `art/` tiene 7 recursos nuevos, cada uno con su `manifest.json` (`status: muestra`, `license: muestra interna`, `style`, generador y sha256 de las fuentes):
  - `isla-evento`: isla grande con escenario, hueco para el cartel y muelle decorativo;
  - `isla-pequena`: isla secundaria;
  - `boia-tutorial`: bucle `idle` de 12 fotogramas a 8 fps, con balanceo y farol que parpadea;
  - `roca-a` y `roca-b`;
  - `costa`: losas `izquierda` y `derecha`, que se repiten en vertical sin costura;
  - `planeta`: capas `globo`, `nubes`, `banda-mar` e `isla`.
- Cada manifiesto trae pivote, anclajes (rótulo, cartel, muelle, bocadillo, polo…), huella en polígono, `hitbox_hint` y `proximity_hint`. Las costas traen `shore_x_px`, `collision_x_px` y `outer_fill`.
- Contrato del mundo: `tools/blender/asset.schema.json`. El barco gana los campos `kind: ship` y `style`; sus 56 PNG no cambian byte a byte.
- `render.py -- --all` escribe todos los recursos; `--out` es ahora la raíz (cada recurso va en `<out>/<id>`) y `--only <id>` renderiza uno solo. `check.py` valida todas las carpetas de `art/`, exige las de `RESOURCES` de `render.py` y `--diff` compara por recurso.
- `tools/blender/contact_sheet.py` genera la hoja de contacto `docs/informes/img/p001-t01-hoja-mundo.png`, a escala de juego (48 px de eslora, D-15) y densidad 2.

Comandos:
```
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/render.py -- --all                          # exit 0, 78 imágenes, ~9 s
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/render.py -- --all --out tools/blender/out/rerun
diff -r art tools/blender/out/rerun              # sin salida, exit 0: 86 archivos idénticos
python3 tools/blender/check.py [--diff]          # exit 0, "8 manifiestos válidos, 78 imágenes", ~8 s
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/calibrate.py                                # ratio=1.9998
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/contact_sheet.py                            # hoja de contacto
```

Desviaciones:
- La isla de evento tiene un radio de 4,4 unidades. A escala de juego mide unos 250 px CSS de tierra y 320 px contando el agua somera. Es grande, pero cabe en un teléfono de 390 px.
- En el planeta, la isla se apoya en el polo norte del globo. Así, desde 30° se ve 2:1, igual que en el juego. La «banda de mar» es ese mismo globo visto de cerca, con la curvatura arriba. La capa `isla` es la isla de evento a media escala y con contorno doble.
- Las costas son sólo las laterales. No hay esquinas ni costa inferior.

Sin probar:
- El motor todavía no lee estos manifiestos: eso es T04 (mundo) y T03 (entrada).
- Las proporciones de la isla, la boia y las rocas frente al barco en un teléfono real.
- La opinión de Álvaro sobre estilo y paleta.

## 2026-09-28 — plan 001 T06: esquema Supabase, migraciones y RLS

Qué existe:
- `supabase/migrations/`: 7 migraciones de SQL plano, acumulativas, con prefijo de 14 cifras como la CLI de Supabase. Crean 26 tablas en `public`, todas con RLS:
  - `base`: esquema `private`, `staff_roles` (editor < admin < owner, protección del último propietario) y `audit_log` (sólo altas, con motivo vía `set_config('boia.audit_reason', …, true)`).
  - `identity`: `carnets` (apodo, avatar, `member_since`), `carnet_questions` con las 5 preguntas textuales de §44.1 y `carnet_answers`.
  - `events`: `seasons` (una activa), `islands`, `events` con los 7 estados de §49.4 (`draft, coming_soon, on_sale, sold_out, postponed, cancelled, finished`, los mismos nombres que `@boia/contracts`) e isla separada, y `event_secrets` para la secret location.
  - `world`: `world_objects` en borrador y `world_revisions` (draft/published, inmutables al publicarse); la versión activa es `seasons.active_world_revision_id`.
  - `home`: `home_blocks`, `home_revisions` y `site_settings.active_home_revision_id`.
  - `progress`: `achievements` (catálogo de triggers, `key` + `key_version`), `purchases` y `ledger_transactions` con id estable elegido por el servidor. Un disparador deriva `point_balances`, `coin_balances`, `season_points`, `user_achievements`, `stamps` y `user_cosmetics`; una corrección es una transacción `compensation`.
  - `bottles`: `bottles` (una activa por cuenta, 140 caracteres), `bottle_reads` y `bottle_reports`.
- Permisos: anon y authenticated nunca escriben saldos, roles, sellos, libro, auditoría, estados de compra ni `events.state`/`published_at`. Los derivados del libro no los escribe ni service_role. Los permisos del Admin exigen `aal2` (TOTP, D-10).
- `supabase/seeds/*.sql`: muestra (`is_sample`, slugs `muestra-…`). Hay una temporada, una isla, 4 eventos (a la venta, próximamente, finalizado en la misma isla y borrador), 3 objetos, un mundo publicado, 9 bloques de home y 4 logros. `supabase/sample/remove-sample.sql` la retira.
- `packages/db` (`@boia/db`):
  - `src/harness.ts`: crea y borra sólo bases `boia_planet_test*` y aplica shim, migraciones y datos; registra en `supabase_migrations.schema_migrations`.
  - `sql/supabase-shim.sql`: roles, `auth.uid()`/`auth.jwt()` y privilegios por defecto de Supabase.
  - `sql/fixtures/`: cuentas y libro de prueba.
  - `src/database.types.ts`: tipos generados con la forma de `supabase gen types`.
  - Pruebas: `rls.test.ts` y `schema.test.ts`.

Comandos:
```
pnpm db:test            # exit 0, 20 comprobaciones, 7 migraciones, ~2 s
pnpm test --filter db   # exit 0, 2 archivos, 46 pruebas
pnpm db:types           # regenera packages/db/src/database.types.ts (una prueba exige que esté al día)
pnpm test               # exit 0, 13 archivos, 123 pruebas (tras fusionar T02)
pnpm typecheck          # exit 0
```
`pnpm db:test` aplica todo a `boia_planet_test` vacía y comprueba RLS y permisos. Después siembra, retira la muestra y la repone, y comprueba que repetir migraciones y semillas no cambia nada. Por último, para cada corte k, aplica las migraciones y los datos hasta k y encima las migraciones nuevas, sin perder filas. Al terminar borra la base. Cada archivo de vitest usa su propia base `boia_planet_test_v<pid>_<aleatorio>`. `BOIA_PG_URL` cambia el servidor (por defecto `postgresql://localhost:5432/postgres`).

Desviaciones:
- El script raíz `test` traduce `--filter X` a un filtro de ruta de vitest (`/X/`). Antes, vitest rechazaba `--filter`.
- Las semillas están en `supabase/seeds/<versión>_*.sql`, no en `supabase/seed.sql`: cada una declara la migración que necesita. Con la CLI de Supabase: `[db.seed] sql_paths = ['./seeds/*.sql']`.
- Los roles `anon`, `authenticated` y `service_role` se crean en el servidor local si faltan y no se borran (NOLOGIN).
- Al fusionar T02, los enums `event_state` y `home_block_type` se alinearon con `EVENT_STATES` y `HOME_BLOCK_TYPES` de `@boia/contracts` (`coming_soon`, `store`, `footer`). Una prueba de `schema.test.ts` exige que sigan iguales.

Sin probar:
- Las migraciones contra un proyecto Supabase real (`boia-planet-dev`, P7). Tampoco PostgREST ni supabase-js con los tipos generados.
- `pg_cron` y las funciones auditadas de publicación y cambio de estado: son de T08 y T09.

## 2026-09-28 — plan 001 T02: landing por bloques, panel de Tickets y analítica

Qué existe:
- `packages/contracts` (nuevo, zod): los 7 estados de evento con su comportamiento en home y Tickets, el evento prioritario vigente, próximos eventos, 9 tipos de bloque de home (mostrar/ocultar, programación `showFrom`/`showUntil`, ids únicos), artistas, fotos, promociones y los 6 eventos del embudo (D-04). `purchase_confirmed` queda fuera del tipo del cliente.
- `apps/web/app/(landing)/`: la home ahora se pinta desde una lista tipada de bloques con datos de muestra (`apps/web/lib/landing/sample-content.ts`). Bloques: hero (BOIA UNDERGROUND MUSIC FESTIVAL, frase de §37.11, EXPLORAR EL UNIVERSO de 64 px con pulso del 4 % cada 3 s, Tickets de 48 px), evento prioritario, próximos eventos, fotos (marcadores con alt), los 26 artistas de §18.1 en tríos que rotan cada 5 s con botón de pausa y A–Z plegable, filosofía, tienda como enlace externo, contacto y pie con enlaces legales (`/legal/privacidad|condiciones|cookies`, textos pendientes). Un bloque oculto, fuera de programación o sin contenido no pinta nada.
- Panel de Tickets en HTML en `/#tickets`: evento destacado y los próximos a la venta, «Próximamente» si no hay nada. Funciona sin JavaScript (CSS `:target`); con JS hay foco, Escape, Atrás, fondo `inert` y analítica.
- i18n por claves: `apps/web/lib/i18n/es.ts` y `t()`. Sólo español.
- PostHog UE sin SDK (`apps/web/lib/analytics`): POST a `/i/v0/e/` sólo si existe `NEXT_PUBLIC_POSTHOG_KEY`. El id anónimo vive en memoria, sin cookies ni storage. Se emiten `landing_view`, `explore_start`, `tickets_panel_open` y `ticket_click_out`, que siempre quedan en `window.__boiaAnalytics`.
- Rotación de artistas: ventanas de 3 sobre un orden barajado con semilla fija, así servidor y cliente coinciden.

Comandos:
```
pnpm test     # exit 0, 77 pruebas (antes 42): rotación, renderizador de bloques, contratos
pnpm build    # exit 0; imprime la ruta crítica de / (scripts/landing-budget.mjs): 155,2 kB gzip de 1024
pnpm e2e      # exit 0, 10 pruebas (mobile 360×640 y desktop, Chromium): CTA y Tickets sobre el pliegue, panel sin WebGL ni bundle del juego, /#tickets, sin JS, axe 0 serios/críticos
pnpm lint && pnpm typecheck   # exit 0
```
La primera vez en una máquina: `pnpm --filter @boia/web exec playwright install chromium` (~94 MB). `pnpm e2e` construye y arranca `next start` en el puerto 3107.

Desviaciones:
- Se tocaron tres archivos fuera del alcance nombrado. En `vitest.config.ts`, `oxc.jsx.runtime: automatic`, porque Next exige `jsx: preserve` y sin eso las pruebas no pueden renderizar componentes. En `package.json` de la raíz, el script `e2e`. `apps/web/app/page.tsx` se borró porque lo sustituye `app/(landing)/page.tsx`.
- No se instaló `posthog-js`: su dependencia `core-js` tiene un script de build que pnpm 11 bloquea, y `pnpm install` salía con exit 1. En su lugar se llama directo a la API de captura. Pesa 0 kB y no hace falta banner de cookies.
- La ruta crítica cuenta los polyfills `nomodule` (38,6 kB), que los navegadores modernos no descargan. La cifra es conservadora.
- Mi Carnet y el control de sonido de la navegación (REQ-ENT-029) no están: llegan con T07 y T05.

Sin probar:
- El envío real a PostHog: no hay clave. Falta crear el proyecto UE y pasar `NEXT_PUBLIC_POSTHOG_KEY` con `pedir-token`.
- Móviles reales.
- Copy, enlaces oficiales, correo, tienda y ticketera son de muestra (`example.com`), pendientes de Álvaro.

## 2026-09-28 — plan 001 T00: «boia» con i en todo el repo

Qué existe:
- D-18 en `docs/DECISIONES.md`: grafía valenciana «boia» (femenino), plural «boies». La v14 (`docs/fuente/v14-maestro.md`) conserva la grafía con y como texto histórico.
- 17 archivos versionados cambiados (spec, DECISIONES, PLAN, prompt 01, informes 01 y 02, CLAUDE.md, skill `encargo`, docstrings de `tools/blender/ship.py`). Las rutas absolutas a la carpeta del proyecto ya dicen `/Users/heralc/Desktop/boia.planet`, antes de que Hernán renombre la carpeta al cerrar el plan 001.
- Formas derivadas adaptadas: el slug de la tarea `objetos-y-boia-tutorial` de `docs/PLAN.md` (antes con y).

Comandos:
```
git grep -I -i -n -E "bo[y]a" -- ':!docs/fuente/v14-maestro.md' ':!plans/'   # sin salida, exit 1
python3 tools/spec/check.py        # exit 0, 279 requisitos, centinelas 10/10
python3 tools/spec/test_check.py   # exit 0, 18 pruebas
python3 tools/blender/check.py     # exit 0, 56 imágenes
pnpm test                          # exit 0, 42 pruebas
```

Desviaciones:
- No se re-renderizó el barco: en `ship.py` sólo cambian un docstring y un comentario.
- `plans/001-demo-l1.md` sigue con la grafía con y (5 veces): el plan es del orquestador.

Sin probar:
- La skill `encargo` apunta a `/Users/heralc/Desktop/boia.planet`, que todavía no existe: hasta el renombrado, el `cd` de su paso 0 falla.

## 2026-09-28 — encargo 01: pipeline de arte del barco en Blender

Qué existe:
- Blender 5.2.2 LTS en `/Applications/Blender.app`, instalado con `brew install --cask blender`.
- `tools/blender/`: `rig.py` con la cámara y el render compartidos, `ship.py` con el barco procedural, `render.py` para el lote y el manifiesto, `calibrate.py`, `check.py` y `manifest.schema.json`.
- `art/barco/`: 56 PNG de 256×256 y `manifest.json`. Son 3 skins × 8 direcciones × con y sin pasajera, más 8 fotogramas de balanceo en base/S. Todo lleva estado `muestra`.
- `tools/viewer/index.html`: visor estático.
- `tools/blender/styles/NN_*.py`: 8 pruebas de estilo de la lámina de conceptos de Hernán, con sus hojas en `docs/informes/img/01-estilo-*.png`. Son exploración: no alimentan `art/`.

Comandos y cuánto tardan:
```
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/calibrate.py        # ~2 s; ratio=1.9998
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/render.py -- --all  # ~6 s de reloj, 56 imágenes
python3 tools/blender/check.py [--diff [DIR]]   # ~8 s; exit 0 y "56 imágenes, manifest válido"
python3 -m http.server 8080                     # desde la raíz; visor en http://localhost:8080/tools/viewer/
```
Para comprobar la reproducibilidad, se renderiza otra vez con `--out tools/blender/out/rerun` y después se corre `check.py --diff`. Hoy da 0 píxeles distintos y archivos idénticos byte a byte.

Desviaciones:
- La cámara va a 30° de elevación y no a 26,57°. Sólo 30° da la proporción 2:1 que mide la calibración; con 26,57° el cubo da 2,2355. D-13 lo confirma.
- El sol no proyecta sombras: con el contorno de casco invertido, todo quedaba en sombra.
- Se añadió el anclaje `bow` y el vector `bow_screen` al manifiesto.

Sin probar:
- El visor en teléfono real.
- La opinión de Álvaro sobre el diseño y el estilo.

Detalle: `docs/informes/2026-09-28-01-arte-barco-blender.md`.

## 2026-09-28 — encargo 02: spec v15 consolidada

**Existe ahora** (commits `75f7f61` y el que aplica D-13 a D-17):
- `docs/spec/` con 12 archivos: 279 REQ `REQ-<ÁREA>-<nnn>` (244 L1 · 33 L2 · 2 diferidos), definidos en 01–08 y listados en `09-requisitos.md` con fuente, alcance y criterio verificable. `docs/DECISIONES.md` prevalece; la v14 queda como fuente histórica.
- Para trabajar: leer `docs/spec/00-indice.md` y los archivos de área que nombre el encargo, y citar los requisitos por ID.
- Comandos: `python3 tools/spec/check.py` (exit 0, 0,05 s, «279 requisitos, 0 duplicados, centinelas 10/10») y `python3 tools/spec/test_check.py` (18 pruebas de mutación, OK, 1 s).

**Falta o no se probó**: 20 REQ `[provisional]` esperan al orquestador (18 de alcance que D-02 no nombra, 2 contradicciones nuevas); 24 `[pendiente Álvaro]`; 2 `[pendiente Hernán]` (dispositivos de referencia, P6). El estado de implementación por REQ (REQ-PRO-017) todavía no tiene archivo.

**Desviaciones**: 26.114 palabras por `wc -w`, por encima de las 12.000–18.000 esperables; centinelas 10/10 y no 7/7, porque la lista del prompt suma 10 cadenas; en 09 el texto es un título corto y la frase completa vive en el archivo del área; se añadió `tools/spec/test_check.py`. D-12 a D-17 llegaron durante la sesión y están aplicados. Detalle en `docs/informes/2026-09-28-02-spec-v15-consolidada.md`.

## 2026-09-28 — encargo 03: monorepo y motor base

**Existe ahora** (commit `b9dd060`):
- Monorepo pnpm: `apps/web` (Next 15.5), `packages/world` (esquema zod v0, proyección 2:1, contrato del manifiesto), `packages/engine` (PixiJS 8.21). TS 5.9 estricto, ESLint 9, Prettier, vitest 5.
- Comandos: `pnpm install` (13 s en frío), `pnpm test` (42 pasados, 0,3 s), `pnpm typecheck` (2,6 s), `pnpm lint` (2,0 s), `pnpm build` (20 s), `pnpm dev` (`0.0.0.0:3000`). Todos con exit 0.
- `/juego`: barco navegable con joystick que nace donde toca el primer dedo, drift con el segundo dedo o con Shift, flechas/WASD, agua animada, estela, costas laterales e inferior, borde superior abierto con corriente de vuelta y tres rocas. HUD con FPS, velocidad y drift.
- Lee los sprites del 01 (`art/barco/manifest.json`) a través de `/api/art/*`, que sólo sirve en desarrollo. Sin manifiesto, o con `?barco=provisional`, usa el barco dibujado por código.
- Medido: 120 FPS en el Mac; `/juego` pesa 287 kB de JS gzip + 114 kB de PNG.

**Falta o no se probó**: móviles reales (Hernán); arte en producción (Storage o copia a `public/`); skins distintas de `base`, pasajera y balanceo.

**Desviaciones**: cámara a 30° (26,57° es el ángulo de las aristas; con 26,57° no sale losa 2:1). Coordenadas de mundo alineadas con la pantalla sobre el plano del agua. Teclado como dirección de pantalla. Corriente de retorno pasado el borde superior (§49.7). Detalle en `docs/informes/2026-09-28-03-monorepo-y-motor-base.md`.
