"""Tabarca (lugar `ultima`): el destino de la Boia Fiestera en el mundo de acuarela. MUESTRA.

La isla amurallada: un lienzo de muralla de piedra con almenas y, en el «nicho»
de mapa.json, su puerta en arco con el pedestal donde sube la Fiestera; detrás,
la fachada de la iglesia con su espadaña. En la cala, la hoguera de Sant Joan
con su ninot (se quema a medianoche), las boies amigas en la orilla, el muelle y
farolillos entre datileras.
"""
import math

from mathutils import Vector

import piezas as P


def build(B, Z, M, AP):
    s = Z["islas"][0]
    L = {lg["id"]: lg["pos"] for lg in Z["lugares"]}
    with B.pieza("isla"):
        z0 = AP.isla(B, s, beach=(0.15, 1.0), back=0.22, k_cliff=(0.88, 0.66))
    nx, ny = L["nicho"]
    with B.pieza("muralla"):
        g = s.get("giro", 0.0)
        d = P.mdir(g)
        for i in range(-5, 6):
            if i in (0,):
                continue
            x, y = nx + d.x * 0 + math.cos(math.radians(g)) * 0.3 * i, ny + math.sin(math.radians(g)) * 0.3 * i
            base = B.on(x, y, -0.05)
            B.blob("stone", (0.16, 0.12, 0.3), base + Vector((0, 0, 0.3)), 8.0, 8.0, extra=B.rz(g), segs=12, rings=6)
            if i % 2:
                B.blob("stone", (0.07, 0.1, 0.06), base + Vector((0, 0, 0.65)), 6.0, 6.0, extra=B.rz(g), segs=10, rings=4)
    with B.pieza("nicho"):
        base = B.on(nx, ny, -0.05)
        Rt = P.mdir(g)
        for sx in (-1, 1):
            B.blob("limestone", (0.1, 0.14, 0.4), base + Rt * sx * 0.28 + Vector((0, 0, 0.4)), 8.0, 8.0, extra=B.rz(g),
                   segs=12, rings=6)
        pts = [base + Rt * 0.28 * math.cos(math.pi * t) + Vector((0, 0, 0.8 + 0.25 * math.sin(math.pi * t)))
               for t in [i / 8 for i in range(9)]]
        B.tube("limestone", pts, 0.09, segs=8)
        B.blob("limestone_dark", (0.28, 0.1, 0.05), base + Vector((0, 0, 1.12)), 6.0, 4.0, extra=B.rz(g), segs=12,
               rings=4)
        B.lathe("stone", [(0, 0), (0.16, 0), (0.14, 0.12), (0, 0.12)], tuple(base + Vector((0, 0, 0.04))), segs=16)
    with B.pieza("iglesia"):
        x, y = AP.local(s, -0.45, -0.55)
        top = AP.casa(B, x, y, w=0.4, d=0.35, h=0.85, g=90.0, color="limestone", shutter="wood", windows=0)
        B.blob("limestone", (0.1, 0.22, 0.18), top + Vector((0, 0, 0.18)), 6.0, 3.0, extra=B.rz(90.0), segs=12, rings=6)
        B.blob("gold", (0.05, 0.05, 0.06), top + Vector((0, 0, 0.2)) + P.mdir(90) * 0.08, segs=10, rings=6)
    with B.pieza("hoguera"):
        hx, hy = L["hoguera"]
        c = B.on(hx, hy, -0.02)
        for i in range(9):
            a = math.radians(i * 40)
            q = c + Vector((0.28 * math.cos(a), 0.28 * math.sin(a), 0.0))
            B.tube("wood" if i % 2 else "wood_dark", [q, c + Vector((0, 0, 0.62))], 0.03, segs=6)
        P.person(B, hx, hy, role="house_d", h=1.5, g=90.0, hat="awning_a", arms="up", z=c.z + 0.45)
    with B.pieza("amigas"):
        ax, ay = L["amigas"]
        for i, (dx, dy, body, band) in enumerate(((0.0, 0.0, "house_c", "white"), (0.5, 0.2, "house_d", "white"),
                                                  (-0.45, 0.3, "house_e", "white"))):
            P.boia(B, ax + dx, ay + dy, k=0.9, body=body, band=band, g=90.0, light=False,
                   z=max(0.0, B.gz(ax + dx, ay + dy)) - 0.02)
    with B.pieza("muelle"):
        mx, my = L["muelle"]
        c0 = B.at(mx, my, 0.16)
        d = P.mdir(40.0)
        side = P.mdir(130.0)
        for i in range(8):
            q = c0 - d * 0.6 + d * 0.16 * i
            B.blob("deck", (0.07, 0.22, 0.02), q, 6.0, 2.0, extra=P.basis(d, side, Vector((0, 0, 1))), segs=10, rings=4)
        for t in (-0.6, 0.0, 0.5):
            for sd in (-1, 1):
                q = c0 + d * t + side * sd * 0.2
                B.tube("wood_dark", [q - Vector((0, 0, 0.3)), q + Vector((0, 0, 0.06))], 0.022, segs=6)
    with B.pieza("palmeras"):
        tops = []
        for i, (u, v, h) in enumerate(((-0.8, 0.25, 1.7), (0.75, 0.15, 1.8), (0.55, -0.55, 1.5))):
            B.rng.seed(150 + i)
            tops.append(AP.datilera(B, *AP.local(s, u, v), height=h))
    with B.pieza("farolillos"):
        AP.farolillos(B, tops[0] - Vector((0, 0, 0.3)), tops[1] - Vector((0, 0, 0.3)), n=11, sag=0.45)
    with B.pieza("vegetacion"):
        AP.pita(B, *AP.local(s, 0.2, -0.75), s=0.26)
        AP.matorral(B, s, n=8, seed=23, avoid=[tuple(v) for v in L.values()], r_avoid=0.8)
