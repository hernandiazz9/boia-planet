# 01 · El mundo de arcilla, completo, detallado e interactivo

Para correr: abrí una sesión nueva con directorio de trabajo
`/Users/heralc/Desktop/boya.planet/.claude/worktrees/mundos` y escribí
«Leé `mundos/prompts/01-mundo-arcilla-completo.md` y ejecutalo».

Es una **exploración de calidad**, no un encargo del orquestador: no usa
`docs/prompts/`, no toca `main` y no entra en `docs/PLAN.md`. Sirve para ver
hasta dónde llega el pipeline cuando un mundo se diseña en serio.

## Qué estamos haciendo

BOIA.PLANET es la web-universo de BOIA (colectivo de eventos musicales de
Alicante): vende entradas de los All Day BOIA y ofrece un mundo 2.5D isométrico
que se navega en barco. Lo aprueba todo Álvaro (BOIA); lo dirige Hernán.

En las últimas sesiones se armó esta línea de trabajo:

1. **Los barcos son entidades.** Hay 8 remolcadores, uno por estilo, hechos
   por scripts de Blender sin interfaz (`tools/blender/styles/0N_*.py`). Se
   registran en `docs/barcos/barcos.json` (B01 lápiz … B08 pixel art) y tienen
   una guía de colores generada (`docs/barcos/colores.html`, generador
   `tools/barcos/guia_colores.py`).
2. **Cada barco tiene su mundo.** El primero fue el del barco de arcilla (B05):
   la **Cala del Alfar**, con horno de alfarero, chiringuito de paja, paella,
   pista de azulejos, guirnalda entre palmeras y un muelle con botijos. El
   barco se propone llamar «Botijo»: el anfitrión que llega el primero y se va
   el último, «cocina de día, luces de noche». Ficha:
   `docs/barcos/mundos/b05/index.html`. Todo es propuesta para Álvaro.
3. **Un mapa, varios mundos.** El mundo principal es el de arcilla. Elegir
   otro mundo (papel, cartoon…) redibuja todas las islas con el estilo de su
   barco, sin cambiar posiciones, eventos ni progreso. Está en `mundos/`:
   - `escena.py`: el archipiélago, descrito por **papeles** (arena, paja,
     madera, mar…), nunca por colores;
   - `temas.py`: cada mundo traduce cada papel a un material de su estilo, pone
     la luz y aporta su barco, importando los scripts de estilo sin
     modificarlos;
   - `render.py`: encuadra una vez y renderiza todos los mundos con la misma
     cámara; `index.html`: el selector.

   Es la regla de §48 de la spec (apariencia desacoplada del comportamiento)
   aplicada a los mundos.

Hoy el archipiélago tiene 4 islas pequeñas y un visor sencillo. Este encargo
lo lleva a un **mundo completo**.

## Objetivo

Rediseñar el **mundo de arcilla** como un mapa de lanzamiento completo:
muchas más zonas, más piezas, más encuentros y más vida, con día, atardecer y
noche, y un **visor interactivo** a la altura. El resultado tiene que servir
para juzgar calidad: se mira con lupa, se mide y se prueba.

## Dónde trabajar y qué no tocar

- Trabajá sólo en este worktree, rama `exploracion-mundos`, y sólo dentro de
  `mundos/`. Hay otros agentes trabajando en `main` y en otros worktrees.
- **Primer paso:** commiteá lo que dejó la sesión anterior sin commitear:
  `git add mundos && git commit -m "mundos: estado inicial de la exploración" -- mundos`.
- No toques: `main` ni otros worktrees; `tools/blender/**` (sólo se importa);
  `art/`, `apps/`, `packages/`, `supabase/`, `docs/`, `plans/`, `ESTADO.md`,
  `CLAUDE.md`. Si necesitás algo de ahí, léelo; si hay que cambiarlo, anotalo
  en el informe.
- Commits sólo con rutas explícitas bajo `mundos/` (`git commit -m "…" -- mundos/...`).
  Nunca `git add -A`, `git add .` ni `git stash`.
- Nada de servicios externos, cuentas, pagos ni publicaciones. Las librerías
  del visor, ninguna: HTML, CSS y JS propios.
- Todo el contenido (nombres, textos, historias, carteles) es `muestra`: lo
  aprueba Álvaro. No inventes datos reales (fechas, precios, artistas con
  frases): si hace falta un cartel, que diga «muestra».

## Leé antes de escribir

1. `docs/DECISIONES.md` entero (D-02 alcance, D-05 pipeline, D-07 valores,
   D-12 a D-17).
2. `docs/spec/00-indice.md`, `03-mundo-y-motor.md` y `04-aventura.md`; de
   `05` y `06` lo que cites.
3. `docs/barcos/README.md`, `docs/barcos/barcos.json` y
   `docs/barcos/mundos/b05/index.html`.
4. `mundos/README.md`, `escena.py`, `temas.py`, `render.py`, `index.html`.
5. `tools/blender/styles/05_arcilla_maqueta.py` (material de arcilla y
   primitivas) y `tools/blender/rig.py` (cámara 30°, `project_px`,
   `screen_offset_px`).
6. Para la escala y el ritmo: `packages/engine/src/ship/config.ts`
   (`maxSpeed`, unidades), `packages/world/src/iso.ts`, D-15 (barco de unos
   48 px de eslora) y `art/barco/estilos/arcilla/manifest.json`.

## El mundo que hay que diseñar

Un mapa de lanzamiento en clave arcilla, coherente con la spec. Cada REQ
citado se cumple o se declara la desviación:

- **Forma del mapa.** Costas laterales infranqueables y crecimiento hacia
  arriba (REQ-MUN-011). Ruta principal progresiva desde la salida hasta las
  islas de eventos, sin agrupar las actividades (REQ-MUN-015). Desvíos
  opcionales que se pueden rodear, y circuito lateral como atajo a la última
  isla (REQ-AVE-026). Plano con ruta, desvíos y circuito diferenciados
  (REQ-MUN-016, MAP 01).
- **Zonas, como mínimo estas 9:**
  1. **Puerto de salida:** spawn y primera boia tutorial, imposible de ignorar (REQ-AVE-001).
  2. **Cala del Alfar:** la isla del barco. Amplía la actual sin perder lo que ya tiene.
  3. **Encuentro de la Boia Fiestera:** entre 3 y 4 cocodrilos (REQ-AVE-005).
  4. **Isla del escenario del All Day BOIA:** la gran isla comercial (REQ-PRO-006), con una variante «a la venta» y otra «recuerdo» si da tiempo (REQ-COM-005).
  5. **Puerto de Fotos** (REQ-AVE-022).
  6. **Isla tienda** (REQ-COM-033).
  7. **Mar vivo:** restos, cofres, delfín, remolino, náufrago y botellas (REQ-AVE-016 a REQ-AVE-020, REQ-IDE-040).
  8. **Circuito de velocidad:** ruta segura y atajo «ATAJO →» que se unen antes de meta, checkpoints y sólo 3 obstáculos (REQ-AVE-029 a REQ-AVE-031).
  9. **Última isla:** destino de la Fiestera (REQ-AVE-008).

  Además, al menos 3 secretos repartidos (REQ-AVE-015). Faro y Cañón son L2
  (D-02): como mucho, un solar vacío rotulado «L2».
- **Cada zona tiene:**
  - su papel en el recorrido;
  - al menos 5 piezas propias;
  - un personaje o encuentro;
  - los comportamientos del catálogo de §48 que usaría, en tabla;
  - los REQ que cubre;
  - 1 o 2 frases de texto de muestra;
  - su paleta local;
  - cómo cambia de día a noche.
- **Personajes nuevos en arcilla:** como mínimo náufrago, cocodrilo, delfín y
  Boia Fiestera. Sigue las formas blandas del estilo 05.
- **Ritmo.** Calculá la ruta directa y la de exploración en segundos con la
  velocidad del motor, y documentá la conversión de unidades de Blender a
  píxeles y a segundos. Los objetivos son 1 minuto y 10 minutos
  (REQ-MUN-017). Si la maqueta va comprimida respecto al juego, declará el
  factor de escala y qué tiempo daría en el juego.
- **Una sola fuente.** El mapa vive en `mundos/arcilla/mapa.json`: zonas (id,
  nombre, centro, contorno, piezas, encuentro, REQ), rutas (polilíneas),
  circuito, costas y secretos. La escena de Blender, el plano y el visor leen
  ese archivo; nada se copia a mano entre ellos.

## Qué hay que producir

Todo bajo `mundos/arcilla/`, salvo el informe:

1. **`diseno.md`:** concepto, historia del mundo (propuesta), tabla de zonas
   con todo lo anterior, ruta y ritmo con cálculos, paleta del mundo (nuevos
   colores con hex y papel) y preguntas para Álvaro.
2. **`mapa.json`**, más `plano.svg` generado desde él: plano cenital con
   zonas, ruta principal, desvíos, circuito, costas y secretos.
3. **Escena de Blender** en `escena.py`. Si conviene, una pieza por archivo en
   `zonas/<id>.py`. Construye desde `mapa.json` con el sistema de papeles y
   temas. Los mundos papel y cartoon tienen que seguir renderizando la vista
   general sin errores: no hace falta pulirlos.
4. **Renders de arcilla:**
   - vista general de día, de atardecer y de noche;
   - un primer plano por zona, de día y de noche.

   Los maestros van en PNG en `render/`. Para el visor, WebP: la vista general
   pesa como máximo 900 KB por hora y cada primer plano, 250 KB. Cada render
   exporta un JSON con la posición en píxeles de zonas, lugares y rutas
   (proyección con `rig.project_px`) para las capas del visor.
5. **Visor interactivo `index.html`**, sin dependencias y servido estático:
   - **Mapa:** pan y zoom con rueda, pellizco, botones y teclado, con límites y sin perder nitidez hasta el zoom máximo.
   - **Hora:** día, atardecer y noche, con fundido.
   - **Capas activables:** zonas, ruta principal, desvíos, circuito, radios de proximidad, costas y colisión, lugares y secretos (ocultos por defecto).
   - **Ficha de zona:** al pulsar una zona se abre un panel, que en móvil es una hoja inferior. Trae el primer plano, la descripción, las piezas, el encuentro, las mecánicas de §48 y sus REQ y el texto de muestra, con navegación a la zona anterior y la siguiente y enlace profundo `#zona`.
   - **Modo recorrido:** el barco B05 recorre la ruta principal con sus sprites de 8 direcciones (`art/barco/estilos/arcilla/`; la dirección se elige con `bow_screen` del manifiesto, no con sectores de 45°). Un reloj muestra el tiempo simulado según el ritmo calculado. Se puede pausar y avanzar zona a zona.
   - **Mundo:** selector de mundo para la vista general (arcilla, papel, cartoon).
   - **Accesibilidad:** teclado completo, foco visible, textos alternativos y `prefers-reduced-motion`, que quita fundidos y animación.
   - **Móvil:** a 375×812, sin scroll horizontal y con gestos táctiles.
6. **Informe** en `mundos/informes/<AAAA-MM-DD>-01-mundo-arcilla.md`: resumen de diez líneas arriba, números con su comando, capturas en `mundos/informes/img/`, lo que no se hizo y por qué, y preguntas para Álvaro y Hernán.

## Cómo se comprueba la calidad

No está terminado hasta cumplir todo esto, con evidencia en el informe:

- **Reproducible.** El render completo se corre dos veces y la comparación
  sale idéntica (hash por archivo, o diferencia de píxeles si Eevee no fuera
  determinista: decí cuál). Reportá el tiempo total y por imagen.
- **Contenido.** Hay 9 zonas o más, cada una con su primer plano. Un script
  cuenta las piezas por zona por el prefijo de nombre: tabla con el conteo,
  mínimo 5 por zona.
- **Legibilidad.**
  - Todos los rótulos caen dentro de la imagen y, a 1440 px de ancho, a 40 px o más entre sí.
  - Boia, cofres, botellas y barco contrastan con el mar a ΔE76 de 30 o más; usá las funciones de `tools/barcos/guia_colores.py`.
  - La primera boia se ve en la vista general a tamaño de móvil.
- **Ritmo.** Tabla con la longitud de la ruta directa y de la de exploración,
  la velocidad, el tiempo y la comparación con 60 s y 600 s.
- **Visor.**
  - Probado en el navegador integrado a 375×812 y 1440×900, con capturas.
  - Cero errores de consola.
  - Probados uno a uno: pan, zoom, pellizco, capas, ficha de zona, enlace profundo, teclado, cambio de hora, cambio de mundo, recorrido y movimiento reducido.
  - Carga inicial, con el HTML y las imágenes de la primera vista, de 2 MB como máximo; los primeros planos se cargan al abrir su zona.
- **Estilo.** Ninguna pieza nueva tiene colores sueltos: todo sale del tema.
  La paleta nueva está en `diseno.md`. Papel y cartoon renderizan la vista
  general: capturas.
- **Autoevaluación.** Rúbrica de 10 criterios del 1 al 5, cada uno con una
  captura de evidencia y qué haría falta para subir un punto:
  - composición;
  - lectura a tamaño de móvil;
  - coherencia del estilo;
  - variedad de zonas;
  - vida y encuentros;
  - día y noche;
  - fidelidad a la spec;
  - interactividad;
  - rendimiento;
  - accesibilidad.

## Forma de trabajo

- **Fases, con un commit al cerrar cada una:**
  1. `mapa.json`, `plano.svg` y `diseno.md`.
  2. Escena y vista general de día.
  3. Atardecer, noche y primeros planos.
  4. Visor.
  5. QA e informe.
- **Prioridad si el tiempo aprieta:** vista general más 9 zonas más visor con
  capas y fichas, antes que el recorrido; el recorrido, antes que el
  atardecer; el atardecer, antes que pulir papel y cartoon. Lo que quede fuera
  va en el informe.
- **Subagentes.** Podés usarlos para modelar zonas en paralelo, cada uno en su
  `zonas/<id>.py` y con el mismo sistema de papeles. La integración, el diseño
  y la voz de los textos son tuyos.
- **Autonomía.** Las decisiones reversibles de diseño las tomás y las
  documentás (§49.18). Nombres, historias y textos van como propuesta.
- **Mirá lo que hacés.** Revisá cada render como imagen antes de seguir y
  corregí lo que se vea mal (solapes, piezas flotando, contornos que ensucian).
  Hazlo antes de medir.
- **Para verlo:** el servidor estático de Hernán en el 8080 sirve la raíz del
  repo principal. El visor queda en
  `http://localhost:8080/.claude/worktrees/mundos/mundos/arcilla/index.html`.

## Cómo cerrar

1. Todas las comprobaciones de «Cómo se comprueba la calidad», con números.
2. El informe, con el resumen arriba.
3. El último commit en la rama `exploracion-mundos`, con rutas explícitas.
4. Una respuesta corta para Hernán:
   - qué quedó, con los hashes;
   - la URL del visor;
   - una lista «probá esto» de 6 a 8 pasos, cada uno con lo que tiene que ver;
   - las tres cosas que peor salieron.
