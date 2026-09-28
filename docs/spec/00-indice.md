# 00 · Índice de la especificación v15

**Qué prevalece.** `docs/DECISIONES.md` prevalece sobre esta especificación y sobre la v14: si algo de aquí contradice una decisión vigente, vale la decisión y esta spec se corrige. La v14 de Álvaro (`docs/fuente/v14-maestro.md`) queda como fuente histórica: no se lee para trabajar, se cita. Esta spec consolida la v14 con las decisiones D-01 a D-17 aplicadas: cada requisito aparece una vez, con ID, fuente, alcance y criterio verificable.

## Cómo se usa

Una sesión de trabajo lee este índice y los archivos que nombre su encargo, no la spec entera. El código, los tests y los informes citan los requisitos por su ID (`REQ-ENT-012`). La tabla [09-requisitos](09-requisitos.md) es la matriz para el orquestador: todos los REQ en una fila cada uno, con su criterio.

## Archivos

| Archivo | Qué contiene | Fuente principal en la v14 |
|---|---|---|
| [01-producto-y-flujos](01-producto-y-flujos.md) | Visión, dos caminos, flujos, tipos de evento, reglas UX, cobertura del piloto, contenido de BOIA y publicación | §1–3, §25–28, §30, §33, §39, §45–47, §49.18 |
| [02-entrada-y-landing](02-entrada-y-landing.md) | Cinemática automática, landing en el mundo, home por bloques, accesos con la isla visible, ENT 01–06 | §4, §47-B, §49.3, §49.6 |
| [03-mundo-y-motor](03-mundo-y-motor.md) | Estética, agua, controles, mapa y ritmo, minimapa, objetos modulares, barco y sprites, MAP 01, ART 01 | §6, §10, §24, §34, §35, §48, §49.7, §49.14, §49.16, §49.17 |
| [04-aventura](04-aventura.md) | Tutorial, Boya Fiestera, islas, mar vivo, náufrago, circuito y minijuegos de L2 | §7–9, §11–13, §47-A, §49.11 |
| [05-identidad-y-comunidad](05-identidad-y-comunidad.md) | Invitado y cuenta, Carnet, sellos, logros, economía, Mi Barco, menú, ranking, botellas, encuestas y mensajes | §14–17, §19–21, §40, §42–44, §46, §49.8–49.10 |
| [06-comercial](06-comercial.md) | Eventos y sus 7 estados, ticketera, descuentos y promociones, artistas, filosofía, fotos y tienda | §5, §18, §22, §49.4, §49.12 |
| [07-admin](07-admin.md) | Acceso y roles, editor del mundo, publicación, logros, Carnets, moderación, borrado, temporadas, criterios de §49.15 | §23, §48.4–48.8, §49.1, §49.2, §49.13, §49.15 |
| [08-arquitectura-y-datos](08-arquitectura-y-datos.md) | Stack, entidades, transacciones, antitrampas, seguridad, presupuestos, pruebas, operación | §24, §49.13, Prompts 1–3 |
| [09-requisitos](09-requisitos.md) | Tabla maestra de todos los REQ | — |
| [10-filosofia](10-filosofia.md) | Filosofía de BOIA e inventario de textos, casi textuales; material de copy | §31, §37 |
| [11-glosario](11-glosario.md) | Términos del producto | — |

## Cómo se citan los requisitos

**ID.** `REQ-<ÁREA>-<nnn>`, con tres dígitos. Cada área se define en un solo archivo:

| Área | Archivo | Área | Archivo |
|---|---|---|---|
| PRO | 01 producto y flujos | IDE | 05 identidad y comunidad |
| ENT | 02 entrada y landing | COM | 06 comercial |
| MUN | 03 mundo y motor | ADM | 07 admin |
| AVE | 04 aventura | ARQ | 08 arquitectura y datos |

**Definición.** Una línea en el archivo del área: ID, alcance, frase imperativa con sus números exactos y fuente. Por ejemplo:

```
- **REQ-AVE-029** `L1` — Hacer que banderas y checkpoints produzcan un WHOOSH y un boost fuerte de 2 s. *Fuente: §13, §46, D-07*
```

Cada REQ se define una sola vez y ocupa una fila en 09. Los IDs son estables: no se renumeran ni se reutilizan. Un REQ que deja de aplicar se mueve a `diferido` con una nota o se retira con una decisión en `docs/DECISIONES.md`; su número queda reservado.

**Fuente.** `§N.M` es una sección de la v14. `§47-A` y `§47-B` son las dos secciones sin número que siguen a la §47 (ajustes de pacing y entrada automática). `P1`, `P2` y `P3` son los Prompts 1, 2 y 3 de la §50. `D-NN` es una decisión de `docs/DECISIONES.md`. Los criterios de la v14 ENT 01 a ENT 06, MAP 01 y ART 01 se conservan como alias en la fuente de su REQ (`alias ENT 01`).

**Alcance.** `L1`, `L2` o `diferido`, según D-02. Un requisito de L2 sólo condiciona L1 si no diseñarlo obligaría a migrar datos después.

**Marcas.** `[pendiente Álvaro]` o `[pendiente Hernán]`: el REQ necesita un dato o una aprobación de esa persona; hasta entonces se trabaja con `muestra`. `[provisional]`: alcance o resolución a confirmar por el orquestador. Las marcas van en el texto del REQ y en la columna de notas de 09.

**Criterio verificable.** Está en 09. Es la evidencia que permite marcar el REQ como satisfactorio.

## Precedencia y alcance

Orden de precedencia: `docs/DECISIONES.md`, esta spec, la v14. Dentro de la v14: §49 y §4.4, luego §48 y §46, luego el resto.

El alcance se asignó así:

1. Lo que D-02 nombra lleva el alcance que D-02 le da.
2. Lo que D-02 no nombra y la propia v14 aparta o pospone va a `diferido` sin marca, como D-02 hace con lo que «ya lo decía la v14».
3. Lo que D-02 no nombra y la v14 mete en el lanzamiento lleva `[provisional]`, con el alcance que mejor encaja, y queda como pregunta para el orquestador.

Requisitos `[provisional]` por motivo:

- **Alcance que D-02 no nombra:** REQ-ENT-016, REQ-ENT-031, REQ-MUN-005, REQ-AVE-023, REQ-AVE-024, REQ-IDE-008, REQ-IDE-009, REQ-IDE-016, REQ-IDE-023, REQ-COM-032, REQ-COM-033, REQ-ADM-005, REQ-ADM-008, REQ-ADM-020, REQ-ADM-025, REQ-ADM-031, REQ-ADM-032, REQ-ADM-037.
- **Contradicción de la v14 que D-08 no cubre:** REQ-AVE-030 (cocodrilo del circuito) y REQ-IDE-034 (qué es «Inicio»).

## Secciones de la v14 sin requisitos propios

- §29, §38 y §41 son históricas (DECISIONES); la tabla de §41 no vale (D-08).
- §32 y §36, planes de producción, los sustituye `docs/PLAN.md` con el método de encargos (D-11).
- §45, la auditoría del piloto, se cubre con la tabla de cobertura de 01 y REQ-PRO-015.
- §49.5 y la introducción («conservar el repositorio») las sustituye D-01.
- §2.2, objetivos secundarios, los cubren los REQ de cada área.
- §28 y §33, inventarios de aprobaciones, se resumen en 01 y en REQ-PRO-019.
- §50, los tres prompts, se reparten por áreas y se citan como P1, P2 y P3; su lista final de entrega es REQ-ARQ-024.

## Comprobación

```
python3 tools/spec/check.py
```

Comprueba los 12 archivos, el formato de cada definición, que ningún ID se repite, que cada REQ está una vez en 09 con la misma fuente, alcance y marcas, que no hay referencias a REQ inexistentes, que cada alias de la v14 está en un solo REQ y que las cadenas centinela existen (las 5 preguntas del Carnet, «140», «1,5 s», «Alba Fitz», «Wet Kisses» y «payment.success»). Imprime el conteo por área, alcance y marca, y sale con 0 si no hay errores.

## Apéndice: desviaciones respecto a la v14

Cada punto donde esta spec se aparta de la v14, con la sección, la razón y el REQ afectado.

### Por alcance (D-02 y D-03)

| v14 | Esta spec | Razón | REQ |
|---|---|---|---|
| §32, §36: lanzamiento con 16 fases, 14 CLAVE | Tres lanzamientos: L1, L2 y diferido | D-02 | todos |
| §49.11, §36, P3: Faro con Vigilancia del faro y Cañón contra tiburones en el lanzamiento | L2; en L1 sólo el punto de extensión INICIAR_MINIJUEGO | D-02, D-08 | REQ-MUN-026, REQ-AVE-035 a REQ-AVE-039 |
| §49.14, §49.16: boceto y MAP 01 con Faro y Cañón | En L1, sin ellos; «no son peajes» se comprueba sobre las actividades opcionales de L1 | D-02 | REQ-MUN-016, REQ-MUN-018 |
| §13, §49.11 («el circuito sí se implementa completo»): ranking global de tiempos | L2; en L1, récord personal local | D-02, D-09 | REQ-AVE-027, REQ-AVE-034 |
| §49.8: encuestas voluntarias | L2 | D-02 | REQ-IDE-045, REQ-IDE-046, REQ-ADM-034 |
| §49.9: Mensajes de BOIA | L2 | D-02 | REQ-IDE-047, REQ-IDE-048, REQ-ADM-035 |
| §49.1: logros retroactivos y concesiones masivas | L2; publicar un logro para todos sigue en L1 | D-02 | REQ-ADM-021, REQ-ADM-023, REQ-ADM-024 |
| §49.2, §16.3: perfiles oficiales reclamables y perfil de artista | L2 | D-02 | REQ-ADM-026, REQ-IDE-018 |
| §23.4: duplicar temporadas | L2; en L1 hay una sola temporada activa | D-02 | REQ-ADM-032, REQ-ADM-033 |
| §42.2, §49.12: check-in por QR y asistencia | L2 | D-02 | REQ-COM-025 |
| §49.12: primera compra, pegatina por WhatsApp, exclusivos | L2 | D-02 | REQ-COM-023, REQ-COM-024 |
| §22, P3: tienda con catálogo y checkout | L2; en L1, enlace externo | D-02 | REQ-COM-033, REQ-COM-034 |
| §49.13: descarga y eliminación de cuenta | Autoservicio web en L2 | D-02 | REQ-IDE-050, REQ-ADM-031 |
| §4.1, §20, §47-B, P3: idioma automático, selector, español e inglés | Sólo español en L1, con i18n por claves; inglés en L2 | D-03 | REQ-ARQ-020, REQ-ARQ-021 |

### Valores absolutos (D-07)

| v14 | Esta spec | REQ |
|---|---|---|
| §10: minimapa 25–35 % menor que el del prototipo | 96 px de lado en móvil, máx. 22 % del ancho; 128 px en escritorio | REQ-MUN-019 |
| §4.2, §46: CTA Explorar el doble de prominente | Alto mín. 56 px, ancho completo hasta 480 px, pulso ≤ 4 % cada 3 s | REQ-ENT-026 |
| §4.2: Tickets siempre evidente | ≥ 44 px de alto, visible sin scroll en 360×640 | REQ-ENT-027 |
| §14, §46: avisos de ~3–4 s | 4 s, en cola, uno a la vez, arriba | REQ-IDE-026 |
| §7, §47-A: diálogos de ~1,5 s | 1,5 s por bocadillo, toque para avanzar o saltar | REQ-AVE-002 |
| §18, §47-A: rotación de artistas de ~5 s | 5 s | REQ-COM-026 |
| §13, §46: boost de ~2 s | 2 s | REQ-AVE-029 |
| §10: pulsación larga de ~0,5 s | 500 ms | REQ-MUN-021 |

### Contradicciones resueltas por decisiones (D-08 y siguientes)

| v14 | Esta spec | Razón | REQ |
|---|---|---|---|
| §16.2: preguntas de ejemplo distintas | Las 5 de §44.1, textuales | D-08 | REQ-IDE-014 |
| §21, §27, §37.12: «Carta», «Carta de Navegación» | «Mi Carnet»; la Carta no es una pantalla | D-08 | REQ-IDE-011 |
| §41: tabla con puntos «SIGUIENTE» | No vale; valen §42.5 y §44.5 | D-08 | — |
| §4.1, §47-B: «Bienvenido a BOIA» | Sólo variante de copy, nunca pantalla previa | D-08 | REQ-ENT-003 |
| §44.2, §46 frente a §8.1: «tripulación» y «tripulante» | «Tripulación» nunca para usuarios; «tripulante» para la Fiestera | D-08 | REQ-IDE-020, REQ-AVE-006 |
| P1: la IA selecciona la ticketera | La elige Álvaro con un ADR comparativo | D-06, D-08 | REQ-COM-015 |
| Introducción, §49.5, §50: conservar el repositorio | Desde cero | D-01 | — |
| §4.4: reproducir el arranque en blanco de la demo | Sin piloto: se prueba cada contexto de apertura | D-01 | REQ-ENT-018 |
| P1: proponer una pila técnica | Stack fijado, a confirmar en un ADR | D-04 | REQ-ARQ-001, REQ-ARQ-002 |
| §34: sprites del barco por IA o ilustrador | Pipeline de Blender sin interfaz, reproducible | D-05 | REQ-MUN-032 |
| P3: minijuegos validados repitiendo las decisiones del cliente | Sesión, semilla y duración verificadas, en L2 | D-09 | REQ-AVE-038, REQ-ARQ-010 |
| §11.1: sin antitrampas complejas | Se mantiene, con límites de plausibilidad simples | D-09 | REQ-AVE-016, REQ-ARQ-010 |
| P1, P2, P3: acceso por enlace de email de un solo uso | Código OTP de 6 dígitos y enlace mágico en el mismo correo | D-10 | REQ-IDE-002 |
| §49.13: segundo factor | TOTP obligatorio | D-10 | REQ-ADM-002 |
| P1, P3: el control táctil nace al tocar el barco | Nace donde toca el primer dedo, en cualquier punto de la zona de juego | D-12 | REQ-MUN-006 |
| P1, P3: teclado en escritorio, sin más detalle | Dos modos: dirección de pantalla por defecto y control de tanque en Controles | D-14 | REQ-MUN-008 |

### Método y formato (D-11 y encargo 02)

| v14 | Esta spec | REQ |
|---|---|---|
| §49.18: entrega organizada en áreas 00 a 07 | 12 archivos de spec y el método de encargos | — |
| §49.15, §49.18: matriz con estado, satisfacción, responsable, evidencia y prueba | 09 lleva ID, texto, fuente, alcance, criterio y notas; el estado de implementación se lleva aparte | REQ-PRO-017 |
| P3: «alrededor de 1 MB» y «alrededor de 5 MB» | Presupuestos de 1 MB y 5 MB | REQ-ARQ-014 |

### Resoluciones provisionales y lecturas

| v14 | Esta spec | Razón | REQ |
|---|---|---|---|
| §13: el cocodrilo del circuito produce un frenazo fuerte; §48.5: el cocodrilo ralentiza un 60 % durante 2 s | Ralentiza un 60 % durante 2 s | Precedencia §48 sobre el resto; `[provisional]` | REQ-AVE-030 |
| §19: la primera sección del menú es «⚓ Inicio / Welcome Aboard»; §4.4: «vuelta clara a Inicio» (la landing) | «Inicio» es la landing; la sección del menú se llama Welcome Aboard y el ancla abre el menú | Precedencia §4.4 sobre el resto; `[provisional]` | REQ-IDE-034, REQ-ENT-012 |
| §2.1: Tickets «abre automáticamente la compra» | Abre el panel de entradas; el checkout exige una acción | Lectura conforme a §4.3 y §49.6 | REQ-ENT-034, REQ-ENT-035 |
| §48.3: recompensa una vez, por sesión o repetible; P3: por temporada | Las cuatro frecuencias | Unión, sin conflicto | REQ-MUN-025 |
| §10: brújula a lo no explorado; P3: brújula al objetivo seleccionado | Al seleccionado y, si no hay, al siguiente no explorado | Unión, sin conflicto | REQ-MUN-022 |
