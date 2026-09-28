"""Piezas y personajes de arcilla reutilizables. MUESTRA.

Todas reciben el Builder (B) y trabajan en coordenadas del mapa (x, y) salvo
que el parámetro sea un punto de Blender (Vector). Ninguna pone colores: usan
papeles del tema (ver Arcilla.HEX en mundos/temas.py). Formas blandas del
estilo 05: superelipsoides, churros, tornos y toros.
"""
import math

from mathutils import Matrix, Vector

import mapa as MAPA

UP = Vector((0, 0, 1))


def T(x, y, z):
    return Matrix.Translation((x, y, z))


def rot(axis, deg):
    return Matrix.Rotation(math.radians(deg), 4, axis)


def basis(X, Y, Z):
    """Matriz 4×4 cuyas columnas son los ejes locales X, Y, Z."""
    return Matrix(((X.x, Y.x, Z.x, 0), (X.y, Y.y, Z.y, 0), (X.z, Y.z, Z.z, 0), (0, 0, 0, 1)))


def mdir(g):
    """Vector horizontal de Blender que apunta al ángulo g del mapa."""
    c, s = math.cos(math.radians(g)), math.sin(math.radians(g))
    return Vector(MAPA.to_blender(c, s)).normalized()


def mvec(dx, dy, dz=0.0):
    """Desplazamiento del mapa (dx, dy) como vector de Blender."""
    return Vector(MAPA.to_blender(dx, dy, dz))


# --- vegetación y decoración ---------------------------------------------------------
def palm(B, x, y, lean=(0.2, -0.1), height=1.7, leaves=7, z0=None):
    """Palmera; lean es la inclinación de la copa en el mapa. Devuelve la copa (Vector)."""
    base = B.on(x, y, -0.05) if z0 is None else B.at(x, y, z0)
    L = mvec(*lean)
    top = base + L + Vector((0, 0, height))
    pts, rs = [], []
    for i in range(9):
        t = i / 8
        bend = math.sin(t * math.pi / 2)
        pts.append(base + L * bend + Vector((0, 0, height * t)))
        rs.append(0.095 - 0.035 * t)
    B.tube("trunk", pts, rs, segs=10)
    for i in range(4):
        t = int((0.2 + 0.18 * i) * 8)
        B.torus("coconut", rs[t] + 0.004, 0.018, T(*pts[t]), nu=16, nv=6)
    spin = B.rng.uniform(0, 50)
    for i in range(leaves):
        m = T(*top) @ rot("Z", i * 360 / leaves + spin) @ rot("Y", 28 + 10 * (i % 2)) @ T(0.42, 0, 0)
        B.blob("leaf", (0.5, 0.13, 0.025), (0, 0, 0), extra=m, segs=16, rings=8)
    for i in range(3):
        a = math.radians(i * 120 + 30)
        B.blob("coconut", (0.07, 0.07, 0.07), (top.x + 0.08 * math.cos(a), top.y + 0.08 * math.sin(a), top.z - 0.07), segs=12, rings=8)
    return top


def pine(B, x, y, height=1.3, k=1.0):
    """Pino mediterráneo: tronco torcido y copa en parasol de dos o tres almohadas."""
    base = B.on(x, y, -0.05)
    lean = mvec(B.rng.uniform(-0.25, 0.25), B.rng.uniform(-0.25, 0.1))
    top = base + lean + Vector((0, 0, height * k))
    pts = [base.lerp(top, t) + Vector((0.05 * math.sin(t * 5), 0, 0)) for t in (0, 0.3, 0.6, 0.85, 1.0)]
    B.tube("trunk", pts, [0.07 * k, 0.06 * k, 0.05 * k, 0.045 * k, 0.04 * k], segs=8)
    for i, (dx, dy, dz, s) in enumerate(((0, 0, 0.1, 0.55), (0.25, 0.1, 0.0, 0.38), (-0.22, -0.12, 0.02, 0.4))):
        c = top + Vector((dx * k, dy * k, dz * k))
        B.blob("pine", (s * k, s * 0.85 * k, 0.16 * k), c, 2.2, 2.6, extra=rot("Z", i * 40), segs=20, rings=10)
    return top


def bush(B, x, y, s=0.25, role="leaf"):
    c = B.on(x, y, s * 0.4)
    B.blob(role, (s, s * 0.9, s * 0.7), c, 2.0, 2.0, extra=rot("Z", B.rng.uniform(0, 90)), segs=16, rings=10)


def rock(B, x, y, s=0.25, z=None, role="rock"):
    c = B.on(x, y, 0) if z is None else B.at(x, y, z)
    B.blob(role, (s, s * 0.82, s * 0.7), c, 2.3, 2.3, extra=rot("Z", B.rng.uniform(0, 180)), segs=16, rings=10)


def garland(B, a, b, n=9, sag=0.4, horas=("atardecer", "noche"), energy=4.0, bulb="bulb"):
    """Tira de bombillas entre dos puntos de Blender."""
    a, b = Vector(a), Vector(b)
    pts = [a.lerp(b, i / 16) - Vector((0, 0, sag * math.sin(math.pi * i / 16))) for i in range(17)]
    B.tube("wire", pts, 0.008, segs=6)
    out = []
    for i in range(1, n + 1):
        t = i / (n + 1)
        c = a.lerp(b, t) - Vector((0, 0, sag * math.sin(math.pi * t) + 0.05))
        B.blob(bulb, (0.045, 0.045, 0.06), tuple(c), segs=10, rings=6)
        out.append(c)
    mid = a.lerp(b, 0.5) - Vector((0, 0, sag + 0.15))
    B.luz(mid, (1.0, 0.72, 0.4), energy * n, horas)
    return out


def botijo(B, pos, k=1.0, role="terracotta"):
    x, y, z = pos
    prof = [(0, 0), (0.06, 0), (0.1, 0.03), (0.12, 0.08), (0.11, 0.13), (0.07, 0.17), (0.04, 0.2), (0.045, 0.23), (0, 0.23)]
    B.lathe(role, [(r * k, zz * k) for r, zz in prof], (x, y, z), segs=16)
    B.tube(role, [(x + 0.08 * k, y, z + 0.11 * k), (x + 0.15 * k, y, z + 0.19 * k)], 0.014 * k, segs=6)


def crate(B, pos, s=0.12, g=0.0, role="wood", band="wood_dark"):
    m = T(*pos) @ B.rz(g)
    B.blob(role, (s, s, s), (0, 0, 0), 6.0, 6.0, extra=m, segs=20, rings=10)
    B.blob(band, (s + 0.006, s + 0.006, 0.014), (0, 0, 0), 6.0, 2.0, extra=m, segs=20, rings=6)


def barrel(B, pos, a=0.08, c=0.1, role="barrel", hoop="iron", lying=False, g=0.0):
    m = T(*pos) @ B.rz(g) @ (rot("Y", 90) if lying else Matrix.Identity(4))
    B.blob(role, (a, a, c), (0, 0, 0), 2.0, 4.0, extra=m, segs=18, rings=10)
    for dz in (0.55 * c, -0.55 * c):
        rr = a * (1 - (abs(dz) / c) ** 4) ** 0.25
        B.torus(hoop, rr, 0.011, m @ T(0, 0, dz), nu=18, nv=6)


def bollard(B, x, y):
    p = B.on(x, y)
    B.lathe("iron", [(0, 0), (0.07, 0), (0.06, 0.12), (0.085, 0.16), (0.07, 0.19), (0, 0.19)], tuple(p), segs=14)


def lamp(B, x, y, h=0.9, horas=("atardecer", "noche"), energy=25.0):
    p = B.on(x, y, -0.02)
    B.tube("iron", [p, p + Vector((0, 0, h))], 0.025, segs=8)
    B.lathe("iron", [(0, 0), (0.05, 0), (0.04, 0.03), (0, 0.03)], tuple(p), segs=10)
    top = p + Vector((0, 0, h))
    B.blob("bulb", (0.07, 0.07, 0.08), top + Vector((0, 0, 0.06)), segs=12, rings=8)
    B.lathe("iron", [(0, 0.16), (0.1, 0.12), (0.09, 0.1), (0, 0.13)], tuple(top), segs=12)
    B.luz(top + Vector((0, 0, 0.02)), (1.0, 0.78, 0.5), energy, horas)
    return top


def flag(B, pos, h=1.1, s=1.0, role="flag", g=0.0, pole="wood_dark"):
    """Mástil y bandera ondulada; la bandera ondea hacia el ángulo g del mapa."""
    x, y, z = pos
    B.tube(pole, [(x, y, z - 0.1), (x, y, z + h)], 0.022, segs=8)
    d = mdir(g)
    rows, cols = 3, 8
    import bmesh
    bm = bmesh.new()
    grid = []
    for i in range(rows + 1):
        row = []
        for j in range(cols + 1):
            u = j / cols
            off = d * (0.4 * s * u) + mdir(g + 90) * (0.04 * s * math.sin(2 * math.pi * 0.9 * u) * u)
            row.append(bm.verts.new(Vector((x, y, z + h - 0.03 - 0.24 * s * (1 - i / rows) - 0.03 * u)) + off))
        grid.append(row)
    for i in range(rows):
        for j in range(cols):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    ob = B.mk(bm, role)
    mod = ob.modifiers.new("solid", "SOLIDIFY")
    mod.thickness = 0.025
    mod.offset = 0.0
    return Vector((x, y, z + h))


def eyes(B, center, g, r, sep=0.35, up=0.15, size=0.28, closed=False, look=(0.0, 0.0)):
    """Dos ojos de arcilla en la superficie de una forma de radio r centrada en center, mirando a g."""
    D = mdir(g)
    Rt = D.cross(UP).normalized()
    for side in (-1, 1):
        n = (D + Rt * side * sep + UP * up).normalized()
        p = Vector(center) + n * r * 0.93
        m = T(*p) @ n.to_track_quat("Z", "Y").to_matrix().to_4x4()
        e = r * size
        if closed:
            B.blob("ink", (e * 0.9, e * 0.22, e * 0.25), (0, 0, 0), extra=m @ T(0, -e * 0.2, e * 0.1), segs=12, rings=6)
        else:
            B.blob("white", (e, e * 1.1, e * 0.45), (0, 0, 0), extra=m, segs=14, rings=8)
            B.blob("ink", (e * 0.5, e * 0.55, e * 0.3), (0, 0, 0), extra=m @ T(look[0] * e, look[1] * e - e * 0.1, e * 0.3), segs=12, rings=6)


def smile(B, center, g, r, w=0.35, down=0.2, role="ink"):
    D = mdir(g)
    Rt = D.cross(UP).normalized()
    pts = []
    for k in range(7):
        t = -1 + 2 * k / 6
        n = (D + Rt * t * w - UP * (down - 0.08 * (1 - t * t))).normalized()
        pts.append(Vector(center) + n * r * 1.0)
    B.tube(role, pts, r * 0.035, segs=6)


def person(B, x, y, role="person_a", h=1.0, g=90.0, hair="hair", hat=None, arms="down", z=None):
    """Muñeco de plastilina: cuerpo, cabeza con ojos, pelo o gorro, brazos."""
    base = B.on(x, y, -0.01) if z is None else B.at(x, y, z)
    body = base + Vector((0, 0, 0.15 * h))
    B.blob(role, (0.075 * h, 0.075 * h, 0.15 * h), body, 2.0, 2.4, segs=16, rings=10)
    head = base + Vector((0, 0, 0.36 * h))
    B.blob("skin", (0.065 * h, 0.065 * h, 0.065 * h), head, segs=16, rings=10)
    D = mdir(g)
    if hat:
        B.lathe(hat, [(0, 0), (0.08 * h, 0), (0.08 * h, 0.012 * h), (0.045 * h, 0.02 * h), (0.04 * h, 0.06 * h), (0, 0.065 * h)],
                tuple(head + Vector((0, 0, 0.035 * h))), segs=14)
    elif hair:
        B.blob(hair, (0.07 * h, 0.07 * h, 0.05 * h), head + Vector((0, 0, 0.02 * h)) - D * 0.012 * h, 2.0, 2.0, segs=14, rings=8)
    eyes(B, head, g, 0.065 * h, sep=0.38, up=0.05, size=0.22)
    Rt = D.cross(UP).normalized()
    for side in (-1, 1):
        sh = base + Vector((0, 0, 0.25 * h)) + Rt * side * 0.07 * h
        if arms == "up":
            hand = sh + Rt * side * 0.06 * h + Vector((0, 0, 0.13 * h))
        elif arms == "wave" and side == 1:
            hand = sh + Rt * 0.08 * h + Vector((0, 0, 0.12 * h)) + D * 0.02
        else:
            hand = sh + Rt * side * 0.035 * h - Vector((0, 0, 0.12 * h)) + D * 0.02 * h
        B.tube(role, [sh, sh.lerp(hand, 0.5) + Rt * side * 0.01, hand], 0.018 * h, segs=6)
        B.blob("skin", (0.022 * h, 0.022 * h, 0.022 * h), hand, segs=8, rings=6)
    return head


# --- mar ------------------------------------------------------------------------------
def ripple(B, x, y, r=0.5, k=1, t=0.022, role="foam"):
    for i in range(k):
        rr = r * (1 + 0.45 * i)
        B.torus(role, 1.0, t / rr, T(*B.at(x, y, 0.03)) @ Matrix.Diagonal((rr, rr, rr * 0.5, 1)), nu=40, nv=6)


def bubbles(B, x, y, n=6, spread=0.25, role="foam"):
    for i in range(n):
        a = B.rng.uniform(0, 2 * math.pi)
        d = B.rng.uniform(0, spread)
        s = B.rng.uniform(0.025, 0.06)
        B.blob(role, (s, s, s * 0.8), B.at(x + d * math.cos(a), y + d * math.sin(a), s * 0.5), segs=10, rings=6)


def boia(B, x, y, k=1.0, body="red", band="white", top=None, g=90.0, face=True, closed=False, light=True, z=0.0,
         horas=("atardecer", "noche")):
    """Boia de señal con cara. Devuelve la punta (Vector)."""
    p = B.at(x, y, z)
    top = top or body
    B.lathe(body, [(0, -0.12 * k), (0.26 * k, -0.12 * k), (0.3 * k, 0.02 * k), (0.26 * k, 0.1 * k), (0, 0.1 * k)], tuple(p), segs=28)
    B.lathe(band, [(0, 0.1 * k), (0.2 * k, 0.1 * k), (0.14 * k, 0.34 * k), (0, 0.34 * k)], tuple(p), segs=24)
    B.lathe(top, [(0, 0.34 * k), (0.14 * k, 0.34 * k), (0.1 * k, 0.48 * k), (0, 0.5 * k)], tuple(p), segs=24)
    tip = p + Vector((0, 0, 0.56 * k))
    if light:
        B.blob("bulb", (0.06 * k, 0.06 * k, 0.07 * k), tip, segs=12, rings=8)
        B.luz(tip + Vector((0, 0, 0.1 * k)), (1.0, 0.8, 0.5), 12.0 * k * k, horas)
    if face:
        c = p + Vector((0, 0, 0.21 * k))
        eyes(B, c, g, 0.18 * k, sep=0.42, up=0.1, size=0.3, closed=closed)
        if not closed:
            smile(B, c, g, 0.19 * k, w=0.3, down=0.3)
    return tip


def bubble_sign(B, pos, k=1.0, g=90.0):
    """Bocadillo de arcilla con tres puntos, flotando sobre un personaje."""
    p = Vector(pos)
    D = mdir(g)
    Rt = D.cross(UP).normalized()
    m = T(*p) @ basis(Rt, D, UP)
    B.blob("white", (0.32 * k, 0.07 * k, 0.2 * k), (0, 0, 0), 4.0, 3.0, extra=m, segs=24, rings=10)
    tail = [p + Vector((0, 0, -0.18 * k)) - Rt * 0.1 * k, p + Vector((0, 0, -0.3 * k)) - Rt * 0.18 * k]
    B.tube("white", tail, [0.05 * k, 0.012 * k], segs=8)
    for i in (-1, 0, 1):
        B.blob("ink", (0.035 * k, 0.03 * k, 0.035 * k), p + Rt * 0.13 * k * i + D * 0.07 * k, segs=10, rings=6)


def gull(B, pos, g=0.0, flying=False, k=1.0):
    p = Vector(pos)
    D = mdir(g)
    Rt = D.cross(UP).normalized()
    m = T(*p) @ basis(D, Rt, UP)
    B.blob("seagull", (0.09 * k, 0.045 * k, 0.045 * k), (0, 0, 0), extra=m, segs=14, rings=8)
    B.blob("seagull", (0.035 * k, 0.035 * k, 0.035 * k), (0, 0, 0), extra=m @ T(0.08 * k, 0, 0.04 * k), segs=10, rings=6)
    B.blob("beak", (0.025 * k, 0.01 * k, 0.008 * k), (0, 0, 0), extra=m @ T(0.12 * k, 0, 0.035 * k), segs=8, rings=4)
    for side in (-1, 1):
        if flying:
            w = m @ T(-0.01, side * 0.1 * k, 0.03 * k) @ rot("X", side * 18)
            B.blob("gull_wing", (0.05 * k, 0.12 * k, 0.008 * k), (0, 0, 0), extra=w, segs=12, rings=4)
        else:
            w = m @ T(-0.02 * k, side * 0.04 * k, 0.015 * k)
            B.blob("gull_wing", (0.07 * k, 0.018 * k, 0.03 * k), (0, 0, 0), extra=w, segs=10, rings=4)


def chest(B, x, y, g=90.0, k=1.0, z=0.02, horas=("atardecer", "noche")):
    """Cofre flotante con aros dorados y monedas asomando."""
    p = B.at(x, y, z)
    m = T(*p) @ B.rz(g)
    B.blob("chest", (0.2 * k, 0.13 * k, 0.1 * k), (0, 0, 0), 6.0, 6.0, extra=m @ T(0, 0, 0.06 * k), segs=20, rings=10)
    B.blob("chest", (0.2 * k, 0.13 * k, 0.08 * k), (0, 0, 0), 6.0, 2.0, extra=m @ T(0, 0, 0.15 * k), segs=20, rings=10)
    for dx in (-0.12, 0.12):
        B.blob("gold", (0.02 * k, 0.14 * k, 0.1 * k), (0, 0, 0), 6.0, 3.0, extra=m @ T(dx * k, 0, 0.12 * k), segs=12, rings=8)
    B.blob("gold", (0.035 * k, 0.02 * k, 0.04 * k), (0, 0, 0), extra=m @ T(0, 0.135 * k, 0.12 * k), segs=10, rings=6)
    for i in range(4):
        c = m @ Vector(((-0.1 + 0.07 * i) * k, (0.02 * (i % 2)) * k, 0.23 * k))
        B.lathe("coin", [(0, 0), (0.035 * k, 0), (0.035 * k, 0.012 * k), (0, 0.012 * k)], tuple(c), segs=14, extra=rot("X", 20 * (i - 1.5)))
    ripple(B, x, y, 0.3 * k, 1)
    B.luz(p + Vector((0, 0, 0.45 * k)), (1.0, 0.8, 0.35), 6.0 * k, horas)


def bottle(B, x, y, g=0.0, k=1.0):
    """Botella de mensaje, tumbada, con corcho y papel enrollado."""
    p = B.at(x, y, 0.035 * k)
    m = T(*p) @ B.rz(g) @ rot("Y", 90) @ rot("X", 8)
    prof = [(0, -0.16), (0.07, -0.16), (0.08, -0.13), (0.08, 0.03), (0.05, 0.08), (0.03, 0.1), (0.03, 0.15), (0, 0.15)]
    B.lathe("bottle", [(r * k, zz * k) for r, zz in prof], (0, 0, 0), segs=16, extra=m)
    B.lathe("cork", [(0, 0.14 * k), (0.028 * k, 0.14 * k), (0.03 * k, 0.19 * k), (0, 0.19 * k)], (0, 0, 0), segs=10, extra=m)
    B.blob("paper", (0.045 * k, 0.045 * k, 0.09 * k), (0, 0, 0), 2.0, 5.0, extra=m @ T(0, 0, -0.04 * k), segs=12, rings=8)
    ripple(B, x, y, 0.24 * k, 1)


def debris(B, x, y, k=1.0):
    """Grupo de restos flotantes: tablones, un barril y una caja."""
    r = B.rng
    for i in range(3):
        g = r.uniform(0, 180)
        dx, dy = r.uniform(-0.3, 0.3), r.uniform(-0.2, 0.2)
        B.blob("wood", (0.22 * k, 0.05 * k, 0.025 * k), (0, 0, 0), 5.0, 3.0,
               extra=T(*B.at(x + dx, y + dy, 0.02)) @ B.rz(g), segs=16, rings=6)
    barrel(B, B.at(x + 0.28 * k, y - 0.1, 0.05), 0.07 * k, 0.09 * k, lying=True, g=r.uniform(0, 180))
    crate(B, B.at(x - 0.25 * k, y + 0.12, 0.06), 0.08 * k, g=r.uniform(0, 90))
    ripple(B, x, y, 0.45 * k, 1)


def sign(B, x, y, body, g=90.0, w=0.8, h=0.36, post_h=0.55, board="wood", ink="white", size=0.2, z=None):
    """Cartel de madera con letras de arcilla, mirando al ángulo g."""
    base = B.on(x, y, -0.02) if z is None else B.at(x, y, z)
    D = mdir(g)
    Rt = D.cross(UP).normalized()
    for side in (-1, 1):
        q = base + Rt * side * (w * 0.4)
        B.tube("wood_dark", [q, q + Vector((0, 0, post_h + h))], 0.025, segs=8)
    c = base + Vector((0, 0, post_h + h * 0.5))
    m = T(*c) @ basis(Rt, D, UP)
    B.blob(board, (w * 0.5, 0.03, h * 0.5), (0, 0, 0), 6.0, 6.0, extra=m, segs=20, rings=10)
    B.text(ink, body, c + D * 0.035, g=g, size=size, depth=0.012, bevel=0.006)
    return c


def lantern_paper(B, pos, role="lantern", k=1.0, horas=("atardecer", "noche")):
    p = Vector(pos)
    B.blob(role, (0.07 * k, 0.07 * k, 0.09 * k), p, 2.0, 2.4, segs=14, rings=8)
    B.lathe("wood_dark", [(0, 0.08 * k), (0.03 * k, 0.08 * k), (0.03 * k, 0.1 * k), (0, 0.1 * k)], tuple(p), segs=10)
    B.luz(p, (1.0, 0.6, 0.3), 3.0 * k, horas)


def arch(B, a, b, h=1.1, role="lane_a", role2="lane_b", checker=False, horas=("atardecer", "noche")):
    """Arco hinchable de carrera sobre el agua entre dos puntos del mapa."""
    pa, pb = B.at(*a), B.at(*b)
    n = 18
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append(pa.lerp(pb, t) + Vector((0, 0, h * math.sin(math.pi * t) ** 0.8)))
    r = 0.09
    for i in range(n):
        role_i = role if (i // 2) % 2 == 0 else role2
        B.tube(role_i, [pts[i], pts[i + 1]], r, segs=10)
    for q in (pa, pb):
        B.lathe(role2, [(0, -0.05), (0.16, -0.05), (0.17, 0.06), (0, 0.08)], tuple(q), segs=18)
    if checker:
        mid = pa.lerp(pb, 0.5) + Vector((0, 0, h - 0.05))
        d = (pb - pa).normalized()
        for i in range(-3, 4):
            role_c = "checker_a" if i % 2 else "checker_b"
            B.blob(role_c, (0.07, 0.03, 0.08), mid + d * 0.14 * i - Vector((0, 0, 0.16)), 6.0, 6.0,
                   extra=basis(d, d.cross(UP), UP), segs=8, rings=6)
    for q in pts[3::4]:
        B.luz(q + Vector((0, 0, 0.15)), (1.0, 0.72, 0.45), 8.0, horas)
    return pts[n // 2]


def lane_buoy(B, x, y, role="lane_a", k=1.0, light=True, horas=("noche",)):
    p = B.at(x, y, 0)
    B.blob(role, (0.1 * k, 0.1 * k, 0.1 * k), p + Vector((0, 0, 0.05 * k)), 2.0, 2.0, segs=14, rings=8)
    B.torus("lane_b" if role != "lane_b" else "lane_a", 0.095 * k, 0.018 * k, T(*(p + Vector((0, 0, 0.07 * k)))), nu=16, nv=6)
    if light:
        B.blob("bulb", (0.025, 0.025, 0.03), p + Vector((0, 0, 0.17 * k)), segs=8, rings=6)


def croc(B, x, y, g=0.0, k=1.0, sub=0.0, horas=("noche",)):
    """Cocodrilo de plastilina medio sumergido, cabeza hacia g."""
    p = B.at(x, y, -0.04 - sub)
    D = mdir(g)
    Rt = D.cross(UP).normalized()
    m = T(*p) @ basis(D, Rt, UP)
    B.blob("croc", (0.42 * k, 0.16 * k, 0.12 * k), (0, 0, 0), 2.4, 2.2, extra=m, segs=24, rings=12)
    B.blob("croc", (0.26 * k, 0.1 * k, 0.07 * k), (0, 0, 0), 2.6, 2.2, extra=m @ T(0.5 * k, 0, 0.02 * k), segs=20, rings=10)
    B.blob("croc_belly", (0.22 * k, 0.085 * k, 0.03 * k), (0, 0, 0), 2.6, 2.2, extra=m @ T(0.52 * k, 0, -0.03 * k), segs=16, rings=6)
    for i in range(5):
        B.blob("white", (0.018 * k, 0.012 * k, 0.022 * k), (0, 0, 0), extra=m @ T((0.38 + 0.07 * i) * k, 0.085 * k, 0.0), segs=8, rings=4)
        B.blob("white", (0.018 * k, 0.012 * k, 0.022 * k), (0, 0, 0), extra=m @ T((0.38 + 0.07 * i) * k, -0.085 * k, 0.0), segs=8, rings=4)
    for side in (-1, 1):
        e = m @ T(0.3 * k, side * 0.075 * k, 0.1 * k)
        B.blob("croc", (0.055 * k, 0.05 * k, 0.05 * k), (0, 0, 0), extra=e, segs=12, rings=8)
        B.blob("white", (0.04 * k, 0.038 * k, 0.035 * k), (0, 0, 0), extra=e @ T(0.012 * k, 0, 0.022 * k), segs=12, rings=8)
        B.blob("croc_eye", (0.017 * k, 0.017 * k, 0.02 * k), (0, 0, 0), extra=e @ T(0.035 * k, 0, 0.03 * k), segs=8, rings=6)
        B.blob("croc", (0.012 * k, 0.012 * k, 0.012 * k), (0, 0, 0), extra=m @ T(0.72 * k, side * 0.03 * k, 0.075 * k), segs=6, rings=4)
    for i in range(6):
        B.blob("croc_dark", (0.04 * k, 0.03 * k, 0.04 * k), (0, 0, 0), extra=m @ T((0.2 - 0.1 * i) * k, 0, 0.11 * k), segs=8, rings=6)
    tail = [m @ Vector(((-0.38 - 0.12 * i) * k, 0.06 * k * math.sin(i * 0.9), 0.02 * k)) for i in range(6)]
    B.tube("croc", tail, [0.1 * k, 0.085 * k, 0.07 * k, 0.05 * k, 0.03 * k, 0.012 * k], segs=10)
    ripple(B, x, y, 0.55 * k, 1)


def dolphin(B, x, y, g=0.0, k=1.0, jump=0.35):
    """Delfín saltando en arco, cabeza hacia g."""
    D = mdir(g)
    Rt = D.cross(UP).normalized()
    base = B.at(x, y, 0.0)
    pts, rs = [], []
    n = 12
    for i in range(n + 1):
        t = i / n
        u = (t - 0.5) * 1.0 * k
        z = jump * k * (1 - (2 * t - 1) ** 2) - 0.08 * k
        pts.append(base + D * u + Vector((0, 0, z)))
        rs.append(0.11 * k * math.sin(math.pi * min(0.97, max(0.06, t))) ** 0.7)
    B.tube("dolphin", pts, rs, segs=14)
    head = pts[-2]
    B.blob("dolphin", (0.09 * k, 0.04 * k, 0.035 * k), (0, 0, 0), extra=T(*(pts[-1] + D * 0.05 * k - Vector((0, 0, 0.03 * k)))) @
           basis(D, Rt, UP) @ rot("Y", 35), segs=12, rings=8)
    belly = [q - Vector((0, 0, r * 0.45)) for q, r in zip(pts[3:10], rs[3:10])]
    B.tube("dolphin_belly", belly, [r * 0.62 for r in rs[3:10]], segs=10)
    mid = pts[n // 2]
    fm = T(*(mid + Vector((0, 0, rs[n // 2] * 0.8)))) @ basis(D, Rt, UP) @ rot("Y", -20)
    B.blob("dolphin", (0.08 * k, 0.015 * k, 0.1 * k), (0, 0, 0), extra=fm @ T(-0.03 * k, 0, 0.05 * k), segs=12, rings=6)
    tail = pts[0]
    for side in (-1, 1):
        B.blob("dolphin", (0.05 * k, 0.1 * k, 0.015 * k), (0, 0, 0),
               extra=T(*(tail - D * 0.04 * k + Rt * side * 0.06 * k)) @ basis(D, Rt, UP) @ rot("Z", side * 25),
               segs=12, rings=4)
    eyes(B, head, g + 0.0, 0.1 * k, sep=0.9, up=0.25, size=0.22)
    ripple(B, x - 0.45 * math.cos(math.radians(g)) * k, y - 0.45 * math.sin(math.radians(g)) * k, 0.18 * k, 1)
    ripple(B, x + 0.5 * math.cos(math.radians(g)) * k, y + 0.5 * math.sin(math.radians(g)) * k, 0.18 * k, 1)


def jelly(B, x, y, k=1.0, horas=("noche",)):
    p = B.at(x, y, 0.02)
    B.lathe("jelly", [(0, 0.16 * k), (0.08 * k, 0.15 * k), (0.15 * k, 0.1 * k), (0.18 * k, 0.02 * k), (0.15 * k, 0.0), (0, 0.02 * k)], tuple(p), segs=20)
    for i in range(6):
        a = math.radians(i * 60 + 15)
        q = p + Vector((0.11 * k * math.cos(a), 0.11 * k * math.sin(a), 0.0))
        B.tube("jelly", [q, q + Vector((0.02 * k, 0.01 * k, -0.06 * k)), q + Vector((0.0, 0.03 * k, -0.12 * k))], [0.018 * k, 0.014 * k, 0.008 * k], segs=6)
    eyes(B, p + Vector((0, 0, 0.08 * k)), 90.0, 0.15 * k, sep=0.4, up=0.05, size=0.2)
    B.luz(p + Vector((0, 0, 0.25 * k)), (1.0, 0.45, 0.75), 5.0 * k, horas)
