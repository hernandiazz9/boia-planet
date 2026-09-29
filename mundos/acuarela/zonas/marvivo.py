"""El mar vivo del mundo de acuarela: La Nao, El Bol Nou, La Granadella, El Racó de l'Albir,
l'Illa de Benidorm y el Cap de la Nau (lugares naufrago, restos, cofres, botellas, delfin, remolino). MUESTRA.

Mismos puntos de mapa.json que en arcilla. El banco del náufrago con su vela
remendada de sombra y un SOS de conchas; restos de cajas de naranjas, tablas y
un sombrero de paja; un cofre forrado de azulejos con conchas; la botella de
vidrio verde; el delfín; y el remolino, una aguada turquesa con tres brazos de
espuma (simetría de tres vueltas: el bucle de 120° se ve continuo).
"""
import math

from mathutils import Matrix, Vector

import piezas as P


def lugar(Z, lid):
    return next(lg["pos"] for lg in Z["lugares"] if lg["id"] == lid)


def sombrero(B, pos, k=1.0):
    p = Vector(pos)
    B.lathe("rice", [(0, 0), (0.2 * k, 0), (0.21 * k, 0.015 * k), (0.1 * k, 0.03 * k), (0.09 * k, 0.1 * k),
                     (0, 0.11 * k)], tuple(p), segs=20)
    B.torus("red", 0.095 * k, 0.012 * k, P.T(*(p + Vector((0, 0, 0.04 * k)))), nu=18, nv=5)


def caja_naranjas(B, pos, g=0.0, k=1.0):
    m = P.T(*pos) @ B.rz(g)
    B.blob("crate", (0.16 * k, 0.12 * k, 0.07 * k), (0, 0, 0), 8.0, 6.0, extra=m, segs=16, rings=6)
    for i in range(3):
        for j in range(2):
            B.blob("orange", (0.045 * k, 0.045 * k, 0.045 * k), (0, 0, 0),
                   extra=m @ P.T((-0.09 + 0.09 * i) * k, (-0.045 + 0.09 * j) * k, 0.07 * k), segs=10, rings=6)


def resto(B, x, y, v):
    """Tres grupos distintos (variantes a, b y c)."""
    r = B.rng
    if v == 0:
        caja_naranjas(B, B.at(x - 0.1, y, 0.04), g=20)
        B.blob("wood", (0.25, 0.05, 0.022), (0, 0, 0), 5.0, 3.0, extra=P.T(*B.at(x + 0.25, y + 0.12, 0.02)) @ B.rz(70),
               segs=16, rings=6)
        for i in range(3):
            B.blob("orange", (0.045, 0.045, 0.045), B.at(x + 0.2 + 0.1 * i, y - 0.2 + 0.05 * i, 0.02), segs=10, rings=6)
    elif v == 1:
        sombrero(B, B.at(x, y, 0.01), k=1.2)
        for i in range(2):
            B.blob("wood", (0.22, 0.05, 0.022), (0, 0, 0), 5.0, 3.0,
                   extra=P.T(*B.at(x + 0.1 - 0.3 * i, y + 0.22 - 0.35 * i, 0.02)) @ B.rz(r.uniform(0, 180)), segs=16,
                   rings=6)
    else:
        caja_naranjas(B, B.at(x + 0.1, y + 0.05, 0.04), g=-35, k=0.9)
        P.barrel(B, B.at(x - 0.25, y - 0.1, 0.05), 0.07, 0.09, lying=True, g=40.0)
        B.blob("paper", (0.1, 0.07, 0.01), B.at(x + 0.05, y - 0.25, 0.012), 4.0, 2.0, extra=B.rz(15), segs=10, rings=4)
    P.ripple(B, x, y, 0.45, 1, t=0.018)


def build(B, Z, M, AP):
    islas = {i["id"]: i for i in Z["islas"]}
    banco = islas["banco_naufrago"]
    nx, ny = lugar(Z, "naufrago")
    with B.pieza("naufrago"):
        cx, cy = banco["centro"]
        B.land(cx, cy, banco["a"], banco["b"], banco["alto"] + 0.2, -0.2, banco.get("giro", 0.0), banco.get("p", 2.2),
               2.2, role="sand", segs=64, rings=16)
        AP.orilla(B, banco)
        mx, my = AP.local(banco, -0.35, -0.3)
        base = B.on(mx, my, -0.02)
        top = base + Vector((0, 0, 1.15))
        B.tube("wood_dark", [base, top], 0.035, segs=6)
        B.tube("wood", [top - Vector((0, 0, 0.1)) + P.mvec(-0.5, 0.1), top - Vector((0, 0, 0.1)) + P.mvec(0.55, -0.1)],
               0.02, segs=5)
        # vela remendada de sombra, colgada en diagonal
        a, b = top - Vector((0, 0, 0.12)), base + P.mvec(-0.75, -0.35) + Vector((0, 0, 0.05))
        d = (b - a)
        n = d.cross(P.mdir(0)).normalized()
        fr = P.basis(d.normalized(), P.mdir(0), n)
        c = a.lerp(b, 0.5)
        B.blob("sail", (d.length * 0.5, 0.3, 0.012), (0, 0, 0), 4.0, 2.0, extra=P.T(*c) @ fr, segs=16, rings=4)
        B.blob("house_b", (0.12, 0.1, 0.014), (0, 0, 0), 6.0, 2.0, extra=P.T(*c) @ fr @ P.T(0.1, 0.12, 0.004),
               segs=10, rings=4)
        P.person(B, nx + 0.15, ny - 0.05, role="shirt_b", h=1.05, g=90.0, hat="rice", arms="wave")
        sx, sy = AP.local(banco, 0.2, 0.45)
        B.text("shell", "SOS", B.on(sx, sy, 0.012), g=90.0, size=0.32, depth=0.025, bevel=0.01, lying=True)
        for u, v in ((-0.8, 0.3), (0.5, -0.5), (0.75, 0.2)):
            qx, qy = AP.local(banco, u, v)
            B.blob("shell", (0.04, 0.03, 0.018), B.on(qx, qy, 0.005), 2.0, 2.0, extra=B.rz(u * 90), segs=10, rings=6)
    with B.pieza("balsa"):
        cxr, cyr = AP.local(banco, -1.18, 0.25)
        g = banco.get("giro", 0.0) + 8
        d = P.mdir(g)
        sd = P.mdir(g + 90)
        c0 = B.at(cxr, cyr, 0.0)
        for i in range(5):
            off = (i - 2) * 0.115
            a = c0 + sd * off - d * 0.42
            b = c0 + sd * off + d * 0.42
            a.z = max(0.0, B.ground_b(a.x, a.y)) + 0.045
            b.z = max(0.0, B.ground_b(b.x, b.y)) + 0.045
            B.tube("wood", [a, a.lerp(b, 0.5) + Vector((0, 0, 0.005)), b], [0.05, 0.056, 0.048], segs=10)
        for t in (-0.6, 0.6):
            q = c0 + d * 0.42 * t
            ze = max(0.0, B.ground_b(q.x, q.y)) + 0.1
            B.tube("rope", [q - sd * 0.33 + Vector((0, 0, ze - 0.03)), q + Vector((0, 0, ze)),
                            q + sd * 0.33 + Vector((0, 0, ze - 0.03))], 0.016, segs=6)
    with B.pieza("restos"):
        for i, (x, y) in enumerate(Z["restos"]):
            resto(B, x, y, i % 3)
    with B.pieza("cofres"):
        for lid, g in (("cofre_1", 70), ("cofre_2", 110)):
            x, y = lugar(Z, lid)
            P.chest(B, x, y, g=g, k=1.15)
            m = P.T(*B.at(x, y, 0.02)) @ B.rz(g)
            for i in range(4):
                B.blob("dome_a" if i % 2 else "tile_a", (0.035, 0.005, 0.035), (0, 0, 0), 8.0, 8.0,
                       extra=m @ P.T((-0.11 + 0.075 * i) * 1.15, 0.155, 0.07), segs=8, rings=4)
            B.blob("shell", (0.05, 0.04, 0.02), (0, 0, 0), extra=m @ P.T(0.0, 0.0, 0.3), segs=10, rings=6)
    with B.pieza("botellas"):
        for lid, g in (("botella_1", 30), ("botella_2", 150), ("botella_3", -40)):
            x, y = lugar(Z, lid)
            P.bottle(B, x, y, g=g, k=1.15)
    with B.pieza("delfin"):
        dx, dy = lugar(Z, "delfin")
        P.dolphin(B, dx, dy, g=-125.0, k=1.35, jump=0.55)
    with B.pieza("remolino"):
        rx, ry = lugar(Z, "remolino")
        C = B.at(rx, ry, 0.0)
        R = 1.4
        B.blob("shallow", (R * 1.02, R * 1.02, 0.02), C + Vector((0, 0, 0.0)), 2.0, 2.0, segs=64, rings=6)
        B.blob("sea", (R * 0.72, R * 0.72, 0.02), C + Vector((0, 0, 0.006)), 2.0, 2.0, segs=48, rings=6)
        B.blob("sea_deep", (R * 0.3, R * 0.3, 0.014), C + Vector((0, 0, 0.012)), segs=32, rings=6)
        for k in range(3):
            th0 = 2 * math.pi * k / 3
            pts, rs = [], []
            n = 48
            for i in range(n + 1):
                t = i / n
                r = R * 0.98 + (0.15 - R * 0.98) * t
                th = th0 + 2 * math.pi * 1.1 * t
                pts.append(C + Vector((r * math.cos(th), r * math.sin(th), 0.05 - 0.03 * t)))
                rs.append(0.055 - 0.04 * t)
            B.tube("foam", pts, rs, segs=8)
