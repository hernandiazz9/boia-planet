# boia-planet

BOIA.PLANET: la web-universo de BOIA, colectivo de eventos musicales de
Alicante. Vende entradas de los "All Day BOIA" y, como segunda vía de
conversión, ofrece un mundo 2.5D isométrico navegable en barco (islas de
eventos, Boya Fiestera, descuentos escondidos, Carnet BOIA). El cliente y
quien aprueba identidad, negocio y publicación es Álvaro (BOIA); Hernán
dirige la construcción.

Fuente de requisitos, en este orden de precedencia:

1. `docs/DECISIONES.md` — decisiones vigentes del orquestador y
   contradicciones de la v14 resueltas. Prevalece sobre todo lo demás.
2. `docs/spec/` — especificación consolidada v15 (cuando exista; la escribe el
   encargo 02). Un requisito, un ID, un sitio.
3. `docs/fuente/v14-maestro.md` — el documento maestro v14 de Álvaro, texto
   íntegro. Es histórico: 50 secciones con capas de decisiones; las §49 y
   §4.4 prevalecen sobre las anteriores dentro de él.

Estado del trabajo: `ESTADO.md` (una sección por encargo, la más nueva arriba).

## Sesiones: orquestador y encargos

El trabajo se reparte en sesiones de Claude Code. Una **orquestadora**
(`/orquestador`) lee los informes, mantiene el backlog en `docs/PLAN.md` y
escribe encargos numerados en `docs/prompts/NN-<slug>.md`. Las sesiones de
**trabajo** (`/encargo NN`) ejecutan uno, commitean y dejan un informe en
`docs/informes/`. Las reglas fijas de cada rol viven en `.claude/skills/`; los
prompts sólo llevan lo específico de cada encargo.
