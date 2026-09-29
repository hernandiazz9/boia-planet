"""Cap de l'Horta y Torre de l'Illeta (lugares `faro` y `canon`): las islas de los minijuegos (D-20). MUESTRA.

Faro: islote de caliza con un faro de torre cuadrada encalada sobre zócalo
ocre (el del Cabo de la Huerta), linterna de cristal con cúpula roja y la casa
del torrero. Cañón: islote con una torre vigía redonda de mampostería (la de la
Illeta del Campello) y el cañón en su terraza, apuntando al mar. Cada función
devuelve su anclaje: la linterna (origen del haz) y la boca del cañón.
"""
import math

from mathutils import Vector

import piezas as P

UP = Vector((0, 0, 1))


def faro(B, AP, s):
    cx, cy = s["centro"]
    with B.pieza("isla"):
        z0 = AP.islote(B, s, top="scrub")
    with B.pieza("rocas"):
        for u, v, r in ((-1.05, 0.2, 0.26), (1.0, -0.3, 0.22), (0.4, 1.05, 0.2), (-0.5, -1.0, 0.24)):
            P.rock(B, *AP.local(s, u, v), r, z=0.0, role="limestone")
    base = B.at(cx - 0.2, cy - 0.15, z0 - 0.04)
    H = 1.75
    with B.pieza("torre"):
        B.blob("ochre", (0.38, 0.38, 0.14), base + Vector((0, 0, 0.12)), 8.0, 6.0, extra=B.rz(0), segs=20, rings=8)
        B.blob("whitewash", (0.26, 0.26, H / 2), base + Vector((0, 0, 0.2 + H / 2)), 10.0, 12.0, extra=B.rz(0),
               segs=20, rings=16)
        for zz in (0.25 + H * 0.35, 0.25 + H * 0.7):
            D = P.mdir(90)
            Rt = D.cross(UP).normalized()
            B.blob("window", (0.05, 0.02, 0.08), base + D * 0.27 + Vector((0, 0, zz)), 5.0, 5.0,
                   extra=P.basis(Rt, D, UP), segs=10, rings=6)
        B.blob("blue_door", (0.08, 0.02, 0.13), base + P.mdir(90) * 0.27 + Vector((0, 0, 0.36)), 5.0, 4.0,
               extra=P.basis(P.mdir(90).cross(UP).normalized(), P.mdir(90), UP), segs=10, rings=6)
        B.blob("ochre", (0.32, 0.32, 0.05), base + Vector((0, 0, 0.2 + H + 0.02)), 8.0, 4.0, extra=B.rz(0), segs=20,
               rings=6)
    top = base + Vector((0, 0, 0.2 + H + 0.07))
    with B.pieza("linterna"):
        for i in range(8):
            a = math.radians(i * 45)
            q = top + Vector((0.26 * math.cos(a), 0.26 * math.sin(a), 0.0))
            B.tube("iron", [q, q + Vector((0, 0, 0.12))], 0.01, segs=5)
        B.torus("iron", 0.26, 0.012, P.T(*(top + Vector((0, 0, 0.12)))), nu=32, nv=5)
        B.lathe("glass", [(0, 0), (0.15, 0), (0.15, 0.3), (0, 0.3)], tuple(top), segs=20)
        B.blob("glow", (0.1, 0.1, 0.11), top + Vector((0, 0, 0.15)), segs=14, rings=8)
        B.lathe("red", [(0, 0.3), (0.19, 0.3), (0.03, 0.5), (0, 0.52)], tuple(top), segs=20)
        B.blob("iron", (0.035, 0.035, 0.035), top + Vector((0, 0, 0.56)), segs=10, rings=6)
    with B.pieza("casa"):
        AP.casa(B, cx + 0.7, cy + 0.25, w=0.34, d=0.28, h=0.4, g=90.0, color="whitewash", windows=1)
    with B.pieza("vegetacion"):
        AP.pita(B, cx - 0.75, cy + 0.35, s=0.24)
        AP.pino(B, cx + 0.2, cy - 0.7, height=0.85, k=0.6)
        AP.matorral(B, s, n=6, seed=31, avoid=[(cx - 0.2, cy - 0.15), (cx + 0.7, cy + 0.25)], r_avoid=0.55)
    return top + Vector((0, 0, 0.15))


def canon(B, AP, s):
    cx, cy = s["centro"]
    with B.pieza("isla"):
        z0 = AP.islote(B, s, top="sand")
    with B.pieza("rocas"):
        for u, v, r in ((-1.05, 0.1, 0.22), (1.05, 0.25, 0.2), (0.2, -1.05, 0.22)):
            P.rock(B, *AP.local(s, u, v), r, z=0.0, role="limestone")
    with B.pieza("torre"):
        terr = AP.torre_vigia(B, cx - 0.1, cy - 0.05, h=0.85, r=0.4, z0=z0 - 0.06)
    with B.pieza("canon"):
        gdir = 25.0
        D = P.mdir(gdir)
        Rt = D.cross(UP).normalized()
        piv = terr + Vector((0, 0, 0.12))
        m = P.T(*piv) @ P.basis(Rt, D, UP) @ P.rot("X", -78)
        prof = [(0, -0.22), (0.085, -0.22), (0.095, -0.17), (0.07, -0.13), (0.06, 0.17), (0.072, 0.21), (0.058, 0.23),
                (0.04, 0.23), (0, 0.21)]
        B.lathe("iron", prof, (0, 0, 0), segs=20, extra=m)
        boca = m @ Vector((0, 0, 0.24))
        for side in (-1, 1):
            w = piv + Rt * side * 0.11 - Vector((0, 0, 0.07))
            B.torus("wood_dark", 0.07, 0.018, P.T(*w) @ P.basis(D, UP, Rt), nu=18, nv=6)
        for i, (dx, dy) in enumerate(((0, 0), (0.09, 0), (0.045, 0.075))):
            q = terr + Rt * (-0.22 + dx) - D * (0.12 - dy) + Vector((0, 0, 0.05))
            B.blob("iron", (0.045, 0.045, 0.045), q, segs=12, rings=8)
    with B.pieza("bandera"):
        P.flag(B, terr - D * 0.28 + Rt * 0.2, 0.7, 0.7, role="flag", g=0)
    with B.pieza("vegetacion"):
        AP.chumbera(B, cx + 0.75, cy + 0.3, s=0.26)
        AP.pita(B, cx - 0.7, cy + 0.4, s=0.22)
    return boca
