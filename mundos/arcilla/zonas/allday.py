"""Zona 4 · Isla del escenario (All Day BOIA). La gran isla comercial y destino principal. MUESTRA.

Escenario arriba de la isla mirando a cámara, torres de luces, altavoces, público
de espaldas, barra de paja a la derecha, cabina del DJ a la izquierda y, abajo,
la llegada: muelle de tablones, arco con bombillas, taquilla «a la venta» con la
taquillera y el cartel del evento. De noche manda el escenario (ámbar y magenta).

Ajustes respecto a mapa.json (desplazamientos locales, el JSON no se toca):
- taquilla: (0,9, −12,6) chocaba con el arranque del muelle; va a (−0,5, −12,95),
  a la izquierda del arco, mirando a cámara y al muelle (g = 70). El cartel del
  evento ocupa el lado derecho, en (2,1, −13,4).
- arco: en (0,5, −12,0) cae justo en la orilla; se apoya sobre el arranque del muelle.
"""
import math

import bmesh
from mathutils import Matrix, Vector

import mapa as MAPA
import piezas as P

UP = Vector((0, 0, 1))
I4 = Matrix.Identity(4)


def lugar(Z, lid):
    return next(lg["pos"] for lg in Z["lugares"] if lg["id"] == lid)


class Fr:
    """Marco local sobre el mapa: u hacia g (delante), v hacia g − 90, w arriba."""

    def __init__(self, B, x, y, g, dz=0.0, z=None):
        self.B, self.g = B, g
        base = B.on(x, y, dz) if z is None else B.at(x, y, z)
        self.o = base
        self.m = P.T(*base) @ B.rz(g)

    def p(self, u, v, w):
        return self.m @ Vector((u, v, w))

    def M(self, u, v, w, extra=None):
        return self.m @ P.T(u, v, w) @ (extra or I4)

    def xy(self, u, v):
        q = self.p(u, v, 0)
        return MAPA.from_blender(q.x, q.y)

    def gw(self, u, v):
        """Altura del terreno en (u, v), relativa al origen del marco."""
        q = self.p(u, v, 0)
        return max(0.0, self.B.ground_b(q.x, q.y)) - self.o.z

    def blob(self, role, size, u, v, w, p=2.0, q=2.0, extra=None, segs=24, rings=12):
        return self.B.blob(role, size, (0, 0, 0), p, q, extra=self.M(u, v, w, extra), segs=segs, rings=rings)

    def tube(self, role, pts, r, segs=8):
        return self.B.tube(role, [self.p(*q) for q in pts], r, segs)

    def lathe(self, role, prof, u, v, w, extra=None, segs=24):
        return self.B.lathe(role, prof, (0, 0, 0), segs=segs, extra=self.M(u, v, w, extra))

    def torus(self, role, R, r, u, v, w, extra=None, nu=24, nv=8):
        return self.B.torus(role, R, r, self.M(u, v, w, extra), nu=nu, nv=nv)


def solid(ob, t=0.02):
    mod = ob.modifiers.new("solid", "SOLIDIFY")
    mod.thickness = t
    mod.offset = 0.0
    return ob


def sombrilla(B, x, y, R=0.5, H=0.95, roles=("band", "canvas"), n=8, tilt=(0.0, 0.0)):
    """Sombrilla de gajos a rayas. tilt: inclinación (grados) de la copa en ejes de Blender X, Y."""
    base = B.on(x, y, -0.06)
    top = base + Vector((0, 0, H))
    m = P.T(*top) @ P.rot("X", tilt[0]) @ P.rot("Y", tilt[1])
    B.tube("wood", [base, top + (m.to_3x3() @ Vector((0, 0, 0.2)))], 0.022, 8)
    prof = [(0.004, 0.2), (0.3 * R, 0.16), (0.55 * R, 0.1), (0.8 * R, 0.04), (R, -0.03)]
    sub = 4
    spin = B.rng.uniform(0, 45)
    for k in range(n):
        bm = bmesh.new()
        rows = []
        for r, z in prof:
            row = []
            for j in range(sub + 1):
                a = math.radians(spin + (k + j / sub) * 360.0 / n)
                row.append(bm.verts.new(m @ Vector((r * math.cos(a), r * math.sin(a), z))))
            rows.append(row)
        for r0, r1 in zip(rows, rows[1:]):
            for j in range(sub):
                bm.faces.new((r0[j], r0[j + 1], r1[j + 1], r1[j]))
        solid(B.mk(bm, roles[k % len(roles)]), 0.025)
    B.blob(roles[0], (0.04, 0.04, 0.05), m @ Vector((0, 0, 0.23)), segs=10, rings=6)
    return top


def hamaca(B, x, y, g, cushion=("band", "canvas")):
    """Tumbona de madera con colchoneta a rayas y respaldo levantado hacia g + 180."""
    F = Fr(B, x, y, g, dz=0.0)
    F.blob("wood", (0.36, 0.15, 0.025), 0.0, 0, 0.1, 6.0, 3.0, segs=16, rings=6)
    for u in (-0.3, 0.3):
        for v in (-0.12, 0.12):
            F.tube("wood_dark", [(u, v, -0.04), (u, v, 0.1)], 0.015, 6)
    for i in range(4):
        F.blob(cushion[i % 2], (0.05, 0.14, 0.03), 0.05 + 0.1 * i - 0.2, 0, 0.14, 4.0, 2.0, segs=12, rings=6)
    F.blob(cushion[0], (0.03, 0.14, 0.14), -0.27, 0, 0.24, 4.0, 3.0, extra=P.rot("Y", -35), segs=12, rings=6)


def foco(F, u, v, w, aim, role, yaw=0.0, k=1.0):
    """Foco de escenario: lata metálica con lente de papel que brilla, apuntando a local (aim: pitch)."""
    ex = P.rot("Z", yaw) @ P.rot("Y", 90 + aim)
    F.lathe("metal", [(0, -0.09 * k), (0.07 * k, -0.09 * k), (0.085 * k, 0.05 * k), (0.07 * k, 0.07 * k), (0, 0.06 * k)],
            u, v, w, extra=ex, segs=16)
    F.lathe(role, [(0, 0.055 * k), (0.07 * k, 0.055 * k), (0.06 * k, 0.085 * k), (0, 0.09 * k)], u, v, w, extra=ex, segs=16)


def build(B, Z, M):
    with B.pieza("isla"):
        B.isla(Z["islas"][0])
        # un camino de arena apisonada del muelle al público
        for i, (x, y) in enumerate(((0.75, -12.9), (0.9, -13.5), (0.8, -14.1))):
            B.blob("stone", (0.24, 0.2, 0.025), B.on(x, y, 0.0), 4.0, 2.0, extra=B.rz(20 * i), segs=16, rings=6)

    sx, sy = lugar(Z, "escenario")
    S = Fr(B, sx, sy, 90.0, dz=-0.04)
    TOP = 0.26                     # altura de la tarima sobre el terreno
    ROOF = 2.15
    W2 = 1.3                       # media anchura del escenario

    # --- escenario ------------------------------------------------------------------
    with B.pieza("escenario"):
        S.blob("stage_wood", (0.66, W2, 0.16), 0.0, 0, 0.1, 6.0, 6.0, segs=40, rings=10)
        S.blob("wood_dark", (0.68, W2 + 0.02, 0.03), 0.0, 0, 0.0, 6.0, 2.0, segs=40, rings=6)
        for i in range(-5, 6):                                   # canto de tablas del frente
            S.blob("stage_wood", (0.02, 0.1, 0.12), 0.66, i * 0.23, 0.09, 4.0, 4.0, segs=10, rings=6)
        S.blob("stage_wood", (0.14, 0.4, 0.07), 0.78, 0, 0.03, 6.0, 4.0, segs=20, rings=8)       # escalón
        # fondo oscuro con BOIA
        S.blob("speaker", (0.05, W2 - 0.05, 0.78), -0.6, 0, TOP + 0.74, 6.0, 8.0, segs=32, rings=12)
        B.text("stage_light", "BOIA", S.p(-0.53, 0, TOP + 0.8), g=90, size=0.42, depth=0.03, bevel=0.012)
        for v in (-0.95, 0.95):
            S.torus("stage_magenta", 0.1, 0.022, -0.54, v, TOP + 0.8, extra=P.rot("Y", 90), nu=20, nv=6)
            S.blob("fiestera_band", (0.02, 0.05, 0.05), -0.54, v, TOP + 0.8, segs=12, rings=6)
        # candilejas en el borde de la tarima
        for i in range(7):
            S.blob("stage_light", (0.035, 0.05, 0.03), 0.64, -1.05 + 0.35 * i, TOP + 0.01, 3.0, 2.0, segs=10, rings=6)
        # pilares
        for u in (-0.55, 0.55):
            for v in (-W2 + 0.08, W2 - 0.08):
                S.tube("wood_dark", [(u, v, 0.1), (u, v, ROOF)], 0.05, 10)
        # toldo naranja con borde festoneado
        S.blob("band", (0.78, W2 + 0.14, 0.08), 0.02, 0, ROOF + 0.06, 5.0, 2.2, extra=P.rot("Y", -5), segs=40, rings=10)
        S.blob("band", (0.5, W2 - 0.1, 0.1), -0.05, 0, ROOF + 0.14, 3.0, 2.0, segs=32, rings=10)
        n = 13
        for i in range(n):
            v = -W2 - 0.08 + (2 * W2 + 0.16) * i / (n - 1)
            S.blob("band" if i % 2 else "canvas", (0.025, 0.1, 0.11), 0.79, v, ROOF - 0.01, 2.0, 2.0, segs=14, rings=8)
        for side in (-1, 1):
            for i in range(5):
                u = -0.62 + 0.31 * i
                S.blob("canvas" if i % 2 else "band", (0.1, 0.025, 0.1), u, side * (W2 + 0.15), ROOF + 0.01, 2.0, 2.0,
                       segs=14, rings=8)
        # focos colgados del toldo
        for i, v in enumerate((-0.9, -0.3, 0.3, 0.9)):
            S.tube("metal", [(0.6, v, ROOF - 0.02), (0.6, v, ROOF - 0.12)], 0.012, 6)
            foco(S, 0.6, v, ROOF - 0.18, 40, "stage_light" if i % 2 == 0 else "stage_magenta", yaw=180, k=0.9)
        # artista, micro y monitores
        mx, my = S.xy(0.05, 0.0)
        P.person(B, mx, my, role="person_e", h=1.15, g=90, hair="hair", arms="up", z=S.o.z + TOP - 0.01)
        S.tube("iron", [(0.3, -0.2, TOP), (0.3, -0.2, TOP + 0.34), (0.26, -0.12, TOP + 0.38)], 0.01, 6)
        S.blob("iron", (0.025, 0.025, 0.03), 0.25, -0.11, TOP + 0.39, segs=8, rings=6)
        for v in (-0.55, 0.55):
            S.blob("speaker", (0.1, 0.16, 0.07), 0.45, v, TOP + 0.06, 5.0, 3.0, extra=P.rot("Y", -25), segs=16, rings=8)
        # luz del escenario: ámbar general y magenta rasante
        B.luz(S.p(0.9, 0, 1.5), (1.0, 0.62, 0.32), 110.0, ("atardecer", "noche"))
        B.luz(S.p(-0.15, -0.95, 1.3), (1.0, 0.28, 0.62), 50.0, ("noche",))
        B.luz(S.p(-0.15, 0.95, 1.3), (1.0, 0.28, 0.62), 50.0, ("noche",))
        B.luz(S.p(1.8, 0, 0.8), (1.0, 0.55, 0.35), 40.0, ("noche",))          # contraluz sobre el público

    # --- altavoces --------------------------------------------------------------------
    with B.pieza("altavoces"):
        for side in (-1, 1):
            v = side * (W2 + 0.42)
            gw = S.gw(0.1, v)
            for (h0, a, b, c, big) in ((0.0, 0.22, 0.25, 0.3, True), (0.6, 0.2, 0.22, 0.24, False)):
                wc = gw + h0 + c
                S.blob("speaker", (a, b, c), 0.1, v, wc, 6.0, 6.0, segs=20, rings=10)
                for dz, rr in (((0.07, 0.14), (-0.13, 0.07)) if big else ((0.05, 0.11), (-0.12, 0.05))):
                    ex = P.rot("Y", 90)
                    S.torus("metal", rr, 0.022, 0.1 + a + 0.005, v, wc + dz, extra=ex, nu=20, nv=6)
                    S.blob("ink", (0.02, rr * 0.85, rr * 0.85), 0.1 + a - 0.005, v, wc + dz, segs=16, rings=8)
                    S.blob("metal", (0.02, rr * 0.25, rr * 0.25), 0.1 + a + 0.01, v, wc + dz, segs=10, rings=6)

    # --- torres de luces ----------------------------------------------------------------
    with B.pieza("torres"):
        for side, role_a, role_b in ((-1, "stage_light", "stage_magenta"), (1, "stage_magenta", "stage_light")):
            tu, tv = 0.85, side * (W2 + 1.05)
            tx, ty = S.xy(tu, tv)
            T_ = Fr(B, tx, ty, 90.0, dz=-0.05)
            H = 2.45
            legs = [(0.16 * math.cos(math.radians(a)), 0.16 * math.sin(math.radians(a))) for a in (90, 210, 330)]
            for (a, b) in legs:
                T_.tube("metal", [(a, b, 0.0), (a * 0.8, b * 0.8, H)], 0.025, 8)
            nseg = 7
            for i in range(nseg):
                z0, z1 = H * i / nseg, H * (i + 1) / nseg
                s0, s1 = 1 - 0.2 * z0 / H, 1 - 0.2 * z1 / H
                for j in range(3):
                    a0, a1 = legs[j], legs[(j + 1) % 3]
                    if i % 2:
                        T_.tube("metal", [(a0[0] * s0, a0[1] * s0, z0), (a1[0] * s1, a1[1] * s1, z1)], 0.011, 6)
                    else:
                        T_.tube("metal", [(a1[0] * s0, a1[1] * s0, z0), (a0[0] * s1, a0[1] * s1, z1)], 0.011, 6)
            T_.blob("metal", (0.2, 0.2, 0.03), 0, 0, H + 0.02, 4.0, 2.0, segs=16, rings=6)
            # barra con tres focos mirando al escenario
            T_.tube("metal", [(0.0, -0.32, H + 0.12), (0.0, 0.32, H + 0.12)], 0.02, 8)
            yaw = 180 + side * 35            # hacia el centro del escenario
            for k, v in enumerate((-0.25, 0.0, 0.25)):
                foco(T_, 0.0, v, H + 0.2, 25, role_a if k != 1 else role_b, yaw=yaw)
            top = T_.p(0, 0, H + 0.2)
            B.luz(top + Vector((0, 0, 0.1)), (1.0, 0.62, 0.3) if role_a == "stage_light" else (1.0, 0.32, 0.62), 22.0,
                  ("noche",))
            T_.blob("stage_magenta" if side < 0 else "stage_light", (0.05, 0.05, 0.06), 0, 0, H + 0.34, segs=10, rings=6)

    # --- cabina del DJ ------------------------------------------------------------------
    dx, dy = lugar(Z, "dj")
    with B.pieza("dj"):
        Dj = Fr(B, dx, dy, 55.0, dz=-0.03)
        Dj.blob("speaker", (0.24, 0.5, 0.26), 0.0, 0, 0.26, 6.0, 6.0, segs=24, rings=10)
        Dj.blob("band", (0.02, 0.44, 0.06), 0.24, 0, 0.36, 4.0, 4.0, segs=20, rings=8)        # franja naranja del frente
        Dj.blob("stage_wood", (0.28, 0.55, 0.03), 0.0, 0, 0.54, 6.0, 3.0, segs=24, rings=6)
        for v in (-0.3, 0.3):
            Dj.lathe("metal", [(0, 0), (0.13, 0), (0.13, 0.025), (0, 0.025)], 0.02, v, 0.56, segs=20)
            Dj.lathe("ink", [(0, 0.025), (0.11, 0.025), (0.11, 0.035), (0, 0.035)], 0.02, v, 0.56, segs=20)
            Dj.lathe("sticker_a", [(0, 0.035), (0.035, 0.035), (0.035, 0.042), (0, 0.042)], 0.02, v, 0.56, segs=12)
            Dj.tube("metal", [(0.1, v + 0.09, 0.6), (0.0, v + 0.1, 0.62)], 0.008, 6)
        Dj.blob("metal", (0.1, 0.1, 0.03), 0.02, 0, 0.58, 5.0, 3.0, segs=14, rings=6)
        for i in range(3):
            Dj.blob("stage_magenta" if i % 2 else "stage_light", (0.015, 0.015, 0.015), 0.07, -0.05 + 0.05 * i, 0.61,
                    segs=8, rings=4)
        # tarima baja detrás de la mesa para que el DJ asome
        Dj.blob("stage_wood", (0.2, 0.42, 0.09), -0.4, 0, 0.06, 6.0, 4.0, segs=20, rings=6)
        px_, py_ = Dj.xy(-0.38, 0.0)
        head = P.person(B, px_, py_, role="person_f", h=1.2, g=55.0, hair="hair", arms="up", z=Dj.o.z + 0.14)
        # cascos
        D = P.mdir(55.0)
        Rt = D.cross(UP).normalized()
        B.tube("ink", [head + Rt * 0.085 + Vector((0, 0, -0.01)), head + Vector((0, 0, 0.09)), head - Rt * 0.085 + Vector((0, 0, -0.01))],
               0.012, 6)
        for s in (-1, 1):
            B.blob("ink", (0.03, 0.03, 0.035), head + Rt * s * 0.078, segs=10, rings=6)
        B.luz(Dj.p(0.3, 0, 0.9), (1.0, 0.35, 0.65), 8.0, ("noche",))

    # --- público ----------------------------------------------------------------------
    with B.pieza("publico"):
        roles = ["person_a", "person_b", "person_c", "person_d", "person_e", "person_f"]
        spots = []
        rows = ((1.25, 5, 0.0), (1.75, 5, 0.23), (2.25, 4, 0.1), (2.75, 3, 0.35))
        for r_i, (u, n, off) in enumerate(rows):
            span = 0.55 * (n - 1)
            for j in range(n):
                v = -span / 2 + 0.55 * j + off - 0.05
                spots.append((u + B.rng.uniform(-0.1, 0.1), v + B.rng.uniform(-0.08, 0.08)))
        if B.variante == "recuerdo":
            spots = spots[1:3]                           # evento terminado: el escenario queda sin público
        for i, (u, v) in enumerate(spots):
            x, y = S.xy(u, v)
            g = -90 + B.rng.uniform(-25, 25)
            if i in (6, 13):
                g = 80                                   # dos que se giran a la cámara
            arms = "up" if i % 3 == 1 else ("wave" if i % 5 == 0 else "down")
            hat = "hat" if i % 7 == 3 else None
            P.person(B, x, y, role=roles[(i * 5) % 6], h=B.rng.uniform(0.95, 1.1), g=g, hair="hair", hat=hat, arms=arms)

    # --- barra de paja -------------------------------------------------------------------
    bx, by = lugar(Z, "barra")
    with B.pieza("barra"):
        Br = Fr(B, bx, by, 125.0, dz=-0.03)
        Br.blob("wood", (0.16, 0.62, 0.22), 0.1, 0, 0.22, 6.0, 6.0, segs=28, rings=10)
        for i in range(-3, 4):
            Br.blob("wood_dark", (0.02, 0.012, 0.18), 0.26, i * 0.17, 0.22, 3.0, 4.0, segs=8, rings=6)
        Br.blob("stage_wood", (0.22, 0.7, 0.03), 0.1, 0, 0.46, 6.0, 3.0, segs=28, rings=6)
        # estante de botellas detrás
        Br.blob("wood", (0.08, 0.55, 0.02), -0.42, 0, 0.5, 6.0, 3.0, segs=20, rings=6)
        Br.blob("wood_dark", (0.03, 0.55, 0.3), -0.5, 0, 0.45, 6.0, 6.0, segs=20, rings=8)
        prof = [(0, 0), (0.035, 0), (0.038, 0.09), (0.018, 0.13), (0.014, 0.17), (0, 0.17)]
        for i in range(7):
            role = ("bottle", "pea", "bottle", "red", "glass")[i % 5]
            Br.lathe(role, prof, -0.42, -0.45 + 0.15 * i, 0.52, segs=12)
        for i, v in enumerate((-0.4, 0.05, 0.4)):
            Br.lathe(("bottle", "pea", "glass")[i], prof, 0.12, v, 0.49, segs=12)
            Br.lathe("lantern" if i == 1 else "paper", [(0, 0), (0.028, 0), (0.032, 0.07), (0, 0.07)], 0.16, v + 0.12, 0.49, segs=10)
        # postes y techo de paja
        for u, v in ((0.28, -0.72), (0.28, 0.72), (-0.55, -0.72), (-0.55, 0.72)):
            Br.tube("wood_dark", [(u, v, 0.0), (u, v, 1.2)], 0.04, 8)
        Br.lathe("thatch", [(0, 1.62), (0.3, 1.52), (0.62, 1.34), (0.95, 1.16), (1.02, 1.1), (0.95, 1.08), (0, 1.16)],
                 -0.13, 0, 0.0, segs=40)
        Br.blob("wood_dark", (0.05, 0.05, 0.06), -0.13, 0, 1.66, segs=10, rings=6)
        # taburetes
        for v in (-0.45, 0.0, 0.45):
            q = (0.5, v)
            gw = Br.gw(*q)
            Br.tube("wood_dark", [(q[0], q[1], gw - 0.02), (q[0], q[1], gw + 0.26)], 0.018, 6)
            Br.blob("band", (0.08, 0.08, 0.025), q[0], q[1], gw + 0.28, segs=14, rings=6)
        # el camarero
        wx, wy = Br.xy(-0.22, 0.12)
        P.person(B, wx, wy, role="person_c", h=1.1, g=125.0, hair="hair", arms="down")
        B.luz(Br.p(0.2, 0, 1.0), (1.0, 0.72, 0.45), 14.0, ("atardecer", "noche"))
        P.lantern_paper(B, Br.p(0.5, -0.5, 1.02), role="lantern", k=0.9)
        P.lantern_paper(B, Br.p(0.5, 0.5, 1.02), role="lantern", k=0.9)

    # --- muelle de llegada ----------------------------------------------------------------
    mx0, my0 = lugar(Z, "muelle")
    DZ = 0.2
    with B.pieza("muelle"):
        y_land, y_end = -12.75, -10.45
        n = 12
        for i in range(n):
            y = y_land + (y_end - y_land) * (i + 0.5) / n
            z = max(DZ, B.gz(mx0, y) + 0.03)
            B.blob("deck", (0.4, 0.085, 0.035), B.at(mx0 + B.rng.uniform(-0.02, 0.02), y, z), 6.0, 3.0,
                   extra=B.rz(B.rng.uniform(-3, 3)), segs=20, rings=6)
        for y in (-11.9, -11.2, -10.55):
            for dx_ in (-0.36, 0.36):
                p = B.at(mx0 + dx_, y)
                B.tube("wood_dark", [p - Vector((0, 0, 0.3)), p + Vector((0, 0, DZ + 0.16))], 0.045, 10)
                B.blob("wood_dark", (0.05, 0.05, 0.02), p + Vector((0, 0, DZ + 0.16)), segs=10, rings=4)
        # cabo entre postes
        for dx_ in (-0.36, 0.36):
            a, b = B.at(mx0 + dx_, -11.2, DZ + 0.12), B.at(mx0 + dx_, -10.55, DZ + 0.12)
            B.tube("rope", [a, a.lerp(b, 0.5) - Vector((0, 0, 0.08)), b], 0.012, 6)
        P.bollard(B, mx0 + 0.25, -10.75)
        ring = B.at(mx0 - 0.4, -11.55, DZ + 0.02)
        B.torus("red", 0.1, 0.03, P.T(*ring) @ B.rz(0) @ P.rot("X", 90), nu=24, nv=8)

    # --- arco de entrada ---------------------------------------------------------------------
    ax, ay = lugar(Z, "arco")
    with B.pieza("arco"):
        ay = -12.15                                            # sobre el arranque del muelle
        z0 = max(DZ, B.gz(ax, ay))
        half = 0.52
        pa, pb = B.at(ax - half, ay, z0), B.at(ax + half, ay, z0)
        Hh = 1.35
        pts = []
        for i in range(19):
            t = i / 18
            pts.append(pa.lerp(pb, t) + Vector((0, 0, Hh * (1 - (2 * t - 1) ** 2) ** 0.35 if 0 < t < 1 else 0.0)))
        # dos postes gruesos y el arco de churro a franjas
        for q in (pa, pb):
            B.lathe("stage_wood", [(0, -0.05), (0.1, -0.05), (0.12, 0.08), (0, 0.1)], tuple(q), segs=16)
        for i in range(18):
            B.tube("band" if (i // 2) % 2 == 0 else "white", [pts[i], pts[i + 1]], 0.075, 10)
        # bombillas a lo largo del arco
        B.tube("wire", [q + Vector((0, 0, 0.0)) + P.mvec(0, 0.09) for q in pts], 0.007, 6)
        for q in pts[1:-1:2]:
            B.blob("bulb", (0.04, 0.04, 0.05), q + P.mvec(0, 0.1) - Vector((0, 0, 0.04)), segs=10, rings=6)
        B.luz(pts[9] + P.mvec(0, 0.3) - Vector((0, 0, 0.4)), (1.0, 0.72, 0.42), 20.0, ("atardecer", "noche"))
        arch_pts = pts
        # rótulo colgante
        c = pts[9] - Vector((0, 0, 0.32))
        m = P.T(*c) @ B.rz(90)
        B.tube("wire", [pts[7] - Vector((0, 0, 0.05)), c + P.mvec(-0.2, 0) + Vector((0, 0, 0.08))], 0.006, 6)
        B.tube("wire", [pts[11] - Vector((0, 0, 0.05)), c + P.mvec(0.2, 0) + Vector((0, 0, 0.08))], 0.006, 6)
        B.blob("canvas", (0.025, 0.3, 0.09), (0, 0, 0), 5.0, 5.0, extra=m, segs=16, rings=8)
        B.text("band", "ALL DAY", c + P.mvec(0, 0.03), g=90, size=0.12, depth=0.012, bevel=0.004)

    # --- taquilla ---------------------------------------------------------------------------
    with B.pieza("taquilla"):
        K = Fr(B, -0.5, -12.95, 70.0, dz=-0.03)
        K.blob("whitewash", (0.05, 0.34, 0.42), -0.3, 0, 0.42, 5.0, 6.0, segs=20, rings=10)          # fondo
        for v in (-0.34, 0.34):
            K.blob("whitewash", (0.3, 0.05, 0.42), 0.0, v, 0.42, 5.0, 6.0, segs=20, rings=10)       # costados
            K.blob("band", (0.3, 0.055, 0.05), 0.0, v, 0.2, 5.0, 3.0, segs=16, rings=6)
        K.blob("whitewash", (0.05, 0.34, 0.19), 0.28, 0, 0.19, 5.0, 6.0, segs=20, rings=10)        # frente bajo
        K.blob("band", (0.055, 0.35, 0.05), 0.28, 0, 0.2, 5.0, 3.0, segs=16, rings=6)
        K.blob("stage_wood", (0.11, 0.4, 0.025), 0.3, 0, 0.4, 6.0, 3.0, segs=20, rings=6)          # repisa
        if B.variante == "recuerdo":
            # evento terminado: la taquilla cierra con una persiana a rayas
            for i in range(5):
                K.blob("canvas" if i % 2 else "band", (0.03, 0.34, 0.035), 0.29, 0, 0.47 + 0.07 * i, 6.0, 3.0, segs=16, rings=6)
        else:
            # la taquillera, subida a un taburete, saluda
            hx, hy = K.xy(-0.05, 0.0)
            P.person(B, hx, hy, role="person_d", h=1.05, g=75.0, hair="hair", arms="wave", z=K.o.z + 0.12)
        # un taco de entradas y el bote
        for i in range(3):
            K.blob("sticker_a" if i % 2 else "paper", (0.05, 0.035, 0.006), 0.32, -0.22, 0.43 + 0.013 * i, 6.0, 2.0,
                   extra=P.rot("Z", 8 * i), segs=10, rings=4)
        K.lathe("glass", [(0, 0), (0.035, 0), (0.04, 0.08), (0, 0.08)], 0.32, 0.22, 0.42, segs=12)
        # tejadito a rayas
        for u, v in ((0.3, -0.36), (0.3, 0.36)):
            K.tube("wood_dark", [(u, v, 0.38), (u, v, 0.88)], 0.02, 6)
        for i in range(6):
            v = -0.4 + 0.16 * i
            K.blob("band" if i % 2 == 0 else "canvas", (0.44, 0.085, 0.045), 0.06, v, 0.92, 6.0, 2.0,
                   extra=P.rot("Y", -12), segs=14, rings=6)
        # letrero ENTRADAS de arcilla sobre el tejado
        for v in (-0.3, 0.3):
            K.tube("wood_dark", [(-0.1, v, 0.9), (-0.1, v, 1.12)], 0.014, 6)
        K.blob("canvas", (0.03, 0.42, 0.1), -0.1, 0, 1.16, 5.0, 5.0, segs=20, rings=8)
        B.text("band", "CERRADA" if B.variante == "recuerdo" else "ENTRADAS", K.p(-0.065, 0, 1.16), g=70.0, size=0.13,
               depth=0.014, bevel=0.005)
        K.blob("bulb", (0.03, 0.03, 0.035), 0.42, 0, 0.8, segs=10, rings=6)
        B.luz(K.p(0.6, 0, 0.75), (1.0, 0.75, 0.45), 6.0, ("atardecer", "noche"))

    # --- cartel del evento ------------------------------------------------------------------
    with B.pieza("cartel"):
        C = Fr(B, 2.1, -13.4, 100.0, dz=-0.03)
        for v in (-0.62, 0.62):
            C.tube("wood_dark", [(0, v, -0.05), (0, v, 1.35)], 0.035, 8)
        C.blob("wood", (0.05, 0.72, 0.42), 0, 0, 0.9, 6.0, 6.0, segs=28, rings=10)
        C.blob("canvas", (0.03, 0.66, 0.36), 0.03, 0, 0.9, 6.0, 6.0, segs=28, rings=10)
        if B.variante == "recuerdo":
            # el cartel pasa a recuerdo: fotos del evento y el rótulo RECUERDO
            B.text("band", "RECUERDO", C.p(0.07, 0, 1.1), g=100.0, size=0.2, depth=0.025, bevel=0.008)
            for i in range(4):
                v = -0.45 + 0.3 * i
                C.blob("photo_paper", (0.02, 0.12, 0.13), 0.05, v, 0.78, 6.0, 6.0, segs=12, rings=6)
                C.blob(("sea", "stage_magenta", "sand", "shallow")[i], (0.02, 0.09, 0.08), 0.065, v, 0.8, 6.0, 6.0, segs=12, rings=6)
            B.text("wood_dark", "muestra", C.p(0.07, 0, 0.58), g=100.0, size=0.08, depth=0.012, bevel=0.004)
        else:
            B.text("band", "ALL DAY", C.p(0.07, 0, 1.02), g=100.0, size=0.3, depth=0.03, bevel=0.01)
            B.text("ink", "BOIA", C.p(0.07, 0, 0.78), g=100.0, size=0.16, depth=0.02, bevel=0.006)
            B.text("wood_dark", "muestra", C.p(0.07, 0, 0.61), g=100.0, size=0.1, depth=0.012, bevel=0.004)
        # dos soles de pegatina a los lados
        for v in (-0.52, 0.52):
            C.blob("fiestera_band", (0.02, 0.06, 0.06), 0.06, v, 1.12, segs=12, rings=6)

    # --- palmeras -----------------------------------------------------------------------------
    tops = {}
    with B.pieza("palmeras"):
        for key, (x, y), lean, h in (("lb", (-2.2, -17.75), (-0.2, -0.1), 1.8), ("rb", (4.55, -17.2), (0.2, -0.15), 1.7),
                                     ("lf", (-2.95, -15.85), (-0.3, 0.1), 1.6), ("rf", (4.35, -13.25), (0.2, 0.2), 1.55)):
            tops[key] = P.palm(B, x, y, lean=lean, height=h)

    # --- guirnaldas perimetrales ---------------------------------------------------------------
    with B.pieza("guirnaldas"):
        d = Vector((0, 0, 0.2))
        P.garland(B, tops["lb"] - d, tops["lf"] - d, 11, 0.5, energy=3.0)
        P.garland(B, tops["rb"] - d, tops["rf"] - d, 11, 0.5, energy=3.0)
        P.garland(B, tops["lf"] - d, arch_pts[3], 11, 0.45, energy=3.0)
        P.garland(B, arch_pts[15], tops["rf"] - d, 9, 0.4, energy=3.0)

    # --- banderas -----------------------------------------------------------------------------
    with B.pieza("banderas"):
        for (u, v), role in (((-0.55, -W2 - 0.1), "flag"), ((-0.55, W2 + 0.1), "sticker_b")):
            q = S.p(u, v, ROOF + 0.1)
            P.flag(B, q, 0.75, 0.9, role=role, g=10)
        for (x, y), role in (((-2.75, -16.75), "fiestera_band"), ((5.3, -15.7), "flag")):
            P.flag(B, B.on(x, y, 0.0), 1.35, 1.0, role=role, g=10)

    # --- sombrillas y hamacas -----------------------------------------------------------------
    with B.pieza("sombrillas"):
        sombrilla(B, 3.45, -12.85, R=0.5, H=0.9, roles=("band", "canvas"), tilt=(8, -6))
        hamaca(B, 3.1, -12.62, 20.0)
        hamaca(B, 3.75, -12.6, 35.0, cushion=("shirt_b", "canvas"))
        sombrilla(B, 4.75, -14.05, R=0.45, H=0.85, roles=("shirt_b", "canvas"), tilt=(-6, 4))
        hamaca(B, 5.0, -13.8, 60.0)
        sombrilla(B, -1.45, -13.95, R=0.45, H=0.85, roles=("sticker_a", "canvas"), tilt=(5, 5))
        hamaca(B, -1.05, -13.6, 120.0, cushion=("sticker_a", "canvas"))
        # toalla y una pelota
        B.blob("band", (0.26, 0.13, 0.008), B.on(2.8, -14.25, 0.0), 6.0, 2.0, extra=B.rz(15), segs=16, rings=4)
        B.blob("canvas", (0.26, 0.04, 0.009), B.on(2.8, -14.25, 0.004), 6.0, 2.0, extra=B.rz(15), segs=16, rings=4)
        ball = B.on(3.25, -14.5, 0.08)
        B.blob("shirt_b", (0.08, 0.08, 0.08), ball, segs=16, rings=10)
        B.torus("white", 0.078, 0.012, P.T(*ball) @ P.rot("X", 90), nu=18, nv=6)
