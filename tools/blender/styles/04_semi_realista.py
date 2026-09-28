"""Estilo 04, semi-realista: remolcador envejecido con PBR procedural.

Prueba de estilo (no es el barco definitivo). Casco de acero verde azulado con
desgaste y chorretones de óxido, cubierta de tablones, caseta crema con
ventanas, chimenea rojiblanca con remate negro, neumáticos de defensa,
salvavidas naranjas, cajas, barriles, bandera azul con olas blancas y faroles
con brillo cálido. Principled BSDF, ruido procedural, biseles, sombras del sol,
AO de Eevee (horizon scan) y view transform AgX. Sin contorno.

    Blender -b -P tools/blender/styles/04_semi_realista.py -- --out tools/blender/out/styles/04_semi_realista

Con --sheet-dir DIR además compone con ffmpeg la hoja de 8 direcciones y el
hero sobre agua plana (#2E86B5) en DIR/01-estilo-04-semi-realista*.png.
"""
import argparse
import math
import os
import shutil
import subprocess
import sys
import time

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))          # tools/blender
import rig  # noqa: E402
from ship import DIRECTIONS, yaw_for  # noqa: E402

SLUG = "04-semi-realista"
WATER = "0x2E86B5"

# --- Paleta (sRGB) ------------------------------------------------------------
TEAL = "#2C6B67"
TEAL_FADED = "#4E8A80"
RUST = "#7B3F1F"
RUST_DARK = "#4E2412"
BOOT_RED = "#6A2019"
GRIME = "#2A2B22"
CREAM = "#E3DBC6"
CREAM_FADED = "#C7BCA2"
WOOD_A = "#8E7050"
WOOD_B = "#A88A63"
WOOD_DARK = "#5B4430"
CRATE_A = "#8F6236"
CRATE_B = "#A87845"
BARREL = "#7A4B2A"
IRON = "#2B2A28"
RUBBER = "#171717"
FUNNEL_RED = "#B02A1E"
FUNNEL_WHITE = "#ECE7DA"
SOOT = "#121212"
GLASS = "#16232C"
RING_ORANGE = "#F2661A"
RING_WHITE = "#F1ECE2"
FLAG_BLUE = "#1C4E9E"
ROPE = "#C2AA80"
LAMP = "#FFA22E"

# --- Dimensiones (unidades del mundo) ----------------------------------------
XS, XB = -0.93, 0.95          # popa y proa en la flotación
HALF_BEAM = 0.58
BOW_RAKE, STERN_RAKE = 0.11, 0.05
BULWARK_H, BULWARK_T = 0.085, 0.035
N_SIDE = 26                   # estaciones por costado (espaciado coseno)

HOUSE = (-0.52, 0.22, 0.35, 0.63)     # caseta baja: x0, x1, media manga, techo
WHEEL = (-0.18, 0.20, 0.30, 0.95)     # puente
ROOF = (-0.22, 0.25, 0.345, 0.99)
FUNNEL_X, FUNNEL_TOP = -0.36, 1.18
FUNNEL_BANDS = (0.84, 0.91, 1.00, 1.07)   # rojo | blanco | rojo | blanco | remate negro
MAST_X, MAST_TOP = 0.06, 1.84
FLAG_W, FLAG_H = 0.40, 0.25


# --- Color y nodos ---------------------------------------------------------------
def lin(h, a=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (c[0], c[1], c[2], a)


def sock(sockets, name):
    for s in sockets:
        if s.name == name and s.enabled:
            return s
    raise KeyError(name)


class Nodes:
    """Atajos para armar árboles de nodos sin ruido."""

    def __init__(self, mat):
        self.nt = mat.node_tree
        self.nt.nodes.clear()
        self.bsdf = self.nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = self.nt.nodes.new("ShaderNodeOutputMaterial")
        self.nt.links.new(self.bsdf.outputs["BSDF"], out.inputs["Surface"])
        self._tc = None

    def put(self, target, value):
        if isinstance(value, bpy.types.NodeSocket):
            self.nt.links.new(value, target)
        else:
            target.default_value = value

    def node(self, kind, inputs=None, **props):
        n = self.nt.nodes.new(kind)
        for k, v in props.items():
            setattr(n, k, v)
        for k, v in (inputs or {}).items():
            self.put(n.inputs[k] if isinstance(k, int) else sock(n.inputs, k), v)
        return n

    def coord(self, kind="Object"):
        if self._tc is None:
            self._tc = self.nt.nodes.new("ShaderNodeTexCoord")
        return self._tc.outputs[kind]

    def xyz(self, vec=None):
        n = self.node("ShaderNodeSeparateXYZ", {"Vector": vec or self.coord()})
        return n.outputs["X"], n.outputs["Y"], n.outputs["Z"]

    def math(self, op, a, b=0.0, clamp=False):
        n = self.node("ShaderNodeMath", operation=op, use_clamp=clamp)
        self.put(n.inputs[0], a)
        self.put(n.inputs[1], b)
        return n.outputs[0]

    def remap(self, v, a, b, c=0.0, d=1.0):
        n = self.node("ShaderNodeMapRange", {"Value": v, "From Min": a, "From Max": b, "To Min": c, "To Max": d},
                      clamp=True)
        return sock(n.outputs, "Result")

    def noise(self, scale, detail=3.0, rough=0.55, vec=None, stretch=None):
        if stretch is not None:
            vec = sock(self.node("ShaderNodeMapping", {"Vector": vec or self.coord(), "Scale": stretch}).outputs,
                       "Vector")
        n = self.node("ShaderNodeTexNoise", {"Vector": vec or self.coord(), "Scale": scale,
                                             "Detail": detail, "Roughness": rough})
        return n.outputs["Fac"]

    def white(self, w):
        n = self.node("ShaderNodeTexWhiteNoise", {"W": w}, noise_dimensions="1D")
        return n.outputs["Value"]

    def mix(self, fac, a, b):
        n = self.node("ShaderNodeMix", data_type="RGBA")
        self.put(sock(n.inputs, "Factor"), fac)
        self.put(sock(n.inputs, "A"), lin(a) if isinstance(a, str) else a)
        self.put(sock(n.inputs, "B"), lin(b) if isinstance(b, str) else b)
        return sock(n.outputs, "Result")

    def bump(self, height, strength=0.1, distance=0.02):
        n = self.node("ShaderNodeBump", {"Height": height, "Strength": strength, "Distance": distance})
        self.put(self.bsdf.inputs["Normal"], n.outputs["Normal"])

    def finish(self, color, rough, metal=0.0, spec=0.5):
        self.put(self.bsdf.inputs["Base Color"], lin(color) if isinstance(color, str) else color)
        self.put(self.bsdf.inputs["Roughness"], rough)
        self.put(self.bsdf.inputs["Metallic"], metal)
        self.put(self.bsdf.inputs["Specular IOR Level"], spec)


def new_mat(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    return mat, Nodes(mat)


# --- Materiales ----------------------------------------------------------------
def mat_paint(name, base, faded, streaks=0.7, patches=True, waterline=False, top_z=0.30):
    """Acero pintado: decoloración a manchas, chorretones de óxido verticales, parches de óxido."""
    mat, n = new_mat(name)
    x, y, z = n.xyz()
    fade = n.remap(n.noise(2.6, 4.0), 0.42, 0.72, 0.0, 0.65)
    col = n.mix(fade, base, faded)
    rust_mask = 0.0
    if streaks:
        s = n.remap(n.noise(1.0, 2.0, 0.5, stretch=(24.0, 24.0, 1.4)), 0.55, 0.68)
        s = n.math("MULTIPLY", s, n.remap(z, 0.0, top_z, 0.15, 1.0))
        s = n.math("MULTIPLY", s, n.remap(n.noise(5.0), 0.40, 0.62))
        s = n.math("MULTIPLY", s, streaks)
        col = n.mix(s, col, RUST)
        rust_mask = s
    if patches:
        p = n.remap(n.noise(10.0, 5.0, 0.6), 0.635, 0.69)
        col = n.mix(p, col, RUST_DARK)
        rust_mask = n.math("MAXIMUM", rust_mask, p)
    if waterline:
        col = n.mix(n.remap(z, 0.040, 0.050, 1.0, 0.0), col, BOOT_RED)
        col = n.mix(n.remap(z, 0.0, 0.12, 0.55, 0.0), col, GRIME)
    rough = n.math("ADD", 0.42, n.math("MULTIPLY", rust_mask, 0.45))
    n.bump(n.noise(38.0, 4.0), 0.06)
    n.finish(col, rough, 0.0, 0.45)
    return mat


def planks(n, across, along, width, length, col_a, col_b, dark, seam_strength=0.85):
    """Tablones: `across` corta los tablones, `along` es la veta. Devuelve un color."""
    t = n.math("DIVIDE", across, width)
    idx = n.math("FLOOR", t)
    fr = n.math("SUBTRACT", t, idx)
    seam = n.remap(n.math("ABSOLUTE", n.math("SUBTRACT", fr, 0.5)), 0.40, 0.5)
    tx = n.math("ADD", n.math("DIVIDE", along, length), n.math("MULTIPLY", n.white(idx), 3.0))
    jdx = n.math("FLOOR", tx)
    butt = n.remap(n.math("ABSOLUTE", n.math("SUBTRACT", n.math("SUBTRACT", tx, jdx), 0.5)), 0.475, 0.5)
    seam = n.math("MAXIMUM", seam, butt)
    tone = n.white(n.math("ADD", idx, n.math("MULTIPLY", jdx, 17.31)))
    col = n.mix(tone, col_a, col_b)
    return col, seam


def mat_deck():
    mat, n = new_mat("deck_wood")
    x, y, z = n.xyz()
    col, seam = planks(n, y, x, 0.068, 0.55, WOOD_A, WOOD_B, WOOD_DARK)
    grain = n.remap(n.noise(1.0, 3.0, 0.6, stretch=(1.2, 55.0, 1.2)), 0.35, 0.7, 0.0, 0.35)
    col = n.mix(grain, col, WOOD_DARK)
    dirt = n.remap(n.noise(4.0, 4.0), 0.5, 0.75, 0.0, 0.45)
    col = n.mix(dirt, col, "#4A4034")
    col = n.mix(n.math("MULTIPLY", seam, 0.85), col, "#2A2018")
    n.bump(n.math("SUBTRACT", 1.0, seam), 0.25, 0.01)
    n.finish(col, 0.78, 0.0, 0.3)
    return mat


def mat_crate():
    mat, n = new_mat("crate_wood")
    x, y, z = n.xyz()
    col, seam = planks(n, z, n.math("ADD", x, y), 0.048, 0.7, CRATE_A, CRATE_B, WOOD_DARK)
    grain = n.remap(n.noise(1.0, 3.0, 0.6, stretch=(40.0, 40.0, 1.5)), 0.35, 0.7, 0.0, 0.3)
    col = n.mix(grain, col, "#7A5A36")
    col = n.mix(n.math("MULTIPLY", seam, 0.8), col, "#3A2A1A")
    n.bump(n.math("SUBTRACT", 1.0, seam), 0.2, 0.01)
    n.finish(col, 0.72, 0.0, 0.3)
    return mat


def mat_barrel():
    """Duelas verticales por ángulo (coordenadas locales: cada barril tiene su origen)."""
    mat, n = new_mat("barrel_wood")
    x, y, z = n.xyz()
    ang = n.math("ARCTAN2", y, x)
    t = n.math("MULTIPLY", ang, 14.0 / (2 * math.pi))
    fr = n.math("FRACT", t)
    seam = n.remap(n.math("ABSOLUTE", n.math("SUBTRACT", fr, 0.5)), 0.40, 0.5)
    tone = n.white(n.math("FLOOR", t))
    col = n.mix(tone, BARREL, "#94603A")
    col = n.mix(n.math("MULTIPLY", seam, 0.8), col, "#2E1C10")
    n.finish(col, 0.7, 0.0, 0.3)
    return mat


def mat_flag():
    """Azul con el símbolo de olas ≈ en blanco. Coordenadas locales: x hacia -W, z de 0 a H."""
    mat, n = new_mat("flag")
    x, y, z = n.xyz()
    u = n.math("DIVIDE", x, -FLAG_W)
    v = n.math("DIVIDE", z, FLAG_H)
    wave = n.math("MULTIPLY", n.math("SINE", n.math("MULTIPLY", u, 2 * math.pi * 1.25)), 0.075)
    white = 0.0
    for c in (0.36, 0.63):
        d = n.math("ABSOLUTE", n.math("SUBTRACT", n.math("SUBTRACT", v, c), wave))
        white = n.math("MAXIMUM", white, n.remap(d, 0.050, 0.068, 1.0, 0.0))
    mask = n.math("MULTIPLY", n.remap(u, 0.13, 0.17), n.remap(u, 0.83, 0.87, 1.0, 0.0))
    col = n.mix(n.math("MULTIPLY", white, mask), FLAG_BLUE, "#F4F4F0")
    n.finish(col, 0.8, 0.0, 0.3)
    return mat


def mat_simple(name, color, rough, metal=0.0, spec=0.5, bump=0.0, emit=None, emit_strength=0.0):
    mat, n = new_mat(name)
    if bump:
        n.bump(n.noise(30.0, 3.0), bump)
    n.finish(color, rough, metal, spec)
    if emit:
        n.put(n.bsdf.inputs["Emission Color"], lin(emit))
        n.put(n.bsdf.inputs["Emission Strength"], emit_strength)
    return mat


def mat_funnel(name, color):
    """Chimenea: color liso con hollín que sube hacia el remate."""
    mat, n = new_mat(name)
    x, y, z = n.xyz()
    soot = n.math("MULTIPLY", n.remap(z, FUNNEL_BANDS[2], FUNNEL_BANDS[3] + 0.02, 0.0, 0.45),
                  n.remap(n.noise(6.0, 4.0), 0.35, 0.65))
    col = n.mix(soot, color, SOOT)
    n.bump(n.noise(35.0, 3.0), 0.04)
    n.finish(col, 0.5, 0.0, 0.45)
    return mat


class Mats:
    def __init__(self):
        self.hull = mat_paint("hull", TEAL, TEAL_FADED, 0.8, True, waterline=True)
        self.teal = mat_paint("teal_trim", TEAL, TEAL_FADED, 0.35, True, top_z=1.0)
        self.cream = mat_paint("cream", CREAM, CREAM_FADED, 0.35, False, top_z=1.0)
        self.deck = mat_deck()
        self.crate = mat_crate()
        self.barrel = mat_barrel()
        self.flag = mat_flag()
        self.iron = mat_simple("iron", IRON, 0.45, 0.7, bump=0.05)
        self.rubber = mat_simple("rubber", RUBBER, 0.82, 0.0, 0.25, bump=0.08)
        self.glass = mat_simple("glass", GLASS, 0.08, 0.0, 0.9)
        self.ring_o = mat_simple("ring_orange", RING_ORANGE, 0.55)
        self.ring_w = mat_simple("ring_white", RING_WHITE, 0.55)
        self.rope = mat_simple("rope", ROPE, 0.9, bump=0.2)
        self.f_red = mat_funnel("funnel_red", FUNNEL_RED)
        self.f_white = mat_funnel("funnel_white", FUNNEL_WHITE)
        self.soot = mat_simple("soot", SOOT, 0.7)
        # Cristal sólo emisivo: la luz puntual vive dentro del farol y lo quemaría a blanco.
        self.lamp = mat_simple("lamp", "#000000", 1.0, spec=0.0, emit=LAMP, emit_strength=0.9)


# --- Mallas ------------------------------------------------------------------------
def link(name, bm, mats, parent, smooth=None, bevel=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    """smooth: ángulo en grados para sombreado suave con aristas vivas; None = plano."""
    me = bpy.data.meshes.new(name)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for f in bm.faces:
        f.smooth = smooth is not None
    if smooth is not None:
        sharp = math.radians(smooth)
        for e in bm.edges:
            e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(0.0) < sharp
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = loc
    obj.rotation_euler = rot
    if bevel:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
    return obj


def box(bm, x0, x1, y0, y1, z0, z1, mat_index=0):
    m = Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ \
        Matrix.Diagonal((x1 - x0, y1 - y0, z1 - z0, 1.0))
    r = bmesh.ops.create_cube(bm, size=1.0, matrix=m)
    for f in faces_of(r["verts"]):
        f.material_index = mat_index
    return r["verts"]


def faces_of(verts):
    fs = set()
    for v in verts:
        fs.update(v.link_faces)
    return list(fs)


def cyl(bm, p0, p1, r, segs=12, r_top=None, mat_index=0):
    p0, p1 = Vector(p0), Vector(p1)
    axis = p1 - p0
    rot = axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
    ret = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r,
                                radius2=r if r_top is None else r_top, depth=axis.length,
                                matrix=Matrix.Translation((p0 + p1) / 2) @ rot)
    for f in faces_of(ret["verts"]):
        f.material_index = mat_index
    return ret["verts"]


def torus(bm, major, minor, matrix, nu=16, nv=8, idx_fn=lambda i: 0):
    """Toro en el plano XZ (eje Y); idx_fn(i) da el material del gajo i."""
    ring = [[None] * nv for _ in range(nu)]
    for i in range(nu):
        a = 2 * math.pi * i / nu
        for j in range(nv):
            b = 2 * math.pi * j / nv
            rr = major + minor * math.cos(b)
            ring[i][j] = bm.verts.new(matrix @ Vector((rr * math.cos(a), minor * math.sin(b), rr * math.sin(a))))
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((ring[i][j], ring[(i + 1) % nu][j], ring[(i + 1) % nu][(j + 1) % nv],
                              ring[i][(j + 1) % nv]))
            f.material_index = idx_fn(i)


def sweep(bm, pts, radius, segs=8, closed=False, mat_index=0):
    """Tubo a lo largo de una polilínea; `radius` puede ser número o lista."""
    n = len(pts)
    radii = radius if isinstance(radius, (list, tuple)) else [radius] * n
    rings = []
    for i, p in enumerate(pts):
        if closed:
            t = pts[(i + 1) % n] - pts[i - 1]
        else:
            t = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]
        t.normalize()
        ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        a = t.cross(ref).normalized()
        b = t.cross(a).normalized()
        rings.append([bm.verts.new(p + radii[i] * (math.cos(th) * a + math.sin(th) * b))
                      for th in (2 * math.pi * k / segs for k in range(segs))])
    pairs = list(zip(rings, rings[1:])) + ([(rings[-1], rings[0])] if closed else [])
    for ra, rb in pairs:
        for k in range(segs):
            f = bm.faces.new((ra[k], ra[(k + 1) % segs], rb[(k + 1) % segs], rb[k]))
            f.material_index = mat_index
    if not closed:
        for r in (rings[0], rings[-1]):
            f = bm.faces.new(r)
            f.material_index = mat_index


# --- Casco -------------------------------------------------------------------------
def half_beam(u):
    """Manga media en la cubierta: popa redonda y roma, proa afilada pero llena."""
    if u >= 0.48:
        k = (u - 0.48) / 0.52
        return HALF_BEAM * max(0.0, 1 - k ** 2.1) ** 0.62
    k = (0.48 - u) / 0.48
    return HALF_BEAM * max(0.0, 1 - k ** 3.2) ** 0.38


def deck_z(u):
    """Arrufo de remolcador: popa baja, proa levantada."""
    return 0.33 + 0.24 * max(0.0, u - 0.42) ** 2 / 0.58 ** 2 + 0.04 * (1 - u) ** 4


def width_factor(f):
    table = [(0.0, 0.80), (0.25, 0.91), (0.5, 0.97), (0.8, 1.0), (1.0, 0.995), (2.0, 0.975)]
    for (f0, w0), (f1, w1) in zip(table, table[1:]):
        if f <= f1:
            k = (max(f, f0) - f0) / (f1 - f0)
            return w0 + (w1 - w0) * k
    return table[-1][1]


def u_samples():
    return [(1 - math.cos(math.pi * i / (N_SIDE - 1))) / 2 for i in range(N_SIDE)]


def hull_point(u, side, f=None, z_abs=None):
    zd = deck_z(u)
    z = f * zd if z_abs is None else z_abs(zd)
    f = z / zd
    x = XS + (XB - XS) * u + BOW_RAKE * f * u ** 6 - STERN_RAKE * f * (1 - u) ** 6
    return Vector((x, side * half_beam(u) * width_factor(f), z))


def ring(f=None, z_abs=None):
    us = u_samples()
    stb = [hull_point(u, -1, f, z_abs) for u in us]
    port = [hull_point(u, 1, f, z_abs) for u in us]
    return stb + port[-2:0:-1]        # popa, estribor → proa, babor → popa


def offset_ring(pts, d):
    """Desplaza en planta cada punto `d` hacia dentro (d<0: hacia fuera)."""
    out = []
    n = len(pts)
    for i, p in enumerate(pts):
        t = pts[(i + 1) % n] - pts[i - 1]
        nrm = Vector((t.y, -t.x, 0.0))
        if nrm.length < 1e-9:
            nrm = Vector((1, 0, 0))
        nrm.normalize()
        c = Vector((max(-0.5, min(0.5, p.x)), 0.0, p.z))
        if nrm.dot(c - p) < 0:
            nrm = -nrm
        out.append(p + nrm * d)
    return out


def build_hull(M, parent):
    bm = bmesh.new()
    mats = [M.hull, M.cream, M.deck]       # 0 casco, 1 regala/amurada, 2 cubierta
    outer = [ring(f) for f in (0.0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1.0)]
    outer.append(ring(z_abs=lambda zd: zd + BULWARK_H))
    top_in = offset_ring(outer[-1], BULWARK_T)
    deck_in = offset_ring(outer[-2], BULWARK_T)
    rings = [[bm.verts.new(p) for p in r] for r in outer + [top_in, deck_in]]
    m = len(rings[0])
    n_out = len(outer)
    for ri, (ra, rb) in enumerate(zip(rings, rings[1:])):
        idx = 0 if ri < n_out - 1 else 1
        for k in range(m):
            f = bm.faces.new((ra[k], ra[(k + 1) % m], rb[(k + 1) % m], rb[k]))
            f.material_index = idx
    d = rings[-1]
    for i in range(N_SIDE - 1):
        vs = [d[i], d[i + 1], d[(m - i - 1) % m], d[(m - i) % m]]
        uniq = []
        for v in vs:
            if v not in uniq:
                uniq.append(v)
        f = bm.faces.new(uniq)
        f.material_index = 2
    return link("hull", bm, mats, parent, smooth=50)


def build_fenders(M, parent):
    bm = bmesh.new()
    # Verduguillo de goma alrededor del casco, bajo la cubierta.
    rail = offset_ring(ring(0.80), -0.022)
    sweep(bm, rail, 0.032, 8, closed=True)
    # Defensa de proa: goma gruesa a lo largo de la roda.
    stem = [hull_point(1.0, 0, f) + Vector((0.035, 0, 0)) for f in (0.12, 0.3, 0.5, 0.7, 0.9, 1.08)]
    sweep(bm, stem, [0.05, 0.062, 0.066, 0.066, 0.062, 0.05], 10)
    # Neumáticos colgados en los costados.
    for u in (0.24, 0.45, 0.66):
        for side in (-1, 1):
            p = hull_point(u, side, 0.42)
            yaw = math.atan2(*(hull_point(u + 0.02, side, 0.42) - hull_point(u - 0.02, side, 0.42)).yx)
            mtx = Matrix.Translation(p + Vector((0, side * 0.045, 0))) @ Matrix.Rotation(yaw, 4, "Z") @ \
                Matrix.Rotation(math.radians(side * 12), 4, "X")
            torus(bm, 0.068, 0.034, mtx, 14, 8)
    return link("fenders", bm, [M.rubber], parent, smooth=70)


# --- Superestructura -------------------------------------------------------------
def build_house(M, parent):
    objs = []
    hx0, hx1, hy, hz = HOUSE
    wx0, wx1, wy, wz = WHEEL
    bm = bmesh.new()
    box(bm, hx0, hx1, -hy, hy, 0.28, hz)
    box(bm, wx0, wx1, -wy, wy, hz - 0.01, wz)
    objs.append(link("house", bm, [M.cream], parent, bevel=0.014))

    bm = bmesh.new()
    rx0, rx1, ry, rz = ROOF
    box(bm, rx0, rx1, -ry, ry, wz - 0.005, rz)                     # techo con alero
    box(bm, hx0 - 0.01, hx1 + 0.01, -hy - 0.01, hy + 0.01, hz - 0.012, hz + 0.018)  # cornisa
    for side in (-1, 1):                                            # puertas
        box(bm, 0.03, 0.16, side * hy - 0.008, side * hy + 0.008, 0.36, 0.59)
    objs.append(link("house_trim", bm, [M.teal], parent, bevel=0.008))

    bm = bmesh.new()
    t = 0.006
    for yc in (-0.18, 0.0, 0.18):                                   # frente del puente
        box(bm, wx1 - t, wx1 + t, yc - 0.075, yc + 0.075, hz + 0.10, wz - 0.05)
    for side in (-1, 1):
        for xc in (-0.07, 0.10):                                    # costados del puente
            box(bm, xc - 0.065, xc + 0.065, side * wy - t, side * wy + t, hz + 0.10, wz - 0.05)
    for yc in (-0.13, 0.13):                                        # trasera del puente
        box(bm, wx0 - t, wx0 + t, yc - 0.06, yc + 0.06, hz + 0.11, wz - 0.06)
    for side in (-1, 1):                                            # ojos de buey
        cyl(bm, (-0.13, side * (hy - 0.004), 0.50), (-0.13, side * (hy + 0.008), 0.50), 0.036, 12)
    for yc in (-0.17, 0.17):
        cyl(bm, (hx1 - 0.004, yc, 0.50), (hx1 + 0.008, yc, 0.50), 0.034, 12)
    objs.append(link("windows", bm, [M.glass], parent))

    # Salvavidas naranjas con franjas blancas a ambos lados de la caseta.
    bm = bmesh.new()
    for side in (-1, 1):
        mtx = Matrix.Translation((-0.37, side * (hy + 0.03), 0.48))
        torus(bm, 0.074, 0.024, mtx, 16, 8, idx_fn=lambda i: 1 if i % 4 == 0 else 0)
    objs.append(link("life_rings", bm, [M.ring_o, M.ring_w], parent, smooth=80))
    return objs


def build_funnel(M, parent):
    bm = bmesh.new()
    z0 = HOUSE[3] - 0.01
    b = FUNNEL_BANDS
    bands = [(z0, 0), (b[0], 1), (b[1], 0), (b[2], 1), (b[3], 2), (FUNNEL_TOP, None)]
    segs, rx, ry, rake = 20, 0.125, 0.10, 0.06
    rings = []
    for z, _ in bands:
        k = (z - z0) / (FUNNEL_TOP - z0)
        cx = FUNNEL_X - rake * k
        rings.append([bm.verts.new((cx + rx * math.cos(a), ry * math.sin(a), z))
                      for a in (2 * math.pi * s / segs for s in range(segs))])
    for (z, mi), ra, rb in zip(bands, rings, rings[1:]):
        for s in range(segs):
            f = bm.faces.new((ra[s], ra[(s + 1) % segs], rb[(s + 1) % segs], rb[s]))
            f.material_index = mi
    top = rings[-1]
    inner = [bm.verts.new(v.co + Vector((-(v.co.x - FUNNEL_X + rake) * 0.2, -v.co.y * 0.2, 0.0))) for v in top]
    for s in range(segs):
        f = bm.faces.new((top[s], top[(s + 1) % segs], inner[(s + 1) % segs], inner[s]))
        f.material_index = 2
    low = [bm.verts.new(v.co + Vector((0, 0, -0.08))) for v in inner]
    for s in range(segs):
        f = bm.faces.new((inner[s], inner[(s + 1) % segs], low[(s + 1) % segs], low[s]))
        f.material_index = 2
    f = bm.faces.new(low)
    f.material_index = 2
    return link("funnel", bm, [M.f_red, M.f_white, M.soot], parent, smooth=40)


def build_mast(M, parent):
    objs = []
    bm = bmesh.new()
    base = ROOF[3]
    cyl(bm, (MAST_X, 0, base - 0.01), (MAST_X, 0, MAST_TOP), 0.024, 10, 0.017)
    cyl(bm, (MAST_X, -0.17, 1.42), (MAST_X, 0.17, 1.42), 0.012, 8)                  # verga
    objs.append(link("mast", bm, [M.cream], parent, smooth=50))

    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.028,
                               matrix=Matrix.Translation((MAST_X, 0, MAST_TOP + 0.012)))
    cyl(bm, (MAST_X + 0.07, 0.0, base), (MAST_X + 0.07, 0.0, base + 0.05), 0.045, 14, 0.04)  # reflector
    for side in (-1, 1):
        cyl(bm, (MAST_X, side * 0.17, 1.42), (MAST_X, side * 0.17, 1.46), 0.014, 8)
    objs.append(link("mast_iron", bm, [M.iron], parent, smooth=60))

    # Bandera: malla local con origen en el puño bajo; el shader dibuja las olas.
    bm = bmesh.new()
    rows, cols = 4, 10
    grid = []
    for i in range(rows + 1):
        row = []
        for j in range(cols + 1):
            u = j / cols
            row.append(bm.verts.new((-FLAG_W * u, 0.04 * math.sin(2 * math.pi * 1.1 * u) * u,
                                     FLAG_H * i / rows - 0.02 * u)))
        grid.append(row)
    for i in range(rows):
        for j in range(cols):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    objs.append(link("flag", bm, [M.flag], parent, smooth=80,
                     loc=(MAST_X - 0.02, 0, MAST_TOP - 0.02 - FLAG_H)))
    return objs


def lantern(bm, p, h=0.12, r=0.042):
    """Farol: base y tapa de hierro (índice 0) y cristal encendido (índice 1)."""
    x, y, z = p
    cyl(bm, (x, y, z), (x, y, z + 0.02), r * 1.15, 10, mat_index=0)
    cyl(bm, (x, y, z + 0.02), (x, y, z + h - 0.03), r, 10, mat_index=1)
    cyl(bm, (x, y, z + h - 0.03), (x, y, z + h), r * 1.25, 10, r * 0.3, mat_index=0)


def build_lanterns(M, parent):
    bm = bmesh.new()
    bow_u = 0.9
    bx = hull_point(bow_u, 0, 1.0).x - 0.04
    bz = deck_z(bow_u)
    cyl(bm, (bx, 0, bz - 0.02), (bx, 0, bz + 0.16), 0.014, 8)                        # poste de proa
    lantern(bm, (bx, 0, bz + 0.16))
    lantern(bm, (MAST_X + 0.055, 0, 1.24), 0.11, 0.038)                            # farol del mástil
    cyl(bm, (MAST_X, 0, 1.30), (MAST_X + 0.055, 0, 1.30), 0.008, 6)
    obj = link("lanterns", bm, [M.iron, M.lamp], parent, smooth=50)
    for name, loc, power in (("lamp_bow", (bx, 0, bz + 0.225), 9.0), ("lamp_mast", (MAST_X + 0.055, 0, 1.30), 5.0)):
        ld = bpy.data.lights.new(name, "POINT")
        ld.energy = power
        ld.color = lin(LAMP)[:3]
        ld.shadow_soft_size = 0.02
        ld.use_shadow = False           # la luz está dentro del farol: con sombra no saldría
        lo = bpy.data.objects.new(name, ld)
        bpy.context.scene.collection.objects.link(lo)
        lo.parent = parent
        lo.location = loc
    return obj


def build_cargo(M, parent):
    objs = []
    # Cajas: cada una con su origen para que las tablas sigan a la caja.
    crates = [((0.44, -0.16, deck_z(0.72)), 0.17, 0.15, 0.25),
              ((0.40, 0.13, deck_z(0.70)), 0.15, 0.13, -0.15),
              ((0.43, -0.15, deck_z(0.72) + 0.15), 0.12, 0.11, 0.55),
              ((-0.69, -0.21, deck_z(0.13)), 0.15, 0.14, 0.1)]
    for i, (p, s, h, yaw) in enumerate(crates):
        bm = bmesh.new()
        box(bm, -s / 2, s / 2, -s / 2, s / 2, 0.0, h)
        objs.append(link("crate_%d" % i, bm, [M.crate], parent, bevel=0.01, loc=p, rot=(0, 0, yaw)))
    # Barriles de madera con aros de hierro.
    for i, (x, y) in enumerate(((-0.70, 0.22), (-0.62, 0.07), (0.62, 0.17))):
        bm = bmesh.new()
        r0, h, segs = 0.062, 0.17, 16
        prof = [(0.0, 0.86), (0.03, 0.93), (0.045, 0.95), (0.085, 1.0), (0.125, 0.95), (0.14, 0.93),
                (0.17, 0.86)]
        hoop = {1, 4}
        rs = [[bm.verts.new((r0 * k * math.cos(a), r0 * k * math.sin(a), z))
               for a in (2 * math.pi * s / segs for s in range(segs))] for z, k in prof]
        for j, (ra, rb) in enumerate(zip(rs, rs[1:])):
            for s in range(segs):
                f = bm.faces.new((ra[s], ra[(s + 1) % segs], rb[(s + 1) % segs], rb[s]))
                f.material_index = 1 if j in hoop else 0
        for r in (rs[0], rs[-1]):
            f = bm.faces.new(r)
            f.material_index = 0
        u = (x - XS) / (XB - XS)
        objs.append(link("barrel_%d" % i, bm, [M.barrel, M.iron], parent, smooth=40,
                         loc=(x, y, deck_z(u) - 0.005)))
    # Bitas: doble bolardo a popa, bolardos a proa.
    bm = bmesh.new()
    zs = deck_z(0.08)
    for y in (-0.08, 0.08):
        cyl(bm, (-0.80, y, zs - 0.01), (-0.80, y, zs + 0.11), 0.035, 12)
        cyl(bm, (-0.80, y, zs + 0.11), (-0.80, y, zs + 0.13), 0.045, 12)
    cyl(bm, (-0.80, -0.08, zs + 0.07), (-0.80, 0.08, zs + 0.07), 0.018, 8)
    for side in (-1, 1):
        zb = deck_z(0.8)
        for dx in (0.0, 0.08):
            cyl(bm, (0.63 + dx, side * 0.24, zb - 0.01), (0.63 + dx, side * 0.24, zb + 0.07), 0.024, 10)
    objs.append(link("bitts", bm, [M.iron], parent, smooth=50))
    # Adujas de cabo.
    bm = bmesh.new()
    for p, r in (((0.30, 0.15, deck_z(0.66) + 0.02), 0.065), ((-0.84, -0.18, deck_z(0.05) + 0.02), 0.06)):
        for k in range(3):
            torus(bm, r - 0.012 * k, 0.014, Matrix.Translation(Vector(p) + Vector((0, 0, 0.022 * k))) @
                  Matrix.Rotation(math.pi / 2, 4, "X"), 16, 6)
    objs.append(link("rope", bm, [M.rope], parent, smooth=70))
    return objs


def build_ship():
    M = Mats()
    root = bpy.data.objects.new("ship_root", None)
    bpy.context.scene.collection.objects.link(root)
    build_hull(M, root)
    build_fenders(M, root)
    build_house(M, root)
    build_funnel(M, root)
    build_mast(M, root)
    build_lanterns(M, root)
    build_cargo(M, root)
    return root


# --- Escena y render --------------------------------------------------------------
def setup_look(scene):
    """Lo propio del estilo sobre la base de rig: AgX, sombras, AO y relleno de cielo."""
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.35
    ee = scene.eevee
    ee.use_shadows = True
    ee.shadow_ray_count = 2
    ee.shadow_step_count = 8
    ee.use_raytracing = True
    ee.ray_tracing_method = "SCREEN"
    ee.use_fast_gi = True
    ee.fast_gi_method = "GLOBAL_ILLUMINATION"
    ee.fast_gi_distance = 0.4
    ee.fast_gi_quality = 0.5
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = lin("#9FB7CC")
    bg.inputs["Strength"].default_value = 0.55


def compose(out, sheet_dir):
    ff = shutil.which("ffmpeg")
    if not ff:
        print("ffmpeg no está: no compongo las hojas")
        return
    os.makedirs(sheet_dir, exist_ok=True)
    ins = []
    for d in DIRECTIONS:
        ins += ["-i", os.path.join(out, d + ".png")]
    sheet = os.path.join(sheet_dir, "01-estilo-%s.png" % SLUG)
    subprocess.run([ff, "-v", "error", "-y", *ins, "-f", "lavfi", "-i", "color=c=%s:s=2048x256" % WATER,
                    "-filter_complex", "[0][1][2][3][4][5][6][7]hstack=inputs=8[s];[8][s]overlay=format=auto",
                    "-frames:v", "1", sheet], check=True)
    hero = os.path.join(sheet_dir, "01-estilo-%s-hero.png" % SLUG)
    subprocess.run([ff, "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=%s:s=512x512" % WATER,
                    "-i", os.path.join(out, "hero_SE.png"), "-filter_complex", "[0][1]overlay=format=auto",
                    "-frames:v", "1", hero], check=True)
    print("hojas:", sheet, hero)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="tools/blender/out/styles/04_semi_realista")
    ap.add_argument("--sheet-dir", help="si se da, compone aquí la hoja y el hero sobre agua (ffmpeg)")
    ap.add_argument("--only", help="renderizar sólo estas direcciones, separadas por comas")
    a = ap.parse_args(argv)
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)

    t0 = time.time()
    scene = rig.reset_scene()
    rig.setup_render(scene)
    rig.add_camera(scene)
    sun = rig.add_sun(scene)
    sun.data.use_shadow = True          # sin contorno invertido: la sombra no tapa nada
    setup_look(scene)
    root = build_ship()

    dirs = a.only.split(",") if a.only else DIRECTIONS
    times = []
    for d in dirs:
        t = time.time()
        root.rotation_euler = (0.0, 0.0, math.radians(yaw_for(d)))
        scene.render.filepath = os.path.join(out, d + ".png")
        bpy.ops.render.render(write_still=True)
        times.append(time.time() - t)
    if not a.only:
        t = time.time()
        root.rotation_euler = (0.0, 0.0, math.radians(yaw_for("SE")))
        scene.render.resolution_percentage = 200
        scene.render.filepath = os.path.join(out, "hero_SE.png")
        bpy.ops.render.render(write_still=True)
        scene.render.resolution_percentage = 100
        times.append(time.time() - t)
        if a.sheet_dir:
            compose(out, os.path.abspath(a.sheet_dir))
    print("TIEMPOS total=%.1fs por_imagen=%s" % (time.time() - t0, ", ".join("%.1f" % x for x in times)))


if __name__ == "__main__":
    main()
