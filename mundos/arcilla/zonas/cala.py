"""Zona 2 · Cala del Alfar, la casa del barco B05.

Conserva la cala de mundos/escena.py (horno, chiringuito, paella, pista,
guirnaldas, embarcadero con botijos) y añade el amarre del barco, el torno con
la alfarera, la leña y el estante de cántaros. Se modela en ejes locales de
Blender alrededor del centro de la isla, como la versión anterior: el eje X
local apunta al ángulo 45° del mapa (abajo a la derecha en pantalla).
"""
import math

import bmesh
from mathutils import Matrix, Vector

import mapa as MAPA
import piezas as P


def build(B, Z, M):
    cx, cy = Z["islas"][0]["centro"]
    ox, oy, _ = MAPA.to_blender(cx, cy)

    def L(dx, dy):
        return ox + dx, oy + dy

    def g(dx, dy):
        return B.ground_b(ox + dx, oy + dy)

    with B.pieza("isla"):
        B.isla(Z["islas"][0], zc=-0.15)
    hx, hy = -1.45, 0.95
    with B.pieza("colina"):
        mx, my = MAPA.from_blender(*L(hx, hy))
        B.land(mx, my, 1.25, 1.05, 0.75, 0.05, g=45, p=2.2, q=2.2, role="grass", segs=48, rings=20)
    with B.pieza("palmeras"):
        tops = []
        for (dx, dy), lean, hgt in (((-0.35, 1.55), (0.2, 0.15), 1.75), ((2.05, 0.95), (0.28, -0.05), 1.55), ((-2.1, -0.55), (-0.18, -0.2), 1.6)):
            mx, my = MAPA.from_blender(*L(dx, dy))
            tops.append(P.palm(B, mx, my, lean=MAPA.from_blender(*lean), height=hgt))
        p1, p2, p3 = tops

    # Horno
    kx, ky = hx + 0.15, hy + 0.05
    kz = g(kx, ky) - 0.06
    toward = Vector((0.7071, -0.7071, 0))
    mouth = Vector((*L(kx, ky), kz + 0.2)) + toward * 0.56
    with B.pieza("horno"):
        B.lathe("terracotta", [(0, 0), (0.55, 0), (0.6, 0.14), (0.57, 0.34), (0.47, 0.55), (0.3, 0.72), (0.13, 0.81), (0, 0.83)], (*L(kx, ky), kz), 40)
        B.blob("kiln_mouth", (0.2, 0.05, 0.17), tuple(mouth), 2.2, 2.6, extra=P.rot("Z", 45))
        B.blob("fire", (0.13, 0.04, 0.09), tuple(mouth + toward * 0.02 - Vector((0, 0, 0.05))), extra=P.rot("Z", 45))
        B.lathe("terracotta", [(0, 0), (0.1, 0), (0.1, 0.28), (0.13, 0.3), (0.13, 0.34), (0, 0.34)], (*L(kx - 0.12, ky + 0.1), kz + 0.72), 16)
        B.luz(mouth + Vector((0.15, -0.15, 0.05)), (1.0, 0.45, 0.2), 40.0, ("dia", "atardecer", "noche"))
    with B.pieza("humo"):
        for i, (dx, dy, dz, r) in enumerate([(0.0, 0.0, 1.18, 0.1), (0.08, 0.05, 1.36, 0.13), (0.2, 0.12, 1.56, 0.16), (0.36, 0.2, 1.78, 0.19)]):
            B.blob("smoke", (r, r, r * 0.85), (*L(kx - 0.12 + dx, ky + 0.1 + dy), kz + dz), segs=16, rings=10)
    with B.pieza("botijos"):
        for dx, dy in ((0.62, 0.35), (0.72, 0.12), (0.5, 0.55)):
            bx, by = kx + dx, ky + dy
            P.botijo(B, (*L(bx, by), g(bx, by) - 0.02), 0.8)
    with B.pieza("lenya"):
        lx, ly = kx - 0.55, ky - 0.45
        lz = g(lx, ly)
        for i in range(3):
            for j in range(3 - i):
                y0 = -0.12 + 0.08 * j + 0.04 * i
                a = Vector((*L(lx - 0.18, ly + y0), lz + 0.04 + 0.07 * i))
                b = Vector((*L(lx + 0.18, ly + y0), lz + 0.04 + 0.07 * i))
                B.tube("wood", [a, b], 0.037, segs=8)
                B.blob("wood_dark", (0.005, 0.03, 0.03), b + Vector((0.004, 0, 0)), segs=8, rings=4)

    # Chiringuito
    cx_, cy_ = 1.0, 1.05
    cz = g(cx_, cy_) - 0.04
    with B.pieza("chiringuito"):
        B.blob("wall", (0.46, 0.4, 0.42), (*L(cx_, cy_), cz + 0.4), 5.0, 6.0)
        B.blob("door", (0.02, 0.12, 0.21), (*L(cx_ + 0.46, cy_ - 0.05), cz + 0.24), 4, 4)
        B.blob("window_lit", (0.14, 0.02, 0.1), (*L(cx_ - 0.05, cy_ - 0.405), cz + 0.46), 4, 4)
        B.lathe("thatch", [(0, 1.32), (0.22, 1.25), (0.48, 1.08), (0.68, 0.9), (0.72, 0.86), (0.66, 0.84), (0, 0.88)], (*L(cx_, cy_), cz), 40, 1.05, 0.95)
        B.luz(Vector((*L(cx_ + 0.5, cy_ - 0.5), cz + 0.55)), (1.0, 0.75, 0.45), 30.0)
        # taburetes
        for i, (dx, dy) in enumerate(((0.25, -0.62), (-0.2, -0.62), (0.62, -0.25))):
            p = Vector((*L(cx_ + dx, cy_ + dy), g(cx_ + dx, cy_ + dy)))
            B.tube("wood_dark", [p, p + Vector((0, 0, 0.16))], 0.015, 6)
            B.blob("wood", (0.06, 0.06, 0.02), p + Vector((0, 0, 0.17)), 2.0, 2.0, segs=12, rings=6)

    # Paella
    px, py = 1.45, -0.2
    pz = g(px, py) + 0.12
    with B.pieza("paella"):
        for i in range(3):
            a = math.radians(i * 120)
            B.tube("iron", [(*L(px + 0.22 * math.cos(a), py + 0.22 * math.sin(a)), pz - 0.14), (*L(px + 0.12 * math.cos(a), py + 0.12 * math.sin(a)), pz)], 0.015, 6)
        B.blob("fire", (0.1, 0.1, 0.05), (*L(px, py), pz - 0.09))
        B.lathe("pan", [(0, 0), (0.36, 0), (0.4, 0.05), (0.38, 0.06), (0.35, 0.025), (0, 0.025)], (*L(px, py), pz), 40)
        B.blob("rice", (0.34, 0.34, 0.02), (*L(px, py), pz + 0.03), segs=32, rings=8)
        for i in range(10):
            a = math.radians(i * 36 + 7)
            rr = 0.12 + 0.12 * ((i * 7) % 3) / 2
            role = "pepper" if i % 2 else "pea"
            B.blob(role, (0.035, 0.02, 0.012) if role == "pepper" else (0.018, 0.018, 0.018),
                   (*L(px + rr * math.cos(a), py + rr * math.sin(a)), pz + 0.05), extra=P.rot("Z", i * 40), segs=10, rings=6)
        B.luz(Vector((*L(px, py), pz + 0.05)), (1.0, 0.5, 0.25), 10.0, ("dia", "atardecer", "noche"))

    # Pista de azulejos
    fx, fy, n, s = -0.15, -0.55, 5, 0.23
    with B.pieza("pista"):
        for i in range(n):
            for j in range(n):
                x, y = fx + (i - 2) * s, fy + (j - 2) * s
                B.blob("tile_b" if (i + j) % 2 else "tile_a", (s * 0.46, s * 0.46, 0.035), (*L(x, y), g(x, y) + 0.005), 6.0, 6.0, segs=16, rings=8)
        B.luz(Vector((*L(fx, fy), g(fx, fy) + 1.1)), (1.0, 0.8, 0.55), 70.0)

    # Torno y alfarera
    tx, ty = MAPA.to_blender(*[lg["pos"] for lg in Z["lugares"] if lg["id"] == "torno"][0])[:2]
    tz = B.ground_b(tx, ty)
    with B.pieza("torno"):
        B.lathe("wood_dark", [(0, 0), (0.12, 0), (0.1, 0.05), (0.04, 0.08), (0.04, 0.2), (0, 0.2)], (tx, ty, tz), 18)
        B.lathe("wood", [(0, 0.2), (0.16, 0.2), (0.16, 0.23), (0, 0.23)], (tx, ty, tz), 24)
        B.lathe("terracotta", [(0, 0.23), (0.07, 0.23), (0.09, 0.28), (0.07, 0.33), (0.045, 0.37), (0, 0.36)], (tx, ty, tz), 18)
    with B.pieza("alfarera"):
        mx, my = MAPA.from_blender(tx, ty)
        P.person(B, mx - 0.28, my + 0.02, role="person_f", h=1.05, g=0, hair="hair", arms="down")
    with B.pieza("estante"):
        ex_, ey_ = MAPA.from_blender(*L(kx - 0.35, ky + 0.75))
        base = B.on(ex_, ey_, -0.02)
        m = P.T(*base) @ B.rz(90)
        for zz in (0.18, 0.4):
            B.blob("wood", (0.4, 0.1, 0.018), (0, 0, 0), 8.0, 3.0, extra=m @ P.T(0, 0, zz), segs=16, rings=4)
        for sx in (-0.37, 0.37):
            B.blob("wood_dark", (0.02, 0.09, 0.26), (0, 0, 0), 6.0, 6.0, extra=m @ P.T(sx, 0, 0.26), segs=10, rings=6)
        for i, zz in enumerate((0.2, 0.42)):
            for k in range(3):
                q = m @ Vector((-0.25 + 0.25 * k, 0, zz))
                P.botijo(B, q, 0.55 if (i + k) % 2 else 0.6)

    # Embarcadero
    x0, x1, y, zd = 2.6, 5.05, -0.55, 0.2
    with B.pieza("embarcadero"):
        bm = bmesh.new()
        B.G.superquadric(bm, ((x1 - x0) / 2, 0.28, 0.035), 8.0, 8.0, matrix=Matrix.Translation((ox + (x0 + x1) / 2, oy + y, zd)), segs=32, rings=8)
        B.mk(bm, "deck")
        for i, x in enumerate((x0 + 0.35, x0 + 1.05, x0 + 1.75, x1 - 0.05)):
            for dy in (-0.25, 0.25):
                B.tube("wood_dark", [(*L(x, y + dy), -0.3), (*L(x, y + dy), zd + 0.1)], 0.045, 10)
        for i, x in enumerate((x0 + 0.55, x0 + 0.85, x0 + 1.2)):
            yy = y + 0.12 * (1 if i % 2 else -1)
            P.botijo(B, (*L(x, yy), zd + 0.03))
        P.flag(B, (*L(x0 + 0.2, y - 0.2), zd), 1.1, 1.0, role="flag", g=0)
    with B.pieza("amarre"):
        # Amarre del barco: vacío mientras navegas. Dos postes con salvavidas y un cabo flojo.
        a = Vector((*L(4.0, 0.95), -0.3))
        b = Vector((*L(4.5, 0.95), -0.3))
        for q in (a, b):
            B.tube("wood_dark", [q, q + Vector((0, 0, 0.72))], 0.05, 10)
            B.blob("rope", (0.06, 0.06, 0.03), q + Vector((0, 0, 0.62)), segs=10, rings=6)
        B.tube("rope", [a + Vector((0, 0, 0.6)), a.lerp(b, 0.5) + Vector((0, 0, 0.35)), b + Vector((0, 0, 0.6))], 0.012, 6)
        ring = a + Vector((0, 0, 0.45)) + Vector((-0.07, -0.07, 0))
        m = P.T(*ring) @ P.rot("Z", -45) @ P.rot("X", 90)
        B.torus("red", 0.09, 0.03, m, nu=24, nv=8)
        P.ripple(B, *MAPA.from_blender(*L(4.25, 0.37)), 0.7, 1, t=0.02)

    with B.pieza("guirnaldas"):
        P.garland(B, p1 - Vector((0, 0, 0.15)), p2 - Vector((0, 0, 0.15)), 9, 0.45)
        P.garland(B, p3 - Vector((0, 0, 0.15)), p1 - Vector((0, 0, 0.2)), 9, 0.5)
