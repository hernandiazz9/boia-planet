"""Renderiza todo el arte de art/ y escribe un manifiesto por recurso.

    Blender -b -P tools/blender/render.py -- --all
    Blender -b -P tools/blender/render.py -- --all --out tools/blender/out/rerun
    Blender -b -P tools/blender/render.py -- --only isla-evento --only costa
    Blender -b -P tools/blender/render.py -- --skin base --skin noche     # barco parcial, sin manifiesto
    Blender -b -P tools/blender/render.py -- --all --style muestra         # estilo: tools/blender/styles/<nombre>.py

Salida (en --out, por defecto art/), una carpeta por recurso:
    barco/          <skin>/<dir>.png, <skin>/<dir>_p.png (con pasajera), base/S_bob_<n>.png
    isla-evento/, isla-pequena/, roca-a/, roca-b/    base.png
    boia-tutorial/  idle_<n>.png (bucle de reposo)
    costa/          izquierda.png, derecha.png (losas que se repiten en vertical)
    planeta/        globo.png, nubes.png, banda-mar.png, isla.png (capas de la entrada)
y manifest.json en cada una. Los tiempos van a tools/blender/out/render_stats.json.
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
import rig    # noqa: E402
import ship   # noqa: E402
import style  # noqa: E402
import world  # noqa: E402

REPO = os.path.dirname(os.path.dirname(HERE))
ASSET_ID = "barco"
BOB_FRAMES = 8
BOB_FPS = 8
BOB_SKIN, BOB_DIRECTION = "base", "S"
ANCHOR_NAMES = ["pivot", "mast_top", "slot_passenger", "wake_origin", "bow"]
RESOURCES = ["barco", "isla-evento", "isla-pequena", "boia-tutorial", "roca-a", "roca-b", "costa", "planeta"]
COMMAND = "Blender -b -P tools/blender/render.py -- --all"
LICENSE = "muestra interna"


def rel(path):
    return os.path.relpath(path, REPO)


def scripts_for(rid, style_name):
    body = "tools/blender/ship.py" if rid == ASSET_ID else "tools/blender/world.py"
    return ["tools/blender/rig.py", "tools/blender/style.py", "tools/blender/styles/%s.py" % style_name,
            body, "tools/blender/render.py"]


def sources_sha256(scripts):
    h = hashlib.sha256()
    for p in scripts:
        with open(os.path.join(REPO, p), "rb") as f:
            h.update(f.read())
    return h.hexdigest()


def generator(rid, style_name):
    scripts = scripts_for(rid, style_name)
    return {
        "scripts": scripts,
        "sources_sha256": sources_sha256(scripts),
        "blender": rig.blender_version(),
        "engine": "BLENDER_EEVEE",
        "samples": rig.EEVEE_SAMPLES,
        "command": COMMAND,
    }


def write_manifest(out_dir, manifest):
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")


def render_to(scene, path, stats):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene.render.filepath = path
    t0 = time.perf_counter()
    bpy.ops.render.render(write_still=True)
    dt = time.perf_counter() - t0
    stats.append({"file": path, "seconds": round(dt, 3), "bytes": os.path.getsize(path)})


# --- Barco ------------------------------------------------------------------
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


def render_ship(skins, out_dir, stats, full, style_name):
    scene = rig.reset_scene()
    rig.setup_render(scene)
    cam = rig.add_camera(scene)
    rig.add_sun(scene)
    s = ship.build_ship()
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

    if full:
        manifest = {
            "id": ASSET_ID,
            "kind": "ship",
            "version": ship.SHIP_VERSION,
            "status": "muestra",
            "license": LICENSE,
            "style": style_name,
            "generator": generator(ASSET_ID, style_name),
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
        write_manifest(out_dir, manifest)
    return len(images)


# --- Mundo ------------------------------------------------------------------
def render_world(rid, S, out_dir, stats):
    """Un recurso del mundo: renderiza sus PNG y escribe su manifiesto."""
    if rid in world.ISLANDS:
        body = world.island_manifest(world.render_island(S, rid, out_dir, stats))
    elif rid in world.ROCKS:
        body = world.render_rock(S, rid, out_dir, stats)
    elif rid == "boia-tutorial":
        body = world.render_buoy(S, out_dir, stats)
    elif rid == "costa":
        body = world.render_coast(S, out_dir, stats)
    elif rid == "planeta":
        body = world.render_planet(S, out_dir, stats)
    else:
        raise ValueError(rid)
    manifest = {
        "id": rid,
        "kind": body.pop("kind"),
        "category": body.pop("category"),
        "version": world.WORLD_VERSION,
        "status": "muestra",
        "license": LICENSE,
        "style": S.NAME,
        "generator": generator(rid, S.NAME),
        "projection": {
            "type": "dimetric-2:1",
            "camera_elevation_deg": rig.CAMERA_ELEVATION_DEG,
            "camera_azimuth_deg": rig.CAMERA_AZIMUTH_DEG,
            "pixels_per_unit": round(world.PPU, 4),
        },
        "scale": {
            "pixels_per_unit": round(world.PPU, 4),
            "reference": ASSET_ID,
            "doc": "misma densidad que los sprites del barco: el motor dibuja este recurso con la misma escala "
                   "que aplica al barco (D-15) y todo el arte queda proporcionado. Una unidad de Blender mide "
                   "pixels_per_unit px en horizontal y la mitad en vertical sobre el agua",
        },
        "coordinates": "píxeles continuos; (0,0) = esquina superior izquierda, y crece hacia abajo; "
                       "el centro del píxel (i,j) está en (i+0.5, j+0.5). En los círculos sobre el agua "
                       "(hitbox_hint, proximity_hint) radius_px es el semieje horizontal; el vertical mide la mitad",
    }
    manifest.update(body)
    write_manifest(out_dir, manifest)
    return len(manifest["images"])


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="todos los recursos y sus manifiestos")
    ap.add_argument("--only", action="append", choices=RESOURCES, help="sólo este recurso (repetible)")
    ap.add_argument("--skin", action="append", choices=sorted(ship.SKINS), help="barco parcial, sin manifiesto")
    ap.add_argument("--style", default=style.DEFAULT, choices=style.available())
    ap.add_argument("--out", default=os.path.join(REPO, "art"), help="carpeta raíz; cada recurso va en <out>/<id>")
    ap.add_argument("--stats", default=os.path.join(HERE, "out", "render_stats.json"))
    a = ap.parse_args(argv)
    if not a.all and not a.skin and not a.only:
        ap.error("usá --all, --only <recurso> o al menos un --skin")
    S = style.load(a.style)
    ship.use_style(a.style)
    root = os.path.abspath(a.out)
    todo = RESOURCES if a.all else (a.only or [])

    t_start = time.perf_counter()
    stats = []
    counts = {}
    if ASSET_ID in todo or a.skin:
        full = ASSET_ID in todo
        counts[ASSET_ID] = render_ship(list(ship.SKINS) if full else a.skin, os.path.join(root, ASSET_ID),
                                       stats, full, S.NAME)
    for rid in todo:
        if rid != ASSET_ID:
            counts[rid] = render_world(rid, S, os.path.join(root, rid), stats)

    total = time.perf_counter() - t_start
    render_secs = [x["seconds"] for x in stats]
    sizes = [x["bytes"] for x in stats]
    summary = {
        "images": len(stats),
        "per_resource": counts,
        "total_seconds": round(total, 2),
        "render_seconds_sum": round(sum(render_secs), 2),
        "seconds_per_image_mean": round(sum(render_secs) / len(stats), 3),
        "png_bytes_mean": round(sum(sizes) / len(sizes)),
        "png_bytes_min": min(sizes),
        "png_bytes_max": max(sizes),
        "blender": rig.blender_version(),
        "style": S.NAME,
    }
    os.makedirs(os.path.dirname(os.path.abspath(a.stats)), exist_ok=True)
    with open(a.stats, "w") as f:
        json.dump({"summary": summary, "per_image": [dict(x, file=rel(x["file"])) for x in stats]}, f, indent=1)
    print("RENDER_SUMMARY " + json.dumps(summary))


if __name__ == "__main__":
    main()
