# 02 — Consolidar la v14 en una especificación v15 limpia, con un requisito por ID

Para correr: `/encargo 02` en una sesión nueva. En paralelo con el 01.
Leé antes: nada (es de los primeros).

## Contexto
La v14 de Álvaro (`docs/fuente/v14-maestro.md`, 1.395 líneas, ~25.000
palabras) es un registro de catorce revisiones: la misma decisión aparece en
cinco secciones, hay tablas de "pendientes" ya resueltas y reglas de
precedencia que el lector tiene que aplicar de cabeza. Ningún encargo de
código puede leer eso cada vez. Este encargo produce `docs/spec/`, la
versión que leerán todas las sesiones: cada requisito una vez, con ID,
fuente, alcance (L1, L2 o diferido según D-02) y criterio verificable.
Decisiones del orquestador que se aplican sin discutir: todas las de
`docs/DECISIONES.md` (D-01 a D-11), en especial D-02 (alcance), D-07 (valores
absolutos) y D-08 (contradicciones). Si encontrás una contradicción que D-08
no cubre, no la resuelvas: anotala en "Preguntas para el orquestador" y
aplicá la precedencia §49 y §4.4 > §48 y §46 > resto de forma provisional,
marcando el requisito con `[provisional]`.

Leer: `docs/DECISIONES.md` entero y `docs/fuente/v14-maestro.md` **entero**,
una vez, antes de escribir. Usá subagentes de lectura por bloques de
secciones si te conviene, pero la redacción final es una sola voz.

## Qué existe ya
Sólo la fuente y las decisiones. No hay `docs/spec/`.

## Encargo
1. Escribir `docs/spec/` con estos archivos, y sólo estos:
   `00-indice.md` (qué hay en cada archivo, cómo se citan los IDs, y un
   apéndice "Desviaciones respecto a v14" con cada punto donde la spec se
   aparta de la fuente por D-02, D-07 o D-08, citando la sección),
   `01-producto-y-flujos.md` (§1–3, §25–27, §30, §39),
   `02-entrada-y-landing.md` (§4, §47-B, §49.3, §49.6, ENT 01–06),
   `03-mundo-y-motor.md` (§6, §10, §24, §48, §49.7, §49.16, §49.17, MAP 01, ART 01),
   `04-aventura.md` (§7, §8, §9, §11, §12, §13, §47-A, §49.11 sólo como L2),
   `05-identidad-y-comunidad.md` (§14–17, §19–21, §40, §42–44, §46, §49.8–49.10),
   `06-comercial.md` (§5, §18, §22, §49.4, §49.12, tabla de estados de evento),
   `07-admin.md` (§23, §48.4–48.8, §49.1–49.2, §49.13, §49.15, editor, publicación, roles),
   `08-arquitectura-y-datos.md` (§24, D-04, D-09, D-10, entidades, invitado,
   auditoría, presupuestos de carga y FPS del Prompt 3),
   `09-requisitos.md` (la tabla maestra: **todos** los REQ del resto de
   archivos, una fila por requisito: ID · texto en una línea · fuente §
   · alcance L1/L2/diferido · criterio verificable · notas),
   `10-filosofia.md` (§37 y §31 casi textuales: es material de copy, no se resume),
   `11-glosario.md` (Carnet, sello, bollero, miembro de BOIA, All Day BOIA,
   activación satélite, evento prioritario, isla, sector, comportamiento,
   plantilla, temporada, invitado, y los que hagan falta).
2. IDs `REQ-<AREA>-<nnn>` con áreas `PRO, ENT, MUN, AVE, IDE, COM, ADM, ARQ`.
   Los IDs ENT 01–06, MAP 01 y ART 01 de la v14 se conservan como alias en
   su REQ. Cada requisito es una frase imperativa con sus números exactos
   (1,5 s; 4 s; 140 caracteres; 5 preguntas textuales; 26 artistas textuales;
   8 direcciones; 3 skins; 1 MB; 5 MB; 30/60 FPS…). Nada de "aproximadamente"
   donde D-07 ya fijó el valor.
3. `tools/spec/check.py` (Python del sistema, sin dependencias): comprueba
   que cada `REQ-` de los archivos 01–08 aparece exactamente una vez en
   `09-requisitos.md`, que no hay IDs duplicados, que toda fila tiene alcance
   y fuente, y que estas cadenas centinela existen en la spec: las cinco
   preguntas de §44.1 textuales, "140", "1,5 s", "Alba Fitz", "Wet Kisses",
   "payment.success". Imprime el conteo de REQ por área y por alcance.
4. Un párrafo al inicio de `00-indice.md` que diga que `docs/DECISIONES.md`
   prevalece y que la v14 queda como fuente histórica.

NO: no escribas código de aplicación. No toques `docs/DECISIONES.md`,
`docs/PLAN.md`, `docs/prompts/`, `CLAUDE.md` ni nada fuera de `docs/spec/`,
`tools/spec/`, `docs/informes/` y tu sección de `ESTADO.md`. No inventes
requisitos que la v14 no diga ni contenido (textos, fechas, precios): donde
la v14 deja un hueco, un REQ con `[pendiente Álvaro]`. No reescribas la
filosofía con tu voz. No cambies el alcance de D-02: si algo no encaja en
L1/L2/diferido, pregunta al orquestador, no lo decidas.

## Cómo se prueba
```
python3 tools/spec/check.py     # exit 0; imprime "N requisitos, 0 duplicados, centinelas 7/7"
wc -w docs/spec/*.md            # esperable: entre 12.000 y 18.000 palabras en total
```
En el informe: conteo de REQ por área y alcance, la lista de contradicciones
nuevas que D-08 no cubría, y cuántos REQ quedaron `[pendiente Álvaro]` y
`[provisional]`.

## Front
Nada de front.

## En paralelo
El 01 corre a la vez y toca `tools/blender/**`, `tools/viewer/**`, `art/**`.
Este encargo sólo toca `docs/spec/**`, `tools/spec/**`, su informe y su
sección de `ESTADO.md`.
