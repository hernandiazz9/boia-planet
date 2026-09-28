# Mundo de arcilla

El mapa de lanzamiento completo del mundo de arcilla: 9 zonas, rutas, circuito, costas y secretos,
renderizado en Blender de día, al atardecer y de noche, con un visor interactivo. Estado: `muestra`,
pendiente de Álvaro. El diseño y sus razones están en [diseno.md](diseno.md).

## Una sola fuente

[`mapa.json`](mapa.json) describe el mundo: zonas (centro, contorno, islas, lugares, piezas,
encuentro, comportamientos, REQ, textos, paleta), rutas, circuito, costas, secretos y ritmo. Lo leen:

| Quién | Qué hace con él |
|---|---|
| `escena.py` + `zonas/<id>.py` | Construyen la escena de Blender. Cada pieza se crea con un papel (arena, paja, cocodrilo…), nunca con un color; el tema (`../temas.py`) pone material, luz y hora. |
| `render.py` | Renderiza y exporta, por vista, un JSON con la proyección en píxeles (`rig.project_px`) de zonas, lugares, rutas, circuito, costas, colisión, proximidad y secretos. |
| `herramientas/plano.py` | Genera `plano.svg`, el plano cenital. |
| `herramientas/ritmo.py` | Calcula longitudes y tiempos de las rutas. |
| `herramientas/diseno.py` | Rellena las secciones generadas de `diseno.md` y escribe `paleta.json`. |
| `index.html` | El visor: lee `mapa.json`, `paleta.json` y los JSON de `render/`. |

## Comandos

Desde la raíz del repo:

```bash
python3 mundos/arcilla/herramientas/validar.py      # rutas por agua, zonas sin solaparse
python3 mundos/arcilla/herramientas/plano.py        # plano.svg
python3 mundos/arcilla/herramientas/diseno.py       # diseno.md y paleta.json
/Applications/Blender.app/Contents/MacOS/Blender -b -P mundos/arcilla/render.py
python3 mundos/arcilla/herramientas/webp.py         # WebP con tope de peso para el visor
```

`render.py` hace la vista general (día, atardecer y noche) y un primer plano por zona (día y noche).
Opciones útiles: `-- --vistas general cala --horas dia --escala 0.5` para iterar rápido, `--solo cala`
para construir sólo una zona y `--tema papel` o `--tema cartoon` para la vista general de los otros
mundos (salen como `papel-general-dia.png` y `cartoon-general-dia.png`).

QA:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -P mundos/arcilla/qa/piezas.py   # piezas por zona
python3 mundos/arcilla/qa/legibilidad.py                                          # rótulos, ΔE, boia en móvil
python3 mundos/arcilla/qa/repro.py DIR_A DIR_B                                     # dos corridas del render
```

## Visor

Con el servidor estático de la raíz del repo principal en el 8080:
`http://localhost:8080/.claude/worktrees/mundos/mundos/arcilla/index.html`. Enlace profundo a una zona:
`…/index.html#cala`. Sin dependencias: HTML, CSS y JS propios. El barco del modo recorrido son los
sprites de `art/barco/estilos/arcilla/`, con la dirección elegida por `bow_screen` del manifiesto.

## Añadir una zona

1. Una entrada en `zonas` de `mapa.json` (con `primer_plano` para su cámara) y, si hace falta, un tramo
   en `rutas`.
2. `zonas/<id>.py` con `build(B, Z, M)`: piezas dentro de `with B.pieza("<id>")`, papeles del tema.
3. `herramientas/validar.py`, `plano.py`, `diseno.py` y el render.
