"""Archipiélago de muestra, independiente del estilo.

Cada pieza se crea con un ROL (arena, paja, madera, mar...). El tema decide qué
material, luz y barco corresponden a cada rol; la geometría y los lugares son
los mismos en todos los mundos. Es la regla de §48 aplicada a los mundos:
apariencia desacoplada del comportamiento.

Las primitivas (superelipsoide, churro, torno, toro) vienen del estilo 05 y son
sólo geometría: no crean materiales.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector


def T(x, y, z):
    return Matrix.Translation((x, y, z))


def rot(axis, deg):
    return Matrix.Rotation(math.radians(deg), 4, axis)


class Builder:
    def __init__(self, tema, geo, root):
        self.tema, self.G, self.root = tema, geo, root
        self.lugares, self.luces, self.marco = {}, [], []
        self.islands = []                 # (cx, cy, a, b, c, zc, p, q)

    # --- objetos ---
    def mk(self, name, bm, role):
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        for f in bm.faces:
            f.smooth = True
        lim = math.radians(40)
        for e in bm.edges:
            e.smooth = not (len(e.link_faces) == 2 and e.calc_face_angle(0.0) > lim)
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        me.materials.append(self.tema.material(role))
        obj = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(obj)
        obj.parent = self.root
        self.tema.decorate(obj, role)
        return obj

    def blob(self, name, role, size, at, p=2.0, q=2.0, extra=None, segs=32, rings=16):
        bm = bmesh.new()
        self.G.superquadric(bm, size, p, q, matrix=T(*at) @ (extra or Matrix.Identity(4)), segs=segs, rings=rings)
        return self.mk(name, bm, role)

    def tube(self, name, role, pts, r, segs=8):
        bm = bmesh.new()
        self.G.tube(bm, pts, r, segs=segs)
        return self.mk(name, bm, role)

    def lathe(self, name, role, prof, at, segs=32, sx=1.0, sy=1.0):
        bm = bmesh.new()
        self.G.lathe(bm, prof, segs=segs, sx=sx, sy=sy, matrix=T(*at))
        return self.mk(name, bm, role)

    def torus(self, name, role, R, r, m, nu=24, nv=8):
        bm = bmesh.new()
        self.G.torus(bm, R, r, m, nu=nu, nv=nv)
        return self.mk(name, bm, role)

    # --- terreno ---
    def ground(self, x, y):
        best = -9.0
        for cx, cy, a, b, c, zc, p, q in self.islands:
            r = (abs((x - cx) / a) ** p + abs((y - cy) / b) ** p) ** (q / p)
            if r < 1.0:
                best = max(best, zc + c * (1.0 - r) ** (1.0 / q))
        return best

    def island(self, name, cx, cy, a, b, c=0.5, zc=-0.14, p=2.4, q=3.0, role="sand", rings=True):
        self.blob(name, role, (a, b, c), (cx, cy, zc), p, q, segs=64, rings=24)
        self.islands.append((cx, cy, a, b, c, zc, p, q))
        if rings:
            self.blob(name + "_bajio", "shallow", (a + 0.62, b + 0.55, 0.09), (cx, cy, -0.035), p, 2.0, segs=64, rings=12)
            self.torus(name + "_espuma", "foam", 1.0, 0.035,
                       T(cx, cy, 0.055) @ Matrix.Diagonal((a + 0.1, b + 0.1, 1.0, 1.0)), nu=72, nv=8)
        for k in range(20):
            ang = 2 * math.pi * k / 20
            self.marco.append(Vector((cx + (a + 0.7) * math.cos(ang), cy + (b + 0.6) * math.sin(ang), 0.0)))

    def hill(self, name, cx, cy, a, b, c, zc=0.05, p=2.2, q=2.2):
        self.blob(name, "grass", (a, b, c), (cx, cy, zc), p, q, segs=48, rings=20)
        self.islands.append((cx, cy, a, b, c, zc, p, q))

    # --- piezas reutilizables ---
    def palm(self, name, x, y, lean=(0.25, 0.1), height=1.7):
        z0 = self.ground(x, y) - 0.05
        top = Vector((x + lean[0], y + lean[1], z0 + height))
        pts, rs = [], []
        for i in range(9):
            t = i / 8
            bend = math.sin(t * math.pi / 2)
            pts.append((x + lean[0] * bend, y + lean[1] * bend, z0 + height * t))
            rs.append(0.095 - 0.035 * t)
        self.tube(name + "_tronco", "trunk", pts, rs, segs=10)
        for i in range(4):
            t = int((0.2 + 0.18 * i) * 8)
            self.torus("%s_anillo_%d" % (name, i), "coconut", rs[t] + 0.004, 0.018, T(*pts[t]), nu=16, nv=6)
        for i in range(7):
            m = T(*top) @ rot("Z", i * 360 / 7 + 10) @ rot("Y", 28 + 10 * (i % 2)) @ T(0.42, 0, 0)
            self.blob("%s_hoja_%d" % (name, i), "leaf", (0.5, 0.13, 0.025), (0, 0, 0), extra=m)
        for i in range(3):
            a = math.radians(i * 120 + 30)
            self.blob("%s_coco_%d" % (name, i), "coconut", (0.07, 0.07, 0.07),
                      (top.x + 0.08 * math.cos(a), top.y + 0.08 * math.sin(a), top.z - 0.07))
        self.marco.append(top + Vector((0, 0, 0.3)))
        return top

    def garland(self, name, a, b, n=9, sag=0.4):
        a, b = Vector(a), Vector(b)
        pts = [a.lerp(b, i / 16) - Vector((0, 0, sag * math.sin(math.pi * i / 16))) for i in range(17)]
        self.tube(name + "_cable", "wire", pts, 0.008, segs=6)
        out = []
        for i in range(1, n + 1):
            t = i / (n + 1)
            c = a.lerp(b, t) - Vector((0, 0, sag * math.sin(math.pi * t) + 0.05))
            self.blob("%s_bombilla_%d" % (name, i), "bulb", (0.045, 0.045, 0.06), tuple(c), segs=12, rings=8)
            out.append(c)
            self.luces.append((c + Vector((0, 0, -0.08)), (1.0, 0.72, 0.4), 5.0))
        return out

    def botijo(self, name, x, y, z, k=1.0):
        prof = [(0, 0), (0.06, 0), (0.1, 0.03), (0.12, 0.08), (0.11, 0.13), (0.07, 0.17), (0.04, 0.2), (0.045, 0.23), (0, 0.23)]
        self.lathe(name, "terracotta", [(r * k, zz * k) for r, zz in prof], (x, y, z), segs=20)
        self.tube(name + "_pitorro", "terracotta", [(x + 0.08 * k, y, z + 0.11 * k), (x + 0.15 * k, y, z + 0.19 * k)], 0.014 * k, segs=6)

    def person(self, name, x, y, role, h=1.0):
        z = self.ground(x, y) - 0.01
        self.blob(name + "_cuerpo", role, (0.075 * h, 0.075 * h, 0.15 * h), (x, y, z + 0.15 * h), 2.0, 2.4, segs=16, rings=10)
        self.blob(name + "_cabeza", "skin", (0.065 * h, 0.065 * h, 0.065 * h), (x, y, z + 0.36 * h), segs=16, rings=10)

    def flagpole(self, name, x, y, z, h=1.1, s=1.0):
        self.tube(name + "_mastil", "wood_dark", [(x, y, z - 0.2), (x, y, z + h)], 0.022, segs=8)
        self.blob(name + "_bandera", "flag", (0.2 * s, 0.012, 0.12 * s), (x + 0.2 * s, y, z + h - 0.12 * s), 4, 4, extra=rot("Z", 8))


# --- islas ---------------------------------------------------------------------
def cala(B, ox=0.0, oy=0.0):
    B.island("cala", ox, oy, 3.1, 2.1, 0.55, -0.15)
    hx, hy = ox - 1.45, oy + 0.95
    B.hill("cala_colina", hx, hy, 1.25, 1.05, 0.75)
    p1 = B.palm("cala_palmera_1", ox - 0.35, oy + 1.55, (0.2, 0.15), 1.75)
    p2 = B.palm("cala_palmera_2", ox + 2.05, oy + 0.95, (0.28, -0.05), 1.55)
    p3 = B.palm("cala_palmera_3", ox - 2.1, oy - 0.55, (-0.18, -0.2), 1.6)
    # horno
    kx, ky = hx + 0.15, hy + 0.05
    kz = B.ground(kx, ky) - 0.06
    B.lathe("horno", "terracotta", [(0, 0), (0.55, 0), (0.6, 0.14), (0.57, 0.34), (0.47, 0.55), (0.3, 0.72), (0.13, 0.81), (0, 0.83)], (kx, ky, kz), 40)
    toward = Vector((0.7071, -0.7071, 0))
    mouth = Vector((kx, ky, kz + 0.2)) + toward * 0.56
    B.blob("horno_boca", "kiln_mouth", (0.2, 0.05, 0.17), tuple(mouth), 2.2, 2.6, extra=rot("Z", 45))
    B.blob("horno_fuego", "fire", (0.13, 0.04, 0.09), tuple(mouth + toward * 0.02 - Vector((0, 0, 0.05))), extra=rot("Z", 45))
    B.lathe("horno_chimenea", "terracotta", [(0, 0), (0.1, 0), (0.1, 0.28), (0.13, 0.3), (0.13, 0.34), (0, 0.34)], (kx - 0.12, ky + 0.1, kz + 0.72), 16)
    for i, (dx, dy, dz, r) in enumerate([(0.0, 0.0, 1.18, 0.1), (0.08, 0.05, 1.36, 0.13), (0.2, 0.12, 1.56, 0.16), (0.36, 0.2, 1.78, 0.19)]):
        B.blob("humo_%d" % i, "smoke", (r, r, r * 0.85), (kx - 0.12 + dx, ky + 0.1 + dy, kz + dz))
    for i, (dx, dy) in enumerate(((0.62, 0.35), (0.72, 0.12), (0.5, 0.55))):
        bx, by = kx + dx, ky + dy
        B.botijo("botijo_secando_%d" % i, bx, by, B.ground(bx, by) - 0.02, 0.8)
    B.luces.append((mouth + Vector((0.15, -0.15, 0.05)), (1.0, 0.45, 0.2), 40.0))
    B.marco.append(Vector((kx + 0.2, ky + 0.3, kz + 2.0)))
    # chiringuito
    cx, cy = ox + 1.0, oy + 1.05
    cz = B.ground(cx, cy) - 0.04
    B.blob("chiringuito_paredes", "wall", (0.46, 0.4, 0.42), (cx, cy, cz + 0.4), 5.0, 6.0)
    B.blob("chiringuito_puerta", "door", (0.02, 0.12, 0.21), (cx + 0.46, cy - 0.05, cz + 0.24), 4, 4)
    B.blob("chiringuito_ventana", "glass", (0.14, 0.02, 0.1), (cx - 0.05, cy - 0.405, cz + 0.46), 4, 4)
    B.lathe("chiringuito_paja", "thatch", [(0, 1.32), (0.22, 1.25), (0.48, 1.08), (0.68, 0.9), (0.72, 0.86), (0.66, 0.84), (0, 0.88)], (cx, cy, cz), 40, 1.05, 0.95)
    B.luces.append((Vector((cx + 0.5, cy - 0.5, cz + 0.55)), (1.0, 0.75, 0.45), 30.0))
    # paella
    px, py = ox + 1.45, oy - 0.2
    pz = B.ground(px, py) + 0.12
    for i in range(3):
        a = math.radians(i * 120)
        B.tube("paella_pata_%d" % i, "iron", [(px + 0.22 * math.cos(a), py + 0.22 * math.sin(a), pz - 0.14), (px + 0.12 * math.cos(a), py + 0.12 * math.sin(a), pz)], 0.015, 6)
    B.blob("paella_fuego", "fire", (0.1, 0.1, 0.05), (px, py, pz - 0.09))
    B.lathe("paellera", "pan", [(0, 0), (0.36, 0), (0.4, 0.05), (0.38, 0.06), (0.35, 0.025), (0, 0.025)], (px, py, pz), 40)
    B.blob("arroz", "rice", (0.34, 0.34, 0.02), (px, py, pz + 0.03), segs=32, rings=8)
    for i in range(10):
        a = math.radians(i * 36 + 7)
        rr = 0.12 + 0.12 * ((i * 7) % 3) / 2
        role = "pepper" if i % 2 else "pea"
        B.blob("paella_trozo_%d" % i, role, (0.035, 0.02, 0.012) if role == "pepper" else (0.018, 0.018, 0.018),
               (px + rr * math.cos(a), py + rr * math.sin(a), pz + 0.05), extra=rot("Z", i * 40), segs=10, rings=6)
    B.luces.append((Vector((px, py, pz + 0.05)), (1.0, 0.5, 0.25), 10.0))
    # pista de azulejos
    fx, fy, n, s = ox - 0.15, oy - 0.55, 5, 0.23
    for i in range(n):
        for j in range(n):
            x, y = fx + (i - 2) * s, fy + (j - 2) * s
            B.blob("azulejo_%d_%d" % (i, j), "tile_b" if (i + j) % 2 else "tile_a", (s * 0.46, s * 0.46, 0.035), (x, y, B.ground(x, y) + 0.005), 6.0, 6.0, segs=16, rings=8)
    B.luces.append((Vector((fx, fy, B.ground(fx, fy) + 1.1)), (1.0, 0.8, 0.55), 70.0))
    # embarcadero
    x0, x1, y, zd = ox + 2.6, ox + 5.05, oy - 0.55, 0.2
    bm = bmesh.new()
    B.G.superquadric(bm, (0.28, (x1 - x0) / 2, 0.035), 8.0, 8.0, matrix=Matrix.Identity(4), segs=32, rings=8)
    pier = B.mk("embarcadero", bm, "deck")
    pier.location = ((x0 + x1) / 2, y, zd)
    pier.rotation_euler = (0, 0, math.radians(-90))
    for i, x in enumerate((x0 + 0.35, x0 + 1.05, x0 + 1.75, x1 - 0.05)):
        for dy in (-0.25, 0.25):
            B.tube("poste_%d_%d" % (i, dy > 0), "wood_dark", [(x, y + dy, -0.3), (x, y + dy, zd + 0.1)], 0.045, 10)
    tops = []
    for i, x in enumerate((x0 + 0.55, x0 + 0.85, x0 + 1.2)):
        yy = y + 0.12 * (1 if i % 2 else -1)
        B.botijo("botijo_%d" % i, x, yy, zd + 0.03)
        tops.append(Vector((x, yy, zd + 0.25)))
    B.flagpole("muelle", x0 + 0.2, y - 0.2, zd)
    ga = B.garland("guirnalda_a", p1 - Vector((0, 0, 0.15)), p2 - Vector((0, 0, 0.15)), 9, 0.45)
    gb = B.garland("guirnalda_b", p3 - Vector((0, 0, 0.15)), p1 - Vector((0, 0, 0.2)), 9, 0.5)
    B.lugares.update({
        "cala": ("Cala del Alfar", Vector((kx, ky, kz + 0.5))),
        "barco": ("El barco del mundo", Vector((ox + 4.2, oy + 0.37, 0.8))),
        "pista": ("Pista de azulejos", Vector((fx, fy, B.ground(fx, fy)))),
    })
    return Vector((ox + 4.2, oy + 0.37, 0.0))


def escenario(B, ox, oy):
    B.island("escenario", ox, oy, 2.4, 2.0, 0.5, -0.12)
    B.palm("esc_palmera_1", ox - 1.6, oy + 0.4, (-0.15, 0.1), 1.6)
    B.palm("esc_palmera_2", ox + 1.2, oy + 1.2, (0.2, 0.1), 1.5)
    sx, sy = ox - 0.35, oy + 0.55
    sz = B.ground(sx, sy)
    B.blob("escenario_tarima", "wood", (1.0, 0.5, 0.13), (sx, sy, sz + 0.08), 8.0, 8.0, extra=rot("Z", 45))
    for dx in (-0.8, 0.8):
        px, py = sx + dx * 0.7071 - 0.28 * 0.7071, sy + dx * 0.7071 + 0.28 * 0.7071
        B.tube("escenario_poste_%d" % (dx > 0), "wood_dark", [(px, py, sz + 0.1), (px, py, sz + 1.2)], 0.04, 8)
    B.blob("escenario_techo", "band", (1.1, 0.5, 0.07), (sx - 0.1 * 0.7071, sy + 0.1 * 0.7071, sz + 1.25), 3.0, 2.0, extra=rot("Z", 45) @ rot("X", -10))
    for i, dx in enumerate((-0.95, 0.95)):
        bx, by = sx + dx * 0.7071 + 0.2 * 0.7071, sy + dx * 0.7071 - 0.2 * 0.7071
        B.blob("altavoz_%d" % i, "speaker", (0.16, 0.14, 0.3), (bx, by, sz + 0.5), 8.0, 8.0, extra=rot("Z", 45))
        B.blob("altavoz_cono_%d" % i, "glass", (0.09, 0.02, 0.09), (bx + 0.13 * 0.7071, by - 0.13 * 0.7071, sz + 0.55), 2, 2, extra=rot("Z", 45))
    B.flagpole("escenario", sx - 0.9, sy + 0.9, sz, 1.9, 1.6)
    crowd = [(0.55, -0.35, "person_a"), (0.85, -0.05, "person_b"), (0.25, -0.65, "person_c"), (0.95, -0.55, "person_d"),
             (0.55, -0.9, "person_b"), (1.25, -0.25, "person_a"), (0.1, -0.2, "person_d")]
    for i, (dx, dy, role) in enumerate(crowd):
        B.person("publico_%d" % i, ox + dx, oy + dy, role)
    B.luces.append((Vector((sx + 0.3, sy - 0.3, sz + 1.0)), (1.0, 0.55, 0.3), 60.0))
    B.marco.append(Vector((sx - 0.9, sy + 0.9, sz + 2.3)))
    B.lugares["escenario"] = ("Isla del escenario, All Day BOIA", Vector((sx, sy, sz + 1.3)))


def tienda(B, ox, oy):
    B.island("tienda", ox, oy, 1.5, 1.2, 0.42, -0.12)
    B.palm("tienda_palmera", ox - 0.8, oy + 0.45, (-0.1, 0.12), 1.35)
    kz = B.ground(ox, oy)
    B.blob("kiosco", "wall", (0.36, 0.3, 0.3), (ox, oy + 0.1, kz + 0.28), 5.0, 6.0)
    B.blob("kiosco_toldo", "band", (0.46, 0.2, 0.035), (ox + 0.2 * 0.7071, oy + 0.1 - 0.2 * 0.7071, kz + 0.6), 4.0, 2.0, extra=rot("Z", 45) @ rot("X", 16))
    B.blob("kiosco_mostrador", "wood", (0.4, 0.1, 0.1), (ox + 0.25, oy - 0.25, kz + 0.12), 6.0, 6.0, extra=rot("Z", 45))
    for i, (dx, dy) in enumerate(((0.65, 0.35), (0.8, 0.1), (0.72, 0.22))):
        B.blob("caja_%d" % i, "wood", (0.1, 0.1, 0.1), (ox + dx, oy + dy, B.ground(ox + dx, oy + dy) + 0.1 + (0.2 if i == 2 else 0)), 8.0, 8.0)
    a, b = Vector((ox - 0.45, oy - 0.55, kz + 0.55)), Vector((ox + 0.35, oy - 0.95, kz + 0.45))
    for v in (a, b):
        B.tube("tendedero_poste_%d" % (v is b), "wood_dark", [(v.x, v.y, B.ground(v.x, v.y) - 0.05), (v.x, v.y, v.z + 0.03)], 0.02, 6)
    B.tube("tendedero_cuerda", "wire", [a.lerp(b, t) - Vector((0, 0, 0.06 * math.sin(math.pi * t))) for t in (0, 0.25, 0.5, 0.75, 1)], 0.006, 6)
    for i, (t, role) in enumerate(((0.33, "shirt_a"), (0.66, "shirt_b"))):
        c = a.lerp(b, t) - Vector((0, 0, 0.06 * math.sin(math.pi * t) + 0.12))
        B.blob("camiseta_%d" % i, role, (0.12, 0.012, 0.11), tuple(c), 4.0, 4.0, extra=rot("Z", -26))
    B.lugares["tienda"] = ("Isla tienda", Vector((ox, oy + 0.1, kz + 0.75)))


def primera_boia(B, ox, oy):
    B.island("banco", ox, oy, 0.85, 0.55, 0.26, -0.1)
    for i, (dx, dy, s) in enumerate(((0.4, 0.25, 0.14), (-0.35, -0.15, 0.1))):
        B.blob("banco_roca_%d" % i, "rock", (s, s * 0.8, s * 0.7), (ox + dx, oy + dy, B.ground(ox + dx, oy + dy)), 2.3, 2.3)
    bx, by = ox - 1.1, oy + 0.8
    B.lathe("boia_cuerpo", "red", [(0, -0.12), (0.26, -0.12), (0.3, 0.02), (0.26, 0.1), (0, 0.1)], (bx, by, 0.0), 28)
    B.lathe("boia_franja", "white", [(0, 0.1), (0.2, 0.1), (0.14, 0.34), (0, 0.34)], (bx, by, 0.0), 24)
    B.lathe("boia_cima", "red", [(0, 0.34), (0.14, 0.34), (0.1, 0.48), (0, 0.5)], (bx, by, 0.0), 24)
    B.blob("boia_luz", "bulb", (0.06, 0.06, 0.07), (bx, by, 0.56), segs=12, rings=8)
    B.luces.append((Vector((bx, by, 0.7)), (1.0, 0.8, 0.5), 15.0))
    B.marco.append(Vector((bx, by, 0.8)))
    B.lugares["boia"] = ("La primera boia", Vector((bx, by, 0.45)))


def mar(B, extent):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=extent)
    B.mk("mar", bm, "sea")
    waves = [(-4.6, -2.8, 20), (-5.4, 1.6, -15), (1.8, -4.3, 5), (8.8, 0.2, -25), (-2.2, 4.0, 10), (7.2, -4.6, 15),
             (-3.2, -4.6, -5), (2.6, 3.4, 20), (-6.4, -0.6, 0), (3.6, 9.4, 12), (-4.6, 8.2, -10), (9.4, 6.0, 5),
             (1.2, -6.8, 18), (5.2, -6.2, -12), (-6.8, 5.2, 8)]
    for i, (x, y, ang) in enumerate(waves):
        c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        pts = [(x + 0.28 * c * t, y + 0.28 * s * t, 0.02 + 0.03 * math.sin(math.pi * (t + 1) / 2)) for t in (-1, -0.5, 0, 0.5, 1)]
        B.tube("ola_%d" % i, "foam", pts, [0.012, 0.03, 0.035, 0.03, 0.012], 8)
    for i, (x, y, s) in enumerate([(-3.55, 1.35, 0.32), (-2.7, -2.35, 0.24), (0.9, 2.95, 0.28), (6.6, 0.3, 0.2), (2.4, 8.6, 0.26)]):
        B.blob("roca_%d" % i, "rock", (s, s * 0.8, s * 0.7), (x, y, -0.02), 2.3, 2.3)


def build(tema, geo):
    root = bpy.data.objects.new("mundo_root", None)
    bpy.context.scene.collection.objects.link(root)
    B = Builder(tema, geo, root)
    boat_at = cala(B, 0.0, 0.0)
    escenario(B, -1.2, 6.6)
    tienda(B, 6.4, 3.4)
    primera_boia(B, 6.0, -3.0)
    mar(B, 40.0)
    return B, boat_at
