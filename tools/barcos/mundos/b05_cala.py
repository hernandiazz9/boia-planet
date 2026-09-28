"""Mundo del barco B05 (arcilla): propuesta visual de su isla. MUESTRA.

Construye una cala de plastilina con el mismo material, luz y cámara del estilo
05 (tools/blender/styles/05_arcilla_maqueta.py, que se importa sin tocarlo) y
atraca en ella el barco B05. Renderiza de día y de noche y guarda dónde cae
cada lugar en la imagen, para rotularlo en la ficha del mundo.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/barcos/mundos/b05_cala.py

Salida en docs/barcos/mundos/b05/: cala-dia.png, cala-noche.png y lugares.json.
Nombres y lugares son propuesta; los aprueba Álvaro.
"""
import importlib.util
import json
import math
import os
import sys
import time

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
BLENDER_DIR = os.path.join(ROOT, "tools", "blender")
sys.path.insert(0, BLENDER_DIR)
import rig  # noqa: E402

_spec = importlib.util.spec_from_file_location(
    "arcilla", os.path.join(BLENDER_DIR, "styles", "05_arcilla_maqueta.py"))
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)          # sólo define: su main() va tras `if __name__ == "__main__"`

OUT = os.path.join(ROOT, "docs", "barcos", "mundos", "b05")
W, H = 1600, 1000
PPU = 150.0                          # px por unidad del mundo (el sprite del juego usa 88)
PIVOT = (700.0, 600.0)

# Colores nuevos del mundo (propuesta). Los del barco vienen de A.C.
WORLD = {
    "sand": "#EBCF9E", "sand_wet": "#D9B684", "grass": "#7DB043", "terracotta": "#C8643A",
    "trunk": "#9C6B45", "coconut": "#6E4A2E", "tile_blue": "#2C62BE", "tile_white": "#FFF7EC",
    "sea": "#0F5F7D", "shallow": "#2A8FAE", "foam": "#D9F3F7", "rock": "#8C7F73",
    "rice": "#F2B233", "pepper": "#E43B30", "pea": "#4F9A45", "pan": "#3A3F58",
    "smoke": "#EDE6DA", "fire": "#FF8A3D", "kiln_mouth": "#2B1E1A",
}

# --- Terreno ------------------------------------------------------------------
ISLAND = dict(a=3.1, b=2.1, c=0.55, zc=-0.15, p=2.4, q=3.0)
HILL = dict(x=-1.45, y=0.95, a=1.25, b=1.05, c=0.75, zc=0.05, p=2.2, q=2.2)


def sq_top(x, y, a, b, c, zc, p, q, cx=0.0, cy=0.0):
    r = (abs((x - cx) / a) ** p + abs((y - cy) / b) ** p) ** (q / p)
    return zc + c * max(0.0, 1.0 - r) ** (1.0 / q) if r < 1.0 else -9.0


def ground(x, y):
    return max(sq_top(x, y, **ISLAND),
               sq_top(x, y, HILL["a"], HILL["b"], HILL["c"], HILL["zc"], HILL["p"], HILL["q"], HILL["x"], HILL["y"]))


def T(x, y, z):
    return Matrix.Translation((x, y, z))


def rot(axis, deg):
    return Matrix.Rotation(math.radians(deg), 4, axis)


def blob(name, M, mat, size, at, p=2.0, q=2.0, parent=None, segs=32, rings=16, extra=None):
    bm = bmesh.new()
    m = T(*at) @ (extra or Matrix.Identity(4))
    A.superquadric(bm, size, p, q, matrix=m, segs=segs, rings=rings)
    return A.make_obj(name, bm, [M[mat]], parent)


# --- Piezas -------------------------------------------------------------------
def build_terrain(M, root):
    blob("isla", M, "sand", (ISLAND["a"], ISLAND["b"], ISLAND["c"]), (0, 0, ISLAND["zc"]),
         ISLAND["p"], ISLAND["q"], root, segs=64, rings=24)
    blob("colina", M, "grass", (HILL["a"], HILL["b"], HILL["c"]), (HILL["x"], HILL["y"], HILL["zc"]),
         HILL["p"], HILL["q"], root, segs=48, rings=20)
    blob("bajio", M, "shallow", (3.75, 2.7, 0.09), (0, 0, -0.035), 2.4, 2.0, root, segs=64, rings=12)
    bm = bmesh.new()
    A.torus(bm, 1.0, 0.035, T(0, 0, 0.055) @ Matrix.Diagonal((3.2, 2.2, 1.0, 1.0)), nu=72, nv=8)
    A.make_obj("espuma", bm, [M["foam"]], root)
    # mar: plano grande con rizos de churro
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30.0)
    A.make_obj("mar", bm, [M["sea"]], root)
    waves = [(-4.6, -2.8, 20), (-5.4, 1.6, -15), (1.8, -4.3, 5), (5.6, 2.5, -25), (-1.2, 3.8, 10),
             (6.2, -2.6, 15), (-3.2, -4.6, -5), (3.2, 4.2, 20), (-6.4, -0.6, 0)]
    for i, (x, y, ang) in enumerate(waves):
        pts = [(x + 0.28 * math.cos(math.radians(ang)) * t, y + 0.28 * math.sin(math.radians(ang)) * t,
                0.02 + 0.03 * math.sin(math.pi * (t + 1) / 2)) for t in (-1, -0.5, 0, 0.5, 1)]
        bm = bmesh.new()
        A.tube(bm, pts, [0.012, 0.03, 0.035, 0.03, 0.012], segs=8)
        A.make_obj("ola_%d" % i, bm, [M["foam"]], root)
    for i, (x, y, s) in enumerate([(-3.55, 1.35, 0.32), (-2.7, -2.35, 0.24), (0.9, 2.95, 0.28), (4.9, 0.9, 0.2)]):
        blob("roca_%d" % i, M, "rock", (s, s * 0.8, s * 0.7), (x, y, -0.02), 2.3, 2.3, root)


def palm(M, root, name, x, y, lean=(0.25, 0.1), height=1.7):
    z0 = ground(x, y) - 0.05
    top = Vector((x + lean[0], y + lean[1], z0 + height))
    pts, rs = [], []
    for i in range(9):
        t = i / 8
        bend = math.sin(t * math.pi / 2)
        pts.append((x + lean[0] * bend, y + lean[1] * bend, z0 + height * t))
        rs.append(0.095 - 0.035 * t)
    bm = bmesh.new()
    A.tube(bm, pts, rs, segs=10)
    A.make_obj(name + "_tronco", bm, [M["trunk"]], root)
    for i in range(4):                                  # anillos del tronco
        t = 0.2 + 0.18 * i
        c = Vector(pts[int(t * 8)])
        bm = bmesh.new()
        A.torus(bm, rs[int(t * 8)] + 0.004, 0.018, T(*c), nu=16, nv=6)
        A.make_obj(name + "_anillo_%d" % i, bm, [M["coconut"]], root)
    for i in range(7):
        ang = i * 360 / 7 + 10
        droop = 28 + 10 * (i % 2)
        m = T(*top) @ rot("Z", ang) @ rot("Y", droop) @ T(0.42, 0, 0)
        blob("%s_hoja_%d" % (name, i), M, "leaf", (0.5, 0.13, 0.025), (0, 0, 0), 2.0, 2.0, root, extra=m)
    for i in range(3):
        ang = math.radians(i * 120 + 30)
        blob("%s_coco_%d" % (name, i), M, "coconut", (0.07, 0.07, 0.07),
             (top.x + 0.08 * math.cos(ang), top.y + 0.08 * math.sin(ang), top.z - 0.07), 2, 2, root)
    return top


def garland(M, root, name, a, b, n=9, sag=0.35):
    a, b = Vector(a), Vector(b)
    pts = [a.lerp(b, i / 16) - Vector((0, 0, sag * math.sin(math.pi * i / 16))) for i in range(17)]
    bm = bmesh.new()
    A.tube(bm, pts, 0.008, segs=6)
    A.make_obj(name + "_cable", bm, [M["wire"]], root)
    bulbs = []
    for i in range(1, n + 1):
        t = i / (n + 1)
        c = a.lerp(b, t) - Vector((0, 0, sag * math.sin(math.pi * t) + 0.05))
        blob("%s_bombilla_%d" % (name, i), M, "bulb", (0.045, 0.045, 0.06), tuple(c), 2, 2, root, segs=12, rings=8)
        bulbs.append(c)
    return bulbs


def build_kiln(M, root):
    x, y = HILL["x"] + 0.15, HILL["y"] + 0.05
    z = ground(x, y) - 0.06
    prof = [(0, 0), (0.55, 0), (0.6, 0.14), (0.57, 0.34), (0.47, 0.55), (0.3, 0.72), (0.13, 0.81), (0, 0.83)]
    bm = bmesh.new()
    A.lathe(bm, prof, segs=40, matrix=T(x, y, z))
    A.make_obj("horno", bm, [M["terracotta"]], root)
    toward = Vector((0.7071, -0.7071, 0))
    mouth = Vector((x, y, z + 0.2)) + toward * 0.56
    blob("horno_boca", M, "kiln_mouth", (0.2, 0.05, 0.17), tuple(mouth), 2.2, 2.6, root,
         extra=rot("Z", 45))
    blob("horno_fuego", M, "fire", (0.13, 0.04, 0.09), tuple(mouth + toward * 0.02 - Vector((0, 0, 0.05))),
         2, 2, root, extra=rot("Z", 45))
    for i, (dx, dy) in enumerate(((0.62, 0.35), (0.72, 0.12), (0.5, 0.55))):   # botijos secándose
        bx, by = x + dx, y + dy
        botijo(M, root, "botijo_secando_%d" % i, bx, by, ground(bx, by) - 0.02, 0.8)
    bm = bmesh.new()
    A.lathe(bm, [(0, 0), (0.1, 0), (0.1, 0.28), (0.13, 0.3), (0.13, 0.34), (0, 0.34)], segs=16,
            matrix=T(x - 0.12, y + 0.1, z + 0.72))
    A.make_obj("horno_chimenea", bm, [M["terracotta"]], root)
    puffs = [(0.0, 0.0, 1.18, 0.1), (0.08, 0.05, 1.36, 0.13), (0.2, 0.12, 1.56, 0.16), (0.36, 0.2, 1.78, 0.19)]
    for i, (dx, dy, dz, r) in enumerate(puffs):
        blob("humo_%d" % i, M, "smoke", (r, r, r * 0.85), (x - 0.12 + dx, y + 0.1 + dy, z + dz), 2, 2, root)
    return Vector((x, y, z + 0.5)), mouth


def build_chiringuito(M, root):
    x, y = 1.0, 1.05
    z = ground(x, y) - 0.04
    blob("chiringuito_paredes", M, "wall", (0.46, 0.4, 0.42), (x, y, z + 0.4), 5.0, 6.0, root)
    blob("chiringuito_puerta", M, "door", (0.02, 0.12, 0.21), (x + 0.46, y - 0.05, z + 0.24), 4, 4, root)
    blob("chiringuito_ventana", M, "glass", (0.14, 0.02, 0.1), (x - 0.05, y - 0.405, z + 0.46), 4, 4, root)
    blob("chiringuito_marco", M, "frame", (0.165, 0.015, 0.125), (x - 0.05, y - 0.395, z + 0.46), 4, 4, root)
    bm = bmesh.new()
    A.lathe(bm, [(0, 1.32), (0.22, 1.25), (0.48, 1.08), (0.68, 0.9), (0.72, 0.86), (0.66, 0.84), (0, 0.88)],
            segs=40, sx=1.05, sy=0.95, matrix=T(x, y, z))
    A.make_obj("chiringuito_paja", bm, [M["thatch"]], root)
    return Vector((x, y, z + 0.75))


def build_paella(M, root):
    x, y = 1.45, -0.2
    z = ground(x, y) + 0.12
    for i in range(3):
        ang = math.radians(i * 120)
        bm = bmesh.new()
        A.tube(bm, [(x + 0.22 * math.cos(ang), y + 0.22 * math.sin(ang), z - 0.14), (x + 0.12 * math.cos(ang),
               y + 0.12 * math.sin(ang), z)], 0.015, segs=6)
        A.make_obj("paella_pata_%d" % i, bm, [M["iron"]], root)
    blob("paella_fuego", M, "fire", (0.1, 0.1, 0.05), (x, y, z - 0.09), 2, 2, root)
    bm = bmesh.new()
    A.lathe(bm, [(0, 0), (0.36, 0), (0.4, 0.05), (0.38, 0.06), (0.35, 0.025), (0, 0.025)], segs=40, matrix=T(x, y, z))
    A.make_obj("paellera", bm, [M["pan"]], root)
    blob("arroz", M, "rice", (0.34, 0.34, 0.02), (x, y, z + 0.03), 2, 2, root, segs=32, rings=8)
    for i in range(10):
        ang = math.radians(i * 36 + 7)
        rr = 0.12 + 0.12 * ((i * 7) % 3) / 2
        mat = "pepper" if i % 2 else "pea"
        blob("paella_trozo_%d" % i, M, mat, (0.035, 0.02, 0.012) if mat == "pepper" else (0.018, 0.018, 0.018),
             (x + rr * math.cos(ang), y + rr * math.sin(ang), z + 0.05), 2, 2, root, segs=10, rings=6,
             extra=rot("Z", i * 40))
    for i in range(2):
        bm = bmesh.new()
        A.tube(bm, [(x + (0.38 + 0.08 * i) * (1 if i == 0 else -1), y, z + 0.05),
                    (x + (0.47) * (1 if i == 0 else -1), y, z + 0.06)], 0.018, segs=6)
        A.make_obj("paella_asa_%d" % i, bm, [M["pan"]], root)
    return Vector((x, y, z))


def build_dance_floor(M, root):
    cx, cy, n, s = -0.15, -0.55, 5, 0.23
    for i in range(n):
        for j in range(n):
            x = cx + (i - (n - 1) / 2) * s
            y = cy + (j - (n - 1) / 2) * s
            mat = "tile_blue" if (i + j) % 2 else "tile_white"
            blob("azulejo_%d_%d" % (i, j), M, mat, (s * 0.46, s * 0.46, 0.035), (x, y, ground(x, y) + 0.005),
                 6.0, 6.0, root, segs=16, rings=8, extra=rot("Z", 0))
    return Vector((cx, cy, ground(cx, cy)))


def botijo(M, root, name, x, y, z, k=1.0):
    prof = [(0, 0), (0.06, 0), (0.1, 0.03), (0.12, 0.08), (0.11, 0.13), (0.07, 0.17), (0.04, 0.2),
            (0.045, 0.23), (0, 0.23)]
    bm = bmesh.new()
    A.lathe(bm, [(r * k, zz * k) for r, zz in prof], segs=20, matrix=T(x, y, z))
    A.make_obj(name, bm, [M["terracotta"]], root)
    bm = bmesh.new()
    A.tube(bm, [(x + 0.08 * k, y, z + 0.11 * k), (x + 0.15 * k, y, z + 0.19 * k)], 0.014 * k, segs=6)
    A.make_obj(name + "_pitorro", bm, [M["terracotta"]], root)


def build_pier(M, root):
    x0, x1, y = 2.6, 5.05, -0.55
    zd = 0.2
    length = x1 - x0
    bm = bmesh.new()
    A.superquadric(bm, (0.28, length / 2, 0.035), 8.0, 8.0, matrix=Matrix.Identity(4), segs=32, rings=8)
    pier = A.make_obj("embarcadero", bm, [M["deck"]], root)
    pier.location = ((x0 + x1) / 2, y, zd)
    pier.rotation_euler = (0, 0, math.radians(-90))
    for i, x in enumerate((x0 + 0.35, x0 + 1.05, x0 + 1.75, x1 - 0.05)):
        for dy in (-0.25, 0.25):
            bm = bmesh.new()
            A.tube(bm, [(x, y + dy, -0.3), (x, y + dy, zd + 0.1)], 0.045, segs=10)
            A.make_obj("poste_%d_%d" % (i, dy > 0), bm, [M["wood_dark"]], root)
    # botijos en el embarcadero
    tops = []
    for i, x in enumerate((x0 + 0.55, x0 + 0.85, x0 + 1.2)):
        yy = y + 0.12 * (1 if i % 2 else -1)
        botijo(M, root, "botijo_%d" % i, x, yy, zd + 0.03)
        tops.append(Vector((x, yy, zd + 0.25)))
    # mástil con bandera naranja al final del muelle
    bm = bmesh.new()
    fx, fy = x0 + 0.2, y - 0.2
    A.tube(bm, [(fx, fy, zd - 0.2), (fx, fy, zd + 1.05)], 0.022, segs=8)
    A.make_obj("mastil_muelle", bm, [M["wood_dark"]], root)
    blob("bandera_muelle", M, "flag", (0.2, 0.012, 0.12), (fx + 0.2, fy, zd + 0.93), 4, 4, root,
         extra=rot("Z", 8))
    return Vector((x0 + 1.0, y, zd)), tops


# --- Escena ---------------------------------------------------------------------
def materials():
    M = A.build_materials()
    for k, h in WORLD.items():
        if k in ("fire",):
            M[k] = A.glow(k, h, 4.0)
        elif k == "sea":
            M[k] = A.clay(k, h, rough=0.35, sss=0.0, bump=0.45, scale=5.0, vary=0.08)
        elif k == "shallow":
            M[k] = A.clay(k, h, rough=0.4, sss=0.0, bump=0.25, scale=7.0, vary=0.1)
        elif k == "sand":
            M[k] = A.clay(k, h, bump=0.35, scale=22.0, vary=0.08)
        else:
            M[k] = A.clay(k, h)
    return M


def main():
    t0 = time.time()
    os.makedirs(OUT, exist_ok=True)
    scene, cam = A.setup_scene()
    bpy.data.objects.remove(cam, do_unlink=True)
    scene.render.resolution_x, scene.render.resolution_y = W, H
    scene.render.film_transparent = False
    cam = rig.add_camera(scene, width=W, height=H, pivot_px=PIVOT, ppu=PPU)
    M = materials()
    root = bpy.data.objects.new("cala_root", None)
    scene.collection.objects.link(root)

    build_terrain(M, root)
    p1 = palm(M, root, "palmera_1", -0.35, 1.55, lean=(0.2, 0.15), height=1.75)
    p2 = palm(M, root, "palmera_2", 2.05, 0.95, lean=(0.28, -0.05), height=1.55)
    p3 = palm(M, root, "palmera_3", -2.1, -0.55, lean=(-0.18, -0.2), height=1.6)
    kiln, mouth = build_kiln(M, root)
    hut = build_chiringuito(M, root)
    paella = build_paella(M, root)
    floor = build_dance_floor(M, root)
    pier, botijos = build_pier(M, root)
    bulbs = garland(M, root, "guirnalda_a", p1 - Vector((0, 0, 0.15)), p2 - Vector((0, 0, 0.15)), n=9, sag=0.45)
    bulbs += garland(M, root, "guirnalda_b", p3 - Vector((0, 0, 0.15)), p1 - Vector((0, 0, 0.2)), n=9, sag=0.5)

    ship_root, _ = A.build_ship()
    ship_root.location = (4.2, 0.37, 0.0)
    ship_root.rotation_euler = (0, 0, 0.0)
    boat_pt = Vector((4.2, 0.37, 0.8))

    places = {
        "barco": ("El barco atracado", boat_pt),
        "embarcadero": ("Embarcadero de los botijos", botijos[1]),
        "chiringuito": ("Chiringuito de paja", hut),
        "paella": ("La paella del mediodía", paella),
        "horno": ("Horno de alfarero", kiln),
        "pista": ("Pista de azulejos", floor),
        "guirnalda": ("Guirnalda entre palmeras", bulbs[9 + 2]),
    }
    bpy.context.view_layer.update()           # sin esto la cámara aún no tiene matrix_world
    lugares = {k: {"nombre": n, "x": round(100 * rig.project_px(scene, cam, p)[0] / W, 2),
                   "y": round(100 * rig.project_px(scene, cam, p)[1] / H, 2)} for k, (n, p) in places.items()}

    sun = next(o for o in scene.objects if o.type == "LIGHT")
    bg = scene.world.node_tree.nodes.get("Background")

    # Día
    scene.render.filepath = os.path.join(OUT, "cala-dia.png")
    t = time.time()
    bpy.ops.render.render(write_still=True)
    t_day = time.time() - t

    # Noche: sol bajo y anaranjado, cielo azul marino, bombillas y fuegos encendidos
    sun.data.energy = 0.9
    sun.data.color = (1.0, 0.62, 0.42)
    bg.inputs["Color"].default_value = (0.10, 0.13, 0.30, 1.0)
    bg.inputs["Strength"].default_value = 0.7
    for mat_name, strength in (("bulb", 24.0), ("lantern_glow", 12.0), ("fire", 14.0)):
        mat = bpy.data.materials.get(mat_name)
        if mat:
            node = next(n for n in mat.node_tree.nodes if n.type == "EMISSION")
            node.inputs["Strength"].default_value = strength
    lights = [(b + Vector((0, 0, -0.08)), (1.0, 0.72, 0.4), 5.0) for b in bulbs]
    lights += [(floor + Vector((0, 0, 1.1)), (1.0, 0.8, 0.55), 70.0)]
    lights += [(mouth + Vector((0.15, -0.15, 0.05)), (1.0, 0.45, 0.2), 40.0),
               (hut + Vector((0.5, -0.5, -0.2)), (1.0, 0.75, 0.45), 30.0),
               (paella + Vector((0, 0, 0.05)), (1.0, 0.5, 0.25), 10.0)]
    for i, (pos, col, energy) in enumerate(lights):
        ld = bpy.data.lights.new("luz_%d" % i, type="POINT")
        ld.energy = energy
        ld.color = col
        ld.shadow_soft_size = 0.15
        lo = bpy.data.objects.new("luz_%d" % i, ld)
        lo.location = pos
        scene.collection.objects.link(lo)
    scene.render.filepath = os.path.join(OUT, "cala-noche.png")
    t = time.time()
    bpy.ops.render.render(write_still=True)
    t_night = time.time() - t

    with open(os.path.join(OUT, "lugares.json"), "w", encoding="utf-8") as f:
        json.dump({"estado": "muestra", "imagen": [W, H], "lugares": lugares}, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("[b05_cala] día %.1fs, noche %.1fs, total %.1fs" % (t_day, t_night, time.time() - t0))


main()
