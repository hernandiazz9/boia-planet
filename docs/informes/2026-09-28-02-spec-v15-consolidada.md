# spec-v15-consolidada — 2026-09-28

## Resumen
- `docs/spec/` tiene los 12 archivos pedidos: 279 REQ en 8 áreas (244 L1 · 33 L2 · 2 diferidos), cada uno definido una vez en su archivo y resumido en una fila de `09-requisitos.md`.
- `python3 tools/spec/check.py` sale con 0 e imprime «279 requisitos, 0 duplicados, centinelas 10/10» en 0,05 s. `python3 tools/spec/test_check.py`: 18 pruebas de mutación, 18 OK, exit 0, 1 s.
- Marcas: 24 `[pendiente Álvaro]`, 2 `[pendiente Hernán]` y 20 `[provisional]`. De las provisionales, 18 son por alcance que D-02 no nombra y 2 por contradicciones nuevas.
- Contradicciones de la v14 que D-08 no cubre: 2 (cocodrilo del circuito, §13 frente a §48.5; qué es «Inicio», §19 frente a §4.4). Van resueltas por precedencia y marcadas.
- Tamaño: 26.114 palabras por `wc -w` (22.229 sin separadores de tabla). Supera las 12.000–18.000 esperables y roza la v14 (24.818). Causa y opciones en la pregunta 5.
- El prompt esperaba «centinelas 7/7», pero su propia lista suma 10 cadenas. El check imprime 10/10 (pregunta 6).
- Dos revisores independientes cruzaron la v14 entera contra la spec: 18 hallazgos, todos incorporados antes del commit.
- Por decidir: alcance de 18 REQ (pregunta 1), 2 contradicciones (2 y 3), dónde se lleva el estado de cada REQ (4) y el tamaño (5).

## Para Hernán
Nada que probar: es documentación. Las preguntas 1 a 6 son para el orquestador, y la 1 puede necesitar a Álvaro.

## Encargo
Consolidar la v14 en `docs/spec/` (12 archivos, un requisito por ID, con fuente, alcance y criterio) y escribir `tools/spec/check.py`.

## Hecho
Commits: `75f7f61` con `docs/spec/**`, `tools/spec/check.py` y `tools/spec/test_check.py`; `7db7879` con este informe y mi sección de `ESTADO.md`; y un tercero que aplica D-13 a D-17 y actualiza ambos.

| Archivo | Contenido | REQ |
|---|---|---|
| 00-indice | Prevalencia de DECISIONES, archivos, cómo se citan los IDs, reglas de alcance, secciones sin REQ y apéndice de desviaciones (5 tablas) | — |
| 01-producto-y-flujos | Visión, flujos, tipos de evento, reglas UX, cobertura del piloto (§27, §47), contenido de BOIA y publicación | 21 |
| 02-entrada-y-landing | Cinemática, landing, home por bloques, accesos con isla visible; alias ENT 01–06 | 39 |
| 03-mundo-y-motor | Controles, mapa y ritmo, minimapa, catálogo de 12 comportamientos, barco y sprites; alias MAP 01 y ART 01 | 34 |
| 04-aventura | Tutorial, Fiestera, islas, mar vivo, circuito, minijuegos (L2) | 39 |
| 05-identidad-y-comunidad | Invitado, cuenta, Carnet, sellos, logros, economía, menú, ranking, botellas, encuestas y mensajes (L2) | 50 |
| 06-comercial | Eventos y tabla de 7 estados, ticketera, descuentos, 26 artistas, fotos y tienda | 34 |
| 07-admin | Acceso, roles, editor, publicación, logros, Carnets, borrado, temporadas, tabla de §49.15 | 38 |
| 08-arquitectura-y-datos | Stack, tabla de entidades, transacciones, antitrampas, presupuestos, pruebas | 24 |
| 09-requisitos | Tabla maestra: ID · texto · fuente · alcance · criterio · notas | — |
| 10-filosofia | §37 y §31 textuales, con dos notas de D-08 | — |
| 11-glosario | Unos 60 términos | — |

- **`tools/spec/check.py`** usa sólo la biblioteca estándar. Comprueba los 12 archivos, el formato de cada definición, que cada REQ esté en el archivo de su área, que no haya IDs repetidos, que cada REQ tenga una fila en 09 con la misma fuente, el mismo alcance y las mismas marcas, que no haya referencias a REQ inexistentes, que cada alias de la v14 esté en un solo REQ y que existan los centinelas. Imprime el conteo por área, alcance y marca.
- **`tools/spec/test_check.py`** copia la spec a un directorio temporal, rompe una cosa distinta en cada prueba y exige exit 1 con el mensaje exacto.
- **D-12 a D-17 llegaron durante la sesión** y están aplicados:
  - D-12, el joystick nace donde toca el primer dedo: REQ-MUN-006.
  - D-13, cámara a 30°: REQ-MUN-032.
  - D-14, teclado con dos modos: REQ-MUN-008.
  - D-15, barco de unos 48 px de muestra: nota en 03.
  - D-16 y D-17, arte desde el repositorio y Postgres local: nota de entorno en 08.

  D-13 a D-17 entraron en `DECISIONES.md` con el commit `5c28de1`, después de mi primer commit, y se aplicaron en el tercero.
- **Secciones que el prompt no asignaba:** §28, §33, §45–47 y §49.18 van en 01; §34, §35 y §49.14, en 03. Está documentado en 00.
- **Distinto de lo pedido:**
  - En 09, «texto en una línea» es un título corto. El texto normativo completo vive sólo en el archivo del área, para no duplicar 279 frases.
  - 09 se generó con un script de autoría que no se commitea: toma fuente, alcance y marcas de las definiciones, y título y criterio de un archivo de trabajo. Desde ahora 09 se edita a mano y el check vigila la coherencia.
  - `test_check.py` es un archivo que el prompt no nombraba; está dentro de `tools/spec/**`.
- **No se tocó:** `docs/DECISIONES.md`, `docs/PLAN.md`, `docs/prompts/`, `CLAUDE.md` ni código de aplicación.

## Probado
```
python3 tools/spec/check.py        # exit 0 · 0,05 s
python3 tools/spec/test_check.py   # Ran 18 tests · OK · exit 0 · 1,0 s
wc -w docs/spec/*.md               # 26114 total
```

Conteo por área y alcance (salida de check.py):

| Área | Total | L1 | L2 | diferido |
|---|---|---|---|---|
| PRO | 21 | 21 | 0 | 0 |
| ENT | 39 | 37 | 2 | 0 |
| MUN | 34 | 33 | 1 | 0 |
| AVE | 39 | 31 | 7 | 1 |
| IDE | 50 | 41 | 8 | 1 |
| COM | 34 | 30 | 4 | 0 |
| ADM | 38 | 28 | 10 | 0 |
| ARQ | 24 | 23 | 1 | 0 |
| **Total** | **279** | **244** | **33** | **2** |

**Mutaciones.** Cada prueba rompe una cosa y el check la detecta. Las roturas cubren:
- una definición duplicada, una fila que falta en 09 y una fila repetida;
- alcance distinto, alcance inválido, fuente distinta y fuente ausente;
- un criterio vacío o una marca que falta en las notas;
- un REQ en un archivo que no es el de su área;
- una referencia colgante, un alias repetido, un centinela borrado o una pregunta alterada (`…` cambiado por `...`);
- un archivo de más o de menos.

Además, un ejemplo dentro de un bloque de código no cuenta como definición. La primera tanda encontró un fallo real: «Wet Kisses» también aparecía en el índice, así que borrarlo de la lista de artistas no se detectaba. Ahora cada centinela debe estar en el archivo de su requisito.

**Revisión de cobertura.** Dos subagentes leyeron cada uno media v14 contra la spec y verificaron cada hallazgo con grep:
- Tramo §1–§37: 8 hallazgos.
- Tramo §38–final: 10 hallazgos.

Los 18 se incorporaron. Entre ellos:
- la rotación «equilibrada» de artistas;
- el punto seguro de los objetos;
- el aviso de impacto también al editar;
- la gestión de música en el Admin (REQ-ADM-020, nuevo);
- una temporada activa en L1 (REQ-ADM-032, nuevo);
- la economía ajustable desde el Admin;
- la condición del formulario de suscripción;
- los detalles de L2 de minijuegos, encuestas, mensajes y perfiles.

El primer revisor comprobó con un script que §37 y §31 están enteros y textuales en 10-filosofia. Por mi cuenta añadí dos cosas: los criterios del ADR de ticketera de P1 (en REQ-COM-015) y el archivo web de eventos pasados de P3 (en REQ-COM-005).

**Cruce de marcas.** Las 20 provisionales listadas en 00 coinciden con las 20 marcadas, sin faltas ni sobras (script de comprobación en la sesión).

Palabras por archivo:

| Archivo | `wc -w` | Sin separadores |
|---|---|---|
| 00 a 08 (nueve archivos) | 15.238 | 13.853 |
| 09-requisitos | 8.038 | 5.766 |
| 10-filosofia | 1.700 | 1.546 |
| 11-glosario | 1.138 | 1.064 |

## Queda abierto
- **Tamaño por encima de lo esperable** (pregunta 5). Una sesión de trabajo lee 00 y una o dos áreas, unas 5.000 palabras, frente a las 24.818 de la v14.
- **Títulos de 09 sin vigilancia.** El check no compara el título de 09 con el texto de su definición: fuente, alcance y marcas sí se vigilan, el título no. Si alguien reescribe un REQ, el título puede quedar viejo.
- **Estado de implementación sin sitio.** REQ-PRO-017 pide estado por REQ (No integrado … Implementado satisfactorio) y 09 no lo lleva (pregunta 4).
- **Dispositivos de referencia sin fijar.** P6 sigue abierta: REQ-ARQ-014 y REQ-ARQ-015 no tienen criterio medible hasta que se sepa cuáles son.
- **24 REQ esperan a Álvaro:**
  - Copy: REQ-ENT-025, REQ-ENT-028, REQ-AVE-003, REQ-IDE-007, REQ-COM-030.
  - Legales y datos: REQ-ENT-032, REQ-ARQ-013, REQ-ADM-030.
  - Negocio: REQ-COM-008, REQ-COM-015, REQ-COM-019, REQ-COM-020, REQ-COM-033, REQ-AVE-020, REQ-AVE-021, REQ-AVE-023.
  - Economía: REQ-AVE-008, REQ-IDE-025, REQ-IDE-028, REQ-IDE-029, REQ-IDE-030.
  - Artistas y contenido: REQ-COM-029, REQ-PRO-019, REQ-ADM-020.
- **Referencia pendiente en la skill del encargo.** `.claude/skills/encargo/SKILL.md` §2 y §6 hablan de `docs/spec/` «cuando exista». Ya existe: falta añadir los dos comandos a §6. No es un archivo mío.
- **Sección del 01 en ESTADO.md.** Al commitear, `ESTADO.md` no tenía cambios de otra sesión. La sesión del 01 seguía abierta, con su informe sin commitear.

## Para que pruebe Hernán
Nada de front.

## Preguntas para el orquestador
1. **Alcance de 18 REQ que D-02 no nombra.** Hoy llevan el alcance provisional de la tabla. Se confirma cada fila o se mueve:

   | REQ | Qué | Provisional | Alternativa |
   |---|---|---|---|
   | ENT-016 | Admin de la entrada: recursos, parámetros, vista previa y restaurar | L2 | L1. Un revisor señala que D-02 cita §4.4 entero en L1 y que ENT 06 pide «configuración editable» |
   | ENT-031 | Bloques de actividades y comunidad en la landing | L2 | L1 |
   | MUN-005 | Ciclo de día y noche (P1, P3) | L2 | L1 |
   | AVE-023 | Boia de WhatsApp | L1, porque sólo configura comportamientos de L1 | L2, junto a la promoción de WhatsApp |
   | AVE-024 | Boia musical con 4 canciones | L2 | L1 |
   | IDE-008, IDE-009 | Invitaciones a crear Carnet (5 min o 3 logros; 3 min entre avisos; 3 por sesión) | L1 con valores fijos | L2 |
   | IDE-016 | Editar las preguntas del Carnet desde el Admin | L2 | L1 |
   | IDE-023 | QR alternativo de sello | L2 | L1 si la ticketera no tiene webhook (D-06) |
   | COM-032 | Vídeos en galerías, islas y bloques | L1 | L2, porque D-02 dice «fotos» |
   | COM-033 | Tienda de L1: Isla Tienda y panel con enlace externo | L1 | Enlace externo sin isla, que contradice §49.6 |
   | ADM-005 | Roles moderador y artista | L2 | Moderador en L1, porque moderar botellas es L1 |
   | ADM-008 | Secciones del Admin en L1: añade Integraciones, Logros y cosméticos, Textos y música, Temporadas (sólo la activa) | L1 | Recortar |
   | ADM-020 | Música y efectos desde el Admin | L1 | L2, con la música en el repositorio |
   | ADM-025 | Editar cualquier Carnet | L2 | L1 parcial: moderar apodo, avatar y respuestas. Sin eso, en L1 un apodo ofensivo sólo se retira tocando la base de datos |
   | ADM-031 | Atender a mano las peticiones de descarga o borrado de cuenta | L1 | Ninguna razonable: el RGPD obliga a atenderlas |
   | ADM-032 | Una sola temporada activa en L1 | L1 | Ninguna: los destinos por ID de temporada ya son L1 |
   | ADM-037 | Ajustar los valores del registro contextual desde el Admin | L2 | L1 |

2. **Cocodrilo del circuito (REQ-AVE-030).** §13 dice «frenazo fuerte»; §48.5, «ralentizar 60 % durante 2 s». Hoy se aplica §48.5 por precedencia.
   - (a) Confirmar §48.5.
   - (b) Aplicar §13: el cocodrilo frena y la medusa ralentiza, tres efectos distintos.

   Cualquiera de las dos cuesta un parámetro.
3. **Qué es «Inicio» (REQ-IDE-034, REQ-ENT-012).** §19 llama «⚓ Inicio / Welcome Aboard» a la primera sección del menú; §4.4 pide «una vuelta clara a Inicio», que es la landing. Hoy «Inicio» es la landing, la sección del menú se llama Welcome Aboard y el ancla abre el menú.
   - (a) Confirmar.
   - (b) Respetar §19 literal y llamar distinto a la vuelta a la landing.
4. **Dónde se lleva el estado de cada REQ (REQ-PRO-017).**
   - (a) En un archivo aparte, por ejemplo `docs/seguimiento.md`, fuera de la spec para que ésta no cambie con cada encargo. Es lo que recomiendo.
   - (b) En una columna más en 09, lo que obliga a tocar el check.
   - (c) Sólo en los informes.
5. **Tamaño.** Son 26.114 palabras frente a las 12.000–18.000 esperables. Las causas:
   - cada uno de los 279 REQ atómicos aparece dos veces, como definición y como fila;
   - la filosofía va textual (1.546);
   - el apéndice de desviaciones ocupa unas 1.000.

   Opciones:
   - (a) Aceptarlo, porque ninguna sesión lee la spec entera.
   - (b) Fusionar REQ hasta unos 200: ahorra unas 3.000 palabras, pero pierde granularidad de criterio.
   - (c) Recortar prosa y glosario: ahorra unas 1.000.
6. **Centinelas.** El prompt esperaba «7/7», pero su lista da 10 cadenas: 5 preguntas y otras 5. El check imprime 10/10. Si había un séptimo grupo en mente, falta nombrarlo.
