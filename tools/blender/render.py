"""Renderiza el barco y escribe el manifiesto.

    Blender -b -P tools/blender/render.py -- --all
    Blender -b -P tools/blender/render.py -- --all --out tools/blender/out/rerun
    Blender -b -P tools/blender/render.py -- --skin base --skin noche     # parcial, sin manifiesto

Salida (en --out, por defecto art/barco):
    <skin>/<dir>.png, <skin>/<dir>_p.png (con pasajera), base/S_bob_<n>.png,
    manifest.json. Los tiempos van a tools/blender/out/render_stats.json.
"""
import argparse
import hashlib
import json
import os
import sys
import time

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rig   # noqa: E402
import ship  # noqa: E402

REPO = os.path.dirname(os.path.dirname(HERE))
ASSET_ID = "barco"
BOB_FRAMES = 8
BOB_FPS = 8
BOB_SKIN, BOB_DIRECTION = "base", "S"
ANCHOR_NAMES = ["pivot", "mast_top", "slot_passenger", "wake_origin", "bow"]
SCRIPTS = ["tools/blender/rig.py", "tools/blender/ship.py", "tools/blender/render.py"]


def rel(path):
    return os.path.relpath(path, REPO)


def anchors_px(scene, cam, s):
    bpy.context.view_layer.update()
    out = {}
    for name in ANCHOR_NAMES:
        x, y = rig.project_px(scene, cam, s["anchors"][name].matrix_world.translation)
        out[name] = [round(x, 2), round(y, 2)]
    return out


def unit(dx, dy):
    n = (dx * dx + dy * dy) ** 0.5
    return [round(dx / n, 4), round(dy / n, 4)]


def sources_sha256():
    h = hashlib.sha256()
    for p in SCRIPTS:
        with open(os.path.join(REPO, p), "rb") as f:
            h.update(f.read())
    return h.hexdigest()


def render_to(scene, path, stats):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene.render.filepath = path
    t0 = time.perf_counter()
    bpy.ops.render.render(write_still=True)
    dt = time.perf_counter() - t0
    stats.append({"file": path, "seconds": round(dt, 3), "bytes": os.path.getsize(path)})


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="las 56 imágenes y el manifiesto")
    ap.add_argument("--skin", action="append", choices=sorted(ship.SKINS))
    ap.add_argument("--out", default=os.path.join(REPO, "art", "barco"))
    ap.add_argument("--stats", default=os.path.join(HERE, "out", "render_stats.json"))
    a = ap.parse_args(argv)
    if not a.all and not a.skin:
        ap.error("usá --all o al menos un --skin")
    skins = list(ship.SKINS) if a.all else a.skin
    out_dir = os.path.abspath(a.out)

    t_start = time.perf_counter()
    scene = rig.reset_scene()
    rig.setup_render(scene)
    cam = rig.add_camera(scene)
    rig.add_sun(scene)
    s = ship.build_ship()
    stats = []
    images = []
    directions = {}

    for d in ship.DIRECTIONS:
        ship.set_direction(s, d)
        ship.set_bob(s, None, BOB_FRAMES)
        anc = anchors_px(scene, cam, s)
        bx, by = anc["bow"]
        wx, wy = anc["wake_origin"]
        directions[d] = {"yaw_deg": round(ship.yaw_for(d), 3), "bow_screen": unit(bx - wx, by - wy), "anchors": anc}

    for skin in skins:
        s["materials"].apply_skin(skin)
        for passenger in (False, True):
            ship.set_passenger(s, passenger)
            for d in ship.DIRECTIONS:
                ship.set_direction(s, d)
                ship.set_bob(s, None, BOB_FRAMES)
                name = "%s/%s%s.png" % (skin, d, "_p" if passenger else "")
                render_to(scene, os.path.join(out_dir, name), stats)
                images.append({"file": name, "skin": skin, "direction": d, "frame": 0, "passenger": passenger})

    if BOB_SKIN in skins:
        s["materials"].apply_skin(BOB_SKIN)
        ship.set_passenger(s, False)
        ship.set_direction(s, BOB_DIRECTION)
        for k in range(BOB_FRAMES):
            ship.set_bob(s, k, BOB_FRAMES)
            name = "%s/%s_bob_%d.png" % (BOB_SKIN, BOB_DIRECTION, k)
            render_to(scene, os.path.join(out_dir, name), stats)
            images.append({"file": name, "skin": BOB_SKIN, "direction": BOB_DIRECTION, "frame": k,
                           "passenger": False, "animation": "bob", "anchors": anchors_px(scene, cam, s)})
        ship.set_bob(s, None, BOB_FRAMES)

    total = time.perf_counter() - t_start
    render_secs = [x["seconds"] for x in stats]
    sizes = [x["bytes"] for x in stats]
    summary = {
        "images": len(stats),
        "total_seconds": round(total, 2),
        "render_seconds_sum": round(sum(render_secs), 2),
        "seconds_per_image_mean": round(sum(render_secs) / len(stats), 3),
        "seconds_first_image": render_secs[0],
        "seconds_per_image_mean_excluding_first": round(sum(render_secs[1:]) / max(1, len(stats) - 1), 3),
        "png_bytes_mean": round(sum(sizes) / len(sizes)),
        "png_bytes_min": min(sizes),
        "png_bytes_max": max(sizes),
        "blender": rig.blender_version(),
    }
    os.makedirs(os.path.dirname(os.path.abspath(a.stats)), exist_ok=True)
    with open(a.stats, "w") as f:
        json.dump({"summary": summary, "per_image": stats}, f, indent=1)

    if a.all:
        manifest = {
            "id": ASSET_ID,
            "version": ship.SHIP_VERSION,
            "status": "muestra",
            "license": "muestra interna",
            "generator": {
                "scripts": SCRIPTS,
                "sources_sha256": sources_sha256(),
                "blender": rig.blender_version(),
                "engine": "BLENDER_EEVEE",
                "samples": rig.EEVEE_SAMPLES,
                "command": "Blender -b -P tools/blender/render.py -- --all",
            },
            "image": {"width": rig.RESOLUTION, "height": rig.RESOLUTION, "format": "png", "mode": "RGBA",
                      "transparent_border_px": 4},
            "projection": {
                "type": "dimetric-2:1",
                "camera_elevation_deg": rig.CAMERA_ELEVATION_DEG,
                "camera_azimuth_deg": rig.CAMERA_AZIMUTH_DEG,
                "ortho_scale": rig.ORTHO_SCALE,
                "pixels_per_unit": round(rig.pixels_per_unit(), 4),
                "pivot_px": list(rig.PIVOT_PX),
            },
            "coordinates": "píxeles continuos; (0,0) = esquina superior izquierda, y crece hacia abajo; "
                           "el centro del píxel (i,j) está en (i+0.5, j+0.5)",
            "anchors_doc": {
                "pivot": "punto de contacto con el agua bajo el centro del casco; fijo en todas las imágenes",
                "mast_top": "tope del mástil (ancla de la bandera)",
                "slot_passenger": "pie de la pasajera sobre la cubierta",
                "wake_origin": "popa a la altura del agua: origen de la estela",
                "bow": "roda a la altura del agua; bow - wake_origin da el rumbo del casco en pantalla",
            },
            "skins": list(ship.SKINS),
            "direction_order": ship.DIRECTIONS,
            "directions": directions,
            "animations": {"bob": {"skin": BOB_SKIN, "direction": BOB_DIRECTION, "frames": BOB_FRAMES,
                                   "fps": BOB_FPS, "loop": True, "passenger": False}},
            "images": images,
        }
        with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
            f.write("\n")

    print("RENDER_SUMMARY " + json.dumps(summary))


if __name__ == "__main__":
    main()
