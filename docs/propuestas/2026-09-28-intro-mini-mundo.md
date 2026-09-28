# Propuesta · Intro «mini-mundo» con botón y aterrizaje en el mar

- Fecha: 2026-09-28
- Pide: Hernán
- Estado: decidido por Hernán; pendiente del visto bueno de Álvaro sobre el
  cambio de flujo (identidad y negocio son suyos, ver CLAUDE.md)
- Para: el orquestador, que la convierte en decisión, cambios de spec y
  tarea(s) del plan
- Sustituye en parte a: T03 de `plans/001-demo-l1.md` (entrada cinemática
  planeta → mar → landing, commit 2e80904)

## 1. Qué quiere Hernán, en una frase

Que la web empiece como la intro de <https://messenger.abeto.co/>: aparece
**nuestro mundo en miniatura** flotando y girando, con **«BOIA»** encima y un
**botón para entrar**; al pulsarlo, **el mundo se mueve y aterrizas en el
mar**, en el mundo de verdad, sin cortes.

## 2. La referencia: cómo es la intro de Messenger

Vista en el navegador el 2026-09-28:

1. **Carga.** Fondo blanco, un sobre dibujado a mano y «Loading».
2. **Aparición (~2 s).** Fondo turquesa; desde abajo sube un planeta diminuto
   que es la ciudad del juego enrollada sobre una esfera (casas, árboles,
   nubes). Crece y gira despacio.
3. **Espera.** Título «MESSENGER» en bloques encima del planeta y botón
   amarillo «BEGIN» debajo. El planeta sigue girando detrás. No avanza solo.
4. **Al pulsar.** La cámara se lanza contra el planeta, fundido a blanco,
   **segunda pantalla de carga**, y corte a la escena a pie de calle con un
   diálogo.

Lo que copiamos: los actos 1–3 (mini-mundo reconocible + título + botón) y
la idea de «entrar» en el planeta. Lo que **no** copiamos: el corte con
fundido a blanco y la segunda carga. Nuestro mundo es 2.5D y ligero, así que
el aterrizaje puede ser continuo, que es mejor (ver §5).

## 3. Lo que ya existe (T03 y T12)

- La entrada automática de ~3 s: planeta ilustrado en capas → acercamiento →
  mar con islas y barco → landing encima. Tiene «Saltar animación», variante
  de movimiento reducido, landing ligera si falla el motor en 2 s, marca de
  visto `boia.intro.v1` y `/?intro=1` para repetirla.
- Código: `packages/engine/src/intro/` (`config.ts`, `timeline.ts`,
  `scene.ts`, `controller.ts`, `entry.ts`, `assets.ts`, con pruebas),
  `apps/web/app/(landing)/components/intro-stage.tsx`,
  `apps/web/lib/intro/{bridge,load}.ts`, `apps/web/e2e/intro.spec.ts`.
- Arte del planeta: `art/planeta/` (globo, nubes, banda de mar, isla), que
  es un **globo genérico con continentes** y la isla de evento en el polo.
- T12: EXPLORAR EL UNIVERSO pasa la escena Pixi viva a `/juego` sin reiniciar
  el mundo (REQ-ENT-012).
- Storyboard actual: `docs/informes/img/p001-t03-storyboard-escritorio.png`.

Diferencias con lo que se pide ahora:

| | Hoy (T03) | Nuevo |
|---|---|---|
| Planeta | Globo genérico con continentes | Nuestro mundo real en miniatura: islas, rocas, boia, barco, costa |
| Ritmo | Automático, sin pausa | Se detiene en «BOIA» + botón |
| Título | «BOIA.PLANET» | «BOIA» (logo/wordmark de BOIA) |
| Llegada | Mar con la landing | Aterrizaje continuo en un punto del mar, con la landing |

## 4. Decisiones de Hernán (2026-09-28)

1. Hay **un botón para entrar** tras la aparición del mini-mundo.
2. El título es **«BOIA»**.
3. **Se aterriza en el mar**, en algún punto. El punto exacto se decidirá más
   adelante: tiene que ser configurable. Por ahora, el encuadre actual de la
   llegada de T03 (isla de evento con el barco en posición segura) vale.
4. **El texto del botón le es indiferente.** Usar uno de muestra («Zarpar»,
   «Entrar», «Vamos») marcado `muestra` en la configuración.
5. No hay ningún río: «el río» era el mar.

Lo que el orquestador tiene que registrar:

- **Nueva decisión en `docs/DECISIONES.md`** (D-19 o la siguiente libre) con
  lo anterior, anotando que modifica REQ-ENT-001, 002, 003, 006 y 007 y que
  falta el visto bueno de Álvaro.
- **Cambios de spec en `docs/spec/02-entrada-y-landing.md`** (propuesta de
  redacción; el orquestador decide la final):
  - REQ-ENT-001: en la primera visita, cinemática en tres actos: aparición
    del mini-mundo, pausa con título y botón, y aterrizaje continuo en el mar
    al pulsar; sin formularios, idioma ni login.
  - REQ-ENT-002: la única acción antes de la landing es el botón de entrar; el
    enlace a entradas es visible y funciona desde el primer segundo, sin pasar
    por el botón.
  - REQ-ENT-003: el título de la cinemática es «BOIA».
  - REQ-ENT-006: los cuatro tiempos pasan a ser aparición, pausa, acercamiento
    con aplanado de la curvatura, y llegada.
  - REQ-ENT-007: los 3 s pasan a medirse por tramos (aparición y aterrizaje,
    ~2 s cada uno como `muestra`); la pausa no cuenta.
- Se mantienen sin cambios: REQ-ENT-004, 005 (nada de globo 3D), 008 (sin
  audio y «Saltar animación» idempotente), 009 (visitas posteriores directas),
  010 (movimiento reducido), 011 (enlaces directos sin intro), 012 y la landing
  ligera como respaldo.

## 5. Cómo tiene que ser: los tres actos

Todos los tiempos, tamaños y textos son `muestra` y viven en la configuración
versionada de la entrada (`config.ts`, REQ-ENT-015), no en el código.

### Acto 0 · Carga (sólo si hace falta)

- Fondo azul noche de BOIA con una **boia dibujada** (o el logo) y
  «Cargando». Sale sólo mientras los recursos no estén listos.
- Si no están listos en `loadBudgetMs`, se muestra la landing ligera, como
  hoy. Nunca una pantalla vacía larga.

### Acto 1 · Aparición del mini-mundo (~2 s, automático)

- El mini-mundo sube desde abajo, crece hasta su tamaño y queda flotando con
  un giro lento y continuo.
- **Tiene que ser nuestro mundo, reconocible**: la isla de evento, la isla
  pequeña, las rocas, la boia del tutorial, el barco, la costa y el mar con su
  mismo estilo. Quien luego aterrice tiene que reconocer lo que vio de lejos
  (REQ-ENT-005).
- Nubes en una capa aparte que giran algo más rápido que el suelo, para dar
  profundidad.
- Sin rebotes, partículas ni destellos (REQ-ENT-004).

### Acto 2 · Pausa con título y botón

- **«BOIA»** grande sobre el mini-mundo, que sigue girando detrás.
- **Botón de entrar** debajo, con texto `muestra`.
- **«Solo quiero ver las entradas»** visible desde el primer momento: lleva a
  Tickets sin pasar por el botón ni por la animación.
- «Saltar animación» sigue disponible y lleva al mismo estado final.
- **Recomendación** (la tiene que confirmar Hernán; si no, se deja desactivada
  pero implementada): avance automático configurable (p. ej. 8 s sin
  interacción → aterriza solo), para que nadie se quede parado delante de un
  botón.
- Teclado: el botón recibe el foco y Enter lo activa.

### Acto 3 · Aterrizaje en el mar (~2 s, al pulsar)

- El mini-mundo **gira** hasta dejar el punto de aterrizaje delante de la
  cámara.
- La cámara se acerca con aceleración y frenada suaves, sin túnel de zoom.
- Mientras se acerca, **la curvatura del mundo se aplana** hasta quedar en el
  isométrico del juego. No hay corte, fundido a blanco ni segunda carga.
- Llegada con la cámara quieta en el punto de aterrizaje y la landing entrando
  encima (titular, EXPLORAR EL UNIVERSO, Tickets, navegación), como hoy. Desde
  ahí EXPLORAR sigue pasando la escena viva a `/juego` (T12).
- El **punto de aterrizaje** es un dato de la configuración (coordenadas del
  mundo + encuadre por ancho de vista), para poder moverlo después sin tocar
  código.

## 6. Técnica propuesta

**Opción A (recomendada): esfera falsa sobre el mundo real, en Pixi.**

- Se pinta la región del mundo alrededor del punto de aterrizaje (el mismo
  `sample-world` y los mismos sprites que usa `/juego`) en una textura.
- Un filtro o shader de Pixi proyecta esa textura sobre un disco como si fuera
  una esfera (proyección ortográfica con desplazamiento de longitud para el
  giro), con borde de atmósfera y sombra suave en un lado.
- Un parámetro de curvatura `k` (1 = esfera, 0 = plano) mezcla la proyección
  esférica con la plana. **Aterrizar es animar `k` de 1 a 0 a la vez que el
  zoom**, así que el aplanado es continuo por construcción.
- Ventajas: el mini-mundo es literalmente el mundo del juego, sin arte
  aparte; no hace falta Three.js ni 3D real (D-05 intacta); si cambia el
  mundo, cambia el planeta.
- Riesgo: rendimiento del filtro en móviles de gama media y la nitidez de la
  textura al acercarse. Por eso hay que empezar con una prueba corta (ver §8).

**Opción B (plan de respaldo): giro renderizado en Blender.**

- Renderizar con el pipeline de `tools/blender/` el mundo enrollado en una
  esfera como una secuencia de sprites en bucle (giro de 360°), más una
  secuencia de acercamiento.
- El aterrizaje sería un fundido entre nubes del último fotograma al mar
  isométrico de Pixi.
- Más peso y más arte que mantener, pero rendimiento predecible.

Si la opción A no llega a 50 fps en un móvil de gama media en la prueba, se
pasa a la B.

## 7. Comportamientos que no pueden romperse

- **Visitas posteriores**: entrada directa a la landing (REQ-ENT-009). La
  marca de visto pasa a `boia.intro.v2` para que todo el mundo vea la intro
  nueva una vez; `/?intro=1` la repite.
- **Enlaces directos** a Tickets, evento o galería: sin intro (REQ-ENT-011).
- **Movimiento reducido**: mini-mundo quieto, título y botón; al pulsar, un
  fundido corto a la llegada, sin movimiento de cámara (REQ-ENT-010).
- **Motor bloqueado o recursos que fallan**: landing ligera con Tickets
  funcionando, como hoy.
- **Saltar**: idempotente; pulsarlo varias veces, volver atrás, cambiar de
  ruta u ocultar la pestaña nunca duplica el mundo ni arranca el juego (la
  prueba de máquina de estados de T03 se amplía con el acto 2).
- **Peso**: la ruta crítica de la landing no crece más de ~30 KB gzip sobre
  los 161,9 KB actuales; Pixi y el mundo siguen cargándose bajo demanda.
- Sin audio en la primera visita.
- Móvil vertical y escritorio con encuadres propios para mini-mundo, título y
  punto de aterrizaje.

## 8. Cómo se da por hecho (propuesta de criterios)

- `pnpm test && pnpm typecheck && pnpm lint` → exit 0. Pruebas nuevas:
  - La línea de tiempo con los tres actos: la pausa no avanza sin botón (salvo
    el avance automático si está activo); `k` va de 1 a 0 de forma monótona en
    el acto 3; el último fotograma coincide con el encuadre de la landing.
  - La máquina de estados: botón pulsado dos veces, «Saltar» durante la pausa
    y durante el aterrizaje, y volver atrás no duplican nada.
- `pnpm e2e` → exit 0, en móvil 360×640 y escritorio:
  - Primera visita: aparece el mini-mundo, luego «BOIA» y el botón.
  - «Solo quiero ver las entradas» funciona sin pulsar el botón.
  - Pulsar el botón termina en la landing sobre el mar, y EXPLORAR sigue
    llegando a `/juego`.
  - Con `prefers-reduced-motion` no hay movimiento de cámara.
  - Con el bundle del motor bloqueado sale la landing ligera con Tickets.
  - La segunda visita entra directa.
- **Prueba de la técnica primero**: antes de construirlo todo, medir fps del
  filtro de esfera (opción A) en escritorio y en emulación de móvil con CPU
  ralentizada ×4, y anotar el resultado y la elección A/B en ESTADO.md.
- Grabaciones de escritorio y móvil y un storyboard nuevo en
  `docs/informes/img/` (rutas en el mensaje final).
- Anotar para Hernán lo que hay que mirar en los móviles reales (P6 de
  `docs/DECISIONES.md`).

## 9. Fuera de alcance

- Elegir el punto de aterrizaje definitivo (llegará más adelante).
- Inglés (D-03), audio, gesto de la mascota, login.
- Three.js o cualquier motor 3D en el navegador.
- Copy definitivo del botón: lo aprueba Álvaro más adelante.

## 10. Sugerencia de corte (el orquestador decide)

Una tarea con un punto de control al principio (la prueba de la técnica A/B)
cabe en una sesión, porque reutiliza la línea de tiempo, el controlador y la
escena de T03. Si el orquestador prefiere, se parte en dos:

1. Prueba del filtro de esfera sobre el mundo real + decisión A/B.
2. Intro completa en tres actos con todos los comportamientos de §7.

Ámbito probable: `packages/engine/src/intro/**`, `apps/web/app/(landing)/**`,
`apps/web/lib/intro/**`, `apps/web/e2e/**` y ESTADO.md; `art/**` y
`tools/blender/**` sólo si se va a la opción B.
