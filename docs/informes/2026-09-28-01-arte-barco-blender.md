# arte-barco-blender — 2026-09-28

## Resumen
- El pipeline de arte funciona sin interfaz y sin cuentas. Blender 5.2.2 LTS se instaló con brew sin pedir contraseña.
- Un script construye un velero low-poly con toon de tres tonos y contorno. Salen 56 PNG de 256×256 y un manifiesto con anclajes proyectados: 3 skins × 8 direcciones × con y sin pasajera, más 8 fotogramas de balanceo.
- El lote tarda 5,3 s, a 0,09 s por imagen. Dos corridas dan los 57 archivos idénticos byte a byte. `check.py` sale con exit 0: «56 imágenes, manifest válido».
- Calibración del cubo: 1,9998 de proporción, dentro de 2,0 ± 0,04.
- **Desviación:** la cámara va a 30° de elevación, no a los 26,57° del prompt. Con 26,57° el cubo mide 2,2355 y la prueba falla. D-13 ya lo confirmó durante la sesión.
- Los rumbos en pantalla coinciden con la proyección dimétrica en las 8 direcciones. Ninguna se invierte al pasar por N.
- A pedido de Hernán, 8 agentes rehicieron en Blender los 8 estilos de su lámina de conceptos con nuestra cámara. Los 8 scripts se regeneran en 1,8 a 6,1 s. Los que mejor aguantan el tamaño de sprite son cel-shaded, cartoon años 30 y pixel-art. Comparativa en `docs/informes/img/01-estilos-comparativa.png`.
- Abierto: qué estilo y qué barco (velero o remolcador) pasan a Álvaro. El 03 tiene que leer el manifiesto con la forma documentada abajo.

## Para Hernán
Con tu servidor del 8080, abrí `http://localhost:8080/tools/viewer/` y recorré la lista de abajo. Después mirá `docs/informes/img/01-estilos-comparativa.png` y decí qué estilos siguen.

## Encargo
Validar que un pipeline reproducible de Blender sin interfaz produce el barco en 8 direcciones, con 3 skins, pasajera, anclajes y manifiesto, y un visor estático para revisarlo.

## Hecho
Commits:
- `b2d39f9`: pipeline, visor, sprites y manifiesto.
- Commit de cierre: los 8 scripts de estilo, las capturas y hojas de `docs/informes/img/01-*`, este informe y `ESTADO.md`.

Qué existe ahora:
- `tools/blender/rig.py`: cámara, luz y ajustes de render compartidos por todos los scripts. La cámara es ortográfica, con elevación de 30° y azimut de 45°, `ortho_scale` 2,9 (88,28 px por unidad), y el punto de agua cae en el píxel (128, 192). El sol queda fijo y gira sólo el barco. Eevee usa 16 muestras fijas, view transform Standard y PNG sin metadatos variables.
- `tools/blender/ship.py`: el barco procedural. Lleva casco con cubierta hundida y regala, mástil, botavara, vela con barriga en franjas, bandera de tres franjas, bauprés con farol, timón y caña, y un salvavidas sólo a babor. El salvavidas es asimétrico a propósito: delata cualquier sprite espejado. Los materiales son toon (Diffuse → Shader to RGB → rampa de 3 tonos) y el contorno es un casco invertido. Las skins `base`, `noche` y `fiesta` sólo cambian colores de materiales. La paleta de muestra está en `BOIA_PALETTE_MUESTRA` (#F26A1B, #12233F).
- La pasajera es un placeholder de la Boia Fiestera: un cilindro rosa y blanco con cara y gorro de fiesta. Cuelga del empty `slot_passenger` en la bañera, a estribor, para que el mástil no le cruce la cara en la vista S.
- `tools/blender/render.py`: escribe `art/barco/<skin>/<dir>[_p].png`, `art/barco/base/S_bob_<n>.png` y `art/barco/manifest.json`.
- `tools/blender/manifest.schema.json` y `tools/blender/check.py`: el check usa el Python del sistema, sin dependencias, con decodificador de PNG y validador de esquema propios.
- `tools/blender/calibrate.py`: renderiza el cubo unidad y mide la cara superior por momentos de segundo orden, con precisión sub-píxel.
- `tools/viewer/index.html`: página estática sin dependencias. Tiene agua en canvas con dos capas de ondas y el barco anclado por su pivote. Se gira con flechas, arrastre o botones, y cambia de skin con 1/2/3. La tecla `p` muestra la pasajera, `a` los anclajes, `b` el balanceo, `w` la estela y `r` el giro automático. Acepta parámetros de URL como `?dir=W&skin=noche&p=1&a=1&ui=0` para capturas reproducibles.
- `.gitignore`: se añadió `__pycache__/`.

Forma del manifiesto, que es el contrato que lee el encargo 03:
- `projection` trae `camera_elevation_deg`, `camera_azimuth_deg`, `ortho_scale`, `pixels_per_unit` y `pivot_px`.
- `direction_order` es `["S","SW","W","NW","N","NE","E","SE"]`, que es el sentido horario en pantalla.
- `directions.<DIR>` trae `yaw_deg`, `bow_screen` (vector unitario del rumbo en pantalla) y `anchors`. Los anclajes son `pivot`, `mast_top`, `slot_passenger`, `wake_origin` y `bow`, en píxeles continuos con origen arriba a la izquierda.
- `images[]` trae `file`, `skin`, `direction`, `frame` y `passenger`. Los fotogramas de balanceo añaden `animation: "bob"` y sus propios `anchors`, porque el barco se mueve y el pivote no.
- También trae `animations.bob` (8 fotogramas, 8 fps, en bucle), `id`, `version`, `status: "muestra"`, `license: "muestra interna"` y `generator`: scripts, sha256 de las fuentes y versión de Blender.
- Se añadió el anclaje `bow`, la roda a la altura del agua. Restado a `wake_origin` da el rumbo exacto del casco.
- En dimétrica, las 8 direcciones no están a 45° en pantalla, sino a 90, 153,4, 180, 206,6, 270, 333,4, 0 y 26,6 grados. El motor debería elegir el sprite comparando con `bow_screen`, no con sectores de 45° en pantalla.

No se tocó nada fuera de `tools/blender/`, `tools/viewer/`, `art/`, `.gitignore`, `docs/informes/img/01-*`, `ESTADO.md` y este informe. No se usó ninguna API, cuenta ni servicio externo.

## Probado
| Qué | Comando | Resultado |
|---|---|---|
| Instalación | `brew install --cask blender` | Blender 5.2.2 LTS, sin contraseña |
| Calibración a 30° | `Blender -b -P tools/blender/calibrate.py` | `ratio=1.9998` (caja 124×62 px = 2,0000), exit 0 |
| Calibración a 26,565° | `Blender -b -P tools/blender/calibrate.py -- --elevation 26.565` | `ratio=2.2355`, exit 1 |
| Lote completo | `Blender -b -P tools/blender/render.py -- --all` | 56 imágenes en 5,26 s dentro de Blender, 6,3 s de reloj con arranque |
| Por imagen | `tools/blender/out/render_stats.json` | media 0,093 s; primera 0,465 s por compilar shaders; resto 0,086 s |
| Tamaño PNG | igual | media 15.136 bytes, mín 9.326, máx 22.143; `art/barco` ocupa 944 KB |
| Check | `python3 tools/blender/check.py` | exit 0, «56 imágenes, manifest válido», 8 s |
| Reproducibilidad | segundo `render.py -- --all --out tools/blender/out/rerun` y `check.py --diff` | 0 de 56 imágenes con algún píxel distinto; con `cmp`, 0 de 57 archivos distintos |
| Margen | `check.py` | mínimo 12 px hasta el borde (base/E); el borde de 4 px es transparente en las 56 |
| Pasajera visible | `check.py` | cambia 1.511 px como mínimo (fiesta/SW) y 1.749 de media |
| Rumbo por dirección | `check.py` | S 90,0°, SW 153,4°, W 180,0°, NW 206,6°, N 270,0°, NE 333,4°, E 0,0°, SE 26,6°; error bajo 1° contra la proyección teórica |

Qué comprueba `check.py`:
- valida el manifiesto contra el esquema;
- exige exactamente las 56 imágenes, en disco y en el manifiesto;
- comprueba canal alfa y el borde de 4 px transparente;
- exige que el pivote sea el mismo en todas las imágenes, y también en el balanceo;
- exige que `mast_top` y `slot_passenger` caigan sobre píxeles del barco;
- compara el rumbo `bow - wake_origin` con la proyección teórica y exige que la secuencia gire en sentido horario y sin saltos;
- mide cuánto cambia la pasajera en cada imagen;
- con `--diff`, compara píxel a píxel contra otra corrida.

Mutaciones, cada una sobre una copia en el scratchpad:

| Rotura | Detectada |
|---|---|
| Borrar `noche/W_p.png` | sí, «faltan noche/W_p.png» |
| Invertir proa y popa en N | sí, 3 fallos, entre ellos «rumbo NW→N gira 243,4°» |
| Quitar `license` y poner `passenger: "no"` | sí, 3 fallos de esquema |
| Poner una imagen sin pasajera como `base/E_p` | sí, «la pasajera sólo cambia 0 píxeles» |
| 3 píxeles opacos en el borde | sí, «3 píxeles no transparentes en el borde de 4 px» |
| `base/SE` espejado | sí, «mast_top no cae sobre el barco» |

La prueba del borde se repitió escribiendo el PNG a mano. La primera versión, hecha con ffmpeg, no dejaba el alfa opaco y no rompía nada.

El visor se probó en el navegador integrado con el servidor del puerto 8080:
- carga el manifiesto y las 56 imágenes sin errores de consola;
- con → se recorren las 8 direcciones y se vuelve a S;
- las teclas 1, 2, 3, `p` y `a` hacen lo suyo;
- arrastrar 100 px gira dos pasos en cada sentido;
- el balanceo anima en base/S.

A 375×812 la página mide bien, pero el panel no captura esa emulación. La prueba en teléfono real queda para Hernán.

Capturas en `docs/informes/img/`: `01-visor-S.png`, `01-visor-W.png` y `01-visor-N.png` con pasajera, y `01-hoja-skins.png` con las 3 skins en las 8 direcciones con pasajera.

## Exploración de estilos (pedido de Hernán durante la sesión)
Hernán pidió durante la sesión rehacer en Blender los 8 estilos de su lámina de conceptos (un remolcador visto desde la proa) con la cámara del juego. Se lanzó un agente por estilo, en paralelo.

Cada agente dejó:
- un script en `tools/blender/styles/NN_<slug>.py` que construye su propio remolcador y renderiza las 8 direcciones a 256 px y una vista SE a 512 px;
- una hoja de 8 direcciones y la vista ampliada en `docs/informes/img/01-estilo-NN-<slug>[-hero].png`.

Todos usan `rig.py` sin modificarlo y ninguno toca `art/` ni el manifiesto. Son pruebas de estilo: no traen skins, pasajera ni anclajes.

`docs/informes/img/01-estilos-comparativa.png` reúne las 8 vistas ampliadas. Arriba, de izquierda a derecha: lápiz, acuarela, low-poly y semi-realista. Abajo: arcilla, cartoon años 30, cel-shaded y pixel-art.

Corrí yo los 8 scripts, uno detrás de otro, con `Blender -b -P tools/blender/styles/NN_<slug>.py -- --out tools/blender/out/styles/NN_<slug>`. Los 8 salieron con exit 0, sin píxeles opacos en el borde de 4 px y con el mismo tamaño y alfa que exige `check.py`.

| Estilo | Tiempo total | Margen mín. | Qué se lee a 256 px | Riesgo principal |
|---|---|---|---|---|
| 01 lápiz | 4,6 s | 20 px | Silueta blanca, tramado y trazo tembloroso | Monocromo, sin skins de color; el tramado es de pantalla y «nada» si el barco se balancea |
| 02 acuarela | 3,2 s | 15 px | Pintura suave con contorno irregular | Necesita una pasada de numpy después de Blender; el velo semitransparente ensucia otros fondos; el casco azul se confunde con el agua |
| 03 low-poly | 2,7 s | 23 px | Facetas limpias y colores planos | Genérico, con poca personalidad |
| 04 semi-realista | 3,1 s | 21 px | Silueta y bloques de color; el óxido queda en ruido de 1 o 2 px | AgX desatura la marca; sin contorno se funde con el agua; el detalle «hierve» si se anima |
| 05 arcilla | 6,1 s | 20 px | Juguete blando con techo de paja | Sin contorno; AgX desatura; las skins temáticas piden modelado |
| 06 cartoon años 30 | 2,2 s | 23 px | Silueta oscura con acentos rojos y crema | Pide paleta de 3 colores, así que una skin «fiesta» rompe el estilo; el semitono es de pantalla |
| 07 cel-shaded | 3,4 s | 21 px | Tinta de 3 grosores y sombras duras | Casco azul sobre agua azul; los faroles se empastan |
| 08 pixel-art | 1,8 s | 20 px | Arte de 64 px, 14 colores y contorno de 1 px | Obliga a que el resto del juego sea pixel art |

Lo que conviene saber para decidir:
- **Tamaño en pantalla:** con D-15 el barco mide unos 48 px de eslora en pantalla. El sprite de 256 se ve al 27 % en píxeles CSS, que en un teléfono de densidad 3 son unos 80 % en píxeles reales. Cajas, faroles y el «≈» de la bandera desaparecen a ese tamaño. Ganan los estilos con silueta fuerte, contorno y color plano: cel-shaded, cartoon años 30, pixel-art y el toon actual de `ship.py`.
- **Bandera de canto:** en las 8 pruebas, la bandera queda de canto en S y N. El low-poly la resolvió plegándola y abriéndola 24°; conviene hacerlo en el diseño final.
- **Texturas de pantalla:** los estilos que ponen textura en coordenadas de pantalla (lápiz, acuarela, semitono del cartoon) quedan quietos mientras el barco se mueve. Con el balanceo se nota.
- **Freestyle:** funciona con Eevee en Blender 5.2, según lo usaron el cel-shaded y el lápiz. Es la alternativa al contorno de casco invertido, y permite volver a encender las sombras del sol. En el lápiz, el modificador Backbone Stretcher da NaN y anula todas las líneas.
- **Coste de producir:** en los 8 estilos, una skin de color es cambiar un diccionario y re-renderizar en segundos. El coste real está en diseñar, no en producir.
- **Pixel-art reproducible:** el script del pixel-art dio PNG idénticos byte a byte en dos corridas, según su agente. Resuelve los objetos finos por índice de pieza y profundidad, sin cuantizar a ciegas.

## Queda abierto
- **Diseño y estilo:** el barco es una propuesta procedural de muestra. Colores, forma y pasajera los aprueba Álvaro.
- **Sombra sobre el agua:** los sprites no traen sombra propia. El visor dibuja una elipse bajo el casco a partir de `bow` y `wake_origin`; el motor tendrá que hacer lo mismo o pedir un pase de sombra.
- **Luz sin sombras proyectadas:** el sol no proyecta sombras, porque con el contorno de casco invertido todo quedaba en sombra. Si se quieren sombras de la vela sobre la cubierta, hay que probar `use_backface_culling_shadow` en el material del contorno.
- **Balanceo sin pasajera:** el loop sólo existe para base/S sin pasajera, porque los nombres de archivo del prompt no llevan `_p`. Con pasajera sería otro loop de 8 fotogramas.
- **Bandera por separado:** la bandera va dentro del sprite de cada skin. El slot BANDERA de §35.1, como sprite independiente anclado a `mast_top`, sería un render aparte de la bandera sola; no se hizo.
- **Visor sin probar en teléfono real:** el panel integrado no captura bien la emulación móvil y Chrome sin interfaz no baja de unos 500 px de ancho.

## Para que pruebe Hernán
```bash
python3 -m http.server 8080
```
Desde la raíz del repo; después abrí `http://localhost:8080/tools/viewer/`. Tu servidor ya escucha en todas las interfaces, así que en el teléfono basta con `http://<IP del Mac>:8080/tools/viewer/` en la misma red.

1. **Giro completo:** con → o arrastrando, recorré las 8 direcciones. La proa, con el farol en la punta, tiene que dar la vuelta en sentido horario sin invertirse ni saltar al pasar por N. La popa, con el timón, queda siempre del lado opuesto, y el mástil no cambia de lado de golpe. Con `r` gira solo.
2. **Pasajera:** con `p`, mirá que quede de pie sobre la cubierta en las 8 direcciones. En N se le ve la espalda, porque mira a proa.
3. **Skins:** con 1, 2 y 3, mirá que base (casco naranja, vela crema), noche (casco azul marino, vela índigo) y fiesta (casco turquesa, vela rosa y amarilla) se distingan a tamaño real.
4. **Ilustración:** mirá si el conjunto se lee como ilustración y no como render 3D. Con `a` se ven los anclajes.
5. **Estilos:** mirá `docs/informes/img/01-estilos-comparativa.png` y las hojas de 8 direcciones `docs/informes/img/01-estilo-*.png`, y elegí cuáles merecen seguir.

## Preguntas para el orquestador
1. **Contrato para el 03:** ¿el motor adopta el manifiesto tal como está documentado en «Hecho»? Lo más delicado es elegir la dirección con `bow_screen` y no con sectores de 45° en pantalla. Adoptarlo cuesta un encargo corto del lado del motor. No adoptarlo obliga a cambiar `render.py` y el esquema.
2. **Estilo para Álvaro:** ¿qué estilos pasan a Álvaro? Por lectura a 48 px en pantalla, la sesión propone cel-shaded, cartoon años 30 y pixel-art, junto al toon actual. El pixel-art compromete el arte de todo el juego, no sólo el del barco.
3. **Tipo de barco:** ¿velero o remolcador? La lámina de Hernán dibuja un remolcador con caseta y chimenea; el entregable del encargo es un velero. Pasar al remolcador cuesta rehacer `ship.py` sobre el script del estilo que se elija. `render.py`, el manifiesto, el check y el visor no cambian.
4. **Balanceo y bandera:** ¿se añade el loop de balanceo con pasajera y la bandera como sprite aparte (slot BANDERA de §35.1)? Cada uno es medio encargo sobre el pipeline actual.
