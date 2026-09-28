"""Estilo 01, "Boceto a lápiz": remolcador dibujado a grafito, sólo grises.

Prueba de estilo, no diseño final. Técnica:
  - Relleno casi blanco con rampa toon de tres grises (Diffuse -> Shader to RGB).
  - Tramado de lápiz en coordenadas de pantalla (Texture Coordinate -> Window):
    líneas diagonales "/" que engordan cuanto más oscura es la zona, y un
    segundo tramado cruzado "\\" sólo en las sombras profundas. Un ruido tuerce
    las líneas para que no parezcan de regla. Las piezas "oscuras" (neumáticos,
    aros) no cambian de color: llevan más tramado, como en un dibujo a lápiz.
  - Contornos con Freestyle: trazo encadenado "sketchy" con ruido Perlin,
    sobretrazo en las puntas y grosor variable (presión); un segundo juego de
    líneas repasa sólo la silueta exterior con otra semilla.
  - Fondo transparente; cámara, luz y render de tools/blender/rig.py.

    Blender -b -P tools/blender/styles/01_boceto_lapiz.py -- --out tools/blender/out/styles/01_boceto_lapiz
"""
import argparse
import math
import os
import sys
import time

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))          # tools/blender
import rig  # noqa: E402
from ship import DIRECTIONS, yaw_for  # noqa: E402

# --- Lápiz ------------------------------------------------------------------
# Grises en sRGB (0..1). El tono se calcula en sRGB y se pasa a lineal al final.
PAPER = (0.975, 0.905, 0.815)      # relleno: luz | medio | sombra (rampa CONSTANT)
TOON_STEPS = (0.30, 0.62)          # umbrales de iluminación de la rampa
HATCH_1 = 0.40                     # gris de la primera capa de tramado
HATCH_2 = 0.30                     # gris del tramado cruzado
HATCH_PERIOD = (3.6, 4.2)          # px entre líneas (a 256 px de sprite)
HATCH_START = (0.56, 0.24)         # iluminación bajo la que empieza cada capa
HATCH_MAX_W = (0.55, 0.45)         # fracción máxima del periodo que ocupa la línea
WOBBLE_PX = 22.0                   # tamaño del ruido que tuerce el tramado
WOBBLE_AMP = 0.55                  # desvío del tramado, en periodos
LINE_GRAY = 0.16                   # grafito de los contornos
REF_RES = 256                      # el tramado se mide en píxeles del sprite de 256

# Oscuridad por pieza: se resta a la iluminación antes de rampa y tramado.
DARK = {
    "hull": 0.0, "bulwark": 0.02, "rail": 0.30, "deck": 0.10, "cabin": 0.0, "roof": 0.04,
    "funnel": 0.12, "funnel_band": 0.55, "mast": 0.22, "wood": 0.16, "crate_edge": 0.36,
    "barrel": 0.24, "hoop": 0.60, "tire": 0.62, "ring_a": 0.0, "ring_b": 0.50,
    "flag": 0.70, "lantern_cap": 0.45, "coil": 0.34,
}
FLAT = {"window": 0.30, "waves": 0.985, "glass": 0.97, "rope": 0.38, "soot": 0.22}


# --- Nodos ------------------------------------------------------------------
class Tree:
    def __init__(self, nt):
        self.nt = nt

    def node(self, kind, **props):
        n = self.nt.nodes.new(kind)
        for k, v in props.items():
            setattr(n, k, v)
        return n

    def feed(self, sock, v):
        if isinstance(v, (int, float)):
            sock.default_value = v
        else:
            self.nt.links.new(v, sock)

    def math(self, op, a, b=None, clamp=False):
        n = self.node("ShaderNodeMath", operation=op, use_clamp=clamp)
        self.feed(n.inputs[0], a)
        if b is not None:
            self.feed(n.inputs[1], b)
        return n.outputs[0]

    def lerp(self, a, b, t):
        return self.math("ADD", a, self.math("MULTIPLY", self.math("SUBTRACT", b, a), t))

    def map_range(self, v, f0, f1, t0, t1):
        n = self.node("ShaderNodeMapRange", clamp=True)
        self.feed(n.inputs["Value"], v)
        n.inputs["From Min"].default_value = f0
        n.inputs["From Max"].default_value = f1
        n.inputs["To Min"].default_value = t0
        n.inputs["To Max"].default_value = t1
        return n.outputs["Result"]


def emit_gray(t, gray_srgb, out):
    lin = t.math("POWER", gray_srgb, 2.2) if not isinstance(gray_srgb, float) else gray_srgb ** 2.2
    em = t.node("ShaderNodeEmission")
    if isinstance(lin, float):
        em.inputs["Color"].default_value = (lin, lin, lin, 1.0)
    else:
        t.nt.links.new(lin, em.inputs["Color"])
    em.inputs["Strength"].default_value = 1.0
    t.nt.links.new(em.outputs["Emission"], out.inputs["Surface"])


def pencil_material(name, dark):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    t = Tree(nt)
    out = t.node("ShaderNodeOutputMaterial")

    # Iluminación: 0 (espalda al sol) .. ~1 (de cara al sol), menos la oscuridad de la pieza.
    diffuse = t.node("ShaderNodeBsdfDiffuse")
    diffuse.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    to_rgb = t.node("ShaderNodeShaderToRGB")
    nt.links.new(diffuse.outputs["BSDF"], to_rgb.inputs["Shader"])
    bw = t.node("ShaderNodeRGBToBW")
    nt.links.new(to_rgb.outputs["Color"], bw.inputs["Color"])
    lum = t.math("SUBTRACT", bw.outputs["Val"], dark)

    # Relleno: tres grises de papel.
    ramp = t.node("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    els = ramp.color_ramp.elements
    els[0].position, els[1].position = 0.0, TOON_STEPS[0]
    els.new(TOON_STEPS[1])
    for el, g in zip(els, (PAPER[2], PAPER[1], PAPER[0])):
        el.color = (g, g, g, 1.0)
    nt.links.new(lum, ramp.inputs["Fac"])
    fill = t.math("ADD", ramp.outputs["Color"], 0.0)          # color gris -> valor

    # Coordenadas de pantalla en píxeles del sprite de 256 (el hero es un zoom).
    tc = t.node("ShaderNodeTexCoord")
    sep = t.node("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Window"], sep.inputs["Vector"])
    px = t.math("MULTIPLY", sep.outputs["X"], REF_RES)
    py = t.math("MULTIPLY", sep.outputs["Y"], REF_RES)
    comb = t.node("ShaderNodeCombineXYZ")
    t.feed(comb.inputs["X"], t.math("DIVIDE", px, WOBBLE_PX))
    t.feed(comb.inputs["Y"], t.math("DIVIDE", py, WOBBLE_PX))
    noise = t.node("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 1.0
    noise.inputs["Detail"].default_value = 1.0
    nt.links.new(comb.outputs["Vector"], noise.inputs["Vector"])
    wob = t.math("MULTIPLY", t.math("SUBTRACT", noise.outputs["Fac"], 0.5), WOBBLE_AMP * 2)

    def hatch(diag, period, start, max_w):
        u = t.math("DIVIDE", t.math(diag, px, py), period)
        u = t.math("ADD", u, wob)
        tri = t.math("MULTIPLY", t.math("ABSOLUTE", t.math("SUBTRACT", t.math("FRACT", u), 0.5)), 2.0)
        width = t.map_range(lum, start, start - 0.45, 0.0, max_w)
        return t.math("LESS_THAN", tri, width)

    h1 = hatch("SUBTRACT", HATCH_PERIOD[0], HATCH_START[0], HATCH_MAX_W[0])   # "/"
    h2 = hatch("ADD", HATCH_PERIOD[1], HATCH_START[1], HATCH_MAX_W[1])        # "\"
    v = t.lerp(fill, HATCH_1, t.math("MULTIPLY", h1, 0.85))
    v = t.lerp(v, HATCH_2, t.math("MULTIPLY", h2, 0.80))
    emit_gray(t, v, out)
    return mat


def flat_material(name, gray):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    t = Tree(nt)
    emit_gray(t, float(gray), t.node("ShaderNodeOutputMaterial"))
    return mat


class Materials(dict):
    def __init__(self):
        super().__init__()
        for role, d in DARK.items():
            self[role] = pencil_material(role, d)
        for role, g in FLAT.items():
            self[role] = flat_material(role, g)


# --- Contornos: Freestyle ---------------------------------------------------
def setup_lines(scene, px_scale):
    """Trazo de grafito. px_scale = 1 a 256 px, 2 en el hero (resolution_percentage=200)."""
    r = scene.render
    r.use_freestyle = True
    r.line_thickness_mode = "ABSOLUTE"      # Blender ya lo multiplica por resolution_percentage
    r.line_thickness = 1.0
    vl = scene.view_layers[0]
    vl.use_freestyle = True
    fs = vl.freestyle_settings
    fs.mode = "EDITOR"
    fs.crease_angle = math.radians(128.0)
    fs.use_culling = False
    while len(fs.linesets):
        fs.linesets.remove(fs.linesets[0])

    def lineset(name, *, contour_only, gray, alpha, thick, rounds, amp, freq, seed):
        ls = fs.linesets.new(name)
        ls.select_by_visibility = True
        ls.visibility = "VISIBLE"
        ls.select_by_edge_types = True
        for attr in ("select_silhouette", "select_border", "select_crease", "select_material_boundary",
                     "select_external_contour", "select_contour", "select_suggestive_contour",
                     "select_ridge_valley", "select_edge_mark"):
            setattr(ls, attr, False)
        ls.select_external_contour = True
        ls.select_silhouette = True
        if not contour_only:
            ls.select_border = True
            ls.select_crease = True
            ls.select_material_boundary = True
        st = bpy.data.linestyles.new(name)
        ls.linestyle = st
        st.color = (gray, gray, gray)
        st.alpha = alpha
        st.thickness = thick
        st.thickness_position = "CENTER"
        st.caps = "ROUND"
        st.chaining = "SKETCHY"
        st.rounds = rounds
        st.use_length_min = True           # fuera las migas de trazo
        st.length_min = 2.0 * px_scale
        for m in list(st.geometry_modifiers):
            st.geometry_modifiers.remove(m)
        g = st.geometry_modifiers.new("muestreo", "SAMPLING")
        g.sampling = 1.5 * px_scale
        g = st.geometry_modifiers.new("temblor", "PERLIN_NOISE_1D")
        g.frequency = freq / px_scale
        g.amplitude = amp * px_scale
        g.octaves = 2
        g.seed = seed
        th = st.thickness_modifiers.new("presion", "NOISE")
        th.amplitude = thick * 0.6
        th.period = 14.0 * px_scale
        th.seed = seed + 7
        th.use_asymmetric = True
        th.blend = "ADD"
        th2 = st.thickness_modifiers.new("puntas", "ALONG_STROKE")
        th2.mapping = "CURVE"
        th2.value_min, th2.value_max = 0.35, 1.0
        th2.blend = "MULTIPLY"
        pts = th2.curve.curves[0].points
        pts[0].location = (0.0, 0.0)
        pts[1].location = (1.0, 0.0)
        pts.new(0.18, 1.0)
        pts.new(0.82, 1.0)
        th2.curve.update()
        return ls

    lineset("trazo", contour_only=False, gray=LINE_GRAY, alpha=0.85, thick=1.05,
            rounds=2, amp=0.55, freq=0.14, seed=3)
    lineset("repaso", contour_only=True, gray=LINE_GRAY * 0.8, alpha=0.75, thick=1.0,
            rounds=1, amp=0.8, freq=0.10, seed=11)


# --- Malla ------------------------------------------------------------------
SHARP_ANGLE_DEG = 40


def link_object(name, bm, mats, parent, thickness=0.0, smooth=True):
    me = bpy.data.meshes.new(name)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    sharp = math.radians(SHARP_ANGLE_DEG)
    for f in bm.faces:
        f.smooth = smooth
    for e in bm.edges:
        e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(0.0) < sharp
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    if thickness:
        mod = obj.modifiers.new("grosor", "SOLIDIFY")
        mod.thickness = thickness
        mod.offset = 0.0
    return obj


def cylinder(bm, p0, p1, r, segments=10, r_top=None, cap=True):
    p0, p1 = Vector(p0), Vector(p1)
    axis = p1 - p0
    rot = axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
    m = Matrix.Translation((p0 + p1) / 2) @ rot
    return bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=segments, radius1=r,
                                 radius2=r if r_top is None else r_top, depth=axis.length, matrix=m)["verts"]


def box(bm, center, size, rot_z=0.0):
    m = Matrix.Translation(center) @ Matrix.Rotation(rot_z, 4, "Z") @ Matrix.Diagonal((*size, 1.0))
    return bmesh.ops.create_cube(bm, size=1.0, matrix=m)["verts"]


def torus(bm, center, major, minor, axis="Y", nu=12, nv=6, mat_split=0):
    """Toro con el eje dado. Si mat_split > 0, alterna material cada mat_split segmentos."""
    rows = []
    for i in range(nu):
        a = 2 * math.pi * i / nu
        row = []
        for j in range(nv):
            b = 2 * math.pi * j / nv
            rr = major + minor * math.cos(b)
            row.append(Vector((rr * math.cos(a), rr * math.sin(a), minor * math.sin(b))))
        rows.append(row)
    orient = {"Z": Matrix.Identity(3), "Y": Matrix.Rotation(math.pi / 2, 3, "X"),
              "X": Matrix.Rotation(math.pi / 2, 3, "Y")}[axis]
    vs = [[bm.verts.new(Vector(center) + orient @ p) for p in row] for row in rows]
    faces = []
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((vs[i][j], vs[(i + 1) % nu][j], vs[(i + 1) % nu][(j + 1) % nv], vs[i][(j + 1) % nv]))
            f.material_index = (i // mat_split) % 2 if mat_split else 0
            faces.append(f)
    return faces


def set_mat(verts, index):
    for f in {f for v in verts for f in v.link_faces}:
        f.material_index = index


# --- Remolcador ---------------------------------------------------------------
# Estaciones de popa a proa: x, manga media en la regala, altura de la regala.
HULL = [
    (-1.00, 0.27, 0.44), (-0.97, 0.37, 0.43), (-0.90, 0.45, 0.42), (-0.77, 0.50, 0.41),
    (-0.55, 0.52, 0.40), (-0.25, 0.52, 0.40), (0.05, 0.51, 0.41), (0.30, 0.475, 0.43),
    (0.50, 0.42, 0.46), (0.66, 0.35, 0.50), (0.79, 0.26, 0.54), (0.89, 0.16, 0.58),
    (0.96, 0.07, 0.61), (1.00, 0.00, 0.63),
]
BOW_RAKE, STERN_RAKE = 0.16, 0.06
RIM_W, DECK_DEPTH = 0.045, 0.08
HULL_ROLES = ["hull", "rail", "bulwark", "deck"]


def hull_levels(zd):
    # (factor de manga, z, rol del tramo que sube desde este nivel)
    return [(0.80, 0.00, "hull"), (0.94, 0.10, "hull"), (1.00, zd - 0.17, "rail"),
            (1.07, zd - 0.15, "rail"), (1.07, zd - 0.09, "rail"), (1.00, zd - 0.07, "bulwark"),
            (1.00, zd, None)]


def hull_at(x):
    for (x0, b0, z0), (x1, b1, z1) in zip(HULL, HULL[1:]):
        if x0 <= x <= x1:
            k = (x - x0) / (x1 - x0)
            return b0 + (b1 - b0) * k, z0 + (z1 - z0) * k
    raise ValueError(x)


def deck_z(x):
    return hull_at(x)[1] - DECK_DEPTH


def build_hull(m, parent):
    bm = bmesh.new()
    idx = {r: i for i, r in enumerate(HULL_ROLES)}

    def pos(x, b, zd, wf, z):
        t = (x + 1.0) / 2.0
        f = z / zd
        x += BOW_RAKE * (f - 1.0) * t ** 6 + STERN_RAKE * (1.0 - f) * (1.0 - t) ** 6
        return Vector((x, wf * b, z))

    nl = len(hull_levels(0.4))
    rings = []
    for x, b, zd in HULL[:-1]:
        lv = hull_levels(zd)
        left = [bm.verts.new(pos(x, b, zd, wf, z) * Vector((1, -1, 1))) for wf, z, _ in lv]
        right = [bm.verts.new(pos(x, b, zd, wf, z)) for wf, z, _ in lv]
        rings.append(left + right[::-1])
    x, b, zd = HULL[-1]
    bow = [bm.verts.new(pos(x, 0.0, zd, 0.0, z)) for _, z, _ in hull_levels(zd)]
    n = 2 * nl
    lvl = [k if k < nl else n - 1 - k for k in range(n)]
    roles = [r for _, _, r in hull_levels(0.4)][:-1]
    seg_role = roles + ["deck"] + roles[::-1] + ["hull"]
    deck_faces = []

    def add(vs, role):
        f = bm.faces.new(vs)
        f.material_index = idx[role]
        if role == "deck":
            deck_faces.append(f)

    for ra, rb in zip(rings, rings[1:]):
        for k in range(n):
            add((ra[k], ra[(k + 1) % n], rb[(k + 1) % n], rb[k]), seg_role[k])
    last = rings[-1]
    for k in range(n):
        a, b_, c, d = last[k], last[(k + 1) % n], bow[lvl[(k + 1) % n]], bow[lvl[k]]
        add((a, b_, c) if c is d else (a, b_, c, d), seg_role[k])
    r0 = rings[0]
    for j in range(nl - 1):                                   # espejo de popa
        add((r0[j], r0[j + 1], r0[n - 2 - j], r0[n - 1 - j]), seg_role[j])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    ret = bmesh.ops.inset_region(bm, faces=deck_faces, thickness=RIM_W, depth=0.0,
                                 use_even_offset=True, use_boundary=True)
    for f in ret["faces"]:
        f.material_index = idx["bulwark"]
    before = set(bm.faces)
    ext = bmesh.ops.extrude_face_region(bm, geom=deck_faces)
    new_verts = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    top = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMFace)]
    bmesh.ops.translate(bm, verts=new_verts, vec=(0.0, 0.0, -DECK_DEPTH))
    bmesh.ops.delete(bm, geom=deck_faces, context="FACES_ONLY")
    for f in bm.faces:
        if f not in before:
            f.material_index = idx["deck"] if f in top else idx["bulwark"]
    return link_object("casco", bm, [m[r] for r in HULL_ROLES], parent)


CABIN_X = (-0.50, 0.10)
CABIN_Y = 0.29
CABIN_TOP = 0.92
ROOF_T = 0.05
FUNNEL_X = -0.34
MAST_X = 0.00
MAST_TOP = 1.74
FLAG_Z0, FLAG_H, FLAG_W = 1.50, 0.22, 0.36


def build_cabin(m, parent):
    objs = []
    z0 = deck_z(-0.2) - 0.02
    cx = (CABIN_X[0] + CABIN_X[1]) / 2
    lx = CABIN_X[1] - CABIN_X[0]
    bm = bmesh.new()
    box(bm, (cx, 0, (z0 + CABIN_TOP) / 2), (lx, 2 * CABIN_Y, CABIN_TOP - z0))
    objs.append(link_object("caseta", bm, [m["cabin"]], parent, smooth=False))

    bm = bmesh.new()                                           # techo con alero
    box(bm, (cx + 0.01, 0, CABIN_TOP + ROOF_T / 2), (lx + 0.12, 2 * CABIN_Y + 0.10, ROOF_T))
    objs.append(link_object("techo", bm, [m["roof"]], parent, smooth=False))

    bm = bmesh.new()                                           # ventanas y puerta
    wz0, wz1 = 0.58, 0.76
    for y in (-0.17, 0.0, 0.17):                               # frente (mira a proa)
        box(bm, (CABIN_X[1] + 0.006, y, (wz0 + wz1) / 2), (0.02, 0.12, wz1 - wz0))
    for s in (-1, 1):                                          # costados
        for x in (-0.06,):
            box(bm, (x, s * (CABIN_Y + 0.006), (wz0 + wz1) / 2), (0.16, 0.02, wz1 - wz0))
        box(bm, (-0.36, s * (CABIN_Y + 0.006), (z0 + 0.72) / 2 + 0.02), (0.12, 0.02, 0.72 - z0 - 0.02))
    box(bm, (CABIN_X[0] - 0.006, 0, (wz0 + wz1) / 2), (0.02, 0.14, wz1 - wz0))   # ojo de buey trasero
    objs.append(link_object("ventanas", bm, [m["window"]], parent, smooth=False))

    # Salvavidas en los costados de la caseta: blanco y gris (rojiblanco en el concepto).
    bm = bmesh.new()
    for s in (-1, 1):
        torus(bm, (-0.20, s * (CABIN_Y + 0.025), 0.46), 0.075, 0.024, axis="Y", nu=16, nv=6, mat_split=2)
    objs.append(link_object("salvavidas", bm, [m["ring_a"], m["ring_b"]], parent))

    # Chimenea cilíndrica con aros, sobre el techo.
    zt = CABIN_TOP + ROOF_T
    bm = bmesh.new()
    cylinder(bm, (FUNNEL_X, 0, zt - 0.01), (FUNNEL_X, 0, 1.30), 0.085, 14, 0.092)
    for zb in (1.06, 1.20):
        v = cylinder(bm, (FUNNEL_X, 0, zb), (FUNNEL_X, 0, zb + 0.035), 0.098, 14)
        set_mat(v, 1)
    v = cylinder(bm, (FUNNEL_X, 0, 1.29), (FUNNEL_X, 0, 1.305), 0.080, 14)   # boca: hollín
    set_mat(v, 2)
    objs.append(link_object("chimenea", bm, [m["funnel"], m["funnel_band"], m["soot"]], parent))
    return objs


def build_mast(m, parent):
    objs = []
    zt = CABIN_TOP + ROOF_T
    bm = bmesh.new()
    cylinder(bm, (MAST_X, 0, zt - 0.01), (MAST_X, 0, MAST_TOP), 0.028, 8, 0.02)
    cylinder(bm, (MAST_X, -0.20, 1.36), (MAST_X, 0.20, 1.36), 0.014, 6)        # cruceta
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.034,
                               matrix=Matrix.Translation((MAST_X, 0, MAST_TOP + 0.02)))
    objs.append(link_object("mastil", bm, [m["mast"]], parent))

    # Bandera ondeando hacia popa, con el símbolo de olas en blanco a ambos lados.
    def flag_pos(u, v, off=0.0):
        x = MAST_X - 0.03 - FLAG_W * u
        z = FLAG_Z0 + FLAG_H * v - 0.025 * u
        y = 0.028 * math.sin(2 * math.pi * 0.9 * u) * u + off
        return (x, y, z)

    bm = bmesh.new()
    rows, cols = 4, 10
    grid = [[bm.verts.new(flag_pos(j / cols, i / rows)) for j in range(cols + 1)] for i in range(rows + 1)]
    for i in range(rows):
        for j in range(cols):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    objs.append(link_object("bandera", bm, [m["flag"]], parent, thickness=0.014))

    bm = bmesh.new()                                            # "≈": dos olas
    for vc in (0.36, 0.64):
        for side in (-1, 1):
            n = 16
            top, bot = [], []
            for k in range(n + 1):
                u = 0.14 + 0.72 * k / n
                v = vc + 0.085 * math.sin(2 * math.pi * 1.5 * (u - 0.14) / 0.72 * 1.0)
                top.append(bm.verts.new(flag_pos(u, v + 0.055, side * 0.011)))
                bot.append(bm.verts.new(flag_pos(u, v - 0.055, side * 0.011)))
            for k in range(n):
                bm.faces.new((bot[k], bot[k + 1], top[k + 1], top[k]))
    objs.append(link_object("olas", bm, [m["waves"]], parent))

    # Faroles: uno en cada punta de la cruceta y uno en la proa.
    bm = bmesh.new()
    lamps = [(MAST_X, -0.20, 1.29), (MAST_X, 0.20, 1.29), (0.90, 0.0, 0.70)]
    for x, y, z in lamps:
        v = cylinder(bm, (x, y, z - 0.035), (x, y, z + 0.035), 0.030, 8)
        set_mat(v, 0)
        v = cylinder(bm, (x, y, z + 0.035), (x, y, z + 0.06), 0.036, 8, 0.012)
        set_mat(v, 1)
        v = cylinder(bm, (x, y, z - 0.05), (x, y, z - 0.035), 0.036, 8)
        set_mat(v, 1)
    v = cylinder(bm, (0.90, 0.0, deck_z(0.90)), (0.90, 0.0, 0.65), 0.012, 6)   # poste del farol de proa
    set_mat(v, 1)
    objs.append(link_object("faroles", bm, [m["glass"], m["lantern_cap"]], parent))

    # Cabos: estay de proa y de popa desde el tope del mástil.
    bm = bmesh.new()
    top = (MAST_X, 0, MAST_TOP - 0.05)
    cylinder(bm, top, (0.94, 0, hull_at(0.94)[1] - 0.01), 0.004, 5)
    cylinder(bm, top, (-0.96, 0, hull_at(-0.96)[1] - 0.01), 0.004, 5)
    objs.append(link_object("estays", bm, [m["rope"]], parent))
    return objs


def build_deck_cargo(m, parent):
    objs = []
    # Cajas de madera en la cubierta de proa: marco hundido en cada cara.
    bm = bmesh.new()
    crates = [((0.36, 0.17), 0.19, 0.20), ((0.40, -0.14), 0.16, -0.12), ((0.60, 0.04), 0.14, 0.35)]
    for (x, y), s, rz in crates:
        v = box(bm, (x, y, deck_z(x) + s / 2), (s, s, s), rz)
        fs = list({f for vv in v for f in vv.link_faces})
        ret = bmesh.ops.inset_individual(bm, faces=fs, thickness=s * 0.14, depth=-s * 0.03)
        for f in fs:
            f.material_index = 0
        for f in ret["faces"]:
            f.material_index = 1
    x, y, s = 0.37, 0.16, 0.13                                  # caja apilada
    v = box(bm, (x, y, deck_z(0.36) + 0.19 + s / 2), (s, s, s), -0.3)
    fs = list({f for vv in v for f in vv.link_faces})
    ret = bmesh.ops.inset_individual(bm, faces=fs, thickness=s * 0.14, depth=-s * 0.03)
    for f in ret["faces"]:
        f.material_index = 1
    objs.append(link_object("cajas", bm, [m["wood"], m["crate_edge"]], parent, smooth=False))

    # Barriles en la cubierta de popa, con aros.
    bm = bmesh.new()
    for x, y in ((-0.66, 0.26), (-0.72, -0.25), (-0.58, -0.30)):
        z = deck_z(x)
        cylinder(bm, (x, y, z), (x, y, z + 0.17), 0.068, 12)
        for zb in (0.035, 0.125):
            v = cylinder(bm, (x, y, z + zb), (x, y, z + zb + 0.018), 0.073, 12)
            set_mat(v, 1)
    objs.append(link_object("barriles", bm, [m["barrel"], m["hoop"]], parent))

    # Rollo de cabo en popa: espiral de toros aplanados.
    bm = bmesh.new()
    x0 = -0.82
    for k, (r, dz) in enumerate(((0.10, 0.0), (0.075, 0.018), (0.05, 0.03))):
        torus(bm, (x0, 0.02, deck_z(x0) + 0.016 + dz), r, 0.017, axis="Z", nu=16, nv=5)
    cylinder(bm, (-0.95, -0.12, deck_z(-0.95)), (-0.95, -0.12, deck_z(-0.95) + 0.09), 0.025, 8)   # bita
    objs.append(link_object("cabo", bm, [m["coil"]], parent))

    # Neumáticos colgados como defensas, más una defensa grande en la roda.
    bm = bmesh.new()
    for x in (-0.62, -0.18, 0.26):
        b, zd = hull_at(x)
        for s in (-1, 1):
            y = s * (b * 1.07 + 0.03)
            torus(bm, (x, y, 0.19), 0.068, 0.029, axis="Y", nu=12, nv=6)
            cylinder(bm, (x, y * 0.985, 0.25), (x, s * b * 1.0, zd - 0.09), 0.006, 4)
    torus(bm, (0.985, 0.0, 0.34), 0.07, 0.03, axis="X", nu=12, nv=6)
    objs.append(link_object("neumaticos", bm, [m["tire"]], parent))
    return objs


def build_ship():
    m = Materials()
    root = bpy.data.objects.new("ship_root", None)
    bpy.context.scene.collection.objects.link(root)
    build_hull(m, root)
    build_cabin(m, root)
    build_mast(m, root)
    build_deck_cargo(m, root)
    return root


# --- Render -----------------------------------------------------------------
def render(scene, path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="tools/blender/out/styles/01_boceto_lapiz")
    ap.add_argument("--dirs", nargs="*", default=DIRECTIONS)
    ap.add_argument("--no-hero", action="store_true")
    a = ap.parse_args(argv)
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)

    t0 = time.time()
    scene = rig.reset_scene()
    rig.setup_render(scene)
    rig.add_camera(scene)
    rig.add_sun(scene)                   # sin sombras proyectadas: el tramado sale del sombreado propio
    root = build_ship()
    times = []
    setup_lines(scene, 1.0)
    for d in a.dirs:
        root.rotation_euler = (0.0, 0.0, math.radians(yaw_for(d)))
        ts = time.time()
        render(scene, os.path.join(out, "%s.png" % d))
        times.append(time.time() - ts)
    if not a.no_hero:
        scene.render.resolution_percentage = 200
        setup_lines(scene, 2.0)
        root.rotation_euler = (0.0, 0.0, math.radians(yaw_for("SE")))
        ts = time.time()
        render(scene, os.path.join(out, "hero_SE.png"))
        times.append(time.time() - ts)
    print("TIEMPOS total=%.1fs imagenes=%s" % (time.time() - t0, " ".join("%.2f" % x for x in times)))


if __name__ == "__main__":
    main()
