"""Zona 1 · Puerto de salida (El Varadero). Spawn, primera boia y boia de WhatsApp."""
import math

from mathutils import Vector

import piezas as P


def lugar(Z, lid):
    return next(lg["pos"] for lg in Z["lugares"] if lg["id"] == lid)


def casita(B, x, y, w=0.55, d=0.45, h=0.5, g=90.0, roof="roof_tile", lit=True):
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


def build(B, Z, M):
    islas = {i["id"]: i for i in Z["islas"]}
    with B.pieza("paseo"):
        B.isla(islas["paseo"], zc=-0.2, q=6.0)
        # paseo de losas junto al agua, a los dos lados del puerto
        for x0, x1 in ((-15.2, -5.3), (5.3, 15.2)):
            B.blob("stone", ((x1 - x0) / 2, 0.42, 0.06), B.at((x0 + x1) / 2, 28.45, B.gz((x0 + x1) / 2, 28.45) + 0.01),
                   8.0, 4.0, extra=B.rz(0), segs=48, rings=8)
    with B.pieza("escolleras"):
        B.isla(islas["escollera_oeste"])
        B.isla(islas["escollera_este"])

    with B.pieza("muelle"):
        # Muelle de tablones delante del paseo y un dedo hacia la dársena: losas con veta de tablón.
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

    with B.pieza("caseta"):
        cx, cy = lugar(Z, "caseta")
        top = casita(B, cx, cy, 0.62, 0.5, 0.62)
        P.flag(B, B.on(cx + 0.5, cy + 0.05, 0.62), 0.7, 0.9, role="flag", g=0)
        B.tube("wood_dark", [B.on(cx - 0.45, cy - 0.1, 0.65), B.on(cx - 0.45, cy - 0.1, 0.95)], 0.02)
        P.lantern_paper(B, B.on(cx + 0.66, cy + 0.52, 0.5), role="lantern", k=0.9)

    with B.pieza("casitas"):
        for x, y, w in ((-11.0, 29.9, 0.6), (-8.9, 30.2, 0.5), (-6.7, 29.8, 0.55), (7.2, 29.9, 0.6), (9.6, 30.1, 0.5), (11.8, 29.8, 0.55)):
            casita(B, x, y, w, 0.45, 0.5 + 0.1 * (int(x) % 2), lit=abs(x) < 10)

    with B.pieza("farolas"):
        for x in (-5.6, 5.6, -9.9, 10.4):
            P.lamp(B, x, 28.25, 0.95)

    with B.pieza("norays"):
        for x in (-4.2, -3.1, 3.1, 4.2):
            P.bollard(B, x, 27.55)
        for y in (26.0, 26.8):
            P.bollard(B, -2.15, y)

    with B.pieza("redes"):
        P.crate(B, B.on(3.7, 28.9, 0.1), 0.11, g=10)
        P.crate(B, B.on(3.95, 29.2, 0.1), 0.1, g=-15)
        P.crate(B, B.on(3.8, 29.0, 0.31), 0.09, g=30)
        P.barrel(B, B.on(4.5, 28.7, 0.1), 0.08, 0.1)
        B.blob("net", (0.34, 0.26, 0.09), B.on(2.9, 28.9, 0.05), 2.4, 2.0, extra=B.rz(20), segs=20, rings=8)
        for i in range(5):
            a = i * 72
            q = B.on(2.9 + 0.22 * math.cos(math.radians(a)), 28.9 + 0.16 * math.sin(math.radians(a)), 0.1)
            B.blob("rope", (0.035, 0.035, 0.03), q, segs=8, rings=6)

    with B.pieza("balizas"):
        for (x, y), role, glow in (((-2.6, 22.4), "croc", "green_light"), ((2.6, 22.4), "red", "red_light")):
            p = B.at(x, y, 0.35)
            B.lathe("white", [(0, 0), (0.2, 0), (0.17, 0.1), (0.15, 0.3), (0, 0.3)], tuple(p), segs=18)
            B.lathe(role, [(0, 0.3), (0.15, 0.3), (0.13, 0.62), (0, 0.62)], tuple(p), segs=18)
            B.blob(glow, (0.08, 0.08, 0.09), p + Vector((0, 0, 0.7)), segs=12, rings=8)
            B.lathe(role, [(0, 0.8), (0.1, 0.78), (0.08, 0.76), (0, 0.78)], tuple(p), segs=12)
            col = (1.0, 0.25, 0.2) if role == "red" else (0.3, 1.0, 0.45)
            B.luz(p + Vector((0, 0, 0.75)), col, 10.0, ("atardecer", "noche"))

    with B.pieza("anillo"):
        sx, sy = lugar(Z, "salida")
        m = P.T(*B.at(sx, sy, 0.03))
        B.torus("spawn_glow", 0.95, 0.045, m, nu=64, nv=8)
        for i in range(8):
            a = math.radians(i * 45 + 22.5)
            q = B.at(sx + 0.95 * math.cos(a), sy + 0.95 * math.sin(a), 0.05)
            B.blob("lane_a" if i % 2 else "white", (0.07, 0.07, 0.06), q, segs=10, rings=6)

    with B.pieza("boia"):
        bx, by = lugar(Z, "boia")
        tip = P.boia(B, bx, by, k=1.9, body="red", band="white", g=90.0)
        P.ripple(B, bx, by, 0.75, 2, t=0.03)
    with B.pieza("bocadillo"):
        P.bubble_sign(B, tip + P.mvec(0.55, 0.0) + Vector((0, 0, 0.45)), k=1.25, g=90.0)

    with B.pieza("whatsapp"):
        wx, wy = lugar(Z, "whatsapp")
        wt = P.boia(B, wx, wy, k=1.0, body="pea", band="white", top="pea", g=90.0)
        P.ripple(B, wx, wy, 0.42, 1)
        # icono: bocadillo redondo con auricular, de arcilla
        c = wt + Vector((0, 0, 0.35))
        D = P.mdir(90)
        Rt = D.cross(P.UP).normalized()
        B.blob("white", (0.16, 0.04, 0.16), c, 2.0, 2.0, extra=P.basis(Rt, D, P.UP), segs=20, rings=10)
        B.tube("white", [c - Rt * 0.1 - Vector((0, 0, 0.12)), c - Rt * 0.17 - Vector((0, 0, 0.2))], [0.04, 0.01], segs=6)
        B.blob("pea", (0.07, 0.03, 0.035), c + D * 0.04, 2.0, 2.0, extra=P.basis(Rt, D, P.UP) @ P.rot("Y", 40), segs=12, rings=6)

    with B.pieza("gaviotas"):
        P.gull(B, B.at(-5.0, 27.7, 0.62), g=40)
        P.gull(B, B.at(4.6, 26.2, 0.6), g=150)
        P.gull(B, B.at(-2.0, 23.6, 1.9), g=-30, flying=True, k=1.2)
        P.gull(B, B.at(1.4, 24.0, 2.2), g=200, flying=True)

    with B.pieza("guardamuelle"):
        P.person(B, -1.85, 25.7, role="blue_door", h=1.1, g=60, hat="hat", arms="wave", z=0.23)
