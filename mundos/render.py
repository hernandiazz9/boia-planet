"""Renderiza el archipiélago en cada mundo con la misma cámara. MUESTRA.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P mundos/render.py -- [--tema arcilla papel cartoon]

Salida en mundos/out/: <tema>-dia.png (y arcilla-noche.png) y lugares.json.
"""
import argparse
import json
import math
import os
import sys
import time

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools", "blender"))
sys.path.insert(0, HERE)
import temas  # noqa: E402
import escena  # noqa: E402
import rig  # noqa: E402

W, H, MARGIN = 1600, 1000, 40
OUT = os.path.join(HERE, "out")


def fit(points):
    xs, ys = zip(*(rig.screen_offset_px(p, ppu=1.0) for p in points))
    ppu = min((W - 2 * MARGIN) / (max(xs) - min(xs)), (H - 2 * MARGIN) / (max(ys) - min(ys)))
    px = MARGIN - min(xs) * ppu + ((W - 2 * MARGIN) - (max(xs) - min(xs)) * ppu) / 2
    py = MARGIN - min(ys) * ppu + ((H - 2 * MARGIN) - (max(ys) - min(ys)) * ppu) / 2
    return ppu, (px, py)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--tema", nargs="*", default=list(temas.TEMAS))
    a = ap.parse_args(argv)
    os.makedirs(OUT, exist_ok=True)
    frame, lugares, log = None, None, []
    for tid in a.tema:
        t0 = time.time()
        tema = temas.TEMAS[tid]()
        scene = tema.setup(W, H)
        B, boat_at = escena.build(tema, temas.A)
        ship = tema.build_ship()
        ship.location = boat_at
        if frame is None:
            frame = fit(B.marco + [p for _, p in B.lugares.values()] + [boat_at + Vector((0, 0, 1.9))])
        ppu, pivot = frame
        cam = rig.add_camera(scene, width=W, height=H, pivot_px=pivot, ppu=ppu)
        bpy.context.view_layer.update()
        if lugares is None:
            lugares = {k: {"nombre": n, "x": round(100 * rig.project_px(scene, cam, p)[0] / W, 2),
                           "y": round(100 * rig.project_px(scene, cam, p)[1] / H, 2)} for k, (n, p) in B.lugares.items()}
        for var in tema.variantes:
            if var == "noche":
                tema.night(scene, B)
            scene.render.filepath = os.path.join(OUT, "%s-%s.png" % (tid, var))
            bpy.ops.render.render(write_still=True)
        log.append("%s %.1fs" % (tid, time.time() - t0))
    with open(os.path.join(OUT, "lugares.json"), "w", encoding="utf-8") as f:
        json.dump({"estado": "muestra", "imagen": [W, H], "ppu": round(frame[0], 2), "lugares": lugares},
                  f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("[mundos] " + ", ".join(log))


main()
