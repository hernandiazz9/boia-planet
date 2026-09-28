"""Zona 9 · Última isla (Isla del Amanecer): destino de la Boia Fiestera.

Una isla de arena pequeña con el nicho vacío donde se quedará la Fiestera,
la hoguera, tres boies amigas esperando en la orilla, farolillos de papel,
banderines y fuegos artificiales de arcilla sobre la isla. El muelle mira a la
salida del circuito (abajo a la derecha).
"""
import math

from mathutils import Vector

import mapa as MAPA
import piezas as P

UP = Vector((0, 0, 1))


def lugar(Z, lid):
    return next(lg["pos"] for lg in Z["lugares"] if lg["id"] == lid)


def poste(B, x, y, h=1.25, role="wood_dark"):
    base = B.on(x, y, -0.06)
    B.tube(role, [base, base + Vector((0, 0, h))], 0.028, segs=8)
    B.blob(role, (0.04, 0.04, 0.03), base + Vector((0, 0, h + 0.01)), segs=10, rings=6)
    return base + Vector((0, 0, h - 0.04))


def cuerda(B, a, b, sag, n=12, role="rope", r=0.009):
    a, b = Vector(a), Vector(b)
    pts = [a.lerp(b, i / n) - Vector((0, 0, sag * math.sin(math.pi * i / n))) for i in range(n + 1)]
    B.tube(role, pts, r, segs=6)
    return lambda t: a.lerp(b, t) - Vector((0, 0, sag * math.sin(math.pi * t)))


def banderines(B, a, b, n, roles, sag=0.2, k=1.0):
    f = cuerda(B, a, b, sag)
    d = Vector(b) - Vector(a)
    d.z = 0
    d.normalize()
    nrm = d.cross(UP).normalized()
    for i in range(n):
        t = (i + 0.5) / n
        c = f(t) - Vector((0, 0, 0.012))
        m = P.T(*c) @ P.basis(d, nrm, UP)
        B.lathe(roles[i % len(roles)], [(0, -0.16 * k), (0.02 * k, -0.135 * k), (0.08 * k, -0.01 * k), (0.075 * k, 0.0), (0, 0.004)],
                (0, 0, 0), segs=12, sx=1.0, sy=0.22, extra=m)


def fibo(n):
    """n direcciones repartidas por la esfera."""
    out = []
    ga = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        z = 1 - 2 * (i + 0.5) / n
        r = math.sqrt(1 - z * z)
        out.append(Vector((r * math.cos(ga * i), r * math.sin(ga * i), z)))
    return out


def estallido(B, c, R, roles, n=16, luz=(1.0, 0.5, 0.7)):
    """Fuego artificial de arcilla: churros radiales con la punta en bolita."""
    c = Vector(c)
    B.blob(roles[0], (0.07, 0.07, 0.07), c, segs=12, rings=8)
    for i, d in enumerate(fibo(n)):
        rr = R * (0.85 + 0.15 * ((i * 7) % 3) / 2)
        role = roles[i % len(roles)]
        pts = [c + d * (rr * t) + Vector((0, 0, -0.05 * t * t)) for t in (0.18, 0.5, 0.8, 1.0)]
        B.tube(role, pts, [0.022, 0.02, 0.017, 0.014], segs=6)
        B.blob(roles[(i + 1) % len(roles)], (0.045, 0.045, 0.045), pts[-1], segs=10, rings=6)
    B.luz(c + Vector((0, 0, -0.1)), luz, 16.0, ("noche",))


def build(B, Z, M):
    isla = Z["islas"][0]
    cx, cy = isla["centro"]
    with B.pieza("isla"):
        B.isla(isla)
        # orilla: unas piedras y conchas
        for x, y, s in ((2.0, -28.4, 0.16), (1.9, -26.5, 0.12), (6.9, -27.9, 0.15), (3.1, -25.5, 0.11)):
            P.rock(B, x, y, s, z=max(0.0, B.gz(x, y)) - s * 0.3)
        # conchas en la arena de delante
        for i, (x, y) in enumerate(((3.9, -25.6), (4.3, -25.4), (2.6, -25.9), (5.0, -25.5))):
            q = B.on(x, y, 0.0)
            role = ("white", "fiestera", "sand", "white")[i]
            m = P.T(*q) @ B.rz(40 * i) @ P.rot("X", -25)
            for j in range(5):
                a = math.radians(-50 + 25 * j)
                tipv = Vector((0.06 * math.sin(a), 0.06 * math.cos(a), 0))
                B.tube(role, [m @ Vector((0, 0, 0)), m @ (tipv * 0.6 + Vector((0, 0, 0.012))), m @ tipv], [0.012, 0.016, 0.01], segs=6)
        for x, y in ((2.2, -25.9), (6.6, -26.4)):
            P.bush(B, x, y, 0.13, role="leaf")

    # --- nicho de la Fiestera: pedestal vacío con concha detrás y flores -------------------------
    nx, ny = lugar(Z, "nicho")
    with B.pieza("nicho"):
        base = B.on(nx, ny, -0.05)
        B.lathe("stone", [(0, 0), (0.44, 0), (0.45, 0.1), (0.4, 0.13), (0.34, 0.14), (0.34, 0.28), (0.37, 0.3), (0.37, 0.34), (0, 0.34)],
                tuple(base), segs=36)
        B.torus("fiestera_band", 0.27, 0.025, P.T(*(base + Vector((0, 0, 0.345)))), nu=32, nv=6)
        B.blob("fiestera", (0.2, 0.2, 0.012), base + Vector((0, 0, 0.345)), segs=24, rings=6)
        # hornacina: pared curva detrás (hacia arriba del mapa) con arco de churro y concha
        D = P.mdir(90)
        Rt = D.cross(UP).normalized()
        wb = base - D * 0.42
        B.blob("whitewash", (0.52, 0.12, 0.62), (0, 0, 0), 3.0, 5.0, extra=P.T(*(wb + Vector((0, 0, 0.55)))) @ P.basis(Rt, D, UP),
               segs=28, rings=14)
        arc = [wb + D * 0.12 + Rt * (0.44 * math.cos(math.pi * i / 14)) + Vector((0, 0, 0.62 + 0.44 * math.sin(math.pi * i / 14)))
               for i in range(15)]
        arc = [wb + D * 0.12 + Rt * 0.44 + Vector((0, 0, 0.05))] + arc + [wb + D * 0.12 - Rt * 0.44 + Vector((0, 0, 0.05))]
        B.tube("terracotta", arc, 0.05, segs=10)
        B.blob("whitewash", (0.4, 0.12, 0.3), (0, 0, 0), 3.0, 2.0, extra=P.T(*(wb + Vector((0, 0, 0.98)))) @ P.basis(Rt, D, UP),
               segs=24, rings=10)
        # concha (vieira) en el hueco: gajos en abanico
        sc = wb + D * 0.13 + Vector((0, 0, 0.82))
        for i in range(7):
            a = math.radians(-60 + 20 * i)
            tip = sc + Rt * (0.26 * math.sin(a)) + Vector((0, 0, 0.26 * math.cos(a)))
            B.tube("fiestera_band", [sc, sc.lerp(tip, 0.6) + D * 0.02, tip], [0.03, 0.045, 0.03], segs=8)
        B.blob("fiestera_band", (0.06, 0.03, 0.05), sc, segs=12, rings=6)
        # flores: matas pequeñas con bolitas de colores
        cols = ("firework_a", "firework_b", "white", "pepper", "firework_c", "fiestera")
        for i, a in enumerate((200, 235, 270, 305, 340, 165, 10)):
            r = 0.56
            x = nx + r * math.cos(math.radians(a))
            y = ny + r * math.sin(math.radians(a)) * 0.8
            q = B.on(x, y, 0.05)
            B.blob("leaf", (0.12, 0.11, 0.09), q, segs=14, rings=8)
            for j in range(4):
                b = math.radians(j * 90 + i * 25)
                B.blob(cols[(i + j) % len(cols)], (0.035, 0.035, 0.03), q + Vector((0.07 * math.cos(b), 0.07 * math.sin(b), 0.07)), segs=8, rings=6)

    # --- hoguera ---------------------------------------------------------------------------------
    hx, hy = lugar(Z, "hoguera")
    with B.pieza("hoguera"):
        base = B.on(hx, hy, -0.02)
        for i in range(9):
            a = math.radians(i * 40)
            q = base + Vector((0.3 * math.cos(a), 0.3 * math.sin(a), 0.03))
            B.blob("stone", (0.08, 0.07, 0.06), q, 2.4, 2.2, extra=P.rot("Z", i * 40), segs=12, rings=6)
        for i in range(4):
            a = math.radians(i * 90 + 20)
            d = Vector((math.cos(a), math.sin(a), 0))
            B.tube("wood", [base + d * 0.26 + Vector((0, 0, 0.03)), base + d * 0.02 + Vector((0, 0, 0.22))], [0.04, 0.035], segs=8)
            B.blob("wood_dark", (0.036, 0.036, 0.036), base + d * 0.26 + Vector((0, 0, 0.03)), segs=8, rings=6)
        B.lathe("fire", [(0, 0.04), (0.13, 0.06), (0.14, 0.13), (0.1, 0.22), (0.04, 0.3), (0, 0.32)], tuple(base), segs=18)
        for i, a in enumerate((0, 120, 240)):
            d = Vector((math.cos(math.radians(a)), math.sin(math.radians(a)), 0))
            B.tube("fire", [base + d * 0.05 + Vector((0, 0, 0.2)), base + d * 0.08 + Vector((0, 0, 0.3)),
                            base + d * 0.02 + Vector((0.02, 0, 0.42 + 0.04 * i)), base - d * 0.02 + Vector((0, 0, 0.5 + 0.05 * i))],
                   [0.06, 0.05, 0.03, 0.008], segs=10)
        for i, a in enumerate((30, 150, 270)):
            d = Vector((math.cos(math.radians(a)), math.sin(math.radians(a)), 0))
            B.lathe("fire", [(0, 0.04), (0.06, 0.06), (0.05, 0.16), (0.015, 0.27), (0, 0.29)], tuple(base + d * 0.09), segs=12)
        B.blob("firework_b", (0.06, 0.06, 0.1), base + Vector((0, 0, 0.14)), segs=10, rings=6)
        B.luz(base + Vector((0, 0, 0.45)), (1.0, 0.5, 0.2), 45.0, ("atardecer", "noche"))

    # --- banco de piedra, detrás de la hoguera mirando a ella ---------------------------------------
    with B.pieza("banco"):
        bx, by = hx - 0.75, hy - 0.8
        g = math.degrees(math.atan2(hy - by, hx - bx))
        base = B.on(bx, by, -0.03)
        m = P.T(*base) @ B.rz(g)
        for s in (-0.28, 0.28):
            B.blob("stone", (0.08, 0.12, 0.09), (0, 0, 0), 4.0, 4.0, extra=m @ P.T(0, s, 0.08), segs=14, rings=8)
        B.blob("stone", (0.17, 0.44, 0.045), (0, 0, 0), 5.0, 3.0, extra=m @ P.T(0, 0, 0.2), segs=24, rings=8)
        B.blob("fiestera", (0.1, 0.1, 0.03), (0, 0, 0), 3.0, 2.0, extra=m @ P.T(0.0, 0.2, 0.26), segs=12, rings=6)

    # --- palmeras -----------------------------------------------------------------------------------
    with B.pieza("palmeras"):
        pl = P.palm(B, 2.15, -27.3, lean=(-0.25, 0.1), height=1.7)
        pb = P.palm(B, 3.1, -29.05, lean=(-0.1, -0.25), height=1.55)
        pr = P.palm(B, 6.3, -28.45, lean=(0.3, -0.1), height=1.75)

    # --- farolillos de papel: cuerdas entre la palmera del fondo, dos postes y la de la derecha --------
    with B.pieza("farolillos"):
        t1 = poste(B, 4.4, -29.35, 1.3)
        t2 = poste(B, 5.45, -29.05, 1.25)
        segs = ((pb - Vector((0, 0, 0.35)), t1, 3), (t1, t2, 2), (t2, pr - Vector((0, 0, 0.4)), 2))
        for a, b, n in segs:
            f = cuerda(B, a, b, 0.2)
            for i in range(n):
                t = (i + 0.5) / n
                c = f(t) - Vector((0, 0, 0.14))
                B.tube("wire", [f(t), c + Vector((0, 0, 0.08))], 0.006, segs=4)
                P.lantern_paper(B, c, role="lantern", k=1.15)

    # --- banderines: de la palmera de la izquierda a un poste junto al muelle -------------------------
    mx0, my0 = lugar(Z, "muelle")
    with B.pieza("banderines"):
        t3 = poste(B, 5.35, -25.95, 1.1)
        banderines(B, pl - Vector((0, 0, 0.45)), t3, 11, ("firework_a", "firework_b", "firework_c", "lane_a", "person_d"), sag=0.25)

    # --- muelle de llegada hacia la salida del circuito ------------------------------------------------
    with B.pieza("muelle"):
        ex, ey = M["circuito"]["meta"]
        d = Vector((ex - mx0, ey - my0)).normalized()
        g = math.degrees(math.atan2(d.y, d.x))
        # arranca en la orilla y sale al agua pasando por el punto del mapa
        s0 = Vector((mx0, my0)) - d * 1.0
        for i in range(40):
            if B.gz(s0.x, s0.y) < 0.12:
                break
            s0 += d * 0.05
        s0 -= d * 0.25
        s1 = Vector((mx0, my0)) + d * 0.55
        Lm = (s1 - s0).length
        zc = 0.2
        c = (s0 + s1) * 0.5
        B.blob("deck", (Lm / 2, 0.28, 0.04), (0, 0, 0), 10.0, 6.0, extra=P.T(*B.at(c.x, c.y, zc)) @ B.rz(g), segs=40, rings=8)
        nrm = Vector((-d.y, d.x))
        for t in (0.2, 0.55, 0.95):
            q = s0.lerp(s1, t)
            for side in (-1, 1):
                pq = q + nrm * side * 0.25
                bot = min(-0.3, B.gz(pq.x, pq.y) - 0.1)
                B.tube("wood_dark", [B.at(pq.x, pq.y, bot), B.at(pq.x, pq.y, zc + 0.1)], 0.042, segs=10)
        tip = s1 - d * 0.1
        P.bollard(B, tip.x, tip.y) if B.gz(tip.x, tip.y) > 0.1 else B.lathe(
            "iron", [(0, 0), (0.06, 0), (0.05, 0.1), (0.07, 0.13), (0, 0.15)], tuple(B.at(tip.x, tip.y, zc + 0.03)), segs=12)
        P.ripple(B, s1.x, s1.y, 0.45, 1, t=0.018)

    # --- las boies amigas esperando en la orilla ------------------------------------------------------
    ax, ay = lugar(Z, "amigas")
    with B.pieza("amigas"):
        k = 0.6
        for (dx, dy), body, band, hat in (((-0.45, 0.25), "stripe", "white", "firework_b"),
                                          ((0.05, 0.05), "person_d", "firework_b", "firework_a"),
                                          ((0.5, 0.32), "person_e", "white", "firework_c")):
            x, y = ax + dx, ay + dy
            z = max(0.0, B.gz(x, y)) + 0.05
            tip = P.boia(B, x, y, k=k, body=body, band=band, g=95 - dx * 30, face=True, light=False, z=z)
            # gorrito de fiesta con pompón
            hb = tip - Vector((0, 0, 0.1 * k))
            B.lathe(hat, [(0, 0), (0.1 * k, 0), (0.02 * k, 0.26 * k), (0, 0.27 * k)], tuple(hb), segs=14)
            B.torus("white", 0.1 * k, 0.018, P.T(*(hb + Vector((0, 0, 0.01)))), nu=16, nv=6)
            B.blob("white", (0.035, 0.035, 0.035), hb + Vector((0, 0, 0.28 * k)), segs=10, rings=6)
            P.ripple(B, x, y, 0.26, 1, t=0.012) if B.gz(x, y) < 0 else None

    # --- fuegos artificiales de arcilla sobre la isla ---------------------------------------------------
    with B.pieza("fuegos"):
        # Alturas de 1,75 a 2 u: más altos se salen por arriba de la vista general.
        for (x, y, h, R, roles, col) in ((2.7, -27.6, 2.0, 0.4, ("firework_a", "firework_b"), (1.0, 0.45, 0.7)),
                                         (5.3, -28.0, 1.9, 0.44, ("firework_b", "firework_c"), (1.0, 0.85, 0.4)),
                                         (6.3, -27.2, 1.8, 0.34, ("firework_c", "firework_a"), (0.45, 0.75, 1.0)),
                                         (3.25, -28.65, 1.75, 0.3, ("firework_a", "firework_c", "firework_b"), (1.0, 0.6, 0.8))):
            gz = max(0.0, B.gz(x, y))
            c = B.at(x, y, gz + h)
            estallido(B, c, R, roles, n=16, luz=col)
            # estela del cohete: churro fino y ondulado desde el suelo
            g0 = B.at(x + 0.15, y + 0.35, gz)
            pts = [g0.lerp(c, t) + Vector((0.035 * math.sin(t * 9), 0.035 * math.cos(t * 7), 0)) for t in (0.0, 0.2, 0.4, 0.6, 0.78)]
            B.tube("smoke", pts, [0.012, 0.014, 0.016, 0.014, 0.01], segs=6)
