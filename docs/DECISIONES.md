# Decisiones vigentes

Escribe el orquestador. Prevalece sobre `docs/spec/` y sobre la v14. Cada
decisión lleva fecha, quién la tomó y qué la respalda. Lo que aquí dice
"pendiente Álvaro" o "pendiente Hernán" es una propuesta con la que se avanza
hasta que se conteste; si la respuesta la cambia, se anota aquí con fecha.

## Cómo se lee la v14

`docs/fuente/v14-maestro.md` es el documento maestro de Álvaro, íntegro. Es
un registro de 14 revisiones, no una spec limpia: la misma decisión aparece
en varias secciones con matices. Regla de precedencia dentro de la v14:
§49 y §4.4 > §48 y §46 > el resto. Las secciones §29, §38 y §41 son
históricas y no generan requisitos. Las dos secciones sin número que siguen
a la §47 se citan aquí como **§47-A** (ajustes de pacing) y **§47-B**
(decisión final de entrada automática).

## D-01 · Repositorio: se empieza de cero aquí · 2026-09-28 · confirmado por Hernán

La v14 se contradice: la introducción y §49.5 dicen "conservar el repositorio",
el Prompt 1 dice "iniciar desde cero". En este Mac no hay ningún repo del
piloto y la carpeta del proyecto estaba vacía. Se construye desde cero en
`/Users/heralc/Desktop/boia.planet`. Si el piloto aparece, es referencia
visual y funcional (§45 lo audita), nunca base de código.

## D-02 · Alcance: tres lanzamientos, no uno · 2026-09-28 · orquestador · pendiente Álvaro

La v14 mete casi todo en "lanzamiento" (§32: 16 fases, 14 en CLAVE; §49.11
incluye Faro y Cañón). Eso es más de un año de trabajo sin fecha. Se corta así:

**Lanzamiento 1 (L1) — lo que vende entradas y hace sentir el universo:**
- Entrada cinemática planeta→mar→landing (§4.4, ENT 01–06) y landing HTML por
  bloques con evento prioritario, próximos eventos, artistas rotativos, filosofía,
  fotos, tienda como enlace externo y contacto.
- Tickets con estados de evento (§49.4), evento e isla separados, ficha
  compartible, adaptador de ticketera (sandbox hasta que Álvaro contrate).
- Mundo 2.5D: barco por capas, joystick táctil desde el punto tocado, drift con
  segundo dedo, teclado, agua viva, estela, sectores, costas, minimapa.
- Objetos modulares (§48) con catálogo inicial: colisión (bloquear, rebotar,
  frenar, ralentizar, boost), proximidad, diálogo, recogible, recompensa,
  contenido, ticket, checkpoint, teletransporte, spawn, logro, decorativo.
- Aventura: boia tutorial, misión Fiestera completa con cocodrilos, islas por
  proximidad con recuerdos y próximos eventos, náufrago con descuento, restos,
  cofres, delfín, remolino, botellas (una por cuenta, 140 caracteres),
  circuito con récord personal local.
- Identidad: invitado con progreso local, cuenta por email (OTP + enlace),
  fusión idempotente, Carnet con las 5 preguntas de §44.1, sellos por compra
  confirmada, logros, puntos y monedas separados, Mi Barco con color y
  cosméticos básicos, ranking de puntos.
- Admin L1: login con contraseña + segundo factor, roles propietario/admin/
  editor, eventos, bloques de home, artistas, fotos, editor visual del mundo
  con borrador/previsualización/publicación/restauración, logros por triggers,
  moderación de botellas, textos.
- Idioma: español. Estructura i18n lista; inglés en L2 (ver D-03).

**Lanzamiento 2 (L2):** Vigilancia del faro, Cañón contra tiburones, ranking
global de circuito con validación de servidor, encuestas voluntarias, Mensajes
de BOIA, logros globales retroactivos y concesiones masivas, perfiles oficiales
reclamables, duplicado de temporadas, check-in por QR, motor de promociones
(primera compra, pegatina WhatsApp, exclusivos), tienda con checkout propio,
inglés, exportación y borrado de cuenta desde la web.

**Diferido sin fecha (ya lo decía la v14):** fotos personales por evento, mini
blog, relaciones Bolleros, mensajería privada (nunca), corrientes musicales.

Un requisito de L2 se diseña en la arquitectura de L1 (tablas, módulos, IDs)
sólo si no hacerlo obligaría a migrar datos después. No se implementa.

## D-03 · Idioma de L1: español · 2026-09-28 · orquestador · pendiente Álvaro

El público es Alicante; el inglés duplica todo el copy administrable (§31.2
tiene 18 zonas de texto). i18n en código desde el principio (claves, no
cadenas), contenido sólo en ES hasta L2.

## D-04 · Stack · 2026-09-28 · orquestador · pendiente Hernán

- Monorepo `pnpm` con TypeScript estricto: `apps/web` (Next.js, App Router:
  landing, tickets, Carnet y Admin como grupo de rutas), `packages/engine`
  (renderizador PixiJS v8 + motor propio de comportamientos, sin Phaser),
  `packages/world` (esquema del mundo con zod, compartido por motor y editor:
  lo que el editor coloca aparece en el mismo sitio al jugar), `packages/contracts`.
- Supabase: Postgres con RLS, Auth por email (OTP de 6 dígitos y enlace
  mágico), Storage para assets y fotos, Edge Functions para webhooks y
  validaciones, `pg_cron` para transiciones de estado de eventos.
- Vercel para `apps/web`. Dominio y cuentas a nombre de BOIA (§49.18).
- Analítica del embudo: PostHog (nube UE) con eventos `landing_view`,
  `explore_start`, `discount_found`, `tickets_panel_open`, `ticket_click_out`,
  `purchase_confirmed` (este último sólo desde webhook de la ticketera).
- Por qué no Phaser: la física es trivial (barco, drift, colisiones simples) y
  el modelo de objetos de §48 pide un motor propio; Phaser añadiría un segundo
  sistema de escenas que el Admin no comparte.
- Se confirma o ajusta en el ADR del encargo de stack; sólo cambia si una
  prueba lo contradice.

## D-05 · Producción de arte: Blender sin interfaz, no MCP · 2026-09-28 · orquestador

El riesgo número uno del proyecto es el barco: ocho direcciones, tres skins,
pasajera a bordo y estela coherente (§49.17), con todos los sprites marcados
"IA/ilustrador" en §34. Se valida antes de escribir motor.

- **Pipeline elegido:** modelo 3D estilizado en Blender → sombreado toon con
  contorno → cámara ortográfica dimétrica 2:1 → render de 8 direcciones y
  estados → PNG con alfa + manifiesto JSON (ID, versión, direcciones,
  fotogramas, escala, anclajes, pivote, licencia). Cambiar una skin es cambiar
  materiales; añadir una dirección es un render más. Todo por scripts `bpy`
  en `tools/blender/`, ejecutados con `Blender -b -P`, reproducibles desde
  el repo.
- **Blender MCP descartado para producción:** necesita Blender abierto con
  interfaz y un socket vivo; no es reproducible ni sirve por lotes. Puede
  usarse a mano para explorar, nunca como parte del pipeline.
- **Image-to-3D (Tripo, Meshy, Hunyuan3D) como acelerador opcional:** si la
  geometría procedural no da el carácter "ilustrado", una ilustración del
  barco aprobada por Álvaro se convierte a malla y entra en el mismo pipeline
  de Blender. Requiere cuenta y clave: se pide con `pedir-token`, no se crea
  desde una sesión.
- **Seedance 2.5 (vídeo) no produce sprites.** Sirve para un vídeo de
  referencia del storyboard de la entrada (§4.4, ENT 06) y para material de
  marketing. La cinemática real se construye con capas en el motor, como
  exige §4.4; nunca se sustituye por un vídeo.
- Islas, decoración y personajes que no rotan: ilustración 2D de una sola
  vista (generación + retoque), ya que no necesitan direcciones.

## D-06 · Ticketera candidata: Fourvenues · 2026-09-28 · orquestador · pendiente Álvaro

Española (Valencia), orientada a clubs y festivales, con API y webhooks
(`payment.success` con `metadata.internal_id`). Eso permite el sello
automático en el Carnet al confirmar compra (§42.2) sin que el usuario haga
nada. Alternativas a comparar en el ADR: Entradium, Wegow, Eventbrite, DICE.
La contratación, condiciones y cuenta las hace Álvaro; el código usa un
adaptador con sandbox y datos de prueba hasta entonces. Si la ticketera
elegida no tiene webhook, el sello automático no existe y se pasa a QR o
código del email de compra (§42.2 ya lo prevé como vía alternativa).

## D-07 · Valores absolutos que sustituyen a "relativo al prototipo" · 2026-09-28 · orquestador · pendiente Álvaro

La v14 fija tamaños respecto a un prototipo que el equipo nuevo no ve.
Valores iniciales, ajustables tras probar en móvil:

| Elemento | v14 decía | Valor L1 |
|---|---|---|
| Minimapa (§10) | 25–35 % menor que el prototipo | 96 px de lado en móvil, máx. 22 % del ancho; 128 px en escritorio |
| CTA Explorar (§4.2, §46) | el doble de prominente | alto mín. 56 px, ancho completo hasta 480 px de viewport, animación de pulso ≤ 4 % de escala cada 3 s |
| Tickets en hero (§4.2) | "siempre evidente" | botón secundario ≥ 44 px de alto, visible sin scroll en 360×640 |
| Avisos de logro (§14 vs Prompt 1) | ~3–4 s / ~4 s | 4 s, cola, uno a la vez, arriba |
| Diálogos (§7, §47-A) | ~1,5 s | 1,5 s por bocadillo, toque para avanzar o saltar |
| Rotación de artistas (§18) | ~5 s | 5 s |
| Boost de checkpoint (§13) | ~2 s | 2 s |
| Pulsación larga del minimapa (§10) | ~0,5 s | 500 ms |

## D-08 · Contradicciones de la v14 resueltas · 2026-09-28 · orquestador

- Preguntas del Carnet: §16.2 da ejemplos distintos de las cinco de §44.1.
  Valen las cinco de §44.1, textuales.
- "Mi Carta" / "Carta de Navegación" en §21 y §27: es "Mi Carnet" (§46). La
  Carta no existe como pantalla.
- Tabla de §41 (marca "SIGUIENTE" cosas ya cerradas): no vale; vale §42.5 y §44.5.
- §49.11 mete Faro y Cañón en el lanzamiento: pasan a L2 por D-02. Lo que sí
  queda en L1 es el módulo `INICIAR_MINIJUEGO` como punto de extensión vacío
  del catálogo de comportamientos, para no migrar después.
- Duración de avisos: 4 s (D-07).
- Cinemática: el copy inicial es "BOIA.PLANET" (§47-B); "Bienvenido a BOIA"
  sólo como variante a probar en copy, nunca como pantalla previa.
- "Tripulación" no se usa para relaciones entre usuarios (§44.2, §46);
  "tripulante" sí se usa para la Boia Fiestera a bordo (§8.1), que es otra cosa.
- Prompt 1 pide a la IA "seleccionar la ticketera": la selecciona Álvaro con
  un ADR comparativo delante (D-06).

## D-09 · Anticheat proporcionado · 2026-09-28 · orquestador

Para una comunidad de cientos de personas no se construye validación por
repetición de decisiones (lo que pide el Prompt 3 para los minijuegos).
En L1: récords del circuito sólo locales; recompensas del mundo concedidas
por servidor con sesión firmada, límites de plausibilidad (tiempo mínimo por
logro, cadencia máxima de recogidas) y retirada manual desde Admin. En L2 se
añade ranking global con sesión, semilla y duración verificadas.

## D-10 · Autenticación · 2026-09-28 · orquestador

Público: email con código OTP de 6 dígitos **y** enlace mágico en el mismo
correo. Motivo: el enlace abierto desde el navegador interno de Instagram
pierde la sesión del navegador donde se jugaba; el código no. Admin:
contraseña + TOTP obligatorio, recuperación por correo verificado, sin
contraseña inicial en repo ni en documentos (§49.13).

## D-11 · Método de trabajo · 2026-09-28 · Hernán

Orquestador en Fable 5.1 (esta sesión); sesiones de trabajo en Opus 5.5.
Un encargo, una tarde, un informe. Máximo dos en paralelo sin archivos
compartidos. Hito de revisión con Álvaro en móvil real al cerrar cada fase.

## D-12 · El joystick nace donde toca el primer dedo · 2026-09-28 · orquestador · pendiente Álvaro

El Prompt 1 de la v14 dice "el control táctil nace al tocar el barco". Se
cambia a: el primer dedo crea el joystick en su punto, en cualquier lugar de
la zona de juego. Acertar a un sprite de 64 px en un móvil es frustrante y §25
pide feedback inmediato. Se muestra a Álvaro en el hito 1; si lo prefiere
literal, es un cambio de una condición en el motor.

## D-13 · Cámara a 30° de elevación, no 26,57° · 2026-09-28 · orquestador

Los prompts 01 y 03 decían 26,57°. Es la pendiente de las aristas en pantalla,
no la inclinación de la cámara: con 26,57° el cubo unidad mide 2,236:1. Con
30° mide 1,9998:1 (calibración del 01) y el motor lo reproduce (informe del 03).
Vale 30° en Blender, en `packages/world` y en todo asset futuro.

## D-14 · Teclado con los dos modos · 2026-09-28 · Hernán

Por defecto, dirección de pantalla (flecha arriba lleva el barco hacia arriba,
igual que el joystick). En Controles se puede cambiar a control de tanque
(arriba acelera, izquierda y derecha giran). La preferencia se guarda.

## D-15 · Barco más pequeño · 2026-09-28 · Hernán

El barco pasa de ~64 px a ~48 px de eslora en pantalla (`SHIP_LENGTH` al 75 %)
para ver más mar. Sigue siendo `muestra`; se revisa en el hito 1 con islas
alrededor.

## D-16 · Arte de L1 servido desde el repo · 2026-09-28 · orquestador

Hasta que exista la biblioteca de assets del editor, la web sirve `art/`
directamente (el 03 ya lo hace con la ruta `/api/art/...`). Supabase Storage
entra con el editor de mundo, que es donde Admin sube assets. Motivo: la demo
no necesita servicios y el pipeline de Blender escribe en `art/`.

## D-17 · Base de datos sin Docker · 2026-09-28 · orquestador

En el Mac no hay Docker ni Supabase CLI; sí hay PostgreSQL 17 de Homebrew
corriendo en el puerto 5432, y Hernán ya usa Supabase en la nube para otros
proyectos. Por tanto:
- Esquema, migraciones y pruebas de RLS se ejecutan contra el Postgres local,
  en una base `boia_planet_test`, con un shim compatible con Supabase (roles
  `anon`, `authenticated`, `service_role`; esquema `auth` con `auth.uid()`
  leyendo `request.jwt.claims`). Las migraciones son SQL plano en
  `supabase/migrations/`, aplicables tal cual a un proyecto real.
- Auth, Storage y Edge Functions se prueban contra un proyecto Supabase en la
  nube de desarrollo, `boia-planet-dev`, que crea Hernán. Sus claves entran
  en `.env.local` con la skill `pedir-token`. Si el plan gratuito ya tiene dos
  proyectos activos, Hernán decide si pausa uno o paga.
- Si más adelante se instala OrbStack, se puede pasar a `supabase start` sin
  cambiar las migraciones.

## D-18 · «Boia», con i · 2026-09-28 · Hernán

Se usa la grafía valenciana en todo el proyecto: la boia (femenino, como
antes), plural «boies»: «Boia Fiestera», «boia tutorial», «primera boia».
Vale para la spec, el código, los textos del juego y la documentación.
`docs/fuente/v14-maestro.md` conserva la grafía castellana, con y griega,
porque es texto histórico y no se toca. La carpeta del proyecto en el
Escritorio todavía lleva esa grafía con y; Hernán la renombra a
`/Users/heralc/Desktop/boia.planet` cuando cierre el plan 001, y las rutas
del repo ya apuntan a `boia.planet` desde ahora, antes del cambio. Palabras
que sólo contienen «boy» (el artista Bdboy) no cambian.

## D-19 · Entrada «mini-mundo» con botón y aterrizaje en el mar · 2026-09-28 · Hernán · pendiente Álvaro

Propuesta completa: `docs/propuestas/2026-09-28-intro-mini-mundo.md` (§4 son
las decisiones; §5 a §7, cómo tiene que ser). Sustituye en parte la entrada
de T03 (planeta → mar → landing sin clic). La web empieza como la intro de
messenger.abeto.co: nuestro mundo en miniatura flota y gira, con el título
encima y un botón; al pulsarlo, el mundo gira, se aplana y se aterriza en el
mar sin cortes. Hernán decide:

1. Tras la aparición del mini-mundo hay **un botón para entrar**.
2. El título de la cinemática es **«BOIA»** (wordmark de BOIA), no
   «BOIA.PLANET».
3. **Se aterriza en el mar**, en un punto que es un dato configurable
   (coordenadas del mundo y encuadre por ancho de vista), no código. El punto
   definitivo llega más adelante; mientras tanto vale el encuadre de llegada
   de T03: la isla de evento con el barco en posición segura.
4. **El texto del botón da igual**: uno de muestra («Zarpar», «Entrar»,
   «Vamos») marcado `muestra` en la configuración. El definitivo lo aprueba
   Álvaro.
5. No hay ningún río: «el río» era el mar.

Modifica REQ-ENT-001, REQ-ENT-002, REQ-ENT-003, REQ-ENT-006 y REQ-ENT-007,
que ahora citan D-19. Contradice la entrada sin clic y el título
«BOIA.PLANET» de §4.1, §4.4 y §47-B de la v14. Siguen igual REQ-ENT-004,
REQ-ENT-005 (sin globo 3D, D-05), REQ-ENT-008 a REQ-ENT-012 y la landing
ligera como respaldo (REQ-ENT-017). La técnica del mini-mundo (A: esfera
falsa en Pixi sobre el mundo real; B: giro renderizado en Blender) se decide
con la prueba de fps de la propuesta (§6, §8), que se anota en `ESTADO.md`.

Falta el visto bueno de Álvaro: el flujo de entrada es identidad y negocio
suyos (P9). Hasta que conteste se avanza con esta decisión.

## Preguntas abiertas

| # | Pregunta | Para | Traba |
|---|---|---|---|
| P2 | ¿Ticketera: Fourvenues u otra? ¿Ya hay cuenta? | Álvaro | adaptador real (fase 2) |
| P3 | ¿Qué evento es el objetivo de L1 y en qué fecha? | Álvaro | el calendario entero |
| P4 | ¿Aprueba el corte L1/L2 de D-02 y español solo (D-03)? | Álvaro | nada hasta fase 3; conviene cerrarlo en el hito 1 |
| P5 | ~~Referencia del barco~~ Cerrada 2026-09-28 por Hernán: no hay; el 01 va con propuesta procedural y Álvaro opina sobre el visor. | — | — |
| P6 | ¿Quién tiene el iPhone y el Android de prueba? | Hernán | fase 1, entrada cinemática |
| P7 | Crear el proyecto Supabase `boia-planet-dev` y pasar sus claves con `pedir-token` | Hernán | tarea de auth (T07 del plan 001) en adelante |
| P8 | ¿Qué estilos de la exploración del 01 (`docs/informes/img/01-estilo-*.png`) pasan a Álvaro? | Hernán | el estilo definitivo; los assets se re-renderizan barato |
| P9 | ¿Aprueba la entrada nueva de D-19 (mini-mundo, «BOIA», botón para entrar, aterrizaje en el mar) y qué texto lleva el botón? | Álvaro | cerrar ENT 06 y el copy del botón; se avanza con D-19 mientras tanto |
