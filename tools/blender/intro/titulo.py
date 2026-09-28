"""Título «BOIA» de la entrada (acto 2, T27): letras 3D en una hoja de sprites.

    Blender -b -P tools/blender/intro/titulo.py                       # escribe art/intro/titulo/
    Blender -b -P tools/blender/intro/titulo.py -- --out OTRA/CARPETA  # p. ej. para comparar dos corridas

Cada letra de «BOIA» es un texto de Blender extruido con bisel suave (fuente
integrada de Blender, engrosada), en los colores de marca: cara naranja BOIA y
cantos azul marino (docs/barcos/barcos.json, `muestra`). Se renderiza cada
letra girada sobre su eje vertical (guiñada) de YAW_MIN a YAW_MAX en FRAMES
pasos, con una luz fija: al girar, el bisel y la cara «atrapan» la luz.

Todo va en UN render: la cámara es ortográfica y la luz direccional, así que
una copia de la letra desplazada en el plano de la imagen se ve igual que sola.
Cada copia cae en su celda de una rejilla (fila = letra, columna = fotograma)
alineada a píxeles enteros. La web compone las letras en un canvas 2D y las
mueve ella (subir una a una, balanceo, bamboleo y salida; D-05: sin 3D en el
navegador); de aquí sale sólo la luz del giro.

Salida (art/intro/titulo/):
    letras.png      hoja RGBA sin pérdida (la que valida check.py)
    letras.webp     la misma hoja en WebP con alfa (la que pide la web)
    manifest.json   rejilla, letras, guiñada de cada columna y posición de cada letra en la palabra

Reproducible: mallas canónicas (triangulado por la diagonal corta, vértices y
caras ordenados), sin SSS, sin sombras y sin metadatos en los PNG: dos corridas
dan los mismos bytes.
"""
import argparse
import hashlib
import json
import math
import os
import struct
import sys
import time
import zlib

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
BLENDER_DIR = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(BLENDER_DIR))
sys.path.insert(0, BLENDER_DIR)

ID = "intro/titulo"
VERSION = "0.1.0"
LICENSE = "muestra interna"
TEXT = "BOIA"
COMMAND = "Blender -b -P tools/blender/intro/titulo.py"

# Colores de marca (muestra): los de docs/barcos/barcos.json › referencias.marca.
ORANGE = "#F26A1B"
NAVY = "#12233F"

# Geometría de la letra, en unidades de Blender (la altura de la mayúscula mide CAP).
EXTRUDE = 0.16            # media profundidad del bloque
BEVEL = 0.045             # bisel suave
BEVEL_RES = 4
OFFSET = 0.035            # engrosado del contorno de la fuente
GAP = 0.14                # hueco entre letras en la palabra, fracción de CAP

# Giro (guiñada) de cada columna de la hoja.
FRAMES = 17
YAW_MIN, YAW_MAX = -24.0, 24.0

# Cámara: ortográfica, un poco desde arriba para ver el canto superior.
CAM_ELEVATION_DEG = 9.0
CELL_W, CELL_H = 184, 176  # px por celda
CAP_PX = 112               # altura de la mayúscula en px (define la densidad)
PAD = 2                    # celdas vacías alrededor, en px (sin sangrado del filtro)
# Cycles en CPU con semilla fija: Eevee (GPU) daba ±1 en un par de píxeles de una corrida a otra.
ENGINE = "CYCLES"
SAMPLES = 64


def hex_lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def rel(p):
    return os.path.relpath(p, REPO)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    w = bpy.data.worlds.new("world")
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    # Luz ambiente tenue y fría: rellena los cantos azules sin aplanar la cara.
    bg.inputs["Color"].default_value = (*hex_lin("#3A5A8C"), 1.0)
    bg.inputs["Strength"].default_value = 0.55
    scene.world = w
    return scene


def setup_render(scene, width, height):
    r = scene.render
    r.engine = ENGINE
    r.resolution_x, r.resolution_y = width, height
    r.resolution_percentage = 100
    r.film_transparent = True
    r.filter_size = 1.0
    r.dither_intensity = 0.0
    r.use_compositing = False
    r.use_sequencer = False
    for attr in dir(r):
        if attr.startswith("use_stamp"):
            setattr(r, attr, False)
    c = scene.cycles
    c.device = "CPU"
    c.samples = SAMPLES
    c.use_adaptive_sampling = False
    c.use_denoising = False
    c.seed = 0
    c.use_animated_seed = False
    c.max_bounces = 2
    c.diffuse_bounces = 1
    c.glossy_bounces = 1
    c.transmission_bounces = 0
    c.volume_bounces = 0
    c.transparent_max_bounces = 2
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.pixel_filter_type = "BLACKMAN_HARRIS"
    c.filter_width = 1.5
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0


def material(name, hex_, roughness, specular=0.5, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*hex_lin(hex_), 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = specular
    if coat and "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = 0.18
    return m


def canonical(bm):
    """Triangula por la diagonal corta y ordena vértices y caras por posición (mismo criterio que
    mundo_arcilla.canonical): el mallado sale igual en cualquier sesión."""
    bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method="SHORT_EDGE", ngon_method="BEAUTY")
    bm.verts.index_update()
    order = sorted(bm.verts, key=lambda v: (round(v.co.x, 6), round(v.co.y, 6), round(v.co.z, 6), v.index))
    rank = {v.index: r for r, v in enumerate(order)}
    bm.verts.sort(key=lambda v: rank[v.index])
    bm.verts.index_update()
    bm.faces.index_update()
    order = sorted(bm.faces, key=lambda f: (sorted(v.index for v in f.verts), f.index))
    rank = {f.index: r for r, f in enumerate(order)}
    bm.faces.sort(key=lambda f: rank[f.index])
    bm.faces.index_update()
    bm.normal_update()


def letter_mesh(ch, scene, cap):
    """Malla de una letra, de pie (cara hacia -Y), con el origen en el centro de su caja en x y en
    media mayúscula en z. Devuelve (mesh, ancho en unidades)."""
    cu = bpy.data.curves.new("txt_" + ch, "FONT")
    cu.body = ch
    cu.size = 1.0
    cu.extrude = EXTRUDE
    cu.bevel_depth = BEVEL
    cu.bevel_resolution = BEVEL_RES
    cu.offset = OFFSET
    cu.resolution_u = 6
    cu.align_x = "LEFT"
    ob = bpy.data.objects.new("tmp_" + ch, cu)
    scene.collection.objects.link(ob)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)

    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    xs = [v.co.x for v in bm.verts]
    x0, x1 = min(xs), max(xs)
    s = 1.0 / cap
    # De pie: el plano del texto (XY) pasa a XZ, con la cara (+Z del texto) mirando a -Y.
    m = Matrix.Scale(s, 4) @ Matrix.Translation(Vector((-(x0 + x1) / 2, -cap / 2, 0.0)))
    m = Matrix.Rotation(math.radians(90.0), 4, "X") @ m
    bm.transform(m)
    canonical(bm)
    # Cara y bisel delantero en naranja; cantos y trasera en azul marino.
    for f in bm.faces:
        f.material_index = 0 if -f.normal.y > 0.42 else 1
        f.smooth = True
    for e in bm.edges:
        e.smooth = not (len(e.link_faces) == 2 and e.calc_face_angle(0.0) > math.radians(50))
    bm.to_mesh(me)
    bm.free()
    return me, (x1 - x0) * s


def cap_height(scene):
    """Altura de la mayúscula de la fuente integrada (la de la «I»), sin bisel ni engrosado."""
    cu = bpy.data.curves.new("cap", "FONT")
    cu.body = "I"
    ob = bpy.data.objects.new("cap", cu)
    scene.collection.objects.link(ob)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    zs = [v.co.y for v in me.vertices]
    h = max(zs) - min(zs)
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    bpy.data.meshes.remove(me)
    return h


def rewrite_png(src, dst):
    """Relee `src` (RGBA de 8 bits) y lo escribe en `dst` con filtro «sub» y zlib 9: determinista."""
    import numpy as np
    im = bpy.data.images.load(src)
    w, h = im.size
    buf = np.empty(w * h * 4, dtype=np.float32)
    im.pixels.foreach_get(buf)
    bpy.data.images.remove(im)
    px = np.rint(buf.reshape(h, w, 4)[::-1] * 255.0).astype(np.int16)
    sub = px.copy()
    sub[:, 1:, :] = (px[:, 1:, :] - px[:, :-1, :]) % 256
    rows = np.concatenate([np.ones((h, 1), dtype=np.uint8), sub.astype(np.uint8).reshape(h, w * 4)], axis=1)
    raw = zlib.compress(rows.tobytes(), 9)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    with open(dst, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
                + chunk(b"IDAT", raw) + chunk(b"IEND", b""))


def camera_basis():
    el = math.radians(CAM_ELEVATION_DEG)
    forward = Vector((0.0, math.cos(el), -math.sin(el)))     # de la cámara hacia la escena
    right = Vector((1.0, 0.0, 0.0))
    up = right.cross(forward).normalized() * -1.0
    if up.z < 0:
        up = -up
    return right, up, forward


def add_lights(scene):
    def sun(name, direction, energy, color="#FFFFFF", angle=6.0):
        d = bpy.data.lights.new(name, "SUN")
        d.energy = energy
        d.color = hex_lin(color)
        d.angle = math.radians(angle)
        d.use_shadow = False
        o = bpy.data.objects.new(name, d)
        o.rotation_euler = Vector(direction).normalized().to_track_quat("Z", "Y").to_euler()
        scene.collection.objects.link(o)

    # Direcciones hacia la luz. Principal: arriba a la izquierda, de frente.
    sun("clave", (-0.55, -0.75, 0.62), 3.4, "#FFF3E2")
    # Contra: detrás a la derecha, perfila el bisel cuando la letra gira.
    sun("contra", (0.85, 0.55, 0.35), 1.7, "#BFD8FF", 3.0)
    # Relleno bajo y cálido (el mar al atardecer), suave.
    sun("relleno", (0.4, -0.6, -0.5), 0.55, "#FFB27A", 20.0)


def build(out_dir):
    scene = reset()
    rows, cols = len(TEXT), FRAMES
    W, H = cols * CELL_W, rows * CELL_H
    setup_render(scene, W, H)
    cap = cap_height(scene)
    ppu = float(CAP_PX)                     # px por unidad (1 unidad = una mayúscula)
    right, up, forward = camera_basis()

    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.ortho_scale = W / ppu
    cam_data.clip_start = 0.1
    cam_data.clip_end = 200.0
    cam = bpy.data.objects.new("cam", cam_data)
    # El centro de la imagen: entre las celdas del medio.
    center = right * (W / 2 / ppu) - up * (H / 2 / ppu)
    cam.location = center - forward * 50.0
    cam.rotation_euler = forward.to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(cam)
    scene.camera = cam
    add_lights(scene)

    face = material("cara", ORANGE, 0.3, 0.6)
    side = material("canto", NAVY, 0.42, 0.55)

    letters = []
    for r, ch in enumerate(TEXT):
        me, width = letter_mesh(ch, scene, cap)
        me.materials.append(face)
        me.materials.append(side)
        letters.append({"char": ch, "row": r, "width_units": width})
        for c in range(cols):
            yaw = YAW_MIN + (YAW_MAX - YAW_MIN) * c / (cols - 1)
            ob = bpy.data.objects.new("L%d_%02d" % (r, c), me)
            # Centro de la celda (c, r) en el plano de la imagen.
            ob.location = right * ((c + 0.5) * CELL_W / ppu) - up * ((r + 0.5) * CELL_H / ppu)
            ob.rotation_euler = (0.0, 0.0, math.radians(yaw))
            scene.collection.objects.link(ob)

    os.makedirs(out_dir, exist_ok=True)
    png = os.path.join(out_dir, "letras.png")
    webp = os.path.join(out_dir, "letras.webp")
    t0 = time.perf_counter()
    r = scene.render
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGBA"
    r.image_settings.color_depth = "8"
    r.image_settings.compression = 90
    # El PNG de Blender no sale igual byte a byte en hojas grandes (mismos píxeles, otro IDAT): se
    # escribe un temporal, se relee y se codifica aquí con zlib.
    tmp = os.path.join(out_dir, ".letras-tmp.png")
    r.filepath = tmp
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images["Render Result"]
    rewrite_png(tmp, png)
    os.remove(tmp)
    r.image_settings.file_format = "WEBP"
    r.image_settings.color_mode = "RGBA"
    r.image_settings.quality = 88
    img.save_render(webp, scene=scene)
    dt = time.perf_counter() - t0

    # Posición de cada letra en la palabra (px de la hoja), con su ancho a guiñada 0 y un hueco fijo.
    x = 0.0
    for L in letters:
        w = L.pop("width_units") * ppu
        L["width_px"] = round(w, 2)
        L["center_px"] = round(x + w / 2, 2)
        x += w + GAP * ppu
    word_w = x - GAP * ppu

    manifest = {
        "id": ID,
        "kind": "title-sheet",
        "version": VERSION,
        "status": "muestra",
        "license": LICENSE,
        "text": TEXT,
        "colors": {"face": ORANGE, "side": NAVY, "source": "docs/barcos/barcos.json › referencias.marca"},
        "images": {"png": "letras.png", "webp": "letras.webp"},
        "sheet": {"width": W, "height": H, "rows": rows, "cols": cols, "cell": [CELL_W, CELL_H]},
        "frames": {"count": cols, "yaw_deg": [YAW_MIN, YAW_MAX],
                   "doc": "columna c = guiñada YAW_MIN + (YAW_MAX - YAW_MIN)·c/(cols-1), grados; "
                          "positiva: la letra gira hacia la derecha de la imagen (la luz clave viene de la izquierda)"},
        "cap_px": CAP_PX,
        "pivot_px": [CELL_W / 2, CELL_H / 2],
        "pivot_doc": "centro de cada celda = centro de la letra en x y media mayúscula en y; ahí gira",
        "word": {"width_px": round(word_w, 2), "gap_px": round(GAP * ppu, 2)},
        "letters": letters,
        "generator": {
            "scripts": [rel(os.path.abspath(__file__))],
            "sources_sha256": hashlib.sha256(open(os.path.abspath(__file__), "rb").read()).hexdigest(),
            "blender": bpy.app.version_string,
            "engine": ENGINE,
            "samples": SAMPLES,
            "command": COMMAND,
        },
    }
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")
    summary = {"png_bytes": os.path.getsize(png), "webp_bytes": os.path.getsize(webp),
               "sheet": [W, H], "render_seconds": round(dt, 2)}
    print("TITULO_SUMMARY " + json.dumps(summary))


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(REPO, "art", "intro", "titulo"))
    a = ap.parse_args(argv)
    build(os.path.abspath(a.out))


if __name__ == "__main__":
    main()
