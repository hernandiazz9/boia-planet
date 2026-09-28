"""Estilo 08, "Pixel-art / Retro": remolcador BOIA como sprite de 64 px de arte.

Prueba de estilo, no diseño final. El barco se modela en 3D con sombreado toon
de tres tonos, pero cada material no pinta un color sino un DATO: el índice de
paleta (canal R), el índice del objeto (G) y la profundidad de vista (B). Se
renderiza a 4x la resolución de arte, con 1 muestra y sin filtro (cada píxel es
una muestra puntual), a EXR de 32 bits. Luego, con numpy:

1. Baja a la resolución de arte por bloques de 4x4: el bloque es opaco si al
   menos 5 de 16 muestras lo son; gana la pieza más cercana que cubra 4 de 16
   (así el mástil o un farol de 1 px no desaparecen) y el color es la moda de la
   paleta dentro de esa pieza.
2. Línea interior de 1 px de arte donde una pieza tapa a otra (se oscurece el
   píxel de la pieza de atrás) y contorno exterior de 1 px sobre el alfa.
3. Escala x4 con vecino más cercano y escribe PNG RGBA de 8 bits.

Sprites: arte de 64 px -> 256x256. Hero: arte de 128 px -> 512x512, misma cámara.

    Blender -b -P tools/blender/styles/08_pixel_art.py -- --out tools/blender/out/styles/08_pixel_art
    (opcional) --sheet docs/informes/img/01-estilo-08-pixel-art.png
               --hero-sheet docs/informes/img/01-estilo-08-pixel-art-hero.png
"""
import argparse
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

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import rig  # noqa: E402
from ship import DIRECTIONS, yaw_for  # noqa: E402

# --- Paleta fija de 16 colores ----------------------------------------------
PALETTE = [
    "#1A1C2C",  # 0 contorno
    "#3A3F58",  # 1 hierro / goma
    "#7A1E2E",  # 2 rojo sombra
    "#C8323C",  # 3 rojo
    "#EE5B4E",  # 4 rojo luz
    "#7F8BA3",  # 5 blanco sombra
    "#C2CCD8",  # 6 blanco medio
    "#F4F4F0",  # 7 blanco luz
    "#4E2E22",  # 8 madera sombra
    "#8A5534",  # 9 madera
    "#C68A4F",  # 10 madera luz
    "#E3B97F",  # 11 cubierta
    "#E8832E",  # 12 farol sombra
    "#FFD94A",  # 13 farol
    "#243D6B",  # 14 cristal oscuro
    "#4F8FCB",  # 15 cristal brillo
]
OUTLINE = 0
INNER_LINE = 0

# Material -> índices de paleta (sombra, medio, luz). Umbrales de luz como ship.py.
TOON_STEPS = (0.12, 0.66)
MATS = {
    "red": (2, 3, 4),
    "white": (5, 6, 7),
    "keel": (2, 2, 2),
    "rubber": (0, 1, 1),
    "rim": (6, 7, 7),
    "deck": (9, 11, 11),
    "roof": (5, 6, 7),
    "glass": (14, 14, 15),
    "wood": (8, 9, 10),
    "crate": (8, 9, 10),
    "iron": (0, 1, 1),
    "lamp": (13, 13, 13),
    "flag_red": (2, 3, 4),
    "flag_white": (7, 7, 7),
    "ring_red": (2, 3, 3),
    "ring_white": (6, 7, 7),
}

ART = 64                  # píxeles de arte del sprite (x4 = 256)
HERO_ART = 128            # hero: 128 de arte (x4 = 512)
SS = 4                    # muestras por lado de cada píxel de arte
MIN_ALPHA = 5             # de 16 muestras: bloque opaco
MIN_FRONT = 4             # de 16 muestras: una pieza de delante gana el bloque
LINE_EPS = 0.04           # unidades: salto de profundidad que dibuja línea interior
DEPTH_OFFSET = 29.0       # la cámara está a ~30 unidades: se resta para no perder precisión

# --- Dimensiones del remolcador ---------------------------------------------
# (t de popa=0 a proa=1, media manga en cubierta, altura de cubierta)
HULL_STATIONS = [
    (0.00, 0.36, 0.45),
    (0.07, 0.49, 0.43),
    (0.25, 0.56, 0.42),
    (0.50, 0.56, 0.43),
    (0.70, 0.51, 0.47),
    (0.84, 0.39, 0.53),
    (0.94, 0.21, 0.60),
    (1.00, 0.00, 0.65),
]
HALF_L = 0.98
BOW_RAKE = 0.20
STERN_RAKE = 0.08
WHITE_H = 0.10            # franja blanca bajo la regala
KEEL_Z = 0.05             # franja oscura de flotación
RIM_W = 0.05
DECK_DEPTH = 0.07
FENDER_R = 0.035

CAB_X0, CAB_X1, CAB_Y, CAB_TOP = -0.52, 0.14, 0.30, 0.90
ROOF_T, ROOF_OVER = 0.06, 0.04
FUNNEL_X, FUNNEL_R, FUNNEL_TOP = -0.34, 0.10, 1.34
MAST_X, MAST_R, MAST_TOP = 0.02, 0.032, 1.84
FLAG_Z0, FLAG_H, FLAG_W = 1.48, 0.32, 0.50


# --- Utilidades -------------------------------------------------------------
def station_at(x):
    t = (x + HALF_L) / (2 * HALF_L)
    t = min(max(t, 0.0), 1.0)
    for (t0, b0, z0), (t1, b1, z1) in zip(HULL_STATIONS, HULL_STATIONS[1:]):
        if t0 <= t <= t1:
            k = (t - t0) / (t1 - t0)
            return b0 + (b1 - b0) * k, z0 + (z1 - z0) * k
    raise ValueError(x)


def deck_z(x):
    return station_at(x)[1] - DECK_DEPTH


def toon_material(name, tones):
    """Toon que emite datos: R = índice de paleta / 16, G = índice de objeto, B = profundidad."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    diffuse = nt.nodes.new("ShaderNodeBsdfDiffuse")
    diffuse.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    to_rgb = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    els = ramp.color_ramp.elements
    els[0].position = 0.0
    els[1].position = TOON_STEPS[0]
    els.new(TOON_STEPS[1])
    for el, idx in zip(els, tones):
        el.color = (idx / 16.0, 0.0, 0.0, 1.0)
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    info = nt.nodes.new("ShaderNodeObjectInfo")
    cam = nt.nodes.new("ShaderNodeCameraData")
    near = nt.nodes.new("ShaderNodeMath")          # el búfer es de media precisión: restar la distancia base
    near.operation = "SUBTRACT"
    near.inputs[1].default_value = DEPTH_OFFSET
    comb = nt.nodes.new("ShaderNodeCombineColor")
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(diffuse.outputs["BSDF"], to_rgb.inputs["Shader"])
    nt.links.new(to_rgb.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Red"], comb.inputs["Red"])
    nt.links.new(info.outputs["Object Index"], comb.inputs["Green"])
    nt.links.new(cam.outputs["View Z Depth"], near.inputs[0])
    nt.links.new(near.outputs["Value"], comb.inputs["Blue"])
    nt.links.new(comb.outputs["Color"], emit.inputs["Color"])
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


class Parts:
    """Cada objeto lleva su pass_index: el postproceso traza líneas entre piezas."""

    def __init__(self, parent):
        self.parent = parent
        self.mats = {k: toon_material(k, v) for k, v in MATS.items()}
        self.next_id = 1

    def add(self, name, bm, mat_names, sharp_deg=38):
        me = bpy.data.meshes.new(name)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        for f in bm.faces:
            f.smooth = True
        sharp = math.radians(sharp_deg)
        for e in bm.edges:
            e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(0.0) < sharp
        bm.to_mesh(me)
        bm.free()
        for m in mat_names:
            me.materials.append(self.mats[m])
        obj = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(obj)
        obj.parent = self.parent
        obj.pass_index = self.next_id
        self.next_id += 1
        return obj


def box(bm, lo, hi, mat_index=0):
    lo, hi = Vector(lo), Vector(hi)
    ret = bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((lo + hi) / 2) @
                                Matrix.Diagonal((*(hi - lo), 1.0)))
    for f in faces_of(ret["verts"]):
        f.material_index = mat_index
    return ret["verts"]


def cylinder(bm, p0, p1, r, segments=10, mat_index=0, r_top=None):
    p0, p1 = Vector(p0), Vector(p1)
    axis = p1 - p0
    rot = axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
    ret = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments,
                                radius1=r, radius2=r if r_top is None else r_top,
                                depth=axis.length, matrix=Matrix.Translation((p0 + p1) / 2) @ rot)
    for f in faces_of(ret["verts"]):
        f.material_index = mat_index
    return ret["verts"]


def faces_of(verts):
    fs = set()
    for v in verts:
        fs.update(v.link_faces)
    return list(fs)


def torus(bm, center, axis, major, minor, nu=12, nv=6, mats=(0, 1)):
    ring = [[None] * nv for _ in range(nu)]
    rot = Vector(axis).to_track_quat("Z", "Y").to_matrix().to_4x4()
    m = Matrix.Translation(center) @ rot
    for i in range(nu):
        a = 2 * math.pi * (i + 0.5) / nu
        for j in range(nv):
            b = 2 * math.pi * j / nv
            rr = major + minor * math.cos(b)
            ring[i][j] = bm.verts.new(m @ Vector((rr * math.cos(a), rr * math.sin(a), minor * math.sin(b))))
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((ring[i][j], ring[(i + 1) % nu][j], ring[(i + 1) % nu][(j + 1) % nv],
                              ring[i][(j + 1) % nv]))
            f.material_index = mats[(i * len(mats)) // nu % len(mats)] if len(mats) > 2 else mats[(i // (nu // 4)) % 2]


# --- Piezas -----------------------------------------------------------------
def hull_vert(t, b, zd, wf, z):
    f = z / zd
    x = -HALF_L + 2 * HALF_L * t
    x += BOW_RAKE * (f - 1.0) * t ** 6
    x += STERN_RAKE * (1.0 - f) * (1.0 - t) ** 6
    return x, wf * b, z


def hull_levels(zd):
    return [(0.88, 0.0), (0.93, KEEL_Z), (1.0, zd - WHITE_H), (1.0, zd)]


def build_hull(parts):
    roles = ["red", "keel", "white", "rim", "deck"]
    idx = {r: i for i, r in enumerate(roles)}
    bm = bmesh.new()
    rings = []
    for t, b, zd in HULL_STATIONS[:-1]:
        pts = [hull_vert(t, b, zd, wf, z) for wf, z in hull_levels(zd)]
        left = [bm.verts.new((x, -y, z)) for x, y, z in pts]
        right = [bm.verts.new((x, y, z)) for x, y, z in pts]
        rings.append(left + right[::-1])
    t, b, zd = HULL_STATIONS[-1]
    bow = [bm.verts.new(hull_vert(t, 0.0, zd, 0.0, z)) for _, z in hull_levels(zd)]
    seg_role = ["keel", "red", "white", "deck", "white", "red", "keel", "keel"]
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
    add((r0[0], r0[1], r0[6], r0[7]), "keel")
    add((r0[1], r0[2], r0[5], r0[6]), "red")
    add((r0[2], r0[3], r0[4], r0[5]), "white")
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
    parts.add("hull", bm, roles)


def build_fender(parts):
    """Defensa de goma que rodea el casco bajo la franja blanca: el guiño a remolcador."""
    path = []
    for t, b, zd in HULL_STATIONS[:-1]:
        path.append(hull_vert(t, b, zd, 1.0, zd - WHITE_H))
    t, b, zd = HULL_STATIONS[-1]
    bowp = hull_vert(t, 0.0, zd, 0.0, zd - WHITE_H)
    loop = [Vector((x, -y, z)) for x, y, z in path] + [Vector(bowp)] + \
           [Vector((x, y, z)) for x, y, z in reversed(path)]
    center = sum(loop, Vector()) / len(loop)
    n = len(loop)
    bm = bmesh.new()
    nv = 6
    secs = []
    for i, p in enumerate(loop):
        d = loop[(i + 1) % n] - loop[i - 1]
        d.z = 0
        out = Vector((d.y, -d.x, 0)).normalized()
        if out.dot(Vector((p.x - center.x, p.y - center.y, 0))) < 0:
            out = -out
        c = p + out * FENDER_R * 0.6
        secs.append([bm.verts.new(c + out * FENDER_R * math.cos(2 * math.pi * j / nv) +
                                  Vector((0, 0, FENDER_R * math.sin(2 * math.pi * j / nv))))
                     for j in range(nv)])
    for i in range(n):
        a, b = secs[i], secs[(i + 1) % n]
        for j in range(nv):
            bm.faces.new((a[j], a[(j + 1) % nv], b[(j + 1) % nv], b[j]))
    parts.add("fender", bm, ["rubber"], sharp_deg=80)


def build_cabin(parts):
    z0 = deck_z(CAB_X0) - 0.02
    bm = bmesh.new()
    box(bm, (CAB_X0, -CAB_Y, z0), (CAB_X1, CAB_Y, CAB_TOP), 0)
    e = 0.012
    # Ventanas de proa (+X), dos, y una larga a cada costado.
    for yc in (-0.13, 0.13):
        box(bm, (CAB_X1 - 0.01, yc - 0.085, 0.64), (CAB_X1 + e, yc + 0.085, 0.82), 1)
    for s in (-1, 1):
        box(bm, (-0.20, s * CAB_Y - 0.01, 0.64), (0.06, s * CAB_Y + 0.01, 0.82), 1)
    # Ventanita de popa.
    box(bm, (CAB_X0 - e, -0.10, 0.64), (CAB_X0 + 0.01, 0.10, 0.80), 1)
    parts.add("cabin", bm, ["white", "glass"], sharp_deg=30)

    bm = bmesh.new()
    box(bm, (CAB_X0 - ROOF_OVER, -CAB_Y - ROOF_OVER, CAB_TOP),
        (CAB_X1 + ROOF_OVER, CAB_Y + ROOF_OVER, CAB_TOP + ROOF_T), 0)
    parts.add("roof", bm, ["roof"], sharp_deg=30)


def build_funnel(parts):
    z0 = CAB_TOP + ROOF_T - 0.01
    lean = 0.05
    bm = bmesh.new()
    zs = [z0, 1.12, 1.19, 1.28, FUNNEL_TOP]
    for (za, zb), mi in zip(zip(zs, zs[1:]), (0, 1, 0, 2)):
        ka, kb = (za - z0) / (FUNNEL_TOP - z0), (zb - z0) / (FUNNEL_TOP - z0)
        cylinder(bm, (FUNNEL_X - lean * ka, 0, za), (FUNNEL_X - lean * kb, 0, zb), FUNNEL_R, 12, mi)
    parts.add("funnel", bm, ["red", "white", "iron"])


def build_mast_and_flag(parts):
    z0 = CAB_TOP + ROOF_T - 0.01
    bm = bmesh.new()
    cylinder(bm, (MAST_X, 0, z0), (MAST_X, 0, MAST_TOP), MAST_R, 8, 0, r_top=MAST_R * 0.8)
    cylinder(bm, (MAST_X, -0.17, 1.34), (MAST_X, 0.17, 1.34), 0.022, 6, 0)          # verga
    parts.add("mast", bm, ["wood"])

    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.045,
                               matrix=Matrix.Translation((MAST_X, 0, MAST_TOP + 0.02)))
    parts.add("mast_lamp", bm, ["lamp"])

    # Bandera roja con "≈" blanco, ondeando hacia popa (-X).
    bm = bmesh.new()
    rows, cols = 16, 20
    grid = []
    for i in range(rows + 1):
        row = []
        for j in range(cols + 1):
            u, v = j / cols, i / rows
            x = MAST_X - MAST_R - FLAG_W * u
            z = FLAG_Z0 + FLAG_H * v - 0.03 * u
            y = 0.07 * math.sin(2 * math.pi * 0.9 * u) * u
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for i in range(rows):
        for j in range(cols):
            f = bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
            u, v = (j + 0.5) / cols, (i + 0.5) / rows
            white = 0.16 < u < 0.88 and any(
                abs(v - (c + 0.11 * math.sin(2 * math.pi * 1.4 * (u - 0.16)))) < 0.08 for c in (0.31, 0.69))
            f.material_index = 1 if white else 0
    mod_bm = bm
    parts_obj = parts.add("flag", mod_bm, ["flag_red", "flag_white"], sharp_deg=60)
    sol = parts_obj.modifiers.new("thickness", "SOLIDIFY")
    sol.thickness = 0.02
    sol.offset = 0.0


def build_life_rings(parts):
    for s in (-1, 1):
        bm = bmesh.new()
        torus(bm, (-0.36, s * (CAB_Y + 0.03), 0.62), (0, s, 0), 0.105, 0.035, nu=16, nv=6,
              mats=(0, 1))
        parts.add("ring_%s" % ("port" if s > 0 else "stbd"), bm, ["ring_red", "ring_white"], sharp_deg=80)


def build_cargo(parts):
    # Cajas en la cubierta de proa.
    for (x, y, s, rz) in [(0.44, 0.16, 0.19, 0), (0.46, -0.15, 0.19, 0), (0.68, 0.0, 0.15, 0)]:
        z = deck_z(x)
        bm = bmesh.new()
        box(bm, (-s / 2, -s / 2, 0), (s / 2, s / 2, s), 0)
        bmesh.ops.transform(bm, verts=bm.verts[:], matrix=Matrix.Translation((x, y, z)) @
                            Matrix.Rotation(math.radians(rz), 4, "Z"))
        parts.add("crate", bm, ["crate"], sharp_deg=30)
    # Barriles a popa.
    for (x, y) in [(-0.70, 0.20), (-0.72, -0.18), (-0.84, 0.02)]:
        z = deck_z(x)
        bm = bmesh.new()
        r, h = 0.075, 0.19
        cylinder(bm, (x, y, z), (x, y, z + h), r, 10, 0)
        cylinder(bm, (x, y, z + h * 0.42), (x, y, z + h * 0.58), r + 0.006, 10, 1)
        parts.add("barrel", bm, ["wood", "iron"], sharp_deg=50)


def build_lanterns(parts):
    # Farol de proa sobre un poste y dos faroles en las esquinas del techo.
    bx = 0.80
    bm = bmesh.new()
    cylinder(bm, (bx, 0, deck_z(bx)), (bx, 0, 0.77), 0.018, 6, 0)
    parts.add("bow_post", bm, ["iron"])
    for (x, y, z) in [(bx, 0, 0.80), (CAB_X1 + 0.02, 0.27, CAB_TOP + ROOF_T + 0.035),
                      (CAB_X1 + 0.02, -0.27, CAB_TOP + ROOF_T + 0.035)]:
        bm = bmesh.new()
        box(bm, (x - 0.035, y - 0.035, z - 0.04), (x + 0.035, y + 0.035, z + 0.04), 0)
        parts.add("lantern", bm, ["lamp"])


def build_ship():
    root = bpy.data.objects.new("ship_root", None)
    bpy.context.scene.collection.objects.link(root)
    parts = Parts(root)
    build_hull(parts)
    build_fender(parts)
    build_cabin(parts)
    build_funnel(parts)
    build_mast_and_flag(parts)
    build_life_rings(parts)
    build_cargo(parts)
    build_lanterns(parts)
    return root


# --- Render de datos y postproceso ------------------------------------------
def hex_rgb8(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


PAL8 = np.array([hex_rgb8(h) for h in PALETTE], dtype=np.uint8)


def render_data(scene, path, res):
    scene.render.resolution_x = res
    scene.render.resolution_y = res
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    buf = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(buf)
    bpy.data.images.remove(img)
    return buf.reshape(h, w, 4)[::-1]          # arriba primero


def pixelate(data, art):
    """Muestras (art*SS)^2 -> imagen de arte (art x art) RGBA uint8."""
    s = SS
    alpha = data[..., 3] > 0.5
    pal = np.clip(np.rint(data[..., 0] * 16.0), 0, 15).astype(np.int16)
    oid = np.rint(data[..., 1]).astype(np.int16)
    dep = data[..., 2]

    def blocks(a):
        return a.reshape(art, s, art, s).transpose(0, 2, 1, 3).reshape(art, art, s * s)

    alpha, pal, oid, dep = blocks(alpha), blocks(pal), blocks(oid), blocks(dep)
    oid = np.where(alpha, oid, -1)
    n_opaque = alpha.sum(-1)
    ids = [int(k) for k in np.unique(oid) if k >= 0]
    counts = np.stack([(oid == k).sum(-1) for k in ids], -1)                       # (a,a,K)
    dmin = np.stack([np.where(oid == k, dep, np.inf).min(-1) for k in ids], -1)
    # La pieza más cercana con cobertura suficiente; si ninguna llega, la mayoritaria.
    front_ok = counts >= MIN_FRONT
    pick_front = np.argmin(np.where(front_ok, dmin, np.inf), -1)
    pick_major = np.argmax(counts, -1)
    pick = np.where(front_ok.any(-1), pick_front, pick_major)
    id_arr = np.array(ids, dtype=np.int16)
    chosen = id_arr[pick]
    chosen_d = np.take_along_axis(dmin, pick[..., None], -1)[..., 0]
    in_chosen = oid == chosen[..., None]
    pcount = np.stack([((pal == c) & in_chosen).sum(-1) for c in range(16)], -1)
    color = np.argmax(pcount, -1)
    opaque = n_opaque >= MIN_ALPHA

    color = np.where(opaque, color, -1)
    chosen = np.where(opaque, chosen, -1)
    chosen_d = np.where(opaque, chosen_d, np.inf)

    # Línea interior: el píxel de la pieza de atrás junto a una pieza que la tapa.
    line = np.zeros_like(opaque)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        q_id = np.roll(chosen, (dy, dx), (0, 1))
        q_d = np.roll(chosen_d, (dy, dx), (0, 1))
        line |= opaque & (q_id >= 0) & (q_id != chosen) & (q_d < chosen_d - LINE_EPS)
    color = np.where(line, INNER_LINE, color)

    # Contorno exterior de 1 px sobre el alfa.
    grow = np.zeros_like(opaque)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        grow |= np.roll(opaque, (dy, dx), (0, 1))
    color = np.where(~opaque & grow, OUTLINE, color)

    rgba = np.zeros((art, art, 4), dtype=np.uint8)
    solid = color >= 0
    rgba[solid, :3] = PAL8[color[solid]]
    rgba[solid, 3] = 255
    return rgba


def write_png(path, rgba):
    h, w, _ = rgba.shape
    raw = b"".join(b"\x00" + rgba[y].tobytes() for y in range(h))

    def chunk(tag, body):
        return struct.pack(">I", len(body)) + tag + body + struct.pack(">I", zlib.crc32(tag + body) & 0xFFFFFFFF)

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) +
                chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def upscale(rgba, k):
    return np.repeat(np.repeat(rgba, k, 0), k, 1)


def water_sheet(ffmpeg, inputs, out, w, h):
    args = [ffmpeg, "-y", "-loglevel", "error"]
    for p in inputs:
        args += ["-i", p]
    n = len(inputs)
    args += ["-f", "lavfi", "-i", "color=c=0x2E86B5:s=%dx%d" % (w, h)]
    if n > 1:
        fc = "".join("[%d]" % i for i in range(n)) + "hstack=inputs=%d[s];[%d][s]overlay=format=auto" % (n, n)
    else:
        fc = "[1][0]overlay=format=auto"
    args += ["-filter_complex", fc, "-frames:v", "1", out]
    subprocess.run(args, check=True)


def main():
    t_start = time.time()
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="tools/blender/out/styles/08_pixel_art")
    ap.add_argument("--sheet", help="hoja 2048x256 con las 8 direcciones sobre agua")
    ap.add_argument("--hero-sheet", help="hero 512x512 sobre agua")
    ap.add_argument("--art", action="store_true", help="guardar también los PNG de arte a 1x")
    a = ap.parse_args(argv)
    out = os.path.abspath(a.out)
    raw_dir = os.path.join(out, "_raw")
    os.makedirs(raw_dir, exist_ok=True)

    scene = rig.reset_scene()
    rig.setup_render(scene)
    rig.add_camera(scene)
    rig.add_sun(scene)
    # Muestra puntual: 1 muestra, sin filtro. Datos crudos a EXR de 32 bits.
    scene.eevee.taa_render_samples = 1
    scene.render.filter_size = 0.0
    scene.render.image_settings.file_format = "OPEN_EXR"
    scene.render.image_settings.color_depth = "32"
    scene.render.image_settings.exr_codec = "ZIP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    root = build_ship()

    t_build = time.time()
    jobs = [(d, ART, "%s.png" % d) for d in DIRECTIONS] + [("SE", HERO_ART, "hero_SE.png")]
    per = []
    for d, art, name in jobs:
        t0 = time.time()
        root.rotation_euler = (0.0, 0.0, math.radians(yaw_for(d)))
        data = render_data(scene, os.path.join(raw_dir, name.replace(".png", ".exr")), art * SS)
        px = pixelate(data, art)
        if a.art:
            write_png(os.path.join(raw_dir, name.replace(".png", "_1x.png")), px)
        write_png(os.path.join(out, name), upscale(px, SS))
        per.append(time.time() - t0)
        print("[08] %-12s %.2fs" % (name, per[-1]))

    ffmpeg = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
    if a.sheet:
        water_sheet(ffmpeg, [os.path.join(out, "%s.png" % d) for d in DIRECTIONS], os.path.abspath(a.sheet), 2048, 256)
    if a.hero_sheet:
        water_sheet(ffmpeg, [os.path.join(out, "hero_SE.png")], os.path.abspath(a.hero_sheet), 512, 512)
    print("[08] construcción %.2fs, render+post %.2fs (%.2fs/imagen), total %.2fs" %
          (t_build - t_start, sum(per), sum(per) / len(per), time.time() - t_start))


if __name__ == "__main__":
    main()
