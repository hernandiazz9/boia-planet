"""L'Albufereta (lugar `fiestera`): el encuentro de la Boia Fiestera en el mundo de acuarela. MUESTRA.

La Fiestera es la misma que en arcilla (mundos/arcilla/zonas/fiestera.py: el
personaje no cambia de un mundo a otro), pintada; en vez de globos sujeta una
ristra de farolillos de papel de la verbena de Sant Joan. Las rocas del remanso
son aquí tambores de columnas romanas caídas (Lucentum, junto a la Albufereta),
en los mismos puntos y con el mismo tamaño. Posidonia y ondas como en arcilla.
Los cocodrilos se construyen por fotograma en tools/blender/mundo_acuarela.py.
"""
import importlib.util
import math
import os

from mathutils import Vector

import piezas as P

ARC_FIESTERA = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                            "arcilla", "zonas", "fiestera.py")
_spec = importlib.util.spec_from_file_location("acuarela_arcilla_fiestera", ARC_FIESTERA)
F = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(F)

ROCAS = ((-2.7, -1.3, 0.38), (2.6, -1.9, 0.32), (2.2, 1.9, 0.28))     # como en arcilla: (dx, dy, tamaño)


def columna(B, x, y, s):
    """Tambor de columna romana de caliza, en pie, con estrías, y otro caído al lado."""
    base = B.at(x, y, -0.1)
    h = s * 1.5
    r = s * 0.62
    B.lathe("stone", [(0, 0), (r * 1.25, 0), (r * 1.25, 0.12), (r, 0.16), (r * 0.96, h), (r * 1.05, h + 0.04),
                      (r * 0.9, h + 0.08), (0, h + 0.08)], tuple(base), segs=24)
    for i in range(8):
        a = math.radians(i * 45)
        q = base + Vector((r * 0.99 * math.cos(a), r * 0.99 * math.sin(a), 0))
        B.tube("limestone_dark", [q + Vector((0, 0, 0.2)), q + Vector((0, 0, h - 0.04))], 0.012, segs=4)
    B.rng.seed(int(abs(x * 100 + y * 10)))
    g = B.rng.uniform(0, 180)
    lying = P.T(*B.at(x + 0.35 * s, y + 0.45 * s, 0.03)) @ B.rz(g) @ P.rot("Y", 90)
    B.lathe("limestone", [(0, -0.28 * s), (r * 0.8, -0.28 * s), (r * 0.8, 0.28 * s), (0, 0.28 * s)], (0, 0, 0),
            segs=20, extra=lying)
    P.ripple(B, x, y, s * 1.2, 1, t=0.018)
    return base + Vector((0, 0, h + 0.08))


def build(B, Z, M, AP):
    fx, fy = next(lg["pos"] for lg in Z["lugares"] if lg["id"] == "fiestera")
    with B.pieza("fiestera"):
        hands, tip = F.fiestera(B, fx, fy, k=1.5, g=90.0)
    with B.pieza("farolillos"):
        hr = hands[1]
        a = hr + Vector((0, 0, 0.06))
        pts = [a + P.mvec(0.25 * t, -0.35 * t) + Vector((0, 0, 1.1 * t + 0.15 * math.sin(math.pi * t))) for t in
               (0, 0.2, 0.4, 0.6, 0.8, 1.0)]
        B.tube("wire", pts, 0.007, segs=5)
        roles = ("lantern", "firework_a", "firework_c", "firework_b", "lantern")
        for i, q in enumerate(pts[1:]):
            c = q - Vector((0, 0, 0.09))
            B.blob(roles[i], (0.075, 0.075, 0.095), c, 2.0, 2.4, segs=12, rings=8)
            B.lathe("wood_dark", [(0, 0.085), (0.025, 0.085), (0.025, 0.1), (0, 0.1)], tuple(c), segs=8)
    with B.pieza("ondas"):
        P.ripple(B, fx, fy, 0.72, 2, t=0.024)
    with B.pieza("posidonia"):
        for ang, rad, s in ((200, 1.35, 1.0), (272, 1.25, 0.85), (340, 1.5, 1.0), (60, 1.55, 0.9), (120, 1.35, 0.95),
                            (145, 2.55, 1.1), (255, 2.6, 1.0)):
            F.posidonia_mat(B, fx + rad * math.cos(math.radians(ang)), fy + rad * math.sin(math.radians(ang)), s)
    with B.pieza("rocas"):
        for dx, dy, s in ROCAS:
            columna(B, fx + dx, fy + dy, s)
