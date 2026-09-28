---
name: encargo
description: Corre un encargo numerado de boia-planet escrito por el orquestador (docs/prompts/NN-<slug>.md) con las reglas fijas del proyecto - lectura de los documentos base en orden, reglas de trabajo, commits con rutas explícitas, ESTADO.md al día y el informe de formato fijo en docs/informes/. Usar siempre que Hernán escriba "/encargo NN", "hacé el encargo NN", "corré docs/prompts/NN-...", o pegue un prompt que diga "Para correr - /encargo NN", aunque no use la palabra encargo.
---

# Encargo de trabajo

Sos una sesión de trabajo de `boia-planet`. El orquestador (otra sesión, que
no escribe código) te dejó un pedido en `docs/prompts/`. Esta skill es lo que
vale para **todos** los encargos; el prompt es lo específico de éste. Si se
contradicen, avisá antes de empezar.

## 0. Dónde estás parado, y si esto corre acá

Antes de nada, `pwd`. Si no estás en `/Users/heralc/Desktop/boya.planet`, `cd` ahí y trabajá
ahí. Un chip o una tarea pueden abrirte en un **worktree** —una copia del
repo en otra carpeta— y un worktree no lleva nada que git ignore: acá
faltarían `node_modules/` (cuando exista el monorepo), `.env.local` y las salidas intermedias de Blender en `tools/blender/out/`. Sin `node_modules/` no corre nada de `pnpm`: se reinstala con `pnpm install` en el worktree. Sin `.env.local` no hay Supabase: las pruebas que lo necesiten se declaran no corridas, no se inventan. Si ya
te abriste afuera y no escribiste nada, mudate y seguí; si escribiste algo,
llevate esos cambios y decilo en el informe.

**Este proyecto NO corre en la nube.** Los encargos de arte necesitan Blender instalado en este Mac y los de front se prueban en móviles físicos de Hernán en la misma red. Un chip o `Agent` abren un worktree local; eso sí sirve.

## 1. Encontrar el pedido

El argumento es `$ARGUMENTS`: el número del encargo (dos dígitos) o su slug.
Buscá `docs/prompts/$ARGUMENTS-*.md` (o `docs/prompts/*-$ARGUMENTS.md` si es
un slug). Si no hay exactamente uno, listá `docs/prompts/` y preguntá cuál. Si
no vino argumento, preguntá el número. Leé el prompt entero antes de nada.

**Si sos un agente de la cadena** —te lanzó el orquestador, no te abrió una
persona— saltá el resto de este apartado: no renombres la sesión ni la marques
completada. No tenés sesión propia: corrés dentro de la del orquestador, y
renombrarla le cambia el nombre a él cada vez que lanza un encargo. Pasó, y se
vio.

**Si te abrió una persona**, apenas sepas cuál es el encargo, **ponele nombre a
esta sesión** antes de leer nada más:
`mcp__ccd_session_mgmt__set_session_title` sobre `self`, con el título
`boia-planet · NN <slug>` (por ejemplo `boia-planet · 31 <slug>`). Es una
llamada y cuesta nada. Sin eso la barra lateral dice «Encargo 31» y no se
distingue del encargo 31 de otro proyecto, que es como se pierde media hora
buscando cuál sesión era cuál. Si la herramienta no está en esta sesión,
seguí sin ella.

## 2. Leer antes de escribir una línea

En este orden, y sólo lo que corresponda:

1. `CLAUDE.md` (lo cargás solo). Dice cuál es la fuente de verdad y en qué orden.
2. `docs/DECISIONES.md` (~200 líneas). Decisiones vigentes del orquestador,
   alcance del Lanzamiento 1 y contradicciones de la v14 resueltas.
   **Prevalece** sobre la spec y sobre la v14. Se lee entero, siempre.
3. La especificación: `docs/spec/00-indice.md` y los archivos de `docs/spec/`
   que el prompt nombre (cuando existan; los escribe el encargo 02). Hasta
   entonces, `docs/fuente/v14-maestro.md` (1.395 líneas, ~25.000 palabras):
   **sólo las secciones que el prompt nombre**, salvo que el prompt diga
   "leelo entero". Dentro de la v14, §49 y §4.4 prevalecen sobre lo anterior.
4. `ESTADO.md`, la sección más nueva: dónde quedó el repo.
5. Los informes de `docs/informes/` que el prompt nombre en "Leé antes".

Después, los archivos de código que el prompt nombre, y sólo esos al
principio. Se leen una vez y evitan repetir errores que ya se pagaron.

## 3. Reglas de trabajo de Hernán

- Trabajá normal: probá la funcionalidad de verdad (corré el sistema sobre
  datos reales, medí, verificá que los números den, escribí tests), y usá
  subagentes y workflows cuando convengan.
- **Front:** el prompt dice, en su campo «Front», si lo probás vos o lo
  prueba Hernán. Si no dice nada, lo prueba Hernán: lo dejás listo con
  los comandos para levantarlo y una lista corta de "probá esto, esto y
  esto". Levantar un servidor para probarlo con `curl` o con un cliente de
  tests no es "probar el front": eso siempre se puede.
- Si algo del prompt o de los documentos resulta inviable, avisá y anotalo
  (en ESTADO.md, con fecha y razón). No rodees.
- Prosa en español; identificadores de código en inglés.

## 4. Lo que aplica siempre en este proyecto

- **Álvaro (BOIA) aprueba identidad, negocio y publicación.** Nada de
  contenido real se inventa: fechas, enlaces de tickets, códigos, fotos,
  biografías, canciones, precios y textos no aprobados van etiquetados
  `muestra` o `pendiente`. Los 26 artistas de la v14 §18.1 se usan tal cual,
  con avatar neutro; sin biografías ni testimonios inventados.
- **Comprar entradas nunca queda bloqueado por el juego, la cuenta ni el
  motor.** Tickets, Fotos y Tienda tienen versión HTML que funciona aunque
  WebGL o JavaScript fallen. Mobile-first: se diseña y prueba primero en móvil.
- **Apariencia desacoplada de comportamiento** (v14 §48): un objeto del mundo
  es asset + geometría + comportamientos del catálogo + parámetros. Nunca
  lógica ad hoc pegada a "la isla 3" o "el cocodrilo".
- **Sin runtime 3D.** El mundo es 2D/2.5D con sprites por capas; el 3D sólo
  existe en Blender, offline, para producir sprites.
- **Secretos nunca en el repo, en el informe ni en el chat.** Un token o una
  clave se piden con la skill `pedir-token` y viven en `.env.local`. Nada de
  contraseñas fijas ni cuentas admin por defecto.
- **Una sesión no contrata servicios, no crea cuentas en terceros, no acepta
  términos ni paga.** Si hace falta (ticketera, Tripo, dominio, Vercel,
  Supabase), lo pide en el informe con el enlace exacto y sigue con lo que
  no dependa de eso.
- **Economía:** puntos de prestigio y monedas gastables son saldos separados;
  toda concesión es una transacción idempotente con ID estable. Ningún
  componente de UI escribe saldos, roles, sellos ni estados de compra.
- TypeScript estricto en todo el código de aplicación; Python sólo en
  `tools/` (Blender, comprobaciones). Sin `any` sin comentario que lo
  justifique.

## 5. Sesiones en paralelo

Puede haber **otra sesión trabajando en este mismo directorio** en otro
encargo; el prompt lo dice en «En paralelo» y nombra los archivos que toca la
otra. **Nunca más de dos a la vez**, y una sesión que corre el sistema sobre
material real no coincide con otra que edita el código que ese sistema
importa: los números saldrían de un código a medio escribir. El repo es uno
solo y el índice de git también, así que:

- **Dos sesiones nunca editan el mismo archivo.** `git commit -- ruta` lleva
  el estado entero del archivo, incluidas las líneas a medio hacer de la
  otra sesión. Si el prompt no te asigna un archivo que necesitás, no lo
  toques: lo que cambiarías va en el informe.
- **Commitear siempre con `git commit -m "…" -- ruta1 ruta2`**, las rutas al
  final. Esa forma commitea sólo esas rutas aunque el índice tenga otras
  cosas. `git add ruta && git commit -m "…"` **no** sirve: commitea todo lo
  que esté staged, incluido lo que otra sesión dejó ahí.
- `git add` sólo para archivos **nuevos** tuyos, en el mismo comando que su
  commit. `git mv` y `git rm`, también en el mismo comando que su commit:
  nunca los dejes staged.
- Nunca `git add -A`, `git add .`, `git commit -a` ni `git stash`.
- Al empezar, `git diff --cached --name-only` tiene que estar vacío. Antes de
  cada commit, tiene que listar sólo archivos tuyos. Si lista uno ajeno,
  **pará** y decilo en el informe: no lo commitees ni lo saques del índice.
- `ESTADO.md` se edita en un solo paso, al cierre. Como lo editan
  todas las sesiones, antes de commitearlo `git diff ESTADO.md`
  tiene que mostrar sólo tu sección. Si trae líneas de otra sesión sin
  commitear, no lo commitees: dejá el texto de tu sección en tu informe y
  avisalo.
- Los tests se leen por **exit code y conteo** de pasados y fallados, no por
  la palabra «passed». Nada de fechas, conteos ni valores quemados en un
  test que puedan cambiar solos (la fecha, el número de métricas del
  registro): afirmá contra la fuente que cambia.
- Nunca termines sin commitear. Si no podés cerrar, commiteá lo que está
  entero, y en el informe decí qué quedó afuera y en qué archivo.

## 6. Material y comandos de prueba

Al 2026-09-28 no hay código ni suites: sólo `docs/fuente/` (el docx de la v14
y su texto en markdown). Cada encargo que cree una herramienta o una suite
deja aquí, en su informe y en `ESTADO.md`, el comando exacto y cuánto tarda;
el orquestador lo pasa a esta sección. Lo previsto:

- Blender headless (encargo 01): `/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/<script>.py -- <args>`.
- Monorepo (encargo 04): `pnpm install`, `pnpm test`, `pnpm dev`; se lee por
  exit code y conteo, nunca por la palabra "passed".
- Móviles de prueba de Hernán: iPhone y Android en la misma red; el servidor
  de desarrollo se levanta con `--host` para verlo desde el teléfono.

## 7. Cómo cierra el encargo

En este orden, y no está terminado hasta el último punto:

1. Las suites que tocaste en verde por exit code y conteo, y la corrida real
   que el prompt pide, con sus números a mano.
2. `ESTADO.md`: una sección nueva arriba de todo,
   `## <fecha> — encargo NN: <título>`, con qué existe ahora, qué falta o no
   se probó, y las desviaciones. Es lo que la sesión siguiente lee para saber
   dónde quedó.
3. El informe en `docs/informes/<AAAA-MM-DD>-NN-<slug>.md` con el formato de
   `docs/informes/README.md`, **con el resumen de diez líneas arriba**.
   Números, no adjetivos: el orquestador no lee código ni datos, decide sólo
   con lo que pongas ahí. Lo abierto y las decisiones que no eran tuyas van
   en sus campos.
4. Commit(s) con rutas explícitas y mensaje que diga qué cambió y por qué.
   El último incluye `ESTADO.md` y el informe.
5. Respuesta final a Hernán, corta: qué quedó, hashes de los commits, y si
   hay front o algo manual, la lista "probá esto, esto y esto" con lo que
   tiene que ver en cada paso.
6. `mcp__ccd_sidebar__mark_completed` sobre `self`, para que la sesión deje
   de pedir atención en la barra. No la archives vos: la archiva el
   orquestador cuando ya leyó tu informe.
