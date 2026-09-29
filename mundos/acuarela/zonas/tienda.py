"""Altea (lugar `tienda`): el escaparate de la tienda en el mundo de acuarela. MUESTRA.

La tienda es una casa encalada con la cúpula de teja vidriada azul y blanca de
Altea encima, toldo y mostrador; en el «tendedero» de mapa.json, camisetas y
bolsas colgadas; en el «cartel», el cartel TIENDA. Buganvilla y una datilera.
"""
import math

from mathutils import Matrix, Vector

import piezas as P


def camiseta(B, q, fr, role):
    B.blob(role, (0.08, 0.01, 0.1), (0, 0, 0), 6.0, 4.0, extra=P.T(*q) @ fr, segs=10, rings=4)
    for sx in (-1, 1):
        B.blob(role, (0.045, 0.009, 0.035), (0, 0, 0), 4.0, 4.0, extra=P.T(*q) @ fr @ P.T(sx * 0.1, 0, 0.06), segs=8,
               rings=4)


def build(B, Z, M, AP):
    s = Z["islas"][0]
    L = {lg["id"]: lg["pos"] for lg in Z["lugares"]}
    with B.pieza("isla"):
        AP.isla(B, s, beach=(0.3, 1.0), back=0.2, k_cliff=(0.85, 0.7))
    with B.pieza("tienda"):
        kx, ky = L["kiosco"]
        top = AP.casa(B, kx, ky, w=0.45, d=0.42, h=0.7, g=90.0, windows=1)
        drum = top + Vector((0, 0, 0.02))
        B.lathe("whitewash", [(0, 0), (0.3, 0), (0.3, 0.18), (0, 0.18)], tuple(drum), segs=8)
        AP.cupula(B, drum + Vector((0, 0, 0.18)), r=0.3)
        c = B.on(kx, ky, 0.0) + P.mdir(90.0) * 0.44
        AP.toldo_rayado(B, c + P.mdir(90.0) * 0.2, 0.42, 0.22, 0.55, g=90.0, a="dome_a", b="awning_b", stripes=5,
                        sag=0.02)
        B.blob("wood", (0.12, 0.38, 0.14), c + P.mdir(90.0) * 0.12 + Vector((0, 0, 0.14)), 6.0, 6.0, extra=B.rz(90.0),
               segs=16, rings=6)
        P.person(B, kx - 0.1, ky + 0.3, role="person_a", h=0.9, g=90.0, arms="wave")
    with B.pieza("tendedero"):
        tx, ty = L["tendedero"]
        a = B.on(tx - 0.45, ty - 0.2, 0.0)
        b = B.on(tx + 0.4, ty + 0.25, 0.0)
        for q in (a, b):
            B.tube("wood_dark", [q, q + Vector((0, 0, 0.62))], 0.016, segs=5)
        a2, b2 = a + Vector((0, 0, 0.6)), b + Vector((0, 0, 0.6))
        B.tube("rope", [a2.lerp(b2, i / 8) - Vector((0, 0, 0.05 * math.sin(math.pi * i / 8))) for i in range(9)],
               0.005, segs=4)
        d = (b2 - a2).normalized()
        n = d.cross(Vector((0, 0, 1))).normalized()
        fr = Matrix(((d.x, n.x, 0, 0), (d.y, n.y, 0, 0), (d.z, n.z, 1, 0), (0, 0, 0, 1)))
        for i, role in enumerate(("shirt_a", "tote", "shirt_b", "tote", "shirt_a")):
            t = (i + 0.8) / 6
            q = a2.lerp(b2, t) - Vector((0, 0, 0.05 * math.sin(math.pi * t) + 0.12))
            if role == "tote":
                B.blob("tote", (0.07, 0.01, 0.08), (0, 0, 0), 6.0, 6.0, extra=P.T(*q) @ fr, segs=10, rings=4)
                B.blob("sticker_a" if i == 1 else "sticker_b", (0.03, 0.012, 0.03), (0, 0, 0), extra=P.T(*q) @ fr,
                       segs=8, rings=4)
            else:
                camiseta(B, q, fr, role)
    with B.pieza("cartel"):
        cx, cy = L["cartel"]
        AP.cartel(B, cx, cy, "TIENDA", w=0.62, board="paper", ink="dome_a")
    with B.pieza("vegetacion"):
        B.rng.seed(130)
        AP.datilera(B, *AP.local(s, 0.75, -0.25), height=1.5)
        AP.buganvilla(B, *AP.local(s, -0.55, -0.35), 0.24)
        AP.pita(B, *AP.local(s, -0.7, 0.35), s=0.24)
        AP.matorral(B, s, n=6, seed=17, avoid=[tuple(v) for v in L.values()], r_avoid=0.7)
