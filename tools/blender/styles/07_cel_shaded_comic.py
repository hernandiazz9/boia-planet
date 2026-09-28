"""Estilo 07 · Cel-shaded / Cómic: remolcador con tinta Freestyle y tonos planos.

Prueba de estilo (no es el barco definitivo). Toma las técnicas de ship.py
(toon por Shader to RGB + ColorRamp CONSTANT + Emission, bmesh, suave con
aristas vivas) y las lleva más a cómic:

- Tinta con Freestyle (funciona con BLENDER_EEVEE en 5.2) en tres grosores:
  contorno exterior del barco grueso, contorno de cada pieza medio y líneas
  interiores (pliegues y cambios de material) finas. Sin casco invertido, así
  que la luz puede proyectar sombras duras (cabina sobre cubierta, etc.).
- Color plano + dos tonos de sombra duros que tiran a azul, y un brillo de
  borde (rim light) duro en los bordes del lado derecho, el opuesto al sol.
- Cubierta con tablas y bandera con las olas "≈" de BOIA hechas en el shader.

Uso:
    Blender -b -P tools/blender/styles/07_cel_shaded_comic.py -- --out tools/blender/out/styles/07_cel_shaded_comic
"""
import argparse
import colorsys
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

# --- Paleta (sRGB) ------------------------------------------------------------
INK = "#131A2C"                 # tinta: casi negro azulado
SHADOW_TINT = "#2A3F8F"         # las sombras tiran a azul cómic
RIM_TINT = "#F2FBFF"            # brillo de borde
TOON_STEPS = (0.07, 0.40)       # umbrales de luz: sombra profunda | sombra | plano

COLORS = {
    "boot": "#1D4E9E",          # franja de flotación, azul profundo
    "hull": "#4FB4EC",          # casco azul cielo
    "stripe": "#F5F2EA",        # franja blanca bajo la borda
    "wood_rim": "#B8733F",      # borda de madera
    "deck": "#E2AE72",          # cubierta de tablas
    "cabin": "#F7F4EC",         # caseta blanca
    "glass": "#2F80D6",         # ventanas azules
    "roof": "#2F80D6",
    "door": "#B8733F",
    "wood": "#9C6238",          # mástiles, postes, barriles
    "hoop": "#3D4250",          # aros de barril, bitas, remate de chimenea
    "crate": "#E0A763",
    "crate_frame": "#A9693A",
    "chimney": "#F7F4EC",
    "chimney_band": "#2F80D6",
    "ring_a": "#FF7A1A",        # salvavidas naranja
    "ring_b": "#FFFFFF",
    "rope": "#EBD7A6",
    "flag": "#2F80D6",
    "flag_waves": "#FFFFFF",
    "brass": "#FFC23D",
    "lantern": "#FFD84A",       # plano, sin sombreado: se lee como luz
    "glint": "#E9F6FF",         # reflejo de las ventanas, plano y sin tinta
}
FLAT = {"lantern", "glint"}
NO_RIM = {"lantern", "glass", "hoop", "glint"}
NO_INK = "no_ink"               # colección que Freestyle no dibuja

# Tinta Freestyle, px a 256 (Freestyle ya los escala con resolution_percentage en el hero).
LINE_EXTERNAL = 2.7
LINE_OBJECT = 1.7
LINE_INNER = 1.0

# --- Dimensiones ----------------------------------------------------------------
HALF_BEAM = 0.56
BOW_RAKE, STERN_RAKE = 0.17, 0.08
RIM_W, DECK_DEPTH = 0.05, 0.07
CAB_X0, CAB_X1, CAB_HW = -0.50, 0.12, 0.30
CAB_Z1 = 0.92
ROOF_T = 0.055
MAST_X, MAST_TOP = 0.02, 1.86
YARD_Z = 1.44
FLAG_Z0, FLAG_H, FLAG_W = 1.58, 0.26, 0.44
POST_X, POST_TOP = 0.66, 1.00
STATIONS = [0.012, 0.03, 0.06, 0.10, 0.16, 0.24, 0.34, 0.45, 0.56, 0.66, 0.75,
            0.83, 0.89, 0.935, 0.97, 0.99]


# --- Color -------------------------------------------------------------------
def hex_srgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def lin4(rgb):
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb) + (1.0,)


def mix(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def tones(hexcol):
    """(sombra profunda, sombra, plano) en sRGB."""
    base = hex_srgb(hexcol)
    h, s, v = colorsys.rgb_to_hsv(*base)
    sh = mix(colorsys.hsv_to_rgb(h, min(1.0, s * 1.1), v * 0.80), hex_srgb(SHADOW_TINT), 0.22)
    deep = mix(colorsys.hsv_to_rgb(h, min(1.0, s * 1.15), v * 0.58), hex_srgb(SHADOW_TINT), 0.34)
    return deep, sh, base


# --- Materiales ----------------------------------------------------------------
def _mix_rgb(nt, fac, a, b):
    n = nt.nodes.new("ShaderNodeMix")
    n.data_type = "RGBA"
    if isinstance(fac, (int, float)):
        n.inputs[0].default_value = fac
    else:
        nt.links.new(fac, n.inputs[0])
    for sock, src in ((n.inputs[6], a), (n.inputs[7], b)):
        if isinstance(src, tuple):
            sock.default_value = src
        else:
            nt.links.new(src, sock)
    return n.outputs[2]


def _math(nt, op, a, b=None):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    for sock, src in zip(n.inputs, (a, b)):
        if src is None:
            continue
        if isinstance(src, (int, float)):
            sock.default_value = src
        else:
            nt.links.new(src, sock)
    return n.outputs[0]


def _ramp(nt, fac, hexcol, flat=False):
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.color_ramp.interpolation = "CONSTANT"
    els = r.color_ramp.elements
    els[0].position = 0.0
    els[1].position = TOON_STEPS[0]
    els.new(TOON_STEPS[1])
    tt = (hex_srgb(hexcol),) * 3 if flat else tones(hexcol)
    for el, c in zip(els, tt):
        el.color = lin4(c)
    nt.links.new(fac, r.inputs["Fac"])
    return r.outputs["Color"]


def _flag_mask(nt):
    """Dos olas "≈" blancas centradas en la bandera (UV: u a lo largo, v a lo alto)."""
    uv = nt.nodes.new("ShaderNodeUVMap")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(uv.outputs["UV"], sep.inputs[0])
    u, v = sep.outputs["X"], sep.outputs["Y"]
    wave = _math(nt, "SINE", _math(nt, "MULTIPLY", u, 2 * math.pi * 1.6))
    wave = _math(nt, "MULTIPLY", wave, 0.075)
    inside_u = _math(nt, "MULTIPLY", _math(nt, "GREATER_THAN", u, 0.16), _math(nt, "LESS_THAN", u, 0.88))
    mask = None
    for c in (0.34, 0.64):
        d = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", _math(nt, "SUBTRACT", v, c), wave))
        m = _math(nt, "LESS_THAN", d, 0.085)
        mask = m if mask is None else _math(nt, "MAXIMUM", mask, m)
    return _math(nt, "MULTIPLY", mask, inside_u)


def _plank_mask(nt):
    """Juntas de tablas a lo largo de la eslora (coordenadas del objeto: giran con el barco)."""
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    f = _math(nt, "FRACT", _math(nt, "MULTIPLY", sep.outputs["Y"], 1 / 0.105))
    return _math(nt, "LESS_THAN", f, 0.13)


def _rim_mask(nt):
    """Brillo de borde: caras rasantes a la cámara cuya normal mira a la derecha de pantalla."""
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    right, _, _ = rig.camera_basis()
    dot = nt.nodes.new("ShaderNodeVectorMath")
    dot.operation = "DOT_PRODUCT"
    nt.links.new(geo.outputs["Normal"], dot.inputs[0])
    dot.inputs[1].default_value = (right.x, right.y, 0.12)
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.5
    a = _math(nt, "GREATER_THAN", dot.outputs["Value"], 0.42)
    b = _math(nt, "GREATER_THAN", lw.outputs["Facing"], 0.62)
    return _math(nt, "MULTIPLY", a, b)


def toon_material(role):
    hexcol = COLORS[role]
    mat = bpy.data.materials.new(role)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    diffuse = nt.nodes.new("ShaderNodeBsdfDiffuse")
    diffuse.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    to_rgb = nt.nodes.new("ShaderNodeShaderToRGB")
    nt.links.new(diffuse.outputs["BSDF"], to_rgb.inputs["Shader"])
    fac = to_rgb.outputs["Color"]
    color = _ramp(nt, fac, hexcol, flat=role in FLAT)
    if role == "flag":
        color = _mix_rgb(nt, _flag_mask(nt), color, _ramp(nt, fac, COLORS["flag_waves"]))
    elif role == "deck":
        dark = colorsys.hsv_to_rgb(*(lambda h, s, v: (h, min(1, s * 1.15), v * 0.78))(*colorsys.rgb_to_hsv(*hex_srgb(hexcol))))
        dark_hex = "#%02X%02X%02X" % tuple(int(round(c * 255)) for c in dark)
        color = _mix_rgb(nt, _plank_mask(nt), color, _ramp(nt, fac, dark_hex))
    if role not in NO_RIM:
        rim = _math(nt, "MULTIPLY", _rim_mask(nt), 0.62)
        color = _mix_rgb(nt, rim, color, lin4(hex_srgb(RIM_TINT)))
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0
    nt.links.new(color, emit.inputs["Color"])
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


class Mats(dict):
    def __missing__(self, role):
        self[role] = toon_material(role)
        return self[role]


# --- Malla -------------------------------------------------------------------
SHARP_ANGLE_DEG = 40


def link_object(name, bm, roles, mats, parent, uv=None):
    me = bpy.data.meshes.new(name)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for f in bm.faces:
        f.smooth = True
    sharp = math.radians(SHARP_ANGLE_DEG)
    for e in bm.edges:
        e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(0.0) < sharp
    bm.to_mesh(me)
    bm.free()
    if uv is not None:
        layer = me.uv_layers.new(name="UVMap")
        for loop in me.loops:
            layer.data[loop.index].uv = uv[loop.vertex_index]
    for r in roles:
        me.materials.append(mats[r])
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    return obj


def set_mat(faces, i):
    for f in faces:
        f.material_index = i


def faces_of(verts):
    fs = set()
    for v in verts:
        fs.update(v.link_faces)
    return list(fs)


def box(bm, lo, hi):
    lo, hi = Vector(lo), Vector(hi)
    size = hi - lo
    ret = bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((lo + hi) / 2) @
                                Matrix.Diagonal((size.x, size.y, size.z, 1.0)))
    return faces_of(ret["verts"])


def cylinder(bm, p0, p1, r, segments=10, r_top=None):
    p0, p1 = Vector(p0), Vector(p1)
    axis = p1 - p0
    rot = axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
    ret = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments,
                                radius1=r, radius2=r if r_top is None else r_top,
                                depth=axis.length, matrix=Matrix.Translation((p0 + p1) / 2) @ rot)
    return faces_of(ret["verts"])


def lathe(bm, center, profile, segments=12):
    """Sólido de revolución: profile = [(z, r, material_index_del_tramo_siguiente)]."""
    cx, cy, cz = center
    rings = []
    for z, r, _ in profile:
        rings.append([bm.verts.new((cx + r * math.cos(2 * math.pi * k / segments),
                                    cy + r * math.sin(2 * math.pi * k / segments), cz + z))
                      for k in range(segments)])
    for i in range(len(rings) - 1):
        for k in range(segments):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % segments],
                              rings[i + 1][(k + 1) % segments], rings[i + 1][k]))
            f.material_index = profile[i][2]
    bot = bm.faces.new(list(reversed(rings[0])))
    top = bm.faces.new(rings[-1])
    bot.material_index = profile[0][2]
    top.material_index = profile[-1][2]
    return top


def torus(bm, major, minor, nu, nv, matrix, mat_of_u=lambda i: 0):
    ring = [[None] * nv for _ in range(nu)]
    for i in range(nu):
        a = 2 * math.pi * i / nu
        for j in range(nv):
            b = 2 * math.pi * j / nv
            rr = major + minor * math.cos(b)
            ring[i][j] = bm.verts.new(matrix @ Vector((rr * math.cos(a), rr * math.sin(a), minor * math.sin(b))))
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((ring[i][j], ring[(i + 1) % nu][j], ring[(i + 1) % nu][(j + 1) % nv],
                              ring[i][(j + 1) % nv]))
            f.material_index = mat_of_u(i)


# --- Casco ---------------------------------------------------------------------
def half_beam(xd):
    if xd < 0:
        return HALF_BEAM * max(0.0, 1 - abs(xd) ** 3.2) ** (1 / 3.2)      # popa redonda
    return HALF_BEAM * max(0.0, 1 - xd ** 2.3) ** 0.62                     # proa roma de remolcador


def sheer(s):
    """Altura de la borda; s = 0 popa, 1 proa. La proa se levanta."""
    if s < 0.45:
        return 0.37 + 0.06 * ((0.45 - s) / 0.45) ** 2
    return 0.37 + 0.24 * ((s - 0.45) / 0.55) ** 2.4


def deck_z(x):
    return sheer((x + 1) / 2) - DECK_DEPTH


def hull_levels(zd):
    z = [0.0, 0.07, 0.0, zd - 0.13, zd - 0.055, zd]
    z[2] = (z[1] + z[3]) / 2
    return z


def hull_point(s, z, zd, side):
    f = z / zd
    xd = -1 + 2 * s
    wf = 0.80 + 0.20 * (1 - (1 - f) ** 2.2)
    x = xd - (1 - f) * (BOW_RAKE * s ** 5 - STERN_RAKE * (1 - s) ** 5)
    return Vector((x, side * half_beam(xd) * wf, z))


HULL_ROLES = ["boot", "hull", "stripe", "wood_rim", "deck"]


def build_hull(mats, parent):
    bm = bmesh.new()
    ri = {r: i for i, r in enumerate(HULL_ROLES)}
    seg = ["boot", "hull", "hull", "stripe", "wood_rim", "deck",
           "wood_rim", "stripe", "hull", "hull", "boot", "boot"]
    lvl = [0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0]
    rings = []
    for s in STATIONS:
        zd = sheer(s)
        zs = hull_levels(zd)
        left = [bm.verts.new(hull_point(s, z, zd, -1)) for z in zs]
        right = [bm.verts.new(hull_point(s, z, zd, 1)) for z in zs]
        rings.append(left + right[::-1])
    cols = []
    for s in (0.0, 1.0):
        zd = sheer(s)
        cols.append([bm.verts.new(hull_point(s, z, zd, 0)) for z in hull_levels(zd)])
    deck = []

    def add(vs, role):
        f = bm.faces.new(vs)
        f.material_index = ri[role]
        if role == "deck":
            deck.append(f)

    for ra, rb in zip(rings, rings[1:]):
        for k in range(12):
            add((ra[k], ra[(k + 1) % 12], rb[(k + 1) % 12], rb[k]), seg[k])
    for ring, col in ((rings[0], cols[0]), (rings[-1], cols[1])):
        for k in range(12):
            a, b, c, d = ring[k], ring[(k + 1) % 12], col[lvl[(k + 1) % 12]], col[lvl[k]]
            add((a, b, c) if c is d else (a, b, c, d), seg[k])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    ret = bmesh.ops.inset_region(bm, faces=deck, thickness=RIM_W, depth=0.0,
                                 use_even_offset=True, use_boundary=True)
    set_mat(ret["faces"], ri["wood_rim"])
    before = set(bm.faces)
    ext = bmesh.ops.extrude_face_region(bm, geom=deck)
    new_verts = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    top = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMFace)]
    bmesh.ops.translate(bm, verts=new_verts, vec=(0.0, 0.0, -DECK_DEPTH))
    bmesh.ops.delete(bm, geom=deck, context="FACES_ONLY")
    for f in bm.faces:
        if f not in before:
            f.material_index = ri["deck"] if f in top else ri["wood_rim"]
    return link_object("hull", bm, HULL_ROLES, mats, parent)


# --- Superestructura -------------------------------------------------------------
def build_cabin(mats, parent):
    roles = ["cabin", "glass", "roof", "door", "chimney", "chimney_band", "hoop"]
    ri = {r: i for i, r in enumerate(roles)}
    z0 = deck_z(CAB_X1) - 0.02
    bm = bmesh.new()
    set_mat(box(bm, (CAB_X0, -CAB_HW, z0), (CAB_X1, CAB_HW, CAB_Z1)), ri["cabin"])
    # Techo con alero, algo más alto hacia proa.
    set_mat(box(bm, (CAB_X0 - 0.06, -CAB_HW - 0.05, CAB_Z1), (CAB_X1 + 0.07, CAB_HW + 0.05, CAB_Z1 + ROOF_T)),
            ri["roof"])
    t = 0.018
    # Ventanas de proa (3) y de costado (2 por banda), en relieve.
    for yc in (-0.17, 0.0, 0.17):
        set_mat(box(bm, (CAB_X1 - 0.005, yc - 0.065, 0.64), (CAB_X1 + t, yc + 0.065, 0.83)), ri["glass"])
    for side in (-1, 1):
        for xc in (-0.34, -0.10):
            y0 = side * CAB_HW
            set_mat(box(bm, (xc - 0.085, min(y0, y0 + side * t) - 0.005 * side, 0.63),
                        (xc + 0.085, max(y0, y0 + side * t), 0.82)), ri["glass"])
    # Puerta de popa con ojo de buey.
    set_mat(box(bm, (CAB_X0 - t, -0.10, z0 + 0.02), (CAB_X0 + 0.005, 0.10, 0.78)), ri["door"])
    set_mat(cylinder(bm, (CAB_X0 - t - 0.012, 0, 0.66), (CAB_X0 - t + 0.004, 0, 0.66), 0.045, 12), ri["glass"])
    # Chimenea sobre el techo, a popa: blanca con franja azul y remate oscuro.
    cz = CAB_Z1 + ROOF_T
    prof = [(0.0, 0.095, ri["chimney"]), (0.18, 0.100, ri["chimney_band"]), (0.27, 0.104, ri["chimney"]),
            (0.36, 0.108, ri["hoop"]), (0.42, 0.115, ri["hoop"])]
    top = lathe(bm, (-0.33, 0.0, cz), prof, segments=14)
    ret = bmesh.ops.inset_region(bm, faces=[top], thickness=0.022, depth=0.0)
    set_mat(ret["faces"], ri["hoop"])
    bmesh.ops.translate(bm, verts=list(top.verts), vec=(0, 0, -0.06))
    cabin = link_object("cabin", bm, roles, mats, parent)
    build_glints(mats, parent)
    return cabin


def build_glints(mats, parent):
    """Reflejo cómic en cada ventana: una banda "/" plana, sin contorno."""
    bm = bmesh.new()
    band = [(0.14, 0.40), (0.40, 0.40), (0.74, 0.88), (0.48, 0.88)]
    up = Vector((0, 0, 1))

    def glint(center, right, normal, w, h):
        c = Vector(center) + Vector(normal) * 0.004
        bm.faces.new([bm.verts.new(c + Vector(right) * (u - 0.5) * w + up * (v - 0.5) * h) for u, v in band])

    t = 0.018
    for yc in (-0.17, 0.0, 0.17):
        glint((CAB_X1 + t, yc, 0.735), (0, 1, 0), (1, 0, 0), 0.13, 0.19)
    for side in (-1, 1):
        for xc in (-0.34, -0.10):
            glint((xc, side * (CAB_HW + t), 0.725), (-side, 0, 0), (0, side, 0), 0.17, 0.19)
    obj = link_object("glints", bm, ["glint"], mats, parent)
    coll = bpy.data.collections.get(NO_INK) or bpy.data.collections.new(NO_INK)
    if coll.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(coll)
    bpy.context.scene.collection.objects.unlink(obj)
    coll.objects.link(obj)
    return obj


def build_rigging(mats, parent):
    roles = ["wood", "brass", "hoop", "lantern"]
    ri = {r: i for i, r in enumerate(roles)}
    bm = bmesh.new()
    roof = CAB_Z1 + ROOF_T
    set_mat(cylinder(bm, (MAST_X, 0, roof - 0.01), (MAST_X, 0, MAST_TOP), 0.028, 10, 0.022), ri["wood"])
    set_mat(cylinder(bm, (MAST_X, -0.24, YARD_Z), (MAST_X, 0.24, YARD_Z), 0.016, 8), ri["wood"])
    ret = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.04,
                                     matrix=Matrix.Translation((MAST_X, 0, MAST_TOP + 0.03)))
    set_mat(faces_of(ret["verts"]), ri["brass"])
    # Poste de proa con farol.
    pz = deck_z(POST_X) - 0.01
    set_mat(cylinder(bm, (POST_X, 0, pz), (POST_X, 0, POST_TOP), 0.034, 10, 0.03), ri["wood"])
    set_mat(cylinder(bm, (POST_X, -0.11, POST_TOP - 0.16), (POST_X, 0.11, POST_TOP - 0.16), 0.016, 8), ri["wood"])
    lanterns = [((POST_X, 0, POST_TOP), 1.25), ((MAST_X, -0.24, YARD_Z - 0.115), 1.0),
                ((MAST_X, 0.24, YARD_Z - 0.115), 1.0)]
    for (lx, ly, lz), k in lanterns:
        prof = [(0.0, 0.034 * k, ri["hoop"]), (0.014 * k, 0.034 * k, ri["lantern"]),
                (0.070 * k, 0.034 * k, ri["hoop"]), (0.084 * k, 0.042 * k, ri["hoop"]),
                (0.115 * k, 0.010 * k, ri["hoop"])]
        lathe(bm, (lx, ly, lz), prof, segments=8)
    return link_object("rigging", bm, roles, mats, parent)


def build_flag(mats, parent):
    bm = bmesh.new()
    rows, cols = 4, 10
    grid, uv = [], {}
    for i in range(rows + 1):
        row = []
        for j in range(cols + 1):
            u, v = j / cols, i / rows
            x = MAST_X - 0.026 - FLAG_W * u
            z = FLAG_Z0 + FLAG_H * v - 0.03 * u
            y = 0.045 * math.sin(2 * math.pi * 1.05 * u) * u
            vert = bm.verts.new((x, y, z))
            row.append(vert)
        grid.append(row)
    bm.verts.index_update()
    for i in range(rows + 1):
        for j in range(cols + 1):
            uv[grid[i][j].index] = (j / cols, i / rows)
    for i in range(rows):
        for j in range(cols):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    return link_object("flag", bm, ["flag"], mats, parent, uv=uv)


# --- Carga y detalles de cubierta --------------------------------------------------
def build_cargo(mats, parent):
    roles = ["wood", "hoop", "crate", "crate_frame", "rope", "ring_a", "ring_b"]
    ri = {r: i for i, r in enumerate(roles)}
    bm = bmesh.new()
    # Barriles a popa y uno a proa.
    for bx, by in ((-0.74, -0.19), (-0.70, 0.20), (0.44, 0.19)):
        z0, h, r = deck_z(bx) - 0.01, 0.25, 0.088
        W, H = ri["wood"], ri["hoop"]
        prof = [(0.00, r * 0.86, W), (h * 0.10, r * 0.91, H), (h * 0.20, r * 0.96, W), (h * 0.50, r, W),
                (h * 0.80, r * 0.96, H), (h * 0.90, r * 0.91, W), (h, r * 0.86, W)]
        lathe(bm, (bx, by, z0), prof, segments=12)
    # Cajas a proa, una apilada.
    crates = [((0.24, -0.29, 0.0), 0.21), ((0.25, -0.26, 0.21), 0.15), ((0.24, 0.10, 0.0), 0.17)]
    for (cx, cy, dz), s in crates:
        z0 = deck_z(cx) - 0.01 + dz
        fs = box(bm, (cx - s / 2, cy, z0), (cx + s / 2, cy + s, z0 + s))
        set_mat(fs, ri["crate_frame"])
        ret = bmesh.ops.inset_individual(bm, faces=fs, thickness=s * 0.14, depth=-s * 0.035)
        set_mat(fs, ri["crate"])
    # Rollo de cabo a popa.
    zr = deck_z(-0.84)
    torus(bm, 0.075, 0.026, 14, 6, Matrix.Translation((-0.83, 0.0, zr + 0.02)), lambda i: ri["rope"])
    torus(bm, 0.060, 0.022, 14, 6, Matrix.Translation((-0.83, 0.0, zr + 0.06)), lambda i: ri["rope"])
    # Bitas de remolque a popa.
    for side in (-1, 1):
        bx, by = -0.56, side * 0.36
        z0 = deck_z(bx) - 0.01
        set_mat(cylinder(bm, (bx, by, z0), (bx, by, z0 + 0.10), 0.034, 10), ri["hoop"])
        set_mat(cylinder(bm, (bx, by, z0 + 0.10), (bx, by, z0 + 0.125), 0.048, 10), ri["hoop"])
    # Salvavidas naranjas colgados de los costados, uno por banda.
    for side, rx in ((-1, -0.20), (1, -0.20)):
        s = (rx + 1) / 2
        zd = sheer(s)
        rz = 0.23
        p = hull_point(s, rz, zd, side)
        tilt = Matrix.Rotation(math.radians(side * 10), 4, "X")
        m = Matrix.Translation((rx, p.y + side * 0.036, rz)) @ tilt @ Matrix.Rotation(math.radians(90), 4, "X")
        torus(bm, 0.098, 0.032, 16, 8, m, lambda i: ri["ring_b"] if i % 4 == 0 else ri["ring_a"])
    return link_object("cargo", bm, roles, mats, parent)


def build_ship():
    mats = Mats()
    root = bpy.data.objects.new("ship_root", None)
    bpy.context.scene.collection.objects.link(root)
    build_hull(mats, root)
    build_cabin(mats, root)
    build_rigging(mats, root)
    build_flag(mats, root)
    build_cargo(mats, root)
    return root


# --- Tinta Freestyle --------------------------------------------------------------
def setup_ink(scene):
    r = scene.render
    r.use_freestyle = True
    r.line_thickness_mode = "ABSOLUTE"
    r.line_thickness = 1.0
    vl = scene.view_layers[0]
    vl.use_freestyle = True
    fs = vl.freestyle_settings
    fs.mode = "EDITOR"
    fs.crease_angle = math.radians(128)
    fs.use_smoothness = True
    fs.use_culling = False
    ink = lin4(hex_srgb(INK))[:3]

    def lineset(ls, thickness, **edges):
        ls.select_by_visibility = True
        ls.visibility = "VISIBLE"
        ls.select_by_edge_types = True
        ls.select_by_collection = True
        ls.collection = bpy.data.collections[NO_INK]
        ls.collection_negation = "EXCLUSIVE"
        for k in ("silhouette", "border", "crease", "ridge_valley", "suggestive_contour",
                  "material_boundary", "contour", "external_contour", "edge_mark"):
            setattr(ls, "select_" + k, edges.get(k, False))
        st = ls.linestyle or bpy.data.linestyles.new(ls.name)
        ls.linestyle = st
        st.color = ink
        st.thickness = thickness
        st.thickness_position = "CENTER"
        st.caps = "ROUND"
        return ls

    lineset(fs.linesets[0], LINE_INNER, crease=True, material_boundary=True, border=True)
    lineset(fs.linesets.new("objects"), LINE_OBJECT, silhouette=True, contour=True)
    lineset(fs.linesets.new("external"), LINE_EXTERNAL, external_contour=True)


# --- Main ---------------------------------------------------------------------------
def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="tools/blender/out/styles/07_cel_shaded_comic")
    ap.add_argument("--only", help="sólo estas direcciones, separadas por comas (iterar rápido)")
    ap.add_argument("--no-hero", action="store_true")
    a = ap.parse_args(argv)
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)

    t0 = time.time()
    scene = rig.reset_scene()
    rig.setup_render(scene)
    rig.add_camera(scene)
    sun = rig.add_sun(scene)
    sun.data.use_shadow = True          # sin casco invertido, las sombras duras sí funcionan
    if hasattr(scene.eevee, "use_shadows"):
        scene.eevee.use_shadows = True
    root = build_ship()
    setup_ink(scene)

    dirs = a.only.split(",") if a.only else DIRECTIONS
    times = []
    for d in dirs:
        root.rotation_euler = (0.0, 0.0, math.radians(yaw_for(d)))
        scene.render.filepath = os.path.join(out, d + ".png")
        t = time.time()
        bpy.ops.render.render(write_still=True)
        times.append(time.time() - t)
    if not a.no_hero:
        root.rotation_euler = (0.0, 0.0, math.radians(yaw_for("SE")))
        scene.render.resolution_percentage = 200
        scene.render.filepath = os.path.join(out, "hero_SE.png")
        t = time.time()
        bpy.ops.render.render(write_still=True)
        times.append(time.time() - t)
    print("STYLE07 total %.1fs, por imagen %s" % (time.time() - t0, ", ".join("%.1f" % x for x in times)))


if __name__ == "__main__":
    main()
