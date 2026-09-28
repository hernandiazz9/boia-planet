# Mundos

Exploración: un mismo mapa que se puede ver en varios mundos. El de **arcilla** es el principal; elegir otro redibuja todas las islas con el estilo de su barco. Estado: `muestra`, pendiente de Álvaro.

**El mundo de arcilla completo** (9 zonas, tres horas, visor interactivo) está en [`arcilla/`](arcilla/README.md). Lo que sigue describe el primer archipiélago de cuatro islas, que se conserva como referencia.

Vive en la rama `exploracion-mundos`, en el worktree `.claude/worktrees/mundos`, para no mezclarse con el trabajo de los agentes en `main`.

## Cómo funciona

- `escena.py` describe el archipiélago con cuatro islas: la Cala del Alfar, la isla del escenario del All Day, la isla tienda y la primera boia. Cada pieza se crea con un papel (arena, paja, madera, mar…), nunca con un color.
- `temas.py` define cada mundo. Traduce cada papel a un material de su estilo, pone la luz y el render, y aporta su barco. Reutiliza los scripts de `tools/blender/styles/` importándolos, sin modificarlos.
- `render.py` encuadra el archipiélago una vez y renderiza todos los mundos con la misma cámara. Los lugares caen en el mismo píxel en todos.
- `index.html` es el selector.

| Mundo | Barco | Estilo |
|---|---|---|
| Arcilla, el principal | B05 | Plastilina, luz de maqueta, de día y de noche |
| Papel | B01 | Tramado de lápiz y trazo de grafito |
| Cartoon | B06 | Tinta, semitono y paleta corta |

## Comandos

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -P mundos/render.py
```

Tarda unos 30 s con los tres mundos. Con `-- --tema papel` sólo renderiza uno. Para verlo, con el servidor estático de la raíz del repo principal en el 8080, abre `http://localhost:8080/.claude/worktrees/mundos/mundos/index.html`.

## Añadir un mundo

1. Una clase en `temas.py` con `make(role)`, que devuelve el material de cada papel, `setup(W, H)`, que prepara luz y render, y `build_ship()`.
2. Registrarla en `TEMAS`.
3. Añadir su ficha en `index.html`.
