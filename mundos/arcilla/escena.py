"""Escena del mundo de arcilla, construida desde mapa.json. MUESTRA.

Cada pieza se crea con un PAPEL (arena, paja, madera, mar...), nunca con un
color: el tema (mundos/temas.py) decide material, luz y hora. Es la regla de
§48 aplicada a los mundos.

Los objetos se llaman «<zona>__<pieza>__<n>»: así se cuentan las piezas por
zona (qa/piezas.py) y se encuadra cada primer plano.

Coordenadas: las zonas trabajan en coordenadas del MAPA (x a la derecha, y
hacia el espectador, ver mapa.json) con B.at(x, y, z) y B.on(x, y, dz), que
devuelven puntos de Blender. B.rz(g) gira una pieza para que su eje local +X
mire hacia el ángulo g del mapa (g = 90: hacia la cámara).
"""
import contextlib
import importlib.util
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "herramientas"))
import mapa as MAPA  # noqa: E402

ZONAS_DIR = os.path.join(HERE, "zonas")


def T(x, y, z):
    return Matrix.Translation((x, y, z))


def rot(axis, deg):
    return Matrix.Rotation(math.radians(deg), 4, axis)


def S(sx, sy, sz):
    return Matrix.Diagonal((sx, sy, sz, 1.0))


def spow(v, e):
    return math.copysign(abs(v) ** e, v)


def superquadric_param(bm, size, p, q, matrix, segs=96, rings=24):
    """Superelipsoide por parametrización de potencias con signo: reparte bien los
    vértices por el contorno aunque la forma sea muy alargada o casi cuadrada."""
    a, b, c = size
    ring = []
    for j in range(1, rings):
        eta = -math.pi / 2 + math.pi * j / rings
        ce, se = spow(math.cos(eta), 2.0 / q), spow(math.sin(eta), 2.0 / q)
        row = []
        for i in range(segs):
            w = 2 * math.pi * i / segs
            row.append(bm.verts.new(matrix @ Vector((a * ce * spow(math.cos(w), 2.0 / p), b * ce * spow(math.sin(w), 2.0 / p), c * se))))
        ring.append(row)
    bot = bm.verts.new(matrix @ Vector((0, 0, -c)))
    top = bm.verts.new(matrix @ Vector((0, 0, c)))
    for r0, r1 in zip(ring, ring[1:]):
        for i in range(segs):
            i1 = (i + 1) % segs
            bm.faces.new((r0[i], r0[i1], r1[i1], r1[i]))
    for i in range(segs):
        i1 = (i + 1) % segs
        bm.faces.new((bot, ring[0][i1], ring[0][i]))
        bm.faces.new((top, ring[-1][i], ring[-1][i1]))


class Builder:
    def __init__(self, tema, geo, M, root):
        self.tema, self.G, self.M, self.root = tema, geo, M, root
        self.zid, self.pid = "mundo", "general"
        self.count = {}
        self.luces = []            # (pos, color, energía, horas)
        self.tierras = []          # (C, ex, ey, a, b, c, zc, p, q) en Blender
        self.rng = random.Random(1405)
        self.variante = "venta"    # estado de las islas de evento: "venta" o "recuerdo" (REQ-COM-005)

    # --- nombres y contexto ---------------------------------------------------------
    @contextlib.contextmanager
    def pieza(self, pid, zid=None):
        old = (self.zid, self.pid)
        self.zid, self.pid = (zid or self.zid), pid
        try:
            yield self
        finally:
            self.zid, self.pid = old

    @contextlib.contextmanager
    def zona(self, zid):
        old = (self.zid, self.pid)
        self.zid, self.pid = zid, "general"
        self.rng = random.Random(sum(ord(c) * (i + 1) for i, c in enumerate(zid)))
        try:
            yield self
        finally:
            self.zid, self.pid = old

    def next_name(self):
        key = (self.zid, self.pid)
        n = self.count.get(key, 0)
        self.count[key] = n + 1
        return "%s__%s__%03d" % (self.zid, self.pid, n)

    # --- coordenadas del mapa -------------------------------------------------------
    def at(self, x, y, z=0.0):
        return Vector(MAPA.to_blender(x, y, z))

    def gz(self, x, y):
        X, Y, _ = MAPA.to_blender(x, y)
        return self.ground_b(X, Y)

    def on(self, x, y, dz=0.0):
        """Punto sobre el terreno (o sobre el agua, z = 0) en (x, y) del mapa."""
        X, Y, _ = MAPA.to_blender(x, y)
        return Vector((X, Y, max(0.0, self.ground_b(X, Y)) + dz))

    def rz(self, g):
        """Giro en Z para que el +X local mire al ángulo g del mapa."""
        return rot("Z", 45.0 - g)

    def frame(self, x, y, z, g=0.0):
        return T(*self.at(x, y, z)) @ self.rz(g)

    # --- objetos --------------------------------------------------------------------
    def mk(self, bm, role, sharp=40, smooth=True):
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        for f in bm.faces:
            f.smooth = smooth
        lim = math.radians(sharp)
        for e in bm.edges:
            e.smooth = not (len(e.link_faces) == 2 and e.calc_face_angle(0.0) > lim)
        name = self.next_name()
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        me.materials.append(self.tema.material(role))
        obj = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(obj)
        obj.parent = self.root
        self.tema.decorate(obj, role)
        return obj

    def blob(self, role, size, at, p=2.0, q=2.0, extra=None, segs=24, rings=12):
        """Superelipsoide de semiejes size en el punto at (Blender); extra = giro/escala local."""
        bm = bmesh.new()
        m = T(*at) @ (extra or Matrix.Identity(4))
        lo, hi = min(size[0], size[1]), max(size[0], size[1])
        if hi > 2.5 * lo:
            # Formas alargadas: la parametrización reparte los vértices por todo el contorno.
            superquadric_param(bm, size, p, q, m, max(segs, int(segs * (hi / lo) ** 0.5)), rings)
        else:
            self.G.superquadric(bm, size, p, q, matrix=m, segs=segs, rings=rings)
        return self.mk(bm, role)

    def tube(self, role, pts, r, segs=8, closed=False):
        bm = bmesh.new()
        self.G.tube(bm, pts, r, segs=segs, closed=closed)
        return self.mk(bm, role)

    def lathe(self, role, prof, at, segs=24, sx=1.0, sy=1.0, extra=None):
        bm = bmesh.new()
        self.G.lathe(bm, prof, segs=segs, sx=sx, sy=sy, matrix=T(*at) @ (extra or Matrix.Identity(4)))
        return self.mk(bm, role)

    def torus(self, role, R, r, matrix, nu=24, nv=8):
        bm = bmesh.new()
        self.G.torus(bm, R, r, matrix, nu=nu, nv=nv)
        return self.mk(bm, role)

    def text(self, role, body, at, g=90.0, size=0.4, depth=0.04, bevel=0.012, lying=False):
        """Letras de arcilla. De pie mirando hacia el ángulo g del mapa (g = 90: a cámara)."""
        cu = bpy.data.curves.new("txt", "FONT")
        cu.body = body
        cu.size = size
        cu.extrude = depth
        cu.bevel_depth = bevel
        cu.bevel_resolution = 2
        cu.align_x, cu.align_y = "CENTER", "CENTER"
        tmp = bpy.data.objects.new("txt", cu)
        bpy.context.scene.collection.objects.link(tmp)
        dg = bpy.context.evaluated_depsgraph_get()
        me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
        bpy.data.objects.remove(tmp, do_unlink=True)
        bpy.data.curves.remove(cu)
        bm = bmesh.new()
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
        if lying:
            m = T(*at) @ rot("Z", 135.0 - g)
        else:
            m = T(*at) @ rot("Z", 135.0 - g) @ rot("X", 90)
        bmesh.ops.transform(bm, verts=bm.verts[:], matrix=m)
        return self.mk(bm, role, sharp=30)

    def luz(self, pos, color=(1.0, 0.75, 0.45), energy=20.0, horas=("noche",)):
        self.luces.append((Vector(pos), color, energy, tuple(horas)))

    # --- terreno --------------------------------------------------------------------
    def ground_b(self, X, Y):
        best = -9.0
        P = Vector((X, Y))
        for C, ex, ey, a, b, c, zc, p, q in self.tierras:
            d = P - C
            u, v = d.dot(ex), d.dot(ey)
            r = (abs(u / a) ** p + abs(v / b) ** p) ** (q / p)
            if r < 1.0:
                best = max(best, zc + c * (1.0 - r) ** (1.0 / q))
        return best

    def land(self, cx, cy, a, b, c, zc, g=0.0, p=2.4, q=3.0, role="sand", segs=64, rings=24):
        """Una masa de tierra superelíptica en el mapa, registrada para ground()."""
        ex, ey = MAPA.dir_blender(g)
        C = Vector(MAPA.to_blender(cx, cy)[:2])
        m = Matrix(((ex[0], ey[0], 0, C.x), (ex[1], ey[1], 0, C.y), (0, 0, 1, zc), (0, 0, 0, 1)))
        bm = bmesh.new()
        n = max(segs, int(96 * max(a, b) / max(1.0, min(a, b)) ** 0.5))
        superquadric_param(bm, (a, b, c), p, q, m, n, rings)
        obj = self.mk(bm, role)
        self.tierras.append((C, Vector(ex), Vector(ey), a, b, c, zc, p, q))
        return obj

    def shoal(self, cx, cy, a, b, g=0.0, p=2.4, foam=True):
        """Bajío turquesa y anillo de espuma alrededor de una tierra."""
        ex, ey = MAPA.dir_blender(g)
        C = Vector(MAPA.to_blender(cx, cy)[:2])
        m = Matrix(((ex[0], ey[0], 0, C.x), (ex[1], ey[1], 0, C.y), (0, 0, 1, -0.035), (0, 0, 0, 1)))
        bm = bmesh.new()
        self.G.superquadric(bm, (a + 0.62, b + 0.55, 0.09), p, 2.0, matrix=m, segs=64, rings=12)
        self.mk(bm, "shallow")
        if foam:
            mf = Matrix(((ex[0] * (a + 0.1), ey[0] * (b + 0.1), 0, C.x),
                         (ex[1] * (a + 0.1), ey[1] * (b + 0.1), 0, C.y), (0, 0, 1, 0.055), (0, 0, 0, 1)))
            self.torus("foam", 1.0, 0.035, mf, nu=72, nv=8)

    def isla(self, spec, zc=-0.14, q=3.0):
        """Isla de mapa.json: tierra + bajío + espuma, o escollera de cantos."""
        cx, cy = spec["centro"]
        a, b, g, p = spec["a"], spec["b"], spec.get("giro", 0.0), spec.get("p", 2.4)
        c = spec.get("alto", 0.5)
        if spec.get("forma") == "escollera":
            return self.escollera(spec)
        role = spec.get("rol", "sand")
        if role == "rock":
            obj = self.land(cx, cy, a, b, c + 0.25, -0.2, g, p, 2.2, role="rock", segs=48, rings=20)
        else:
            obj = self.land(cx, cy, a, b, c, zc, g, p, q, role=role)
        if spec.get("bajio", True):
            self.shoal(cx, cy, a, b, g, p)
        return obj

    def escollera(self, spec):
        cx, cy = spec["centro"]
        a, b, g = spec["a"], spec["b"], math.radians(spec.get("giro", 0.0))
        ux, uy = math.cos(g), math.sin(g)
        n = int(a * 2 / (b * 0.95)) + 1
        for k in range(n):
            t = -a + 2 * a * k / (n - 1)
            for side in (-0.45, 0.45):
                j = self.rng.uniform(-0.12, 0.12)
                x = cx + ux * (t + j) - uy * side * b
                y = cy + uy * (t + j) + ux * side * b
                s = b * self.rng.uniform(0.62, 0.85)
                self.blob("rock", (s, s * 0.9, s * 0.75), self.at(x, y, 0.12 + self.rng.uniform(-0.05, 0.08)), 2.3, 2.3,
                          extra=rot("Z", self.rng.uniform(0, 360)), segs=16, rings=10)
        ex, ey = MAPA.dir_blender(spec.get("giro", 0.0))
        self.tierras.append((Vector(MAPA.to_blender(cx, cy)[:2]), Vector(ex), Vector(ey), a, b, 0.5, 0.0, 2.0, 2.0))


# --- mar ---------------------------------------------------------------------------
def mar(B):
    with B.pieza("mar", "mundo"):
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=80.0)
        B.mk(bm, "sea")
    rng = random.Random(77)
    E = B.M["limites"]["encuadre_general"]
    with B.pieza("olas", "mundo"):
        placed = 0
        tries = 0
        while placed < 150 and tries < 4000:
            tries += 1
            x, y = rng.uniform(-15.5, 15.5), rng.uniform(E["y"][0] - 0.5, E["y"][1])
            if MAPA.on_land(B.M, (x, y), margin=0.9):
                continue
            if B.ground_b(*MAPA.to_blender(x, y)[:2]) > -0.3:
                continue
            ang = rng.uniform(-25, 25)
            L = rng.uniform(0.2, 0.34)
            c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
            base = B.at(x, y)
            R = Vector(MAPA.to_blender(c, s)[:2] + (0.0,))
            pts = [base + R * (L * t) + Vector((0, 0, 0.02 + 0.03 * math.sin(math.pi * (t + 1) / 2))) for t in (-1, -0.5, 0, 0.5, 1)]
            B.tube("foam", pts, [0.012, 0.028, 0.034, 0.028, 0.012], 6)
            placed += 1


def load_zone(name):
    path = os.path.join(ZONAS_DIR, name + ".py")
    spec = importlib.util.spec_from_file_location("zona_" + name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def build(tema, geo, M=None, solo=None, variante="venta"):
    """Construye el mundo. `solo`: lista de ids de zona (más 'costas', 'extras') para iterar rápido.
    `variante`: "venta" o "recuerdo", el estado del evento de las islas que lo tienen."""
    M = M or MAPA.load()
    root = bpy.data.objects.new("mundo_root", None)
    bpy.context.scene.collection.objects.link(root)
    B = Builder(tema, geo, M, root)
    B.variante = variante
    import piezas  # noqa: F401  (se importa aquí para que zonas/ lo encuentre ya cargado)
    wanted = set(solo) if solo else None
    order = ["costas"] + [z["id"] for z in M["zonas"]] + ["extras"]
    for zid in order:
        if wanted and zid not in wanted:
            continue
        path = os.path.join(ZONAS_DIR, zid + ".py")
        if not os.path.exists(path):
            print("[escena] falta zonas/%s.py" % zid)
            continue
        Z = next((z for z in M["zonas"] if z["id"] == zid), None)
        with B.zona(zid):
            load_zone(zid).build(B, Z, M)
    mar(B)
    return B
