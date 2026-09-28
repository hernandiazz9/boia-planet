"""Hoja de contacto del barco en todos sus estilos, sobre agua y a escala de juego (T11).

    Blender -b -P tools/blender/contact_sheet_estilos.py
    Blender -b -P tools/blender/contact_sheet_estilos.py -- --art tools/blender/out/rerun --out /tmp/h.png --dpr 3

Una fila por estilo, en el orden de `style_variants` del manifiesto raíz con el
estilo actual (`muestra`) arriba: boceto a lápiz, acuarela, low-poly,
semi-realista, arcilla, cartoon años 30, cel-shaded y pixel-art. En cada fila,
las 8 direcciones (S, SW, W, NW, N, NE, E, SE) sin pasajera y después las 8
con pasajera. Escala de juego: la del motor, que es la del estilo por defecto
(su eslora en la vista W = 48 px, D-15) para el mundo y para todos los barcos:
todo sale de la misma cámara y cada remolcador se ve a su tamaño modelado.
`--dpr` la multiplica (2 = pantalla de densidad 2).
"""
import argparse
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from contact_sheet import REPO, SHIP_LENGTH, load_rgba, over, panel, scaled, water, write_png  # noqa: E402

import json  # noqa: E402

CELL_W, CELL_H = 64, 86            # px CSS por imagen
BASELINE = 64                      # px CSS desde arriba de la celda hasta el pivote
GROUP_GAP = 24                     # separación entre sin y con pasajera
ROW_GAP = 4


def load_manifest(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--art", default=os.path.join(REPO, "art"))
    ap.add_argument("--out", default=os.path.join(REPO, "docs", "informes", "img", "p001-t11-barco-estilos.png"))
    ap.add_argument("--dpr", type=float, default=2.0)
    a = ap.parse_args(argv)
    ship_dir = os.path.join(os.path.abspath(a.art), "barco")
    root = load_manifest(os.path.join(ship_dir, "manifest.json"))
    styles = [(root["style"], ship_dir)] + [
        (v["id"], os.path.dirname(os.path.join(ship_dir, v["manifest"]))) for v in root["style_variants"]]

    D = a.dpr
    w = root["directions"]["W"]["anchors"]
    s = SHIP_LENGTH / np.hypot(w["bow"][0] - w["wake_origin"][0], w["bow"][1] - w["wake_origin"][1]) * D
    dirs = root["direction_order"]
    W = int((16 * CELL_W + GROUP_GAP + 16) * D)
    rows = []
    for sid, sdir in styles:
        m = load_manifest(os.path.join(sdir, "manifest.json"))
        pv = m["projection"]["pivot_px"]
        row = water(W, int(CELL_H * D), seed=len(rows) + 3)
        for g, suffix in enumerate(("", "_p")):
            for k, d in enumerate(dirs):
                cx = (8 + g * (8 * CELL_W + GROUP_GAP) + k * CELL_W + CELL_W / 2) * D
                img = scaled(load_rgba(os.path.join(sdir, "base", d + suffix + ".png")), s)
                over(row, img, cx - pv[0] * s, BASELINE * D - pv[1] * s)
        rows.append(row)
        rows.append(panel(W, int(ROW_GAP * D)))
        w = m["directions"]["W"]["anchors"]
        length = np.hypot(w["bow"][0] - w["wake_origin"][0], w["bow"][1] - w["wake_origin"][1]) * s / D
        print("fila %d: %s (eslora en pantalla %.0f px)" % (len(rows) // 2, sid, length))
    sheet = np.concatenate(rows[:-1], axis=0)
    write_png(a.out, sheet)
    print("CONTACT_SHEET %s %dx%d estilos=%d dpr=%.1f" % (
        os.path.relpath(a.out, REPO), sheet.shape[1], sheet.shape[0], len(styles), D))


if __name__ == "__main__":
    main()
