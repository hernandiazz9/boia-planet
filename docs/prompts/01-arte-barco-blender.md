# 01 — Validar el pipeline de arte: el barco en 8 direcciones desde Blender sin interfaz

Para correr: `/encargo 01` en una sesión nueva. En paralelo con el 02.
Leé antes: nada (es el primero).

## Contexto
El riesgo número uno del proyecto es el arte: la v14 pide un barco con ocho
direcciones, tres skins, pasajera a bordo y estela coherente (§49.17, §35.1) y
marca todos los sprites como "IA/ilustrador" sin que exista ninguno. Antes de
escribir una línea del motor hay que saber si un pipeline reproducible puede
producir ese barco. Decisión del orquestador (D-05): modelo 3D estilizado en
Blender, sombreado toon con contorno, cámara ortográfica, render por script
`bpy` sin interfaz. No se usa Blender MCP (necesita la interfaz abierta) ni
ninguna API externa: este encargo tiene que cerrar sin tokens ni cuentas.
Ajustala sólo si Blender no se puede instalar o ejecutar en este Mac, y decilo.

Leer: `docs/DECISIONES.md` entero; de `docs/fuente/v14-maestro.md` sólo §6.2,
§8, §35 y §49.17.

## Qué existe ya
Nada de código. Blender **no** está instalado. Hay `python3` 3.9 del sistema,
`node` 24, `pnpm` 11, `ffmpeg` y `brew`. Chip Apple M3 Pro, 18 GB.

## Encargo
1. Instalar Blender con `brew install --cask blender`. El binario queda en
   `/Applications/Blender.app/Contents/MacOS/Blender`. Anotá la versión.
2. `tools/blender/ship.py`: script `bpy` que construye **de forma
   procedural** un barco de vela pequeño y simpático (casco, cubierta, mástil,
   vela, bandera, un detalle de proa), low-poly y con proporciones de
   ilustración, no de maqueta. Sombreado toon (Shader to RGB + rampa de tres
   tonos) y contorno oscuro (Freestyle o solidify invertido). Sin texturas de
   foto. Paleta base: naranja BOIA y azul marino (los valores exactos no
   existen aún: usá #F26A1B y #12233F como `muestra` y dejalos en una
   constante).
3. Tres **skins** en el mismo script, elegidas por argumento: `base`,
   `noche`, `fiesta`. Cambian sólo materiales y bandera; la geometría es una.
4. Un **slot de pasajera**: un cilindro con una cara sencilla ("Boia Fiestera"
   placeholder) que se coloca en un empty llamado `slot_passenger` sobre la
   cubierta. Se renderiza con y sin pasajera.
5. Cámara ortográfica **dimétrica 2:1** (elevación 26,57°, azimut 45°). Render
   de **8 direcciones** girando el barco en pasos de 45° con la cámara fija,
   nombradas `S, SW, W, NW, N, NE, E, SE` (S = proa hacia el espectador).
   Un fotograma estático por dirección más un loop de balanceo de 8
   fotogramas sólo para `base/S`. Salida PNG RGBA 256×256 con margen, fondo
   transparente, motor Eevee con muestras fijas.
6. `tools/blender/render.py`: orquesta todo desde la línea de comandos y
   escribe `art/barco/<skin>/<dir>[_p].png`, `art/barco/base/S_bob_<n>.png` y
   `art/barco/manifest.json` con: `id`, `version`, `generator` (script y
   versión de Blender), por cada imagen `file`, `skin`, `direction`,
   `frame`, `passenger`, y por cada dirección los **anclajes proyectados en
   píxeles**: `pivot` (punto de contacto con el agua bajo el centro del
   casco), `mast_top`, `slot_passenger`, `wake_origin` (popa). Sacalos de la
   proyección de los empties, no a ojo. Incluí `license: "muestra interna"`.
7. `tools/blender/manifest.schema.json` y `tools/blender/check.py` (Python
   del sistema, sin dependencias): valida el manifest contra el esquema,
   comprueba que existen las 8×3×2+8 = 56 imágenes, que tienen alfa y que el
   borde exterior de 4 px es transparente en todas.
8. **Prueba de proyección**: `tools/blender/calibrate.py` renderiza un cubo
   unidad con la misma cámara y mide en la imagen la proporción ancho/alto
   de la cara superior; tiene que dar 2,0 ± 0,04. Guardá el número en el
   informe y la imagen en `tools/blender/out/` (ignorado por git).
9. `tools/viewer/index.html`: página estática sin dependencias ni build. Fondo
   de agua animada sencilla (dos capas de ondas con canvas), el barco en el
   centro, flechas o arrastre para cambiar de dirección, teclas 1/2/3 para
   la skin, `p` para la pasajera, `a` para dibujar los anclajes como puntos.
   Lee `art/barco/manifest.json`. Se sirve con `python3 -m http.server 8080`
   desde la raíz del repo.
10. Medí y anotá: segundos por imagen, total del lote, tamaño medio de PNG.

NO: no toques `docs/spec/`, `docs/DECISIONES.md`, `docs/PLAN.md` ni nada
fuera de `tools/blender/`, `tools/viewer/`, `art/`, `.gitignore` (sólo si
hace falta añadir salidas) y `ESTADO.md`. No instales PixiJS ni empieces el
motor. No uses Tripo, Meshy, Seedance ni ninguna API: si el resultado
procedural no convence, decilo con capturas, que la decisión de pasar a
image-to-3D es del orquestador. No busques "el diseño definitivo" del barco:
esto valida el pipeline, y el diseño lo aprueba Álvaro después. No comitees
`tools/blender/out/`. Si `brew install --cask blender` pide contraseña o
falla, parale ahí, commiteá los scripts y decilo en el informe.

## Cómo se prueba
```
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/calibrate.py   # imprime ratio=2.0xx
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/render.py -- --all
python3 tools/blender/check.py            # exit 0 e imprime "56 imágenes, manifest válido"
python3 -m http.server 8080               # abrir http://localhost:8080/tools/viewer/
```
Corré `render.py -- --all` dos veces y comprobá con `check.py --diff` que
ninguna imagen difiere en más del 0,5 % de píxeles: el pipeline tiene que ser
reproducible. En el informe: ratio del cubo, tiempos, tamaños y tres capturas
del visor (S, W, N con pasajera) en `docs/informes/img/01-*.png`.

## Front
Lo prueba Hernán: dejá el visor listo con el comando y esta lista: (1) que
al girar por las ocho direcciones la proa, la popa y el mástil no se
invierten ni "saltan" al pasar por N (el error de §49.17); (2) que la pasajera
queda sobre la cubierta en todas las direcciones; (3) que las tres skins se
distinguen a 256 px; (4) que el conjunto se lee como ilustración y no como
render 3D.

## En paralelo
El 02 corre a la vez y toca `docs/spec/**` y `tools/spec/**`. Este encargo
sólo toca `tools/blender/**`, `tools/viewer/**`, `art/**`, `.gitignore`,
`docs/informes/img/01-*` y su sección de `ESTADO.md`.
