"""Extras del mundo de arcilla: secretos (salvo la cueva, que va en costas.py),
el solar L2 vacío y la fila de boies del borde superior abierto. Z = None.
"""
import math

from mathutils import Vector

import mapa as MAPA
import piezas as P

UP = Vector((0, 0, 1))


def secreto(M, sid):
    return next(s for s in M["secretos"] if s["id"] == sid)


def anfora(B, x, y):
    """Ánfora de terracota casi hundida: sólo asoman el cuello, la boca y las asas."""
    tilt = P.T(*B.at(x, y, 0.0)) @ B.rz(60) @ P.rot("Y", 18)
    prof = [(0, -0.7), (0.05, -0.68), (0.2, -0.5), (0.27, -0.3), (0.26, -0.12), (0.18, -0.02), (0.1, 0.06), (0.075, 0.12),
            (0.075, 0.26), (0.105, 0.28), (0.11, 0.32), (0.085, 0.335), (0.06, 0.32), (0, 0.3)]
    B.lathe("terracotta", prof, (0, 0, 0), segs=28, extra=tilt)
    B.lathe("kiln_mouth", [(0, 0.3), (0.062, 0.315), (0, 0.325)], (0, 0, 0), segs=18, extra=tilt)
    for side in (-1, 1):
        pts = [tilt @ Vector((side * r, 0, z)) for r, z in ((0.07, 0.24), (0.15, 0.25), (0.19, 0.18), (0.19, 0.06), (0.16, -0.02))]
        B.tube("terracotta", pts, 0.026, segs=8)
    # franja decorativa y conchas pegadas
    B.torus("cliff_dark", 0.08, 0.012, tilt @ P.T(0, 0, 0.19), nu=20, nv=6)
    B.blob("white", (0.03, 0.025, 0.012), (0, 0, 0), extra=tilt @ P.T(0.08, 0.03, 0.07) @ P.rot("Y", 70), segs=10, rings=6)
    P.ripple(B, x, y, 0.3, 2, t=0.016)


def campana(B, x, y):
    """Corona de una campana hundida asomando entre algas de posidonia."""
    m = P.T(*B.at(x, y, -0.02)) @ B.rz(20) @ P.rot("X", 12)
    B.lathe("gold", [(0, 0.24), (0.1, 0.23), (0.19, 0.17), (0.25, 0.06), (0.28, -0.08), (0, -0.08)], (0, 0, 0), segs=30, extra=m)
    B.torus("gold", 0.26, 0.022, m @ P.T(0, 0, 0.0), nu=30, nv=6)
    B.torus("gold", 0.07, 0.025, m @ P.T(0, 0, 0.3) @ P.rot("X", 90), nu=18, nv=6)
    B.torus("metal", 0.2, 0.012, m @ P.T(0, 0, 0.14), nu=26, nv=6)
    # algas: hojas largas de cinta, arqueadas sobre el agua
    for i in range(14):
        a = math.radians(i * 360 / 14 + B.rng.uniform(-10, 10))
        r0 = B.rng.uniform(0.3, 0.55)
        L = B.rng.uniform(0.35, 0.6)
        d = Vector((math.cos(a), math.sin(a), 0))
        base = B.at(x, y, 0.0) + d * r0
        h = B.rng.uniform(0.12, 0.3)
        pts = [base + d * (L * t) + Vector((0, 0, h * math.sin(math.pi * t * 0.8) - 0.03)) for t in (0.0, 0.25, 0.5, 0.75, 1.0)]
        B.tube("posidonia", pts, [0.03, 0.028, 0.024, 0.018, 0.008], segs=6)
    P.ripple(B, x, y, 0.42, 1, t=0.016)
    P.bubbles(B, x + 0.3, y + 0.25, 4, 0.12)


def build(B, Z, M):
    # --- secretos -----------------------------------------------------------------------------
    with B.pieza("anfora", "secretos"):
        x, y = secreto(M, "anfora")["pos"]
        anfora(B, x, y)
        P.bubbles(B, x - 0.35, y + 0.2, 6, 0.18)
        P.bubbles(B, x - 0.7, y + 0.45, 3, 0.1)
    with B.pieza("campana", "secretos"):
        x, y = secreto(M, "campana")["pos"]
        campana(B, x, y)
    with B.pieza("circulo", "secretos"):
        x, y = secreto(M, "circulo")["pos"]
        roles = ("firework_a", "firework_c", "person_f", "person_d", "fiestera", "stripe", "lane_a")
        for i in range(7):
            a = math.radians(90 + i * 360 / 7)
            bx, by = x + 0.9 * math.cos(a), y + 0.9 * math.sin(a)
            P.boia(B, bx, by, k=0.45, body=roles[i], band="white", g=90.0, face=True, closed=True, light=False, z=0.02)
            P.ripple(B, bx, by, 0.18, 1, t=0.01)
        P.ripple(B, x, y, 0.9, 1, t=0.012, role="spawn_glow")
        # «z» de sueño sobre dos de ellas
        for i, (dz, s) in enumerate(((0.45, 0.14), (0.62, 0.1))):
            a = math.radians(90 + 2 * 360 / 7)
            B.text("white", "z", B.at(x + 0.9 * math.cos(a) + 0.12 * i, y + 0.9 * math.sin(a) - 0.05, dz), g=90, size=s, depth=0.012)

    # --- solar L2: roca vacía con estacas, cuerda y cartel ------------------------------------------
    for s in M["solares_l2"]:
        with B.pieza("solar", "l2"):
            isla = s["isla"]
            B.isla(isla)
            cx, cy = isla["centro"]
            g = math.radians(isla.get("giro", 0.0))
            ux, uy = math.cos(g), math.sin(g)
            vx, vy = -uy, ux
            hw, hh = isla["a"] * 0.52, isla["b"] * 0.45
            corners = [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]
            stakes = []
            for (u0, v0), (u1, v1) in zip(corners, corners[1:] + corners[:1]):
                n = 3 if abs(u1 - u0) > 0.1 else 2
                for k in range(n):
                    t = k / n
                    u, v = u0 + (u1 - u0) * t, v0 + (v1 - v0) * t
                    stakes.append((cx + u * ux + v * vx, cy + u * uy + v * vy))
            tops = []
            for sx, sy in stakes:
                base = B.on(sx, sy, -0.06)
                top = base + Vector((0, 0, 0.3))
                B.tube("wood", [base, top], [0.03, 0.022], segs=8)
                B.blob("wood_dark", (0.028, 0.028, 0.02), top, segs=8, rings=6)
                tops.append(top - Vector((0, 0, 0.05)))
            for a, b in zip(tops, tops[1:] + tops[:1]):
                pts = [a.lerp(b, t) - Vector((0, 0, 0.05 * math.sin(math.pi * t))) for t in (0, 0.25, 0.5, 0.75, 1.0)]
                B.tube("rope", pts, 0.011, segs=6)
            # cartel «L2» en la esquina que mira a cámara
            fx, fy = cx + (hw + 0.25) * ux + (hh + 0.3) * vx, cy + (hw + 0.25) * uy + (hh + 0.3) * vy
            if B.gz(fx, fy) < 0.05:
                fx, fy = cx + hw * 0.7 * ux + (hh + 0.1) * vx, cy + hw * 0.7 * uy + (hh + 0.1) * vy
            P.sign(B, fx, fy, "L2", g=90.0, w=0.5, h=0.3, post_h=0.35, board="wood", ink="white", size=0.22)

    # --- borde superior abierto: fila de boies de temporada ------------------------------------------
    borde = next(c for c in M["costas"] if c["id"] == "borde_arriba")
    yb = borde["linea"][0][1]
    with B.pieza("boies", "borde"):
        xs = [-13.0 + 2.6 * i for i in range(11)]
        prev = None
        for i, x in enumerate(xs):
            body = "fiestera" if i % 2 == 0 else "lane_a"
            P.boia(B, x, yb, k=0.42, body=body, band="white", top="fiestera_band", face=False, light=True,
                   horas=("atardecer", "noche"))
            P.ripple(B, x, yb, 0.2, 1, t=0.012)
            cur = B.at(x, yb, 0.02)
            if prev is not None:
                pts = [prev.lerp(cur, t) + Vector((0, 0, 0.012 * math.sin(t * 13))) for t in [j / 16 for j in range(17)]]
                B.tube("rope", pts, 0.012, segs=6)
                for j in range(1, 5):
                    B.blob("white", (0.045, 0.045, 0.035), prev.lerp(cur, j / 5) + Vector((0, 0, 0.015)), segs=10, rings=6)
            prev = cur
