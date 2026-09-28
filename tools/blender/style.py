"""Selección del estilo de render: un módulo `tools/blender/styles/<nombre>.py`.

Un estilo decide cómo se ve cualquier recurso (sombreado, contorno, paleta del
mundo); la geometría la deciden ship.py y world.py. Cambiar de estilo es volver
a renderizar con `--style <nombre>`.

API que tiene que exponer un módulo de estilo (versión STYLE_API = 1):
    NAME, VERSION                      identificador y versión del estilo
    OUTLINE_WIDTH                      grosor del contorno, en unidades del mundo
    PALETTE                            colores de los materiales del mundo (rol -> hex)
    toon_material(name)                material sombreado; el color se pone con set_material_color
    set_material_color(mat, spec)      spec: "#RRGGBB" o {"hex": ..., "flat": bool}
    flat_material(name, hex, alpha)    color sin sombrear, con alfa opcional
    masked_material(name, a, b, mask)  sombreado que mezcla dos colores por una máscara de nodos
    outline_material()                 material del contorno
    link_object(name, bm, mats, parent, outline_mat, outline=True, thickness=0.0, outline_scale=1.0)
    hex_srgb(hex), lin4(rgb)           utilidades de color

Los scripts NN_*.py de styles/ son exploraciones sueltas del encargo 01: no
declaran STYLE_API y no se pueden elegir aquí.
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
STYLES_DIR = os.path.join(HERE, "styles")
DEFAULT = "muestra"
_cache = {}


def path_of(name):
    return os.path.join(STYLES_DIR, name + ".py")


def available():
    out = []
    for fn in sorted(os.listdir(STYLES_DIR)):
        if not fn.endswith(".py") or fn[:1].isdigit():
            continue
        with open(os.path.join(STYLES_DIR, fn), encoding="utf-8") as f:
            if "STYLE_API = 1" in f.read():
                out.append(fn[:-3])
    return out


def load(name=DEFAULT):
    if name in _cache:
        return _cache[name]
    if name not in available():
        raise ValueError("estilo desconocido %r; hay: %s" % (name, ", ".join(available())))
    spec = importlib.util.spec_from_file_location("boia_style_" + name, path_of(name))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    _cache[name] = mod
    return mod
