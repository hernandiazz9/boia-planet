"""La Explanada (lugar `puerto`): el puerto de salida del mundo de acuarela. MUESTRA.

El tramo central del paseo (x = ±6,4, como en arcilla; el resto lo ponen las
losas de costa_sur): muro de caliza, el mosaico de olas rojas, crema y negras
de la Explanada de Alicante, palmeras datileras en fila, farolas, bancos, casas
de azotea y, en la caseta de mapa.json, el quiosco de la música. Delante, el
muelle de tablas con su dedo hacia la dársena, escolleras de bloques de
hormigón, las balizas, el anillo de salida con farolillos flotantes, la boia de
la entrada con su bocadillo y la de WhatsApp.
"""
import math

from mathutils import Vector

import piezas as P

PASEO_A = 6.4


def lugar(Z, lid):
    return next(lg["pos"] for lg in Z["lugares"] if lg["id"] == lid)


def paseo(B, AP, x0, x1, yc, b, alto, items=True, lo=None, hi=None):
    """Muro del paseo, mosaico, palmeras, farolas y bancos entre x0 y x1 (también lo usan las losas)."""
    lo = x0 if lo is None else lo
    hi = x1 if hi is None else hi
    with B.pieza("paseo"):
        B.land((lo + hi) / 2, yc, (hi - lo) / 2, b, alto, -0.2, g=0, p=8.0, q=6.0, role="limestone", segs=96, rings=24)
        B.land((lo + hi) / 2, yc - b + 0.05, (hi - lo) / 2, 0.14, alto * 0.55, -0.2, g=0, p=8.0, q=2.0,
               role="limestone_dark", segs=96, rings=8)
    with B.pieza("mosaico"):
        z = B.gz((lo + hi) / 2, 28.9)
        B.blob("mosaic", ((hi - lo) / 2, 0.62, 0.035), B.at((lo + hi) / 2, 28.85, z + 0.005), 10.0, 4.0,
               extra=B.rz(0), segs=128, rings=8)


def build(B, Z, M, AP):
    islas = {i["id"]: i for i in Z["islas"]}
    s = islas["paseo"]
    paseo(B, AP, -PASEO_A, PASEO_A, s["centro"][1], s["b"], s["alto"])
    with B.pieza("palmeras"):
        for i, x in enumerate((-5.4, -2.9, 2.9, 5.4)):
            B.rng.seed(700 + i)
            AP.datilera(B, x, 29.75, height=1.85 + 0.12 * (i % 2))
    with B.pieza("farolas"):
        for x in (-4.15, 4.15):
            P.lamp(B, x, 28.35, 0.95)
    with B.pieza("bancos"):
        for x in (-4.9, -3.4, 3.4, 4.9):
            AP.banco(B, x, 29.3, g=90.0)
    with B.pieza("casas"):
        for x, y, w, h, col in ((-5.5, 30.5, 0.5, 0.75, "whitewash"), (-4.3, 30.6, 0.45, 0.95, "house_d"),
                                (-1.5, 30.8, 0.5, 0.8, "whitewash"), (-0.4, 30.7, 0.42, 1.05, "house_c"),
                                (0.7, 30.8, 0.5, 0.85, "whitewash"), (4.2, 30.6, 0.45, 0.9, "house_a"),
                                (5.5, 30.5, 0.5, 0.75, "whitewash"), (-3.0, 32.0, 0.55, 1.2, "limestone"),
                                (2.6, 32.0, 0.55, 1.25, "house_b"), (-0.2, 32.3, 0.6, 1.0, "whitewash")):
            AP.casa(B, x, y, w=w, d=0.4, h=h, g=90.0, color=col)
        for x in (-2.9, 2.6):
            AP.buganvilla(B, x, 30.35, 0.22)
    with B.pieza("quiosco"):
        cx, cy = lugar(Z, "caseta")
        base = B.on(cx, cy, -0.02)
        B.lathe("stone", [(0, 0), (0.62, 0), (0.62, 0.14), (0, 0.14)], tuple(base), segs=8)
        top = base + Vector((0, 0, 0.14))
        for i in range(8):
            a = math.radians(i * 45 + 22.5)
            q = top + Vector((0.55 * math.cos(a), 0.55 * math.sin(a), 0))
            B.tube("white", [q, q + Vector((0, 0, 0.6))], 0.022, segs=6)
        roof = top + Vector((0, 0, 0.6))
        prof = [(0.7, -0.04), (0.62, 0.04), (0.5, 0.1), (0.36, 0.17), (0.22, 0.23), (0.08, 0.28), (0.0, 0.3)]
        for i in range(len(prof) - 1):
            (r0, z0), (r1, z1) = prof[i], prof[i + 1]
            B.lathe("awning_a" if i % 2 == 0 else "awning_b", [(0, z0), (r0, z0), (r1, z1), (0, z1)], tuple(roof), segs=16)
        AP.farolillos(B, roof + Vector((-0.6, 0.25, -0.02)), roof + Vector((0.25, -0.6, -0.02)), n=5, sag=0.12)
        P.flag(B, roof + Vector((0, 0, 0.26)), 0.5, 0.7, role="flag", g=0)
    with B.pieza("muelle"):
        z = 0.2
        for x0, x1, y0, y1 in ((-4.6, 4.6, 27.05, 27.85), (-2.25, -1.45, 25.4, 27.2)):
            c = B.at((x0 + x1) / 2, (y0 + y1) / 2, z)
            B.blob("deck", ((x1 - x0) / 2, (y1 - y0) / 2, 0.04), c, 10.0, 6.0, extra=B.rz(0), segs=40, rings=8)
            posts = [(x0 + 0.12, y0 + 0.08), (x1 - 0.12, y0 + 0.08)]
            if (x1 - x0) > 2:
                posts += [(x0 + (x1 - x0) * t, y0 + 0.08) for t in (0.25, 0.5, 0.75)]
            else:
                posts += [(x0 + 0.12, (y0 + y1) / 2), (x1 - 0.12, (y0 + y1) / 2)]
            for px_, py_ in posts:
                p = B.at(px_, py_)
                B.tube("wood_dark", [p - Vector((0, 0, 0.3)), p + Vector((0, 0, z + 0.1))], 0.045, 10)
    with B.pieza("norays"):
        for x in (-4.2, -3.1, 3.1, 4.2):
            P.bollard(B, x, 27.55)
    with B.pieza("barcas"):
        AP.barca(B, 3.2, 26.3, g=10, k=1.0, role="house_c")
        AP.barca(B, -3.6, 26.4, g=-8, k=0.85, role="house_a")
    with B.pieza("escolleras"):
        for iid in ("escollera_oeste", "escollera_este"):
            AP.escollera_bloques(B, islas[iid])
    with B.pieza("balizas"):
        for (x, y), role, glow in (((-2.6, 22.4), "leaf", "green_light"), ((2.6, 22.4), "red", "red_light")):
            p = B.at(x, y, 0.3)
            B.lathe("stone", [(0, -0.3), (0.26, -0.3), (0.24, 0.02), (0.2, 0.08), (0, 0.08)], tuple(p), segs=8)
            for i in range(3):
                z0 = 0.08 + 0.19 * i
                B.lathe(role if i % 2 == 0 else "white", [(0, z0), (0.13 - 0.01 * i, z0), (0.12 - 0.01 * i, z0 + 0.19),
                                                          (0, z0 + 0.19)], tuple(p), segs=16)
            B.blob(glow, (0.07, 0.07, 0.08), p + Vector((0, 0, 0.72)), segs=12, rings=8)
            B.lathe("iron", [(0, 0.8), (0.1, 0.8), (0.02, 0.9), (0, 0.9)], tuple(p), segs=12)
    with B.pieza("anillo"):
        sx, sy = lugar(Z, "salida")
        B.torus("spawn_glow", 0.95, 0.04, P.T(*B.at(sx, sy, 0.03)), nu=64, nv=8)
        roles = ("lantern", "firework_a", "firework_c", "firework_b")
        for i in range(8):
            a = math.radians(i * 45 + 22.5)
            q = B.at(sx + 0.95 * math.cos(a), sy + 0.95 * math.sin(a), 0.1)
            B.blob(roles[i % 4], (0.06, 0.06, 0.075), q, 2.0, 2.4, segs=12, rings=8)
            B.lathe("wood_dark", [(0, 0.065), (0.02, 0.065), (0.02, 0.08), (0, 0.08)], tuple(q), segs=8)
    with B.pieza("boia"):
        bx, by = lugar(Z, "boia")
        tip = P.boia(B, bx, by, k=1.9, body="red", band="white", g=90.0)
        P.ripple(B, bx, by, 0.75, 2, t=0.026)
    with B.pieza("bocadillo"):
        P.bubble_sign(B, tip + P.mvec(0.55, 0.0) + Vector((0, 0, 0.45)), k=1.25, g=90.0)
    with B.pieza("whatsapp"):
        wx, wy = lugar(Z, "whatsapp")
        wt = P.boia(B, wx, wy, k=1.0, body="pea", band="white", top="pea", g=90.0)
        P.ripple(B, wx, wy, 0.42, 1)
        c = wt + Vector((0, 0, 0.35))
        D = P.mdir(90)
        Rt = D.cross(P.UP).normalized()
        B.blob("white", (0.16, 0.04, 0.16), c, 2.0, 2.0, extra=P.basis(Rt, D, P.UP), segs=20, rings=10)
        B.tube("white", [c - Rt * 0.1 - Vector((0, 0, 0.12)), c - Rt * 0.17 - Vector((0, 0, 0.2))], [0.04, 0.01], segs=6)
        B.blob("pea", (0.07, 0.03, 0.035), c + D * 0.04, 2.0, 2.0, extra=P.basis(Rt, D, P.UP) @ P.rot("Y", 40),
               segs=12, rings=6)
    with B.pieza("gaviotas"):
        P.gull(B, B.at(-4.0, 27.5, 0.62), g=40)
        P.gull(B, B.at(3.6, 26.2, 0.25), g=150)
    with B.pieza("guardamuelle"):
        P.person(B, -1.85, 25.7, role="person_b", h=1.1, g=60, hat="hat", arms="wave", z=0.23)
