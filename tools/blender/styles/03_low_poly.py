"""Estilo 03, "Low-poly 3D": remolcador facetado, sombreado plano y primarios vivos.

Prueba de estilo (no es el barco definitivo). Principled BSDF con caras planas,
sol con sombras y luz ambiental suave del mundo; sin contorno. Caras grandes y
bien orientadas para que cada faceta caiga en un tono distinto.

    Blender -b -P tools/blender/styles/03_low_poly.py -- --out tools/blender/out/styles/03_low_poly

Escribe <out>/<DIR>.png (256x256, 8 direcciones) y <out>/hero_SE.png (512x512).
"""
import argparse
import math
import os
import sys
import time

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # tools/blender
import rig  # noqa: E402
from ship import DIRECTIONS, yaw_for  # noqa: E402

# --- Paleta (sRGB) ------------------------------------------------------------
PAL = {
    "red": "#E2342A",
    "white": "#F3EFE6",
    "rim": "#E2342A",
    "bulwark_in": "#E6DFD2",
    "deck": "#D8AE78",
    "cabin": "#F3EFE6",
    "glass": "#4FB3F2",
    "roof": "#2458C9",
    "crate_red": "#D93A2B",
    "crate_blue": "#2F6ED6",
    "crate_beige": "#E3C68F",
    "barrel": "#B8733A",
    "barrel_top": "#8E5428",
    "funnel_dark": "#2A2C36",
    "mast": "#EDEAE2",
    "flag": "#E2342A",
    "fender": "#2E3039",
}
LANTERN = "#FFD24A"          # emisión: color exacto con view transform Standard

SUN_ENERGY = 2.3
SUN_ANGLE_DEG = 2.0
WORLD_COLOR = (0.80, 0.88, 1.0)
WORLD_STRENGTH = 0.55


# --- Color ---------------------------------------------------------------------
def hex_srgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def lin4(rgb):
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return tuple(f(c) for c in rgb) + (1.0,)


def principled(name, hexcol, rough=0.9, spec=0.10):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = lin4(hex_srgb(hexcol))
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = spec
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return mat


def emissive(name, hexcol, strength=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = lin4(hex_srgb(hexcol))
    e.inputs["Strength"].default_value = strength
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(e.outputs["Emission"], out.inputs["Surface"])
    return mat


class Mats(dict):
    def __init__(self):
        super().__init__({k: principled(k, v) for k, v in PAL.items()})
        self["lantern"] = emissive("lantern", LANTERN, 1.0)


# --- Malla ----------------------------------------------------------------------
def link(name, bm, mats, parent, recalc=True):
    if recalc:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for f in bm.faces:
        f.smooth = False           # sombreado plano: una faceta, un tono
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    return obj


def box(bm, center, size, rot_z=0.0, mat_index=0, bevel=0.0):
    m = (Matrix.Translation(center) @ Matrix.Rotation(rot_z, 4, "Z") @
         Matrix.Diagonal((size[0], size[1], size[2], 1.0)))
    before = set(bm.faces)
    ret = bmesh.ops.create_cube(bm, size=1.0, matrix=m)
    if bevel:
        edges = list({e for v in ret["verts"] for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=1, affect="EDGES",
                        profile=0.5, clamp_overlap=True)
    for f in bm.faces:
        if f not in before:
            f.material_index = mat_index
    return ret


def faces_of(verts):
    fs = set()
    for v in verts:
        fs.update(v.link_faces)
    return list(fs)


def prism(bm, p0, p1, r, sides=6, r_top=None, rot=0.0):
    p0, p1 = Vector(p0), Vector(p1)
    axis = p1 - p0
    q = axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
    m = Matrix.Translation((p0 + p1) / 2) @ q @ Matrix.Rotation(rot, 4, "Z")
    ret = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=sides,
                                radius1=r, radius2=r if r_top is None else r_top,
                                depth=axis.length, matrix=m)
    return ret["verts"]


# --- Casco ------------------------------------------------------------------------
# Planta de media manga (babor, +Y), de popa a proa. Remolcador: ancho y romo.
HALF = [(-1.00, 0.00), (-0.95, 0.30), (-0.75, 0.50), (-0.25, 0.57),
        (0.25, 0.57), (0.62, 0.46), (0.88, 0.24), (1.00, 0.00)]
RING2D = [HALF[0]] + HALF[1:-1] + [HALF[-1]] + [(x, -y) for x, y in reversed(HALF[1:-1])]
RIM_W = 0.055


def half_width(x):
    for (x0, y0), (x1, y1) in zip(HALF, HALF[1:]):
        if x0 <= x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return 0.0


def deck_z(x):
    """Altura de cubierta: arrufo con la proa levantada."""
    return 0.36 + 0.21 * max(0.0, x) ** 2.2 + 0.05 * max(0.0, -x) ** 2


def inward_normals(pts):
    n = len(pts)
    out = []
    for i, (x, y) in enumerate(pts):
        px, py = pts[i - 1]
        nx_, ny_ = pts[(i + 1) % n]
        tx, ty = nx_ - px, ny_ - py
        l = math.hypot(tx, ty)
        nx, ny = -ty / l, tx / l
        if nx * -x + ny * -y < 0:
            nx, ny = -nx, -ny
        out.append((nx, ny))
    return out


def build_hull(M, parent):
    roles = ["red", "white", "rim", "bulwark_in", "deck"]
    ri = {r: i for i, r in enumerate(roles)}
    bm = bmesh.new()
    inner = inward_normals(RING2D)

    def ring(sx, sy, zf, off=0.0):
        vs = []
        for (x, y), (nx, ny) in zip(RING2D, inner):
            px, py = x * sx + nx * off, y * sy + ny * off
            vs.append(bm.verts.new((px, py, zf(x))))
        return vs

    chine = lambda x: 0.14 + 0.5 * (deck_z(x) - 0.36)
    band = lambda x: deck_z(x) - 0.13
    gun = lambda x: deck_z(x) + 0.07
    rings = [
        ring(0.90, 0.84, lambda x: 0.0),       # flotación
        ring(1.00, 1.00, chine),               # pantoque
        ring(1.00, 1.00, band),                # franja blanca
        ring(0.98, 0.97, gun),                 # borda
        ring(0.98, 0.97, gun, RIM_W),          # regala (cara interior)
        ring(0.98, 0.97, deck_z, RIM_W),       # cubierta
    ]
    between = ["red", "red", "white", "rim", "bulwark_in"]
    n = len(RING2D)
    for ra, rb, role in zip(rings, rings[1:], between):
        for i in range(n):
            f = bm.faces.new((ra[i], ra[(i + 1) % n], rb[(i + 1) % n], rb[i]))
            f.material_index = ri[role]
    # Cubierta en franjas transversales: el arrufo las facetea.
    d = rings[-1]
    half = len(HALF) - 1            # índice de la proa en el anillo
    L = lambda k: d[k]
    R = lambda k: d[(n - k) % n]
    f = bm.faces.new((d[0], L(1), R(1)))
    f.material_index = ri["deck"]
    for k in range(1, half - 1):
        f = bm.faces.new((L(k), L(k + 1), R(k + 1), R(k)))
        f.material_index = ri["deck"]
    f = bm.faces.new((L(half - 1), d[half], R(half - 1)))
    f.material_index = ri["deck"]
    f = bm.faces.new(list(reversed(rings[0])))     # tapa en la flotación (no se ve)
    f.material_index = ri["red"]
    return link("hull", bm, [M[r] for r in roles], parent)


# --- Superestructura ----------------------------------------------------------------
CAB_X0, CAB_X1, CAB_Y, CAB_Z0, CAB_Z1 = -0.50, 0.10, 0.29, 0.30, 0.88


def build_cabin(M, parent):
    objs = []
    bm = bmesh.new()
    cx, sx = (CAB_X0 + CAB_X1) / 2, CAB_X1 - CAB_X0
    ret = bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((cx, 0, (CAB_Z0 + CAB_Z1) / 2)) @
                                Matrix.Diagonal((sx, 2 * CAB_Y, CAB_Z1 - CAB_Z0, 1.0)))
    vertical = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 0.1]
    bmesh.ops.bevel(bm, geom=vertical, offset=0.06, segments=1, affect="EDGES", profile=0.5)
    objs.append(link("cabin", bm, [M["cabin"]], parent))

    # Cristales: placas finas un pelo fuera de la pared.
    bm = bmesh.new()
    zc, zh = 0.70, 0.19
    t = 0.014
    for y in (-0.12, 0.12):                                          # frente (+X)
        box(bm, (CAB_X1 + 0.004, y, zc), (t, 0.17, zh))
    for side in (-1, 1):                                             # costados
        for x in (-0.36, -0.12):
            box(bm, (x, side * (CAB_Y + 0.004), zc), (0.17, t, zh))
    box(bm, (CAB_X0 - 0.004, 0, zc), (t, 0.24, zh))                  # popa
    objs.append(link("glass", bm, [M["glass"]], parent))

    # Techo azul a cuatro aguas, con alero: cuatro facetas de tono distinto.
    bm = bmesh.new()
    ov = 0.07
    x0, x1, y0 = CAB_X0 - ov, CAB_X1 + ov, CAB_Y + ov
    zb, ze, zr = CAB_Z1, CAB_Z1 + 0.05, CAB_Z1 + 0.15
    rx0, rx1 = CAB_X0 + 0.16, CAB_X1 - 0.16
    b = [bm.verts.new(p) for p in ((x0, -y0, zb), (x1, -y0, zb), (x1, y0, zb), (x0, y0, zb))]
    e = [bm.verts.new(p) for p in ((x0, -y0, ze), (x1, -y0, ze), (x1, y0, ze), (x0, y0, ze))]
    r0, r1 = bm.verts.new((rx0, 0, zr)), bm.verts.new((rx1, 0, zr))
    bm.faces.new(list(reversed(b)))
    for i in range(4):
        bm.faces.new((b[i], b[(i + 1) % 4], e[(i + 1) % 4], e[i]))
    bm.faces.new((e[0], e[1], r1, r0))
    bm.faces.new((e[1], e[2], r1))
    bm.faces.new((e[2], e[3], r0, r1))
    bm.faces.new((e[3], e[0], r0))
    objs.append(link("roof", bm, [M["roof"]], parent))
    return objs


MAST_X, MAST_TOP = -0.20, 1.86
FLAG_Z0, FLAG_H, FLAG_W = 1.49, 0.34, 0.52
FLAG_YAW_DEG = 24           # la bandera flamea algo abierta: no queda de canto en S y N


def build_funnel(M, parent):
    """Chimenea hexagonal, algo caída a popa: roja, franja blanca, boca oscura."""
    bm = bmesh.new()
    x, z0 = -0.70, deck_z(-0.70) - 0.02
    levels = [(z0, 0.105), (0.84, 0.098), (0.96, 0.096), (1.10, 0.094)]
    roles = ["red", "white", "funnel_dark"]
    lean = 0.10
    sides = 6
    rings = []
    for z, r in levels:
        k = (z - z0) / (levels[-1][0] - z0)
        cx = x - lean * k
        rings.append([bm.verts.new((cx + r * math.cos(2 * math.pi * i / sides + math.pi / 6),
                                    r * math.sin(2 * math.pi * i / sides + math.pi / 6), z))
                      for i in range(sides)])
    for j in range(3):
        for i in range(sides):
            f = bm.faces.new((rings[j][i], rings[j][(i + 1) % sides], rings[j + 1][(i + 1) % sides], rings[j + 1][i]))
            f.material_index = j
    f = bm.faces.new(rings[-1])
    f.material_index = 2
    bm.faces.new(list(reversed(rings[0])))
    return link("funnel", bm, [M[r] for r in roles], parent)


def build_mast_flag(M, parent):
    objs = []
    bm = bmesh.new()
    prism(bm, (MAST_X, 0, CAB_Z1 + 0.10), (MAST_X, 0, MAST_TOP), 0.028, 6, 0.022)
    objs.append(link("mast", bm, [M["mast"]], parent))

    # Bandera facetada: tres paños con pliegues; símbolo de olas blanco a ambos lados.
    us = [0.0, 0.34, 0.68, 1.0]
    ys = [0.0, 0.045, -0.025, 0.035]
    droop = 0.05

    def surf(u, v):
        for (u0, y0), (u1, y1) in zip(zip(us, ys), zip(us[1:], ys[1:])):
            if u0 <= u <= u1:
                y = y0 + (y1 - y0) * (u - u0) / (u1 - u0)
                break
        p = Vector((-0.03 - FLAG_W * u, y, 0.0))
        p.rotate(Matrix.Rotation(math.radians(FLAG_YAW_DEG), 3, "Z"))
        return Vector((MAST_X + p.x, p.y, FLAG_Z0 + FLAG_H * v - droop * u))

    bm = bmesh.new()
    grid = [[bm.verts.new(surf(u, v)) for u in us] for v in (0.0, 1.0)]
    for j in range(len(us) - 1):
        bm.faces.new((grid[0][j], grid[0][j + 1], grid[1][j + 1], grid[1][j]))
    flag = link("flag", bm, [M["flag"]], parent)
    sol = flag.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.016
    sol.offset = 0.0
    objs.append(flag)

    # "≈": dos tildes de 7 puntos, tiras de ~3 px, pegadas a cada cara.
    bm = bmesh.new()
    for vc in (0.36, 0.66):
        for side in (-1, 1):
            pts = []
            for i in range(7):
                u = 0.20 + 0.60 * i / 6
                v = vc + 0.085 * math.sin(2 * math.pi * i / 6)
                pts.append((u, v))
            nrm = Vector((0, side * 0.013, 0))
            nrm.rotate(Matrix.Rotation(math.radians(FLAG_YAW_DEG), 3, "Z"))
            top = [bm.verts.new(surf(u, v + 0.05) + nrm) for u, v in pts]
            bot = [bm.verts.new(surf(u, v - 0.05) + nrm) for u, v in pts]
            for i in range(len(pts) - 1):
                f = bm.faces.new((bot[i], bot[i + 1], top[i + 1], top[i]))
                if side < 0:
                    f.normal_flip()
    objs.append(link("flag_symbol", bm, [M["white"]], parent, recalc=False))
    return objs


def build_cargo(M, parent):
    """Cajas rojas, azules y beige a proa; barriles a popa."""
    objs = []
    roles = ["crate_red", "crate_blue", "crate_beige"]
    bm = bmesh.new()
    crates = [  # x, y, lado, giro, rol, apilada sobre
        (0.36, 0.20, 0.23, 10, 2, None),
        (0.36, -0.18, 0.21, -14, 1, None),
        (0.37, 0.19, 0.16, -8, 0, 0.23),
        (0.62, 0.02, 0.17, 22, 0, None),
    ]
    for x, y, s, rot, role, on in crates:
        z0 = deck_z(x) - 0.01 + (on or 0.0)
        box(bm, (x, y, z0 + s / 2), (s, s, s), math.radians(rot), mat_index=role, bevel=0.018)
    objs.append(link("crates", bm, [M[r] for r in roles], parent))

    bm = bmesh.new()
    for x, y in ((-0.84, 0.25), (-0.86, -0.22), (-0.60, -0.36)):
        z0 = deck_z(x) - 0.01
        h, r = 0.19, 0.07
        sides = 7
        rs = [(z0, r * 0.88), (z0 + h / 2, r * 1.05), (z0 + h, r * 0.88)]
        rings = [[bm.verts.new((x + rr * math.cos(2 * math.pi * i / sides), y + rr * math.sin(2 * math.pi * i / sides), z))
                  for i in range(sides)] for z, rr in rs]
        for j in range(2):
            for i in range(sides):
                f = bm.faces.new((rings[j][i], rings[j][(i + 1) % sides], rings[j + 1][(i + 1) % sides], rings[j + 1][i]))
                f.material_index = 0
        f = bm.faces.new(rings[-1])
        f.material_index = 1
        bm.faces.new(list(reversed(rings[0])))
    objs.append(link("barrels", bm, [M["barrel"], M["barrel_top"]], parent))
    return objs


def build_trim(M, parent):
    objs = []
    # Salvavidas rojiblancos en ambos costados, sobre la franja blanca.
    bm = bmesh.new()
    major, minor, nu, nv = 0.085, 0.030, 8, 4
    x = 0.30
    b = half_width(x)
    for side in (-1, 1):
        ring = [[None] * nv for _ in range(nu)]
        for i in range(nu):
            a = 2 * math.pi * (i + 0.5) / nu
            for j in range(nv):
                c = 2 * math.pi * j / nv + math.pi / 4
                rr = major + minor * math.cos(c)
                ring[i][j] = bm.verts.new((x + rr * math.cos(a), side * (b + 0.035 + minor * math.sin(c)),
                                           0.35 + rr * math.sin(a)))
        for i in range(nu):
            for j in range(nv):
                f = bm.faces.new((ring[i][j], ring[(i + 1) % nu][j], ring[(i + 1) % nu][(j + 1) % nv], ring[i][(j + 1) % nv]))
                f.material_index = (i // 2) % 2
    objs.append(link("life_rings", bm, [M["red"], M["white"]], parent))

    # Faroles: en el tope del mástil, en el frente de la caseta y en un poste de proa.
    bm = bmesh.new()
    prism(bm, (0.80, 0, deck_z(0.80) - 0.01), (0.80, 0, deck_z(0.80) + 0.16), 0.016, 4)
    posts = link("lantern_posts", bm, [M["fender"]], parent)
    objs.append(posts)
    bm = bmesh.new()
    for p, r in (((MAST_X, 0, MAST_TOP + 0.035), 0.042),
                 ((0.80, 0, deck_z(0.80) + 0.19), 0.045),
                 ((CAB_X1 + 0.03, 0.22, CAB_Z1 - 0.05), 0.035),
                 ((CAB_X1 + 0.03, -0.22, CAB_Z1 - 0.05), 0.035)):
        m = Matrix.Translation(p) @ Matrix.Diagonal((1.0, 1.0, 1.25, 1.0))
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r, matrix=m)
    objs.append(link("lanterns", bm, [M["lantern"]], parent))
    bm = bmesh.new()
    for p in ((0.80, 0, deck_z(0.80) + 0.25), (MAST_X, 0, MAST_TOP + 0.085)):
        bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.05, radius2=0.0, depth=0.05,
                              matrix=Matrix.Translation(p) @ Matrix.Rotation(math.pi / 4, 4, "Z"))
    objs.append(link("lantern_caps", bm, [M["fender"]], parent))
    return objs


def build_ship():
    M = Mats()
    root = bpy.data.objects.new("ship_root", None)
    bpy.context.scene.collection.objects.link(root)
    build_hull(M, root)
    build_cabin(M, root)
    build_funnel(M, root)
    build_mast_flag(M, root)
    build_cargo(M, root)
    build_trim(M, root)
    return root


def setup_lighting(scene):
    sun = rig.add_sun(scene)
    sun.data.use_shadow = True          # sin contorno: las sombras no molestan
    sun.data.energy = SUN_ENERGY
    sun.data.angle = math.radians(SUN_ANGLE_DEG)
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = WORLD_COLOR + (1.0,)
    bg.inputs["Strength"].default_value = WORLD_STRENGTH
    return sun


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="tools/blender/out/styles/03_low_poly")
    ap.add_argument("--only", nargs="*", help="sólo estas direcciones (pruebas)")
    ap.add_argument("--no-hero", action="store_true")
    a = ap.parse_args(argv)
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)

    t0 = time.time()
    scene = rig.reset_scene()
    rig.setup_render(scene)
    rig.add_camera(scene)
    setup_lighting(scene)
    root = build_ship()
    n = 0
    for d in (a.only or DIRECTIONS):
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
    print("03_low_poly: %d imágenes en %.1f s (%.2f s/imagen)" % (n, dt, dt / max(n, 1)))


if __name__ == "__main__":
    main()
