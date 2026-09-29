# Plan

Última ronda: 2026-09-28 — arranque. El orquestador leyó la v14 entera
(docs/fuente/v14-maestro.md), escribió docs/DECISIONES.md (alcance L1/L2,
stack, pipeline de arte, contradicciones resueltas), completó la ficha de
`.claude/skills/encargo/SKILL.md` y escribió los encargos 01 y 02, que van
en paralelo (no comparten archivos).

Regla de numeración: un ítem recibe número cuando se escribe su prompt; los
pendientes van sin número, en orden de ejecución.

## Dónde está el proyecto, sin optimismo

Fase 0. No hay código: sólo la v14 de Álvaro y las decisiones del orquestador.
Nada está validado. Lo que destraba lo demás, por orden: (1) que el pipeline
de arte produzca un barco en 8 direcciones que se lea como BOIA y no como un
render genérico; (2) que la entrada planeta→mar→landing funcione en un móvil
real sin pantalla en blanco; (3) que el motor de comportamientos de §48
sostenga el editor. Hasta (1) y (2) no se escribe Admin. La ticketera y el
evento objetivo dependen de Álvaro (P2, P3).

## Congelado hasta <condición>

- ~~Faro y Cañón (§49.11): hasta que L1 esté publicado.~~ Descongelados el
  2026-09-28 por D-20: Vigilancia del faro y Cañón contra tiburones están en
  L1, detrás de `INICIAR_MINIJUEGO`, con sus islas en el mapa compartido
  (plan 002, T23).
- Admin (fase 2): hasta que cierren 01, 05 y 07 y Álvaro haya visto el hito 1
  en su móvil.
- Cualquier contenido real (fechas, tickets, fotos, textos): hasta que Álvaro
  lo apruebe. Todo lo demás es `muestra`.
- Contratación de ticketera, Tripo, dominio, Vercel, Supabase de producción:
  la hace Álvaro o Hernán, nunca una sesión.

## Decisiones del orquestador

Las de fondo están en `docs/DECISIONES.md` (D-01 a D-23), con fecha. Aquí sólo
las de mecánica del método:

- 2026-09-28 · **A partir de la ronda 2 el proyecto pasa a la skill
  `/orchestrator`** (inglés, `~/.claude/skills/orchestrator`, lotes de ~10
  tareas grandes que corren solas en worktrees e integran en main). Lo pidió
  Hernán para llegar antes a la demo. El borrador del primer lote está en
  `plans/001-demo-l1.md` (`Status: draft`); se activa cuando cierren 01, 02 y
  03 y `pnpm test` esté en verde en main. El repo ya tiene `.claude/settings.json`
  con `baseRef: head`, `.worktreeinclude` y `.claude/worktrees/` ignorado.
  Este `docs/PLAN.md` y los encargos quedan como registro de la ronda 1; la
  memoria viva pasa a `plans/`.

- 2026-09-28 · Los encargos 01 (arte) y 02 (spec) van en paralelo: 01 toca
  `tools/blender/`, `tools/viewer/`, `art/`; 02 toca `docs/spec/` y
  `tools/spec/`. Ninguno toca `docs/DECISIONES.md` ni este plan.
- 2026-09-28 · Excepción al máximo de dos en paralelo, sólo en R1: tres
  sesiones (01, 02, 03) porque el repo está vacío y sus directorios son
  disjuntos (`tools/`+`art/`, `docs/spec/`, `apps/`+`packages/`+raíz). El
  único archivo común es `ESTADO.md`, cubierto por la regla de "sección
  propia o al informe". A partir de R2 vuelve el máximo de dos.
- 2026-09-28 · Respuestas a las preguntas de los informes 01 y 03: cámara a
  30° (D-13); el 03 adopta el manifiesto del 01 tal cual (ya lo hace); arte
  servido desde el repo en L1 (D-16); la velocidad del HUD de depuración
  sigue siendo respecto al agua; teclado con dos modos (D-14) y barco a
  ~48 px (D-15) los decidió Hernán y entran en el plan 001 (T05 y T04).
  Qué estilos van a Álvaro es P8. Evidencia: informes 2026-09-28-01 y -03.
- 2026-09-28 · Sin Docker: base de datos local en el Postgres 17 de Homebrew
  y proyecto Supabase de desarrollo en la nube para auth (D-17). El plan 001
  lo aplica en T06 y T07.
- 2026-09-28 · Sesiones de trabajo en Opus 5.5 (D-11). Si el 01 muestra que el
  modelado procedural en bpy no alcanza, el siguiente encargo de arte prueba
  image-to-3D, no se sube de modelo.
- 2026-09-28 · Se invierte el orden de los tres prompts de la v14: primero el
  corte vertical de riesgo (arte, motor, entrada, landing), después datos y
  Admin, después aventura completa. Motivo: el Admin es CRUD conocido; lo
  incierto es el mundo.

## Backlog, en rondas

Máximo dos sesiones a la vez, sin archivos compartidos. Unos 25 encargos para
L1, en tres fases con un hito de revisión con Álvaro al cerrar cada una.

### Fase 0 — validar antes de construir
- **R1** · [hecho] **03** monorepo-y-motor-base — b9dd060, b3036f1. `pnpm test` 42/0; /juego a 120 FPS en el Mac; 0,40 MB de 5 MB; ya carga los sprites del 01. ∥ [cerrando] **01** arte-barco-blender — b2d39f9. 56 sprites en 5,3 s, reproducible byte a byte, cubo 1,9998:1 a 30°; exploración de 8 estilos. ∥ [en curso] **02** spec-v15-consolidada.
- **R2** · [pendiente] stack-y-ticketera-adr — ADR del stack de D-04 con una
  prueba mínima de PixiJS v8 + Next.js, y tabla comparativa de ticketeras
  (Fourvenues, Entradium, Wegow, Eventbrite, DICE): API, webhooks, comisiones,
  reembolsos, códigos, checkout móvil. ∥ [pendiente] monorepo-base — pnpm
  workspaces, TS estricto, lint, vitest, CI local, `apps/web` vacía,
  `packages/world` con esquema zod v0.
- Hito 0: Hernán mira el visor del barco y la spec; decide si el pipeline de
  arte sigue o se pasa a image-to-3D.

### Fase 1 — corte vertical de riesgo
- [pendiente] landing-html — landing por bloques con datos `muestra`,
  tickets HTML, hero con presupuesto de 1 MB, accesibilidad, PostHog.
- [pendiente] entrada-cinematica — planeta→mar→landing con máquina de
  estados, saltar, movimiento reducido, alternativa ligera, ENT 01–06.
  Front: lo prueba Hernán en iPhone y Android.
- [pendiente] objetos-y-boia-tutorial — esquema de objeto (§48.2), catálogo
  inicial de comportamientos, isla de prueba por proximidad, boia tutorial
  con bocadillos a 1,5 s.
- Hito 1: Álvaro entra desde su móvil, ve el planeta, la landing, conduce
  hasta la boia. Se cierran P4 y P5.

### Fase 2 — datos, cuenta y Admin esencial
- [pendiente] supabase-esquema — eventos, islas, objetos, mundo versionado,
  bloques de home, usuarios, Carnet, ledger de puntos y monedas, auditoría.
- [pendiente] auth-otp-invitado — OTP + enlace, sesión invitada, fusión
  idempotente por IDs.
- [pendiente] admin-base-y-roles — login con TOTP, roles, auditoría, papelera.
- [pendiente] admin-eventos-y-home — estados de evento con transiciones por
  fecha, evento e isla separados, bloques de home, previsualización.
- [pendiente] admin-editor-mundo — lienzo isométrico compartido con el
  motor, biblioteca de assets, inspector, plantillas, borrador/publicar/restaurar.
- [pendiente] ticketera-adaptador — adaptador con sandbox, webhook → sello.
- [bloqueado por Álvaro] ticketera-real — P2.
- Hito 2: Álvaro crea un evento, lo coloca en una isla y lo publica en diez
  minutos.

### Fase 3 — aventura, identidad y lanzamiento
- [pendiente] mision-fiestera — encuentro, cocodrilos, rescate, pasajera,
  entrega, celebración.
- [pendiente] mar-vivo — restos regenerables, cofres, delfín, remolino.
- [pendiente] naufrago-y-descuentos — descuentos configurables con destino.
- [pendiente] logros-economia-avisos — triggers, puntos, monedas, avisos 4 s.
- [pendiente] carnet-y-sellos — 5 preguntas, Mi Carnet, ver Carnets de otros.
- [pendiente] botellas-y-moderacion.
- [pendiente] circuito-local — checkpoints, boost, tres obstáculos, atajo,
  récord personal.
- [pendiente] mi-barco-y-ranking — color, cosméticos básicos, ranking de puntos.
- [pendiente] artistas-filosofia-fotos — 26 artistas, A–Z, rotación, galerías.
- [pendiente] qa-dispositivos-y-presupuestos — matriz de dispositivos,
  30/60 FPS, carga, accesibilidad.
- [bloqueado por Álvaro] carga-de-contenido-real-y-publicacion.
- Hito 3: lanzamiento L1.

## Preguntas para Hernán

- ~~P6: ¿qué iPhone y Android hay para probar?~~ Cerrada el 2026-09-29 (D-23):
  el móvil físico funciona bien.
- Para Álvaro, vía Hernán: P2 ticketera y P3 (en parte: falta la fecha del
  próximo All Day). P4 cerrada el 2026-09-29 por delegación (D-23, O1). Lo que
  falta está en P14 a P22 de `docs/DECISIONES.md`. (P1 y P5 cerradas el
  2026-09-28: desde cero aquí; barco procedural.)

## Aparcado

- Tres prompts de la v14 §50 como unidad de trabajo: sustituidos por los
  encargos de este plan. Se conservan en la fuente como referencia de alcance.
- Corrientes y boies musicales por capas (§11.5): la propia v14 las deja en
  reserva.
