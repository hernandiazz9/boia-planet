"""Estilo 06, "Cartoon años 30": remolcador rubber hose en negro, rojo y crema.

Prueba de estilo, no diseño final. Rellenos planos con un solo corte de sombra,
semitono de puntos en coordenadas de ventana sólo dentro de la sombra, brillo
duro crema en las piezas negras, contorno grueso de tinta por casco invertido
y un grano de papel envejecido muy leve. Formas infladas y blandas.

Uso:
    Blender -b -P tools/blender/styles/06_cartoon_anos_30.py -- --out tools/blender/out/styles/06_cartoon_anos_30
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

# --- Paleta (sRGB) -----------------------------------------------------------
INK = "#17110E"          # tinta: contorno y negros
RED = "#C8372B"
CREAM = "#F1E3BF"
WOOD = "#C0915A"
GLOW = "#FFD35C"

# (luz, sombra, puntos del semitono)
TONES = {
    "black": ("#2B231F", "#17110E", "#17110E"),
    "red":   (RED, "#8E2520", "#4A1512"),
    "cream": (CREAM, "#C9B28A", "#7E6547"),
    "wood":  (WOOD, "#8A6138", "#4A3120"),
    "ink":   (INK, INK, INK),
}

OUTLINE_W = 0.036            # ≈3,2 px a 256: tinta gruesa
OUTLINE_W_SMALL = 0.022      # piezas pequeñas (ojos de buey, faroles)
LIGHT_THRESHOLD = 0.42       # Shader to RGB: por debajo, sombra
GLINT_THRESHOLD = 0.80       # sólo en negros curvos: brillo duro crema
HALFTONE_CELLS = 56          # puntos por ancho de imagen (≈4,6 px de paso a 256)
HALFTONE_R = (0.16, 0.44)    # radio del punto (en celdas): junto al terminador / sombra plena
PAPER_GRAIN = 0.05           # variación de brillo del papel envejecido
SHARP_ANGLE_DEG = 50


# --- Color --------------------------------------------------------------------
def hex_srgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def lin4(h):
    def f(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return tuple(f(c) for c in hex_srgb(h)) + (1.0,)


# --- Materiales -------------------------------------------------------------
class NT:
    """Atajos para armar árboles de nodos."""

    def __init__(self, mat):
        self.nt = mat.node_tree
        self.nt.nodes.clear()

    def node(self, kind, **props):
        n = self.nt.nodes.new(kind)
        for k, v in props.items():
            setattr(n, k, v)
        return n

    def link(self, a, b):
        self.nt.links.new(a, b)

    def math(self, op, a, b=None, clamp=False):
        n = self.node("ShaderNodeMath", operation=op, use_clamp=clamp)
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                self.link(v, n.inputs[i])
        return n.outputs[0]

    def mix(self, fac, a, b):
        n = self.node("ShaderNodeMix", data_type="RGBA")
        ins = [s for s in n.inputs if s.type == "RGBA"]
        facs = [s for s in n.inputs if s.name == "Factor" and s.type == "VALUE"]
        for sock, v in ((facs[0], fac), (ins[0], a), (ins[1], b)):
            if isinstance(v, tuple):
                sock.default_value = v
            elif isinstance(v, (int, float)):
                sock.default_value = v
            else:
                self.link(v, sock)
        return [s for s in n.outputs if s.type == "RGBA"][0]


def halftone_mask(t, light):
    """Puntos en coordenadas de ventana, girados 45°, con radio según la oscuridad."""
    tc = t.node("ShaderNodeTexCoord")
    mp = t.node("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (HALFTONE_CELLS, HALFTONE_CELLS, 0.0)
    mp.inputs["Rotation"].default_value = (0.0, 0.0, math.radians(45))
    t.link(tc.outputs["Window"], mp.inputs["Vector"])
    fr = t.node("ShaderNodeVectorMath", operation="FRACTION")
    t.link(mp.outputs["Vector"], fr.inputs[0])
    sub = t.node("ShaderNodeVectorMath", operation="SUBTRACT")
    t.link(fr.outputs["Vector"], sub.inputs[0])
    sub.inputs[1].default_value = (0.5, 0.5, 0.0)
    ln = t.node("ShaderNodeVectorMath", operation="LENGTH")
    t.link(sub.outputs["Vector"], ln.inputs[0])
    dark = t.math("SUBTRACT", 1.0, t.math("DIVIDE", light, LIGHT_THRESHOLD), clamp=True)
    radius = t.math("MULTIPLY_ADD", dark, HALFTONE_R[1] - HALFTONE_R[0])
    rnode = radius.node
    rnode.inputs[2].default_value = HALFTONE_R[0]
    return t.math("LESS_THAN", ln.outputs["Value"], radius)


def paper_grain(t, col):
    tc = t.node("ShaderNodeTexCoord")
    nz = t.node("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 38.0
    nz.inputs["Detail"].default_value = 3.0
    t.link(tc.outputs["Window"], nz.inputs["Vector"])
    g = t.math("MULTIPLY_ADD", nz.outputs["Fac"], 2.0 * PAPER_GRAIN)
    g.node.inputs[2].default_value = 1.0 - 1.4 * PAPER_GRAIN
    vm = t.node("ShaderNodeVectorMath", operation="SCALE")
    t.link(col, vm.inputs[0])
    t.link(g, vm.inputs["Scale"])
    return vm.outputs["Vector"]


def toon_material(name, tone, glint=False, flat=False, alt=None, mask_fn=None):
    """Rampa de 2 pasos + semitono en la sombra.

    alt/mask_fn: segundo juego de tonos y una máscara procedural (bandera, tablones).
    """
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    t = NT(mat)
    out = t.node("ShaderNodeOutputMaterial")
    emit = t.node("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0
    t.link(emit.outputs["Emission"], out.inputs["Surface"])
    if flat:
        emit.inputs["Color"].default_value = lin4(tone)
        return mat
    lit, shd, dot = (lin4(h) for h in TONES[tone])
    if alt is not None:
        lit2, shd2, dot2 = (lin4(h) for h in TONES[alt])
        m = mask_fn(t)
        lit, shd, dot = t.mix(m, lit, lit2), t.mix(m, shd, shd2), t.mix(m, dot, dot2)
    diff = t.node("ShaderNodeBsdfDiffuse")
    diff.inputs["Color"].default_value = (1, 1, 1, 1)
    s2r = t.node("ShaderNodeShaderToRGB")
    t.link(diff.outputs["BSDF"], s2r.inputs["Shader"])
    bw = t.node("ShaderNodeRGBToBW")
    t.link(s2r.outputs["Color"], bw.inputs["Color"])
    light = bw.outputs["Val"]
    litfac = t.math("GREATER_THAN", light, LIGHT_THRESHOLD)
    dots = halftone_mask(t, light)
    shadow = t.mix(dots, shd, dot)
    col = t.mix(litfac, shadow, lit)
    if glint:
        gl = t.math("GREATER_THAN", light, GLINT_THRESHOLD)
        col = t.mix(gl, col, lin4(CREAM))
    t.link(paper_grain(t, col), emit.inputs["Color"])
    return mat


def outline_material():
    mat = bpy.data.materials.new("outline")
    mat.use_nodes = True
    t = NT(mat)
    emit = t.node("ShaderNodeEmission")
    emit.inputs["Color"].default_value = lin4(INK)
    out = t.node("ShaderNodeOutputMaterial")
    t.link(emit.outputs["Emission"], out.inputs["Surface"])
    mat.use_backface_culling = True
    return mat


# Bandera: dos olas "≈" blancas sobre rojo, en coordenadas del objeto.
FLAG_X0, FLAG_W = 0.40, 0.46
FLAG_Z0, FLAG_H = 1.50, 0.30


def flag_mask(t):
    tc = t.node("ShaderNodeTexCoord")
    sep = t.node("ShaderNodeSeparateXYZ")
    t.link(tc.outputs["Object"], sep.inputs[0])
    x, z = sep.outputs["X"], sep.outputs["Z"]
    wave = t.math("MULTIPLY", t.math("SINE", t.math("MULTIPLY", x, 2 * math.pi / 0.20)), 0.026)
    zz = t.math("SUBTRACT", z, wave)
    d1 = t.math("ABSOLUTE", t.math("SUBTRACT", zz, FLAG_Z0 + 0.38 * FLAG_H))
    d2 = t.math("ABSOLUTE", t.math("SUBTRACT", zz, FLAG_Z0 + 0.66 * FLAG_H))
    m = t.math("LESS_THAN", t.math("MINIMUM", d1, d2), 0.024)
    # margen a la driza y al extremo libre
    xin = t.math("MULTIPLY", t.math("LESS_THAN", x, FLAG_X0 - 0.10),
                 t.math("GREATER_THAN", x, FLAG_X0 - FLAG_W + 0.06))
    return t.math("MULTIPLY", m, xin)


def plank_mask(t):
    tc = t.node("ShaderNodeTexCoord")
    sep = t.node("ShaderNodeSeparateXYZ")
    t.link(tc.outputs["Object"], sep.inputs[0])
    f = t.math("FRACT", t.math("MULTIPLY", sep.outputs["Y"], 1 / 0.13))
    return t.math("LESS_THAN", f, 0.12)


def hoop_mask(t):
    """Aros del barril: franjas en z local del barril (la malla va centrada en z=0)."""
    tc = t.node("ShaderNodeTexCoord")
    sep = t.node("ShaderNodeSeparateXYZ")
    t.link(tc.outputs["Object"], sep.inputs[0])
    d = t.math("ABSOLUTE", t.math("SUBTRACT", t.math("ABSOLUTE", sep.outputs["Z"]), 0.055))
    return t.math("LESS_THAN", d, 0.018)


class Materials:
    def __init__(self):
        self.m = {
            "black": toon_material("black", "black", glint=True),
            "black_flat": toon_material("black_flat", "black"),
            "red": toon_material("red", "red"),
            "cream": toon_material("cream", "cream"),
            "deck": toon_material("deck", "cream", alt="wood", mask_fn=plank_mask),
            "wood": toon_material("wood", "wood"),
            "barrel": toon_material("barrel", "wood", alt="black", mask_fn=hoop_mask),
            "flag": toon_material("flag", "red", alt="cream", mask_fn=flag_mask),
            "glow": toon_material("glow", GLOW, flat=True),
            "ink": toon_material("ink", INK, flat=True),
            "white": toon_material("white", CREAM, flat=True),
        }
        self.outline = outline_material()

    def __getitem__(self, k):
        return self.m[k]


# --- Mallas -----------------------------------------------------------------
def link_object(name, bm, mats, parent, M, outline=OUTLINE_W, thickness=0.0, sharp=SHARP_ANGLE_DEG):
    me = bpy.data.meshes.new(name)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for f in bm.faces:
        f.smooth = True
    lim = math.radians(sharp)
    for e in bm.edges:
        e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(0.0) < lim
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(M[m])
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    if thickness:
        mod = obj.modifiers.new("thickness", "SOLIDIFY")
        mod.thickness = thickness
        mod.offset = 0.0
    if outline:
        n = len(mats)
        for _ in range(n):
            me.materials.append(M.outline)
        mod = obj.modifiers.new("outline", "SOLIDIFY")
        mod.thickness = outline
        mod.offset = 1.0
        mod.use_flip_normals = True
        mod.use_even_offset = True
        mod.material_offset = n
        mod.material_offset_rim = n
    return obj


def lathe(bm, profile, segs, matrix=Matrix(), mat_for=None, cap_top=True, cap_bottom=True):
    """Superficie de revolución sobre Z. profile: [(z, r)]. Devuelve los anillos."""
    rings = []
    for z, r in profile:
        rings.append([bm.verts.new(matrix @ Vector((r * math.cos(2 * math.pi * k / segs),
                                                     r * math.sin(2 * math.pi * k / segs), z)))
                      for k in range(segs)])
    for i in range(len(rings) - 1):
        for k in range(segs):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % segs],
                              rings[i + 1][(k + 1) % segs], rings[i + 1][k]))
            f.material_index = mat_for(i) if mat_for else 0
    if cap_bottom:
        f = bm.faces.new(list(reversed(rings[0])))
        f.material_index = mat_for(-1) if mat_for else 0
    if cap_top:
        f = bm.faces.new(rings[-1])
        f.material_index = mat_for(len(rings) - 1) if mat_for else 0
    return rings


def soft_box(bm, center, size, bevel=0.05, segments=3, mat_index=0):
    ret = bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(center) @
                                Matrix.Diagonal((size[0], size[1], size[2], 1.0)))
    verts = ret["verts"]
    edges = list({e for v in verts for e in v.link_edges})
    bmesh.ops.bevel(bm, geom=edges + verts, offset=bevel, segments=segments, profile=0.5,
                    affect="EDGES", clamp_overlap=True)
    return verts


# --- Casco ------------------------------------------------------------------
HULL_B = 0.56                 # media manga máxima
NP = 40                       # puntos del contorno en planta
LEVELS = [(0.0, 0.84), (0.24, 0.93), (0.40, 0.975), (0.62, 1.0), (0.86, 0.985), (1.0, 0.95)]
BAND_TOP = 1                  # franja roja de flotación: entre el nivel 0 y el 1
RIM_W = 0.06
DECK_DEPTH = 0.065


def deck_z(x):
    """Arrufo: la proa sube."""
    return 0.40 + 0.17 * max(0.0, x) ** 2 + 0.05 * max(0.0, -x) ** 2


def plan_outline():
    pts = []
    for j in range(NP):
        a = 2 * math.pi * j / NP
        c, s = math.cos(a), math.sin(a)
        p = 1.75 if c > 0 else 2.6            # proa más fina, popa redonda y ancha
        x = math.copysign(abs(c) ** (2 / p), c)
        y = math.copysign(abs(s) ** (2 / p), s) * HULL_B * (1.0 - 0.13 * x)
        pts.append((x * 0.98, y))
    return pts


def build_hull(M, parent):
    bm = bmesh.new()
    mats = ["black", "red", "cream", "deck"]
    I = {m: i for i, m in enumerate(mats)}
    base = plan_outline()
    rings = []
    for li, (s, f) in enumerate(LEVELS):
        ring = []
        for x, y in base:
            X, Y = x * f, y * f
            X += 0.06 * s * max(0.0, x) ** 3        # la roda se inclina a proa arriba
            ring.append(bm.verts.new((X, Y, s * deck_z(X))))
        rings.append(ring)

    def inward(ring, d):
        out = []
        for j, v in enumerate(ring):
            a, b = ring[j - 1].co, ring[(j + 1) % NP].co
            tng = Vector((b.x - a.x, b.y - a.y))
            n = Vector((tng.y, -tng.x)).normalized()
            if n.dot(Vector((v.co.x, v.co.y))) > 0:
                n = -n
            out.append(Vector((v.co.x, v.co.y)) + n * d)
        return out

    top = rings[-1]
    inner_xy = inward(top, RIM_W)
    rim = [bm.verts.new((p.x, p.y, top[j].co.z + 0.012)) for j, p in enumerate(inner_xy)]
    deck_edge = [bm.verts.new((p.x, p.y, deck_z(p.x) - DECK_DEPTH)) for p in inner_xy]
    deck_rings = [deck_edge]
    for k in (0.72, 0.45, 0.2):
        deck_rings.append([bm.verts.new((p.x * (0.2 + 0.8 * k), p.y * k,
                                         deck_z(p.x * (0.2 + 0.8 * k)) - DECK_DEPTH)) for p in inner_xy])

    def band(ra, rb, mat):
        for j in range(NP):
            f = bm.faces.new((ra[j], ra[(j + 1) % NP], rb[(j + 1) % NP], rb[j]))
            f.material_index = I[mat]

    for li in range(len(rings) - 1):
        band(rings[li], rings[li + 1], "red" if li < BAND_TOP else "black")
    band(top, rim, "red")                    # regala
    band(rim, deck_edge, "cream")            # cara interior de la borda
    for a, b in zip(deck_rings, deck_rings[1:]):
        band(a, b, "deck")
    f = bm.faces.new(deck_rings[-1])
    f.material_index = I["deck"]
    f = bm.faces.new(list(reversed(rings[0])))
    f.material_index = I["red"]
    return link_object("hull", bm, mats, parent, M)


def hull_side_y(x, z):
    """Media manga exterior aproximada en (x, z): para apoyar cosas en el costado."""
    best = None
    base = plan_outline()
    for li in range(len(LEVELS) - 1):
        s0, f0 = LEVELS[li]
        s1, f1 = LEVELS[li + 1]
        zd = deck_z(x)
        if s0 * zd <= z <= s1 * zd:
            k = (z / zd - s0) / (s1 - s0)
            f = f0 + (f1 - f0) * k
            ys = [y * f for bx, y in base if y > 0 and abs(bx * f - x) < 0.08]
            best = max(ys) if ys else None
    return best


# --- Piezas -----------------------------------------------------------------
CAB_X0, CAB_X1 = -0.36, 0.14
CAB_HY = 0.30
CAB_Z0, CAB_Z1 = 0.33, 0.93
CHIM_X = -0.62
MAST_X = 0.44
MAST_TOP = 1.84


def build_cabin(M, parent):
    objs = []
    bm = bmesh.new()
    cx = (CAB_X0 + CAB_X1) / 2
    soft_box(bm, (cx, 0, (CAB_Z0 + CAB_Z1) / 2), (CAB_X1 - CAB_X0, 2 * CAB_HY, CAB_Z1 - CAB_Z0), bevel=0.07)
    # inflado: la caseta se abomba a media altura y se estrecha arriba
    for v in bm.verts:
        h = (v.co.z - CAB_Z0) / (CAB_Z1 - CAB_Z0)
        k = 1.0 + 0.07 * math.sin(math.pi * min(1.0, max(0.0, h))) - 0.08 * h
        v.co.y *= k
        v.co.x = cx + (v.co.x - cx) * (1.0 + 0.05 * math.sin(math.pi * min(1.0, max(0.0, h))) - 0.05 * h)
    objs.append(link_object("cabin", bm, ["cream"], parent, M))

    # techo rojo abombado con alero
    bm = bmesh.new()
    soft_box(bm, (cx - 0.01, 0, CAB_Z1 + 0.035), (CAB_X1 - CAB_X0 + 0.14, 2 * CAB_HY + 0.10, 0.09),
             bevel=0.04, segments=2)
    for v in bm.verts:
        if v.co.z > CAB_Z1 + 0.03:
            u = (v.co.x - cx) / ((CAB_X1 - CAB_X0) / 2 + 0.07)
            w = v.co.y / (CAB_HY + 0.05)
            v.co.z += 0.07 * max(0.0, 1 - u * u) * max(0.0, 1 - w * w)
    objs.append(link_object("roof", bm, ["red"], parent, M))

    # ojos de buey: dos por costado, dos al frente, uno detrás
    bm = bmesh.new()
    zc = CAB_Z0 + 0.60 * (CAB_Z1 - CAB_Z0)
    rot_y = Matrix.Rotation(math.radians(90), 4, "X")
    rot_x = Matrix.Rotation(math.radians(90), 4, "Y")
    for side in (-1, 1):
        for x in (cx - 0.12, cx + 0.12):
            m = Matrix.Translation((x, side * (CAB_HY + 0.015), zc)) @ rot_y
            bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.062, radius2=0.062, depth=0.05, matrix=m)
        m = Matrix.Translation((CAB_X1 + 0.008, side * 0.12, zc)) @ rot_x
        bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.068, radius2=0.068, depth=0.05, matrix=m)
    m = Matrix.Translation((CAB_X0 - 0.008, 0.0, zc)) @ rot_x
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.06, radius2=0.06, depth=0.05, matrix=m)
    objs.append(link_object("portholes", bm, ["ink"], parent, M, outline=OUTLINE_W_SMALL))

    # brillo de cada cristal: un punto crema arriba a la izquierda (guiño cartoon)
    bm = bmesh.new()
    for side in (-1, 1):
        for x in (cx - 0.12, cx + 0.12):
            bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.017,
                                       matrix=Matrix.Translation((x - 0.02, side * (CAB_HY + 0.043), zc + 0.022)))
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.018,
                                   matrix=Matrix.Translation((CAB_X1 + 0.036, side * 0.12 + 0.02, zc + 0.024)))
    objs.append(link_object("porthole_glints", bm, ["white"], parent, M, outline=0))

    # faroles en las esquinas delanteras del techo
    for side in (-1, 1):
        bm = bmesh.new()
        base = Matrix.Translation((CAB_X1 + 0.02, side * (CAB_HY - 0.02), CAB_Z1 + 0.09))
        bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.035, radius2=0.035, depth=0.03,
                              matrix=base @ Matrix.Translation((0, 0, 0.0)))
        bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.042, radius2=0.0, depth=0.05,
                              matrix=base @ Matrix.Translation((0, 0, 0.14)))
        objs.append(link_object("lantern_body", bm, ["black_flat"], parent, M, outline=OUTLINE_W_SMALL))
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.052, matrix=base @ Matrix.Translation((0, 0, 0.07)))
        objs.append(link_object("lantern_glow", bm, ["glow"], parent, M, outline=OUTLINE_W_SMALL))
    return objs


def build_chimney(M, parent):
    """Chimenea negra grande, acampanada, inclinada a popa, con franja roja."""
    zd = deck_z(CHIM_X) - DECK_DEPTH
    H = 1.00
    prof = [(0.0, 0.16), (0.12, 0.150), (0.40, 0.150), (0.60, 0.160), (0.70, 0.168),
            (0.80, 0.180), (0.92, 0.200), (1.0, 0.205)]
    red_rows = {3, 4}                          # franja roja entre z 0.60 y 0.80
    bm = bmesh.new()
    rings = lathe(bm, [(z * H, r) for z, r in prof], 20,
                  mat_for=lambda i: 1 if i in red_rows else 0, cap_top=False)
    top = rings[-1]
    # boca hueca: borde grueso y fondo de tinta
    lip = [bm.verts.new((v.co.x * 0.80, v.co.y * 0.80, v.co.z)) for v in top]
    hole = [bm.verts.new((v.co.x * 0.80, v.co.y * 0.80, v.co.z - 0.12)) for v in top]
    n = len(top)
    for k in range(n):
        f = bm.faces.new((top[k], top[(k + 1) % n], lip[(k + 1) % n], lip[k]))
        f.material_index = 0
        f = bm.faces.new((lip[k], lip[(k + 1) % n], hole[(k + 1) % n], hole[k]))
        f.material_index = 2
    f = bm.faces.new(list(reversed(hole)))
    f.material_index = 2
    tilt = Matrix.Translation((CHIM_X, 0.0, zd)) @ Matrix.Rotation(math.radians(-9), 4, "Y")
    bmesh.ops.transform(bm, verts=bm.verts[:], matrix=tilt)
    return [link_object("chimney", bm, ["black", "red", "ink"], parent, M, sharp=70)]


def build_mast_and_flag(M, parent):
    objs = []
    zd = deck_z(MAST_X) - DECK_DEPTH
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.032, radius2=0.024,
                          depth=MAST_TOP - zd, matrix=Matrix.Translation((MAST_X, 0, (MAST_TOP + zd) / 2)))
    # cruceta
    bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=0.018, radius2=0.018, depth=0.34,
                          matrix=Matrix.Translation((MAST_X, 0, 1.22)) @ Matrix.Rotation(math.radians(90), 4, "X"))
    objs.append(link_object("mast", bm, ["black_flat"], parent, M, outline=OUTLINE_W_SMALL))
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.045,
                               matrix=Matrix.Translation((MAST_X, 0, MAST_TOP + 0.03)))
    objs.append(link_object("truck", bm, ["cream"], parent, M, outline=OUTLINE_W_SMALL))

    # bandera ondeando hacia popa
    bm = bmesh.new()
    rows, cols = 4, 10
    grid = []
    for i in range(rows + 1):
        row = []
        for j in range(cols + 1):
            u = j / cols
            x = FLAG_X0 - FLAG_W * u
            z = FLAG_Z0 + FLAG_H * (i / rows) - 0.03 * u * u
            y = 0.05 * math.sin(2 * math.pi * 0.9 * u) * u
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for i in range(rows):
        for j in range(cols):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    objs.append(link_object("flag", bm, ["flag"], parent, M, thickness=0.018, sharp=80))
    return objs


def life_ring(bm, center, normal_rot, major=0.105, minor=0.038):
    nu, nv = 16, 8
    ring = [[None] * nv for _ in range(nu)]
    for i in range(nu):
        a = 2 * math.pi * (i + 0.5) / nu
        for j in range(nv):
            b = 2 * math.pi * j / nv
            rr = major + minor * math.cos(b)
            ring[i][j] = bm.verts.new(Matrix.Translation(center) @ normal_rot @
                                      Vector((rr * math.cos(a), minor * math.sin(b), rr * math.sin(a))))
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((ring[i][j], ring[(i + 1) % nu][j],
                              ring[(i + 1) % nu][(j + 1) % nv], ring[i][(j + 1) % nv]))
            f.material_index = (i // 2) % 2


def build_deck_cargo(M, parent):
    objs = []
    # salvavidas en ambos costados del casco
    bm = bmesh.new()
    for side in (-1, 1):
        x, z = -0.08, 0.29
        y = hull_side_y(x, z) or 0.5
        tilt = Matrix.Rotation(math.radians(side * 8), 4, "X")
        life_ring(bm, (x, side * (y + 0.055), z), tilt)
    objs.append(link_object("life_rings", bm, ["red", "white"], parent, M, outline=OUTLINE_W_SMALL + 0.004))

    # cajas de madera a proa
    bm = bmesh.new()
    zd = deck_z(0.66) - DECK_DEPTH
    soft_box(bm, (0.66, 0.11, zd + 0.08), (0.17, 0.17, 0.16), bevel=0.025, segments=2)
    soft_box(bm, (0.70, -0.10, zd + 0.07), (0.15, 0.15, 0.14), bevel=0.025, segments=2)
    soft_box(bm, (0.665, 0.07, zd + 0.24), (0.14, 0.14, 0.14), bevel=0.025, segments=2)
    objs.append(link_object("crates", bm, ["wood"], parent, M, outline=OUTLINE_W * 0.8))

    # barriles a popa, abombados
    for (bx, by) in ((-0.86, 0.17), (-0.88, -0.16), (0.24, -0.22)):
        bm = bmesh.new()
        zd = deck_z(bx) - DECK_DEPTH
        prof = [(-0.09, 0.058), (-0.05, 0.072), (0.0, 0.078), (0.05, 0.072), (0.09, 0.058)]
        lathe(bm, prof, 12)
        o = link_object("barrel", bm, ["barrel"], parent, M, outline=OUTLINE_W * 0.75, sharp=70)
        o.location = (bx, by, zd + 0.09)
        objs.append(o)
    return objs


def empty(name, parent, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.parent = parent
    e.location = loc
    return e


def build_ship():
    M = Materials()
    root = empty("ship_root", None)
    parts = [build_hull(M, root)]
    parts += build_cabin(M, root)
    parts += build_chimney(M, root)
    parts += build_mast_and_flag(M, root)
    parts += build_deck_cargo(M, root)
    return root, parts


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="tools/blender/out/styles/06_cartoon_anos_30")
    ap.add_argument("--only", help="sólo estas direcciones, separadas por coma")
    ap.add_argument("--no-hero", action="store_true")
    a = ap.parse_args(argv)
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)

    t0 = time.time()
    scene = rig.reset_scene()
    rig.setup_render(scene)
    rig.add_camera(scene)
    rig.add_sun(scene)
    root, _ = build_ship()
    dirs = a.only.split(",") if a.only else DIRECTIONS
    n = 0
    for d in dirs:
        root.rotation_euler = (0.0, 0.0, math.radians(yaw_for(d)))
        scene.render.filepath = os.path.join(out, d + ".png")
        bpy.ops.render.render(write_still=True)
        n += 1
    if not a.no_hero:
        root.rotation_euler = (0.0, 0.0, math.radians(yaw_for("SE")))
        scene.render.resolution_percentage = 200
        scene.render.filepath = os.path.join(out, "hero_SE.png")
        bpy.ops.render.render(write_still=True)
        scene.render.resolution_percentage = 100
        n += 1
    dt = time.time() - t0
    print("06_cartoon_anos_30: %d imágenes en %.1f s (%.2f s/img)" % (n, dt, dt / max(1, n)))


if __name__ == "__main__":
    main()
