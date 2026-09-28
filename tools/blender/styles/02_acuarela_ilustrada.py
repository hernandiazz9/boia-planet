"""Opción 2 · Acuarela ilustrada: remolcador BOIA pintado a la acuarela.

Prueba de estilo, no diseño final. Un solo script autocontenido:
  1. construye el remolcador con bmesh (proa +X, flotación en z=0, raíz que gira);
  2. lo pinta con materiales "acuarela": rampa toon de pasos suaves, lavados de
     pigmento y grano de papel con ruido en coordenadas de ventana, segundo
     pigmento en manchas y papel que asoma en las luces;
  3. renderiza las 8 direcciones (256 px) y un hero SE (512 px) con la cámara de rig.py;
  4. pasada de acuarela sobre cada PNG (numpy, dentro de Blender): borde húmedo
     oscuro en la silueta y entre manchas de color, bordes irregulares y un
     sangrado suave de pigmento. Se apaga con --no-bleed.

Uso:
  Blender -b -P tools/blender/styles/02_acuarela_ilustrada.py -- \
      --out tools/blender/out/styles/02_acuarela_ilustrada \
      [--sheet docs/informes/img/01-estilo-02-acuarela-ilustrada.png] \
      [--hero-sheet docs/informes/img/01-estilo-02-acuarela-ilustrada-hero.png]
"""
import argparse
import colorsys
import math
import os
import shutil
import struct
import subprocess
import sys
import time
import zlib

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import rig  # noqa: E402
from ship import DIRECTIONS, yaw_for  # noqa: E402

# --- Paleta (muestra; los colores de marca BOIA no están cerrados) ----------
PAL = {
    "hull": "#2C62BE", "cream": "#F2DDB0", "wood": "#B97A42", "deck": "#DEAA6E",
    "cabin": "#F5EAD5", "window": "#26477A", "awning": "#EED6A8",
    "chimney": "#2A2B34", "flag": "#F2761F", "ring_red": "#DA3A2C", "ring_white": "#FBF4E6",
    "crate": "#D59C5C", "crate_frame": "#99622F", "barrel": "#A7663A", "metal": "#4D4E5A",
    "pot": "#C9643A", "leaf": "#4F9A45", "leaf2": "#86C156", "flower": "#F59A2F",
    "lantern": "#33343D", "rope": "#A07D57",
}
GLOW = "#FFC94A"                 # vidrio del farol: plano, sin sombra
SHADOW_TINT = "#4B579C"          # las sombras son un glaseado frío azul violeta
PAPER = "#FFF9EC"                # blanco del papel
OUTLINE_COLOR = ("#5B4839", "#8E7B69")   # marrón grisáceo, varía con el grano
OUTLINE_WIDTH = 0.011            # ≈1 px con la cámara de rig.py
SHARP_ANGLE_DEG = 40

GRAIN_SCALE = 75.0               # grano de papel (coordenadas de ventana, 0..1)
BLOT_SCALE = 5.0                 # manchas de pigmento
VARIANT_SCALE = 2.6              # segundo pigmento


# --- Color -------------------------------------------------------------------
def hex_srgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin4(rgb):
    return tuple(lin(c) for c in rgb) + (1.0,)


def mix(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def tones(hexcol, hue_shift):
    """Sombra, medio y luz de un pigmento, más su versión 'segundo pigmento'."""
    base = hex_srgb(hexcol)
    h, s, v = colorsys.rgb_to_hsv(*base)
    dark = colorsys.hsv_to_rgb(h, min(1.0, s * 1.12), v * 0.66)
    shadow = mix(dark, hex_srgb(SHADOW_TINT), 0.30)
    light = mix(base, hex_srgb(PAPER), 0.25)
    vb = colorsys.hsv_to_rgb((h + hue_shift) % 1.0, s * 0.9, min(1.0, v * 1.06))
    vdark = colorsys.hsv_to_rgb((h + hue_shift) % 1.0, min(1.0, s * 1.05), v * 0.70)
    vshadow = mix(vdark, hex_srgb(SHADOW_TINT), 0.30)
    vlight = mix(vb, hex_srgb(PAPER), 0.30)
    return (shadow, base, light), (vshadow, vb, vlight)


# --- Nodos -------------------------------------------------------------------
def sock(sockets, ident):
    for s in sockets:
        if s.identifier == ident:
            return s
    return sockets[ident]


class Graph:
    def __init__(self, mat):
        self.nt = mat.node_tree
        self.nt.nodes.clear()

    def new(self, kind, **props):
        n = self.nt.nodes.new(kind)
        for k, v in props.items():
            setattr(n, k, v)
        return n

    def feed(self, socket, value):
        if isinstance(value, bpy.types.NodeSocket):
            self.nt.links.new(value, socket)
        else:
            socket.default_value = value

    def math(self, op, a, b=0.0, c=0.0, clamp=False):
        n = self.new("ShaderNodeMath", operation=op, use_clamp=clamp)
        for i, v in enumerate((a, b, c)):
            self.feed(n.inputs[i], v)
        return n.outputs[0]

    def remap(self, v, f0, f1, t0=0.0, t1=1.0, smooth=True):
        n = self.new("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP" if smooth else "LINEAR", clamp=True)
        for ident, val in (("Value", v), ("From Min", f0), ("From Max", f1), ("To Min", t0), ("To Max", t1)):
            self.feed(sock(n.inputs, ident), val)
        return n.outputs["Result"]

    def mix(self, fac, a, b):
        n = self.new("ShaderNodeMix", data_type="RGBA", blend_type="MIX", clamp_factor=True)
        self.feed(sock(n.inputs, "Factor_Float"), fac)
        self.feed(sock(n.inputs, "A_Color"), a)
        self.feed(sock(n.inputs, "B_Color"), b)
        return sock(n.outputs, "Result_Color")

    def noise(self, vec, scale, detail, rough, distortion=0.0, offset=(0.0, 0.0, 0.0)):
        m = self.new("ShaderNodeMapping")
        self.feed(m.inputs["Vector"], vec)
        m.inputs["Location"].default_value = offset
        n = self.new("ShaderNodeTexNoise", noise_dimensions="3D")
        self.nt.links.new(m.outputs["Vector"], n.inputs["Vector"])
        n.inputs["Scale"].default_value = scale
        n.inputs["Detail"].default_value = detail
        n.inputs["Roughness"].default_value = rough
        n.inputs["Distortion"].default_value = distortion
        return n.outputs["Fac"]

    def tone_ramp(self, fac, three):
        r = self.new("ShaderNodeValToRGB")
        r.color_ramp.interpolation = "LINEAR"
        els = r.color_ramp.elements
        els[0].position, els[1].position = 0.0, 1.0
        els.new(0.5)
        for el, c in zip(els, three):
            el.color = lin4(c)
        self.feed(r.inputs["Fac"], fac)
        return r.outputs["Color"]


def seed_of(name):
    return (zlib.crc32(name.encode()) % 997) / 997.0 * 40.0


def pattern_planks(g, tc):
    """Juntas de tablas de cubierta, a lo largo de la eslora."""
    w = g.new("ShaderNodeTexWave", wave_type="BANDS", bands_direction="Y", wave_profile="SIN")
    g.nt.links.new(tc.outputs["Object"], w.inputs["Vector"])
    w.inputs["Scale"].default_value = 3.3          # período ≈ 0,095 u
    w.inputs["Distortion"].default_value = 0.6
    w.inputs["Detail"].default_value = 1.0
    return g.remap(w.outputs["Fac"], 0.88, 0.99)


def pattern_waves(g, tc):
    """Símbolo de BOIA en la bandera: dos olas blancas '≈' (UV de la bandera)."""
    sep = g.new("ShaderNodeSeparateXYZ")
    g.nt.links.new(tc.outputs["UV"], sep.inputs[0])
    u, v = sep.outputs["X"], sep.outputs["Y"]
    wav = g.math("SINE", g.math("MULTIPLY", u, 2 * math.pi * 1.5))
    w = g.math("MULTIPLY_ADD", wav, 0.075, v)
    d = g.math("MINIMUM", g.math("ABSOLUTE", g.math("SUBTRACT", w, 0.34)),
               g.math("ABSOLUTE", g.math("SUBTRACT", w, 0.66)))
    line = g.remap(d, 0.05, 0.075, 1.0, 0.0)
    gate = g.math("MULTIPLY", g.remap(u, 0.10, 0.16), g.remap(u, 0.84, 0.90, 1.0, 0.0))
    return g.math("MULTIPLY", line, gate)


def wc_material(name, hexcol, hue_shift=-0.035, pattern=None, second=None, flat=False,
                blot_amt=0.90, grain_amt=0.24, pool=0.55):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    g = Graph(mat)
    out = g.new("ShaderNodeOutputMaterial")
    emit = g.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0
    g.nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    tc = g.new("ShaderNodeTexCoord")
    win = tc.outputs["Window"]
    sd = seed_of(name)
    grain = g.noise(win, GRAIN_SCALE, 2.0, 0.65)                             # papel: común a todo
    if flat:
        c = hex_srgb(hexcol)
        col = g.mix(g.math("MULTIPLY", grain, 0.5), lin4(c), lin4(mix(c, hex_srgb(PAPER), 0.5)))
        g.nt.links.new(col, emit.inputs["Color"])
        return mat
    blot = g.noise(win, BLOT_SCALE, 3.0, 0.55, 0.8, (sd, sd * 0.7, sd * 0.3))
    blot2 = g.noise(win, VARIANT_SCALE, 2.0, 0.5, 0.5, (sd * 1.3 + 7.0, sd * 0.2, 3.0))

    # Luz: rampa toon de dos escalones blandos.
    diff = g.new("ShaderNodeBsdfDiffuse")
    diff.inputs["Color"].default_value = (1, 1, 1, 1)
    s2r = g.new("ShaderNodeShaderToRGB")
    g.nt.links.new(diff.outputs["BSDF"], s2r.inputs["Shader"])
    bw = g.new("ShaderNodeRGBToBW")
    g.nt.links.new(s2r.outputs["Color"], bw.inputs["Color"])
    L = bw.outputs["Val"]
    s = g.math("ADD", g.remap(L, 0.05, 0.22, 0.0, 0.5), g.remap(L, 0.52, 0.76, 0.0, 0.5))
    # El pigmento no se posa parejo: manchas y grano mueven el tono.
    s = g.math("MULTIPLY_ADD", blot, blot_amt, s)
    s = g.math("MULTIPLY_ADD", grain, grain_amt, s)
    s = g.math("SUBTRACT", s, 0.5 * (blot_amt + grain_amt), clamp=True)

    main, variant = tones(hexcol, hue_shift)
    col = g.tone_ramp(s, main)
    col = g.mix(g.remap(blot2, 0.46, 0.72, 0.0, 0.55), col, g.tone_ramp(s, variant))
    if pattern:
        mask = pattern(g, tc)
        sec_main, _ = tones(second, hue_shift)
        col = g.mix(mask, col, g.tone_ramp(s, sec_main))
    # Pigmento acumulado donde la superficie se escapa de la vista.
    lw = g.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.35
    edge = g.math("MULTIPLY", g.remap(lw.outputs["Facing"], 0.5, 0.92), pool)
    deep = g.new("ShaderNodeGamma")
    g.nt.links.new(col, deep.inputs["Color"])
    deep.inputs["Gamma"].default_value = 1.7
    col = g.mix(edge, col, deep.outputs["Color"])
    # Papel que asoma en las luces.
    paper = g.math("MULTIPLY", g.remap(s, 0.72, 0.98), g.remap(grain, 0.57, 0.70, 0.0, 0.35))
    col = g.mix(paper, col, lin4(hex_srgb(PAPER)))
    g.nt.links.new(col, emit.inputs["Color"])
    return mat


def outline_material():
    mat = bpy.data.materials.new("outline")
    mat.use_nodes = True
    g = Graph(mat)
    out = g.new("ShaderNodeOutputMaterial")
    emit = g.new("ShaderNodeEmission")
    tc = g.new("ShaderNodeTexCoord")
    grain = g.noise(tc.outputs["Window"], GRAIN_SCALE * 0.5, 2.0, 0.6, 0.0, (5.0, 1.0, 2.0))
    col = g.mix(grain, lin4(hex_srgb(OUTLINE_COLOR[0])), lin4(hex_srgb(OUTLINE_COLOR[1])))
    g.nt.links.new(col, emit.inputs["Color"])
    g.nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    mat.use_backface_culling = True
    return mat


class Materials:
    def __init__(self):
        self.m = {}
        for role, hx in PAL.items():
            kw = {}
            if role == "deck":
                kw = dict(pattern=pattern_planks, second="#A9713F", hue_shift=0.02)
            elif role == "flag":
                kw = dict(pattern=pattern_waves, second=PAPER, hue_shift=-0.025)
            elif role in ("hull", "window"):
                kw = dict(hue_shift=-0.045)        # el azul se va hacia turquesa en manchas
            elif role in ("cream", "cabin", "awning", "ring_white"):
                kw = dict(hue_shift=0.05, pool=0.45)
            self.m[role] = wc_material(role, hx, **kw)
        self.m["glow"] = wc_material("glow", GLOW, flat=True)
        self.outline = outline_material()

    def __getitem__(self, role):
        return self.m[role]


# --- Malla -------------------------------------------------------------------
USE_OUTLINE = True


def link_object(name, bm, mats, parent, outline_mat, outline=True, thickness=0.0):
    me = bpy.data.meshes.new(name)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for f in bm.faces:
        f.smooth = True
    sharp = math.radians(SHARP_ANGLE_DEG)
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
        mod = obj.modifiers.new("thickness", "SOLIDIFY")
        mod.thickness = thickness
        mod.offset = 0.0
    if outline and USE_OUTLINE:
        n = len(mats)
        for _ in range(n):
            me.materials.append(outline_mat)
        mod = obj.modifiers.new("outline", "SOLIDIFY")
        mod.thickness = OUTLINE_WIDTH
        mod.offset = 1.0
        mod.use_flip_normals = True
        mod.use_even_offset = True
        mod.material_offset = n
        mod.material_offset_rim = n
    return obj


def cylinder(bm, p0, p1, r, segments=10, r_top=None):
    p0, p1 = Vector(p0), Vector(p1)
    axis = p1 - p0
    rot = axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
    mtx = Matrix.Translation((p0 + p1) / 2) @ rot
    ret = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments,
                                radius1=r, radius2=r if r_top is None else r_top,
                                depth=axis.length, matrix=mtx)
    return ret["verts"]


def faces_of(verts):
    fs = set()
    for v in verts:
        fs.update(v.link_faces)
    return list(fs)


def soft_box(bm, center, size, rot_z=0.0, bevel=0.02, segments=2):
    """Caja con aristas redondeadas: el lavado se degrada en el canto."""
    tmp = bmesh.new()
    bmesh.ops.create_cube(tmp, size=1.0, matrix=Matrix.Diagonal((size[0], size[1], size[2], 1.0)))
    if bevel:
        bmesh.ops.bevel(tmp, geom=list(tmp.verts) + list(tmp.edges), offset=bevel, offset_type="OFFSET",
                        segments=segments, profile=0.5, affect="EDGES", clamp_overlap=True)
    bmesh.ops.transform(tmp, verts=tmp.verts[:], matrix=Matrix.Translation(center) @ Matrix.Rotation(rot_z, 4, "Z"))
    me = bpy.data.meshes.new("_tmp")
    tmp.to_mesh(me)
    tmp.free()
    n0 = len(bm.faces)
    bm.from_mesh(me)
    bpy.data.meshes.remove(me)
    bm.faces.ensure_lookup_table()
    return [bm.faces[i] for i in range(n0, len(bm.faces))]


# --- Casco -------------------------------------------------------------------
HALF_BEAM = 0.54               # manga 1,08
X_WIDEST = -0.15
BOW_RAKE = 0.12
STERN_RAKE = 0.05
DECK_DEPTH = 0.06
RIM_W = 0.045
RUB_Z, RUB_R = 0.27, 0.03      # verduguete de madera
STATION_X = [-0.99, -0.965, -0.92, -0.84, -0.72, -0.57, -0.40, -0.22, -0.05, 0.13, 0.31,
             0.47, 0.60, 0.71, 0.80, 0.875, 0.93, 0.97]
BOW_X = 1.0


def half_beam(x):
    if x <= X_WIDEST:
        u, n = (X_WIDEST - x) / (X_WIDEST + 1.0), 2.4       # popa redonda y llena
    else:
        u, n = (x - X_WIDEST) / (1.0 - X_WIDEST), 2.0       # proa elíptica
    u = min(max(u, 0.0), 1.0)
    return HALF_BEAM * (1.0 - u ** n) ** (1.0 / n)


def deck_z(x):
    z = 0.40
    if x > 0.1:
        z += 0.15 * ((x - 0.1) / 0.9) ** 2       # proa levantada
    if x < -0.4:
        z += 0.05 * ((-0.4 - x) / 0.6) ** 2
    return z


def deck_top(x):
    return deck_z(x) - DECK_DEPTH


def hull_xy(x, z, zd):
    f = z / zd
    x2 = x + BOW_RAKE * (f - 1.0) * max(0.0, (x - 0.55) / 0.45) ** 3
    x2 += STERN_RAKE * (1.0 - f) * max(0.0, (-0.7 - x) / 0.3) ** 3
    return x2


LEVELS = lambda zd: [(0.80, 0.0), (0.95, 0.12), (1.0, RUB_Z), (0.985, zd)]
HULL_ROLES = ["hull", "cream", "wood", "deck"]


def build_hull(mats, parent):
    bm = bmesh.new()
    idx = {r: i for i, r in enumerate(HULL_ROLES)}
    rings = []
    for x in STATION_X:
        b, zd = half_beam(x), deck_z(x)
        left = [bm.verts.new((hull_xy(x, z, zd), -wf * b, z)) for wf, z in LEVELS(zd)]
        right = [bm.verts.new((hull_xy(x, z, zd), wf * b, z)) for wf, z in LEVELS(zd)]
        rings.append(left + right[::-1])
    zd = deck_z(BOW_X)
    bow = [bm.verts.new((hull_xy(BOW_X, z, zd), 0.0, z)) for _, z in LEVELS(zd)]
    seg_role = ["hull", "hull", "cream", "deck", "cream", "hull", "hull", "hull"]
    deck_faces = []

    def add(vs, role):
        f = bm.faces.new(vs)
        f.material_index = idx[role]
        if role == "deck":
            deck_faces.append(f)

    for ra, rb in zip(rings, rings[1:]):
        for k in range(8):
            add((ra[k], ra[(k + 1) % 8], rb[(k + 1) % 8], rb[k]), seg_role[k])
    lvl = [0, 1, 2, 3, 3, 2, 1, 0]
    last = rings[-1]
    for k in range(8):
        a, b_, c, d = last[k], last[(k + 1) % 8], bow[lvl[(k + 1) % 8]], bow[lvl[k]]
        add((a, b_, c) if c is d else (a, b_, c, d), seg_role[k])
    r0 = rings[0]
    add((r0[0], r0[1], r0[6], r0[7]), "hull")
    add((r0[1], r0[2], r0[5], r0[6]), "hull")
    add((r0[2], r0[3], r0[4], r0[5]), "cream")

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    ret = bmesh.ops.inset_region(bm, faces=deck_faces, thickness=RIM_W, depth=0.0,
                                 use_even_offset=True, use_boundary=True)
    for f in ret["faces"]:
        f.material_index = idx["wood"]
    before = set(bm.faces)
    ext = bmesh.ops.extrude_face_region(bm, geom=deck_faces)
    new_verts = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    top = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMFace)]
    bmesh.ops.translate(bm, verts=new_verts, vec=(0.0, 0.0, -DECK_DEPTH))
    bmesh.ops.delete(bm, geom=deck_faces, context="FACES_ONLY")
    for f in bm.faces:
        if f not in before:
            f.material_index = idx["deck"] if f in top else idx["wood"]
    return link_object("hull", bm, [mats[r] for r in HULL_ROLES], parent, mats.outline)


def build_rub_rail(mats, parent):
    """Verduguete de madera alrededor del casco, entre el azul y el crema."""
    pts = []
    for x in reversed(STATION_X):
        zd = deck_z(x)
        pts.append(Vector((hull_xy(x, RUB_Z, zd), -(half_beam(x) + 0.012), RUB_Z)))
    for x in STATION_X:
        zd = deck_z(x)
        pts.append(Vector((hull_xy(x, RUB_Z, zd), half_beam(x) + 0.012, RUB_Z)))
    pts.append(Vector((hull_xy(BOW_X, RUB_Z, deck_z(BOW_X)) + 0.012, 0.0, RUB_Z)))
    bm = bmesh.new()
    n, segs = len(pts), 6
    rings = []
    up = Vector((0, 0, 1))
    for i, p in enumerate(pts):
        t = (pts[(i + 1) % n] - pts[i - 1]).normalized()
        side = t.cross(up).normalized()
        rings.append([bm.verts.new(p + RUB_R * (math.cos(2 * math.pi * k / segs) * side +
                                                 math.sin(2 * math.pi * k / segs) * up)) for k in range(segs)])
    for i in range(n):
        ra, rb = rings[i], rings[(i + 1) % n]
        for k in range(segs):
            bm.faces.new((ra[k], ra[(k + 1) % segs], rb[(k + 1) % segs], rb[k]))
    return link_object("rub_rail", bm, [mats["wood"]], parent, mats.outline)


# --- Caseta, toldo, chimenea, mástil, bandera -----------------------------------
CAB_X0, CAB_X1, CAB_Y = -0.50, 0.08, 0.30
CAB_Z0, CAB_Z1 = 0.31, 0.86
AWN_X0, AWN_X1, AWN_Y, AWN_Z, AWN_RISE = -0.60, 0.19, 0.38, 0.90, 0.07
MAST_X, MAST_TOP = 0.05, 1.84
FLAG_Z0, FLAG_H, FLAG_W = 1.60, 0.22, 0.40
CHIM_X = -0.33


def build_cabin(mats, parent):
    objs = []
    bm = bmesh.new()
    cx = (CAB_X0 + CAB_X1) / 2
    soft_box(bm, (cx, 0, (CAB_Z0 + CAB_Z1) / 2), (CAB_X1 - CAB_X0, 2 * CAB_Y, CAB_Z1 - CAB_Z0), bevel=0.03)
    objs.append(link_object("cabin", bm, [mats["cabin"]], parent, mats.outline))

    # Ventanas: marco de madera y cristal azul oscuro.
    bm = bmesh.new()
    wins = []
    for y in (-0.125, 0.125):                                    # frente
        wins.append(((CAB_X1, y, 0.665), "x", 0.16, 0.18))
    for sgn in (-1, 1):                                           # costados
        for x in (-0.02, -0.17):
            wins.append(((x, sgn * CAB_Y, 0.675), "y", 0.11, 0.16))
    wins.append(((CAB_X0, 0.0, 0.66), "x", 0.14, 0.14))          # popa
    for (x, y, z), axis, w, h in wins:
        if axis == "x":
            fsz, gsz = (0.03, w + 0.04, h + 0.04), (0.045, w, h)
        else:
            fsz, gsz = (w + 0.04, 0.03, h + 0.04), (w, 0.045, h)
        f = soft_box(bm, (x, y, z), fsz, bevel=0.006, segments=1)
        for face in f:
            face.material_index = 0
        g = soft_box(bm, (x, y, z), gsz, bevel=0.0)
        for face in g:
            face.material_index = 1
    objs.append(link_object("windows", bm, [mats["wood"], mats["window"]], parent, mats.outline, outline=False))

    # Toldo de lona: techo abombado con faldón festoneado.
    bm = bmesh.new()
    nx, ny = 10, 10
    grid = []
    zt = lambda y: AWN_Z + AWN_RISE * (1.0 - (y / AWN_Y) ** 2)
    for i in range(nx + 1):
        x = AWN_X0 + (AWN_X1 - AWN_X0) * i / nx
        grid.append([bm.verts.new((x, -AWN_Y + 2 * AWN_Y * j / ny, zt(-AWN_Y + 2 * AWN_Y * j / ny)))
                     for j in range(ny + 1)])
    for i in range(nx):
        for j in range(ny):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    objs.append(link_object("awning", bm, [mats["awning"]], parent, mats.outline, thickness=0.025))

    bm = bmesh.new()
    per = []
    for i in range(nx + 1):
        per.append((AWN_X0 + (AWN_X1 - AWN_X0) * i / nx, -AWN_Y))
    for j in range(1, ny + 1):
        per.append((AWN_X1, -AWN_Y + 2 * AWN_Y * j / ny))
    for i in range(nx - 1, -1, -1):
        per.append((AWN_X0 + (AWN_X1 - AWN_X0) * i / nx, AWN_Y))
    for j in range(ny - 1, 0, -1):
        per.append((AWN_X0, -AWN_Y + 2 * AWN_Y * j / ny))
    # Densifica para el festón.
    dense = []
    for (xa, ya), (xb, yb) in zip(per, per[1:] + per[:1]):
        for k in range(4):
            t = k / 4
            dense.append((xa + (xb - xa) * t, ya + (yb - ya) * t))
    top, bot = [], []
    for k, (x, y) in enumerate(dense):
        z = zt(y) - 0.005
        scallop = abs(math.sin(math.pi * k / 4))
        top.append(bm.verts.new((x, y, z)))
        bot.append(bm.verts.new((x, y, z - 0.045 - 0.028 * scallop)))
    m = len(dense)
    for k in range(m):
        bm.faces.new((top[k], top[(k + 1) % m], bot[(k + 1) % m], bot[k]))
    objs.append(link_object("valance", bm, [mats["awning"]], parent, mats.outline, thickness=0.012))

    # Chimenea negra con reborde.
    bm = bmesh.new()
    cylinder(bm, (CHIM_X, 0, CAB_Z1 - 0.02), (CHIM_X, 0, 1.25), 0.068, 12, 0.076)
    cylinder(bm, (CHIM_X, 0, 1.23), (CHIM_X, 0, 1.29), 0.088, 12)
    objs.append(link_object("chimney", bm, [mats["chimney"]], parent, mats.outline))

    # Mástil de madera con perilla.
    bm = bmesh.new()
    cylinder(bm, (MAST_X, 0, CAB_Z1 - 0.02), (MAST_X, 0, MAST_TOP), 0.024, 8, 0.017)
    cylinder(bm, (MAST_X, -0.10, 1.40), (MAST_X, 0.10, 1.40), 0.012, 6)     # cruceta
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.03,
                               matrix=Matrix.Translation((MAST_X, 0, MAST_TOP + 0.02)))
    objs.append(link_object("mast", bm, [mats["wood"]], parent, mats.outline))

    # Bandera naranja con olas blancas; ondea hacia popa.
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    rows, cols = 4, 8
    grid = []
    for i in range(rows + 1):
        row = []
        for j in range(cols + 1):
            u = j / cols
            x = MAST_X - 0.02 - FLAG_W * u
            z = FLAG_Z0 + FLAG_H * (i / rows) - 0.025 * u
            y = 0.035 * math.sin(2 * math.pi * 1.1 * u) * u
            row.append((bm.verts.new((x, y, z)), (u, i / rows)))
        grid.append(row)
    for i in range(rows):
        for j in range(cols):
            quad = (grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j])
            f = bm.faces.new([q[0] for q in quad])
            for loop, q in zip(f.loops, quad):
                loop[uv].uv = q[1]
    objs.append(link_object("flag", bm, [mats["flag"]], parent, mats.outline, thickness=0.014))
    return objs


# --- Salvavidas, carga, macetas, faroles ------------------------------------
def life_ring(bm, center, facing_y, major=0.085, minor=0.03):
    nu, nv = 16, 6
    ring = [[None] * nv for _ in range(nu)]
    for i in range(nu):
        a = 2 * math.pi * i / nu
        for j in range(nv):
            b = 2 * math.pi * j / nv
            rr = major + minor * math.cos(b)
            ring[i][j] = bm.verts.new((rr * math.cos(a), minor * math.sin(b), rr * math.sin(a)))
    new = []
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((ring[i][j], ring[(i + 1) % nu][j], ring[(i + 1) % nu][(j + 1) % nv],
                              ring[i][(j + 1) % nv]))
            f.material_index = (i // 2) % 2
            new.append(f)
    verts = [v for row in ring for v in row]
    tilt = Matrix.Rotation(math.radians(-6 * facing_y), 4, "X")
    bmesh.ops.transform(bm, verts=verts, matrix=Matrix.Translation(center) @ tilt)


def barrel(bm, x, y, r=0.07, h=0.17):
    z0 = deck_top(x) - 0.005
    prof = [(0.0, 0.88), (0.03, 0.96), (0.05, 0.99), (0.085, 1.0), (0.12, 0.99), (0.14, 0.96), (0.17, 0.88)]
    segs = 12
    rings = []
    for zz, rf in prof:
        zz *= h / 0.17
        rings.append([bm.verts.new((x + r * rf * math.cos(2 * math.pi * k / segs),
                                    y + r * rf * math.sin(2 * math.pi * k / segs), z0 + zz)) for k in range(segs)])
    band = {0: 1, 4: 1}
    for i in range(len(rings) - 1):
        for k in range(segs):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % segs], rings[i + 1][(k + 1) % segs], rings[i + 1][k]))
            f.material_index = band.get(i, 0)
    bm.faces.new(list(reversed(rings[0]))).material_index = 0
    top = bm.faces.new(rings[-1])
    top.material_index = 0
    ins = bmesh.ops.inset_individual(bm, faces=[top], thickness=0.012, depth=-0.012)
    for f in ins["faces"]:
        f.material_index = 1


def crate(bm, x, y, size, rot, z0=None):
    z0 = deck_top(x) - 0.005 if z0 is None else z0
    faces = soft_box(bm, (x, y, z0 + size / 2), (size, size, size), rot_z=math.radians(rot), bevel=0.008, segments=1)
    big = [f for f in faces if f.calc_area() > 0.5 * size * size]
    for f in faces:
        f.material_index = 1
    ins = bmesh.ops.inset_individual(bm, faces=big, thickness=0.022, depth=-0.008)
    for f in big:
        f.material_index = 0
    return z0 + size


def plant_pot(bm_pot, bm_leaf, x, y, s=1.0):
    z0 = deck_top(x) - 0.005
    v = cylinder(bm_pot, (x, y, z0), (x, y, z0 + 0.085 * s), 0.052 * s, 10, 0.066 * s)
    for f in faces_of(v):
        f.material_index = 0
    blobs = [((0, 0, 0.14), 0.072, 0), ((0.035, 0.03, 0.19), 0.05, 1), ((-0.04, 0.015, 0.175), 0.05, 0),
             ((0.0, -0.04, 0.18), 0.045, 1)]
    for (dx, dy, dz), r, mi in blobs:
        ret = bmesh.ops.create_icosphere(bm_leaf, subdivisions=2, radius=r * s,
                                         matrix=Matrix.Translation((x + dx * s, y + dy * s, z0 + dz * s)))
        for f in faces_of(ret["verts"]):
            f.material_index = mi
    for (dx, dy, dz) in ((0.05, -0.03, 0.2), (-0.03, 0.05, 0.21), (0.01, 0.0, 0.235)):
        ret = bmesh.ops.create_icosphere(bm_leaf, subdivisions=1, radius=0.018 * s,
                                         matrix=Matrix.Translation((x + dx * s, y + dy * s, z0 + dz * s)))
        for f in faces_of(ret["verts"]):
            f.material_index = 2


def lantern(bm, x, y, z0, hang=False):
    """Farol: base y techo oscuros, vidrio que brilla (material 1)."""
    v = cylinder(bm, (x, y, z0), (x, y, z0 + 0.018), 0.036, 8)
    for f in faces_of(v):
        f.material_index = 0
    v = cylinder(bm, (x, y, z0 + 0.018), (x, y, z0 + 0.088), 0.03, 8)
    for f in faces_of(v):
        f.material_index = 1
    ret = bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.042, radius2=0.008, depth=0.04,
                                matrix=Matrix.Translation((x, y, z0 + 0.108)))
    for f in faces_of(ret["verts"]):
        f.material_index = 0
    if hang:
        v = cylinder(bm, (x, y, z0 + 0.12), (x, y, AWN_Z - 0.03), 0.006, 4)
        for f in faces_of(v):
            f.material_index = 0


def build_props(mats, parent):
    objs = []
    bm = bmesh.new()
    for sgn in (-1, 1):
        life_ring(bm, (-0.36, sgn * (CAB_Y + 0.035), 0.56), sgn)
    objs.append(link_object("life_rings", bm, [mats["ring_red"], mats["ring_white"]], parent, mats.outline))

    bm = bmesh.new()
    zt = crate(bm, 0.40, -0.17, 0.19, 8)
    crate(bm, 0.41, -0.165, 0.14, -14, z0=zt)
    crate(bm, -0.85, 0.03, 0.15, 20)
    objs.append(link_object("crates", bm, [mats["crate"], mats["crate_frame"]], parent, mats.outline))

    bm = bmesh.new()
    barrel(bm, 0.44, 0.19)
    barrel(bm, -0.69, -0.22)
    barrel(bm, -0.66, -0.05, r=0.062, h=0.15)
    objs.append(link_object("barrels", bm, [mats["barrel"], mats["metal"]], parent, mats.outline))

    bm_pot, bm_leaf = bmesh.new(), bmesh.new()
    plant_pot(bm_pot, bm_leaf, 0.63, 0.10, 0.95)
    plant_pot(bm_pot, bm_leaf, 0.18, 0.20, 0.85)
    plant_pot(bm_pot, bm_leaf, -0.68, 0.22, 1.0)
    objs.append(link_object("pots", bm_pot, [mats["pot"]], parent, mats.outline))
    objs.append(link_object("plants", bm_leaf, [mats["leaf"], mats["leaf2"], mats["flower"]], parent, mats.outline))

    bm = bmesh.new()
    v = cylinder(bm, (0.84, 0, deck_top(0.84) - 0.01), (0.84, 0, 0.60), 0.016, 6)
    for f in faces_of(v):
        f.material_index = 2
    lantern(bm, 0.84, 0.0, 0.60)
    lantern(bm, AWN_X1 - 0.03, AWN_Y - 0.05, 0.70, hang=True)
    objs.append(link_object("lanterns", bm, [mats["lantern"], mats["glow"], mats["wood"]], parent, mats.outline))

    # Bitas y cabo adujado a popa.
    bm = bmesh.new()
    for y in (-0.08, 0.08):
        cylinder(bm, (-0.93, y, deck_top(-0.93) - 0.01), (-0.93, y, deck_top(-0.93) + 0.07), 0.025, 8)
    for k in range(3):
        rr = 0.075 - 0.018 * k
        tor = []
        segs = 14
        for i in range(segs):
            a = 2 * math.pi * i / segs
            c = Vector((-0.80 + rr * math.cos(a), -0.24 + rr * math.sin(a), deck_top(-0.8) + 0.012 + 0.012 * k))
            tor.append(c)
        for i in range(segs):
            cylinder(bm, tor[i], tor[(i + 1) % segs], 0.012, 5)
    objs.append(link_object("rope", bm, [mats["rope"]], parent, mats.outline, outline=False))
    return objs


def build_ship():
    mats = Materials()
    root = bpy.data.objects.new("ship_root", None)
    bpy.context.scene.collection.objects.link(root)
    build_hull(mats, root)
    build_rub_rail(mats, root)
    build_cabin(mats, root)
    build_props(mats, root)
    return root


# --- Pasada de acuarela sobre el PNG (numpy dentro de Blender) ---------------
def read_png(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    a = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return a.reshape(h, w, 4)[::-1].copy()


def write_png(path, rgba):
    px = (np.clip(rgba, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8)
    h, w, _ = px.shape
    raw = b"".join(b"\x00" + px[y].tobytes() for y in range(h))

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) +
                chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def blur(img, sigma):
    r = max(1, int(math.ceil(sigma * 3)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    out = img
    for axis in (0, 1):
        acc = np.zeros_like(out)
        for i, wgt in zip(range(-r, r + 1), k):
            acc += wgt * np.roll(out, i, axis=axis)
        out = acc
    return out


def value_noise(h, w, cells, seed):
    """Ruido suave en coordenadas normalizadas: igual a 256 y a 512 px."""
    rng = np.random.default_rng(seed)
    g = rng.random((cells + 2, cells + 2)).astype(np.float32)
    ys = np.linspace(0, cells, h, dtype=np.float32)
    xs = np.linspace(0, cells, w, dtype=np.float32)
    y0, x0 = np.floor(ys).astype(int), np.floor(xs).astype(int)
    fy, fx = ys - y0, xs - x0
    fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    a = g[y0][:, x0]
    b = g[y0][:, x0 + 1]
    c = g[y0 + 1][:, x0]
    d = g[y0 + 1][:, x0 + 1]
    top = a + (b - a) * fx[None, :]
    bot = c + (d - c) * fx[None, :]
    return top + (bot - top) * fy[:, None]


def sample(img, dy, dx):
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    sy = np.clip(yy + dy, 0, h - 1.001)
    sx = np.clip(xx + dx, 0, w - 1.001)
    y0, x0 = sy.astype(int), sx.astype(int)
    fy, fx = (sy - y0)[..., None], (sx - x0)[..., None]
    p = img
    return ((p[y0, x0] * (1 - fx) + p[y0, x0 + 1] * fx) * (1 - fy) +
            (p[y0 + 1, x0] * (1 - fx) + p[y0 + 1, x0 + 1] * fx) * fy)


def watercolor_pass(path):
    img = read_png(path)
    h, w = img.shape[:2]
    s = w / rig.RESOLUTION
    rgb, al = img[..., :3], img[..., 3:4]
    n1 = value_noise(h, w, 22, 11)[..., None]
    n2 = value_noise(h, w, 9, 12)[..., None]
    # 1. Borde húmedo: el pigmento se acumula en la silueta y donde se tocan dos lavados.
    sil = np.clip((al - blur(al, 1.3 * s)) * 2.8, 0.0, 1.0)
    pm = rgb * al
    col_edge = np.clip(np.abs(pm - blur(pm, 1.0 * s)).sum(axis=2, keepdims=True) * 2.2, 0.0, 1.0)
    edge = np.maximum(sil, col_edge * 0.8) * (0.55 + 0.9 * n1) * al
    deep = np.power(np.clip(rgb, 0, 1), 1.55)
    rgb = rgb + (deep - rgb) * np.clip(edge * 0.75, 0.0, 0.85)
    pm = np.concatenate([rgb * al, al], axis=2)
    # 2. Bordes irregulares: el trazo no sigue la silueta al píxel.
    dx = (value_noise(h, w, 26, 21) - 0.5) * 2.4 * s
    dy = (value_noise(h, w, 26, 22) - 0.5) * 2.4 * s
    pm = sample(pm, dy, dx)
    # 3. Sangrado: en manchas, los colores vecinos se funden un poco.
    f = np.clip((n2 - 0.42) * 1.6, 0.0, 0.45)
    pm = pm + (blur(pm, 1.2 * s) - pm) * f
    # 4. Un velo de pigmento que se escapa fuera de la silueta.
    halo = blur(pm, 2.0 * s)
    pm = pm + halo * (1.0 - pm[..., 3:4]) * 0.34
    a2 = pm[..., 3:4]
    out_rgb = np.where(a2 > 1e-4, pm[..., :3] / np.maximum(a2, 1e-4), 0.0)
    write_png(path, np.concatenate([out_rgb, a2], axis=2))


# --- Render ------------------------------------------------------------------
def render_to(scene, path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def make_sheets(out, sheet, hero_sheet):
    ff = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
    if sheet:
        ins = []
        for d in DIRECTIONS:
            ins += ["-i", os.path.join(out, d + ".png")]
        subprocess.run([ff, "-v", "error", "-y", *ins, "-f", "lavfi", "-i", "color=c=0x2E86B5:s=2048x256",
                        "-filter_complex", "[0][1][2][3][4][5][6][7]hstack=inputs=8[s];[8][s]overlay=format=auto",
                        "-frames:v", "1", sheet], check=True)
    if hero_sheet:
        subprocess.run([ff, "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x2E86B5:s=512x512",
                        "-i", os.path.join(out, "hero_SE.png"),
                        "-filter_complex", "[0][1]overlay=format=auto", "-frames:v", "1", hero_sheet], check=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="tools/blender/out/styles/02_acuarela_ilustrada")
    ap.add_argument("--no-bleed", action="store_true", help="sin la pasada de acuarela sobre el PNG")
    ap.add_argument("--sheet", help="hoja 2048x256 con las 8 direcciones sobre agua")
    ap.add_argument("--hero-sheet", help="hero 512x512 sobre agua")
    ap.add_argument("--only", help="sólo estas direcciones, separadas por comas (pruebas)")
    a = ap.parse_args(argv)
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)

    t0 = time.time()
    scene = rig.reset_scene()
    rig.setup_render(scene)
    rig.add_camera(scene)
    rig.add_sun(scene)
    root = build_ship()
    t_build = time.time() - t0

    times = []
    dirs = a.only.split(",") if a.only else DIRECTIONS
    for d in dirs:
        t = time.time()
        root.rotation_euler = (0.0, 0.0, math.radians(yaw_for(d)))
        path = os.path.join(out, d + ".png")
        render_to(scene, path)
        if not a.no_bleed:
            watercolor_pass(path)
        times.append((d, time.time() - t))
    if not a.only or "SE" in dirs:
        t = time.time()
        root.rotation_euler = (0.0, 0.0, math.radians(yaw_for("SE")))
        scene.render.resolution_percentage = 200
        path = os.path.join(out, "hero_SE.png")
        render_to(scene, path)
        if not a.no_bleed:
            watercolor_pass(path)
        scene.render.resolution_percentage = 100
        times.append(("hero_SE", time.time() - t))
    make_sheets(out, a.sheet and os.path.abspath(a.sheet), a.hero_sheet and os.path.abspath(a.hero_sheet))
    total = time.time() - t0
    print("ACUARELA build %.2fs total %.2fs" % (t_build, total))
    for d, t in times:
        print("ACUARELA %-8s %.2fs" % (d, t))


if __name__ == "__main__":
    main()
