"""La Vila Joiosa (lugar `fotos`): la galería de BOIA en el mundo de acuarela. MUESTRA.

Una fila de casas altas y estrechas de colores (las del barrio de pescadores de
La Vila Joiosa) sobre la meseta; la roja, en el punto «cuarto» de mapa.json, es
el cuarto oscuro. En la cala: la cámara sobre su trípode, el tendedero de fotos,
un llaüt varado y el marco de madera dorada sobre el agua, donde en arcilla está
el marco gigante (logro «Sonríe»).
"""
import math

from mathutils import Matrix, Vector

import piezas as P


def build(B, Z, M, AP):
    s = Z["islas"][0]
    L = {lg["id"]: lg["pos"] for lg in Z["lugares"]}
    with B.pieza("isla"):
        AP.isla(B, s, beach=(0.2, 1.0), back=0.22, k_cliff=(0.9, 0.62))
    with B.pieza("casas"):
        cols = ("house_a", "house_c", "house_d", "house_b", "house_e", "house_a")
        for i, u in enumerate((-0.72, -0.44, -0.16, 0.12, 0.4, 0.66)):
            x, y = AP.local(s, u, -0.42 + 0.04 * (i % 2))
            h = 0.95 + 0.25 * ((i * 7) % 3) / 2
            AP.casa(B, x, y, w=0.26, d=0.3, h=h, g=70.0, color=cols[i], shutter="blue_door" if i % 2 else "wood",
                    windows=1)
        cx, cy = L["cuarto"]
        top = AP.casa(B, cx, cy, w=0.32, d=0.32, h=0.8, g=70.0, color="darkroom", shutter="ink", windows=1)
        B.blob("red_light", (0.05, 0.05, 0.06), top + Vector((0, 0, 0.1)), segs=10, rings=6)
    with B.pieza("camara"):
        kx, ky = L["camara"]
        base = B.on(kx, ky, -0.01)
        head = base + Vector((0, 0, 0.62))
        for a in (0, 120, 240):
            d = P.mdir(a)
            B.tube("wood_dark", [base + d * 0.2, head], 0.014, segs=5)
        m = P.T(*(head + Vector((0, 0, 0.1)))) @ B.rz(90.0)
        B.blob("photo_body", (0.14, 0.2, 0.12), (0, 0, 0), 6.0, 6.0, extra=m, segs=16, rings=8)
        B.lathe("photo_lens", [(0, 0), (0.07, 0), (0.07, 0.12), (0, 0.12)], (0, 0, 0), segs=16,
                extra=m @ P.rot("Y", 90) @ P.T(0, 0, 0.12))
        B.blob("flash", (0.05, 0.05, 0.04), head + Vector((0, 0, 0.26)), segs=10, rings=6)
        P.person(B, kx - 0.3, ky - 0.25, role="person_e", h=0.95, g=60.0, hat="hat", arms="wave")
    with B.pieza("tendedero"):
        tx, ty = L["tendedero"]
        a = B.on(tx - 0.55, ty - 0.15, 0.0)
        b = B.on(tx + 0.5, ty + 0.2, 0.0)
        for q in (a, b):
            B.tube("wood_dark", [q, q + Vector((0, 0, 0.55))], 0.016, segs=5)
        a2, b2 = a + Vector((0, 0, 0.53)), b + Vector((0, 0, 0.53))
        B.tube("rope", [a2.lerp(b2, i / 8) - Vector((0, 0, 0.06 * math.sin(math.pi * i / 8))) for i in range(9)],
               0.005, segs=4)
        d = (b2 - a2).normalized()
        n = d.cross(Vector((0, 0, 1))).normalized()
        fr = Matrix(((d.x, n.x, 0, 0), (d.y, n.y, 0, 0), (d.z, n.z, 1, 0), (0, 0, 0, 1)))
        for i, role in enumerate(("house_c", "house_b", "leaf2", "house_d", "dome_a")):
            t = (i + 0.8) / 6
            q = a2.lerp(b2, t) - Vector((0, 0, 0.06 * math.sin(math.pi * t) + 0.1))
            B.blob("photo_paper", (0.08, 0.008, 0.085), (0, 0, 0), 8.0, 8.0, extra=P.T(*q) @ fr, segs=10, rings=4)
            B.blob(role, (0.06, 0.01, 0.05), (0, 0, 0), 6.0, 6.0, extra=P.T(*q) @ fr @ P.T(0, 0.004, 0.012), segs=8,
                   rings=4)
    with B.pieza("marco"):
        mx, my = L["marco"]
        g = 150.0
        D = P.mdir(g + 90)
        c = B.at(mx, my, 0.0)
        W_, H_ = 0.65, 1.05
        fr = P.basis(P.mdir(g), D, Vector((0, 0, 1)))
        for sx in (-1, 1):
            q = c + P.mdir(g) * sx * W_
            B.tube("ochre", [q - Vector((0, 0, 0.15)), q + Vector((0, 0, H_ + 0.1))], 0.06, segs=8)
        for z in (0.12, H_):
            B.tube("ochre", [c - P.mdir(g) * (W_ + 0.05) + Vector((0, 0, z)), c + P.mdir(g) * (W_ + 0.05) + Vector((0, 0, z))],
                   0.06, segs=8)
        for sx in (-1, 1):
            for z in (0.12, H_):
                B.blob("gold", (0.08, 0.08, 0.08), c + P.mdir(g) * sx * W_ + Vector((0, 0, z)), segs=10, rings=6)
        P.ripple(B, mx, my, 0.8, 1, t=0.02)
    with B.pieza("barca"):
        AP.barca(B, *AP.local(s, -0.45, 0.8), g=-30, k=0.95, role="house_b", z=0.12)
    with B.pieza("vegetacion"):
        for i, (u, v, h) in enumerate(((0.85, -0.15, 1.6), (-0.9, 0.05, 1.4))):
            B.rng.seed(120 + i)
            AP.datilera(B, *AP.local(s, u, v), height=h)
        AP.buganvilla(B, *AP.local(s, 0.55, 0.05), 0.2)
        AP.pita(B, *AP.local(s, -0.6, 0.25), s=0.25)
