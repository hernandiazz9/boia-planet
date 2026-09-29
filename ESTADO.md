# Estado del trabajo

Dónde quedó el repo al cerrar la última sesión. Una sección por encargo, la
más nueva arriba: `## <fecha> — encargo NN: <título>`. Se lee después de los
documentos base y se actualiza al cerrar cada sesión.

## 2026-09-29 — plan 002 T29: pulido esencial, presupuesto de la landing y una suite e2e que termina sola

Reducido a lo esencial tras dos intentos atascados. De sus ramas WIP se tomó sólo lo terminado y probado (landing, Playwright, minimapa); el sonido, WebKit, las specs de rendimiento y accesibilidad, el presupuesto de /juego y lo de `art/` se dejan fuera.

Qué cambia:
- Landing ≤ 192 kB gzip (`scripts/landing-budget.mjs`, presupuesto bajado de 1 MB a 192 kB; `pnpm build` falla si se pasa). El servidor resuelve la home (`resolveHome` en `lib/landing/resolve.ts`: bloques visibles, pie, secciones, panel de Tickets, ids comprables) y el cliente recibe esa vista ya resuelta; `resolve.ts` (y con él los esquemas de `@boia/contracts` y zod) sólo se carga con `import()` cuando llega el contenido del repositorio (`useLiveHome(initial, derive)`). `EventCard`, `HomeBlocks`, `TicketsPanel` reciben `buyable` en vez de llamar a `canBuy`. `/artistas` pasa sólo la lista de artistas.
- Playwright termina solo: `webServer` corre `node scripts/e2e-server.mjs <puerto>` (`next build` y `next start` como hijos directos de Node, sin pnpm por medio; reenvía señales y se para si Playwright desaparece) con `gracefulShutdown` SIGTERM. Antes, pnpm dejaba el `next-server` fuera del grupo y Playwright esperaba por él.
- Minimapa: `minimapProjection` nunca da escala negativa y `MapSvg` no pinta tamaños negativos (errores de SVG en consola al redimensionar).
- Accesibilidad de Pixi apagada (`packages/engine/src/pixi-app.ts`, `newApplication()` en juego, entrada y prueba de la esfera): ya no mete el `<button>` invisible «select to enable accessibility…» que era parada del tabulador en móvil, ni activa capas con Tab en escritorio. `extensions.remove(AccessibilitySystem)` no sirve (el renderer lo recoge de la cola de extensiones al cargar su chunk, después), así que se anula `_createTouchHook` (privado de Pixi; si Pixi lo renombra, la e2e lo detecta) y `activateOnTab = false`.
- Pruebas: `packages/engine/src/ui/minimap.test.ts` (huecos 0, menores que el margen y negativos), `blocks.test.ts` y `event-card.test.ts` adaptados, e2e nuevo en `juego-hud.spec.ts` (sin botón de accesibilidad de Pixi, sin errores «negative value» al pasar el viewport a 40×40 y volver).

Comandos:
```
pnpm test && pnpm typecheck && pnpm lint          # exit 0; 59 archivos, 579 pruebas
pnpm build                                        # exit 0; landing 173,7 kB gzip de 192 kB
E2E_PORT=3261 timeout 1500 pnpm e2e --workers=2   # exit 0; 85 pasadas, 15 omitidas (6,0 min); termina sola, sin next-server en el puerto
```

Desviaciones:
- macOS no trae `timeout`: se usó un sustituto en Perl (mismo uso, sale con 124 si vence).

Sin probar:
- iOS Safari real (WebKit no está en la suite).

## 2026-09-29 — plan 002 T24: el mundo Acuarela en el juego y el cambio de mundo

`/juego` tiene dos mundos terminados sobre el mismo mapa: Arcilla (B05, el por defecto) y Acuarela (B02). Se cambia desde el Menú («Mundos») o como mundo activo del Admin. Nombres, textos, colores e historia son `muestra` [pendiente Álvaro, preguntas en `mundos/acuarela/diseno.md`].

Qué existe:
- Piel `acuarela` (`packages/world/src/worlds/acuarela/skin.ts`): arte de T19 (`art/mundos/acuarela/<lugar>/`) para cada lugar del mapa compartido, las mismas piezas que Arcilla en la carpeta de Acuarela; nombres de `mundos/acuarela/lugares.json` (sitios reales: La Explanada, Cala Cantalar, L'Albufereta, La Vila Joiosa, Altea, Tabarca, La Nao, Cap de la Nau, El Penyal, Cap de l'Horta, Torre de l'Illeta); bocadillos y textos de `diseno.md` (la noche de Sant Joan); mar turquesa de `lugares.json`, acento azul del casco B02, barco `acuarela`. La isla de evento `allday` conserva el nombre compartido. Los secretos van con marcador, como en Arcilla. Ningún lugar se mueve: posiciones, geometría y comportamientos son los del mapa (Faro y Cañón abren los mismos minijuegos; el minijuego toma la piel `wash` por el id del mundo).
- `place-art.ts`: la correspondencia lugar del mapa → pieza de arte, una sola para todos los mundos (`sharedPlaceAsset`, `sharedCoastArt`); Arcilla la usa también. El mundo `prueba` de T20 desaparece: `WORLD_REGISTRY` = Arcilla + Acuarela.
- Misión de la Fiestera: la de T21 (`rescueMissionOf`), que sale de los datos del mapa compartido (`params.mission`, cocodrilos de su zona, `params.missionDestination`), vale igual en Acuarela sin tocarla: mismo personaje, cocodrilos, radios y destino (Tabarca, el lugar `ultima`); la tripulante a bordo es la pieza `mundos/acuarela/fiestera#tripulante`, que `/juego` pone con `setCrewArt` al arrancar y al cambiar de mundo. Los bocadillos de la Fiestera en Acuarela son los de su skin (farolillos, Tabarca).
- Mover un lugar: `WorldRegistry.movePlace(id, x, y)` / `movePlace(map, …)` devuelve un registro nuevo con el lugar movido en el mapa, así en todos los mundos (lo que aplicará un `PlacePatch` del Admin).
- Entrada (T28): `apps/web/lib/intro/worlds.ts` tiene la entrada de `acuarela` (la misma que Arcilla: mismo mapa, mismo aterrizaje en la bocana y mismo encuadre del puerto), y `lib/intro/active.ts` mira también el mundo activo del Admin (`adminWorldId`), como `/juego`.
- Web: sección «Mundos» del Menú (`menu/sections/mundos.tsx`, 🌍, entre Descuentos y Barco): cada mundo con su nombre, su línea de historia y su barco (miniatura y nombre del catálogo de «Barco»); elegir cambia el mundo sin recargar (`game.setWorld`, el barco sigue donde está), lo guarda en `boia:mundo` y, si no se eligió barco en «Barco», pone el del mundo. «Barco» sigue cambiándolo (y entonces vale en todos los mundos). La barra del menú admite nueve iconos en 360 px (mínimo 34 px).
- Mundo activo del Admin, una sola fuente: el repositorio local (`repo.content.activeWorldId`). `world-choice.ts` exporta `adminWorldId()` y `setActiveWorld(id | null)` (que es la acción `setActiveWorld` del Admin de T26); `/juego` lo lee antes de arrancar el motor y aplica encima los cambios del Admin (`liveWorld` de T26, también al cambiar de mundo). Orden: `?mundo=`, elección del visitante, mundo activo, por defecto. El Admin de T26 ya no copia el mundo activo a `boia:mundo-activo` (`choiceStorage` fuera de `createAdminActions`): nadie la lee; la que quede en navegadores viejos se ignora.
- Pruebas: `packages/world/src/worlds/acuarela/acuarela.test.ts` (cada lugar tiene piel de Acuarela con arte existente, misma pieza que Arcilla, todo el catálogo usado, mismos sitios y comportamientos, mover un lugar lo mueve en los dos, nombres de lugares.json y nombre compartido de la isla de evento, Faro y Cañón), `packages/engine/src/mission/worlds.test.ts` (la misión de T21 es la misma en cada mundo salvo la tripulante, que existe en art/), `apps/web/app/juego/world-switch.test.ts` (lo descubierto, un premio «una vez» y un descuento en Arcilla siguen al pasar a Acuarela y al volver, sin volver a darse). e2e `apps/web/e2e/mundo-acuarela.spec.ts`: Menú → Mundos → Acuarela (cambia mundo y barco), a la isla de evento, recarga (sigue en Acuarela) y al náufrago con su código; móvil y escritorio.

Comandos (tras integrar T26, T21 y T28):
```
pnpm test && pnpm typecheck && pnpm lint                              # exit 0; 59 archivos, 578 pruebas
pnpm world:check                                                      # exit 0; arcilla y acuarela: 94 lugares, 0 sin skin
E2E_PORT=3245 pnpm e2e --workers=2 e2e/admin.spec.ts e2e/mundo-acuarela.spec.ts e2e/mundo-arcilla.spec.ts e2e/intro.spec.ts   # exit 0; 46 pasadas
E2E_PORT=3243 pnpm e2e --workers=2                                    # antes de integrar: exit 0; 80 pasadas, 14 omitidas
```

Desviaciones:
- `apps/web/e2e/mundo-acuarela.spec.ts` está fuera del alcance escrito: es la spec que pide el encargo.
- Fuera del alcance escrito, por la integración con T26 y T28 (orden del orquestador): `apps/web/lib/admin/actions.ts`, `apps/web/lib/admin/admin.test.ts` y `apps/web/app/admin/use-admin.ts` pierden la copia del mundo activo en `boia:mundo-activo`; `apps/web/lib/intro/worlds.ts` y `active.ts` (entrada de Acuarela y mundo activo del repositorio).
- Como en T20, Playwright se quedó esperando al `next-server` huérfano de su `webServer` tras terminar las pruebas; se paró a mano ese proceso (el del puerto de la prueba, de este worktree).

Sin probar:
- La misión entera de la Fiestera en Acuarela en e2e (la spec de T21 corre en el mundo por defecto); en Acuarela sólo con pruebas unitarias.
- Móviles reales: rendimiento del arte de Acuarela y el cambio de mundo en caliente.

## 2026-09-29 — plan 002 T28: EXPLORAR descubre el puerto y la aventura empieza allí

La entrada ya no es el mundo de muestra de plan 001: es el mundo activo (Arcilla por defecto) y aterriza en su punto de aterrizaje, la bocana de El Varadero. Al pulsar EXPLORAR la landing se aparta, la cámara se aleja un poco (de ×1,3 en móvil y ×1,45 en escritorio a la escala del juego, ×1) hasta el encuadre con el que empieza el juego —el barco en el anillo de salida, la primera boia delante y el mar abierto hacia el norte, camino de la Fiestera— y entonces la escena pasa a `/juego` (T12). Zoom, anclas, tamaño del mini-mundo y duración son `muestra` [pendiente Hernán/Álvaro en móvil real].

Qué existe:
- `packages/engine/src/intro/port.ts` (puro): `WorldIntro` (datos de entrada de un mundo: encuadre de llegada por ancho, trozo de mapa del mini-mundo y distancia de carga, duración y curva del alejamiento) con `validateWorldIntro`; `introConfigForWorld` (la configuración con el aterrizaje del mundo, su llegada y el barco en la salida mirando a su rumbo); `portReveal` / `portCamera` (la cámara con la que arranca el juego: centrada en el barco, sin bajar de la franja de tierra, `GAME_BOTTOM_LAND_PX` = `BOTTOM_LAND_PX` de `game.ts`, una prueba lo vigila); `revealCamera` (centro en línea recta, zoom en escala logarítmica); `shipViewFor`.
- `timeline.ts`: acto `explore` (`exploreFrame`). `controller.ts`: fases `exploring` y `explored`; `explore(vistaDelJuego)` se aleja y arranca el juego al pintar el último fotograma, una vez; sin escena o con movimiento reducido arranca ya (REQ-ENT-010); pestaña oculta a medias lo termina; salir de la landing a medias no arranca nada. La escena puede traer su propia configuración, geometría y alejamiento (`IntroSceneHandle.view`), que el controlador adopta al llegar.
- `world-geometry.ts`: el mini-mundo es un cuadrado del mapa centrado en el aterrizaje (`miniWorld.span`, 2400 u), no el mapa entero (Arcilla mide ~11 000 × 21 000 u: ni cabe en la textura ni su arte, 6 MB, en lo que dura la carga); `nearbyWorld` deja sólo los objetos y las costas cercanas; `worldIntroSetup` lo junta. `scene.ts` pinta las costas como el juego (`createWorldCoastView`, las tiras de Arcilla) y el mar con los colores del mundo.
- `apps/web/lib/intro/worlds.ts`: datos de entrada por mundo (`WORLD_INTROS`, con `DEFAULT_WORLD_INTRO` para los que no tienen) y los puntos del mapa con lo que dejó el Admin (`mapa:entrada`, `mapa:salida`, `mapa:puerto`, T26). `lib/intro/active.ts` (navegador): el mundo de `/juego` en este navegador (`?mundo=`, elegido, activo del Admin) con los cambios del Admin, y el estilo de barco que llevará. `lib/intro/load.ts` (servidor): la entrada del mundo por defecto, la ilustración ligera como las piezas junto al aterrizaje (el puerto) en vez de la isla de muestra, el barco de cada estilo en su vista de salida y la precarga sólo de lo cercano.
- `intro-stage.tsx`: EXPLORAR sube arriba, pone `html[data-explore]` (la landing se funde, `landing.css`), se aleja y al terminar cede la escena y navega; lleva `?mundo=` a `/juego` si la landing lo traía. Diagnóstico nuevo en `window.__boiaIntro`: `world`, `landingPoint` y `reveal` (inicio, fin, vista del juego, última cámara y dónde quedaron barco y puerto).
- `/juego` (arranque): el canvas cedido se enseña nada más montar, antes de que cargue el juego (antes se veía el fondo un momento); si se desmonta antes de arrancar, la escena vuelve a quedar en oferta.
- Pruebas: `packages/engine/src/intro/port.test.ts` (móvil y escritorio: EXPLORAR sólo aleja, termina en la cámara del juego con el barco en la salida del mundo activo y el puerto a la vista, arranca el juego una vez y después no pinta; vista del juego distinta de la escena; movimiento reducido; pestaña oculta; salir a medias; franja de tierra igual a la de `game.ts`; validación) y `apps/web/lib/intro/worlds.test.ts` (cada mundo registrado tiene entrada; el Admin mueve aterrizaje, salida y puerto y la entrada y el juego salen del mismo sitio; el encuadre del puerto de cada mundo enseña el puerto). e2e: `demo.spec.ts` comprueba en móvil y escritorio que la entrada es la del mundo activo, que el alejamiento se ve entero y acaba a escala de juego con barco y puerto en la vista, y que el juego arranca con el barco en la salida (minimapa), también por enlace directo a `/juego`; `intro.spec.ts` comprueba la ilustración del puerto con el motor bloqueado.

Comandos:
```
pnpm test && pnpm typecheck && pnpm lint                      # exit 0; 53 archivos, 537 pruebas
E2E_PORT=3241 pnpm e2e --workers=2 e2e/demo.spec.ts           # exit 0; 8 pasadas
E2E_PORT=3251 pnpm e2e --workers=2                            # exit 0; 80 pasadas, 14 omitidas
```
Como en T20 y T26, al terminar la suite Playwright esperaba a un `next-server` huérfano del `webServer`: se paró a mano (el del puerto de la prueba, de este worktree) con todas las pruebas ya con resultado.

Desviaciones:
- El mini-mundo de la entrada es el puerto y su mar (un trozo de 2400 u del mapa), no el mapa entero: con Arcilla, el mapa entero no se ve en una esfera de móvil ni carga a tiempo. Es un dato por mundo (`miniWorld.span`).
- La llegada de la entrada queda más cerca que antes (×1,3 móvil, ×1,45 escritorio; antes ×0,72 y ×1) porque el juego va a ×1 sin zoom propio: para que EXPLORAR se aleje y el relevo no salte de escala, la llegada tiene que estar más cerca que el juego. `validateWorldIntro` exige zoom de llegada ≥ 1.
- Arreglo de paso en `scene.ts` (`release`): el mar cedido llegaba al juego desplazado a la cámara de la entrada; con las coordenadas de Arcilla quedaba fuera de la vista y en `/juego` adoptado se veía sólo el color de fondo, sin olas. Ahora se entrega en el origen, como lo pinta el juego.
- `apps/web/app/juego/demo-world.ts`: sólo el comentario (la entrada ya no usa el mundo de muestra).
- La ilustración ligera y la página estática usan el mundo por defecto sin cambios del Admin; el navegador recalcula la escena con los suyos. Si el Admin mueve el aterrizaje, la ilustración ligera (sólo sin motor) sigue en el sitio de muestra.

Sin probar:
- Móviles reales: tiempo de carga del arte del puerto y de las tiras de costa dentro del presupuesto de 2 s; la sensación del alejamiento.
- Con una skin temática del barco guardada, la entrada enseña la skin `base` y el juego la temática (cambia al pasar).
- Acuarela (T24) usa `DEFAULT_WORLD_INTRO` hasta que tenga su entrada propia.

## 2026-09-29 — plan 002 T21: misión de la Boia Fiestera, logros, puntos y monedas

La misión principal (REQ-AVE-005…011) y el sistema de logros (REQ-IDE-024…027) en `/juego`, sobre el repositorio local de T16. Textos, premios, tiempos y la lista de logros son `muestra` [pendiente Álvaro].

Qué existe:
- Motor, `@boia/engine/mission` (`packages/engine/src/mission/rescue.ts`, puro): `rescueMissionOf(world)` saca la misión de los datos del mapa, genérica por mundo (T24 la reutiliza para Acuarela sin tocarla): el personaje es el objeto con `params.mission` (`fiestera`, personaje `boia-fiestera`), los cocodrilos son los de categoría `cocodrilo` de su zona, el destino es el lugar con `params.missionDestination` (sin destino no hay misión). `RescueMission`: `loading` → `waiting` → `boarding` → `aboard` → `landing` → `delivered`. Con el barco a menos de `crocRadius` los cocodrilos se sumergen de uno en uno (el más cercano primero, cada 0,4 s) y al alejarse vuelven; en el radio de rescate y con todos abajo, ella sale del agua y sube al barco con un saltito (1 s) y pasa al slot TRIPULANTE; en el radio del destino, desde cualquier lado, baja (1,2 s) y se queda en el nicho de la isla (`params.missionDrop`). El destino se fija al rescatar y se guarda por id de lugar: sobrevive al cambio de mundo y a que el Admin cambie el de las partidas nuevas. `setWorld` pasa la misión a otro mundo sin perder paso ni destino.
- Motor: `WorldRuntime.moveObject(id, x, y, z)` (altura sólo visual) y `setObjectInteractive(id, on)` (sin choque, proximidad ni diálogo: la Fiestera subiendo y ya en su isla); `ObjectView` reproduce `sumergirse` (y al revés al emerger) con anillos de onda si el arte lo trae (los cocodrilos de T18); `Game.setCrewArt(asset)` dibuja la pieza `tripulante` del mundo (`mundos/<mundo>/fiestera#tripulante`, bailando) sobre `slot_passenger`, también al cambiar de barco; `GameOptions.onStep` (cada paso fijo) para guiones de la web; `hudLayout` tiene `balances` (saldos junto a Inicio, antes que los datos de depuración).
- Mapa (`packages/world/src/worlds/arcilla/map.ts`): la Fiestera pide ayuda desde el radio de los cocodrilos (4,0) y sube a bordo en el de rescate (2,6); `ultima` lleva `missionDrop` (el nicho, delante de la isla con altura) y `missionReward` (100 puntos y 100 monedas, muestra).
- Web: `apps/web/app/juego/mission.ts` guarda el paso con `progress.setMission('fiestera', …)` (destino y temporada por id, nunca coordenadas), concede el premio grande una vez para siempre (`mision:fiestera:entrega`) y los logros de rescate y entrega; avisos «Nueva tripulante a bordo · Boia Fiestera rescatada · Destino: última isla» y el de la fiesta, confeti (`celebration.tsx`), `fanfare()` en `sound.ts`. A bordo, la Fiestera reacciona en el aviso de cada isla nueva. Sin recordatorio permanente de misión. `?pasajera=1` sigue enseñando el slot sin misión.
- Web: `achievements.ts`: señales (boia, isla, secreto por categoría, tiempo a bordo, rescate, entrega, circuito, entrada) que dejan su huella por id de lugar en el progreso y conceden los logros del catálogo del repositorio (también secretos) cuya condición se cumple; `find_boia` del mapa es `find_buoy` del catálogo. El tiempo a bordo se apunta cada 15 s con la pestaña visible. Los logros del mundo ya no avisan por su cuenta: sólo avisa lo que el repositorio concede (uno a uno, 4 s, cola de T05). Saldos en el HUD (`balances.tsx`, `data-testid="saldos"`) y sección Logros del Menú con puntos, monedas, rango, lo conseguido y lo que falta (X/6 boies, minutos…).
- Pruebas: `packages/engine/src/mission/rescue.test.ts` (pasos en orden, cocodrilos uno a uno, sin rescate con uno arriba, inerte a bordo y entregada, destino guardado tras cambiar de mundo y de destino), `apps/web/app/juego/mission.test.ts` (con repositorio: premio una vez tras recargar, destino tras cambiar de mundo, texto del aviso), `achievements.test.ts` (cada logro del catálogo se concede una vez, no antes y no tras recargar; saldos separados), `hud-layout.test.ts` (saldos). e2e `apps/web/e2e/fiestera.spec.ts` (escritorio): rescate, recarga a bordo, entrega con celebración y logro, y otra visita sin premio repetido.

Comandos:
```
pnpm test && pnpm typecheck && pnpm lint                               # exit 0; 53 archivos, 542 pruebas
E2E_PORT=3171 pnpm e2e --workers=2 e2e/fiestera.spec.ts --project=desktop   # 1 pasada
E2E_PORT=3174 pnpm e2e --workers=2                                     # exit 0; 80 pasadas, 14 omitidas
```

Desviaciones:
- Los radios de la Fiestera: su diálogo salta en el radio de los cocodrilos (4,0) en vez del de rescate, para que pida ayuda mientras se sumergen (REQ-AVE-005) y no se corte al subir a bordo.
- «Seis boies» no se puede conseguir todavía: el mapa sólo tiene una boia con `find_boia` (la del puerto). La lista es muestra.
- Como en T20, al terminar Playwright se quedó esperando a un `next-server` huérfano del puerto de la prueba; se paró a mano ese proceso tras tener todos los resultados.
- Sólo se formatearon con Prettier los archivos nuevos; los ya existentes que se tocaron no estaban formateados en main y se dejaron así para no mezclar cambios con T24.

Sin probar:
- Móviles reales. La misión entera sólo en escritorio (e2e); en móvil, lo mismo con el joystick.
- El cambio de mundo a mitad de misión sólo con pruebas unitarias (en la web el mundo `prueba` usa el arte de Arcilla; la tripulante de Acuarela llega con T24).
- El Admin fijando el destino de las partidas nuevas (REQ-AVE-011) funciona por datos (`params.missionDestination`), pero la pantalla y la migración auditada de partidas existentes son del Admin (T26 o después).

## 2026-09-29 — plan 002 T26: Admin de la demo con el botón «Probar admin»

`/admin` abre el Admin de la versión de prueba (D-20, REQ-ADM-039) sin login, con un aviso fijo arriba: es una demo y los cambios se quedan en este navegador. Se llega desde «Probar admin» en el pie de la landing y en el Menú de a bordo de `/juego`. Copy, números y arte, `muestra` [pendiente Álvaro].

Qué existe:
- Secciones de L1 (REQ-ADM-008), con ancla en la URL (`/admin#mundo`): Página principal (orden con ↑/↓, visible, programar desde/hasta, evento prioritario, titular y subtítulo, vista previa móvil y escritorio en un iframe de `/?intro=0`), Eventos (crear, editar, duplicar como borrador, los siete estados a mano con su nota, isla del evento, papelera y recuperar; «Islas y eventos» dice qué evento abre cada isla y sus recuerdos), Mundo (mapa compartido en miniatura con todos los lugares y los puntos del mapa; por lugar: posición, radio de proximidad, parámetros JSON y activo, «vale en todos los mundos»; por mundo: nombre con la pregunta «Solo en este mundo / En todos los mundos», textos del panel y oculto; salida, puerto y aterrizaje de la entrada), Artistas, Fotos y vídeos (fotos por URL y álbumes; vídeos, con Supabase), Logros y cosméticos (premios, activo, secreto, precios en monedas, umbrales de rango), Moderación (botellas con sus reportes, retirar con motivo, descartar reporte; retirar recompensas del libro con compensación), Textos y música (textos de la landing sin variables; música de cada mundo sólo lectura), Temporadas (mundo activo), Usuarios de administración e Integraciones (sólo lectura) y Auditoría y muestra (lista de la auditoría local, volver a la muestra por área o todo).
- `apps/web/lib/admin/`: `world.ts` (mapa compartido + cambios del repositorio, puro: `applyPlacePatches`, `applySkinPatches`, `linkIslandEvents`, `composeLiveWorld`; puntos del mapa con ids reservados `mapa:salida`, `mapa:puerto`, `mapa:entrada`; `params.proximityRadius` va a la geometría), `validate.ts` (`worldProblem`: ids que existen, dentro del mapa, mundo válido en cada mundo, salida/puerto/aterrizaje y teletransportes en el agua, inundación desde la salida como las pruebas del mar de T09/T20: ninguna isla corta el paso), `actions.ts` (`createAdminActions`: cada cambio pasa por `repo.admin` y su auditoría con autor `admin-demo`; un rechazo es `AdminError` con el motivo), `live-world.ts` (el mundo de `/juego` con los cambios), `dates.ts`, `copy.ts`.
- Evento ↔ isla: el evento lleva `islandId`; la isla abre el próximo evento vigente ligado a ella y vende sus entradas; sin evento vigente abre su panel de isla con sus recuerdos (eventos pasados o terminados), que ahora se listan en el panel de isla de `/juego`.
- La landing lee el repositorio: `LiveLanding` (cabecera, bloques, pie y Tickets) pinta la muestra del servidor y, al montar y con el navegador libre, `gameRepository()` (eventos, bloques, artistas, fotos, textos); sigue escuchando cambios. `main[data-contenido]` dice `muestra` o `repositorio`. `/artistas` igual. `lib/landing/sample-content.ts` sale ahora de la muestra de `@boia/store` (la isla del evento de primavera pasa de `isla-primavera` a `allday`). Textos del Admin sobre la landing con `lib/landing/texts.ts`.
- `/juego` juega el mundo con los cambios del Admin (`liveWorld` antes de arrancar el motor y al cambiar de mundo) y lee los eventos, bloques y fotos del repositorio (`liveContent()`), no de la muestra. El mundo activo del Admin se guarda también en `boia:mundo-activo`, la clave que ya lee `world-choice.ts` (T17).
- Pruebas: `apps/web/lib/admin/admin.test.ts` (el mapa de muestra pasa la validación; cambios inválidos rechazados con su motivo sin tocar nada ni la auditoría: isla sobre la salida, isla encima de un recogible, fuera del mapa, id inexistente, salida en tierra, isla que no admite eventos; un cambio válido vale en todos los mundos; la isla abre su evento vigente y sin él su panel con recuerdos; cada cambio escribe una entrada de auditoría; volver a la muestra deja home, mundo, pieles, textos y temporada como la muestra; renombrar en un mundo o en todos). e2e `apps/web/e2e/admin.spec.ts`: «Probar admin» desde el pie, crear un evento en la isla de evento, subir los artistas en la home, mover la isla (antes, moverla sobre la salida se rechaza por «tierra»), retirar una botella reportada; en la landing el evento y el orden nuevos, en `/juego` la brújula lleva a la isla en su sitio nuevo (mapa ampliado) y su panel abre el evento creado; el Menú de a bordo enlaza al Admin. Móvil y escritorio.

Comandos:
```
pnpm test && pnpm typecheck && pnpm lint                      # exit 0; 51 archivos, 521 pruebas
E2E_PORT=3187 pnpm e2e --workers=2 e2e/admin.spec.ts          # exit 0; 2 pasadas
E2E_PORT=3193 pnpm e2e --workers=2                            # exit 0; 80 pasadas, 14 omitidas
node apps/web/scripts/landing-budget.mjs                      # 201,3 kB de 1024 kB, OK
```
Como en T20, al terminar la suite Playwright esperaba a un `next-server` huérfano del `webServer`: se paró a mano (el del puerto de la prueba, de este worktree) cuando todas las pruebas tenían resultado.

Desviaciones:
- Fuera del alcance escrito, por necesidad para «verlo en el mundo»: en `apps/web/app/juego/` además del botón del menú (`menu/onboard-menu.tsx`), `game-canvas.tsx` (mundo con cambios del Admin y eventos del repositorio) y `place-panels.tsx` (contenido del repositorio y recuerdos de la isla). Cambios pequeños; T21 y T24 tocan los mismos archivos.
- El reporte de la botella se siembra en `localStorage` en el e2e (reportar de verdad exige Carnet y navegar hasta la botella).
- «En todos los mundos» deja el mismo nombre propio en cada mundo registrado (el repositorio no guarda nombres comunes del mapa); un mundo que se registre después no lo hereda.
- La validación del mar replica en `lib/admin/validate.ts` los obstáculos sólidos del motor (`solidObstaclesOf`) y el radio del casco (13,5): `packages/engine` estaba fuera del alcance y su índice arrastra Pixi.
- El editor visual (arrastrar y soltar) queda para después, como pide el encargo.

Sin probar:
- Móviles reales. El aterrizaje de la entrada se guarda y se valida, pero la entrada todavía usa el mundo de muestra (T28).
- Ocultar el bloque del hero con la entrada en marcha: el script de arranque decide con la muestra del servidor.

## 2026-09-29 — plan 002 T20: el mundo Arcilla en el juego, con cada isla y encuentro

`/juego` ya no abre el mundo de muestra de plan 001: abre Arcilla (B05) sobre el mapa compartido sacado de `mundos/arcilla/mapa.json`. Textos, radios, premios, descuentos y nombres son `muestra` [pendiente Álvaro].

Qué existe:
- Mapa compartido (`packages/world/src/worlds/arcilla/map.ts`, id `boia-mapa`): cada lugar de mapa.json con su `source` (ruta en mapa.json o pieza de T18). `units.ts` pasa u_maq a unidades del motor. Puerto El Varadero con anillo de salida (spawn), escolleras, balizas, boia y WhatsApp; Cala del Alfar (isla secundaria con recuerdos), isla de evento `allday` (panel del evento, entradas y recuerdos; compra de T25), Puerto de Fotos (abre la galería `/#fotos`), isla tienda (enlace externo en otra pestaña), Última isla (Isla del Amanecer), Faro y Cañón con `start_minigame` (`faro`, `canon`), náufrago que pide que lo lleven y da un código de descuento, restos y cofres con descuentos escondidos y monedas, delfín, remolino, secretos sin brújula, botellas (`BOTTLE_SPOTS`), el circuito El Freu (salida, CP1, ruta segura / atajo, CP2, meta, semáforo, carteles y obstáculos) y costas con esquinas y borde de abajo (arriba abierto).
- Encuentro de la Fiestera sin lógica de misión: la Fiestera, la posidonia, los cocodrilos y las rocas son objetos del mundo; `moveObject` y `setObjectPresent` del runtime permiten que T21 los mueva y los oculte.
- Piel `arcilla` (`skin.ts`): arte de `art/mundos/arcilla/<lugar>/` pieza a pieza (sprites y losas de costa), nombres de `diseno.md`. Secretos y grada sin arte: marcador a propósito. `WORLD_REGISTRY` usa `arcilla` por defecto; `prueba` sigue para el cambio de mundo hasta T24. `SAMPLE_MAP` queda para pruebas y la entrada.
- Motor: colisión con varios círculos por objeto, vaivén (`params.patrol`), remolino (`params.swirl`), `@boia/engine/circuit` (carrera pura: cuenta atrás, arcos en orden, las dos ramas valen, se anula al abrir panel / ocultar pestaña / teletransportarse, caduca; récord local por circuito y versión que sólo mejora).
- Web: `world-progress.ts` lleva premios, descuentos y descubrimientos a `repo.progress` (el descuento se concede una vez, también tras recargar; el caducado se guarda y se enseña como caducado). `place-panels.tsx` (panel de evento, descuento con copiar de un toque, fotos, tienda), `circuit-hud.tsx` (cronómetro pequeño y récord), `encounters.ts` (delfín y remolino), sección Descuentos del Menú. Minimapa y brújula listan los lugares nuevos. `?cerca=<lugar>` empieza al sur de un lugar (pruebas y enlaces).
- Pruebas: `packages/world/src/worlds/arcilla/arcilla.test.ts` (cada lugar de mapa.json está en el mundo y en su sitio, costas, arte de cada lugar), `packages/engine/src/world/arcilla.test.ts` (ninguna isla corta el paso, la bocana está abierta, ningún teletransporte deja el barco en tierra), `encounters.test.ts`, `circuit/race.test.ts` (récord local), `apps/web/app/juego/world-progress.test.ts` (descuento una vez). e2e `apps/web/e2e/mundo-arcilla.spec.ts`: del puerto a cada tipo de lugar (isla de evento, náufrago, descuento, Fotos, tienda, salida del circuito), móvil y escritorio.

Comandos:
```
pnpm test && pnpm typecheck && pnpm lint                              # exit 0; 50 archivos, 513 pruebas
E2E_PORT=3163 pnpm e2e --workers=2 e2e/mundo-arcilla.spec.ts          # 16 pasadas
E2E_PORT=3166 pnpm e2e --workers=2                                    # exit 0; 78 pasadas, 14 omitidas
```

Desviaciones:
- Fuera del alcance escrito, por necesidad: `apps/web/lib/repo.ts` (botellas de muestra en los sitios de botella del mapa), `apps/web/lib/intro/load.ts` y `packages/engine/src/intro/{scene,sphere-probe}.ts` (una costa sin `asset` único: la de Arcilla va por losas), y `apps/web/e2e/mundo-arcilla.spec.ts` (la spec que pide el encargo).
- `demo.spec.ts` y `tickets.spec.ts` (fuera del alcance escrito) cambian porque el mundo por defecto ya no es el de muestra: el barco por defecto es el del mundo (`arcilla`), y el tramo hasta la isla de evento empieza con `?cerca=` (tras EXPLORAR el juego adopta la superficie de la entrada pero juega Arcilla desde el anillo del puerto, lejos de la isla; que EXPLORAR descubra el puerto es de T28).
- En esta máquina, al terminar la suite Playwright se quedaba esperando a un `next-server` huérfano del `webServer`; se paró a mano ese proceso (el del puerto de la prueba) después de que todas las pruebas tuvieran resultado.
- Las pruebas e2e empiezan con `?cerca=<lugar>` y navegan hasta él: cruzar el mapa desde el puerto para cada lugar pasaría del minuto por lugar. Sólo la primera sale del anillo del puerto.

Sin probar:
- Móviles reales: rendimiento con todas las piezas de Arcilla en pantalla.
- El delfín y el remolino sólo con pruebas unitarias, no en e2e.

## 2026-09-29 — plan 002 T19: mundo Acuarela (B02), diseño y arte sobre el mapa compartido

El segundo mundo, Acuarela ilustrada, sobre el mismo mapa que Arcilla (D-20): mismos 19 ids, posiciones, huellas, anclajes y animaciones; cambian la isla, el hito, el nombre y la historia. Todo es `muestra`.

Qué existe:
- `mundos/acuarela/diseno.md`: concepto, historia (el cuaderno de viaje de una pintora de Cala Cantalar; la noche de Sant Joan, de la Explanada a la hoguera de Tabarca) y una sección por id del catálogo compartido (lugar real, papel, hito, historia, arte), paleta, cómo se pinta, decisiones y preguntas para Álvaro. Nombres de sitios reales de la costa de Alicante; `allday` (la única isla de evento) conserva el nombre compartido.
- `mundos/acuarela/lugares.json` (nombre, lugar real, hito, historia y anclajes por id), `tema.py` (estilo 02 del barco B02, ruido en píxeles de pantalla y periódico en las losas), `piezas.py` y `zonas/*.py` (las escenas de cada lugar).
- `mundos/acuarela/herramientas/cobertura.py`: por cada id de `tools/blender/lugares.json` comprueba entrada en `lugares.json`, sección en `diseno.md`, manifiesto e imágenes en `art/mundos/acuarela/<id>/`, y el nombre (igual al de arcilla en islas de evento, distinto en el resto). Sale con 1 si falta algo.
- `art/mundos/acuarela/<id>/`: 19 lugares, 116 imágenes, un `manifest.json` por lugar como en T18. La Fiestera a bordo es la pieza `tripulante` con `attach` al `slot_passenger` de `art/barco/estilos/acuarela` (B02).
- `tools/blender/mundo_acuarela.py` (el mundo, con `postprocess`: la pasada de acuarela sobre cada PNG, sin el velo exterior por las notas_render de B02) y `WORLDS` con `acuarela` en `render.py` y `mundos_arte.py`; `mundos_arte.py` admite un `postprocess(img, period)` opcional por mundo (en losas, sobre los tres periodos antes de recortar). `contact_sheet_mundo.py` conoce el mar y el barco de acuarela.

Comandos:
```
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/render.py -- --all --out tools/blender/out/t19a   # exit 0, 502 imágenes, ~300 s (acuarela ~126 s)
(el mismo con --out tools/blender/out/t19b) && diff -r tools/blender/out/t19a tools/blender/out/t19b             # exit 0: 556 archivos idénticos
diff -rq tools/blender/out/t19a art        # todos los PNG iguales a los del repo; sólo cambian 35 líneas sources_sha256 (ver desviaciones)
python3 tools/blender/check.py             # exit 0: 55 manifiestos, 504 imágenes; «mundo acuarela: 19 lugares válidos, 116 imágenes»
python3 mundos/acuarela/herramientas/cobertura.py   # exit 0: 19 lugares, 0 faltas
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/contact_sheet_mundo.py -- --mundo acuarela --out docs/informes/img/p002-t19-hoja-acuarela.png
pnpm test                                  # exit 0: 45 archivos, 478 pruebas
```
Hoja de contacto a escala de juego (dpr 2) sobre el mar del mundo: `docs/informes/img/p002-t19-hoja-acuarela.png`.

Desviaciones:
- Las `--all` se corrieron con `--out` en `tools/blender/out/` y no sobre `art/`: los manifiestos de `art/barco/**`, `art/mundos/arcilla/**` y los recursos viejos llevan un `sources_sha256` de antes (cambian `render.py` y `mundos_arte.py`), y regenerarlos habría tocado `art/mundos/arcilla/**`, fuera del alcance. Sus PNG salen idénticos; el próximo `--all` sobre `art/` sólo cambia esa línea.
- Costas: la junta entre los dos tramos de la Platja de Sant Joan se desplaza 2,2 u (`FASE_E`) para que no caiga en la costura de la losa (check.py la veía saltar 2,96 con límite 2,73), y las datileras del Postiguet miden 1,3 en vez de 1,85 (la copa tocaba el borde del agua de la losa de 288 px). Orilla, colisión y línea del mapa siguen dentro de lo que valida check.py.
- La geografía es libre: los sitios reales no están en su orden en la costa.

Sin probar:
- Nada carga todavía el arte de acuarela en el motor (T20). Cómo casan en el juego losas, esquinas y paseo sólo se ha visto en la hoja de contacto.
- Nombres, historia y lugares reales están pendientes de Álvaro (preguntas al final de `diseno.md`).

## 2026-09-29 — plan 002 T31: la entrada se ve en cada carga de `/`

La entrada (mini-mundo, letras 3D «BOIA», «Zarpar» y aterrizaje) ya no se ve sólo la primera vez: depende de la URL (D-21, pendiente Álvaro).

Qué existe:
- La puerta es `decideEntry({ pathname, search, hash, reducedMotion })` en `packages/engine/src/intro/entry.ts`, que el script de arranque serializa en línea. `/` a secas, en cada carga completa o recarga → entrada (o su variante quieta con movimiento reducido). Cualquier ancla, cualquier parámetro (`?menu=…`, `?intro=0`) o una ruta distinta de `/` → directa. Los parámetros de campaña (`utm_*`, `fbclid`, `gclid`, `msclkid`, `ttclid`, `igsh`, `igshid`) no cuentan. `?intro=1` la pide siempre («Ver la introducción» del pie).
- Sin marca de «ya la vio»: el script de arranque ya no lee ni escribe `boia.intro.v2` (la marca que quede en navegadores viejos se ignora).
- `mountMode(entry)` (mismo archivo) decide con qué modo arranca el montaje del hero: sólo reproduce la entrada que pidió el script de esta carga y nadie resolvió. Volver a `/` dentro de la app (Inicio del juego, enlaces internos) no ejecuta el script, encuentra la entrada ya resuelta o ninguna y entra directa. `intro-stage.tsx` la usa.
- D-21 en `docs/DECISIONES.md`; REQ-ENT-009 reescrito y REQ-ENT-001/008 sin «primera visita» en `docs/spec/02-entrada-y-landing.md` y en el índice `09-requisitos.md`.
- Pruebas: `entry.test.ts` (la URL decide, campaña, `?intro=1`, `mountMode`, una segunda carga con la marca vieja reproduce la entrada). e2e en `intro.spec.ts`: recarga y segunda carga de `/` reproducen la entrada; `/#tickets` y `/?menu=carnet` entran directas; «Ver la introducción» la repite; volver a `/` con Inicio desde `/juego` (tras EXPLORAR y tras cargar `/juego` directamente) no la repite ni recarga. Las pruebas de landing y tickets abren `/?intro=0`.

Comandos:
```
python3 tools/spec/check.py                                                   # exit 0
pnpm test && pnpm typecheck && pnpm lint                                      # exit 0; 45 archivos, 478 pruebas
E2E_PORT=3131 pnpm e2e --workers=2 e2e/landing.spec.ts e2e/intro.spec.ts e2e/demo.spec.ts e2e/tickets.spec.ts   # exit 0; 46 pasadas
```

Desviaciones:
- `docs/spec/09-requisitos.md` (fuera del alcance escrito) cambia en las filas de REQ-ENT-001, 002, 008 y 009: `check.py` exige que el índice repita la fuente y las marcas de cada definición.
- Por orden del orquestador (máquina compartida), sólo se corrieron las specs e2e de landing, intro, demo y tickets, no la suite entera.

Sin probar:
- Móviles reales y el navegador interno de Instagram (que añade sus parámetros): la lista de parámetros de campaña es una suposición razonable, no está medida.
- Atrás del navegador hacia `/` sin caché de página (bfcache) es una carga completa y reproduce la entrada; con caché, sigue donde estaba.

## 2026-09-29 — plan 002 T27: título 3D «BOIA» de la entrada, renderizado en Blender

El título del acto 2 ya no es texto plano: son las letras «BOIA» en 3D (extruidas, con bisel suave, cara naranja BOIA #F26A1B y cantos azul marino #12233F), que se mueven como el título de messenger.abeto.co. Todo es `muestra`.

Qué existe:
- `tools/blender/intro/titulo.py` (punto de entrada propio): cada letra es un texto de Blender (fuente integrada, engrosada) pasado a malla canónica. Se renderiza girada sobre su eje vertical de −24° a +24° en 17 pasos, con luz fija (clave arriba a la izquierda, contraluz y un relleno cálido): al girar, el bisel y la cara atrapan la luz. Todo sale en un solo render (cámara ortográfica y luz direccional; cada copia en su celda) de una hoja de 3128×704 px (fila = letra, columna = guiñada, celdas de 184×176).
- `art/intro/titulo/`: `letras.png` (1,58 MB, la que valida check.py), `letras.webp` (203 KB, la que pide la web) y `manifest.json` (kind `title-sheet`: rejilla, guiñada de cada columna, pivote, posición y ancho de cada letra en la palabra, generador con `sources_sha256`).
- `tools/blender/intro/check_titulo.py`, que `check.py` llama: rejilla = PNG, WebP del mismo tamaño, cada celda con su letra entera y margen transparente, centrada a guiñada ~0, el giro cambia la imagen, y el manifiesto es del `titulo.py` actual. Con `--diff` compara byte a byte con otra corrida.
- Motor (`packages/engine/src/intro/title.ts`, puro): `resolveTitleSheet` (manifiesto → hoja; si el texto de `copy.title` no es el de la hoja, no hay título 3D) y `titlePoses` (tiempo → pose de cada letra). Las letras suben una a una con rebote girando hacia la luz, luego se balancean, bambolean y giran cada una a su aire en un bucle de 6 s que cierra sin salto (armónicos enteros del periodo). Al pulsar «Zarpar» dan un saltito y se hunden una a una. Con movimiento reducido, un fotograma quieto.
- Configuración de la entrada **v3** (`entrada-mini-mundo-muestra-v3`): sección `title` con los tiempos y amplitudes de subida, reposo, salida y la guiñada del fotograma quieto.
- Web: `apps/web/lib/intro/title-canvas.ts` compone los recortes en un canvas 2D (sin WebGL; D-05). `intro-stage.tsx` pide la hoja **cuando el mini-mundo está listo** (no va en la precarga del arranque), y al decodificarla cambia el título a `data-title="3d"`. El texto «BOIA» sigue en el `<p>` para lectores de pantalla y como respaldo (sin hoja, o si llega ya aterrizando). `__boiaIntro.title` da `mode`, `requestedMs`, `loadedMs`, `draws` y la última `pose`.

Comandos:
```
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/intro/titulo.py      # ~17 s (Cycles en CPU), escribe art/intro/titulo/
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/intro/titulo.py -- --out tools/blender/out/rerun/intro/titulo
python3 tools/blender/intro/check_titulo.py --diff tools/blender/out/rerun                  # idénticos byte a byte
python3 tools/blender/check.py                                                              # exit 0; incluye intro/titulo
pnpm test && pnpm typecheck && pnpm lint                                                    # exit 0; 45 archivos, 474 pruebas (9 nuevas en title.test.ts)
E2E_PORT=3148 pnpm e2e --workers=2                                                          # exit 0; 60 pasadas, 14 omitidas (grabaciones y la prueba de T13)
pnpm build                                                                                  # ruta crítica de /: 168,5 kB gzip (límite de T14: 192); la hoja no entra
RECORD_TITLE=1 pnpm e2e record-titulo.spec.ts --workers=1                                   # grabaciones y capturas (GPU del Mac)
```
Grabaciones: `docs/informes/img/p002-t27-titulo-{movil,escritorio}.webm` (mini-mundo, subida, 5 s de reposo, «Zarpar» y salida). Capturas en reposo: `p002-t27-titulo-{movil,escritorio}.png`; fotograma quieto con movimiento reducido: `p002-t27-titulo-reducido-{movil,escritorio}.png`.

Desviaciones:
- **Cycles en CPU, no Eevee.** Con Eevee (GPU) dos corridas daban ±1 en uno o dos píxeles de la hoja, incluso sin SSS ni sombras. Cycles en CPU con semilla fija, 64 muestras y sin eliminador de ruido da los mismos píxeles. Además, el PNG que escribe Blender no salía igual byte a byte con los mismos píxeles (otro IDAT en una imagen tan grande): `titulo.py` relee el render y escribe el PNG él mismo con zlib. La WebP la escribe Blender y sí sale igual.
- La animación no está «horneada» en una secuencia de fotogramas: Blender da la luz del giro de cada letra (17 guiñadas) y la web pone la subida, el balanceo, el bamboleo y la salida con la pose de `titlePoses`. Así la hoja pesa 203 KB, el bucle cierra por construcción y el movimiento se ajusta en la configuración sin volver a renderizar.
- `packages/engine/src/world/swap.test.ts` (fuera del alcance escrito) leía como manifiesto cada carpeta de `art/` y fallaba con `art/intro/`: ahora se salta las carpetas sin `manifest.json` propio (una línea). Sin eso `pnpm test` no pasa.
- `render.py` no se toca: el título tiene su propio punto de entrada y `render.py -- --all` no lo regenera. `check.py` sólo gana la llamada a `check_titulo` (dos líneas y el comentario).
- La fuente es la integrada de Blender (Inter), engrosada con `offset`: no hay tipografía de BOIA todavía.

Sin probar:
- Móviles reales: nitidez (la hoja tiene la mayúscula a 112 px; en un móvil de densidad 3 se amplía ×1,6) y el coste del canvas en la pausa (4 `drawImage` por fotograma).
- Con movimiento reducido, si la hoja llega después de que el título termine de fundirse, el título plano cambia al 3D de golpe (sin fundido).

## 2026-09-29 — plan 002 T18: arte del mundo Arcilla (B05) desde la exploración de mundos

El arte de juego del mundo de arcilla, lugar a lugar, con la misma cámara (30°, D-13) y la misma densidad (88,2759 px/u) que el barco B05. Todo es `muestra`.

Qué existe:
- `art/mundos/arcilla/<lugar>/`: 19 lugares, 51 piezas y 116 PNG, con un `manifest.json` por lugar (kind `place`, `tools/blender/place.schema.json`). Cada pieza trae su imagen, `pivot_px`, `map_pos` y `offset_units` (unidades de la maqueta, relativas a `place.pos`), anclajes (con `anchors_doc`), huella, `hitbox_hint` y `proximity_hint`, el tipo de colisión (`bloquear`, `rebote`, `ralentizar`, `recoger`, `disparador` o `ninguna`), animaciones y variantes. Las losas llevan `tile` y las esquinas `corner`. `place` dice a qué entrada de mapa.json apunta, sus instancias, `event_island` y `shared_name`: el nombre compartido de las islas de evento, que es sólo `allday`.
- **Ids de lugar** (catálogo compartido `tools/blender/lugares.json`, con `ref` y `pos` a mapa.json). Otro mundo sólo tiene que dar arte a estos mismos ids:
  - `puerto`: El Varadero. Piezas: paseo central con muelle y caseta, `escollera_oeste`, `escollera_este`, `baliza_verde`, `baliza_roja`, `anillo` (spawn), `boia` (la de la entrada), `bocadillo` y `whatsapp`.
  - `cala`, `allday` (isla de evento, variantes `venta` y `recuerdo`), `fotos`, `tienda` y `ultima`: una isla por lugar.
  - `fiestera`: la Fiestera pidiendo ayuda (`pide`, 6 fotogramas), `cocodrilo_1..4` (`idle` 4, `sumergirse` 6, `emerger` = `reverse_of` sumergirse), `posidonia`, `roca_1..3` y `tripulante`: la Fiestera a bordo (`baile`, 6), con `attach` al `slot_passenger` de `art/barco/estilos/arcilla`.
  - `naufrago` (banco, náufrago y balsa), `restos` (variantes a, b y c; instancias = `zonas/marvivo/restos`), `cofres`, `botellas` (la botella de REQ-IDE-040), `delfin` (`salto`, 8) y `remolino` (`giro`, 8).
  - `circuito`: `salida`, `cp1`, `cp-s`, `cp-a`, `cp2` y `meta` (arcos con anclajes `pie_a`/`pie_b`), `semaforo`, `cartel`, `dents`, `freu`, `roca`, `medusa`, `cocodrilo` (variantes derecha/izquierda) y `boia_carril` (a y b).
  - `faro` y `canon`: islas de los minijuegos, con anclajes `linterna` y `boca`.
  - `costa_oeste` y `costa_este`: losas verticales de 640×768 px. `costa_sur`: el paseo, en losa horizontal de 768×288, y las piezas `esquina_oeste` y `esquina_este`, de 1008×768. Las losas llevan `shore_px`, `collision_px`, `outer_fill` y `map_line` (la línea de mapa.json en px). Las fases encajan con las esquinas: las laterales empiezan en y = −2,65 + n·17,40 y el paseo en x = −8,70 + n·8,70.
- mapa.json (misma estructura, sólo añadidos): `minijuegos` con `faro` (−10,5, −25,2; el antiguo solar L2) y `canon` (−9,0, −18,6), y `costas/costa_sur` (y = 27,8). `solares_l2` queda vacío. `herramientas/mapa.py` cuenta las islas de `minijuegos` como tierra. `validar.py` da 0 errores.
- `tools/blender/mundos_arte.py` (genérico: encuadre, cámara, render, losas de tres periodos con recorte del central y fundido a `outer_fill`, manifiestos) y `mundo_arcilla.py` (el mundo: escenas desde `mundos/arcilla/zonas/*.py`, piezas por nombre y distancia, y lo que no está en la maqueta: faro, cañón, losas, esquinas, fotogramas y tripulante). Para añadir un mundo: `mundo_<id>.py` y una entrada en `WORLDS` (render.py y mundos_arte.py).
- `render.py -- --all` renderiza también los mundos; `--mundo arcilla [--lugar cala]` hace sólo uno. `check.py` valida `art/mundos/<mundo>/`: un lugar por id del catálogo, referencias a mapa.json, la cámara y la densidad del barco del mundo, y cada pieza. `contact_sheet_mundo.py` saca la hoja de contacto.

Comandos:
```
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/render.py -- --all        # exit 0, 386 imágenes, ~170 s (Arcilla: 116 imágenes, ~83 s de render)
cp -R art tools/blender/out/run1 && (otra vez el mismo --all) && diff -r tools/blender/out/run1 art   # exit 0, 421 archivos idénticos
python3 tools/blender/check.py            # exit 0: 35 manifiestos, 386 imágenes; «mundo arcilla: 19 lugares válidos, 116 imágenes»
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/contact_sheet_mundo.py -- --mundo arcilla
python3 mundos/arcilla/herramientas/validar.py   # 0 errores
```
Hoja de contacto a escala de juego (48 px de eslora × densidad 2) sobre el mar del mundo: `docs/informes/img/p002-t18-hoja-arcilla.png`.

Desviaciones:
- **Reproducibilidad.** Con las piezas de la maqueta tal cual, dos corridas no daban los mismos bytes, por dos causas:
  - `bmesh` crea las caras de `create_uvsphere` en otro orden y con otro vértice inicial en cada sesión, así que cambia la diagonal con la que se dibuja cada cuadrilátero. `mundo_arcilla.py` sustituye `Builder.mk` por una copia que triangula por la diagonal más corta, orienta cada grupo de caras por el signo de su volumen y ordena vértices y caras. `mundos/arcilla/escena.py` no se toca.
  - La dispersión subsuperficial (SSS) de Eevee da ±1 en algunos píxeles de un render a otro. El arte de los mundos se renderiza sin SSS (`TemaJuego`): de media cambia unos 4 niveles y no se nota a escala de juego. El barco B05 la conserva.
- El sol, la luz y la hora son los de «día» del tema, que coinciden con el estudio del barco. Día y noche siguen siendo L2 (REQ-MUN-005).
- Los manifiestos existentes (`art/barco/**`, costa, islas, rocas, boia, planeta) llevan `sources_sha256` de antes de este cambio en `render.py`. Al regenerarlos sólo cambia esa línea; se dejan como estaban porque `art/barco/**` queda fuera del encargo. El próximo `--all` los pone al día sin tocar ningún PNG.
- El puerto de la maqueta ocupa todo el borde de abajo. Aquí la pieza `puerto` es el tramo central del paseo (x = ±6,4), con muelle, caseta, dos casitas y farolas; el resto del borde lo ponen las losas de `costa_sur`.
- La tripulante es una capa aparte que se dibuja encima del barco (imágenes `base/<dir>.png`, sin `_p`) en `slot_passenger`. No hay fotogramas nuevos en `art/barco/`.
- Los secretos (cueva, ánfora, campana, círculo de boies), la fila de boies del borde de arriba y la grada con el juez del circuito no tienen arte: no estaban en la lista.

Sin probar:
- Nada lo carga todavía en el motor (T17 y T20). Tampoco se ha probado cómo casan en el juego las losas con las esquinas y con el paseo del puerto: por ahora sólo se ha visto en la hoja de contacto.

Fuera del alcance, con permiso del orquestador: `packages/engine/src/world/swap.test.ts` leía como manifiesto cada carpeta de `art/` salvo `barco`, y con `art/mundos/` fallaba. Ahora también se salta `mundos`.

## 2026-09-29 — plan 002 T23: minijuegos, Vigilancia del faro y Cañón contra tiburones

Los dos minijuegos de REQ-AVE-035…039 (L1 por D-20) detrás de INICIAR_MINIJUEGO, con ids `faro` y `canon`. Reglas, números, textos y dibujo son `muestra`.

Qué existe:
- `packages/engine/src/minigames/` (`@boia/engine/minigames`, sin Pixi):
  - `faro.ts`: escena de noche. El haz sigue al dedo o al puntero, o gira con ←/→ (A/D). La bandera se reconoce tras `identifyS` de luz continua, con un anillo de progreso. Pirata: negra con calavera y huesos. Señuelo: oscura con rayas. Mercante: clara con banda diagonal. Así no depende sólo del color. ALARMA (botón, Espacio o Intro) sobre un pirata lo hace dar media vuelta. Sobre otro barco o sobre el mar vacío cuenta como falsa alarma. Un pirata que cruza se escapa. Fin: `goal` piratas (gana), o tiempo, `maxErrors` falsas alarmas o barcos agotados (pierde). La flota sale de la semilla.
  - `canon.ts`: se apunta arrastrando (el círculo de caída sigue al dedo y mide lo mismo que la salpicadura), con el puntero o con las flechas. Al soltar, con FUEGO o con Espacio sale una bola en arco, con sombra, que salpica. Los tiburones siguen patrones versionados (`SHARK_PATTERNS[1]`: recto, zigzag, círculo), se sumergen, cambian de rumbo y rebotan. Uno sumergido no se asusta; uno asustado huye entero, sin heridas, y otro ocupa su sitio. Fin: `goal` tiburones (gana), o tiempo o munición (pierde).
  - `session.ts`: `LocalSessionAuthority`, el «servidor» de la versión de prueba (REQ-AVE-038). La sesión guarda id, juego, versión, semilla, huella de la configuración, inicio y límites. Vive en memoria, así que recargar la invalida. Se liquida una sola vez (`replayed`). Anula la marca por abandono, pestaña oculta, cambio de configuración, otra semilla o versión, o una marca imposible. También si la duración pasa del límite, pasa del reloj real o es menor que el mínimo posible con esa semilla (`minPlausibleMs`: en el faro, la entrada en escena del pirata n-ésimo; en el cañón, vuelo más recargas).
  - `rewards.ts`: `grantMinigameReward`. Sólo concede con sesión válida y partida ganada. Lo hace con `grantWorldReward({ sourceRef: 'minigame:<id>', policy })` de `@boia/store`, así que la política `once`/`daily`/`season` e ids como `world_reward:minigame:faro@2026-09-29` son los del libro. `record_only` no concede. Los límites `maxPoints`/`maxCoins` acotan el premio. Guarda la marca personal (`boia.minijuegos.marcas`) sólo de partidas válidas. Políticas de muestra: faro diaria (15 puntos y 5 monedas), cañón por temporada (20 puntos y 8 monedas).
  - `controller.ts` (ciclo sin DOM: instrucciones, juego, pausa, final; paso fijo de 1/60 s; la pausa no cuenta) y `host.ts` (`mountMinigame`: capa a pantalla completa con instrucciones breves, estado en texto, aviso sin destellos, botón de acción grande, pausa, salida y volumen). El teclado no llega al mar. Respeta el movimiento reducido. Ocultar la pestaña pausa la partida y le quita el premio (se ve «sin premio»). También tiene sonido sintetizado y telemetría opcional (`onEvent`).
  - `skin.ts`: el estilo de cada mundo. `arcilla` en barro con contorno grueso, `acuarela` en aguadas sin contorno; otro mundo usa su mar y su acento.
  - `testing.ts` (`@boia/engine/minigames/testing`): jugadores automáticos y `playHeadless` para las pruebas.
- `packages/engine/package.json`: exports `./minigames` y `./minigames/testing`.
- `apps/web/app/juego/minigame-layer.tsx`, el punto de montaje. Muestra el panel de la isla (evento `minigame` con `available: true`: explica la actividad y abre con «Jugar»; se cierra al alejarse). También abre la ruta de prueba `/juego?minijuego=faro|canon` (se consume al salir) y monta la capa. Premios con `gameRepository().progress` (T22). `game-canvas.tsx` pasa `MINIGAME_REGISTRY` al motor como `runtime.minigames` y monta la capa: unas diez líneas.

Comandos:
```
pnpm test --filter minigames      # 25 pruebas del motor (finales de cada juego, sesión, semilla, duración, dibujo)
pnpm test --filter minigame-layer # 4 pruebas: once/daily/season con el repositorio local tras recargar
pnpm test && pnpm typecheck && pnpm lint
E2E_PORT=3123 pnpm e2e minijuegos # 3 specs × móvil y escritorio
```
En el navegador: `/juego?minijuego=faro` y `/juego?minijuego=canon`.

Desviaciones:
- Una alarma sobre el mar vacío cuenta como falsa alarma (REQ-AVE-036 no lo dice). Los escapes no cuentan como error, así que los cuatro finales del faro son alcanzables.
- Ocultar la pestaña no cierra la partida: la pausa y la deja seguir sin premio (REQ-AVE-038 invalida la marca; REQ-AVE-035 pide pausa).
- `record_only` guarda la marca en el dispositivo (`KeyValueStore`), no en `@boia/store`: el repositorio no tiene récord de puntuación, sólo de tiempo.
- La ruta de prueba es un parámetro de `/juego` (`?minijuego=`), no una página aparte, para que salir deje ver el mar de verdad.
- `apps/web/e2e/minijuegos.spec.ts` está fuera del alcance escrito, pero lo pide «Hecho cuando».

Sin probar:
- Todavía no hay islas Faro y Cañón en el mapa (las pone T20 con `start_minigame` y `gameId` `faro`/`canon`). El panel de la isla sólo está probado con el evento del motor en pruebas unitarias; en el navegador se ha probado sólo la ruta de prueba.
- Las skins de Arcilla y Acuarela sólo se han pintado en pruebas con un contexto falso: aún no hay mundos con esos ids en el registro.
- En un móvil real.
- Con la máquina cargada (load ~20), `pnpm e2e` con 5 workers da fallos de tiempo intermitentes en `intro.spec.ts` y `juego-hud.spec.ts`, que no tocan los minijuegos. Con `--workers=2` pasan.

## 2026-09-29 — plan 002 T25: entradas que dan el sello directamente

Compra de prueba sin ticketera (D-20, REQ-COM-035) sobre `@boia/store` (T16), todo en este navegador. Precios, textos y descuentos son `muestra`.

Qué existe:
- `apps/web/lib/ticketing/` (nuevo):
  - `adapter.ts`: `TicketingAdapter`, la interfaz del adaptador de D-06/REQ-COM-015. `start(eventId)` prepara la compra (id estable, precio, descuento, flujo `inline` o `redirect`). `confirm` es opcional: lo tiene sólo el sandbox; con una ticketera real confirma su webhook en el servidor. El comentario explica cómo encaja Fourvenues (`metadata.internal_id` = id de compra).
  - `sandbox.ts`: `createSandboxTicketing(repo)`. `start` rechaza eventos que no están a la venta (`not_on_sale`, también los finalizados). `confirm` llama a `purchases.confirmSandbox`, que da el sello una vez por id de compra (`duplicate` si se repite, `already_stamped` si otra compra del mismo evento ya lo dio). Después concede el logro de la entrada, buscado por su disparador `buy_ticket`, no por id.
  - `pricing.ts`: precios `muestra` por evento (25 € el All Day de primavera, 15 € la Noche de mayo, 20 € por defecto). `applicableDiscount` sólo aplica un descuento encontrado por el visitante, vigente ahora y de ese evento (o sin evento); si hay varios, el que más descuenta.
  - `checkout.tsx` + `checkout.css`: `SandboxCheckout`, un `<dialog>` modal, el mismo en la landing y en el mar. Muestra «Compra de prueba», el evento, el precio de muestra, el descuento (o «Sin descuento»), el total y el aviso de que no se cobra nada y todo queda en este navegador (REQ-IDE-051). Tras confirmar enseña el aviso: sello añadido, ya confirmado o ya tenías el sello, y el logro si es nuevo. Después, «Ver Mi Carnet». Escape y tocar fuera cierran sólo el checkout.
  - `notices.ts`: `purchaseNotices`, los avisos del mar (sello y logro) con ids estables. `copy.ts`: todos los textos.
  - `index.ts`: `ticketing()`, la ticketera que usa la web (hoy el sandbox). Ahí se enchufará la real.
- `apps/web/lib/repo.ts`: `gameRepository` y `seaWorld` salen de `app/juego/repo.ts`, que los reexporta. Motivo: la landing también los usa, y EXPLORAR navega sin recargar, así que la landing y /juego comparten el mismo repositorio con las mismas opciones.
- Landing (`(landing)/components/buy-button.tsx`): «Comprar entradas» en el evento prioritario, en los próximos y en el panel de Tickets.
  - Con JavaScript es un botón que carga el checkout y el repositorio al pulsar, fuera de la ruta crítica.
  - Sin JavaScript, o antes de hidratar, sigue siendo el enlace a la ticketera de muestra (REQ-ENT-017).
  - Sigue midiendo `ticket_click_out`. Sólo sale en eventos que se pueden comprar (`canBuy`): un evento finalizado nunca muestra compra.
- /juego: el panel de la isla de evento (`world-ui.tsx`) cambia el enlace «Entradas» por el botón «Comprar entrada» (`islandCanBuy`: sólo si el TICKET se activó y el evento está a la venta). En `game-canvas.tsx`, el checkout; al confirmar, los avisos del mar; «Ver Mi Carnet» abre el menú en Mi Carnet.

Comandos:
```
pnpm test && pnpm typecheck && pnpm lint   # exit 0; 42 archivos, 436 pruebas
E2E_PORT=3134 pnpm e2e --workers=2         # exit 0; 54 pasan, 10 omitidas (las de siempre); e2e/tickets.spec.ts en móvil y escritorio
node apps/web/scripts/landing-budget.mjs   # 166,5 kB de 1024 kB: el checkout no entra en la ruta crítica
```

Desviaciones:
- Los precios no están en el evento, porque `@boia/contracts` no tiene precio y `packages/store` no se podía tocar. Viven en `lib/ticketing/pricing.ts` hasta que la ticketera o el Admin los den.
- El descuento no se escribe a mano: se aplica solo el mejor que el visitante haya encontrado. Un código tecleado no vale porque el repositorio exige que esté encontrado.
- Actualizados `e2e/landing.spec.ts` y `e2e/intro.spec.ts`: el clic de compra ya no abre una pestaña, abre el checkout.
  - La prueba «bundle del juego bloqueado» compra antes una vez en otra pestaña y no bloquea los chunks que esa compra carga: el checkout y `@boia/store` los comparte con /juego, así que no son «sólo del juego». Sigue bloqueando la página del juego y lo demás.
  - Los checkouts de las pruebas esperan hasta 20 s: se cargan al pulsar.
- Con todo el suite en paralelo y el Mac muy cargado (carga ~27, otras sesiones), fallaron por tiempo pruebas de `intro.spec.ts` y `juego-hud.spec.ts` que no tocan la compra. Con `--workers=2` pasa todo.
- El texto `event.buy.aria` de `lib/i18n/es.ts` («se abre la ticketera en otra pestaña») queda sólo para el enlace sin JavaScript; el botón usa el de `copy.ts`.

Sin probar:
- La landing sigue pintando eventos de `SAMPLE_CONTENT`, no del repositorio. Si el Admin marca un evento como finalizado, la landing seguirá mostrando el botón hasta que se conecte al repositorio. El checkout sí vuelve a mirar el estado en el repositorio y no deja comprar.
- En un móvil real: el `<dialog>` con el teclado en pantalla y el Atrás de Android (no cierra el checkout; lo cierra Escape o tocar fuera).

## 2026-09-29 — plan 002 T22: Mi Carnet y botellas

Mi Carnet (REQ-IDE-010…022) y botellas (REQ-IDE-040…044) sobre `@boia/store` (T16), todo en este navegador (D-20). Textos, avatares, números y el dibujo de la botella son `muestra`. Las 5 preguntas no: son las de v14 §44.1, textuales.

Qué existe:
- `apps/web` usa ya `@boia/store` (en `package.json` y `transpilePackages`). `app/juego/repo.ts`: `gameRepository()`, la única llamada de la web a `browserRepository`. Le pasa el validador del mar y las botellas de muestra recolocadas. `useRepoData` y `useRepoRevision` vuelven a leer con cada cambio.
- Menú de a bordo, sección 🪪 Mi Carnet (`menu/sections/carnet.tsx`):
  - sin Carnet, la invitación «Crear mi Carnet»;
  - el alta rápida pide apodo (invitado, sin email), avatar neutro o foto del dispositivo (reducida a 256 px en JPEG) y las 5 preguntas textuales, todas opcionales; antes de crear avisa de qué será público (REQ-IDE-013);
  - con Carnet, primero se ve como lo verán los demás: «Miembro de BOIA desde», rango, puntos, respuestas (pregunta pequeña y respuesta grande, sólo las contestadas), sellos como colección, logros, barco y cosméticos. Debajo, «Editar mi Carnet» y la botella propia;
  - REQ-IDE-051 (llegó con T15 al unir main): Carnet y botella dicen en pantalla que todo se guarda sólo en este navegador y que la botella sólo la ve quien la escribe. No hay botón «Compartir».
- `CarnetCard` (`juego/carnet/`) es la misma vista en el menú, en «VER SU CARNET» (hoja sobre el mar) y a pantalla completa en `/carnet` (el propio) y `/carnet/<id>` (cualquiera), la futura vista para compartir. `?menu=carnet` abre el menú en Mi Carnet. El barco del Carnet sale de la preferencia `barco` del repositorio, que `/juego` escribe al aplicar un estilo.
- Botellas:
  - en el HUD, una barra justo encima de la zona del joystick: ✉️ abre la botella propia y aparecen hasta dos botellas cercanas («Tu botella», «Botella de X»);
  - la propia se echa en un sitio de mar junto al barco (por la popa si se puede), se edita o se retira; hace falta Carnet; una sola activa (la segunda se rechaza con `conflict`, como en la spec), hasta 140 caracteres;
  - una encontrada se lee (el repositorio lo registra y la botella sigue en el mar), trae el apodo de su autor y «VER SU CARNET», y se puede reportar con un motivo opcional;
  - no dan puntos ni monedas.
- `packages/engine/src/bottles/` (`@boia/engine/bottles`, sin Pixi):
  - `sea.ts`: `bottleSpotProblem` (tierra = fuera de los límites con 32 u de margen, o a menos de 20 u de la colisión de un lugar), `bottlePositionValidator` para el repositorio, `findDropSpot` y `settleInSea`, que deja en el mar las botellas de muestra que no lo están (la primera, junto a la salida);
  - `finder.ts`: `nearbyBottles`, que las encuentra a 150 u y las suelta a 240 u;
  - `view.ts`: `BottleLayer`, en la capa de objetos, ordenada con el barco y cabeceando.
- `Game.setBottles(markers)` y `GameOptions.bottleAsset` (id del arte, configurable) en `game.ts`. `@boia/world`: `bottle.ts` (`BottleMarker`, `bottleObject`, `BOTTLE_PLACEHOLDER_ASSET`). Sin arte, la botella se dibuja por código.

Comandos:
```
pnpm test && pnpm typecheck && pnpm lint   # exit 0; 40 archivos, 420 pruebas
E2E_PORT=3122 pnpm e2e                     # exit 0; 52 pasan, 10 omitidas (las de siempre); e2e/carnet.spec.ts en móvil y escritorio
```

Desviaciones:
- Pintar las botellas pedía un gancho en el motor fuera de `bottles/`: `setBottles` en `game.ts` (unas 20 líneas, sólo añade) y la entrada `./bottles` en `packages/engine/package.json`. Meterlas como objetos del mundo con `setWorld` habría reiniciado el runtime (diálogos y efectos) cada vez que se echa o se retira una botella.
- Las botellas de muestra de T16 tienen coordenadas del mapa de Arcilla y caen fuera del mapa de la demo. `repo.ts` las recoloca con `settleInSea`. Cuando T20 traiga el mapa de Arcilla, las que caigan en el mar se quedarán donde están.
- El encargo pedía una vista para compartir, pero REQ-IDE-051 (T15) prohíbe presentar nada como compartido en la versión de prueba. `/carnet/<id>` existe, sin botón de compartir y con el aviso de que todo queda en este navegador. En otro dispositivo el enlace dice «Carnet no encontrado».
- Al reportar, la botella sigue visible para quien la reporta. Retirarla para todo el mundo es cosa del Admin (`admin.removeBottle`).

Sin probar:
- Subir una foto del dispositivo (`createImageBitmap` + canvas): ni en pruebas ni a mano, y menos en móvil (HEIC de iOS, fotos grandes).
- Que el arte de T18 cargue con `bottleAsset`: sin arte, sólo se ha visto el dibujo por código.

## 2026-09-28 — plan 002 T15: decisión D-20 y spec de la versión de prueba

Sólo documentos. Las decisiones de Hernán del 2026-09-28 quedan como D-20 y la spec las recoge.

Qué existe:
- `docs/DECISIONES.md`: **D-20** (Hernán, pendiente Álvaro) con sus siete puntos: minijuegos, segundo mundo y temporadas como mundos adelantados de L2; todo en el navegador detrás de un repositorio hasta Supabase (cada botella sólo la ve quien la escribe); sello directo por sandbox; «Probar admin» sin login; «BOIA» en letras 3D de Blender; EXPLORAR muestra el puerto (El Varadero); un mapa compartido con skins y nombres por mundo. Lleva la lista «Para la versión final» y la nota de lo que falta aprobar. Notas fechadas en D-02, D-08 y D-19 que remiten a D-20. Preguntas nuevas para Álvaro: P10 (alcance), P11 (mundos, historias y nombres), P12 (letras 3D y puerto), P13 (enseñar la versión de prueba y enlaces reales).
- `docs/spec/`:
  - Cambian REQ-ENT-003 (letras 3D), REQ-ENT-012 (puerto tras Explorar), REQ-MUN-018 (mapa con puerto, Faro y Cañón), REQ-MUN-026 (arranca `faro` y `canon`), REQ-AVE-001 (primera boia en el puerto), REQ-AVE-010 (destino por ID de lugar) y REQ-ADM-032 (mundo activo como temporada; pierde `[provisional]`).
  - Pasan de L2 a L1 REQ-AVE-035 a REQ-AVE-039 (minijuegos). REQ-AVE-038 dice que en la versión de prueba se valida en el navegador.
  - Nuevos: REQ-MUN-035 a REQ-MUN-037 (mapa compartido, nombres por mundo, Arcilla y Acuarela) y, sólo para la versión de prueba, REQ-ARQ-025 (repositorio en el navegador), REQ-IDE-051 (invitado con apodo, botella propia), REQ-COM-035 (sello por sandbox) y REQ-ADM-039 («Probar admin»).
  - `00-indice.md`: reglas 4 y 5 de alcance para D-20, desviaciones nuevas y una tabla «Versión de prueba (D-20)». `08`: entidades de sesión de minijuego y de lugar/skin en L1. `11-glosario.md`: mapa compartido, lugar, mundo, skin de lugar, puerto de salida, Faro y Cañón, versión de prueba.

Comandos:
```
python3 tools/spec/check.py        # exit 0; 286 requisitos (antes 279): L1 256 · L2 28 · diferido 2; centinelas 10/10
python3 tools/spec/test_check.py   # exit 0; 18 pruebas
grep -n "D-20" docs/DECISIONES.md
```

Desviaciones:
- `check.py` sólo admite `L1`, `L2` y `diferido`, así que no hay alcance `L1-demo`: lo adelantado lleva `L1` con D-20 en la fuente y «Adelantado de L2 (D-20)» en las notas de 09. Lo que sólo vale para la versión de prueba lleva `L1`, empieza por «En la versión de prueba» y en las notas de 09 dice qué lo retira.
- Los requisitos de la versión final que D-20 aplaza (REQ-ARQ-002, REQ-ARQ-010, REQ-IDE-002, REQ-IDE-005, REQ-IDE-006, REQ-IDE-021, REQ-COM-017, REQ-ADM-002 a REQ-ADM-004) no se tocan: las excepciones van en requisitos aparte.
- Siguen en L2 duplicar temporadas (REQ-ADM-033) y configurar minijuegos desde el Admin (REQ-ADM-036): el plan 002 no los construye.

Sin probar:
- Nada que ejecutar más allá de las dos comprobaciones de la spec. `mundos/arcilla/diseno.md` todavía dice que Faro y Cañón son L2 (un solar vacío); no está en el alcance de este encargo.

## 2026-09-28 — plan 002 T16: repositorio local, persistencia en el navegador tras una interfaz sustituible

Una sola capa de datos para toda la demo, sin React: `packages/store` (`@boia/store`). Hoy guarda en el navegador (D-20); Supabase implementará la misma interfaz más adelante. API completa en `packages/store/README.md` y comentada en `src/repository.ts`.

Qué existe:
- `BoiaRepository` (`src/repository.ts`): `identity` (invitado sin email), `carnet`, `progress`, `purchases`, `bottles`, `content`, `admin`, más `status()`, `revision()` y `subscribe()`. Todo es asíncrono. `status`, `revision` y `subscribe` se pueden pasar sueltas (`useSyncExternalStore(repo.subscribe, repo.revision)`).
- `createLocalRepository(opts)` y `browserRepository(opts)`, uno por pestaña. En el servidor, `browserRepository` da uno nuevo en memoria en cada llamada. Opciones: `validate.bottlePosition`, `validate.placePatch` y `validate.skinPatch`, para que el motor o `@boia/world` rechacen tierra o lugares inválidos con su motivo. También `sample` (sustituir partes de la muestra, p. ej. las botellas con coordenadas del motor) y `now`.
- Libro con las reglas de T06 (`src/ledger.ts`):
  - ids estables elegidos por el repositorio: `world_reward:<sourceRef>[@día|@season:<mundo>]`, `achievement:<id>`, `cosmetic:<id>`, `stamp:<purchaseId>` y `compensation:<txId>`;
  - puntos y monedas derivados, nunca guardados ni asignables;
  - las compensaciones invierten la original una sola vez;
  - nunca hay saldo negativo;
  - al cargar, el libro se vuelve a pasar por las reglas, así que un libro retocado a mano no fabrica saldo.
- Recompensas con política `once`, `daily` (día de Europe/Madrid) o `season` (mundo activo). Los logros llevan el premio de su definición y, si la tiene, su cosmético. Los secretos no se ven hasta obtenerlos. Cosméticos con monedas y equipado por ranura; descubrimientos, descuentos encontrados (con estado vigente o caducado), misiones, récords locales, contadores y preferencias.
- Compra de prueba `purchases.confirmSandbox`: el sello entra una vez por id de compra y nunca dos por evento. Sólo se compra un evento a la venta. El descuento tiene que estar encontrado, vigente y ser de ese evento.
- Carnet: apodo de 2 a 30 caracteres, único sin distinguir mayúsculas; «Miembro desde»; foto como data URL con límite; las 5 preguntas en `@boia/contracts` (`CARNET_QUESTIONS`). Una prueba las compara con la migración de T06. `CarnetView` trae puntos, rango, logros, sellos y cosméticos. Tres miembros ficticios de muestra, con Carnet y botella.
- Botellas:
  - una activa por identidad; de 1 a 140 caracteres contados como Postgres;
  - hace falta Carnet para escribir y reportar;
  - leer no la quita y queda registrado; un reporte por persona;
  - retirada por moderación, también de las de muestra;
  - no dan puntos.
- Contenido con muestra más cambios del Admin, que siempre ganan. Áreas con id: `events`, `homeBlocks`, `artists`, `albums`, `photos`, `promotions`, `discounts`, `achievements`, `cosmetics` y `ranks`. Además, `places` (cambio compartido por id de lugar: x, y, params, enabled; vale en todos los mundos), `skins` (por mundo y lugar: nombre, textos, arte, oculto), `texts` y `activeWorld`. `content.home()` devuelve el `HomeContent` de `@boia/contracts`.
- Admin (`admin.*`):
  - operaciones: `upsert` validado (rechaza con motivo), papelera (`remove` y `restore`), `reorder`, `setPlace` y `setSkin` (mezclan con el cambio anterior), `setText`, `setActiveWorld`, moderación de botellas y reportes, y `compensate`;
  - `reset(area | 'all')` y `overridden(area)`;
  - auditoría local sólo de añadir, con autor `admin-demo`, fecha, motivo, antes y después.
- Almacenamiento (`src/storage.ts`, `src/migrations.ts`):
  - un documento JSON en `localStorage['boia.store']` con `schemaVersion` 1 y migraciones paso a paso (hoy ninguna);
  - si falla, sigue en memoria y lo dice con `status().issue` y `message` (textos `muestra`). Motivos: `unavailable`, `blocked`, `quota` (a mitad de visita), `corrupt` y `migration_failed` (se copia en `boia.store.backup` y se empieza de cero), y `newer_schema` (no se toca);
  - otra pestaña que cambia los datos provoca recarga y aviso con `external: true`.
- `@boia/contracts`: nuevos `carnet.ts` (preguntas, límites y `charLength`) y `progress.ts` (`LEDGER_KINDS`, `ACHIEVEMENT_TRIGGERS`, `BOTTLE_STATUSES` y `PURCHASE_STATUSES`; una prueba los compara con `Constants` de `@boia/db`). En `content.ts`: `albumSchema`, `discountSchema` y `discountStatus`.

Comandos:
```
pnpm test --filter store          # 5 archivos, 44 pruebas
pnpm test && pnpm typecheck && pnpm lint   # exit 0; tras unir T17: 37 archivos, 392 pruebas
```

Desviaciones:
- localStorage, no IndexedDB: el documento es pequeño, la lectura es síncrona y es lo que ya usa la demo.
- La muestra de contenido está copiada de `apps/web/lib/landing/sample-content.ts`, que la landing sigue usando hasta que lea de `@boia/store`. El evento de primavera va a la isla `allday` del mapa compartido, no a la `isla-primavera` del mundo de plan 001.
- Un logro se concede una vez por id, sea cual sea su versión (la base de datos lo permite por versión). Una compra del mismo evento con otro id no da segundo sello: devuelve `already_stamped` en vez de fallar, como haría la base de datos.
- `confirmSandbox` concede el sello, pero no el logro de entrada: eso lo decide quien llama (T25).
- Las posiciones de las botellas de muestra salen de `mapa.json` (u_maq × 24,87). Si el mapa del motor de T17 usa otro origen, se pasan otras con `sample.bottles`.
- `pnpm-lock.yaml` cambia por el paquete nuevo.

Sin probar:
- En un navegador real: el evento `storage` entre pestañas, Safari en modo privado y la cuota llena. En las pruebas se simulan con almacenamientos falsos.
- Nadie consume todavía el paquete. El primero tiene que añadir `@boia/store` a `apps/web/package.json` y a `transpilePackages`.

## 2026-09-28 — plan 002 T17: varios mundos en el motor

Un mapa compartido y varios mundos encima (D-20, Hernán). Todo es `muestra`.

Qué existe:
- `packages/world/src/worlds/`:
  - `map.ts`: `SharedMap` (id, bounds, `spawn`, `port`, `introLanding`, sectores, `places`) y `Place` (id estable, nombre común, categoría, posición, geometría, comportamientos y parámetros). La cabecera explica cómo pasa `mundos/arcilla/mapa.json` a este modelo (para T20).
  - `skin.ts`: `WorldSkin` (estilo de barco de `art/barco`, paleta del mar, acento de la interfaz, ranura de música, costa, `places` por id y `names`, los nombres propios del mundo) y `PlaceSkin` (asset, textos, bocadillos que sustituyen a los del DIÁLOGO, escala y `hidden: true`). Sin `asset`, el arte es `mundos/<mundo>/<lugar>`, es decir, `art/mundos/<mundo>/<lugar>/manifest.json`.
  - `compose.ts`: mapa + skin → el `WorldConfig` de siempre, con el id del lugar como id del objeto. Un lugar sin skin sale con `placeholder:sin-skin` (el motor lo pinta en magenta rayado con un «!») y mantiene su comportamiento. Una skin o un nombre de un lugar desconocido lanza `SkinError`, y también unos bocadillos para un lugar sin DIÁLOGO. `renamePlace(…, scope)`: `{ world }` pone el nombre propio de ese mundo; `'all'` cambia el común y quita los propios de todos.
  - `registry.ts`: `WorldRegistry` (valida al registrar y compone una sola vez; `get`, `resolve`, `list` para los selectores y `renamePlace`, que devuelve un registro nuevo). `catalog.ts`: `WORLD_REGISTRY` con `muestra` (por defecto, el mundo de plan 001, barco `muestra`) y `prueba` (mismo mapa, barco `acuarela`, otro mar, las rocas cambiadas y dos nombres propios; sólo para probar el cambio).
  - `selection.ts`: `WorldChoice` (`get`/`set`), `storedWorldChoice(storage, key)` y `activeWorld`. Orden: `?mundo=`, luego lo que eligió el visitante (`boia:mundo`), luego el mundo activo del Admin (`boia:mundo-activo`), luego el por defecto. Un id desconocido se salta. T16/T26 pueden respaldarlo con el repositorio sin cambiar la interfaz.
  - `check.ts` + `src/cli/world-check.ts`: `pnpm world:check`.
- `SAMPLE_WORLD` sigue exportado: ahora es el mundo `muestra` compuesto, idéntico al de antes salvo el nombre de las rocas («Roca»).
- Motor: `game.setWorld(config, { sea })` cambia de mundo en caliente. El barco sigue donde está y las recompensas siguen cobradas, porque hay un único `RewardStore` por partida y va por id de lugar. `GameOptions.sea` y `Water.setPalette` dan el mar de cada mundo. `DEV_ART_URL` acepta ids anidados (`mundos/a/b`).
- `/juego`: al montar elige el mundo con `world-choice.ts`. Si no hay estilo en la URL ni guardado, el barco es el del mundo. El root lleva `data-mundo`, `--mundo-acento`/`--mundo-sobre-acento` y el fondo del mar del mundo. Lo descubierto se guarda por id y sobrevive al cambio. `MenuContext.world` (`worlds`, `current`, `pending`, `choose`) queda listo para la sección «Mundos» de T24. Cambiar de mundo con el barco del mundo no lo guarda como elección.

Comandos:
```
pnpm test && pnpm typecheck && pnpm lint   # exit 0; 32 archivos, 348 pruebas (antes 324)
pnpm world:check                           # exit 0; tabla por mundo (muestra y prueba, 7 lugares cada uno)
node --import ./packages/world/scripts/ts-resolve.mjs packages/world/src/cli/world-check.ts \
  --registro packages/world/src/worlds/fixtures/sin-skin.ts   # exit 1: prueba/isla-pequena-1 sin skin
E2E_PORT=3117 pnpm e2e                     # los specs de siempre
```
Para verlo: `/juego?mundo=prueba`. En desarrollo, `__boiaWorld('muestra')` en la consola cambia de mundo en caliente. Comprobado en el navegador (`next dev`, puerto 3121): el barco se queda en el mismo punto; cambian las rocas, el mar y el barco (acuarela ↔ muestra); la URL y `boia:mundo` se ponen al día; `boia:estilo-barco` no se toca; la consola queda sin errores.

Desviaciones:
- `world:check` corre con el TypeScript de Node 24 y un hook de resolución (`packages/world/scripts/ts-resolve.mjs`) para las importaciones sin extensión. En `packages/world` no puede haber sintaxis que no se pueda borrar sin más (parameter properties, enums).
- Si un lugar no tiene arte, `world:check` lo cuenta como fallo (`sin-arte`), igual que si no tiene skin, porque se ve con un marcador.
- Los nombres propios van en `WorldSkin.names`, aparte del arte: poner un nombre en un mundo no hace que el lugar pase a «con skin».

Sin probar:
- La entrada (T14) sigue pintando el mundo por defecto aunque el visitante haya elegido otro. `(landing)` no entra en el alcance: es de T27. `introLanding` está en el mapa, pero la configuración de la entrada todavía no lo lee.
- No hay música: la ranura `music` es sólo un dato.
- Lo que el runtime guarda por objeto y no pasa por el `RewardStore` se reinicia al cambiar de mundo: diálogos «una vez» ya vistos, recogibles ya cogidos, efectos. En la prueba, la boia tutorial vuelve a hablar. Lo que sí sobrevive son las recompensas y lo descubierto. Cuando T16/T20 guarden ese estado en el repositorio, sólo hace falta pasarlo por id.
- La primera pasada de `pnpm e2e` tuvo 3 fallos en escritorio por tiempo agotado, en la landing y la entrada, con la máquina a carga 64 por los encargos en paralelo. Repetida con `--workers=2`: exit 0, 50 pasadas y 10 omitidas.

## 2026-09-28 — plan 001 T14: intro «mini-mundo» en tres actos con botón y aterrizaje continuo

La entrada de T03 (planeta genérico → mar, automática) queda sustituida por la de D-19, con la opción A de T13: el mundo real enrollado en una esfera falsa de Pixi.

Qué existe:
- `packages/engine/src/intro/` (puro, en la ruta crítica):
  - `config.ts` v2 (`entrada-mini-mundo-muestra-v2`, todo `muestra`): textos («BOIA», «Zarpar», «Solo quiero ver las entradas», «Cargando»), tiempos de cada acto (aparición 2 s, aterrizaje 2 s, fundido reducido 0,4 s), giro (40 s por vuelta, 16° de inclinación), nubes (1,8× el giro del suelo), punto de aterrizaje en coordenadas del mundo (600, 760: la isla de evento), encuadres por ancho (mini-mundo, título, botón y llegada; la llegada es la de T03), textura de 2048 px y barco. **Avance automático de la pausa implementado y apagado** (`pause.autoAdvance.enabled: false`, 8 s).
  - `sphere.ts`: geometría y poses de la esfera (de la prueba de T13), con mar de relleno más allá de los polos (`SEA_PAD`).
  - `timeline.ts`: (config, geometría, vista, acto) → fotograma. `controller.ts`: `waiting → appearing → paused → landing → landed` (+ `destroyed`). La pausa sólo sale con `enter()` (botón o avance automático), «Saltar», Atrás/ancla o cambio de ruta. Pestaña oculta o rotación: la aparición acaba en la pausa y el aterrizaje en la landing.
  - `world-geometry.ts` (export nuevo `./intro/world-geometry`): la geometría a partir de un `WorldConfig`; fuera de la ruta crítica porque arrastra zod.
- `@boia/engine/intro/scene` (Pixi, bajo demanda): pinta una vez el mundo de la demo (mismo arte y costas que `/juego`) en una textura con mar arriba y abajo; un shader lo proyecta como planeta con luz, atmósfera y una capa de nubes procedural que gira más deprisa. Al final del aterrizaje (k ≈ 0) entra el mundo vivo (mar animado, boia, barco) en un cruce corto (del 90 al 97 % del acto). EXPLORAR le cede aplicación, canvas y mar a `/juego` como en T12.
- Web: `intro-stage.tsx` (capa de la entrada: boia dibujada y «Cargando», «BOIA», «Zarpar» con el foco, «Solo quiero ver las entradas» y «Saltar animación» desde el primer momento); `lib/intro/load.ts` (geometría, CSS de posiciones y precarga de las imágenes del mundo desde el script de arranque); marca de visto `boia.intro.v2`.
- Movimiento reducido: mini-mundo quieto, título y botón; al pulsar, fundido de 0,4 s; 0 movimientos de cámara.

Comandos:
```
pnpm test && pnpm typecheck && pnpm lint   # exit 0; 30 archivos, 324 pruebas (antes 306)
pnpm e2e                                   # exit 0; 50 pasadas, 10 omitidas (4 de grabación, 6 de la prueba de T13)
pnpm build                                 # ruta crítica de /: 163,8 kB gzip (T13: 161,6; límite de la tarea 192)
RECORD_INTRO=1 pnpm e2e record.spec.ts --workers=1   # vídeos y storyboard con la GPU del Mac
```
Grabaciones y storyboard: `docs/informes/img/p001-t14-entrada-{movil,escritorio}.webm` y `docs/informes/img/p001-t14-storyboard-{movil,escritorio}.png`. Con la GPU del Mac (`next dev`): aparición 2,01 s, aterrizaje 2,00 s, fotograma más largo 33 ms en móvil y 19 ms en escritorio. `window.__boiaIntro` da `sceneReadyMs`, `appearedMs`, `playedMs`, `longestFrameMs`, `renderer` y las `k` del aterrizaje.

Qué tiene que mirar Hernán en los móviles reales (P6), con `/?intro=1`:
1. `__boiaIntro.sceneReadyMs` (o si sale «Cargando» y luego la landing ligera): con la escena nueva hay más que cargar (Pixi, arte del mundo y el pintado de la textura). Si en 4G pasa de 2 s (`loadBudgetMs`), la entrada no se verá; se sube el plazo en la configuración.
2. Fluidez del giro y del aterrizaje (`longestFrameMs`, tirones al entrar el mundo vivo), y que el shader compile (sin él sale la landing ligera).
3. Encuadres: «BOIA», mini-mundo y «Zarpar» sin solaparse en vertical; el enlace «Solo quiero ver las entradas» ocupa dos líneas a 360 px.
4. Nitidez de la textura al acercarse y el corte de la tierra en el mar de relleno más allá del polo (se ve un momento hacia la mitad del aterrizaje en escritorio).
5. Safari de iOS y navegadores internos (Instagram): traspaso a `/juego` con EXPLORAR.
6. Si hace falta el avance automático de la pausa: sólo es poner `enabled: true`.

Desviaciones:
- La escena pinta el barco como una sola vista quieta (la W de la ilustración ligera), no con `ShipSprite`: ahorra 26 imágenes en la carga crítica de la entrada. `/juego` sigue creando su barco en el spawn (como en T12).
- `IntroAssets` sólo resuelve la isla de evento y el barco de la ilustración ligera; `art/planeta/` ya no lo usa nadie (se deja, no se toca `art/`).
- El enlace «Solo quiero ver las entradas» cuenta en analítica como `tickets_panel_open` con `source: 'hero'` (el contrato no tiene otra fuente que encaje).
- `landing.spec.ts` (axe): además de los 600 ms, espera a que acaben las animaciones finitas; en la suite completa, con la escena cargando de fondo, falló una vez a mitad del fundido de artistas.
- La prueba de T13 (`/sphere-probe`, `sphere-probe*.ts`) se deja como estaba y sigue funcionando; se puede retirar en una limpieza.

Sin probar:
- Móviles reales (ver arriba). En `pnpm e2e` (SwiftShader, en paralelo) sólo se exige la duración mínima de cada tramo.
- Pixi añade en móvil su botón oculto de accesibilidad táctil («select to enable accessibility…»), también en `/juego`; la prueba de acciones visibles lo excluye.

## 2026-09-28 — plan 001 T13: intro «mini-mundo», decisión, spec y prueba de la esfera (A/B)

Elección: **opción A** (esfera falsa en Pixi sobre el mundo real). En el móvil emulado con la CPU ×4 y la GPU del Mac va a 60 fps en el giro y a 60 en el aterrizaje. Con WebGL por software (SwiftShader), la esfera sola va a 53,6 fps. El aterrizaje entero baja a 47,2 fps, pero no por la esfera: baja en el último 14 %, el cruce con el mundo vivo de Pixi. Es el mismo mundo que pintan `/juego` y la llegada de T03, y la opción B también acabaría en él. El JS del fotograma no pasa de 1,8 ms (p95) ni con la CPU ×4. Software y GPU sólo discrepan en ese total del aterrizaje; la recomendación es A.

Qué existe:
- **D-19** en `docs/DECISIONES.md` (Hernán, pendiente Álvaro): las cinco decisiones del §4 de la propuesta. Modifica REQ-ENT-001, 002, 003, 006 y 007. Siguen igual REQ-ENT-004, 005, 008 a 012 y la landing ligera. Pregunta nueva **P9** para Álvaro.
- Spec: REQ-ENT-001, 002, 003, 006 y 007 reescritos en `docs/spec/02-entrada-y-landing.md` con los mismos ID, citando D-19 en la fuente. REQ-ENT-003 lleva `[pendiente Álvaro]` por el texto del botón. También cambian:
  - el párrafo de la sección de entrada;
  - sus filas en `09-requisitos.md`;
  - una fila nueva en «Contradicciones resueltas» de `00-indice.md`;
  - la entrada del glosario;
  - REQ-PRO-004, donde «entrada automática» pasa a ser «entrada cinemática».
- La prueba (calidad de usar y tirar, pero en el repo):
  - `packages/engine/src/intro/sphere-probe-pose.ts`: pose pura. Tiene curvatura `k`, zoom, giro y el punto delantero de la esfera. El radio es `rho / k`, así que en k = 0 la proyección es la cámara plana del juego. El aterrizaje es la isla de evento con el encuadre de llegada de T03.
  - Sus 4 pruebas: `k` baja de 1 a 0 sin retroceder; el final es el encuadre de T03; la esfera coincide con el plano (< 0,5 px) cuando entra el mundo vivo.
  - `sphere-probe.ts` (Pixi): pinta una vez en una textura de 2048×1024 el `SAMPLE_WORLD` entero, con el arte, las costas y el barco de `/juego`. Un shader en una malla a pantalla completa la proyecta como planeta, con luz y atmósfera, y al final entra el mundo vivo encima.
  - Ruta `/sphere-probe` (`apps/web/app/sphere-probe/`): siempre en desarrollo; en `next start`, sólo con `BOIA_SPHERE_PROBE=1`, y si no da 404 (comprobado). `window.__sphereProbe` tiene `setMode`, `still(k)` y `measure(ms)`.
  - `apps/web/e2e/sphere-probe.spec.ts`: la medición y las capturas.

Números (`BOIA_SPHERE_PROBE=1 pnpm e2e sphere-probe.spec.ts --workers=1`, exit 0, 6 pasadas). El móvil es Pixel 5 emulado a 360×640 con resolución Pixi 2, o sea 720×1280 px. «GPU» es Chromium sin cabeza con ANGLE sobre Metal (Apple M3 Pro); «software» es el Chromium sin cabeza de siempre (SwiftShader).

| Vista | Modo | CPU | Giro | Aterrizaje | Del aterrizaje: esfera · cruce · vivo |
|---|---|---|---|---|---|
| móvil 360×640 | GPU | ×4 | 60,0 | 60,0 | 60 · 60 · 60 |
| móvil 360×640 | GPU | ×1 | 59,9 | 60,0 | 60 · 60 · 60 |
| móvil 360×640 | software | ×4 | 56,3 | 47,2 | 53,6 · 22,9 · 31,0 |
| móvil 360×640 | software | ×1 | 60,0 | 53,1 | 60 · 29,1 · 34,6 |
| escritorio 1280×720 | GPU | ×1 | 59,9 | 60,0 | 60 · 60 · 60 |
| escritorio 1280×720 | software | ×1 | 60,0 | 53,2 | 60 · 28,2 · 33,1 |

Capturas (GPU): `docs/informes/img/p001-t13-esfera-k1-{movil,escritorio}.png` (mini-mundo, k = 1) y `p001-t13-esfera-k05-{movil,escritorio}.png` (medio aterrizaje, k = 0,5).

Comandos:
```
python3 tools/spec/check.py && python3 tools/spec/test_check.py   # exit 0; 279 REQ, 18 pruebas
pnpm test && pnpm typecheck && pnpm lint   # exit 0; 30 archivos, 306 pruebas (antes 29 y 302)
pnpm e2e                                   # exit 0; 42 pasadas, 10 omitidas (4 de grabación, 6 de la prueba)
BOIA_SPHERE_PROBE=1 pnpm e2e sphere-probe.spec.ts --workers=1   # fps y capturas
pnpm dev, y abrir /sphere-probe            # verla girar y aterrizar en bucle (aparición 2 s, reposo 2 s, aterrizaje 2 s)
pnpm --filter @boia/web budget             # ruta crítica de /: 161,6 kB gzip (T12: 161,2)
```

Para T14 (visto en la prueba):
- Sin un pintado de calentamiento, SwiftShader se paraba unos 300 ms en el primer fotograma del cruce. Ya está en la prueba, como hizo T03.
- El cruce pinta dos capas a pantalla completa y es el tramo más caro por software. En ese momento la esfera y el plano coinciden a menos de 0,5 px, así que se puede cambiar sin cruce o acortarlo.
- La textura está al 79 % de la escala de juego y al final se ve algo blanda. El mundo vivo del final lo resuelve. `?tex=4096` prueba una textura mayor, pero no se ha medido.
- Con k < 1, más allá del polo reaparece el borde sur del mundo (la boia tutorial arriba en la captura k = 0,5 móvil). Estirar el borde o repetirlo en espejo se ven peor. Hay que rellenar la textura con mar.
- El mundo mide 1000 u de ancho, así que el planeta sale con un 62 % de tierra: un canal de mar entre dos franjas verdes. Es una decisión de encuadre para T14 y Álvaro.
- La prueba no tiene nubes, y el agua está quieta (t = 0) para que la textura y el mundo vivo coincidan.

Desviaciones:
- `packages/engine/package.json` tiene una exportación nueva, `./intro/sphere-probe`, porque la ruta necesita cargar la prueba y el motor sólo exporta lo que lista. No toca ningún bundle de producción.
- La ruta abre en `next start` con `BOIA_SPHERE_PROBE=1` para medir el build de producción, que es el que usan las e2e.

Sin probar:
- Móviles reales (P6). La emulación ralentiza la CPU, pero no la GPU. Un M3 Pro sobra para este shader: una lectura de textura y unas pocas funciones trigonométricas por píxel. En un móvil de gama media hay que medirlo.
- Safari de iOS y los navegadores internos de las apps.

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
