"""Piezas del mundo de acuarela: la costa de Alicante pintada. MUESTRA.

Reciben el Builder de mundos/arcilla/escena.py (B) y trabajan en coordenadas
del mapa. Como en arcilla, ninguna pone colores: nombran papeles que el tema
(mundos/acuarela/tema.py) convierte en aguadas. Las piezas comunes a los dos
mundos (boia, cocodrilo, delfín, cofre, arcos) salen de mundos/arcilla/piezas.py;
aquí está lo propio de este mundo: islas de caliza con cala de arena, palmeras
datileras, pitas, chumberas, buganvillas, casas encaladas de azotea, cúpulas de
teja azul, casas de colores, torres vigía, farolillos de papel y toldos de
barraca.
"""
import math
import random

from mathutils import Matrix, Vector

import mapa as MAPA
import piezas as P      # mundos/arcilla/piezas.py

UP = Vector((0, 0, 1))
T, rot, basis, mdir, mvec = P.T, P.rot, P.basis, P.mdir, P.mvec


def local(spec, u, v):
    """Punto del mapa en coordenadas de la isla (u a lo largo de a, v de b; ±1 en el borde)."""
    g = math.radians(spec.get("giro", 0.0))
    cx, cy = spec["centro"]
    du, dv = u * spec["a"], v * spec["b"]
    return cx + du * math.cos(g) - dv * math.sin(g), cy + du * math.sin(g) + dv * math.cos(g)


# --- Islas -------------------------------------------------------------------------------
def isla(B, spec, top="scrub", beach=(0.0, 1.0), cliff=0.3, shoal=True, k_top=0.86, back=0.2, k_cliff=(0.84, 0.76)):
    """Isla de acuarela: una cala de arena baja ocupa el contorno de mapa.json (la huella) y, retirado hacia el
    lado contrario a `beach` (u, v locales), un zócalo de caliza de laderas empinadas con estratos y una meseta
    de matorral seco. Sin `beach`, el acantilado ocupa todo el contorno. Devuelve la altura de la meseta."""
    cx, cy = spec["centro"]
    a, b, g, p = spec["a"], spec["b"], spec.get("giro", 0.0), spec.get("p", 2.4)
    alto = spec.get("alto", 0.5) + cliff
    if beach:
        B.land(cx, cy, a, b, 0.42, -0.2, g, p, 2.0, role="sand", segs=72, rings=20)
        ccx, ccy = local(spec, -beach[0] * back, -beach[1] * back)
        ka, kb = k_cliff
    else:
        ccx, ccy, ka, kb = cx, cy, 1.0, 1.0
    B.land(ccx, ccy, a * ka, b * kb, alto + 0.2, -0.2, g, p, 4.0, role="limestone", segs=72, rings=24)
    # estratos: dos franjas más oscuras en el acantilado
    for zz, kk in ((0.3, 1.012), (0.62, 1.006)):
        B.land(ccx, ccy, a * ka * kk, b * kb * kk, 0.07, -0.2 + (alto + 0.2) * zz - 0.035, g, p, 1.0,
               role="limestone_dark", segs=72, rings=6)
    ztop = B.gz(ccx, ccy)
    B.land(ccx, ccy, a * ka * k_top, b * kb * k_top, 0.12, ztop - 0.07, g, p, 3.0, role=top, segs=64, rings=14)
    if shoal:
        orilla(B, spec)
    return B.gz(ccx, ccy)


def orilla(B, spec, gap=0.3, r=0.02, off=0.12, seed=3, shallow=True):
    """Bajío de aguada y una línea de espuma fina, a trazos (el pincel se levanta), alrededor del contorno."""
    cx, cy = spec["centro"]
    a, b, g, p = spec["a"], spec["b"], spec.get("giro", 0.0), spec.get("p", 2.4)
    if shallow:
        ex, ey = MAPA.dir_blender(g)
        Cb = Vector(MAPA.to_blender(cx, cy)[:2])
        m = Matrix(((ex[0], ey[0], 0, Cb.x), (ex[1], ey[1], 0, Cb.y), (0, 0, 1, -0.012), (0, 0, 0, 1)))
        import bmesh
        bm = bmesh.new()
        sq = type(B).__init__.__globals__["superquadric_param"]     # la de mundos/arcilla/escena.py
        sq(bm, (a + 0.5, b + 0.45, 0.03), p, 8.0, m, 96, 8)
        B.mk(bm, "shallow")
    big = dict(spec, a=a + off, b=b + off)
    pts = MAPA.outline(big, 120)
    rng = random.Random(seed)
    n = len(pts)
    i = 0
    while i < n:
        L = rng.randint(10, 22)
        seg = [pts[(i + k) % n] for k in range(L)]
        B.tube("foam", [B.at(x, y, 0.025) for x, y in seg], [r * 0.4] + [r] * (L - 2) + [r * 0.4], segs=6)
        i += L + max(1, int(rng.uniform(0.5, 1.5) * gap * 10))


def matorral(B, spec, n=14, seed=7, avoid=(), r_avoid=0.45, k=1.0, zmin=0.3):
    """Matas de lentisco y romero sobre la meseta, al azar (semilla fija), lejos de los puntos `avoid`."""
    rng = random.Random(seed)
    placed = 0
    for _ in range(n * 12):
        if placed >= n:
            break
        u, v = rng.uniform(-0.85, 0.85), rng.uniform(-0.85, 0.85)
        if u * u + v * v > 0.75:
            continue
        x, y = local(spec, u, v)
        if B.gz(x, y) < zmin or any(math.dist((x, y), q) < r_avoid for q in avoid):
            continue
        sz = rng.uniform(0.07, 0.14) * k
        role = ("scrub_dark", "pine", "leaf2")[placed % 3]
        B.blob(role, (sz, sz * 0.9, sz * 0.7), B.on(x, y, sz * 0.35), 2.0, 2.0, extra=rot("Z", rng.uniform(0, 90)),
               segs=12, rings=6)
        placed += 1


def islote(B, spec, top=None):
    """Islote de roca caliza sin meseta (minijuegos, rocas del circuito)."""
    cx, cy = spec["centro"]
    a, b, g, p = spec["a"], spec["b"], spec.get("giro", 0.0), spec.get("p", 2.2)
    alto = spec.get("alto", 0.5)
    B.land(cx, cy, a, b, alto + 0.3, -0.2, g, p, 1.5, role="limestone", segs=64, rings=20)
    B.land(cx, cy, a * 1.004, b * 1.004, 0.16, -0.12 + alto * 0.3, g, p, 1.3, role="limestone_dark", segs=64,
           rings=8)
    if top:
        z = B.gz(cx, cy)
        B.land(cx, cy, a * 0.6, b * 0.6, 0.1, z - 0.06, g, p, 2.6, role=top, segs=48, rings=10)
    orilla(B, spec)
    return B.gz(cx, cy)


def escollera_bloques(B, spec, seed=5):
    """Escollera de bloques de hormigón (el puerto de Alicante), con la huella de la escollera de mapa.json."""
    cx, cy = spec["centro"]
    a, b, g = spec["a"], spec["b"], math.radians(spec.get("giro", 0.0))
    ux, uy = math.cos(g), math.sin(g)
    rng = random.Random(seed)
    n = int(a * 2 / (b * 0.9)) + 1
    for k in range(n):
        t = -a + 2 * a * k / (n - 1)
        for side in (-0.42, 0.42):
            j = rng.uniform(-0.1, 0.1)
            x = cx + ux * (t + j) - uy * side * b
            y = cy + uy * (t + j) + ux * side * b
            s = b * rng.uniform(0.5, 0.62)
            role = "stone" if rng.random() < 0.7 else "limestone"
            B.blob(role, (s, s * 0.95, s * 0.8), B.at(x, y, 0.1 + rng.uniform(-0.04, 0.06)), 7.0, 7.0,
                   extra=rot("Z", rng.uniform(0, 90)) @ rot("X", rng.uniform(-12, 12)), segs=16, rings=10)
    ex, ey = MAPA.dir_blender(spec.get("giro", 0.0))
    B.tierras.append((Vector(MAPA.to_blender(cx, cy)[:2]), Vector(ex), Vector(ey), a, b, 0.5, 0.0, 2.0, 2.0))


# --- Vegetación ------------------------------------------------------------------------------
def datilera(B, x, y, height=1.9, lean=(0.05, -0.05), fronds=11, dates=True, z0=None):
    """Palmera datilera (el Palmeral de Elche): tronco recto de escamas, copa densa de palmas
    arqueadas y racimos de dátiles. Devuelve la copa."""
    base = B.on(x, y, -0.05) if z0 is None else B.at(x, y, z0)
    L = mvec(*lean)
    top = base + L + Vector((0, 0, height))
    pts, rs = [], []
    for i in range(10):
        t = i / 9
        pts.append(base + L * t * t + Vector((0, 0, height * t)))
        rs.append(0.08 - 0.018 * t)
    B.tube("trunk", pts, rs, segs=10)
    for i in range(1, 9):
        B.torus("coconut", rs[i] + 0.004, 0.012, T(*pts[i]), nu=14, nv=5)
    spin = B.rng.uniform(0, 40)
    for i in range(fronds):
        ang = math.radians(i * 360 / fronds + spin)
        d = Vector((math.cos(ang), math.sin(ang), 0))
        up = 0.35 if i % 2 else 0.15
        ln = 0.62 + 0.08 * (i % 3)
        fp = [top + d * ln * t + Vector((0, 0, (up * t - 0.55 * t * t) * ln)) for t in (0, 0.3, 0.6, 1.0)]
        B.tube("palm", fp, [0.05, 0.075, 0.05, 0.01], segs=6)
    B.blob("palm", (0.12, 0.12, 0.1), top, segs=12, rings=8)
    if dates:
        for i in range(3):
            a = math.radians(i * 120 + 60 + spin)
            B.blob("orange", (0.05, 0.05, 0.08), top + Vector((0.12 * math.cos(a), 0.12 * math.sin(a), -0.12)),
                   segs=10, rings=6)
    return top


def pita(B, x, y, s=0.3, z0=None):
    """Pita (agave): roseta de hojas carnosas azuladas y, a veces, su vara."""
    c = B.on(x, y, -0.02) if z0 is None else B.at(x, y, z0)
    n = 9
    spin = B.rng.uniform(0, 40)
    for i in range(n):
        ang = math.radians(i * 360 / n + spin)
        d = Vector((math.cos(ang), math.sin(ang), 0))
        rise = 0.9 if i % 2 else 0.55
        B.tube("agave", [c, c + d * s * 0.45 + Vector((0, 0, s * 0.45 * rise)), c + d * s * 0.8 + Vector((0, 0, s * 0.7 * rise))],
               [s * 0.13, s * 0.1, s * 0.01], segs=6)
    B.blob("agave", (s * 0.18, s * 0.18, s * 0.2), c + Vector((0, 0, s * 0.12)), segs=10, rings=6)


def chumbera(B, x, y, s=0.3):
    """Chumbera: palas planas apiladas con higos rojos."""
    c = B.on(x, y, -0.02)
    r = B.rng
    pads = [(0, 0, 0.35, 0), (0.25, 0, 0.75, 35), (-0.22, 0.05, 0.7, -30), (0.05, 0, 1.1, 10)]
    for i, (dx, dy, dz, tilt) in enumerate(pads):
        q = c + mvec(dx * s, dy * s) + Vector((0, 0, dz * s))
        m = T(*q) @ rot("Z", 45 + r.uniform(-20, 20)) @ rot("Y", tilt)
        B.blob("agave" if i % 2 else "leaf", (0.24 * s, 0.07 * s, 0.32 * s), (0, 0, 0), 2.0, 2.0, extra=m,
               segs=14, rings=8)
        if i:
            B.blob("red", (0.05 * s, 0.05 * s, 0.07 * s), q + Vector((0, 0, 0.3 * s)), segs=8, rings=6)


def buganvilla(B, x, y, s=0.3, z=None):
    """Buganvilla: mata de hojas con racimos fucsia."""
    c = B.on(x, y, s * 0.35) if z is None else B.at(x, y, z)
    B.blob("leaf", (s, s * 0.85, s * 0.6), c, 2.0, 2.0, extra=rot("Z", B.rng.uniform(0, 90)), segs=16, rings=8)
    for i in range(6):
        a = math.radians(i * 60 + B.rng.uniform(-15, 15))
        q = c + Vector((s * 0.7 * math.cos(a), s * 0.6 * math.sin(a), s * (0.25 + 0.1 * (i % 2))))
        B.blob("bougainvillea", (s * 0.32, s * 0.3, s * 0.22), q, 2.0, 2.0, segs=12, rings=6)


def pino(B, x, y, height=1.2, k=1.0):
    """Pino carrasco de la costa: el de arcilla, con su papel de pino."""
    return P.pine(B, x, y, height=height, k=k)


# --- Arquitectura -----------------------------------------------------------------------------
def casa(B, x, y, w=0.5, d=0.4, h=0.55, g=90.0, color="whitewash", shutter="blue_door", terrace=True,
         dz=-0.03, windows=2):
    """Casa mediterránea de azotea: caja encalada (o de color), cornisa, persianas y puerta.
    Devuelve el punto de la azotea."""
    base = B.on(x, y, dz)
    m = B.rz(g)
    # el +X local de rz(g) mira a g: a lo largo de D va la profundidad d, a lo ancho (Rt) va w
    B.blob(color, (d, w, h * 0.5), base + Vector((0, 0, h * 0.5)), 8.0, 10.0, extra=m, segs=28, rings=12)
    top = base + Vector((0, 0, h))
    if terrace:
        B.blob("stone", (d + 0.03, w + 0.03, 0.03), top + Vector((0, 0, 0.01)), 8.0, 4.0, extra=m, segs=28, rings=6)
    else:
        B.blob("roof_tile", (d + 0.05, w + 0.05, 0.16), top + Vector((0, 0, 0.02)), 5.0, 2.0, extra=m, segs=28, rings=10)
    D = mdir(g)
    Rt = D.cross(UP).normalized()
    fr = basis(Rt, D, UP)
    B.blob(shutter, (0.075, 0.02, 0.14), base + D * (d * 0.99) + Rt * (-w * 0.35) + Vector((0, 0, 0.14)), 5.0, 4.0,
           extra=fr, segs=12, rings=6)
    for i in range(windows):
        q = base + D * (d * 0.99) + Rt * (w * (0.1 + 0.4 * i)) + Vector((0, 0, h * 0.6))
        B.blob(shutter, (0.06, 0.02, 0.075), q, 5.0, 5.0, extra=fr, segs=10, rings=6)
    return top


def cupula(B, pos, r=0.32, k=1.0):
    """Cúpula de teja vidriada azul y blanca (Altea), con linterna y veleta."""
    p = Vector(pos)
    n = 8
    for i in range(n):
        z0, z1 = r * i / n, r * (i + 1) / n
        r0 = math.sqrt(max(0.0, r * r - z0 * z0))
        r1 = math.sqrt(max(0.0, r * r - z1 * z1))
        B.lathe("dome_a" if i % 3 != 2 else "dome_b", [(0, z0), (r0, z0), (r1 + 0.002, z1), (0, z1)], tuple(p), segs=28)
    B.lathe("whitewash", [(0, r * 0.95), (0.06 * k, r * 0.95), (0.05 * k, r + 0.12 * k), (0, r + 0.14 * k)], tuple(p), segs=12)
    B.blob("dome_a", (0.06 * k, 0.06 * k, 0.05 * k), p + Vector((0, 0, r + 0.16 * k)), segs=10, rings=6)
    B.tube("iron", [p + Vector((0, 0, r + 0.18 * k)), p + Vector((0, 0, r + 0.34 * k))], 0.01, segs=5)


def torre_vigia(B, x, y, h=1.1, r=0.34, z0=None):
    """Torre vigía redonda de mampostería (las torres de la costa), con matacán. Devuelve la terraza."""
    base = B.on(x, y, -0.06) if z0 is None else B.at(x, y, z0)
    prof = [(0, 0), (r + 0.06, 0), (r + 0.02, 0.25), (r, h), (r + 0.05, h + 0.02), (r + 0.05, h + 0.1), (0, h + 0.1)]
    B.lathe("stone", prof, tuple(base), segs=32)
    B.torus("limestone_dark", r + 0.01, 0.018, T(*(base + Vector((0, 0, 0.3)))), nu=32, nv=6)
    for i in range(10):
        a = math.radians(i * 36)
        q = base + Vector(((r + 0.02) * math.cos(a), (r + 0.02) * math.sin(a), h + 0.16))
        B.blob("stone", (0.05, 0.05, 0.06), q, 4.0, 4.0, extra=rot("Z", i * 36), segs=10, rings=6)
    for g, zz in ((90.0, 0.6), (40.0, 0.85)):
        D = mdir(g)
        Rt = D.cross(UP).normalized()
        B.blob("kiln_mouth", (0.035, 0.02, 0.09), base + D * (r - 0.005) + Vector((0, 0, zz)), 3.0, 3.0,
               extra=basis(Rt, D, UP), segs=10, rings=6)
    return base + Vector((0, 0, h + 0.1))


def toldo_rayado(B, c, w, d, h, g=0.0, a="awning_a", b="awning_b", stripes=7, sag=0.06):
    """Toldo de barraca a rayas sobre cuatro postes: franjas a lo largo de w. c es el centro del suelo (Blender)."""
    c = Vector(c)
    D = mdir(g)
    Rt = D.cross(UP).normalized()
    for sx in (-1, 1):
        for sy in (-1, 1):
            q = c + Rt * sx * w * 0.95 + D * sy * d * 0.95
            B.tube("wood_dark", [q, q + Vector((0, 0, h + 0.02))], 0.025, segs=6)
    for i in range(stripes):
        u0 = -w + 2 * w * i / stripes
        u1 = -w + 2 * w * (i + 1) / stripes
        mid = (u0 + u1) / 2
        q = c + Rt * mid + Vector((0, 0, h - sag * (1 - (mid / w) ** 2) + 0.05))
        B.blob(a if i % 2 == 0 else b, ((u1 - u0) / 2 + 0.004, d, 0.025), q, 6.0, 2.0, extra=basis(Rt, D, UP),
               segs=12, rings=4)
    # faldón con ondas hacia cámara
    for i in range(stripes * 2):
        u = -w + w * (i + 0.5) / stripes
        q = c + Rt * u + D * d + Vector((0, 0, h - 0.02))
        B.blob(a if (i // 2) % 2 == 0 else b, (w / stripes / 2 + 0.004, 0.012, 0.06), q, 2.0, 2.0,
               extra=basis(Rt, D, UP), segs=10, rings=5)


def farolillos(B, a, b, n=7, sag=0.25, roles=("lantern", "firework_a", "firework_c", "firework_b")):
    """Guirnalda de farolillos de papel de colores (la verbena de Sant Joan) entre dos puntos de Blender."""
    a, b = Vector(a), Vector(b)
    pts = [a.lerp(b, i / 16) - Vector((0, 0, sag * math.sin(math.pi * i / 16))) for i in range(17)]
    B.tube("wire", pts, 0.007, segs=5)
    for i in range(1, n + 1):
        t = i / (n + 1)
        c = a.lerp(b, t) - Vector((0, 0, sag * math.sin(math.pi * t) + 0.07))
        role = roles[i % len(roles)]
        B.blob(role, (0.055, 0.055, 0.07), c, 2.0, 2.4, segs=12, rings=8)
        B.lathe("wood_dark", [(0, 0.06), (0.02, 0.06), (0.02, 0.075), (0, 0.075)], tuple(c), segs=8)


def caballete(B, x, y, g=90.0, k=1.0, z=None):
    """Caballete de pintor con un cuadro a medio pintar: mar, sol y una isla."""
    base = B.on(x, y, -0.01) if z is None else B.at(x, y, z)
    D = mdir(g)
    Rt = D.cross(UP).normalized()
    top = base + Vector((0, 0, 0.62 * k)) - D * 0.04 * k
    for sx, sy in ((-1, 0.12), (1, 0.12)):
        B.tube("wood", [base + Rt * sx * 0.14 * k + D * sy * k, top + Rt * sx * 0.03 * k], 0.012 * k, segs=5)
    B.tube("wood", [base - D * 0.22 * k, top], 0.012 * k, segs=5)
    c = base + Vector((0, 0, 0.46 * k)) + D * 0.06 * k
    fr = basis(Rt, D, UP) @ rot("X", -12)
    m = T(*c) @ fr
    B.blob("paper", (0.2 * k, 0.012 * k, 0.15 * k), (0, 0, 0), 8.0, 8.0, extra=m, segs=14, rings=6)
    B.blob("sea", (0.18 * k, 0.014 * k, 0.06 * k), (0, 0, 0), 8.0, 6.0, extra=m @ T(0, 0.004 * k, -0.07 * k), segs=12, rings=4)
    B.blob("gold", (0.035 * k, 0.014 * k, 0.035 * k), (0, 0, 0), extra=m @ T(0.08 * k, 0.006 * k, 0.07 * k), segs=10, rings=4)
    B.blob("leaf2", (0.06 * k, 0.014 * k, 0.03 * k), (0, 0, 0), 2.0, 2.0, extra=m @ T(-0.06 * k, 0.008 * k, -0.02 * k), segs=10, rings=4)
    B.tube("wood", [c + Rt * -0.22 * k - Vector((0, 0, 0.16 * k)) + D * 0.02 * k,
                    c + Rt * 0.22 * k - Vector((0, 0, 0.16 * k)) + D * 0.02 * k], 0.012 * k, segs=5)
    return c


def paleta_pintor(B, x, y, g=0.0, k=1.0, z=None):
    """Paleta de pintor con manchas de color, tumbada."""
    c = B.on(x, y, 0.01) if z is None else B.at(x, y, z)
    B.blob("wood", (0.16 * k, 0.11 * k, 0.012 * k), c, 2.0, 2.0, extra=B.rz(g), segs=16, rings=4)
    for i, role in enumerate(("red", "gold", "dome_a", "leaf2", "bougainvillea")):
        a = math.radians(40 + 55 * i + g)
        B.blob(role, (0.025 * k, 0.025 * k, 0.012 * k), c + Vector((0.09 * k * math.cos(a), 0.06 * k * math.sin(a), 0.012 * k)),
               segs=8, rings=4)


def banco(B, x, y, g=90.0, w=0.35):
    """Banco de piedra y madera del paseo."""
    base = B.on(x, y, -0.01)
    m = T(*base) @ B.rz(g)
    B.blob("stone", (w, 0.1, 0.07), (0, 0, 0), 6.0, 6.0, extra=m @ T(0, 0, 0.07), segs=16, rings=6)
    B.blob("wood", (w, 0.035, 0.07), (0, 0, 0), 6.0, 4.0, extra=m @ T(0, -0.08, 0.2), segs=16, rings=6)


def barca(B, x, y, g=0.0, k=1.0, role="house_c", z=0.0):
    """Llaüt: barca de pesca de madera pintada, varada o a flote."""
    p = B.at(x, y, z)
    m = T(*p) @ B.rz(g)
    B.blob(role, (0.42 * k, 0.14 * k, 0.09 * k), (0, 0, 0), 2.4, 3.0, extra=m @ T(0, 0, 0.03 * k), segs=24, rings=10)
    B.blob("wood", (0.36 * k, 0.1 * k, 0.03 * k), (0, 0, 0), 2.6, 2.0, extra=m @ T(0, 0, 0.1 * k), segs=20, rings=6)
    B.blob("white", (0.43 * k, 0.145 * k, 0.018 * k), (0, 0, 0), 2.4, 2.0, extra=m @ T(0, 0, 0.085 * k), segs=24, rings=4)


def rueda_color(role_seq, i):
    return role_seq[i % len(role_seq)]


def seeded(B, seed):
    B.rng = random.Random(seed)


def cartel(B, x, y, body, w=0.7, board="paper", ink="ink", g=90.0, h=0.26, post_h=0.3, size=0.13, z=None):
    """Cartel de papel pintado sobre dos postes (P.sign con los papeles de este mundo)."""
    return P.sign(B, x, y, body, g=g, w=w, h=h, post_h=post_h, board=board, ink=ink, size=size, z=z)
