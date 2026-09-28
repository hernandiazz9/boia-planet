"""Estilo 05, "Arcilla / Maqueta": barquito de plastilina en miniatura.

Prueba de estilo, no diseño final. Formas blandas y rechonchas (superelipsoides,
tornos y "churros" de arcilla), material de arcilla mate con algo de
subsuperficie y un bump de ruido como huellas de dedos, luz suave con sombras y
oclusión ambiental, AgX.

    Blender -b -P tools/blender/styles/05_arcilla_maqueta.py -- --out tools/blender/out/styles/05_arcilla_maqueta

Salida: <out>/<DIR>.png (256x256, 8 direcciones) y <out>/hero_SE.png (512x512).
Convenciones de ship.py: proa a +X, flotación en z=0, todo cuelga de un empty
raíz que gira con yaw_for(d). Cámara y luz de rig.py, fijas.
"""
import argparse
import math
import os
import sys
import time

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))          # tools/blender
import rig   # noqa: E402
import ship  # noqa: E402  (sólo DIRECTIONS y yaw_for)

# --- Paleta (sRGB) ------------------------------------------------------------
C = {
    "hull": "#4FAA66", "band": "#F26A1B", "roll": "#F47B2A", "deck": "#E2B27C",
    "wall": "#F6E4C4", "glass": "#8FD3EA", "frame": "#3E8A58", "door": "#A0603A",
    "thatch": "#E9B24C", "leaf": "#86BE36", "wood": "#B8763F", "wood_dark": "#7C4B2B",
    "barrel": "#BC7A40", "iron": "#4B3B3E", "red": "#E43B30", "white": "#FFF7EC",
    "flag": "#F26A1B", "chimney": "#E2583C", "dark": "#2D3550",
    "bulb": "#FFD27E", "glow": "#FFB347", "wire": "#3A2E2E",
}

# --- Dimensiones (unidades del mundo) -----------------------------------------
HULL_A_BOW, HULL_A_STERN, HULL_B = 1.0, 0.93, 0.58   # semiejes en planta (máximo)
HULL_P = 2.4                                         # superelipse de la planta
HULL_PINCH = 0.30                                    # la proa se afina
HULL_ZC, HULL_C, HULL_Q = 0.12, 0.44, 2.5            # barriga: ancho máximo sobre la flotación
DECK_Z0 = 0.42
BOW_RISE, STERN_RISE = 0.26, 0.06
BAND_Z = 0.11                                        # franja naranja de flotación
ROLL_R = 0.052                                       # "churro" de la regala

CAB_X, CAB_A, CAB_B, CAB_C = -0.15, 0.26, 0.24, 0.27
ROOF_SX = 0.95
ROOF_K = 0.9                 # escala del techo de paja (radio del alero ~0,42)
MAST_X, MAST_R, MAST_TOP = 0.37, 0.034, 1.74
FLAG_Z0, FLAG_H, FLAG_W, FLAG_T = 1.43, 0.27, 0.40, 0.03
POST_X = 0.70
STERN_POST_X = -0.70

SUN_ANGLE_DEG = 14.0          # sol grande: sombras blandas de maqueta
WORLD_COLOR = (0.78, 0.85, 1.0)
WORLD_STRENGTH = 0.5
SUN_STRENGTH = 4.2
LOOK = "AgX - Punchy"
SAMPLES = 64


# --- Color y materiales -------------------------------------------------------
def hex_lin(h, a=1.0):
    h = h.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out) + (a,)


def scaled(col, k):
    return tuple(min(1.0, c * k) for c in col[:3]) + (1.0,)


def clay(name, hexcol, rough=0.78, sss=0.12, bump=0.3, scale=16.0, sheen=0.15,
         emit=0.0, pattern=None, pattern_k=30.0, pattern_bump=0.0, vary=0.10):
    """Arcilla mate: Principled con subsuperficie, bump de ruido (huellas) y
    variación leve de tono. `pattern`: 'radial' (paja), 'y' (tablones)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    L = nt.links.new
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    col = hex_lin(hexcol)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Subsurface Weight"].default_value = sss
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.45, 0.25)
    bsdf.inputs["Subsurface Scale"].default_value = 0.04
    bsdf.inputs["Specular IOR Level"].default_value = 0.32
    bsdf.inputs["Sheen Weight"].default_value = sheen
    bsdf.inputs["Sheen Roughness"].default_value = 0.6
    if emit:
        bsdf.inputs["Emission Color"].default_value = col
        bsdf.inputs["Emission Strength"].default_value = emit
    L(bsdf.outputs["BSDF"], out.inputs["Surface"])

    tc = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 3.0
    noise.inputs["Roughness"].default_value = 0.55
    L(tc.outputs["Object"], noise.inputs["Vector"])
    height = noise.outputs["Fac"]

    ramp = nt.nodes.new("ShaderNodeValToRGB")          # tono: un poco más oscuro en los "valles"
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[0].color = scaled(col, 1.0 - vary)
    ramp.color_ramp.elements[1].position = 0.7
    ramp.color_ramp.elements[1].color = scaled(col, 1.0 + vary * 0.5)

    if pattern:
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        L(tc.outputs["Object"], sep.inputs["Vector"])
        m = nt.nodes.new("ShaderNodeMath")
        if pattern == "radial":
            m.operation = "ARCTAN2"
            L(sep.outputs["Y"], m.inputs[0])
            L(sep.outputs["X"], m.inputs[1])
        else:
            m.operation = "MULTIPLY"
            L(sep.outputs["Y"], m.inputs[0])
            m.inputs[1].default_value = 1.0
        k = nt.nodes.new("ShaderNodeMath")
        k.operation = "MULTIPLY"
        k.inputs[1].default_value = pattern_k
        L(m.outputs[0], k.inputs[0])
        s = nt.nodes.new("ShaderNodeMath")
        s.operation = "SINE"
        L(k.outputs[0], s.inputs[0])
        mad = nt.nodes.new("ShaderNodeMath")                  # 0..1
        mad.operation = "MULTIPLY_ADD"
        mad.inputs[1].default_value = 0.5
        mad.inputs[2].default_value = 0.5
        L(s.outputs[0], mad.inputs[0])
        mix = nt.nodes.new("ShaderNodeMath")                  # rayas + algo de ruido
        mix.operation = "MULTIPLY_ADD"
        mix.inputs[1].default_value = 0.75
        L(mad.outputs[0], mix.inputs[0])
        n2 = nt.nodes.new("ShaderNodeMath")
        n2.operation = "MULTIPLY"
        n2.inputs[1].default_value = 0.35
        L(noise.outputs["Fac"], n2.inputs[0])
        L(n2.outputs[0], mix.inputs[2])
        height = mix.outputs[0]
        bump = pattern_bump or bump

    L(height, ramp.inputs["Fac"])
    L(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    bn = nt.nodes.new("ShaderNodeBump")
    bn.inputs["Strength"].default_value = bump
    bn.inputs["Distance"].default_value = 0.02
    L(height, bn.inputs["Height"])
    L(bn.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def glow(name, hexcol, strength):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = hex_lin(hexcol)
    e.inputs["Strength"].default_value = strength
    o = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(e.outputs["Emission"], o.inputs["Surface"])
    return mat


def build_materials():
    M = {}
    for k in ("hull", "band", "roll", "wall", "frame", "door", "leaf", "wood", "wood_dark",
              "barrel", "iron", "red", "white", "flag", "chimney", "dark"):
        M[k] = clay(k, C[k])
    M["deck"] = clay("deck", C["deck"], pattern="y", pattern_k=70.0, pattern_bump=0.35)
    M["thatch"] = clay("thatch", C["thatch"], pattern="radial", pattern_k=34.0,
                       pattern_bump=0.55, vary=0.22, sheen=0.1)
    M["glass"] = clay("glass", C["glass"], rough=0.3, sss=0.0, bump=0.05, emit=0.25)
    M["bulb"] = glow("bulb", C["bulb"], 7.0)
    M["glow"] = glow("lantern_glow", C["glow"], 5.0)
    M["wire"] = clay("wire", C["wire"], bump=0.0)
    return M


# --- Geometría ----------------------------------------------------------------
def spow(v, e):
    return math.copysign(abs(v) ** e, v)


def faces_of(verts):
    fs = set()
    for v in verts:
        fs.update(v.link_faces)
    return list(fs)


def paint(verts, idx):
    for f in faces_of(verts):
        f.material_index = idx


def superquadric(bm, size, p=4.0, q=4.0, matrix=None, segs=32, rings=16):
    """Superelipsoide de semiejes `size`: p = redondez en planta, q = vertical.
    p=q=2 es un elipsoide; p=q=5 una almohada; p=2, q=4 un barril."""
    a, b, c = size
    ret = bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)
    vs = ret["verts"]
    for v in vs:
        d = v.co.normalized()
        f = (abs(d.x / a) ** p + abs(d.y / b) ** p) ** (q / p) + abs(d.z / c) ** q
        v.co = d * f ** (-1.0 / q)
    if matrix is not None:
        bmesh.ops.transform(bm, verts=vs, matrix=matrix)
    return vs


def tube(bm, pts, r, segs=8, closed=False, caps=True):
    """Churro de arcilla a lo largo de una polilínea (marco con "arriba" = Z)."""
    pts = [Vector(p) for p in pts]
    n = len(pts)
    rs = r if isinstance(r, (list, tuple)) else [r] * n
    rings = []
    for i in range(n):
        if closed:
            t = pts[(i + 1) % n] - pts[i - 1]
        else:
            t = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]
        t.normalize()
        up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        nr = (up - t * up.dot(t)).normalized()
        bi = t.cross(nr)
        rings.append([bm.verts.new(pts[i] + rs[i] * (math.cos(a) * nr + math.sin(a) * bi))
                      for a in (2 * math.pi * k / segs for k in range(segs))])
    pairs = list(zip(rings, rings[1:]))
    if closed:
        pairs.append((rings[-1], rings[0]))
    for ra, rb in pairs:
        for k in range(segs):
            bm.faces.new((ra[k], ra[(k + 1) % segs], rb[(k + 1) % segs], rb[k]))
    if caps and not closed:
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
    return [v for ring in rings for v in ring]


def lathe(bm, profile, segs=48, sx=1.0, sy=1.0, matrix=None):
    """Sólido de revolución alrededor de Z; perfil (r, z) cerrado en r=0."""
    rings = []
    for r, z in profile:
        if r < 1e-6:
            rings.append([bm.verts.new((0.0, 0.0, z))])
        else:
            rings.append([bm.verts.new((sx * r * math.cos(2 * math.pi * k / segs),
                                        sy * r * math.sin(2 * math.pi * k / segs), z))
                          for k in range(segs)])
    for ra, rb in zip(rings, rings[1:]):
        if len(ra) == 1 and len(rb) == 1:
            continue
        for k in range(segs):
            k1 = (k + 1) % segs
            if len(ra) == 1:
                bm.faces.new((ra[0], rb[k1], rb[k]))
            elif len(rb) == 1:
                bm.faces.new((ra[k], ra[k1], rb[0]))
            else:
                bm.faces.new((ra[k], ra[k1], rb[k1], rb[k]))
    vs = [v for ring in rings for v in ring]
    if matrix is not None:
        bmesh.ops.transform(bm, verts=vs, matrix=matrix)
    return vs


def torus(bm, R, r, matrix, nu=24, nv=10, seg_mats=None):
    grid = [[bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b)))
             for b in (2 * math.pi * j / nv for j in range(nv))]
            for a in (2 * math.pi * i / nu for i in range(nu))]
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((grid[i][j], grid[(i + 1) % nu][j], grid[(i + 1) % nu][(j + 1) % nv], grid[i][(j + 1) % nv]))
            if seg_mats:
                f.material_index = seg_mats[(i * len(seg_mats)) // nu]
    vs = [v for row in grid for v in row]
    bmesh.ops.transform(bm, verts=vs, matrix=matrix)
    return vs


def align_z(n):
    return Vector(n).to_track_quat("Z", "Y").to_matrix().to_4x4()


def make_obj(name, bm, mats, parent, loc=(0, 0, 0), sharp_deg=None, mods=()):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for f in bm.faces:
        f.smooth = True
    if sharp_deg:
        lim = math.radians(sharp_deg)
        for e in bm.edges:
            e.smooth = not (len(e.link_faces) == 2 and e.calc_face_angle(0.0) > lim)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = loc
    for kind, opts in mods:
        mod = obj.modifiers.new(kind.lower(), kind)
        for k, v in opts.items():
            setattr(mod, k, v)
    return obj


# --- Casco --------------------------------------------------------------------
def plan_pt(phi):
    c, s = math.cos(phi), math.sin(phi)
    x = (HULL_A_BOW if c >= 0 else HULL_A_STERN) * spow(c, 2.0 / HULL_P)
    y = HULL_B * spow(s, 2.0 / HULL_P)
    y *= 1.0 - HULL_PINCH * max(0.0, x) ** 2
    return x, y


def section(z):
    return (1.0 - abs((z - HULL_ZC) / HULL_C) ** HULL_Q) ** (1.0 / HULL_Q)


def rise(x):
    return BOW_RISE * max(0.0, x) ** 2 + STERN_RISE * max(0.0, -x) ** 2


def deck_z(x):
    return DECK_Z0 + rise(x)


def hull_point(phi, z, inset=1.0):
    px, py = plan_pt(phi)
    s = section(z) * inset
    x, y = s * px, s * py
    return Vector((x, y, z + rise(x) * (z / DECK_Z0) ** 2))


def build_hull(M, parent):
    nphi, nlev, ndeck = 72, 12, 6
    phis = [2 * math.pi * i / nphi for i in range(nphi)]
    zs = [DECK_Z0 * (1.0 - (1.0 - j / nlev) ** 1.7) for j in range(nlev + 1)]
    mats = ["band", "hull", "deck"]
    bm = bmesh.new()
    rings = [[bm.verts.new(hull_point(ph, z)) for ph in phis] for z in zs]
    top = rings[-1]
    deck_rings = [top]
    for k in range(1, ndeck):
        f = 1.0 - k / ndeck
        deck_rings.append([bm.verts.new((v.co.x * f, v.co.y * f, deck_z(v.co.x * f))) for v in top])
    center = bm.verts.new((0.0, 0.0, deck_z(0.0)))
    for j in range(nlev):
        idx = 0 if (zs[j] + zs[j + 1]) / 2 < BAND_Z else 1
        for i in range(nphi):
            i1 = (i + 1) % nphi
            f = bm.faces.new((rings[j][i], rings[j][i1], rings[j + 1][i1], rings[j + 1][i]))
            f.material_index = idx
    for ra, rb in zip(deck_rings, deck_rings[1:]):
        for i in range(nphi):
            i1 = (i + 1) % nphi
            bm.faces.new((ra[i], ra[i1], rb[i1], rb[i])).material_index = 2
    for i in range(nphi):
        bm.faces.new((deck_rings[-1][i], deck_rings[-1][(i + 1) % nphi], center)).material_index = 2
    bm.faces.new(rings[0][::-1]).material_index = 0
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bvh = BVHTree.FromBMesh(bm)
    top_pts = [v.co.copy() for v in top]
    hull = make_obj("hull", bm, [M[m] for m in mats], parent, sharp_deg=40)

    # Churro naranja sobre la regala.
    bm = bmesh.new()
    pts = [Vector((p.x * 0.985, p.y * 0.985, p.z + 0.018)) for p in top_pts]
    tube(bm, pts, ROLL_R, segs=12, closed=True)
    roll = make_obj("roll", bm, [M["roll"]], parent)
    return [hull, roll], bvh


def surface_hit(bvh, x, z, side):
    """Punto y normal del casco a (x, z) en el costado `side` (+1 babor, -1 estribor)."""
    loc, nrm, _, _ = bvh.ray_cast(Vector((x, side * 2.0, z)), Vector((0, -side, 0)))
    return loc, nrm


def build_hull_details(M, parent, bvh):
    objs = []
    # Ojos de buey: lente azul + aro de arcilla, a ambos costados.
    bm = bmesh.new()
    for side in (1, -1):
        loc, n = surface_hit(bvh, 0.30, 0.22, side)
        base = Matrix.Translation(loc) @ align_z(n)
        vs = superquadric(bm, (0.058, 0.058, 0.024), 2.0, 2.0, base @ Matrix.Translation((0, 0, 0.006)), 20, 10)
        paint(vs, 0)
        vs = torus(bm, 0.066, 0.02, base @ Matrix.Translation((0, 0, 0.008)), 24, 8)
        paint(vs, 1)
    objs.append(make_obj("portholes", bm, [M["glass"], M["white"]], parent))
    # Salvavidas rojiblancos colgados del costado.
    bm = bmesh.new()
    for side in (1, -1):
        loc, n = surface_hit(bvh, -0.34, 0.235, side)
        base = Matrix.Translation(loc + n * 0.03) @ align_z(n)
        torus(bm, 0.098, 0.037, base, 32, 12, seg_mats=[0, 1, 0, 1, 0, 1, 0, 1])
    objs.append(make_obj("life_rings", bm, [M["red"], M["white"]], parent))
    return objs


# --- Cabaña con techo de paja y palmera ----------------------------------------
def build_cabin(M, parent):
    objs = []
    zc = deck_z(CAB_X) + CAB_C - 0.03
    bm = bmesh.new()
    superquadric(bm, (CAB_A, CAB_B, CAB_C), 5.0, 5.0, Matrix.Translation((CAB_X, 0, zc)), 40, 22)
    objs.append(make_obj("cabin", bm, [M["wall"]], parent))

    # Ventanas: cristal + marco verde; puerta de madera a popa.
    bm = bmesh.new()
    wins = []
    for side in (1, -1):
        for dx in (-0.1, 0.1):
            wins.append(((CAB_X + dx, side * CAB_B, zc + 0.02), Vector((0, side, 0)), (0.066, 0.075)))
    wins.append(((CAB_X + CAB_A, 0.0, zc + 0.02), Vector((1, 0, 0)), (0.08, 0.075)))
    for p, n, (w, h) in wins:
        base = Matrix.Translation(Vector(p)) @ align_z(n)
        vs = superquadric(bm, (w + 0.018, h + 0.018, 0.014), 4.0, 2.0, base, 24, 10)
        paint(vs, 1)
        vs = superquadric(bm, (w, h, 0.012), 4.0, 2.0, base @ Matrix.Translation((0, 0, 0.012)), 24, 10)
        paint(vs, 0)
    door = Matrix.Translation(Vector((CAB_X - CAB_A, 0.0, zc - 0.03))) @ align_z((-1, 0, 0))
    vs = superquadric(bm, (0.075, 0.13, 0.018), 4.0, 2.0, door @ Matrix.Rotation(math.pi / 2, 4, "Z"), 24, 10)
    paint(vs, 2)
    objs.append(make_obj("windows", bm, [M["glass"], M["frame"], M["door"]], parent))

    # Techo de paja: dos conos achatados con labio grueso.
    rb = zc + CAB_C - 0.06
    bm = bmesh.new()
    lathe(bm, [(0, 0.26), (0.08, 0.245), (0.2, 0.18), (0.34, 0.09), (0.43, 0.035), (0.465, 0.0),
               (0.46, -0.035), (0.42, -0.05), (0.3, -0.04), (0, -0.03)], 56, ROOF_SX * ROOF_K, ROOF_K)
    lathe(bm, [(0, 0.34), (0.06, 0.33), (0.14, 0.27), (0.22, 0.195), (0.255, 0.15), (0.245, 0.12),
               (0.2, 0.11), (0, 0.12)], 48, ROOF_SX * ROOF_K, ROOF_K)
    objs.append(make_obj("roof", bm, [M["thatch"]], parent, loc=(CAB_X, 0, rb)))
    apex = Vector((CAB_X, 0, rb + 0.345))

    # Hojas de palmera: tiras en V que salen del vértice y caen.
    bm = bmesh.new()
    for i, ang in enumerate((10, 75, 140, 200, 320)):
        L, W = (0.40 + 0.03 * (i % 2)) * ROOF_K, 0.085
        rows = 12
        rot = Matrix.Rotation(math.radians(ang), 4, "Z")
        grid = []
        for r in range(rows + 1):
            u = r / rows
            d = L * u
            h = 0.15 * u - 0.36 * u * u
            w = W * math.sin(math.pi * min(1.0, u * 1.02)) ** 0.7 + 0.004
            row = [bm.verts.new(apex + rot @ Vector((d, sy * w, h - 0.3 * w)))
                   for sy in (-1.0, 0.0, 1.0)]
            row[1].co.z += 0.25 * w
            grid.append(row)
        for r in range(rows):
            for k in range(2):
                bm.faces.new((grid[r][k], grid[r][k + 1], grid[r + 1][k + 1], grid[r + 1][k]))
    objs.append(make_obj("palm", bm, [M["leaf"]], parent,
                         mods=[("SOLIDIFY", {"thickness": 0.018, "offset": 0.0}),
                               ("SUBSURF", {"levels": 1, "render_levels": 2})]))
    # Nudo de la palmera.
    bm = bmesh.new()
    superquadric(bm, (0.05, 0.05, 0.04), 2.0, 2.0, Matrix.Translation(apex), 16, 8)
    objs.append(make_obj("palm_knot", bm, [M["wood"]], parent))

    # Chimenea regordeta que asoma del techo, con boca oscura.
    ang = math.radians(-115)
    cx, cy = CAB_X + 0.27 * ROOF_K * math.cos(ang) * ROOF_SX, 0.27 * ROOF_K * math.sin(ang)
    base = Matrix.Translation((cx, cy, rb + 0.23)) @ Matrix.Rotation(math.radians(-8), 4, "X")
    bm = bmesh.new()
    vs = superquadric(bm, (0.068, 0.068, 0.15), 2.0, 5.0, base, 24, 14)
    paint(vs, 0)
    vs = torus(bm, 0.068, 0.024, base @ Matrix.Translation((0, 0, 0.13)), 24, 8)
    paint(vs, 1)
    vs = superquadric(bm, (0.05, 0.05, 0.012), 2.0, 2.0, base @ Matrix.Translation((0, 0, 0.145)), 16, 6)
    paint(vs, 1)
    objs.append(make_obj("chimney", bm, [M["chimney"], M["dark"]], parent))

    # Tira de lucecitas colgada del alero.
    eave_r, eave_z = 0.455 * ROOF_K, rb - 0.04
    hangs = 10
    wire, bulbs = [], []
    for i in range(hangs):
        for k in range(6):
            t = (i + k / 6) / hangs
            a = 2 * math.pi * t
            sag = 0.045 * math.sin(math.pi * k / 6)
            p = Vector((CAB_X + ROOF_SX * eave_r * math.cos(a), eave_r * math.sin(a), eave_z - sag))
            wire.append(p)
            if k == 3:
                bulbs.append(p + Vector((0, 0, -0.018)))
    bm = bmesh.new()
    tube(bm, wire, 0.0055, segs=5, closed=True)
    objs.append(make_obj("eave_wire", bm, [M["wire"]], parent))
    return objs, bulbs, zc


# --- Mástil, bandera, faroles, carga ------------------------------------------
def flag_y(u):
    return 0.045 * math.sin(2 * math.pi * 0.9 * u) * u


def build_mast_flag(M, parent):
    objs = []
    z0 = deck_z(MAST_X) - 0.03
    bm = bmesh.new()
    lathe(bm, [(0, z0), (MAST_R * 1.3, z0), (MAST_R * 1.2, z0 + 0.06), (MAST_R, z0 + 0.12),
               (MAST_R * 0.8, MAST_TOP), (0, MAST_TOP)], 12, matrix=Matrix.Translation((MAST_X, 0, 0)))
    objs.append(make_obj("mast", bm, [M["wood"]], parent))
    bm = bmesh.new()
    superquadric(bm, (0.048, 0.048, 0.048), 2.0, 2.0, Matrix.Translation((MAST_X, 0, MAST_TOP + 0.03)), 16, 8)
    objs.append(make_obj("mast_ball", bm, [M["roll"]], parent))

    # Bandera naranja, gruesa y redondeada (solidify + subsurf).
    bm = bmesh.new()
    rows, cols = 4, 8
    grid = []
    for i in range(rows + 1):
        row = []
        for j in range(cols + 1):
            u = j / cols
            row.append(bm.verts.new((MAST_X - MAST_R * 0.5 - FLAG_W * u, flag_y(u),
                                     FLAG_Z0 + FLAG_H * i / rows - 0.03 * u)))
        grid.append(row)
    for i in range(rows):
        for j in range(cols):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    objs.append(make_obj("flag", bm, [M["flag"]], parent,
                         mods=[("SOLIDIFY", {"thickness": FLAG_T, "offset": 0.0}),
                               ("SUBSURF", {"levels": 1, "render_levels": 2})]))
    # Logo "≈": dos churros blancos ondulados en cada cara.
    bm = bmesh.new()
    for side in (1, -1):
        for dz in (0.05, -0.035):
            pts = []
            for k in range(25):
                u = 0.22 + 0.58 * k / 24
                z = FLAG_Z0 + FLAG_H * 0.5 + dz + 0.024 * math.sin(2 * math.pi * 1.5 * (k / 24)) - 0.03 * u
                pts.append((MAST_X - MAST_R * 0.5 - FLAG_W * u, flag_y(u) + side * (FLAG_T * 0.5 + 0.003), z))
            tube(bm, pts, 0.0145, segs=8)
    objs.append(make_obj("flag_logo", bm, [M["white"]], parent))
    return objs


def lantern(bm, pos, glow_i, dark_i):
    x, y, z = pos
    vs = superquadric(bm, (0.045, 0.045, 0.055), 3.0, 3.0, Matrix.Translation((x, y, z)), 20, 10)
    paint(vs, glow_i)
    vs = lathe(bm, [(0, 0.1), (0.02, 0.095), (0.055, 0.06), (0.058, 0.045), (0, 0.045)], 16,
               matrix=Matrix.Translation((x, y, z)))
    paint(vs, dark_i)
    vs = superquadric(bm, (0.05, 0.05, 0.016), 2.0, 2.0, Matrix.Translation((x, y, z - 0.055)), 16, 6)
    paint(vs, dark_i)
    vs = torus(bm, 0.022, 0.007, Matrix.Translation((x, y, z + 0.11)) @ Matrix.Rotation(math.pi / 2, 4, "X"), 12, 6)
    paint(vs, dark_i)


def build_props(M, parent):
    objs = []
    # Postes de proa y popa con farol.
    tops = []
    bm = bmesh.new()
    for px, hgt in ((POST_X, 0.24), (STERN_POST_X, 0.30)):
        z0 = deck_z(px) - 0.02
        lathe(bm, [(0, z0), (0.03, z0), (0.026, z0 + hgt), (0, z0 + hgt)], 10,
              matrix=Matrix.Translation((px, 0, 0)))
        tops.append((px, z0 + hgt))
    objs.append(make_obj("posts", bm, [M["wood_dark"]], parent))
    bm = bmesh.new()
    for px, zt in tops:
        lantern(bm, (px, 0, zt + 0.07), 0, 1)
    objs.append(make_obj("lanterns", bm, [M["glow"], M["dark"]], parent))

    # Cajas de madera con fleje oscuro.
    bm = bmesh.new()
    crates = [((0.54, 0.19), 0.075, 12), ((0.55, -0.19), 0.068, -18)]
    for (x, y), s, rot in crates:
        z = deck_z(x) + s - 0.012
        m = Matrix.Translation((x, y, z)) @ Matrix.Rotation(math.radians(rot), 4, "Z")
        paint(superquadric(bm, (s, s, s), 6.0, 6.0, m, 28, 14), 0)
        paint(superquadric(bm, (s + 0.007, s + 0.007, 0.016), 6.0, 2.0, m, 28, 8), 1)
    x, y = crates[0][0]
    s2 = 0.058
    z = deck_z(x) + 2 * crates[0][1] - 0.02 + s2
    m = Matrix.Translation((x - 0.01, y + 0.005, z)) @ Matrix.Rotation(math.radians(-25), 4, "Z")
    paint(superquadric(bm, (s2, s2, s2), 6.0, 6.0, m, 28, 14), 0)
    paint(superquadric(bm, (s2 + 0.007, s2 + 0.007, 0.014), 6.0, 2.0, m, 28, 8), 1)
    objs.append(make_obj("crates", bm, [M["wood"], M["wood_dark"]], parent))

    # Barriles a popa: superelipsoide abombado con dos aros.
    bm = bmesh.new()
    for y in (0.19, -0.19):
        x, a, c = -0.55, 0.072, 0.092
        z = deck_z(x) + c - 0.012
        paint(superquadric(bm, (a, a, c), 2.0, 4.0, Matrix.Translation((x, y, z)), 24, 14), 0)
        for dz in (0.05, -0.05):
            rr = a * (1 - (abs(dz) / c) ** 4) ** 0.25
            paint(torus(bm, rr, 0.011, Matrix.Translation((x, y, z + dz)), 24, 6), 1)
    objs.append(make_obj("barrels", bm, [M["barrel"], M["iron"]], parent))
    return objs, tops


def build_lights(M, parent, eave_bulbs, bow_top):
    """Tira de lucecitas: del mástil al farol de proa, más la del alero."""
    a = Vector((MAST_X + 0.02, 0, 1.30))
    b = Vector((bow_top[0], 0, bow_top[1] + 0.13))
    wire, bulbs = [], list(eave_bulbs)
    n = 16
    for k in range(n + 1):
        t = k / n
        p = a.lerp(b, t) + Vector((0, 0, -0.10 * 4 * t * (1 - t)))
        wire.append(p)
        if 0 < k < n and k % 2 == 0:
            bulbs.append(p + Vector((0, 0, -0.018)))
    bm = bmesh.new()
    tube(bm, wire, 0.0055, segs=5)
    objs = [make_obj("bow_wire", bm, [M["wire"]], parent)]
    bm = bmesh.new()
    for p in bulbs:
        superquadric(bm, (0.019, 0.019, 0.024), 2.0, 2.0, Matrix.Translation(p), 10, 6)
    objs.append(make_obj("bulbs", bm, [M["bulb"]], parent))
    return objs


def build_ship():
    M = build_materials()
    root = bpy.data.objects.new("ship_root", None)
    bpy.context.scene.collection.objects.link(root)
    objs, bvh = build_hull(M, root)
    objs += build_hull_details(M, root, bvh)
    cab, eave_bulbs, _ = build_cabin(M, root)
    objs += cab
    objs += build_mast_flag(M, root)
    props, tops = build_props(M, root)
    objs += props
    objs += build_lights(M, root, eave_bulbs, tops[0])
    return root, objs


# --- Escena y render ----------------------------------------------------------
def setup_scene():
    scene = rig.reset_scene()
    rig.setup_render(scene)
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = LOOK
    ee = scene.eevee
    ee.taa_render_samples = SAMPLES
    ee.use_shadows = True
    ee.shadow_ray_count = 2
    ee.shadow_step_count = 8
    ee.use_raytracing = True
    ee.use_fast_gi = True
    ee.fast_gi_method = "GLOBAL_ILLUMINATION"
    ee.fast_gi_distance = 0.6
    ee.fast_gi_ray_count = 4
    ee.fast_gi_step_count = 8
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = WORLD_COLOR + (1.0,)
    bg.inputs["Strength"].default_value = WORLD_STRENGTH
    cam = rig.add_camera(scene)
    sun = rig.add_sun(scene)                 # dirección fija de rig.py
    sun.data.use_shadow = True               # sin contorno: la sombra sí se puede usar
    sun.data.angle = math.radians(SUN_ANGLE_DEG)
    sun.data.energy = SUN_STRENGTH
    return scene, cam


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="tools/blender/out/styles/05_arcilla_maqueta")
    ap.add_argument("--only", nargs="*", help="sólo estas direcciones (iterar rápido)")
    ap.add_argument("--no-hero", action="store_true")
    a = ap.parse_args(argv)
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)

    t0 = time.time()
    scene, _ = setup_scene()
    root, _ = build_ship()
    t_build = time.time() - t0
    times = []
    for d in (a.only or ship.DIRECTIONS):
        root.rotation_euler = (0.0, 0.0, math.radians(ship.yaw_for(d)))
        scene.render.filepath = os.path.join(out, d + ".png")
        t = time.time()
        bpy.ops.render.render(write_still=True)
        times.append((d, time.time() - t))
    if not a.no_hero:
        root.rotation_euler = (0.0, 0.0, math.radians(ship.yaw_for("SE")))
        scene.render.resolution_percentage = 200
        scene.render.filepath = os.path.join(out, "hero_SE.png")
        t = time.time()
        bpy.ops.render.render(write_still=True)
        times.append(("hero_SE", time.time() - t))
        scene.render.resolution_percentage = 100
    total = time.time() - t0
    print("[05_arcilla] escena %.1fs; " % t_build + ", ".join("%s %.1fs" % x for x in times)
          + "; total %.1fs" % total)


if __name__ == "__main__":
    main()
