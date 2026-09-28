"""Zona 7 · Mar vivo (Mar de los Restos). MUESTRA.

La banda izquierda del mapa: el náufrago en su banco de arena (palmera, SOS,
bandera de camisa y balsa varada), el delfín saltando, el remolino con su
espiral de espuma y de luminiscencia, cofres fugaces, botellas y gaviotas; y
los grupos de restos, repartidos por todo el recorrido.
"""
import math

from mathutils import Vector

import mapa as MAPA
import piezas as P

UP = Vector((0, 0, 1))


def lugar(Z, lid):
    return next(lg["pos"] for lg in Z["lugares"] if lg["id"] == lid)


def isla_local(spec, u, v):
    """Punto del mapa en ejes locales de la isla (u a lo largo de a, v a lo largo de b)."""
    cx, cy = spec["centro"]
    g = math.radians(spec.get("giro", 0.0))
    c, s = math.cos(g), math.sin(g)
    return cx + u * c - v * s, cy + u * s + v * c


def naufrago(B, x, y, h=1.05, g=90.0):
    """El náufrago: persona con barba, camisa rota y brazos arriba saludando."""
    head = P.person(B, x, y, role="canvas", h=h, g=g, hair="hair", arms="up")
    D = P.mdir(g)
    Rt = D.cross(UP).normalized()
    base = B.on(x, y, -0.01)
    # barba desgreñada bajo la cara
    B.blob("hair", (0.05 * h, 0.035 * h, 0.045 * h), head + D * 0.035 * h - Vector((0, 0, 0.035 * h)), 2.0, 2.0, segs=12, rings=8)
    B.blob("hair", (0.028 * h, 0.022 * h, 0.03 * h), head + D * 0.05 * h - Vector((0, 0, 0.07 * h)), segs=10, rings=6)
    # camisa rota: jirones en el bajo y agujeros que enseñan la piel
    for i, side in enumerate((-1, 0, 1)):
        q = base + Vector((0, 0, 0.125 * h)) + Rt * side * 0.05 * h + D * 0.058 * h
        m = P.T(*q) @ P.basis(Rt, D, UP) @ P.rot("Y", 25 * side)
        B.blob("canvas", (0.022 * h, 0.012 * h, 0.035 * h), (0, 0, 0), extra=m, segs=8, rings=6)
    for off, up in ((0.35, 0.2), (-0.4, 0.12)):
        n = (D + Rt * off).normalized()
        q = base + Vector((0, 0, up * h)) + n * 0.074 * h
        B.blob("skin", (0.018 * h, 0.018 * h, 0.006 * h), (0, 0, 0), extra=P.T(*q) @ n.to_track_quat("Z", "Y").to_matrix().to_4x4(),
               segs=10, rings=4)
    # pantalón corto azul: la mitad de abajo del cuerpo, para que la camisa rota se lea sobre la arena
    B.blob("blue_door", (0.081 * h, 0.081 * h, 0.06 * h), base + Vector((0, 0, 0.06 * h)), 2.0, 2.4, segs=16, rings=8)
    return head


def build(B, Z, M):
    islas = {i["id"]: i for i in Z["islas"]}
    banco = islas["banco_naufrago"]
    nx, ny = lugar(Z, "naufrago")

    # --- el náufrago y su banco -----------------------------------------------------
    with B.pieza("naufrago"):
        B.isla(banco)
        px, py = isla_local(banco, -0.55, -0.25)
        P.palm(B, px, py, lean=(0.15, -0.12), height=1.1, leaves=6)
        naufrago(B, nx + 0.15, ny - 0.05, h=1.05, g=90.0)
        # palo con una camisa de bandera de socorro
        fx, fy = isla_local(banco, 0.75, -0.15)
        top = P.flag(B, B.on(fx, fy, 0.0), 0.95, 0.85, role="shirt_b", g=-20, pole="wood_dark")
        d = P.mdir(-20)
        sl = top + d * 0.34 * 0.85 - Vector((0, 0, 0.08))
        B.tube("shirt_b", [sl, sl + d * 0.07 - Vector((0, 0, 0.1)), sl + d * 0.08 - Vector((0, 0, 0.2))], [0.035, 0.03, 0.028], segs=8)
        # SOS tumbado en la arena
        sx, sy = isla_local(banco, 0.1, 0.45)
        B.text("wood", "SOS", B.on(sx, sy, 0.012), g=90.0, size=0.34, depth=0.03, bevel=0.012, lying=True)
        # huellas y conchas: detalle de primer plano
        for i in range(5):
            u, v = -0.2 + 0.12 * i, 0.15 + 0.05 * math.sin(i * 1.7)
            qx, qy = isla_local(banco, u, v)
            B.blob("sand", (0.03, 0.02, 0.006), B.on(qx, qy, 0.0), extra=B.rz(20), segs=8, rings=4)
        for u, v in ((-0.9, 0.35), (0.45, -0.55)):
            qx, qy = isla_local(banco, u, v)
            B.blob("white", (0.035, 0.03, 0.018), B.on(qx, qy, 0.005), 2.0, 2.0, extra=B.rz(B.rng.uniform(0, 90)), segs=10, rings=6)

    # --- balsa varada en la orilla ---------------------------------------------------
    with B.pieza("balsa"):
        cxr, cyr = isla_local(banco, -1.22, 0.22)
        g = banco.get("giro", 0.0) + 8    # troncos a lo largo de la isla: medio en la arena, medio en el agua
        d = P.mdir(g)
        s = P.mdir(g + 90)
        c0 = Vector(MAPA.to_blender(cxr, cyr))
        L, n = 0.42, 5
        for i in range(n):
            off = (i - (n - 1) / 2) * 0.115
            a = c0 + s * off - d * L
            b = c0 + s * off + d * L
            za = max(0.0, B.ground_b(a.x, a.y)) + 0.045
            zb = max(0.0, B.ground_b(b.x, b.y)) + 0.045
            a.z, b.z = za, zb
            B.tube("wood", [a, a.lerp(b, 0.5) + Vector((0, 0, 0.005)), b], [0.052, 0.058, 0.05], segs=10)
            B.blob("wood_dark", (0.045, 0.045, 0.01), (0, 0, 0),
                   extra=P.T(*(b + d * 0.005)) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4(), segs=10, rings=4)
        for t in (-0.6, 0.6):
            q = c0 + d * L * t
            e0, e1 = q - s * 0.33, q + s * 0.33
            ze = max(0.0, B.ground_b(q.x, q.y)) + 0.1
            pts = [e0 + Vector((0, 0, ze - 0.03)), q + Vector((0, 0, ze)), e1 + Vector((0, 0, ze - 0.03))]
            B.tube("rope", pts, 0.017, segs=6)
        # remo tumbado sobre los troncos
        q = c0 - d * 0.05
        zq = max(0.0, B.ground_b(q.x, q.y)) + 0.11
        e = (d + s * 0.8).normalized()
        B.tube("wood_dark", [q - e * 0.38 + Vector((0, 0, zq)), q + e * 0.2 + Vector((0, 0, zq + 0.01))], 0.017, segs=6)
        B.blob("wood", (0.12, 0.05, 0.012), q + e * 0.3 + Vector((0, 0, zq + 0.012)), 3.0, 2.0,
               extra=P.basis(e, UP.cross(e).normalized(), UP), segs=12, rings=4)
        P.ripple(B, *MAPA.from_blender(*(c0 + d * 0.25).to_2d()), 0.5, 1, t=0.02)

    # --- restos: un grupo en cada punto de mapa.json --------------------------------
    with B.pieza("restos"):
        for x, y in Z["restos"]:
            P.debris(B, x, y, k=1.0)

    # --- cofres fugaces --------------------------------------------------------------
    with B.pieza("cofres"):
        for lid, g in (("cofre_1", 70), ("cofre_2", 110)):
            x, y = lugar(Z, lid)
            P.chest(B, x, y, g=g, k=1.15)
            for i in range(5):   # monedas flotando alrededor
                a = math.radians(i * 72 + 20)
                B.lathe("coin", [(0, 0), (0.04, 0), (0.04, 0.012), (0, 0.012)], tuple(B.at(x + 0.42 * math.cos(a), y + 0.3 * math.sin(a), 0.005)),
                        segs=14, extra=P.rot("X", 10 * (i - 2)))
            B.luz(B.at(x, y, 0.35), (1.0, 0.78, 0.3), 5.0, ("noche",))

    # --- delfín saltando hacia arriba del mapa, con su estela -----------------------
    with B.pieza("delfin"):
        dx, dy = lugar(Z, "delfin")
        g = -125.0   # ≈ hacia arriba del mapa, pero en diagonal: a -100 el arco se ve de canto
        P.dolphin(B, dx, dy, g=g, k=1.35, jump=0.55)
        back = (-math.cos(math.radians(g)), -math.sin(math.radians(g)))
        # dos saltos anteriores: ondas y salpicaduras marcan el camino
        for dist, r in ((1.55, 0.3), (2.7, 0.22)):
            x, y = dx + back[0] * dist, dy + back[1] * dist
            P.ripple(B, x, y, r, 2, t=0.02)
            for i in range(6):
                a = math.radians(i * 60 + 15 * dist)
                q = B.at(x + 0.18 * math.cos(a), y + 0.12 * math.sin(a), 0.05 + 0.04 * (i % 2))
                B.blob("foam", (0.035, 0.035, 0.04), q, segs=8, rings=6)
        # estela luminiscente: sólo brilla de noche
        for i in range(14):
            t = 0.55 + i * 0.19
            wob = 0.08 * math.sin(i * 1.3)
            x = dx + back[0] * t - back[1] * wob
            y = dy + back[1] * t + back[0] * wob
            B.blob("lumi", (0.05 - 0.002 * i, 0.03, 0.008), B.at(x, y, 0.012), extra=B.rz(g), segs=10, rings=4)

    # --- remolino --------------------------------------------------------------------
    with B.pieza("remolino"):
        rx, ry = lugar(Z, "remolino")
        C = B.at(rx, ry, 0.0)
        R = 1.4
        B.torus("shallow", R * 0.78, R * 0.24, P.T(*C) @ P.Matrix.Diagonal((1, 1, 0.16, 1)), nu=64, nv=10)
        B.blob("sea_deep", (R * 0.8, R * 0.8, 0.02), C + Vector((0, 0, 0.004)), 2.0, 2.0, segs=48, rings=8)
        B.blob("sea_deep", (R * 0.22, R * 0.22, 0.012), C + Vector((0, 0, 0.012)), segs=24, rings=6)
        B.torus("foam", R * 1.02, 0.03, P.T(*(C + Vector((0, 0, 0.03)))), nu=72, nv=6)

        def spiral(role, r_out, r_in, z_out, z_in, th0, rad, n=96, turns=3.0):
            pts, rs = [], []
            for i in range(n + 1):
                t = i / n
                r = r_out + (r_in - r_out) * t          # Arquímedes: radio lineal con el ángulo
                th = th0 + 2 * math.pi * turns * t
                pts.append(C + Vector((r * math.cos(th), r * math.sin(th), z_out + (z_in - z_out) * t)))
                rs.append(rad[0] + (rad[1] - rad[0]) * t)
            B.tube(role, pts, rs, segs=8)
            return pts

        spiral("foam", R * 0.95, 0.1, 0.055, 0.02, 0.0, (0.05, 0.015))
        spiral("lumi", R * 0.93, 0.12, 0.035, 0.018, math.pi, (0.018, 0.008))
        # crestas de espuma sobre el borde
        for i in range(10):
            a = 2 * math.pi * i / 10 + 0.2
            q = C + Vector((R * 0.99 * math.cos(a), R * 0.99 * math.sin(a), 0.05))
            B.blob("foam", (0.09, 0.04, 0.03), q, extra=P.rot("Z", math.degrees(a) + 90), segs=10, rings=6)
        B.luz(C + Vector((0, 0, 0.5)), (0.5, 1.0, 0.92), 6.0, ("noche",))

    # --- botellas --------------------------------------------------------------------
    with B.pieza("botellas"):
        for lid, g in (("botella_1", 30), ("botella_2", 150), ("botella_3", -40)):
            x, y = lugar(Z, lid)
            P.bottle(B, x, y, g=g, k=1.15)

    # --- gaviotas --------------------------------------------------------------------
    with B.pieza("gaviotas"):
        P.gull(B, B.at(nx - 0.4, ny - 0.5, 1.75), g=20, flying=True, k=1.25)
        P.gull(B, B.at(nx + 0.7, ny - 1.0, 2.2), g=200, flying=True, k=1.1)
        rx0, ry0 = Z["restos"][1]
        P.gull(B, B.at(rx0 - 0.25, ry0 + 0.12, 0.2), g=120)       # posada en la caja de un resto
        rx1, ry1 = Z["restos"][2]
        P.gull(B, B.at(rx1 + 0.28, ry1 - 0.1, 0.165), g=60)       # posada en el barril de otro
