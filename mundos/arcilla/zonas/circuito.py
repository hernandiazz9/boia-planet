"""Zona 8 · Circuito de velocidad (El Freu). Todo sale de M["circuito"].

Recorrido: común → bifurcación → segura (ancha, por la izquierda de Els Dents)
o atajo (estrecho, por El Freu, pegado a la costa este) → unión → final → meta.
Los carriles se marcan con boies naranjas y blancas a los dos lados del eje; los
arcos de salida, checkpoints y meta cruzan el carril en perpendicular.
"""
import math

import bmesh
from mathutils import Vector

import mapa as MAPA
import piezas as P

UP = Vector((0, 0, 1))


# --- polilíneas del mapa -----------------------------------------------------------------
def catmull(poly, n=8):
    """Curva suave que pasa por los puntos de la polilínea (coordenadas del mapa)."""
    pts = [Vector(p) for p in poly]
    out = []
    for i in range(len(pts) - 1):
        p0, p1, p2 = pts[max(i - 1, 0)], pts[i], pts[i + 1]
        p3 = pts[min(i + 2, len(pts) - 1)]
        for k in range(n):
            t = k / n
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1].copy())
    return out


def resample(pts, step):
    """Puntos cada `step` a lo largo de la curva: lista de (punto, tangente unitaria)."""
    L = [0.0]
    for a, b in zip(pts, pts[1:]):
        L.append(L[-1] + (b - a).length)
    total = L[-1]
    n = max(1, int(round(total / step)))
    out, j = [], 0
    for k in range(n + 1):
        s = total * k / n
        while j < len(pts) - 2 and L[j + 1] < s:
            j += 1
        a, b = pts[j], pts[j + 1]
        t = 0.0 if L[j + 1] == L[j] else (s - L[j]) / (L[j + 1] - L[j])
        d = (b - a)
        out.append((a.lerp(b, t), d.normalized() if d.length > 1e-6 else Vector((0, -1))))
    return out


def dist_seg(p, a, b):
    ab = b - a
    t = 0.0 if ab.length_squared < 1e-9 else max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length


def dist_poly(p, pts):
    return min(dist_seg(p, a, b) for a, b in zip(pts, pts[1:]))


def tangent_at(p, pts):
    """Tangente de la curva en el punto más cercano a p."""
    best, tan = 1e9, Vector((0, -1))
    for a, b in zip(pts, pts[1:]):
        d = dist_seg(p, a, b)
        if d < best and (b - a).length > 1e-6:
            best, tan = d, (b - a).normalized()
    return tan


def left(t):
    """Normal a la izquierda de la tangente t, en el mapa (x derecha, y hacia el espectador)."""
    return Vector((t.y, -t.x))


def ang(v):
    return math.degrees(math.atan2(v.y, v.x))


def banderines(B, a, b, n, roles, sag=0.18, k=1.0):
    """Cuerda con triángulos de colores entre dos puntos de Blender."""
    a, b = Vector(a), Vector(b)
    pts = [a.lerp(b, i / 12) - Vector((0, 0, sag * math.sin(math.pi * i / 12))) for i in range(13)]
    B.tube("rope", pts, 0.009 * k, segs=6)
    d = (b - a)
    d.z = 0
    d.normalize()
    nrm = d.cross(UP).normalized()
    for i in range(n):
        t = (i + 0.5) / n
        c = a.lerp(b, t) - Vector((0, 0, sag * math.sin(math.pi * t) + 0.012))
        m = P.T(*c) @ P.basis(d, nrm, UP)
        B.lathe(roles[i % len(roles)], [(0, -0.15 * k), (0.02 * k, -0.125 * k), (0.075 * k, -0.01 * k), (0.07 * k, 0.0), (0, 0.004)],
                (0, 0, 0), segs=12, sx=1.0, sy=0.22, extra=m)


def build(B, Z, M):
    C = M["circuito"]
    islas = {i["id"]: i for i in Z["islas"]}
    WS, WA = C["ancho_segura"], C["ancho_atajo"]
    ramas = {
        "comun": (catmull(C["comun"]), WS, 1.0),
        "segura": (catmull(C["segura"]), WS, 1.0),
        "atajo": (catmull(C["atajo"]), WA, 0.7),
        "final": (catmull(C["final"]), WS, 1.0),
    }
    obst = {o["id"]: o for o in C["obstaculos"]}

    def en_carril(p, margen=0.0, salvo=None):
        """¿Cae p dentro del corredor de alguna rama (salvo `salvo`)?"""
        for rid, (pts, w, _) in ramas.items():
            if rid != salvo and dist_poly(p, pts) < w / 2 + margen:
                return rid
        return None

    def agua(x, y, margen=0.28):
        return B.gz(x, y) < -0.05 and not MAPA.on_land(M, (x, y), margen)

    pies = []          # pies de los arcos: aquí no van boies

    def arco(pos, rama, checker=False, h=None, horas=("atardecer", "noche")):
        pts, w, _ = ramas[rama]
        p = Vector(pos)
        t = tangent_at(p, pts)
        n = left(t)
        a, b = p + n * (w / 2), p - n * (w / 2)
        pies.extend([a, b])
        hh = h or (0.72 + 0.16 * w)
        top = P.arch(B, tuple(a), tuple(b), h=hh, role="lane_a", role2="lane_b", checker=checker, horas=horas)
        # bombillas en el lomo del arco: de noche los arcos se encienden
        pa, pb = B.at(a.x, a.y), B.at(b.x, b.y)
        for i in range(2, 17, 2):
            t = i / 18
            q = pa.lerp(pb, t) + Vector((0, 0, hh * math.sin(math.pi * t) ** 0.8 + 0.085))
            B.blob("bulb", (0.03, 0.03, 0.035), q, segs=10, rings=6)
        for q in (a, b):
            P.ripple(B, q.x, q.y, 0.24, 1, t=0.016)
        return top, t, n

    # --- arcos ---------------------------------------------------------------------------
    with B.pieza("salida"):
        s_top, s_t, s_n = arco(C["salida"], "comun", checker=True)
    with B.pieza("meta"):
        m_top, m_t, m_n = arco(C["meta"], "final", checker=True)
        # Banderola a cuadros tendida bajo el arco de meta: se lee desde lejos.
        for side in (-1, 1):
            q = Vector(C["meta"]) + m_n * side * (WS / 2 + 0.28)
            base = B.at(q.x, q.y, 0.0)
            B.lathe("lane_b", [(0, -0.06), (0.12, -0.06), (0.13, 0.05), (0, 0.07)], tuple(base), segs=16)
            B.tube("wood_dark", [base, base + Vector((0, 0, 0.55))], 0.02, segs=6)
            B.blob("checker_a" if side < 0 else "checker_b", (0.05, 0.05, 0.05), base + Vector((0, 0, 0.58)), segs=10, rings=6)
    with B.pieza("checkpoints"):
        for cp in C["checkpoints"]:
            rama = cp["rama"]
            if rama == "comun" and cp["pos"][1] < C["union"][1]:
                rama = "final"       # CP2 cae en el tramo final, que también es común
            arco(cp["pos"], rama, checker=False, h=0.95 if rama != "atajo" else 0.78)

    # --- boies de carril -------------------------------------------------------------------
    with B.pieza("carril"):
        puestas = []
        for rid, (pts, w, step) in ramas.items():
            for side in (1, -1):
                k = 0
                for p, t in resample(pts, step):
                    q = p + left(t) * side * (w / 2)
                    if en_carril(q, -0.06, salvo=rid):
                        continue
                    if any((q - f).length < 0.36 for f in pies):
                        continue
                    if any((q - Vector(o["pos"])).length < o["radio"] + 0.22 for o in C["obstaculos"]):
                        continue
                    if any((q - r).length < 0.34 for r in puestas):
                        continue
                    if not agua(q.x, q.y):
                        continue
                    puestas.append(q)
                    kb = 0.95 if rid != "atajo" else 0.85
                    P.lane_buoy(B, q.x, q.y, role="lane_a" if k % 2 == 0 else "lane_b", k=kb, light=False)
                    # lucecita propia, algo mayor que la de la pieza para que se lea de noche
                    B.blob("bulb", (0.036, 0.036, 0.042), B.at(q.x, q.y, 0.19 * kb), segs=10, rings=6)
                    k += 1

    # --- semáforo, junto a la salida, en la arena de la costa este ---------------------------
    with B.pieza("semaforo"):
        sx, sy = C["salida"][0] + 2.35, C["salida"][1] - 0.35
        base = B.on(sx, sy, -0.06)
        H = 1.05
        B.lathe("stone", [(0, 0), (0.16, 0), (0.15, 0.08), (0.08, 0.12), (0, 0.12)], tuple(base), segs=18)
        B.tube("iron", [base, base + Vector((0, 0, H))], 0.035, segs=10)
        g = 150.0
        D = P.mdir(g)
        Rt = D.cross(UP).normalized()
        head = base + Vector((0, 0, H + 0.24))
        B.blob("pan", (0.13, 0.1, 0.33), (0, 0, 0), 4.0, 5.0, extra=P.T(*head) @ P.basis(Rt, D, UP), segs=20, rings=12)
        for i, role in enumerate(("red_light", "fire", "green_light")):
            c = head + Vector((0, 0, 0.2 - 0.2 * i)) + D * 0.085
            B.blob(role, (0.075, 0.04, 0.075), (0, 0, 0), extra=P.T(*c) @ P.basis(Rt, D, UP), segs=14, rings=8)
            B.blob("pan", (0.09, 0.05, 0.03), (0, 0, 0), 2.0, 2.0,
                   extra=P.T(*(c + Vector((0, 0, 0.075)) + D * 0.03)) @ P.basis(Rt, D, UP), segs=12, rings=6)
        B.luz(head + D * 0.35, (1.0, 0.45, 0.3), 6.0, ("atardecer", "noche"))

    # --- cartel ATAJO → en la cuña entre las dos ramas -----------------------------------------
    with B.pieza("cartel"):
        cx, cy = C["cartel_atajo"]
        # La posición del mapa cae dentro del carril del atajo: se busca el punto más cercano de la
        # cuña entre la segura y el atajo, donde el cartel no estorba a ninguna de las dos ramas.
        best = None
        for i in range(-30, 31):
            for j in range(-40, 41):
                q = Vector((cx + i * 0.06, cy - 0.6 + j * 0.06))
                ds = dist_poly(q, ramas["segura"][0]) - WS / 2
                da = dist_poly(q, ramas["atajo"][0]) - WA / 2
                dc = dist_poly(q, ramas["comun"][0]) - WS / 2
                if min(ds, da, dc) < 0.18:
                    continue
                # en la cuña: a la izquierda del atajo, para que la flecha apunte hacia él
                pa = min(ramas["atajo"][0], key=lambda r: (r - q).length)
                if q.x >= pa.x:
                    continue
                d = (q - Vector((cx, cy))).length
                if best is None or d < best[0]:
                    best = (d, q)
        q = best[1] if best else Vector((cx - 0.9, cy - 1.0))
        P.rock(B, q.x, q.y, 0.3)
        P.rock(B, q.x + 0.22, q.y + 0.12, 0.16)
        P.rock(B, q.x - 0.2, q.y + 0.14, 0.13)
        P.ripple(B, q.x, q.y, 0.42, 1, t=0.018)
        g = 90.0
        D = P.mdir(g)
        Rt = D.cross(UP).normalized()
        base = B.at(q.x, q.y, 0.16)
        w, h, post = 1.05, 0.34, 0.42
        for side in (-1, 1):
            pq = base + Rt * side * (w * 0.36)
            B.tube("wood_dark", [pq - Vector((0, 0, 0.08)), pq + Vector((0, 0, post + h))], 0.025, segs=8)
        c = base + Vector((0, 0, post + h * 0.5))
        B.blob("wood", (w * 0.5, 0.035, h * 0.5), (0, 0, 0), 6.0, 6.0, extra=P.T(*c) @ P.basis(Rt, D, UP), segs=20, rings=10)
        # Ojo: Rt = D × arriba apunta a la IZQUIERDA de la pantalla; la derecha es -Rt.
        B.text("white", "ATAJO", c + D * 0.04 + Rt * 0.13, g=g, size=0.2, depth=0.014, bevel=0.006)
        # Flecha de arcilla hacia la derecha (el atajo): churro y punta.
        a0 = c + D * 0.05 - Rt * 0.2
        a1 = a0 - Rt * 0.14
        B.tube("lane_a", [a0, a1], 0.028, segs=8)
        tip = P.T(*a1) @ P.basis(-Rt, -D, UP) @ P.rot("Y", 90)
        B.lathe("lane_a", [(0, 0.12), (0.03, 0.1), (0.075, 0.005), (0.06, -0.005), (0, 0.0)], (0, 0, 0), segs=14,
                sx=1.0, sy=0.45, extra=tip)

    # --- islotes -----------------------------------------------------------------------------
    def rocas_alrededor(spec, n, rmin, rmax, seed_off=0):
        cx, cy = spec["centro"]
        a, b, g = spec["a"], spec["b"], math.radians(spec.get("giro", 0.0))
        for i in range(n):
            t = 2 * math.pi * (i + 0.5 * B.rng.random()) / n
            f = B.rng.uniform(0.92, 1.12)
            u, v = a * f * math.cos(t), b * f * math.sin(t)
            x = cx + u * math.cos(g) - v * math.sin(g)
            y = cy + u * math.sin(g) + v * math.cos(g)
            if en_carril(Vector((x, y)), 0.12):
                continue
            s = B.rng.uniform(rmin, rmax)
            P.rock(B, x, y, s, z=max(0.0, B.gz(x, y) - s * 0.35))

    with B.pieza("dents"):
        B.isla(islas["dents"])
        rocas_alrededor(islas["dents"], 11, 0.16, 0.34)
        # «Els Dents»: tres picos de roca que asoman, como dientes.
        cx, cy = islas["dents"]["centro"]
        for dx, dy, s, hh in ((-0.35, -0.3, 0.3, 0.55), (0.15, 0.1, 0.26, 0.48), (0.45, -0.45, 0.22, 0.4)):
            z = B.gz(cx + dx, cy + dy)
            B.blob("rock", (s, s * 0.85, hh), B.at(cx + dx, cy + dy, z + hh * 0.35), 2.2, 1.6,
                   extra=B.rz(B.rng.uniform(0, 180)), segs=16, rings=10)
        P.bush(B, cx + 0.55, cy + 0.35, 0.16, role="posidonia")
    with B.pieza("freu"):
        B.isla(islas["freu"])
        rocas_alrededor(islas["freu"], 8, 0.14, 0.28)
        for x, y, s in ((15.1, -13.4, 0.26), (15.3, -10.6, 0.22), (14.3, -13.35, 0.16)):
            if not en_carril(Vector((x, y)), 0.12):
                P.rock(B, x, y, s)

    # --- obstáculos (sólo estos tres) -----------------------------------------------------------
    with B.pieza("roca"):
        x, y = obst["roca"]["pos"]
        r = obst["roca"]["radio"]
        B.blob("rock", (r, r * 0.85, 0.36), B.at(x, y, 0.02), 2.3, 1.9, extra=B.rz(30), segs=20, rings=12)
        B.blob("rock", (r * 0.55, r * 0.5, 0.2), B.at(x + 0.12, y + 0.16, 0.2), 2.2, 2.0, extra=B.rz(80), segs=14, rings=8)
        P.rock(B, x - 0.3, y + 0.2, 0.12)
        P.ripple(B, x, y, r + 0.12, 2, t=0.02)
    with B.pieza("medusa"):
        x, y = obst["medusa"]["pos"]
        P.jelly(B, x, y, k=obst["medusa"]["radio"] / 0.18, horas=("atardecer", "noche"))
        P.ripple(B, x, y, obst["medusa"]["radio"] + 0.1, 1, t=0.016)
    with B.pieza("cocodrilo"):
        o = obst["cocodrilo"]
        x, y = o["pos"]
        (x0, y0), (x1, y1) = o["vaiven"]
        g = ang(Vector((x1 - x0, y1 - y0)))
        P.croc(B, x, y, g=g, k=o["radio"] / 0.62)
        # Vaivén: ondas en los dos extremos y una estela de espuma que marca el recorrido.
        P.ripple(B, x0, y0, 0.2, 2, t=0.016)
        P.ripple(B, x1, y1, 0.2, 2, t=0.016)
        for side in (-1, 1):
            pts = []
            for i in range(9):
                t = i / 8
                px, py = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + side * 0.34
                if abs(px - x) < 0.72:
                    if len(pts) > 1:
                        B.tube("foam", pts, 0.014, segs=6)
                    pts = []
                    continue
                pts.append(B.at(px, py, 0.03))
            if len(pts) > 1:
                B.tube("foam", pts, 0.014, segs=6)

    # --- grada, en la arena de la costa este ------------------------------------------------------
    gx, gy = next(lg["pos"] for lg in Z["lugares"] if lg["id"] == "grada")
    gf = 170.0                       # la grada mira al carril (oeste), un poco hacia cámara
    D = P.mdir(gf)
    Rt = D.cross(UP).normalized()
    back = -D
    c0 = B.on(gx, gy, 0.0)
    zg = c0.z
    L, dep, hs = 2.3, 0.34, 0.19
    front = c0 + D * (1.5 * dep)
    tops = []
    with B.pieza("grada"):
        for i in range(3):
            ztop = zg + (i + 1) * hs
            zbot = zg - 0.45
            c = front + back * (dep * (i + 0.5))
            c = Vector((c.x, c.y, (ztop + zbot) / 2))
            B.blob("stone", (dep * 0.56, L / 2, (ztop - zbot) / 2), (0, 0, 0), 5.0, 6.0,
                   extra=P.T(*c) @ P.basis(back, Rt, UP), segs=24, rings=12)
            # asiento de madera en el borde de cada escalón
            s = front + back * (dep * (i + 0.5)) + D * (dep * 0.32)
            B.blob("wood", (0.07, L / 2 - 0.05, 0.03), (0, 0, 0), 4.0, 3.0,
                   extra=P.T(s.x, s.y, ztop + 0.01) @ P.basis(back, Rt, UP), segs=16, rings=6)
            tops.append((front + back * (dep * (i + 0.45)), ztop))
        # banderines: dos mástiles detrás y una cuerda con triángulos
        pa = front + back * (dep * 3.2) + Rt * (L / 2)
        pb = front + back * (dep * 3.2) - Rt * (L / 2)
        tipsp = []
        for pq in (pa, pb):
            z0 = B.gz(*MAPA.from_blender(pq.x, pq.y))
            bq = Vector((pq.x, pq.y, max(z0, zg + 3 * hs - 0.2)))
            B.tube("wood_dark", [bq, bq + Vector((0, 0, 1.25))], 0.025, segs=8)
            tipsp.append(bq + Vector((0, 0, 1.22)))
        banderines(B, tipsp[0], tipsp[1], 9, ("lane_a", "firework_c", "firework_b", "fiestera"), sag=0.2)
        # espectadores
        roles = ("person_a", "person_b", "person_c", "person_d", "person_e", "person_f", "shirt_b", "stripe", "lane_a")
        k = 0
        for i, (row, ztop) in enumerate(tops):
            n = 3
            for j in range(n):
                off = (j - (n - 1) / 2) * 0.62 + (0.16 if i % 2 else -0.08)
                pp = row + Rt * off
                mx, my = MAPA.from_blender(pp.x, pp.y)
                arms = "up" if (i + j) % 3 == 0 else ("wave" if (i + j) % 3 == 1 else "down")
                hat = "hat" if (i * 3 + j) % 4 == 2 else None
                P.person(B, mx, my, role=roles[k % len(roles)], h=0.95 + 0.06 * ((i + j) % 2), g=gf - 55,
                         hair="hair", hat=hat, arms=arms, z=ztop)
                k += 1

    # --- juez de carrera en lo alto de la grada -----------------------------------------------------
    with B.pieza("juez"):
        row, ztop = tops[-1]
        pj = row + Rt * (L / 2 - 0.12) + back * 0.05
        # pedestal: podio blando a rayas
        B.blob("white", (0.16, 0.16, 0.12), (0, 0, 0), 4.0, 4.0, extra=P.T(pj.x, pj.y, ztop + 0.1), segs=16, rings=8)
        B.blob("lane_a", (0.165, 0.165, 0.035), (0, 0, 0), 4.0, 3.0, extra=P.T(pj.x, pj.y, ztop + 0.12), segs=16, rings=6)
        mx, my = MAPA.from_blender(pj.x, pj.y)
        hj = 1.15
        head = P.person(B, mx, my, role="checker_a", h=hj, g=gf - 50, hair=None, hat="hat", arms="up", z=ztop + 0.22)
        # bandera a cuadros en la mano derecha
        Dj = P.mdir(gf - 50)
        Rj = Dj.cross(UP).normalized()
        hand = Vector((pj.x, pj.y, ztop + 0.22)) + Vector((0, 0, 0.25 * hj)) + Rj * 0.13 * hj + Vector((0, 0, 0.13 * hj))
        top = hand + Vector((0, 0, 0.55)) + Rj * 0.05
        B.tube("wood_dark", [hand - Vector((0, 0, 0.05)), top], 0.014, segs=6)
        fd = P.mdir(gf - 180 + 30)          # ondea hacia el carril
        rows, cols, sq = 3, 4, 0.085
        for r in range(rows):
            for cc in range(cols):
                wav = 0.02 * math.sin(cc * 1.4)
                cpos = top - Vector((0, 0, sq * (r + 0.5))) + fd * (sq * (cc + 0.5)) + Rj * wav
                B.blob("checker_a" if (r + cc) % 2 else "checker_b", (sq * 0.5, 0.014, sq * 0.5), (0, 0, 0), 5.0, 5.0,
                       extra=P.T(*cpos) @ P.basis(fd, fd.cross(UP).normalized(), UP), segs=8, rings=6)
        # cronómetro pequeño colgado del podio
        cr = Vector((pj.x, pj.y, ztop + 0.14)) + D * 0.17
        B.blob("white", (0.05, 0.02, 0.05), (0, 0, 0), extra=P.T(*cr) @ P.basis(Rt, D, UP), segs=12, rings=8)
        B.blob("ink", (0.008, 0.022, 0.03), (0, 0, 0), extra=P.T(*(cr + D * 0.012)) @ P.basis(Rt, D, UP), segs=6, rings=4)
