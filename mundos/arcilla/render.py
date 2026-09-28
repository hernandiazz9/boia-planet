"""Renderiza el mundo de arcilla: vista general y primeros planos, por horas. MUESTRA.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P mundos/arcilla/render.py -- [opciones]

Opciones:
    --tema arcilla|papel|cartoon   (arcilla por defecto; papel y cartoon sólo hacen la vista general de día)
    --horas dia atardecer noche
    --vistas general cala ...      (general y los ids de zona; por defecto todas)
    --escala 0.5                   (previsualizar a media resolución)
    --muestras 64                  (muestras de Eevee; por defecto las del estilo)
    --solo cala costas ...         (construir sólo esas zonas: iterar rápido)
    --out DIR                      (por defecto mundos/arcilla/render)

Salida en --out: <vista>-<hora>.png (maestros) y <vista>.json, con la
proyección en píxeles (rig.project_px) de zonas, lugares, rutas, circuito,
costas, colisión, proximidad y secretos para las capas del visor. El JSON es
de la vista: todas sus horas usan la misma cámara. tiempos.json guarda el
tiempo de cada imagen.
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
MUNDOS = os.path.dirname(HERE)
ROOT = os.path.dirname(MUNDOS)
for p in (os.path.join(ROOT, "tools", "blender"), MUNDOS, HERE, os.path.join(HERE, "herramientas")):
    if p not in sys.path:
        sys.path.insert(0, p)
import temas  # noqa: E402
import rig  # noqa: E402
import mapa as MAPA  # noqa: E402
import escena  # noqa: E402

GENERAL_PPU = 88.2759          # px por unidad: la densidad de los sprites del barco (rig.pixels_per_unit())
PRIMER_W, PRIMER_H = 1200, 900


def screen_bounds(pts):
    xs, ys = zip(*(rig.screen_offset_px(p, ppu=1.0) for p in pts))
    return min(xs), max(xs), min(ys), max(ys)


def general_camera(M, scale):
    E = M["limites"]["encuadre_general"]
    corners = [Vector(MAPA.to_blender(x, y)) for x in E["x"] for y in E["y"]]
    x0, x1, y0, y1 = screen_bounds(corners)
    ppu = GENERAL_PPU * scale
    W = int(round((x1 - x0) * ppu / 2)) * 2
    H = int(round((y1 - y0) * ppu / 2)) * 2
    pivot = (-x0 * ppu, -y0 * ppu)
    return W, H, ppu, pivot, Vector((0, 0, 0))


def primer_camera(Z, scale):
    pp = Z["primer_plano"]
    W, H = int(round(PRIMER_W * scale)), int(round(PRIMER_H * scale))
    ppu = W / pp["ancho"]
    return W, H, ppu, (W / 2.0, H * 0.58), Vector(MAPA.to_blender(*pp["centro"]))


def place_camera(scene, W, H, ppu, pivot, origin):
    cam = rig.add_camera(scene, width=W, height=H, pivot_px=pivot, ppu=ppu, origin=origin)
    _, _, forward = rig.camera_basis()
    cam.location = cam.location - forward * 170.0        # lejos: nada del mundo queda detrás de la cámara
    cam.data.clip_end = 500.0
    scene.render.resolution_x, scene.render.resolution_y = W, H
    bpy.context.view_layer.update()
    return cam


def export(scene, cam, B, M, W, H, ppu, vista, horas, tema):
    """Proyección en píxeles de todo lo que dibujan las capas del visor."""
    def px(x, y, z=None):
        if z is None:
            z = max(0.0, B.gz(x, y))
        u, v = rig.project_px(scene, cam, Vector(MAPA.to_blender(x, y, z)))
        return [round(u, 1), round(v, 1)]

    def line(pts, z=0.0):
        return [px(x, y, z) for x, y in pts]

    out = {"estado": "muestra", "vista": vista, "tema": tema, "horas": list(horas), "imagen": [W, H],
           "ppu": round(ppu, 4), "barco_ppu_sprite": 88.2759,
           "nota": "Píxeles de la imagen: (0,0) arriba a la izquierda. Rutas y contornos a la altura del agua; lugares sobre el terreno.",
           "zonas": {}, "rutas": {}, "circuito": {}, "costas": {}, "colision": [], "proximidad": [], "secretos": [],
           "restos": [], "solares": []}
    for Z in M["zonas"]:
        z = {"n": Z["n"], "nombre": Z["nombre"], "centro": px(*Z["centro"], 0.0), "rotulo": px(*Z.get("rotulo", Z["centro"]), 0.0),
             "contorno": line(Z["contorno"]), "lugares": {}}
        for lg in Z.get("lugares", []):
            z["lugares"][lg["id"]] = {"nombre": lg["nombre"], "px": px(*lg["pos"])}
        out["zonas"][Z["id"]] = z
        for pr in Z.get("proximidad", []):
            out["proximidad"].append({"zona": Z["id"], "objeto": pr["objeto"], "radio": pr["radio"],
                                      "poly": line(MAPA.circle(pr["centro"], pr["radio"], 40))})
    R = M["rutas"]
    for key in ("principal", "directa", "mision", "exploracion"):
        out["rutas"][key] = line(R[key]["puntos"])
    out["rutas"]["desvios"] = {d["id"]: {"nombre": d["nombre"], "puntos": line(d["puntos"])} for d in R["desvios"]}
    C = M["circuito"]
    for key in ("comun", "segura", "atajo", "final"):
        out["circuito"][key] = line(C[key])
    out["circuito"]["checkpoints"] = {c["id"]: px(*c["pos"], 0.0) for c in C["checkpoints"]}
    out["circuito"]["obstaculos"] = {o["id"]: px(*o["pos"], 0.0) for o in C["obstaculos"]}
    for key in ("salida", "meta", "cartel_atajo"):
        out["circuito"][key] = px(*C[key], 0.0)
    for c in M["costas"]:
        out["costas"][c["id"]] = {"tipo": c["tipo"], "linea": line(c["linea"])}
    for zid, isla in MAPA.all_islands(M):
        out["colision"].append({"grupo": zid, "id": isla["id"], "poly": line(MAPA.outline(isla, 48))})
    for s in M["secretos"]:
        out["secretos"].append({"id": s["id"], "nombre": s["nombre"], "px": px(*s["pos"])})
    mv = next(z for z in M["zonas"] if z["id"] == "marvivo")
    out["restos"] = [px(*p, 0.0) for p in mv["restos"]]
    for s in M["solares_l2"]:
        out["solares"].append({"id": s["id"], "nombre": s["nombre"], "px": px(*s["pos"])})
    return out


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--tema", default="arcilla")
    ap.add_argument("--horas", nargs="*", default=None)
    ap.add_argument("--vistas", nargs="*", default=None)
    ap.add_argument("--escala", type=float, default=1.0)
    ap.add_argument("--muestras", type=int, default=None)
    ap.add_argument("--solo", nargs="*", default=None)
    ap.add_argument("--variante", default="venta", choices=("venta", "recuerdo"))
    ap.add_argument("--solo-json", action="store_true", help="exportar los JSON de proyección sin renderizar")
    ap.add_argument("--out", default=os.path.join(HERE, "render"))
    a = ap.parse_args(argv)
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)
    M = MAPA.load()
    t0 = time.time()
    tema = temas.TEMAS[a.tema]()
    horas = a.horas or (["dia", "atardecer", "noche"] if a.tema == "arcilla" else ["dia"])
    vistas = a.vistas or (["general"] + [z["id"] for z in M["zonas"]] if a.tema == "arcilla" else ["general"])
    scene = tema.setup(1024, 1024)
    if a.muestras:
        scene.eevee.taa_render_samples = a.muestras
    B = escena.build(tema, temas.A, M, solo=a.solo, variante=a.variante)
    tema.lights(scene, B)
    t_build = time.time() - t0
    log = {"tema": a.tema, "escala": a.escala, "muestras": scene.eevee.taa_render_samples,
           "blender": bpy.app.version_string, "construccion_s": round(t_build, 2), "objetos": len(bpy.data.objects),
           "imagenes": []}
    prefix = "" if a.tema == "arcilla" else a.tema + "-"
    suffix = "" if a.variante == "venta" else "-" + a.variante
    cams = {}
    for vista in vistas:
        if vista == "general":
            cams[vista] = general_camera(M, a.escala)
        else:
            Z = next(z for z in M["zonas"] if z["id"] == vista)
            cams[vista] = primer_camera(Z, a.escala)
    # Una pasada por hora: cambiar la luz es caro, mover la cámara no.
    for hora in horas:
        tema.hora(scene, B, hora)
        for vista in vistas:
            if vista != "general" and hora == "atardecer":
                continue                      # primeros planos: día y noche
            W, H, ppu, pivot, origin = cams[vista]
            for o in [o for o in scene.objects if o.type == "CAMERA"]:
                bpy.data.objects.remove(o, do_unlink=True)
            cam = place_camera(scene, W, H, ppu, pivot, origin)
            if suffix:
                pass                          # la variante usa la misma cámara y el mismo JSON que su vista
            elif hora == horas[0] or a.solo_json or not os.path.exists(os.path.join(out, prefix + vista + ".json")):
                data = export(scene, cam, B, M, W, H, ppu, vista, [h for h in horas if vista == "general" or h != "atardecer"], a.tema)
                with open(os.path.join(out, prefix + vista + ".json"), "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
                    f.write("\n")
            if a.solo_json:
                continue
            name = "%s%s%s-%s.png" % (prefix, vista, suffix, hora)
            scene.render.filepath = os.path.join(out, name)
            t = time.time()
            bpy.ops.render.render(write_still=True)
            log["imagenes"].append({"archivo": name, "w": W, "h": H, "s": round(time.time() - t, 2)})
            print("[arcilla] %s %.1fs" % (name, time.time() - t))
    if a.solo_json:
        print("[arcilla] JSON exportados en %.1fs" % (time.time() - t0))
        return
    log["total_s"] = round(time.time() - t0, 2)
    with open(os.path.join(out, prefix + "tiempos" + suffix + ".json"), "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("[arcilla] total %.1fs, %d imágenes, %d objetos" % (log["total_s"], len(log["imagenes"]), log["objetos"]))


main()
