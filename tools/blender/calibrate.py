"""Prueba de proyección: un cubo unidad con la cámara de rig.py.

    Blender -b -P tools/blender/calibrate.py                      # imprime ratio=2.0xxx
    Blender -b -P tools/blender/calibrate.py -- --elevation 26.565 # compara con otra elevación

Mide la relación ancho/alto de la cara superior del cubo (un rombo en
proyección dimétrica). La cara superior se pinta de rojo puro y se renderiza
en EXR lineal sobre fondo negro, así que el canal rojo es la cobertura de esa
cara en cada píxel. Dos medidas:
  - momentos: para un rombo de diagonales W y H, var(x) = W²/24 y var(y) = H²/24,
    así que W/H = sqrt(var_x/var_y). Usa el antialiasing: precisión sub-píxel.
  - caja: ancho y alto de los píxeles con cobertura ≥ 0,5 (precisión ±1 px).
Sale con código 1 si la medida por momentos se aleja más de 0,04 de 2,0.
Imágenes y números en tools/blender/out/ (ignorado por git).
"""
import argparse
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rig  # noqa: E402

TARGET, TOLERANCE = 2.0, 0.04


def emission(name, rgb):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = rgb + (1.0,)
    o = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(e.outputs["Emission"], o.inputs["Surface"])
    return mat


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--elevation", type=float, default=rig.CAMERA_ELEVATION_DEG)
    a = ap.parse_args(argv)
    rig.CAMERA_ELEVATION_DEG = a.elevation

    scene = rig.reset_scene()
    rig.setup_render(scene, transparent=False)
    rig.add_camera(scene)

    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.translate(bm, verts=bm.verts[:], vec=(0, 0, 0.5))   # apoyado en el plano del agua
    for f in bm.faces:
        n = f.normal
        f.material_index = 0 if n.z > 0.5 else (3 if n.z < -0.5 else (1 if abs(n.x) > 0.5 else 2))
    me = bpy.data.meshes.new("cube")
    bm.to_mesh(me)
    bm.free()
    for m in (emission("top", (1, 0, 0)), emission("side_x", (0, 1, 0)),
              emission("side_y", (0, 0, 1)), emission("bottom", (0, 0, 0))):
        me.materials.append(m)
    cube = bpy.data.objects.new("cube", me)
    scene.collection.objects.link(cube)

    out = os.path.join(HERE, "out")
    os.makedirs(out, exist_ok=True)
    tag = "e%s" % ("%.3f" % a.elevation).rstrip("0").rstrip(".")
    png = os.path.join(out, "calibrate_%s.png" % tag)
    exr = os.path.join(out, "calibrate_%s.exr" % tag)
    scene.render.filepath = png
    bpy.ops.render.render(write_still=True)
    s = scene.render.image_settings
    s.file_format = "OPEN_EXR"
    s.color_mode = "RGBA"
    s.color_depth = "32"
    scene.render.filepath = exr
    bpy.ops.render.render(write_still=True)

    img = bpy.data.images.load(exr)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float64).reshape(h, w, 4)[::-1]   # fila 0 = arriba
    cov = np.clip(px[:, :, 0], 0.0, 1.0)
    ys, xs = np.mgrid[0:h, 0:w] + 0.5
    m0 = cov.sum()
    cx, cy = (cov * xs).sum() / m0, (cov * ys).sum() / m0
    var_x = (cov * (xs - cx) ** 2).sum() / m0
    var_y = (cov * (ys - cy) ** 2).sum() / m0
    width_m, height_m = math.sqrt(24 * var_x), math.sqrt(24 * var_y)
    ratio = width_m / height_m
    mask = cov >= 0.5
    cols, rows = np.where(mask.any(axis=0))[0], np.where(mask.any(axis=1))[0]
    bbox_w, bbox_h = cols[-1] - cols[0] + 1, rows[-1] - rows[0] + 1
    ppu = rig.pixels_per_unit()
    result = {
        "camera_elevation_deg": a.elevation,
        "camera_azimuth_deg": rig.CAMERA_AZIMUTH_DEG,
        "pixels_per_unit": round(ppu, 4),
        "ratio_moments": round(ratio, 4),
        "ratio_bbox": round(bbox_w / bbox_h, 4),
        "ratio_expected": round(1.0 / math.sin(math.radians(a.elevation)), 4),
        "top_width_px": round(width_m, 2), "top_height_px": round(height_m, 2),
        "top_width_expected_px": round(math.sqrt(2) * ppu, 2),
        "bbox_px": [int(bbox_w), int(bbox_h)],
        "area_px": round(float(m0), 1),
        "png": os.path.relpath(png, os.path.dirname(os.path.dirname(HERE))),
        "pass": abs(ratio - TARGET) <= TOLERANCE,
    }
    with open(os.path.join(out, "calibrate_%s.json" % tag), "w") as f:
        json.dump(result, f, indent=1)
    print("CALIBRATE " + json.dumps(result))
    print("ratio=%.4f (caja %.4f, esperado 1/sin(%.3f°) = %.4f) -> %s" % (
        ratio, result["ratio_bbox"], a.elevation, result["ratio_expected"], "OK" if result["pass"] else "FUERA DE 2,0 ± 0,04"))
    sys.stdout.flush()
    if not result["pass"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
