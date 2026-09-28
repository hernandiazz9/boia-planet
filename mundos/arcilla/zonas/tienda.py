"""Zona 6 · Isla tienda (La Botiga): escaparate de la tienda externa de BOIA. MUESTRA.

Kiosco encalado con toldo a rayas y mostrador, la tendera detrás, rollos de
pegatinas en el mostrador, tote bags colgadas de una barra, tendedero de
camisetas al viento, cajas, una palmera y el cartel TIENDA. De noche, una
bombilla bajo el toldo ilumina el mostrador.

Ajustes respecto a mapa.json: el cartel va a (7,55, −0,05) en vez de (7,8, 0,0),
porque con 0,9 u de ancho se salía por la orilla.
"""
import math

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


def camiseta(B, c, g, role, k=1.0, sway=0.0, print_role="white"):
    """Camiseta de arcilla colgada (centro c en Blender), de cara al ángulo g."""
    D = P.mdir(g)
    Rt = D.cross(UP).normalized()
    m = P.T(*c) @ P.basis(Rt, D, UP) @ P.rot("Y", sway)
    B.blob(role, (0.11 * k, 0.018 * k, 0.13 * k), (0, 0, 0), 4.0, 5.0, extra=m, segs=16, rings=10)
    for s in (-1, 1):
        B.blob(role, (0.06 * k, 0.016 * k, 0.045 * k), (0, 0, 0),
               extra=m @ P.T(s * 0.12 * k, 0, 0.08 * k) @ P.rot("Y", s * 35), segs=12, rings=6)
    B.blob("skin" if role != "white" else "ink", (0.03 * k, 0.02 * k, 0.012 * k), (0, 0, 0), extra=m @ P.T(0, 0.004, 0.125 * k),
           segs=10, rings=4)
    # estampado: un sol redondo
    B.blob(print_role, (0.04 * k, 0.012 * k, 0.04 * k), (0, 0, 0), extra=m @ P.T(0, 0.012 * k, 0.01 * k), segs=12, rings=6)
    return m @ Vector((0, 0, 0.13 * k))


def pinza(B, q):
    B.blob("wood", (0.012, 0.012, 0.03), q, segs=8, rings=4)


def build(B, Z, M):
    with B.pieza("isla"):
        B.isla(Z["islas"][0])

    kx, ky = lugar(Z, "kiosco")
    K = Fr(B, kx, ky, 90.0, dz=-0.04)

    # --- kiosco con toldo a rayas ---------------------------------------------------------
    with B.pieza("kiosco"):
        KH = 0.56                                   # media altura de la caseta
        K.blob("whitewash", (0.34, 0.55, KH), -0.3, 0, KH, 5.0, 6.0, segs=28, rings=12)
        K.blob("band", (0.35, 0.56, 0.05), -0.3, 0, 0.12, 5.0, 3.0, segs=28, rings=6)            # zócalo naranja
        K.blob("canvas", (0.4, 0.62, 0.08), -0.3, 0, 2 * KH + 0.04, 5.0, 2.0, segs=28, rings=8)  # tejado blando
        K.blob("band", (0.3, 0.5, 0.07), -0.32, 0, 2 * KH + 0.11, 3.0, 2.0, segs=24, rings=8)
        # hueco oscuro del escaparate, detrás de la tendera
        K.blob("wood_dark", (0.03, 0.42, 0.24), 0.04, 0, 0.62, 5.0, 5.0, segs=20, rings=8)
        K.blob("ink", (0.02, 0.38, 0.2), 0.055, 0, 0.62, 5.0, 5.0, segs=20, rings=8)
        # balda del escaparate con camisetas dobladas
        K.blob("wood", (0.05, 0.38, 0.012), 0.06, 0, 0.72, 5.0, 3.0, segs=16, rings=4)
        for i, v in enumerate((-0.27, -0.13, 0.13, 0.27)):
            K.blob(("shirt_a", "shirt_b", "tote", "shirt_a")[i], (0.04, 0.06, 0.03), 0.07, v, 0.76, 5.0, 3.0, segs=12, rings=6)
        # toldo a rayas: ocho franjas que caen hacia delante y borde festoneado
        n = 8
        for i in range(n):
            v = -0.62 + (1.24) * (i + 0.5) / n
            role = "band" if i % 2 == 0 else "canvas"
            K.blob(role, (0.31, 1.24 / n / 2 + 0.004, 0.025), 0.33, v, 1.13, 6.0, 2.0, extra=P.rot("Y", 16), segs=16, rings=6)
            K.blob(role, (0.02, 1.24 / n / 2 - 0.01, 0.06), 0.63, v, 1.0, 2.0, 2.0, segs=14, rings=8)
        for v in (-0.6, 0.6):
            K.tube("wood_dark", [(0.6, v, 0.0), (0.6, v, 1.04)], 0.022, 8)
        # la bombilla bajo el toldo
        K.tube("wire", [(0.36, 0, 1.12), (0.36, 0, 0.98)], 0.006, 6)
        K.blob("bulb", (0.04, 0.04, 0.05), 0.36, 0, 0.93, segs=12, rings=8)
        B.luz(K.p(0.42, 0, 0.82), (1.0, 0.76, 0.45), 14.0, ("atardecer", "noche"))

    # --- mostrador ------------------------------------------------------------------------
    with B.pieza("mostrador"):
        K.blob("wood", (0.11, 0.52, 0.17), 0.42, 0, 0.17, 6.0, 6.0, segs=28, rings=10)
        for i in range(-4, 5):
            K.blob("wood_dark", (0.012, 0.01, 0.14), 0.53, i * 0.11, 0.17, 3.0, 4.0, segs=8, rings=6)
        K.blob("stage_wood", (0.15, 0.56, 0.025), 0.42, 0, 0.35, 6.0, 3.0, segs=28, rings=6)
        # caja registradora de arcilla
        K.blob("sticker_b", (0.06, 0.08, 0.045), 0.4, -0.36, 0.42, 5.0, 4.0, segs=14, rings=8)
        K.blob("white", (0.02, 0.06, 0.015), 0.44, -0.36, 0.47, 4.0, 3.0, extra=P.rot("Y", -30), segs=10, rings=4)

    # --- rollos de pegatinas ---------------------------------------------------------------
    with B.pieza("pegatinas"):
        for j, (u, v, n) in enumerate(((0.44, -0.12, 4), (0.44, 0.06, 3), (0.4, 0.22, 5))):
            for i in range(n):
                role = "sticker_a" if (i + j) % 2 == 0 else "sticker_b"
                K.lathe(role, [(0, 0), (0.055, 0), (0.058, 0.012), (0.055, 0.026), (0, 0.026)], u, v, 0.375 + 0.028 * i, segs=18)
            K.lathe("white", [(0, 0), (0.018, 0), (0.018, 0.006), (0, 0.006)], u, v, 0.375 + 0.028 * n, segs=10)
        # una pegatina suelta pegada al frente del mostrador
        K.blob("sticker_a", (0.01, 0.05, 0.05), 0.535, 0.3, 0.2, segs=14, rings=8)
        K.blob("sticker_b", (0.01, 0.04, 0.04), 0.535, -0.28, 0.14, segs=14, rings=8)

    # --- la tendera ---------------------------------------------------------------------------
    with B.pieza("tendera"):
        K.blob("wood_dark", (0.12, 0.3, 0.06), 0.17, 0, 0.05, 6.0, 4.0, segs=16, rings=6)       # tarimilla
        tx, ty = K.xy(0.17, 0.05)
        P.person(B, tx, ty, role="person_b", h=1.1, g=90.0, hair="hair", arms="wave", z=K.o.z + 0.12)

    # --- tote bags colgadas ------------------------------------------------------------------
    with B.pieza("totes"):
        # percha de pie a la derecha del kiosco, de cara a cámara
        R = Fr(B, 7.6, -1.15, 90.0, dz=-0.03)
        Hr = 0.72
        for v in (-0.36, 0.36):
            gw = R.gw(0, v)
            R.tube("wood_dark", [(0, v, gw - 0.03), (0, v, gw + Hr + 0.04)], 0.018, 6)
            R.blob("wood", (0.028, 0.028, 0.02), 0, v, gw + Hr + 0.05, segs=8, rings=4)
        R.tube("wood_dark", [(0, -0.38, Hr), (0, 0.38, Hr)], 0.015, 6)
        prints = ("band", "sticker_b", "ink")
        D = P.mdir(90.0)
        Rt = D.cross(UP).normalized()
        for i, v in enumerate((-0.22, 0.0, 0.22)):
            m = R.m @ P.T(0.02, v, Hr - 0.19) @ P.rot("X", (-5, 4, -3)[i])
            c = m @ Vector((0, 0, 0))
            mb = P.T(*c) @ P.basis(Rt, D, UP) @ P.rot("Y", (-6, 5, -3)[i])
            B.blob("tote", (0.085, 0.012, 0.1), (0, 0, 0), 5.0, 5.0, extra=mb, segs=14, rings=8)
            B.torus("tote", 0.045, 0.008, mb @ P.T(0, 0, 0.11) @ P.rot("X", 90), nu=16, nv=6)
            B.blob(prints[i], (0.035, 0.005, 0.035), (0, 0, 0), extra=mb @ P.T(0, 0.012, -0.01), segs=12, rings=6)

    # --- tendedero de camisetas ----------------------------------------------------------------
    with B.pieza("camisetas"):
        pa, pb = B.on(5.2, -0.8, -0.03), B.on(6.05, -0.05, -0.03)
        H = 0.78
        for q in (pa, pb):
            B.tube("wood_dark", [q, q + Vector((0, 0, H + 0.05))], 0.02, 8)
            B.blob("wood", (0.03, 0.03, 0.02), q + Vector((0, 0, H + 0.06)), segs=8, rings=4)
        a, b = pa + Vector((0, 0, H)), pb + Vector((0, 0, H))
        line = [a.lerp(b, t) - Vector((0, 0, 0.08 * math.sin(math.pi * t))) for t in (0, 0.2, 0.4, 0.6, 0.8, 1.0)]
        B.tube("wire", line, 0.006, 6)
        g_line = 90.0 + 42.0
        for i, t in enumerate((0.2, 0.44, 0.68, 0.88)):
            top = a.lerp(b, t) - Vector((0, 0, 0.08 * math.sin(math.pi * t)))
            role = "shirt_a" if i % 2 == 0 else "shirt_b"
            pr = "white" if role == "shirt_b" else "sticker_a"
            c = top - Vector((0, 0, 0.13)) + P.mdir(g_line) * 0.02
            camiseta(B, c, g_line, role, k=1.0, sway=(-8, 6, -4, 10)[i], print_role=pr)
            for s in (-1, 1):
                pinza(B, top + P.mdir(g_line - 90) * 0.07 * s - Vector((0, 0, 0.005)))

    # --- cajas -----------------------------------------------------------------------------------
    with B.pieza("cajas"):
        for (u, v, dz, s, g) in ((-0.2, -0.82, 0.0, 0.13, 8), (0.12, -0.8, 0.0, 0.11, -12), (-0.15, -0.82, 0.25, 0.1, 25)):
            gw = K.gw(u, v)
            q = K.p(u, v, gw + s + dz)
            P.crate(B, q, s, g=g)
        # una caja abierta con camisetas asomando
        gw = K.gw(0.32, -0.62)
        c = K.p(0.32, -0.62, gw + 0.07)
        B.blob("tote", (0.1, 0.13, 0.07), c, 6.0, 6.0, extra=B.rz(80), segs=16, rings=8)
        B.blob("shirt_a", (0.08, 0.1, 0.03), c + Vector((0, 0, 0.07)), 4.0, 2.0, extra=B.rz(70), segs=12, rings=6)
        B.blob("shirt_b", (0.06, 0.09, 0.03), c + Vector((0, 0, 0.1)) + P.mvec(0.03, 0.02), 4.0, 2.0, extra=B.rz(100),
               segs=12, rings=6)

    # --- palmera ---------------------------------------------------------------------------------
    with B.pieza("palmera"):
        P.palm(B, 7.35, -2.25, lean=(0.25, -0.1), height=1.6)
        P.bush(B, 8.0, -1.85, 0.16)

    # --- cartel TIENDA ---------------------------------------------------------------------------
    with B.pieza("cartel"):
        cx, cy = lugar(Z, "cartel")
        cx, cy = cx - 0.25, cy - 0.05
        P.sign(B, cx, cy, "TIENDA", g=90.0, w=0.86, h=0.3, post_h=0.4, board="canvas", ink="band", size=0.19)
        B.blob("sticker_a", (0.04, 0.04, 0.04), B.on(cx + 0.43, cy, 0.78), segs=10, rings=6)
