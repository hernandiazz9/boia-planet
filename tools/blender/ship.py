"""Barco de vela procedural: low-poly, sombreado toon de tres tonos y contorno.

La geometría es una sola; las skins sólo cambian colores de materiales (y con
ellos la bandera y las franjas de la vela). La pasajera ("Boia Fiestera",
placeholder) cuelga del empty `slot_passenger` y se muestra u oculta.

Uso suelto, para inspeccionar el modelo en Blender:
    Blender -b -P tools/blender/ship.py -- --skin noche --save tools/blender/out/ship.blend
"""
import argparse
import colorsys
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig  # noqa: E402

SHIP_VERSION = "0.1.0"

# --- Paleta -----------------------------------------------------------------
# Muestra: los valores exactos de marca BOIA no existen aún (pendiente Álvaro).
BOIA_PALETTE_MUESTRA = {"orange": "#F26A1B", "navy": "#12233F"}

OUTLINE_COLOR = "#161A2E"
OUTLINE_WIDTH = 0.024          # unidades del mundo (≈1,9 px con la cámara de rig.py)
SHADOW_TINT = "#3B3470"        # las sombras tiran a violeta: se lee como ilustración
LIGHT_TINT = "#FFF6DC"
TOON_STEPS = (0.12, 0.66)      # umbrales de iluminación (Shader to RGB): sombra | medio | luz
SHARP_ANGLE_DEG = 38           # aristas más vivas que esto no se suavizan

O, N = BOIA_PALETTE_MUESTRA["orange"], BOIA_PALETTE_MUESTRA["navy"]

# Cada rol de material es un color por skin. "flat": sin sombreado (brilla).
SKINS = {
    "base": {
        "hull": O, "hull_band": N, "hull_stripe": "#F7EEDC", "rim": "#F7EEDC",
        "deck": "#D9A066", "wood": "#8A5A3B",
        "sail_a": "#FFF6E6", "sail_b": "#F8E2C4",
        "flag_a": N, "flag_b": O, "flag_c": N,
        "lantern": "#FFC83D", "ring_a": "#FFFFFF", "ring_b": O,
    },
    "noche": {
        "hull": N, "hull_band": O, "hull_stripe": "#2C4675", "rim": O,
        "deck": "#5E4636", "wood": "#4A3426",
        "sail_a": "#3A3F86", "sail_b": "#2A2E66",
        "flag_a": "#FFD34D", "flag_b": N, "flag_c": "#FFD34D",
        "lantern": {"hex": "#FFE27A", "flat": True}, "ring_a": "#FFD34D", "ring_b": N,
    },
    "fiesta": {
        "hull": "#1FB5A8", "hull_band": "#E6397E", "hull_stripe": "#FFD23F", "rim": "#E6397E",
        "deck": "#EDC08A", "wood": "#9A6440",
        "sail_a": "#FF5FA2", "sail_b": "#FFD23F",
        "flag_a": "#E6397E", "flag_b": "#FFD23F", "flag_c": "#1FB5A8",
        "lantern": "#FF8A3D", "ring_a": "#FFFFFF", "ring_b": "#E6397E",
    },
}

# La pasajera no cambia con la skin del barco. Colores de muestra.
PASSENGER_COLORS = {
    "buoy_a": "#FF4F9A", "buoy_b": "#FFF3F7", "hat": "#FFD23F",
    "face": {"hex": "#1B1030", "flat": True},
}

# --- Dimensiones (unidades del mundo; el casco mide 2 de eslora) -------------
# Estaciones del casco de popa (t=0) a proa (t=1): manga media en cubierta y altura de cubierta.
HULL_STATIONS = [
    (0.00, 0.40, 0.47),
    (0.12, 0.47, 0.43),
    (0.30, 0.50, 0.41),
    (0.50, 0.50, 0.41),
    (0.68, 0.45, 0.43),
    (0.82, 0.35, 0.47),
    (0.92, 0.21, 0.52),
    (1.00, 0.00, 0.58),
]
HULL_HALF_LENGTH = 1.0
BOW_RAKE = 0.22               # la roda se inclina hacia proa
STERN_RAKE = 0.10             # el espejo de popa se inclina hacia dentro
BAND_Z = 0.07                 # franja de flotación
STRIPE_H = 0.11               # franja bajo la regala
RIM_W = 0.055                 # ancho de la regala
DECK_DEPTH = 0.07             # la cubierta queda hundida bajo la regala

MAST_X = 0.28
MAST_R = 0.036
MAST_TOP = 1.98
BOOM_Z = 1.08
BOOM_END_X = -0.80
SAIL_TACK_Z = 1.11
SAIL_HEAD_Z = 1.74
SAIL_CLEW_X = -0.76
SAIL_BELLY = 0.07
FLAG_Z0, FLAG_H, FLAG_W = 1.76, 0.20, 0.34

PASSENGER_SLOT = (-0.42, -0.23)   # x, y en cubierta: a estribor (-Y), fuera de la línea del mástil
PASSENGER_SCALE = 1.15

DIRECTIONS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]


def yaw_for(direction):
    """Giro del barco (grados, eje Z) para que la proa apunte a `direction` en pantalla.

    La proa del modelo mira a +X. S = proa hacia el espectador; cada paso de la
    lista gira 45° en sentido horario visto desde arriba (y en pantalla).
    """
    i = DIRECTIONS.index(direction)
    return -45.0 - 45.0 * i + rig.CAMERA_AZIMUTH_DEG - 45.0


# --- Color ------------------------------------------------------------------
def hex_srgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin4(rgb):
    return tuple(srgb_to_linear(c) for c in rgb) + (1.0,)


def mix(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def toon_tones(hexcol):
    """(sombra, medio, luz) en sRGB a partir del color base."""
    base = hex_srgb(hexcol)
    h, s, v = colorsys.rgb_to_hsv(*base)
    darker = colorsys.hsv_to_rgb(h, min(1.0, s * 1.05), v * 0.70)
    shadow = mix(darker, hex_srgb(SHADOW_TINT), 0.30)
    light = mix(base, hex_srgb(LIGHT_TINT), 0.28)
    return shadow, base, light


# --- Materiales -------------------------------------------------------------
def toon_material(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    diffuse = nt.nodes.new("ShaderNodeBsdfDiffuse")
    diffuse.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    to_rgb = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.name = "toon_ramp"
    ramp.color_ramp.interpolation = "CONSTANT"
    els = ramp.color_ramp.elements
    els[0].position = 0.0
    els[1].position = TOON_STEPS[0]
    els.new(TOON_STEPS[1])
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(diffuse.outputs["BSDF"], to_rgb.inputs["Shader"])
    nt.links.new(to_rgb.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], emit.inputs["Color"])
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


def set_material_color(mat, spec):
    if isinstance(spec, str):
        spec = {"hex": spec}
    if spec.get("flat"):
        tones = (hex_srgb(spec["hex"]),) * 3
    else:
        tones = toon_tones(spec["hex"])
    els = mat.node_tree.nodes["toon_ramp"].color_ramp.elements
    for el, tone in zip(els, tones):
        el.color = lin4(tone)


def outline_material():
    mat = bpy.data.materials.new("outline")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = lin4(hex_srgb(OUTLINE_COLOR))
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    mat.use_backface_culling = True
    return mat


class Materials:
    def __init__(self):
        roles = sorted(set(SKINS["base"]) | set(PASSENGER_COLORS))
        self.by_role = {r: toon_material(r) for r in roles}
        self.outline = outline_material()
        for role, spec in PASSENGER_COLORS.items():
            set_material_color(self.by_role[role], spec)

    def __getitem__(self, role):
        return self.by_role[role]

    def apply_skin(self, skin):
        for role, spec in SKINS[skin].items():
            set_material_color(self.by_role[role], spec)


# --- Utilidades de malla ----------------------------------------------------
def link_object(name, bm, mats, parent, outline_mat, outline=True, thickness=0.0):
    me = bpy.data.meshes.new(name)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # Sombreado suave con aristas vivas: los cortes del toon siguen la forma, no las caras.
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
    if outline:
        # Casco invertido: copia hacia fuera con normales giradas; sólo se ven
        # sus caras traseras, que dibujan la silueta de cada pieza.
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


def cylinder_between(bm, p0, p1, r, segments=8, r_top=None):
    p0, p1 = Vector(p0), Vector(p1)
    axis = p1 - p0
    rot = axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
    mat = Matrix.Translation((p0 + p1) / 2) @ rot
    ret = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments,
                                radius1=r, radius2=r if r_top is None else r_top,
                                depth=axis.length, matrix=mat)
    return ret["verts"]


def faces_of(verts):
    fs = set()
    for v in verts:
        fs.update(v.link_faces)
    return list(fs)


def station_at(x):
    """Manga media y altura de cubierta interpoladas en la coordenada x del barco."""
    t = (x + HULL_HALF_LENGTH) / (2 * HULL_HALF_LENGTH)
    for (t0, b0, z0), (t1, b1, z1) in zip(HULL_STATIONS, HULL_STATIONS[1:]):
        if t0 <= t <= t1:
            k = (t - t0) / (t1 - t0)
            return b0 + (b1 - b0) * k, z0 + (z1 - z0) * k
    raise ValueError(x)


# --- Piezas -----------------------------------------------------------------
HULL_ROLES = ["hull", "hull_band", "hull_stripe", "rim", "deck"]


def build_hull(mats, parent):
    bm = bmesh.new()
    idx = {r: i for i, r in enumerate(HULL_ROLES)}

    def vert(t, b, zd, width_f, z):
        f = z / zd
        x = -HULL_HALF_LENGTH + 2 * HULL_HALF_LENGTH * t
        x += BOW_RAKE * (f - 1.0) * t ** 6
        x += STERN_RAKE * (1.0 - f) * (1.0 - t) ** 6
        return x, width_f * b, z

    levels = lambda zd: [(0.64, 0.0), (0.80, BAND_Z), (0.95, zd - STRIPE_H), (1.0, zd)]
    rings = []
    for t, b, zd in HULL_STATIONS[:-1]:
        left = [bm.verts.new((x, -y, z)) for x, y, z in (vert(t, b, zd, wf, z) for wf, z in levels(zd))]
        right = [bm.verts.new((x, y, z)) for x, y, z in (vert(t, b, zd, wf, z) for wf, z in levels(zd))]
        rings.append(left + right[::-1])
    t, b, zd = HULL_STATIONS[-1]
    bow = [bm.verts.new(vert(t, 0.0, zd, 0.0, z)) for _, z in levels(zd)]

    seg_role = ["hull_band", "hull", "hull_stripe", "deck", "hull_stripe", "hull", "hull_band", "hull_band"]
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
    add((r0[0], r0[1], r0[6], r0[7]), "hull_band")
    add((r0[1], r0[2], r0[5], r0[6]), "hull")
    add((r0[2], r0[3], r0[4], r0[5]), "hull_stripe")

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    ret = bmesh.ops.inset_region(bm, faces=deck_faces, thickness=RIM_W, depth=0.0,
                                 use_even_offset=True, use_boundary=True)
    for f in ret["faces"]:
        f.material_index = idx["rim"]
    before = set(bm.faces)
    ext = bmesh.ops.extrude_face_region(bm, geom=deck_faces)
    new_verts = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    top = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMFace)]
    bmesh.ops.translate(bm, verts=new_verts, vec=(0.0, 0.0, -DECK_DEPTH))
    bmesh.ops.delete(bm, geom=deck_faces, context="FACES_ONLY")
    for f in bm.faces:
        if f not in before:
            f.material_index = idx["deck"] if f in top else idx["rim"]
    return link_object("hull", bm, [mats[r] for r in HULL_ROLES], parent, mats.outline)


def build_rigging(mats, parent):
    objs = []
    _, zd = station_at(MAST_X)
    bm = bmesh.new()
    cylinder_between(bm, (MAST_X, 0, zd - DECK_DEPTH - 0.02), (MAST_X, 0, MAST_TOP), MAST_R, 8, MAST_R * 0.75)
    cylinder_between(bm, (MAST_X - 0.02, 0, BOOM_Z), (BOOM_END_X, 0, BOOM_Z + 0.02), 0.028, 6)
    cylinder_between(bm, (0.86, 0, 0.53), (1.22, 0, 0.62), 0.024, 6)                   # bauprés
    cylinder_between(bm, (-1.06, 0, 0.46), (-0.72, 0, 0.53), 0.018, 6)                 # caña
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.045,
                               matrix=Matrix.Translation((MAST_X, 0, MAST_TOP + 0.03)))
    objs.append(link_object("spars", bm, [mats["wood"]], parent, mats.outline))

    bm = bmesh.new()                                                                   # timón
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((-1.0, 0, 0.24)) @
                          Matrix.Diagonal((0.08, 0.03, 0.36, 1.0)))
    objs.append(link_object("rudder", bm, [mats["wood"]], parent, mats.outline))

    bm = bmesh.new()                                                                   # farol de proa
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.062,
                               matrix=Matrix.Translation((1.22, 0, 0.70)))
    objs.append(link_object("lantern", bm, [mats["lantern"]], parent, mats.outline))

    # Vela: triángulo con barriga, en franjas horizontales alternas (sail_a / sail_b).
    bm = bmesh.new()
    rows, cols = 6, 5
    grid = []
    for i in range(rows):
        v = i / rows
        row = []
        for j in range(cols + 1):
            u = j / cols
            x = MAST_X - 0.05 + (SAIL_CLEW_X - MAST_X + 0.05) * (1 - v) * u
            z = SAIL_TACK_Z + (SAIL_HEAD_Z - SAIL_TACK_Z) * v - 0.03 * u * (1 - v)
            y = SAIL_BELLY * math.sin(math.pi * u) * (1 - v) ** 0.7
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    head = bm.verts.new((MAST_X - 0.05, 0, SAIL_HEAD_Z))
    for i in range(rows):
        for j in range(cols):
            if i + 1 < rows:
                f = bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
            else:
                f = bm.faces.new((grid[i][j], grid[i][j + 1], head))
            f.material_index = i % 2
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-4)
    objs.append(link_object("sail", bm, [mats["sail_a"], mats["sail_b"]], parent, mats.outline, thickness=0.02))

    # Bandera: tres franjas (flag_a, flag_b, flag_c), ondeando hacia popa.
    bm = bmesh.new()
    rows, cols = 3, 6
    grid = []
    for i in range(rows + 1):
        row = []
        for j in range(cols + 1):
            u = j / cols
            x = MAST_X - MAST_R - FLAG_W * u
            z = FLAG_Z0 + FLAG_H * (i / rows) - 0.02 * u
            y = 0.035 * math.sin(2 * math.pi * 1.1 * u) * u
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for i in range(rows):
        for j in range(cols):
            f = bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
            f.material_index = i
    objs.append(link_object("flag", bm, [mats["flag_a"], mats["flag_b"], mats["flag_c"]],
                            parent, mats.outline, thickness=0.015))

    # Salvavidas a babor (+Y): guiño a BOIA y marca asimétrica para leer la orientación.
    bm = bmesh.new()
    major, minor, nu, nv = 0.10, 0.032, 8, 6
    ring = [[None] * nv for _ in range(nu)]
    for i in range(nu):
        a = 2 * math.pi * i / nu
        for j in range(nv):
            b = 2 * math.pi * j / nv
            rr = major + minor * math.cos(b)
            ring[i][j] = bm.verts.new((rr * math.cos(a), minor * math.sin(b), rr * math.sin(a)))
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((ring[i][j], ring[(i + 1) % nu][j], ring[(i + 1) % nu][(j + 1) % nv], ring[i][(j + 1) % nv]))
            f.material_index = i % 2
    ring_x, ring_z = -0.50, 0.22
    b_ring, _ = station_at(ring_x)
    tilt = Matrix.Rotation(math.radians(-16), 4, "X")
    bmesh.ops.transform(bm, verts=bm.verts[:], matrix=Matrix.Translation((ring_x, 0.90 * b_ring + 0.035, ring_z)) @ tilt)
    objs.append(link_object("life_ring", bm, [mats["ring_a"], mats["ring_b"]], parent, mats.outline))
    return objs


def build_passenger(mats, slot):
    """Placeholder de la Boia Fiestera: cilindro con cara y gorro de fiesta."""
    R, segs = 0.16, 12
    zs = [0.0, 0.13, 0.29, 0.40]
    roles = ["buoy_a", "buoy_b", "hat", "face"]
    ri = {r: i for i, r in enumerate(roles)}
    bm = bmesh.new()
    rings = [[bm.verts.new((R * math.cos(2 * math.pi * k / segs), R * math.sin(2 * math.pi * k / segs), z))
              for k in range(segs)] for z in zs]
    band_role = ["buoy_a", "buoy_b", "buoy_a"]
    for i in range(len(zs) - 1):
        for k in range(segs):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % segs], rings[i + 1][(k + 1) % segs], rings[i + 1][k]))
            f.material_index = ri[band_role[i]]
    dome = bm.verts.new((0, 0, 0.45))
    for k in range(segs):
        f = bm.faces.new((rings[-1][k], rings[-1][(k + 1) % segs], dome))
        f.material_index = ri["buoy_a"]
    f = bm.faces.new(list(reversed(rings[0])))
    f.material_index = ri["buoy_a"]
    # Gorro de fiesta, algo ladeado.
    hat = bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.085, radius2=0.0, depth=0.17,
                                matrix=Matrix.Translation((0.0, 0.02, 0.52)) @ Matrix.Rotation(math.radians(12), 4, "X"))
    for f in faces_of(hat["verts"]):
        f.material_index = ri["hat"]
    body = link_object("passenger", bm, [mats[r] for r in roles], slot, mats.outline)

    # Cara mirando a proa (+X): dos ojos y una sonrisa de puntos. Sin contorno.
    bm = bmesh.new()
    for side in (-1, 1):
        a = side * 0.34
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.03,
                                   matrix=Matrix.Translation((R * math.cos(a), R * math.sin(a), 0.225)) @
                                   Matrix.Rotation(a, 4, "Z") @ Matrix.Diagonal((0.45, 1.0, 1.25, 1.0)))
    for k in range(7):
        phi = math.radians(-150 + 20 * k)
        y, z = 0.058 * math.cos(phi), 0.19 + 0.045 * math.sin(phi)
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.014,
                                   matrix=Matrix.Translation((math.sqrt(R * R - y * y) + 0.004, y, z)))
    face = link_object("passenger_face", bm, [mats["face"]], slot, mats.outline, outline=False)
    return [body, face]


def empty(name, parent, loc):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.08
    bpy.context.scene.collection.objects.link(e)
    e.parent = parent
    e.location = loc
    return e


def build_ship():
    """Construye el barco en la escena actual y devuelve un dict con las piezas."""
    mats = Materials()
    root = empty("ship_root", None, (0, 0, 0))         # gira con la dirección
    bob = empty("ship_bob", root, (0, 0, 0))            # balanceo; no mueve el pivote
    pivot = empty("pivot", root, (0, 0, 0))             # punto de agua bajo el centro del casco
    hull = build_hull(mats, bob)
    rigging = build_rigging(mats, bob)
    _, zd = station_at(PASSENGER_SLOT[0])
    slot = empty("slot_passenger", bob, (PASSENGER_SLOT[0], PASSENGER_SLOT[1], zd - DECK_DEPTH))
    slot.scale = (PASSENGER_SCALE,) * 3
    passenger = build_passenger(mats, slot)
    anchors = {
        "pivot": pivot,
        "mast_top": empty("mast_top", bob, (MAST_X, 0, MAST_TOP + 0.075)),
        "slot_passenger": slot,
        "wake_origin": empty("wake_origin", bob, (-HULL_HALF_LENGTH + STERN_RAKE, 0, 0)),
        "bow": empty("bow", bob, (HULL_HALF_LENGTH - BOW_RAKE, 0, 0)),
    }
    return {"root": root, "bob": bob, "materials": mats, "hull": hull, "rigging": rigging,
            "passenger": passenger, "anchors": anchors}


def set_passenger(ship, visible):
    for obj in ship["passenger"]:
        obj.hide_render = not visible
        obj.hide_viewport = not visible


def set_direction(ship, direction):
    ship["root"].rotation_euler = (0.0, 0.0, math.radians(yaw_for(direction)))


def set_bob(ship, frame, frames):
    """Balanceo periódico: `frame` en [0, frames) cierra el loop sin salto."""
    if frame is None:
        ship["bob"].location = (0, 0, 0)
        ship["bob"].rotation_euler = (0, 0, 0)
        return
    ph = 2 * math.pi * frame / frames
    ship["bob"].location = (0.0, 0.0, 0.022 * math.sin(ph))
    ship["bob"].rotation_euler = (math.radians(2.6) * math.sin(ph + math.pi / 3),
                                  math.radians(2.0) * math.sin(ph + math.pi / 2), 0.0)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--skin", default="base", choices=sorted(SKINS))
    ap.add_argument("--direction", default="S", choices=DIRECTIONS)
    ap.add_argument("--no-passenger", action="store_true")
    ap.add_argument("--save", help="guardar .blend (p. ej. tools/blender/out/ship.blend)")
    ap.add_argument("--render", help="renderizar un PNG a esta ruta")
    a = ap.parse_args(argv)
    scene = rig.reset_scene()
    rig.setup_render(scene)
    rig.add_camera(scene)
    rig.add_sun(scene)
    ship = build_ship()
    ship["materials"].apply_skin(a.skin)
    set_passenger(ship, not a.no_passenger)
    set_direction(ship, a.direction)
    if a.save:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.save))
    if a.render:
        scene.render.filepath = os.path.abspath(a.render)
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
