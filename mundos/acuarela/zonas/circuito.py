"""El Penyal (lugar `circuito`): el circuito de velocidad del mundo de acuarela. MUESTRA.

El trazado, los arcos, las boies de carril, el semáforo, el cartel ATAJO →, la
roca, la medusa y el cocodrilo son los de mundos/arcilla/zonas/circuito.py (el
circuito es el mismo en los dos mundos: sale de mapa.json), pintados con el
tema de acuarela. Cambian los dos islotes: Els Dents es aquí un Penyal d'Ifac en
miniatura, un peñón de caliza de paredes verticales con estratos y pinos en el
collado, y las rocas del Freu son escollos de caliza con posidonia.
"""
import importlib.util
import math
import os

import bpy
from mathutils import Vector

import piezas as P

ARC_CIRCUITO = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                            "arcilla", "zonas", "circuito.py")
_spec = importlib.util.spec_from_file_location("acuarela_arcilla_circuito", ARC_CIRCUITO)
CI = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(CI)


def penyal(B, AP, spec):
    cx, cy = spec["centro"]
    z0 = AP.islote(B, spec)
    g = spec.get("giro", 0.0)
    # el peñón: pared casi vertical, cima inclinada hacia el mar
    c = B.at(cx - 0.15, cy - 0.1, 0.0)
    B.blob("limestone", (0.72, 0.6, 1.9), c + Vector((0, 0, 0.1)), 2.4, 1.4, extra=B.rz(g + 20), segs=40, rings=24)
    B.blob("limestone", (0.55, 0.5, 1.2), c + P.mvec(0.55, 0.3) + Vector((0, 0, 0.0)), 2.2, 1.6, extra=B.rz(g),
           segs=32, rings=16)
    B.blob("limestone_dark", (0.5, 0.42, 0.9), c + P.mvec(-0.12, -0.1) + Vector((0, 0, 0.05)), 2.4, 1.3,
           extra=B.rz(g + 20), segs=32, rings=16)
    # collado con pinos y matas
    for dx, dy, h in ((0.75, 0.45, 0.7), (0.5, 0.7, 0.55)):
        B.rng.seed(int(dx * 100))
        top = B.at(cx - 0.15 + dx, cy - 0.1 + dy, 0.0)
        top.z = B.ground_b(top.x, top.y)
        P.pine(B, cx - 0.15 + dx, cy - 0.1 + dy, height=h, k=0.55)
    for i in range(5):
        a = math.radians(i * 72 + 10)
        q = c + Vector((0.62 * math.cos(a), 0.52 * math.sin(a), 0.25 + 0.1 * (i % 2)))
        B.blob("scrub_dark", (0.09, 0.08, 0.06), q, segs=10, rings=6)


def build(B, Z, M, AP):
    CI.build(B, Z, M)
    for o in [o for o in B.root.children if o.name.startswith(("circuito__dents__", "circuito__freu__"))]:
        bpy.data.objects.remove(o, do_unlink=True)
    islas = {i["id"]: i for i in Z["islas"]}
    with B.pieza("dents"):
        penyal(B, AP, islas["dents"])
    with B.pieza("freu"):
        s = islas["freu"]
        AP.islote(B, s, top="scrub")
        for x, y, r in ((15.1, -13.4, 0.26), (15.3, -10.6, 0.22), (14.3, -13.35, 0.16)):
            P.rock(B, x, y, r, role="limestone")
            P.ripple(B, x, y, r + 0.12, 1, t=0.016)
