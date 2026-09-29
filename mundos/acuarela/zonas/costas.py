"""Las costas del mundo de acuarela, periódicas para las losas (lugares costa_oeste, costa_este, costa_sur). MUESTRA.

Oeste, Serra Gelada: acantilados de caliza clara de pared casi vertical, con
estratos ocres y grises, pinos carrascos y pitas arriba y escollos al pie.
Este, Platja de Sant Joan: playa larga de arena fina con datileras, sombrillas
de rayas, torres de socorrista y las hogueras de Sant Joan preparadas.
Sur, El Postiguet: el paseo de la Explanada que sigue a los dos lados del
puerto, con el mosaico de olas, datileras, farolas, bancos y casas de azotea.

Mismas masas de tierra que las costas de arcilla (tools/blender/mundo_arcilla.py:
dos tramos por periodo, los mismos anchos), así la orilla y la colisión quedan
donde marca mapa.json; lo que cambia es la forma de la pared y lo que hay encima.
Cada función recibe el periodo (L) y la fase (y0 o x0) de la losa; los objetos
se repiten igual en cada periodo (semillas por pieza, no por periodo).
"""
import math
import random

from mathutils import Vector

import piezas as P

UP = Vector((0, 0, 1))
TRAMOS_O = ({"dx": 0.1, "a": 2.8, "b": 4.5, "alto": 1.55}, {"dx": -0.1, "a": 3.0, "b": 4.6, "alto": 1.8})
# La junta entre los dos tramos de la playa se aparta del borde de la losa (FASE_E, en unidades a lo largo de la
# costa): con la junta justo en la costura, el escalón entre tramos saltaba más que cualquier otra fila (check.py).
FASE_E = 2.2
# Las datileras del paseo caben enteras en la losa de 288 px (con 1,85 la copa tocaba el borde del agua).
SUR_PALMERA = 1.3
TRAMOS_E = ({"dx": 0.0, "a": 2.6, "b": 4.5, "alto": 0.85}, {"dx": 0.2, "a": 3.0, "b": 4.6, "alto": 1.0})


def cara_x(B, y, z, x0, x1, step=0.02):
    """Primer x (yendo de x0 hacia x1) donde el terreno alcanza la altura z."""
    n = int(abs(x1 - x0) / step)
    s = step if x1 > x0 else -step
    for i in range(n):
        x = x0 + s * i
        if B.gz(x, y) >= z:
            return x
    return x1


def back_strip(B, x0, x1, y0, y1, alto, role):
    """Tierra de fondo continua detrás de la costa: el borde de tierra de la losa queda opaco."""
    B.land((x0 + x1) / 2, (y0 + y1) / 2, abs(x1 - x0) / 2, abs(y1 - y0) / 2, alto, -0.2, g=0, p=8.0, q=4.0, role=role,
           segs=64, rings=16)


def oeste(B, AP, y0, reps, L, y_max=None):
    cx0 = -17.4
    rng = random.Random(611)
    per = []
    for j, t in enumerate(TRAMOS_O):
        cy = (j + 0.5) * L / 2
        it = {"rocas": [(rng.uniform(-t["b"] * 0.85, t["b"] * 0.85), rng.uniform(0.0, 0.2), rng.uniform(0.14, 0.28))
                        for _ in range(6)],
              "pinos": [((i - 1) * t["b"] * 0.55 + rng.uniform(-0.3, 0.3), rng.uniform(-0.6, 0.4), rng.uniform(0.95, 1.25),
                         rng.uniform(0.75, 0.9)) for i in range(3)],
              "pitas": [(rng.uniform(-t["b"] * 0.7, t["b"] * 0.7), rng.uniform(0.2, 0.7), rng.uniform(0.2, 0.28))
                        for _ in range(3)]}
        per.append((cy, t, it))

    def rows():
        for yb in [y0 + r * L for r in reps]:
            for cy, t, it in per:
                if y_max is None or yb + cy <= y_max:
                    yield yb + cy, t, it

    with B.pieza("acantilados"):
        for y, t, it in rows():
            cx, a, b, alto = cx0 + t["dx"], t["a"], t["b"], t["alto"]
            B.land(cx + 0.1, y, a + 0.16, b + 0.1, 0.45, -0.25, g=0, p=4.0, q=5.0, role="limestone_dark", segs=64,
                   rings=14)
            B.land(cx, y, a, b, alto + 0.2, -0.2, g=0, p=4.0, q=10.0, role="limestone", segs=72, rings=28)
            for zz, dk, role in ((0.42, 0.03, "ochre"), (0.8, 0.015, "limestone_dark"), (1.15, 0.01, "ochre")):
                if zz < alto:
                    B.land(cx + dk, y, a + dk, b + dk * 0.5, 0.06, zz - 0.03, g=0, p=4.0, q=1.0, role=role, segs=72,
                           rings=4)
            B.land(cx - 0.35, y + 0.1, a - 0.5, b - 0.55, 0.14, alto + 0.02, g=0, p=3.5, q=3.0, role="scrub", segs=56,
                   rings=12)
    with B.pieza("rocas"):
        for y, t, it in rows():
            for n, (dy, dx, s) in enumerate(it["rocas"]):
                B.rng = random.Random(8100 + 97 * n + int(t["a"] * 100))
                yy = y + dy
                x = cara_x(B, yy, 0.05, -12.5, cx0) + dx
                P.rock(B, x, yy, s, z=-s * 0.2, role="limestone")
                if n % 2 == 0:
                    P.ripple(B, x, yy, s + 0.1, 1, t=0.015)
    with B.pieza("pinos"):
        for y, t, it in rows():
            cx = cx0 + t["dx"]
            for n, (dy, dx, hh, k) in enumerate(it["pinos"]):
                B.rng = random.Random(8200 + 97 * n + int(t["a"] * 100))
                P.pine(B, cx - 0.6 + dx, y + dy, height=hh, k=k)
            for n, (dy, dx, s) in enumerate(it["pitas"]):
                B.rng = random.Random(8300 + 97 * n + int(t["a"] * 100))
                AP.pita(B, cx + dx, y + dy, s=s)


def socorrista(B, x, y):
    base = B.on(x, y, -0.03)
    for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        q = base + P.mvec(sx * 0.12, sy * 0.12)
        B.tube("white", [q, q + Vector((0, 0, 0.62))], 0.015, segs=5)
    B.blob("white", (0.16, 0.16, 0.03), base + Vector((0, 0, 0.62)), 6.0, 2.0, segs=12, rings=4)
    B.blob("red", (0.12, 0.12, 0.1), base + Vector((0, 0, 0.74)), 6.0, 6.0, segs=12, rings=6)
    B.tube("red", [base + Vector((0, 0, 0.84)), base + Vector((0, 0, 1.05))], 0.01, segs=4)
    B.blob("flag", (0.1, 0.01, 0.06), base + Vector((0, 0, 1.0)) + P.mvec(0.1, 0), 4.0, 3.0, extra=B.rz(0), segs=8, rings=4)


def hoguera_playa(B, x, y, k=0.6):
    c = B.on(x, y, -0.02)
    for i in range(7):
        a = math.radians(i * 51)
        q = c + Vector((0.2 * k * math.cos(a), 0.2 * k * math.sin(a), 0.0))
        B.tube("wood" if i % 2 else "wood_dark", [q, c + Vector((0, 0, 0.5 * k))], 0.025 * k + 0.008, segs=5)


def sombrilla(B, x, y, a_role, k=1.0):
    base = B.on(x, y, -0.04)
    top = base + Vector((0.03, -0.02, 0.62 * k))
    B.tube("white", [base, top], 0.016, segs=6)
    B.lathe(a_role, [(0, 0.12 * k), (0.12 * k, 0.1 * k), (0.28 * k, 0.03 * k), (0.32 * k, -0.01 * k), (0.3 * k, -0.02 * k),
                     (0, 0.0)], tuple(top), segs=16)
    B.lathe("awning_b", [(0, 0.1 * k), (0.12 * k, 0.085 * k), (0.2 * k, 0.05 * k), (0.19 * k, 0.045 * k), (0, 0.095 * k)],
            tuple(top + Vector((0, 0, 0.012))), segs=16)


def este(B, AP, y0, reps, L, y_max=None):
    cx0 = 17.4
    rng = random.Random(733)
    roles = ("awning_a", "dome_a", "house_a", "house_e", "house_b")
    per = []
    for j, t in enumerate(TRAMOS_E):
        cy = (j + 0.5) * L / 2 + FASE_E
        it = {"sombrillas": [(rng.uniform(-3.4, 3.4), rng.uniform(-0.1, 0.25), roles[(2 * j + k) % 5], rng.uniform(0.9, 1.1))
                             for k in range(2)],
              "palmeras": [(rng.uniform(-3.6, 3.6), rng.uniform(1.6, 1.9)) for _ in range(2)],
              "socorrista": (rng.uniform(-1.0, 1.0),),
              "hoguera": (rng.uniform(-3.0, 3.0),)}
        per.append((cy, t, it))

    def rows():
        for yb in [y0 + r * L for r in reps]:
            for cy, t, it in per:
                if y_max is None or yb + cy - FASE_E <= y_max:     # y_max cuenta desde el hueco sin desplazar
                    yield yb + cy, t, it

    with B.pieza("playa"):
        for y, t, it in rows():
            B.land(cx0 + t["dx"], y, t["a"], t["b"], t["alto"] + 0.2, -0.2, g=0, p=4.0, q=2.2, role="sand", segs=72,
                   rings=20)
            B.land(cx0 + t["dx"] + 0.12, y, t["a"] + 0.05, t["b"], 0.05, -0.02, g=0, p=4.0, q=1.0, role="sand_wet",
                   segs=72, rings=4)
    with B.pieza("sombrillas"):
        for y, t, it in rows():
            for dy, dx, role, k in it["sombrillas"]:
                x = cara_x(B, y + dy, 0.12, 12.5, 18.0) + 0.45 + dx
                sombrilla(B, x, y + dy, role, k=k)
    with B.pieza("palmeras"):
        for y, t, it in rows():
            for n, (dy, hh) in enumerate(it["palmeras"]):
                B.rng = random.Random(8400 + 97 * n + int(t["a"] * 100))
                AP.datilera(B, 16.5 + 0.5 * n, y + dy, height=hh)
    with B.pieza("socorrista"):
        for y, t, it in rows():
            x = cara_x(B, y + it["socorrista"][0], 0.2, 12.5, 18.0) + 0.7
            socorrista(B, x, y + it["socorrista"][0])
    with B.pieza("hogueras"):
        for y, t, it in rows():
            hoguera_playa(B, 17.0, y + it["hoguera"][0])


def sur(B, AP, x0, reps, L, land=None, items_in=None):
    """El paseo del Postiguet, periódico en x (cada L): muro, mosaico, datileras, farolas, bancos y casas."""
    yc, b, alto = 30.6, 2.8, 0.55
    xs = [x0 + r * L for r in reps]
    lo, hi = land or (min(xs) - L, max(xs) + 2 * L)
    x_min, x_max = items_in or (-1e9, 1e9)
    with B.pieza("paseo"):
        B.land((lo + hi) / 2, yc + 1.2, (hi - lo) / 2, b + 1.2, alto, -0.2, g=0, p=8.0, q=6.0, role="limestone",
               segs=64, rings=24)
    with B.pieza("mosaico"):
        z = B.gz((lo + hi) / 2, 28.9)
        B.blob("mosaic", ((hi - lo) / 2, 0.62, 0.035), B.at((lo + hi) / 2, 28.85, z + 0.005), 10.0, 4.0,
               extra=B.rz(0), segs=128, rings=8)
    items = [("palmera", 0.9, 29.75), ("palmera", 5.2, 29.75), ("farola", 3.0, 28.35), ("farola", 7.4, 28.35),
             ("banco", 2.1, 29.3), ("banco", 6.3, 29.3), ("casa", 1.6, 30.8, 0.5, 0.85, "whitewash"),
             ("casa", 3.4, 30.7, 0.45, 1.05, "house_d"), ("casa", 5.8, 30.8, 0.5, 0.8, "whitewash"),
             ("casa", 7.8, 30.6, 0.45, 0.95, "house_c"), ("casa", 4.5, 32.1, 0.6, 1.25, "limestone"),
             ("buganvilla", 4.6, 30.35)]
    with B.pieza("casas"):
        for xb in xs:
            for n, it in enumerate(items):
                B.rng = random.Random(8600 + 97 * n)
                x = xb + it[1]
                if not x_min <= x <= x_max:
                    continue
                kind = it[0]
                if kind == "palmera":
                    AP.datilera(B, x, it[2], height=SUR_PALMERA)
                elif kind == "farola":
                    P.lamp(B, x, it[2], 0.95)
                elif kind == "banco":
                    AP.banco(B, x, it[2], g=90.0)
                elif kind == "casa":
                    AP.casa(B, x, it[2], w=it[3], d=0.4, h=it[4], g=90.0, color=it[5])
                else:
                    AP.buganvilla(B, x, it[2], 0.22)
