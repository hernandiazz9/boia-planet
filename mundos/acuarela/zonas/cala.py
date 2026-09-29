"""Cala Cantalar (lugar `cala`): el taller de la pintora, la casa del barco B02. MUESTRA.

Una isla de caliza con cala de arena hacia cámara. Donde en arcilla está el horno
(zonas/cala/lugares/horno) está la casa encalada de la pintora, con azotea,
buganvilla y persianas azules; en el «torno», su caballete con el cuadro a medio
pintar; en la «pista», las hojas del cuaderno secándose en un tendedero; en la
«paella», una mesa con botes de pintura; embarcadero de tablas en el mismo punto
que en arcilla. Pino carrasco, pitas y datileras.
"""
import math

from mathutils import Vector

import piezas as P


def build(B, Z, M, AP):
    s = Z["islas"][0]
    L = {lg["id"]: lg["pos"] for lg in Z["lugares"]}
    with B.pieza("isla"):
        AP.isla(B, s, beach=(0.15, 1.0))
    with B.pieza("rocas"):
        for u, v, r in ((-1.0, 0.1, 0.3), (-0.8, 0.55, 0.22), (0.95, -0.35, 0.26), (0.4, -0.95, 0.24)):
            x, y = AP.local(s, u, v)
            P.rock(B, x, y, r, z=0.0, role="limestone")
    with B.pieza("casa"):
        hx, hy = L["horno"]
        top = AP.casa(B, hx, hy, w=0.52, d=0.42, h=0.62, g=100.0)
        AP.casa(B, hx + 0.55, hy - 0.45, w=0.3, d=0.3, h=0.42, g=100.0, windows=1)
        AP.buganvilla(B, hx - 0.55, hy + 0.35, 0.28)
        B.tube("wood", [top + Vector((0.1, -0.1, 0.02)), top + Vector((0.1, -0.1, 0.45))], 0.012, segs=5)
        B.blob("flag", (0.02, 0.16, 0.08), top + Vector((0.1, 0.02, 0.4)), 4.0, 3.0, segs=10, rings=4)
    with B.pieza("caballete"):
        tx, ty = L["torno"]
        AP.caballete(B, tx, ty, g=70.0, k=1.1)
        AP.paleta_pintor(B, tx + 0.35, ty + 0.2, g=20.0)
    with B.pieza("pintora"):
        tx, ty = L["torno"]
        P.person(B, tx + 0.28, ty - 0.1, role="person_c", h=1.0, g=160.0, hat="hat", arms="wave")
    with B.pieza("tendedero"):
        px, py = L["pista"]
        a = B.on(px - 0.7, py - 0.2, 0.0)
        b = B.on(px + 0.6, py + 0.25, 0.0)
        for q in (a, b):
            B.tube("wood_dark", [q, q + Vector((0, 0, 0.6))], 0.018, segs=6)
        a2, b2 = a + Vector((0, 0, 0.58)), b + Vector((0, 0, 0.58))
        pts = [a2.lerp(b2, i / 10) - Vector((0, 0, 0.08 * math.sin(math.pi * i / 10))) for i in range(11)]
        B.tube("rope", pts, 0.006, segs=5)
        d = (b2 - a2).normalized()
        n = d.cross(Vector((0, 0, 1))).normalized()
        from mathutils import Matrix
        fr = Matrix(((d.x, n.x, 0, 0), (d.y, n.y, 0, 0), (d.z, n.z, 1, 0), (0, 0, 0, 1)))
        for i, role in enumerate(("paper", "house_c", "paper", "bougainvillea", "paper", "gold")):
            t = (i + 0.7) / 7
            q = a2.lerp(b2, t) - Vector((0, 0, 0.08 * math.sin(math.pi * t) + 0.11))
            B.blob(role, (0.09, 0.008, 0.1), (0, 0, 0), 8.0, 8.0, extra=P.T(*q) @ fr, segs=10, rings=4)
    with B.pieza("mesa"):
        mx, my = L["paella"]
        c = B.on(mx, my, 0.0)
        B.blob("wood", (0.28, 0.2, 0.025), c + Vector((0, 0, 0.3)), 6.0, 2.0, extra=B.rz(30), segs=16, rings=4)
        for dx, dy in ((-0.2, -0.12), (0.2, -0.12), (-0.2, 0.12), (0.2, 0.12)):
            q = c + P.mvec(dx, dy)
            B.tube("wood_dark", [q, q + Vector((0, 0, 0.3))], 0.014, segs=5)
        for i, role in enumerate(("red", "dome_a", "gold", "leaf2")):
            q = c + P.mvec(-0.15 + 0.1 * i, 0.02 * (i % 2)) + Vector((0, 0, 0.33))
            B.lathe(role, [(0, 0), (0.035, 0), (0.035, 0.07), (0, 0.07)], tuple(q), segs=12)
    with B.pieza("vegetacion"):
        AP.pino(B, *AP.local(s, -0.55, -0.55), height=1.3, k=0.95)
        AP.datilera(B, *AP.local(s, 0.7, 0.2), height=1.75)
        AP.datilera(B, *AP.local(s, 0.45, 0.5), height=1.45, lean=(0.12, 0.05))
        AP.pita(B, *AP.local(s, -0.3, 0.35), s=0.32)
        AP.pita(B, *AP.local(s, 0.2, -0.6), s=0.26)
        AP.chumbera(B, *AP.local(s, -0.75, -0.1), s=0.32)
        AP.matorral(B, s, n=16, seed=11, avoid=[tuple(v) for v in L.values()])
    with B.pieza("embarcadero"):
        ex, ey = L["embarcadero"]
        ax, ay = L["amarre"]
        g = math.degrees(math.atan2(ay - ey, ax - ex))
        d = P.mdir(g)
        side = P.mdir(g + 90)
        c0 = B.at(ex, ey, 0.16)
        for i in range(9):
            q = c0 - d * 0.55 + d * 0.16 * i
            B.blob("deck", (0.07, 0.22, 0.02), q, 6.0, 2.0, extra=P.basis(d, side, Vector((0, 0, 1))), segs=10, rings=4)
        for t in (-0.55, 0.0, 0.7):
            for sd in (-1, 1):
                q = c0 + d * t + side * sd * 0.2
                B.tube("wood_dark", [q - Vector((0, 0, 0.3)), q + Vector((0, 0, 0.06))], 0.025, segs=6)
        AP.barca(B, ex - 0.1, ey + 0.55, g=g + 10, k=0.9, role="house_c")
