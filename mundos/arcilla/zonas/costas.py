"""Costas laterales infranqueables (REQ-MUN-011), desde M["costas"]. No es una zona: Z = None.

Oeste: acantilados de arenisca de Alicante con estratos, pinos arriba, casitas
encaladas abajo, torre vigía arriba del mapa y el secreto de la cueva.
Este: la playa larga, arena baja con dunas, sombrillas, palmeras y pinos, y
rocas hacia arriba del mapa (junto a El Freu). La grada del circuito va en la
arena, en (15,8, 2,6): aquí se le deja sitio.
"""
import math

from mathutils import Matrix, Vector

import piezas as P

UP = Vector((0, 0, 1))


def casita(B, x, y, w=0.55, d=0.45, h=0.5, g=90.0, roof="roof_tile", lit=True):
    """Copiada de zonas/puerto.py: casita encalada con tejado de teja, puerta azul y ventana."""
    base = B.on(x, y, -0.03)
    m = B.rz(g)
    B.blob("whitewash", (w, d, h * 0.5), base + Vector((0, 0, h * 0.5)), 6.0, 7.0, extra=m, segs=24, rings=12)
    B.blob(roof, (w + 0.06, d + 0.06, 0.2), base + Vector((0, 0, h + 0.02)), 5.0, 2.0, extra=m, segs=28, rings=12)
    B.blob("chimney", (0.06, 0.06, 0.1), base + P.mdir(g + 180) * d * 0.4 + P.mdir(g + 90) * w * 0.5 + Vector((0, 0, h + 0.22)), 2.0, 4.0, segs=12, rings=8)
    D = P.mdir(g)
    Rt = D.cross(P.UP).normalized()
    door = base + D * (d * 0.98) + Vector((0, 0, 0.16))
    B.blob("blue_door", (0.09, 0.02, 0.15), door, 4.0, 3.0, extra=P.basis(Rt, D, P.UP), segs=14, rings=8)
    win = base + D * (d * 0.98) + Rt * (w * 0.55) + Vector((0, 0, h * 0.62))
    B.blob("window_lit" if lit else "glass", (0.075, 0.02, 0.07), win, 4.0, 4.0, extra=P.basis(Rt, D, P.UP), segs=12, rings=6)
    B.blob("blue_door", (0.1, 0.022, 0.085), win - D * 0.004, 4.0, 4.0, extra=P.basis(Rt, D, P.UP), segs=12, rings=6)
    if lit:
        B.luz(win + D * 0.3, (1.0, 0.78, 0.5), 6.0, ("atardecer", "noche"))
    return base + Vector((0, 0, h + 0.15))


def cara_x(B, y, z, x0, x1, step=0.02):
    """Primer x (yendo de x0 hacia x1) donde el terreno alcanza la altura z."""
    n = int(abs(x1 - x0) / step)
    s = step if x1 > x0 else -step
    for i in range(n):
        x = x0 + s * i
        if B.gz(x, y) >= z:
            return x
    return x1


def sombrilla(B, x, y, role, k=1.0):
    base = B.on(x, y, -0.04)
    top = base + Vector((0.03, -0.02, 0.62 * k))
    B.tube("white", [base, top], 0.016, segs=6)
    B.lathe(role, [(0, 0.12 * k), (0.12 * k, 0.1 * k), (0.28 * k, 0.03 * k), (0.32 * k, -0.01 * k), (0.3 * k, -0.02 * k), (0, 0.0)],
            tuple(top), segs=16)
    B.lathe("white", [(0, 0.1 * k), (0.12 * k, 0.085 * k), (0.2 * k, 0.05 * k), (0.19 * k, 0.045 * k), (0, 0.095 * k)],
            tuple(top + Vector((0, 0, 0.012))), segs=16)
    B.blob("white", (0.025, 0.025, 0.03), top + Vector((0, 0, 0.13 * k)), segs=8, rings=6)


def toalla(B, x, y, role, g):
    c = B.on(x, y, 0.0)
    B.blob(role, (0.2, 0.1, 0.018), (0, 0, 0), 5.0, 2.0, extra=P.T(*c) @ B.rz(g), segs=16, rings=6)
    B.blob("white", (0.2, 0.025, 0.02), (0, 0, 0), 5.0, 2.0, extra=P.T(*c) @ B.rz(g) @ P.T(0, 0.03, 0.004), segs=16, rings=6)


def torre(B, x, y):
    base = B.on(x, y, -0.08)
    h = 1.25
    prof = [(0, 0), (0.42, 0), (0.4, 0.2), (0.34, 0.6), (0.32, h), (0.36, h + 0.03), (0.36, h + 0.1), (0, h + 0.1)]
    B.lathe("stone", prof, tuple(base), segs=32)
    for i in range(8):
        a = math.radians(i * 45 + 10)
        q = base + Vector((0.3 * math.cos(a), 0.3 * math.sin(a), h + 0.17))
        B.blob("stone", (0.075, 0.075, 0.09), q, 4.0, 4.0, extra=P.rot("Z", i * 45 + 10), segs=12, rings=8)
    # puerta y aspillera hacia el mar (este) y hacia cámara
    for g, zz, sz in ((20.0, 0.22, (0.1, 0.03, 0.17)), (70.0, 0.85, (0.035, 0.03, 0.1)), (-20.0, 0.75, (0.035, 0.03, 0.1))):
        D = P.mdir(g)
        Rt = D.cross(UP).normalized()
        r = 0.39 if zz < 0.4 else 0.33
        B.blob("kiln_mouth", sz, (0, 0, 0), 3.0, 2.5, extra=P.T(*(base + D * r + Vector((0, 0, zz)))) @ P.basis(Rt, D, UP), segs=12, rings=8)
    # franja de piedra oscura
    B.torus("cliff_dark", 0.345, 0.025, P.T(*(base + Vector((0, 0, h - 0.12)))), nu=32, nv=6)


def build(B, Z, M):
    costas = {c["id"]: c for c in M["costas"]}
    oeste, este = costas["costa_oeste"], costas["costa_este"]
    cueva = next(s for s in M["secretos"] if s["id"] == "cueva")
    gx, gy = 15.8, 2.6
    for Zc in M["zonas"]:
        if Zc["id"] == "circuito":
            gx, gy = next(lg["pos"] for lg in Zc["lugares"] if lg["id"] == "grada")

    # --- costa oeste: acantilados ---------------------------------------------------------------
    tramos = oeste["tramos"]
    with B.pieza("acantilados", "costas"):
        for t in tramos:
            (cx, cy), a, b, alto = t["centro"], t["a"], t["b"], t["alto"]
            # estrato bajo más oscuro, un poco más ancho: pie del acantilado
            B.land(cx + 0.12, cy, a + 0.18, b + 0.1, 0.55, -0.25, g=0, p=4.0, q=5.0, role="cliff_dark", segs=64, rings=16)
            # masa principal de arenisca, pared casi vertical hacia el mar
            B.land(cx, cy, a, b, alto + 0.2, -0.2, g=0, p=4.0, q=7.0, role="cliff", segs=72, rings=24)
            # estrato alto (repisa) y tapa de hierba
            B.land(cx - 0.3, cy + 0.2, a - 0.45, b - 0.5, 0.2, alto - 0.12, g=0, p=4.0, q=4.0, role="cliff_dark", segs=56, rings=12)
            B.land(cx - 0.9, cy + 0.1, a - 0.9, b - 0.9, 0.14, alto + 0.02, g=0, p=3.0, q=3.0, role="grass", segs=56, rings=12)
    with B.pieza("rocas", "costas"):
        for t in tramos:
            (cx, cy), a, b = t["centro"], t["a"], t["b"]
            for i in range(6):
                y = cy + B.rng.uniform(-b * 0.85, b * 0.85)
                if abs(y - cueva["pos"][1]) < 0.9 and abs(cy - cueva["pos"][1]) < 1.0:
                    continue
                x = cara_x(B, y, 0.05, -12.5, cx) + B.rng.uniform(0.05, 0.35)
                s = B.rng.uniform(0.14, 0.3)
                P.rock(B, x, y, s, z=-s * 0.2)
                if i % 3 == 0:
                    P.ripple(B, x, y, s + 0.1, 1, t=0.015)
    with B.pieza("pinos", "costas"):
        for ti, t in enumerate(tramos):
            (cx, cy), a, b = t["centro"], t["a"], t["b"]
            n = 3 if ti not in (0,) else 2
            for i in range(n):
                y = cy + (i - (n - 1) / 2) * (b * 0.55) + B.rng.uniform(-0.3, 0.3)
                x = cx - 0.4 + B.rng.uniform(-0.3, 0.8)
                if ti == 6 and abs(y + 20.5) < 1.0:
                    continue          # torre vigía
                P.pine(B, x, y, height=B.rng.uniform(1.0, 1.35), k=B.rng.uniform(0.75, 0.95))
            for i in range(2):
                y = cy + B.rng.uniform(-b * 0.6, b * 0.6)
                x = cx + B.rng.uniform(0.3, 0.9)
                P.bush(B, x, y, B.rng.uniform(0.14, 0.22), role="leaf" if i else "pine")
    with B.pieza("casitas", "costas"):
        (cx, cy) = tramos[0]["centro"]
        for (x, y, w, h, lit) in ((cx + 0.9, cy - 2.2, 0.42, 0.46, True), (cx + 0.55, cy - 0.9, 0.36, 0.42, False),
                                  (cx + 1.0, cy + 0.45, 0.4, 0.5, True)):
            casita(B, x, y, w, 0.34, h, g=45.0, lit=lit)
    with B.pieza("torre", "costas"):
        tx, ty = tramos[6]["centro"][0] + 0.75, tramos[6]["centro"][1] - 1.0
        torre(B, tx, ty)

    # --- secreto: la cueva ---------------------------------------------------------------------------
    with B.pieza("cueva", "secretos"):
        # La pared del acantilado mira al este y casi no se ve desde la cámara: la grieta se abre en
        # un contrafuerte de arenisca pegado a la pared, con la boca mirando al mar y a cámara (g = 40).
        x0, y0 = cueva["pos"]
        g = 40.0
        D = P.mdir(g)
        Rt = D.cross(UP).normalized()
        xf = cara_x(B, y0, 0.3, -12.5, -18.0)
        mx, my = xf + 0.05, y0
        base = B.at(mx, my, 0.0)
        for side, hgt in ((-1, 1.2), (1, 1.05)):
            c = base + Rt * side * 0.44 - D * 0.05 + Vector((0, 0, hgt * 0.42))
            B.blob("cliff", (0.3, 0.3, hgt * 0.62), (0, 0, 0), 2.6, 3.2, extra=P.T(*c) @ P.basis(D, Rt, UP), segs=20, rings=12)
            B.blob("cliff_dark", (0.33, 0.33, 0.14), (0, 0, 0), 2.6, 2.6, extra=P.T(*(c - Vector((0, 0, hgt * 0.42 - 0.02)))) @ P.basis(D, Rt, UP),
                   segs=20, rings=8)
        B.blob("cliff", (0.3, 0.72, 0.22), (0, 0, 0), 2.6, 2.6, extra=P.T(*(base - D * 0.08 + Vector((0, 0, 0.98)))) @ P.basis(D, Rt, UP),
               segs=24, rings=10)
        mouth = base - D * 0.02 + Vector((0, 0, 0.42))
        B.blob("kiln_mouth", (0.12, 0.3, 0.44), (0, 0, 0), 2.2, 2.6, extra=P.T(*mouth) @ P.basis(D, Rt, UP), segs=20, rings=12)
        # grieta que sigue hacia arriba por el dintel
        B.tube("kiln_mouth", [mouth + D * 0.2 + Vector((0, 0, 0.5)), mouth + D * 0.24 + Rt * 0.05 + Vector((0, 0, 0.66)),
                              mouth + D * 0.2 - Rt * 0.03 + Vector((0, 0, 0.8))], [0.028, 0.02, 0.008], segs=6)
        # repisa en la boca con monedas que brillan
        B.blob("cliff_dark", (0.24, 0.3, 0.07), (0, 0, 0), 2.6, 2.4, extra=P.T(*(base + D * 0.1 + Vector((0, 0, 0.03)))) @ P.basis(D, Rt, UP),
               segs=18, rings=8)
        for i, (dx, dy, dz, tilt) in enumerate(((0.05, -0.12, 0.1, 15), (0.1, 0.06, 0.1, -10), (0.02, 0.15, 0.12, 30),
                                                (0.12, -0.02, 0.14, 55), (0.0, 0.0, 0.2, 70), (0.08, 0.12, 0.17, 40))):
            c = base + D * dx + Rt * dy + Vector((0, 0, dz))
            B.lathe("coin", [(0, 0), (0.055, 0), (0.055, 0.018), (0, 0.018)], (0, 0, 0), segs=14,
                    extra=P.T(*c) @ P.basis(Rt, D, UP) @ P.rot("X", -tilt))
        B.luz(mouth + D * 0.45 + Vector((0, 0, -0.1)), (1.0, 0.8, 0.35), 4.0, ("dia", "atardecer", "noche"))
        # pista: tres monedas flotando en fila que apuntan a la grieta
        dmap = Vector((math.cos(math.radians(g)), math.sin(math.radians(g))))
        ax = (P.mdir(90) * 0.55 + UP * 0.83).normalized()
        X = P.mdir(0)
        Y = ax.cross(X).normalized()
        for i in range(3):
            q = Vector((mx, my)) + dmap * (1.05 + 0.6 * i)
            c = B.at(q.x, q.y, 0.1)
            B.lathe("coin", [(0, -0.018), (0.1, -0.018), (0.105, 0.0), (0.1, 0.018), (0, 0.018)], (0, 0, 0), segs=20,
                    extra=P.T(*c) @ P.basis(X, Y, ax))
            B.torus("gold", 0.07, 0.008, P.T(*c) @ P.basis(X, Y, ax) @ P.T(0, 0, 0.02), nu=18, nv=4)
            P.ripple(B, q.x, q.y, 0.17, 1, t=0.014)

    # --- costa este: la playa larga ---------------------------------------------------------------------
    et = este["tramos"]
    with B.pieza("playa", "costas"):
        for i, t in enumerate(et):
            (cx, cy), a, b, alto = t["centro"], t["a"], t["b"], t["alto"]
            B.land(cx, cy, a, b, alto + 0.2, -0.2, g=0, p=4.0, q=2.2, role="sand", segs=72, rings=20)
        # dunas: lomas más altas tierra adentro, con matas
        for i, t in enumerate(et):
            (cx, cy), a, b, alto = t["centro"], t["a"], t["b"], t["alto"]
            for k in range(2):
                dy = (k - 0.5) * b * 0.9 + B.rng.uniform(-0.3, 0.3)
                if abs(cy + dy - gy) < 2.0:
                    continue
                B.land(cx + 0.9, cy + dy, 1.1, 1.4, 0.3, alto - 0.12, g=B.rng.uniform(-20, 20), p=2.2, q=2.0, role="sand",
                       segs=40, rings=12)
    with B.pieza("dunas", "costas"):
        # matas de barrón sobre las dunas: churros verdes en abanico
        for i in range(30):
            y = 28.5 - i * 1.25 + B.rng.uniform(-0.3, 0.3)
            if abs(y - gy) < 1.8 or y < -9.0:
                continue
            x = 16.2 + B.rng.uniform(0.0, 1.3)
            base = B.on(x, y, -0.02)
            for j in range(6):
                a = math.radians(j * 60 + B.rng.uniform(0, 40))
                d = Vector((math.cos(a), math.sin(a), 0))
                hgt = B.rng.uniform(0.14, 0.22)
                B.tube("pea" if j % 2 else "grass", [base, base + d * 0.04 + Vector((0, 0, hgt * 0.6)), base + d * 0.1 + Vector((0, 0, hgt))],
                       [0.018, 0.013, 0.005], segs=5)
    with B.pieza("sombrillas", "costas"):
        roles = ("lane_a", "stripe", "red", "firework_b", "pea")
        k = 0
        for y in (24.0, 20.5, 17.5, 13.8, 9.6, -1.6, -5.4):
            x = 15.55 + B.rng.uniform(-0.1, 0.3)
            if abs(y - gy) < 2.0:
                continue
            sombrilla(B, x, y, roles[k % len(roles)], k=B.rng.uniform(0.9, 1.1))
            toalla(B, x - 0.05, y + 0.45, roles[(k + 2) % len(roles)], g=B.rng.uniform(-10, 10) + 90)
            k += 1
    with B.pieza("palmeras", "costas"):
        for x, y, h in ((16.4, 26.0, 1.7), (16.1, 22.2, 1.55), (16.5, 15.7, 1.65), (16.3, 7.4, 1.6), (16.4, -2.8, 1.5)):
            P.palm(B, x, y, lean=(-0.28, 0.05), height=h, leaves=7)
    with B.pieza("pinos", "costas"):
        for x, y in ((17.0, 18.5), (17.1, 11.8), (16.9, -7.4), (17.0, -15.0), (16.9, -19.6), (17.1, -25.0)):
            P.pine(B, x, y, height=B.rng.uniform(1.05, 1.3), k=B.rng.uniform(0.8, 0.95))
        for x, y in ((16.6, 12.9), (16.4, 0.2), (16.2, -9.6)):
            P.bush(B, x, y, 0.18, role="leaf")
    with B.pieza("rocas", "costas"):
        # hacia arriba del mapa la playa se vuelve roca, junto a El Freu
        for i in range(26):
            y = -9.2 - i * 0.85 + B.rng.uniform(-0.25, 0.25)
            if y < -31.0:
                break
            x = cara_x(B, y, 0.05, 13.0, 18.0) + B.rng.uniform(-0.2, 0.3)
            s = B.rng.uniform(0.18, 0.38) * (1.0 + 0.5 * min(1.0, (-y - 9.0) / 14.0))
            P.rock(B, x, y, s, z=B.gz(x, y) - s * 0.3 if B.gz(x, y) > 0 else -s * 0.15)
            if i % 2 == 0:
                x2 = x + B.rng.uniform(0.5, 1.4)
                P.rock(B, x2, y + B.rng.uniform(-0.3, 0.3), s * 0.8, z=max(0.0, B.gz(x2, y)) - s * 0.25)
