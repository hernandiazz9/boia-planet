"""Catálogo de lugares del mapa compartido (lugares.json) y referencias a mapa.json. Python puro.

Lo usan render.py (vía mundos_arte.py) y check.py. Una referencia es una ruta
separada por «/» dentro de mapa.json: en una lista se elige el elemento cuyo
`id` es el tramo, o el índice si el tramo es un número. `point()` convierte lo
que se encuentra en un punto del mapa (x, y) en u_maq.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
CATALOG = os.path.join(HERE, "lugares.json")


def load_catalog(path=CATALOG):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_map(cat=None):
    cat = cat or load_catalog()
    with open(os.path.join(REPO, cat["mapa"]), encoding="utf-8") as f:
        return json.load(f)


def resolve(M, ref):
    """El valor de mapa.json al que apunta `ref`; KeyError si no existe."""
    cur = M
    for seg in ref.split("/"):
        if isinstance(cur, dict):
            if seg not in cur:
                raise KeyError("%s: falta %r" % (ref, seg))
            cur = cur[seg]
        elif isinstance(cur, list):
            if seg.isdigit():
                i = int(seg)
                if i >= len(cur):
                    raise KeyError("%s: índice %d fuera de la lista" % (ref, i))
                cur = cur[i]
            else:
                hit = [x for x in cur if isinstance(x, dict) and x.get("id") == seg]
                if not hit:
                    raise KeyError("%s: no hay id %r" % (ref, seg))
                cur = hit[0]
        else:
            raise KeyError("%s: %r no es contenedor" % (ref, seg))
    return cur


def point(value):
    """Punto (x, y) de un valor de mapa.json: un par, o un dict con `pos` o `centro`."""
    if isinstance(value, dict):
        value = value.get("pos", value.get("centro"))
    if (isinstance(value, list) and len(value) == 2 and all(isinstance(v, (int, float)) for v in value)):
        return [float(value[0]), float(value[1])]
    raise ValueError("no es un punto: %r" % (value,))


def instances(M, entry):
    """Puntos donde va el arte del lugar: `instancias` (ruta a una lista o lista de rutas) o sólo `pos`."""
    inst = entry.get("instancias")
    if inst is None:
        return [point(resolve(M, entry["pos"]))]
    if isinstance(inst, str):
        return [point(v) for v in resolve(M, inst)]
    return [point(resolve(M, r)) for r in inst]


def by_id(cat=None):
    """Lugares y extras (arte con formato de lugar que el motor aún no dibuja como lugar propio) por id."""
    cat = cat or load_catalog()
    return {e["id"]: e for e in cat["lugares"] + cat.get("extras", [])}
