"""Isla del escenario · All Day BOIA (lugar `allday`, isla de evento: nombre compartido). MUESTRA.

La barraca del All Day como las de Hogueras: escenario de madera bajo un toldo
a rayas rojas y crema, altavoces, torres de luces y el rótulo BOIA; delante,
el público en la arena. En los puntos de mapa.json: la taquilla (abierta en
«venta», con la persiana bajada en «recuerdo», REQ-COM-005), la barra con su
toldo, la cabina, el arco de entrada de farolillos y el muelle. Palmeras
datileras, farolillos entre ellas y banderolas.
"""
import math

from mathutils import Vector

import piezas as P


def build(B, Z, M, AP):
    s = Z["islas"][0]
    L = {lg["id"]: lg["pos"] for lg in Z["lugares"]}
    venta = B.variante != "recuerdo"
    with B.pieza("isla"):
        AP.isla(B, s, beach=(0.0, 1.0), back=0.24, k_cliff=(0.86, 0.7))
    with B.pieza("escenario"):
        ex, ey = L["escenario"]
        c = B.on(ex, ey, -0.02)
        B.blob("stage_wood", (1.25, 0.7, 0.14), c + Vector((0, 0, 0.14)), 8.0, 6.0, extra=B.rz(0), segs=32, rings=8)
        B.blob("awning_b", (1.2, 0.06, 0.55), c + P.mvec(0, -0.62) + Vector((0, 0, 0.8)), 8.0, 8.0, extra=B.rz(0),
               segs=24, rings=8)
        AP.toldo_rayado(B, c, 1.35, 0.8, 1.45, g=90.0, stripes=9)
        board = c + P.mvec(0, -0.66) + Vector((0, 0, 1.2))
        B.blob("paper", (0.62, 0.04, 0.2), board, 8.0, 8.0, extra=B.rz(0), segs=20, rings=6)
        B.text("mosaic_a", "BOIA", board + P.mvec(0, 0.05), g=90.0, size=0.3, depth=0.02, bevel=0.008)
        for sx in (-1, 1):
            q = c + P.mvec(sx * 1.05, 0.15) + Vector((0, 0, 0.28))
            for k in range(2):
                B.blob("speaker", (0.16, 0.14, 0.17), q + Vector((0, 0, 0.17 + 0.34 * k)), 6.0, 6.0, extra=B.rz(0),
                       segs=16, rings=6)
                B.blob("metal", (0.08, 0.02, 0.08), q + P.mvec(0, 0.14) + Vector((0, 0, 0.17 + 0.34 * k)), segs=12, rings=6)
        for sx in (-1, 1):
            q = B.on(ex + sx * 1.75, ey + 0.55, -0.02)
            B.tube("iron", [q, q + Vector((0, 0, 1.6))], 0.03, segs=6)
            for k in range(3):
                B.blob(("stage_light", "stage_magenta", "stage_light")[k], (0.07, 0.07, 0.06),
                       q + Vector((0, 0, 1.25 + 0.14 * k)) + P.mvec(0, 0.06), segs=10, rings=6)
        P.person(B, ex + 0.2, ey + 0.1, role="person_e", h=1.0, g=90.0, arms="up", z=c.z + 0.26)
    with B.pieza("publico"):
        roles = ("person_a", "person_b", "person_c", "person_d", "person_f", "shirt_b")
        k = 0
        for row, dy in enumerate((1.35, 1.85, 2.3)):
            for i in range(5 - row):
                px_ = ex - 1.1 + i * 0.55 + 0.25 * row
                B.rng.seed(40 + k)
                P.person(B, px_, ey + dy, role=roles[k % 6], h=0.95, g=270.0 - 10 * (i - 2),
                         arms="up" if (k % 3 == 0) else "down")
                k += 1
    with B.pieza("taquilla"):
        tx, ty = L["taquilla"]
        c = B.on(tx, ty, -0.02)
        B.blob("house_c", (0.28, 0.3, 0.3), c + Vector((0, 0, 0.3)), 8.0, 8.0, extra=B.rz(0), segs=20, rings=8)
        B.blob("awning_a", (0.36, 0.38, 0.05), c + Vector((0, 0, 0.66)), 5.0, 2.0, extra=B.rz(0), segs=20, rings=6)
        front = c + P.mvec(0, 0.3) + Vector((0, 0, 0.36))
        if venta:
            B.blob("kiln_mouth", (0.18, 0.02, 0.12), front, 6.0, 6.0, extra=B.rz(0), segs=12, rings=6)
            P.person(B, tx, ty + 0.12, role="person_f", h=0.8, g=90.0, arms="wave", z=c.z + 0.08)
            AP.cartel(B, tx + 0.8, ty + 0.35, "ENTRADAS", w=0.62)
        else:
            B.blob("metal", (0.2, 0.02, 0.14), front, 6.0, 6.0, extra=B.rz(0), segs=12, rings=6)
            AP.cartel(B, tx + 0.8, ty + 0.35, "GRACIAS", w=0.62, board="awning_b")
    with B.pieza("barra"):
        bx, by = L["barra"]
        c = B.on(bx, by, -0.02)
        B.blob("stage_wood", (0.22, 0.6, 0.22), c + Vector((0, 0, 0.22)), 8.0, 6.0, extra=B.rz(0), segs=20, rings=6)
        AP.toldo_rayado(B, c, 0.45, 0.72, 0.85, g=180.0, a="house_a", b="awning_b", stripes=5)
        for i in range(3):
            B.lathe("bottle", [(0, 0), (0.03, 0), (0.03, 0.1), (0.012, 0.14), (0, 0.14)],
                    tuple(c + P.mvec(0, -0.3 + 0.3 * i) + Vector((0, 0, 0.44))), segs=10)
    with B.pieza("cabina"):
        dx, dy = L["dj"]
        c = B.on(dx, dy, -0.02)
        B.blob("speaker", (0.3, 0.22, 0.24), c + Vector((0, 0, 0.24)), 6.0, 6.0, extra=B.rz(0), segs=16, rings=6)
        B.lathe("checker_a", [(0, 0), (0.1, 0), (0.1, 0.02), (0, 0.02)], tuple(c + Vector((0, 0, 0.49))), segs=16)
        P.person(B, dx, dy - 0.3, role="person_b", h=0.9, g=90.0, arms="up")
    with B.pieza("arco"):
        ax, ay = L["arco"]
        a = B.on(ax - 0.7, ay, -0.02)
        b = B.on(ax + 0.7, ay, -0.02)
        for q in (a, b):
            B.tube("wood_dark", [q, q + Vector((0, 0, 1.2))], 0.035, segs=6)
            B.blob("flag", (0.05, 0.05, 0.05), q + Vector((0, 0, 1.24)), segs=8, rings=6)
        AP.farolillos(B, a + Vector((0, 0, 1.15)), b + Vector((0, 0, 1.15)), n=6, sag=0.22)
    with B.pieza("muelle"):
        mx, my = L["muelle"]
        c0 = B.at(mx, my - 0.1, 0.16)
        for i in range(8):
            q = c0 + P.mvec(0, -0.5 + 0.16 * i)
            B.blob("deck", (0.3, 0.07, 0.02), q, 6.0, 2.0, extra=B.rz(0), segs=10, rings=4)
        for t in (-0.5, 0.2, 0.7):
            for sd in (-1, 1):
                q = B.at(mx + sd * 0.27, my - 0.1 + t, 0.0)
                B.tube("wood_dark", [q - Vector((0, 0, 0.2)), q + Vector((0, 0, 0.24))], 0.022, segs=6)
    with B.pieza("palmeras"):
        tops = []
        for i, (u, v, h) in enumerate(((-0.75, 0.2, 1.9), (0.8, 0.1, 1.8), (-0.45, 0.72, 1.6), (0.55, 0.7, 1.7),
                                       (0.05, -0.8, 2.0))):
            B.rng.seed(90 + i)
            tops.append(AP.datilera(B, *AP.local(s, u, v), height=h))
    with B.pieza("farolillos"):
        AP.farolillos(B, tops[2] - Vector((0, 0, 0.25)), tops[3] - Vector((0, 0, 0.25)), n=9, sag=0.4)
        AP.farolillos(B, tops[0] - Vector((0, 0, 0.25)), tops[2] - Vector((0, 0, 0.25)), n=5, sag=0.3)
    with B.pieza("banderolas"):
        for i, (u, v) in enumerate(((-0.95, -0.2), (0.95, -0.35), (0.35, -0.75))):
            P.flag(B, B.on(*AP.local(s, u, v), -0.02), 1.0, 0.8, role=("flag", "flag_b", "house_d")[i], g=0)
    with B.pieza("vegetacion"):
        AP.pita(B, *AP.local(s, -0.9, 0.45), s=0.3)
        AP.chumbera(B, *AP.local(s, 0.85, -0.55), s=0.3)
        AP.matorral(B, s, n=14, seed=5, avoid=[tuple(v) for v in L.values()], r_avoid=1.1)
