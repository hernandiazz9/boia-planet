"""Zona 3 · Encuentro de la Boia Fiestera (El Remanso de los Cocodrilos). MUESTRA.

En mar abierto, sin isla: la Boia Fiestera flota en el centro con sus globos y
su guirnalda, pidiendo ayuda con la boca en «O»; cuatro cocodrilos la rodean
mirándola (uno ya se sumerge, con ondas y burbujas), entre matas de posidonia
flotante y tres rocas del remanso.
"""
import math

from mathutils import Matrix, Vector

import piezas as P

UP = Vector((0, 0, 1))


def lugar(Z, lid):
    return next(lg["pos"] for lg in Z["lugares"] if lg["id"] == lid)


def on_surface(n, p):
    """Matriz con +Z local en la dirección n, en el punto p (para pegar cosas a una superficie)."""
    return P.T(*p) @ n.to_track_quat("Z", "Y").to_matrix().to_4x4()


def ell_point(c, a, cz, th, ph):
    """Punto y normal de un elipsoide (a, a, cz) centrado en c; th = ángulo horizontal (Blender), ph = latitud."""
    cp, sp = math.cos(ph), math.sin(ph)
    p = Vector(c) + Vector((a * cp * math.cos(th), a * cp * math.sin(th), cz * sp))
    n = Vector((cp * math.cos(th) / a, cp * math.sin(th) / a, sp / cz)).normalized()
    return p + n * 0.012, n   # el blob (q = 2,2) abomba un poco más que el elipsoide


def fiestera(B, x, y, k=1.5, g=90.0):
    """La Boia Fiestera: boia-personaje con gorro, cara que pide ayuda, brazos arriba y guirnalda.
    Devuelve (mano derecha, punta del gorro) para atar los globos."""
    base = B.at(x, y, 0.0)
    D = P.mdir(g)
    Rt = D.cross(UP).normalized()
    a, c, zc = 0.32 * k, 0.36 * k, 0.26 * k
    C = base + Vector((0, 0, zc))
    # cuerpo: huevo blando rosa coral, hundido en el agua por abajo
    B.blob("fiestera", (a, a, c), C, 2.0, 2.2, segs=36, rings=18)
    # franja amarilla gruesa en la línea de flotación
    zb = 0.09 * k
    rb = a * math.sqrt(max(0.0, 1 - ((zb - zc) / c) ** 2))
    B.torus("fiestera_band", rb + 0.01 * k, 0.05 * k, P.T(*(base + Vector((0, 0, zb)))), nu=40, nv=10)
    # lunares por detrás y los lados (la cara queda limpia)
    th_face = math.atan2(D.y, D.x)
    n_dots = 0
    for i in range(22):
        th = th_face + math.radians(40 + (i * 137.5) % 280)
        ph = math.radians(-8 + ((i * 53) % 70))
        p, n = ell_point(C, a, c, th, ph)
        if p.z < zb + 0.07 * k:
            continue
        role = "white" if i % 2 else "fiestera_band"
        B.blob(role, (0.042 * k, 0.042 * k, 0.012 * k), (0, 0, 0), extra=on_surface(n, p), segs=12, rings=6)
        n_dots += 1
        if n_dots >= 12:
            break
    # cara: ojos grandes mirando a cámara y boca abierta en «O» pidiendo ayuda
    P.eyes(B, C + Vector((0, 0, 0.02 * k)), g, 0.335 * k, sep=0.36, up=0.3, size=0.3, look=(0.0, 0.15))
    nm = (D - UP * 0.2).normalized()
    pm, _ = ell_point(C, a, c, th_face, math.asin(nm.z) * 1.1)
    pm = pm + nm * 0.004 * k
    B.blob("darkroom", (0.062 * k, 0.078 * k, 0.014 * k), (0, 0, 0), extra=on_surface(nm, pm), segs=14, rings=6)
    B.torus("ink", 1.0, 0.3, on_surface(nm, pm + nm * 0.004 * k) @ Matrix.Diagonal((0.07 * k, 0.086 * k, 0.03 * k, 1)),
            nu=24, nv=8)
    # mofletes
    for side in (-1, 1):
        th = th_face + side * math.radians(40)
        p, n = ell_point(C, a, c, th, math.radians(2))
        B.blob("jelly", (0.045 * k, 0.035 * k, 0.01 * k), (0, 0, 0), extra=on_surface(n, p), segs=12, rings=6)
    # gorro de fiesta: cono de rayas azul y amarillo, algo ladeado, con pompón
    top = C + Vector((0, 0, c * 0.92))
    tilt = P.basis(Rt, D, UP) @ P.rot("Y", 14) @ P.rot("X", -8)
    H, R0, n_str = 0.46 * k, 0.15 * k, 5
    for i in range(n_str):
        z0, z1 = H * i / n_str, H * (i + 1) / n_str
        r0, r1 = R0 * (1 - z0 / H), R0 * (1 - z1 / H)
        role = "firework_c" if i % 2 == 0 else "fiestera_band"
        prof = [(0, z0), (r0, z0), (r1 + 0.004 * k, z1), (0, z1)] if i < n_str - 1 else [(0, z0), (r0, z0), (0.01 * k, z1), (0, z1)]
        B.lathe(role, prof, tuple(top), segs=24, extra=tilt)
    B.torus("white", R0 * 0.98, 0.022 * k, P.T(*top) @ tilt @ P.T(0, 0, 0.01 * k), nu=24, nv=6)
    tip = top + (tilt.to_3x3() @ Vector((0, 0, H + 0.03 * k)))
    B.blob("white", (0.06 * k, 0.06 * k, 0.055 * k), tip, segs=14, rings=8)
    # brazos-churro cortos, levantados, con manos blancas
    hands = []
    for side in (-1, 1):
        sh = C + Rt * side * a * 0.9 + Vector((0, 0, 0.02 * k)) + D * 0.04 * k
        el = sh + Rt * side * 0.13 * k + Vector((0, 0, 0.07 * k)) + D * 0.03 * k
        hand = el + Rt * side * 0.05 * k + Vector((0, 0, 0.17 * k)) + D * 0.02 * k
        B.tube("fiestera", [sh - Rt * side * 0.05 * k, sh, el, hand], [0.05 * k, 0.045 * k, 0.04 * k, 0.038 * k], segs=10)
        B.blob("white", (0.052 * k, 0.045 * k, 0.055 * k), hand + Vector((0, 0, 0.02 * k)), segs=12, rings=8)
        for f in (-1, 1):   # dos dedos abiertos: saluda para pedir ayuda
            q = hand + Vector((0, 0, 0.06 * k)) + Rt * side * f * 0.025 * k
            B.tube("white", [hand + Vector((0, 0, 0.03 * k)), q + Rt * side * f * 0.012 * k], [0.018 * k, 0.014 * k], segs=6)
        hands.append(hand)
    # mini guirnalda de bombillas colgando alrededor de la franja
    n_b = 12
    ring_r = rb + 0.075 * k
    pts = []
    for i in range(n_b * 4 + 1):
        t = i / (n_b * 4)
        th = 2 * math.pi * t
        sag = abs(math.sin(math.pi * n_b * t))
        rr = ring_r + 0.012 * k * sag
        pts.append(base + Vector((rr * math.cos(th), rr * math.sin(th), zb + 0.05 * k - 0.05 * k * sag)))
    B.tube("wire", pts, 0.006 * k, segs=5, closed=False)
    bulbs = ("bulb", "stage_magenta", "lantern")
    for i in range(n_b):
        th = 2 * math.pi * (i + 0.5) / n_b
        q = base + Vector(((ring_r + 0.02 * k) * math.cos(th), (ring_r + 0.02 * k) * math.sin(th), zb - 0.03 * k))
        B.blob(bulbs[i % 3], (0.03 * k, 0.03 * k, 0.038 * k), q, segs=10, rings=6)
    B.luz(base + D * 0.6 + Vector((0, 0, 0.5 * k)), (1.0, 0.62, 0.55), 28.0, ("atardecer", "noche"))
    return hands, tip


def balloon(B, knot, pos, role):
    """Globo de arcilla con nudo y cuerda (wire) hasta knot."""
    p = Vector(pos)
    B.blob(role, (0.15, 0.15, 0.19), p, 2.0, 2.2, segs=20, rings=12)
    B.blob("white", (0.03, 0.02, 0.045), p + Vector((-0.06, 0.06, 0.08)), segs=8, rings=6)   # brillo
    nk = p - Vector((0, 0, 0.2))
    B.lathe(role, [(0, -0.035), (0.028, -0.03), (0.012, 0.0), (0, 0.01)], tuple(nk), segs=10)
    a, b = Vector(knot), nk - Vector((0, 0, 0.03))
    w = Vector((0.03, -0.03, 0))
    pts = [a, a.lerp(b, 0.33) + w, a.lerp(b, 0.66) - w, b]
    B.tube("wire", pts, 0.006, segs=5)


def posidonia_mat(B, x, y, s=1.0):
    """Mata de posidonia flotante: blob aplastado con 3–5 hojas-cinta tumbadas en abanico."""
    r = B.rng
    g0 = r.uniform(0, 360)
    c = B.at(x, y, 0.012)
    B.blob("posidonia", (0.17 * s, 0.12 * s, 0.03 * s), c, 2.4, 2.0, extra=B.rz(g0), segs=18, rings=8)
    n = r.randint(3, 5)
    for i in range(n):
        g = g0 - 55 + 110 * i / max(1, n - 1) + r.uniform(-10, 10)
        d = P.mdir(g)
        L = s * r.uniform(0.34, 0.5)
        side = d.cross(UP).normalized() * (1 if i % 2 else -1)
        p0 = c + d * 0.06 * s
        pts = [p0 + d * L * t + side * 0.06 * s * t * t + Vector((0, 0, 0.02 * s * math.sin(math.pi * t))) for t in (0, 0.25, 0.5, 0.75, 1.0)]
        B.tube("posidonia", pts, [0.03 * s, 0.03 * s, 0.027 * s, 0.02 * s, 0.008 * s], segs=6)
    # dos hojas cortas hacia el otro lado
    for sgn in (-1, 1):
        d = P.mdir(g0 + 180 + 25 * sgn)
        p0 = c + d * 0.05 * s
        B.tube("posidonia", [p0, p0 + d * 0.13 * s + Vector((0, 0, 0.012 * s)), p0 + d * 0.22 * s], [0.026 * s, 0.022 * s, 0.008 * s], segs=6)


def build(B, Z, M):
    fx, fy = lugar(Z, "fiestera")

    with B.pieza("fiestera"):
        hands, tip = fiestera(B, fx, fy, k=1.5, g=90.0)

    with B.pieza("globos"):
        hr = hands[1]   # la mano derecha (en pantalla) sujeta los globos
        for (dx, dy, dz), role in (((0.25, -0.15, 0.75), "firework_a"), ((0.55, -0.45, 1.1), "firework_b"),
                                   ((0.0, -0.55, 1.35), "firework_c")):
            balloon(B, hr + Vector((0, 0, 0.06)), hr + P.mvec(dx, dy) + Vector((0, 0, dz)), role)

    # corro de cocodrilos: (ángulo desde ella en el mapa, radio, k, sumergido)
    corro = ((168, 1.65, 1.15, -0.035), (238, 1.55, 1.05, -0.035), (305, 1.7, 1.1, -0.035), (28, 1.95, 1.0, 0.03))
    crocs = []
    with B.pieza("cocodrilos"):
        for ang, rad, k, sub in corro:
            cx = fx + rad * math.cos(math.radians(ang))
            cy = fy + rad * math.sin(math.radians(ang))
            # la cabeza mira hacia ella (retrocede lo que mide el cuerpo para que la cabeza no la toque)
            g = ang + 180.0
            P.croc(B, cx, cy, g=g, k=k, sub=sub)
            crocs.append((cx, cy, g, k, sub))
    sx, sy, sg, sk, _ = crocs[3]
    hx, hy = sx + 0.45 * math.cos(math.radians(sg)), sy + 0.45 * math.sin(math.radians(sg))

    with B.pieza("ondas"):
        P.ripple(B, fx, fy, 0.72, 2, t=0.026)
        P.ripple(B, sx, sy, 0.62, 2, t=0.022)
        P.ripple(B, hx, hy, 0.3, 1, t=0.02)

    with B.pieza("burbujas"):
        P.bubbles(B, sx - 0.15, sy + 0.05, n=8, spread=0.35)
        P.bubbles(B, hx, hy, n=5, spread=0.18)

    with B.pieza("posidonia"):
        for ang, rad, s in ((200, 1.35, 1.0), (272, 1.25, 0.85), (340, 1.5, 1.0), (60, 1.55, 0.9), (120, 1.35, 0.95),
                            (145, 2.55, 1.1), (255, 2.6, 1.0)):
            posidonia_mat(B, fx + rad * math.cos(math.radians(ang)), fy + rad * math.sin(math.radians(ang)), s)

    with B.pieza("rocas"):
        for (x, y, s) in ((fx - 2.7, fy - 1.3, 0.38), (fx + 2.6, fy - 1.9, 0.32), (fx + 2.2, fy + 1.9, 0.28)):
            P.rock(B, x, y, s, z=0.0)
            P.rock(B, x + 0.3 * s, y + 0.35 * s, s * 0.5, z=0.0)
            top = B.at(x, y, s * 0.68)
            r = B.rng
            for i in range(4):
                g = r.uniform(0, 360)
                d = P.mdir(g)
                L = s * r.uniform(0.6, 0.9)
                pts = [top + d * L * t + Vector((0, 0, 0.04 * math.sin(math.pi * t * 0.8) - 0.28 * s * t * t)) for t in (0, 0.35, 0.7, 1.0)]
                B.tube("posidonia", pts, [0.03, 0.026, 0.02, 0.01], segs=6)
            B.blob("posidonia", (s * 0.35, s * 0.3, s * 0.1), top - Vector((0, 0, 0.02)), segs=12, rings=6)
