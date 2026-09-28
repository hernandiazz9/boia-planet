"""Zona 5 · Puerto de Fotos (El Revelado): la galería de BOIA como lugar del mundo. MUESTRA.

Kiosco con forma de cámara antigua enorme mirando a cámara, marco de foto
gigante de pie en el agua por el que pasa el barco, tendedero de polaroids,
cuarto oscuro con bombilla roja, trípode con la fotógrafa, muelle pequeño,
palmeras y bombillas de flash en pie. De noche el cuarto oscuro brilla rojo y
los flashes se encienden.

Ajustes respecto a mapa.json: el marco va a (−6,25, −8,6) en vez de (−6,6, −8,6):
con 1,8 u de luz para el barco, su poste izquierdo caía sobre el bajío de la isla.
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


FWD = P.rot("Y", 90)          # lathe/torus: su eje Z pasa a mirar a +u (delante)


def rrect(cx, cz, w, h, r, n=5):
    """Rectángulo redondeado en el plano (v, w): lista cerrada de puntos (v, w)."""
    pts = []
    corners = ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270))
    for (x0, z0, a0) in corners:
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            pts.append((cx + x0 + r * math.cos(a), cz + z0 + r * math.sin(a)))
    return pts


def flash_stand(B, x, y, g, h=0.85, horas=("atardecer", "noche")):
    """Bombilla de flash en pie: trípode fino, paraguas reflector y bombilla."""
    F = Fr(B, x, y, g, dz=-0.02)
    for a in (0, 120, 240):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        F.tube("iron", [(0.16 * ca, 0.16 * sa, -0.02), (0, 0, h * 0.4)], 0.01, 6)
    F.tube("iron", [(0, 0, h * 0.38), (0, 0, h)], 0.013, 6)
    # reflector: cuenco metálico abierto hacia delante
    F.lathe("metal", [(0, -0.02), (0.05, -0.015), (0.11, 0.03), (0.14, 0.08), (0.13, 0.085), (0.1, 0.045), (0.045, 0.01), (0, 0.005)],
            0.02, 0, h + 0.1, extra=FWD @ P.rot("Z", 0), segs=20)
    F.blob("flash", (0.05, 0.05, 0.055), 0.08, 0, h + 0.1, segs=12, rings=8)
    q = F.p(0.2, 0, h + 0.1)
    B.luz(q, (0.9, 0.95, 1.0), 6.0, horas)


def build(B, Z, M):
    with B.pieza("isla"):
        B.isla(Z["islas"][0])

    # --- cámara-kiosco -------------------------------------------------------------------------
    cx, cy = lugar(Z, "camara")
    C = Fr(B, cx, cy, 90.0, dz=-0.04)
    with B.pieza("camara"):
        bw, bd, bh = 0.68, 0.34, 0.42            # semiejes del cuerpo
        zc = bh + 0.02
        C.blob("photo_body", (bd, bw, bh), 0.0, 0, zc, 5.0, 5.0, segs=40, rings=16)
        # placa superior metálica y bandas de piel
        C.blob("metal", (bd + 0.01, bw + 0.01, 0.07), 0.0, 0, zc + bh - 0.04, 5.0, 3.0, segs=40, rings=8)
        C.blob("metal", (bd + 0.01, bw + 0.01, 0.04), 0.0, 0, zc - bh + 0.05, 5.0, 3.0, segs=40, rings=6)
        # visor encima
        C.blob("photo_body", (0.2, 0.22, 0.12), -0.02, 0, zc + bh + 0.1, 4.0, 4.0, segs=24, rings=10)
        C.blob("metal", (0.21, 0.23, 0.025), -0.02, 0, zc + bh + 0.2, 4.0, 2.0, segs=24, rings=6)
        C.blob("photo_lens", (0.02, 0.1, 0.05), 0.2, 0, zc + bh + 0.1, 4.0, 4.0, segs=16, rings=8)
        # botón disparador
        C.lathe("metal", [(0, 0), (0.06, 0), (0.06, 0.04), (0, 0.04)], -0.05, 0.45, zc + bh - 0.01, segs=16)
        C.lathe("red", [(0, 0.04), (0.045, 0.04), (0.04, 0.08), (0, 0.09)], -0.05, 0.45, zc + bh - 0.01, segs=16)
        # rueda de arrastre
        C.lathe("metal", [(0, 0), (0.07, 0), (0.075, 0.03), (0.07, 0.05), (0, 0.05)], 0.02, 0.24, zc + bh - 0.01, segs=18)
        # objetivo: barril escalonado y cristal
        u0 = bd - 0.04
        C.lathe("photo_body", [(0, 0), (0.33, 0), (0.33, 0.12), (0.3, 0.14), (0.3, 0.26), (0.27, 0.28), (0, 0.28)],
                u0, 0, zc - 0.03, extra=FWD, segs=40)
        C.torus("metal", 0.3, 0.025, u0 + 0.13, 0, zc - 0.03, extra=FWD, nu=36, nv=8)
        C.torus("metal", 0.25, 0.03, u0 + 0.29, 0, zc - 0.03, extra=FWD, nu=36, nv=8)
        C.lathe("photo_lens", [(0, 0.26), (0.24, 0.26), (0.2, 0.31), (0.1, 0.335), (0, 0.34)], u0, 0, zc - 0.03, extra=FWD, segs=36)
        C.blob("ink", (0.02, 0.09, 0.09), u0 + 0.335, 0, zc - 0.03, segs=16, rings=8)
        C.blob("white", (0.015, 0.045, 0.03), u0 + 0.32, -0.1, zc + 0.08, extra=P.rot("X", -30), segs=12, rings=6)
        # correa
        C.tube("rope", [(0.0, -bw - 0.02, zc + 0.2), (0.0, -bw - 0.12, zc + 0.5), (0.0, -bw + 0.05, zc + bh + 0.35),
                        (0.0, 0.0, zc + bh + 0.42), (0.0, bw - 0.05, zc + bh + 0.35), (0.0, bw + 0.12, zc + 0.5),
                        (0.0, bw + 0.02, zc + 0.2)], 0.022, 8)
        # flash en lo alto: zapata, bombilla y reflector
        C.blob("metal", (0.06, 0.07, 0.03), -0.02, -0.42, zc + bh + 0.03, 5.0, 3.0, segs=14, rings=6)
        C.tube("metal", [(-0.02, -0.42, zc + bh + 0.05), (-0.02, -0.42, zc + bh + 0.22)], 0.018, 6)
        C.lathe("metal", [(0, -0.02), (0.06, -0.01), (0.14, 0.05), (0.17, 0.1), (0.16, 0.105), (0.12, 0.06), (0.05, 0.015), (0, 0.01)],
                0.0, -0.42, zc + bh + 0.32, extra=FWD, segs=24)
        C.blob("flash", (0.06, 0.06, 0.07), 0.07, -0.42, zc + bh + 0.32, segs=14, rings=8)
        B.luz(C.p(0.3, -0.42, zc + bh + 0.35), (0.92, 0.96, 1.0), 10.0, ("atardecer", "noche"))
        # ventanilla del kiosco en el costado derecho, con repisa
        C.blob("photo_paper", (0.2, 0.02, 0.14), 0.02, bw - 0.005, zc + 0.02, 4.0, 4.0, segs=16, rings=8)
        C.blob("ink", (0.16, 0.02, 0.1), 0.02, bw + 0.005, zc + 0.02, 4.0, 4.0, segs=16, rings=8)
        C.blob("wood", (0.22, 0.07, 0.018), 0.02, bw + 0.06, zc - 0.13, 5.0, 3.0, segs=16, rings=6)
        # letras en la franja de abajo
        B.text("white", "FOTOS", C.p(bd + 0.005, -0.44, zc - bh + 0.16), g=90.0, size=0.1, depth=0.01, bevel=0.004)
        B.luz(C.p(0.9, 0.3, 0.9), (1.0, 0.78, 0.5), 6.0, ("atardecer", "noche"))

    # --- marco gigante en el agua ------------------------------------------------------------------
    mx, my = lugar(Z, "marco")
    mx += 0.35
    with B.pieza("marco"):
        F = Fr(B, mx, my, 90.0, z=0.0)
        W, H, zc = 2.1, 2.25, 1.02                  # por fuera; luz ≈ 1,8 × 2,0
        outer = [(0.0, v, w) for v, w in rrect(0, zc, W, H, 0.3)]
        inner = [(0.03, v, w) for v, w in rrect(0, zc, W - 0.26, H - 0.26, 0.2)]
        F.B.tube("gold", [F.p(*q) for q in outer], 0.1, segs=12, closed=True)
        F.B.tube("wood", [F.p(*q) for q in inner], 0.05, segs=10, closed=True)
        # adornos en las esquinas y una concha arriba
        for s in (-1, 1):
            for t in (-1, 1):
                F.blob("gold", (0.07, 0.13, 0.13), 0.02, s * (W / 2 - 0.1), zc + t * (H / 2 - 0.1), segs=14, rings=8)
                F.blob("coin", (0.03, 0.06, 0.06), 0.1, s * (W / 2 - 0.1), zc + t * (H / 2 - 0.1), segs=12, rings=6)
        for k in range(5):
            a = math.radians(-60 + 30 * k)
            F.blob("gold", (0.05, 0.05, 0.16), 0.02, 0.1 * math.sin(a), zc + H / 2 + 0.06 + 0.07 * math.cos(a),
                   extra=P.rot("X", -math.degrees(a)), segs=12, rings=6)
        # postes clavados y boyas flotando al pie
        for s in (-1, 1):
            v = s * (W / 2 + 0.02)
            F.tube("wood_dark", [(-0.05, v, -0.4), (-0.05, v, 0.35)], 0.06, 10)
            F.lathe("red", [(0, -0.07), (0.15, -0.07), (0.17, 0.02), (0.13, 0.08), (0, 0.09)], -0.05, v, 0.0, segs=18)
            F.torus("white", 0.16, 0.025, -0.05, v, 0.0, nu=20, nv=6)
            x_, y_ = F.xy(-0.05, v)
            P.ripple(B, x_, y_, 0.28, 1)
        # un cartelito colgando: ¡SONRÍE!
        c = F.p(0.02, 0, zc + H / 2 - 0.36)
        F.tube("wire", [(0.02, -0.25, zc + H / 2 - 0.1), (0.02, -0.28, zc + H / 2 - 0.3)], 0.006, 6)
        F.tube("wire", [(0.02, 0.25, zc + H / 2 - 0.1), (0.02, 0.28, zc + H / 2 - 0.3)], 0.006, 6)
        F.blob("photo_paper", (0.025, 0.36, 0.08), 0.02, 0, zc + H / 2 - 0.36, 5.0, 5.0, segs=18, rings=8)
        B.text("ink", "¡SONRÍE!", c + P.mdir(90) * 0.035, g=90.0, size=0.11, depth=0.01, bevel=0.004)

    # --- tendedero de polaroids --------------------------------------------------------------------
    tx, ty = lugar(Z, "tendedero")
    with B.pieza("tendedero"):
        pa, pb = B.on(tx - 0.85, ty + 0.05, -0.03), B.on(tx + 0.5, ty - 0.03, -0.03)
        Hh = 0.72
        for q in (pa, pb):
            B.tube("wood_dark", [q, q + Vector((0, 0, Hh + 0.06))], 0.025, 8)
            B.blob("wood", (0.035, 0.035, 0.025), q + Vector((0, 0, Hh + 0.07)), segs=8, rings=4)
        a, b = pa + Vector((0, 0, Hh)), pb + Vector((0, 0, Hh))
        sag = 0.09

        def on_line(t):
            return a.lerp(b, t) - Vector((0, 0, sag * math.sin(math.pi * t)))
        B.tube("wire", [on_line(i / 10) for i in range(11)], 0.006, 6)
        D = P.mdir(90)
        Rt = D.cross(UP).normalized()
        pics = ("sticker_b", "shirt_a", "pea", "jelly", "sticker_a", "photo_lens", "person_e")
        for i, role in enumerate(pics):
            t = (i + 1) / (len(pics) + 1)
            top = on_line(t)
            tilt = (-8, 6, -3, 9, -6, 4, -9)[i]
            m = P.T(*(top - Vector((0, 0, 0.12)))) @ P.basis(Rt, D, UP) @ P.rot("Y", tilt)
            m = m @ P.T(0, 0, -0.02)
            B.blob("photo_paper", (0.085, 0.008, 0.105), (0, 0, 0), 6.0, 6.0, extra=m, segs=14, rings=8)
            B.blob(role, (0.068, 0.006, 0.068), (0, 0, 0), 6.0, 6.0, extra=m @ P.T(0, 0.006, 0.02), segs=12, rings=6)
            # un sol o una figura dentro de la foto
            B.blob("white" if role not in ("sticker_a", "photo_lens") else "ink", (0.02, 0.004, 0.02), (0, 0, 0),
                   extra=m @ P.T(0.022, 0.011, 0.04), segs=10, rings=4)
            B.blob("wood" if i % 2 else "red", (0.012, 0.012, 0.028), top + D * 0.01 - Vector((0, 0, 0.02)), segs=8, rings=4)

    # --- cuarto oscuro -----------------------------------------------------------------------------
    rx, ry = lugar(Z, "cuarto")
    with B.pieza("cuarto"):
        R = Fr(B, rx, ry, 80.0, dz=-0.04)
        R.blob("darkroom", (0.38, 0.4, 0.36), 0.0, 0, 0.36, 5.0, 6.0, segs=28, rings=12)
        R.blob("photo_body", (0.46, 0.5, 0.09), 0.0, 0, 0.76, 4.0, 2.0, segs=28, rings=8)          # tejado negro blando
        R.blob("photo_body", (0.3, 0.34, 0.08), -0.02, 0, 0.84, 3.0, 2.0, segs=24, rings=8)
        R.lathe("metal", [(0, 0), (0.05, 0), (0.05, 0.12), (0.07, 0.14), (0, 0.15)], -0.15, -0.2, 0.86, segs=12)  # chimenea
        # puerta con cortina negra
        R.blob("ink", (0.03, 0.14, 0.24), 0.37, 0.05, 0.25, 4.0, 5.0, segs=16, rings=10)
        R.blob("wood_dark", (0.035, 0.17, 0.02), 0.37, 0.05, 0.5, 5.0, 3.0, segs=16, rings=6)
        for k in range(3):
            R.blob("photo_body", (0.012, 0.035, 0.2), 0.395, -0.05 + 0.05 * k, 0.27, 3.0, 4.0, segs=10, rings=8)
        # bombilla roja sobre la puerta
        R.blob("wood_dark", (0.04, 0.05, 0.05), 0.38, 0.05, 0.6, segs=10, rings=6)
        R.blob("red_light", (0.06, 0.06, 0.07), 0.45, 0.05, 0.62, segs=12, rings=8)
        B.luz(R.p(0.65, 0.05, 0.65), (1.0, 0.18, 0.12), 14.0, ("atardecer", "noche"))
        # ventanuco rojo en el costado
        R.blob("red_light", (0.1, 0.02, 0.07), 0.08, 0.4, 0.5, 4.0, 4.0, segs=12, rings=6)
        R.blob("photo_body", (0.12, 0.022, 0.018), 0.08, 0.405, 0.5, 4.0, 2.0, segs=12, rings=4)
        # cubetas de revelado apiladas fuera
        for k, role in enumerate(("sticker_b", "red", "pea")):
            R.blob(role, (0.1, 0.14, 0.022), 0.25, -0.55, R.gw(0.25, -0.55) + 0.025 + 0.045 * k, 6.0, 3.0, segs=16, rings=6)

    # --- trípode y fotógrafa -------------------------------------------------------------------------
    ax, ay = -7.75, -8.95
    aim = math.degrees(math.atan2((my) - ay, (mx) - ax))
    with B.pieza("tripode"):
        Tp = Fr(B, ax, ay, aim, dz=-0.02)
        top = 0.62
        for a in (0, 120, 240):
            ca, sa = math.cos(math.radians(a + 60)), math.sin(math.radians(a + 60))
            Tp.tube("wood", [(0.2 * ca, 0.2 * sa, -0.02), (0.02 * ca, 0.02 * sa, top)], 0.015, 6)
        Tp.blob("iron", (0.05, 0.05, 0.03), 0, 0, top + 0.01, segs=12, rings=6)
        Tp.blob("photo_body", (0.09, 0.14, 0.08), 0, 0, top + 0.1, 5.0, 5.0, segs=18, rings=8)
        Tp.blob("metal", (0.095, 0.145, 0.02), 0, 0, top + 0.17, 5.0, 3.0, segs=18, rings=6)
        Tp.lathe("photo_body", [(0, 0), (0.06, 0), (0.06, 0.08), (0, 0.08)], 0.07, 0, top + 0.09, extra=FWD, segs=18)
        Tp.lathe("photo_lens", [(0, 0.08), (0.05, 0.08), (0.03, 0.1), (0, 0.105)], 0.07, 0, top + 0.09, extra=FWD, segs=18)
        Tp.blob("flash", (0.03, 0.03, 0.035), -0.02, -0.08, top + 0.23, segs=10, rings=6)
    with B.pieza("fotografa"):
        fx, fy = Tp.xy(-0.12, -0.32)
        head = P.person(B, fx, fy, role="person_c", h=1.1, g=80.0, hair="hair", arms="wave")
        # boina
        B.blob("photo_body", (0.075, 0.075, 0.025), head + Vector((0, 0, 0.055)) - P.mdir(80) * 0.01, segs=14, rings=6)
        B.blob("photo_body", (0.012, 0.012, 0.02), head + Vector((0, 0, 0.085)), segs=8, rings=4)
        # cámara colgada al cuello
        B.blob("photo_body", (0.035, 0.05, 0.03), head - Vector((0, 0, 0.19)) + P.mdir(80) * 0.085, extra=B.rz(80), segs=12, rings=6)
        P.bubble_sign(B, head + Vector((0, 0, 0.3)) + P.mvec(0.34, 0.25), k=0.7, g=90.0)

    # --- muelle pequeño -------------------------------------------------------------------------------
    with B.pieza("muelle"):
        g = 72.0
        Mf = Fr(B, -9.0, -8.35, g, z=0.0)
        DZ = 0.2
        n = 8
        for i in range(n):
            u = 0.1 + 1.3 * (i + 0.5) / n
            z = max(DZ, Mf.gw(u, 0) + 0.03)
            Mf.blob("deck", (0.075, 0.3, 0.032), u, B.rng.uniform(-0.015, 0.015), z, 3.0, 6.0,
                    extra=P.rot("Z", B.rng.uniform(-3, 3)), segs=16, rings=6)
        for u in (0.75, 1.35):
            for v in (-0.28, 0.28):
                Mf.tube("wood_dark", [(u, v, -0.3), (u, v, DZ + 0.15)], 0.04, 10)
                Mf.blob("wood_dark", (0.045, 0.045, 0.02), u, v, DZ + 0.15, segs=10, rings=4)
        Mf.tube("rope", [(1.35, 0.28, DZ + 0.1), (1.05, 0.34, DZ + 0.02), (0.75, 0.28, DZ + 0.1)], 0.012, 6)

    # --- palmeras -------------------------------------------------------------------------------------
    with B.pieza("palmeras"):
        P.palm(B, -11.45, -10.2, lean=(-0.25, -0.1), height=1.7)
        P.palm(B, -8.45, -11.35, lean=(0.2, -0.2), height=1.5)
        P.bush(B, -11.0, -11.0, 0.2)

    # --- bombillas de flash en pie ----------------------------------------------------------------------
    with B.pieza("flashes"):
        flash_stand(B, -10.85, -10.85, 60.0, h=0.8)
        flash_stand(B, -8.75, -10.75, 120.0, h=0.9)
        flash_stand(B, -7.2, -9.75, 150.0, h=0.7)
