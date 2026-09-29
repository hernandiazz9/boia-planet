"""Hoja de contacto de un mundo: todo su arte sobre su mar, a escala de juego.

    Blender -b -P tools/blender/contact_sheet_mundo.py -- --mundo arcilla
    Blender -b -P tools/blender/contact_sheet_mundo.py -- --mundo arcilla --art tools/blender/out/rerun --out /tmp/h.png
    Blender -b -P tools/blender/contact_sheet_mundo.py -- --mundo acuarela --out docs/informes/img/p002-t19-hoja-acuarela.png

Escala de juego: la de contact_sheet.py (el barco del mundo mide SHIP_LENGTH px de
eslora, D-15) por `--dpr` (2 = pantalla de densidad 2). Todo el arte del mundo
comparte pixels_per_unit con el barco, así que todo queda proporcionado.

Una fila por lugar (art/mundos/<mundo>/<lugar>/manifest.json), con su id; cada
pieza con su id, y las animaciones fotograma a fotograma. Las losas de costa se
repiten dos periodos. La primera fila es el barco del mundo solo y con la Boia
Fiestera en el slot TRIPULANTE (pieza fiestera/tripulante). Lee los PNG con
Blender y escribe el PNG con zlib (contact_sheet.write_png).
"""
import argparse
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import contact_sheet as CS  # noqa: E402

REPO = os.path.dirname(os.path.dirname(HERE))
SEA = {"arcilla": (0x1A, 0x7A, 0xA6),          # mundos/temas.py: Arcilla.HEX["sea"]
       "acuarela": (0x5F, 0xB3, 0xAE)}         # mundos/acuarela/tema.py: HEX["sea"]
SHIP_STYLE = {"arcilla": "arcilla", "acuarela": "acuarela"}     # art/barco/estilos/<estilo>
INK = (0x23, 0x1C, 0x1A)
PAPER = (0xFF, 0xF7, 0xEC)

# Letra de 5×7 para los rótulos (mayúsculas, cifras y algo de puntuación).
GLYPHS = {
    "A": " ### |#   #|#   #|#####|#   #|#   #|#   #", "B": "#### |#   #|#   #|#### |#   #|#   #|#### ",
    "C": " ### |#   #|#    |#    |#    |#   #| ### ", "D": "#### |#   #|#   #|#   #|#   #|#   #|#### ",
    "E": "#####|#    |#    |#### |#    |#    |#####", "F": "#####|#    |#    |#### |#    |#    |#    ",
    "G": " ### |#   #|#    |# ###|#   #|#   #| ####", "H": "#   #|#   #|#   #|#####|#   #|#   #|#   #",
    "I": " ### |  #  |  #  |  #  |  #  |  #  | ### ", "J": "  ###|   # |   # |   # |   # |#  # | ##  ",
    "K": "#   #|#  # |# #  |##   |# #  |#  # |#   #", "L": "#    |#    |#    |#    |#    |#    |#####",
    "M": "#   #|## ##|# # #|# # #|#   #|#   #|#   #", "N": "#   #|#   #|##  #|# # #|#  ##|#   #|#   #",
    "O": " ### |#   #|#   #|#   #|#   #|#   #| ### ", "P": "#### |#   #|#   #|#### |#    |#    |#    ",
    "Q": " ### |#   #|#   #|#   #|# # #|#  # | ## #", "R": "#### |#   #|#   #|#### |# #  |#  # |#   #",
    "S": " ####|#    |#    | ### |    #|    #|#### ", "T": "#####|  #  |  #  |  #  |  #  |  #  |  #  ",
    "U": "#   #|#   #|#   #|#   #|#   #|#   #| ### ", "V": "#   #|#   #|#   #|#   #|#   #| # # |  #  ",
    "W": "#   #|#   #|#   #|# # #|# # #|# # #| # # ", "X": "#   #|#   #| # # |  #  | # # |#   #|#   #",
    "Y": "#   #|#   #| # # |  #  |  #  |  #  |  #  ", "Z": "#####|    #|   # |  #  | #   |#    |#####",
    "0": " ### |#   #|#  ##|# # #|##  #|#   #| ### ", "1": "  #  | ##  |  #  |  #  |  #  |  #  | ### ",
    "2": " ### |#   #|    #|   # |  #  | #   |#####", "3": "#####|   # |  #  |   # |    #|#   #| ### ",
    "4": "   # |  ## | # # |#  # |#####|   # |   # ", "5": "#####|#    |#### |    #|    #|#   #| ### ",
    "6": "  ## | #   |#    |#### |#   #|#   #| ### ", "7": "#####|    #|   # |  #  | #   | #   | #   ",
    "8": " ### |#   #|#   #| ### |#   #|#   #| ### ", "9": " ### |#   #|#   #| ####|    #|   # | ##  ",
    "-": "     |     |     |#####|     |     |     ", "_": "     |     |     |     |     |     |#####",
    "/": "    #|   # |   # |  #  | #   | #   |#    ", ".": "     |     |     |     |     |     |  #  ",
    ":": "     |  #  |     |     |     |  #  |     ", "(": "   # |  #  | #   | #   | #   |  #  |   # ",
    ")": " #   |  #  |   # |   # |   # |  #  | #   ", " ": "     |     |     |     |     |     |     ",
    "+": "     |  #  |  #  |#####|  #  |  #  |     ", "×": "     |#   #| # # |  #  | # # |#   #|     ",
}
PLAIN = str.maketrans("ÁÉÍÓÚÜÑáéíóúüñ·", "AEIOUUNaeiouun.")


def text(label, k=2, color=PAPER):
    s = label.translate(PLAIN).upper()
    w = max(1, len(s) * 6 * k)
    out = np.zeros((9 * k, w + 2 * k, 4), dtype=np.float32)
    ink = np.array(INK + (255,), dtype=np.float32) / 255.0
    col = np.array(color + (255,), dtype=np.float32) / 255.0
    for off, c in ((1, ink), (0, col)):
        for i, ch in enumerate(s):
            rows = GLYPHS.get(ch, GLYPHS[" "]).split("|")
            for y, row in enumerate(rows):
                for x, bit in enumerate(row):
                    if bit == "#":
                        y0, x0 = (y + off) * k, (i * 6 + x + off) * k
                        out[y0:y0 + k, x0:x0 + k] = c
    return out


def sea(w, h, seed, color):
    """El mar del mundo con algunas crestas más claras (como contact_sheet.water, con otro color)."""
    rng = np.random.default_rng(seed)
    out = np.ones((h, w, 4), dtype=np.float32)
    base = np.array(color, dtype=np.float32) / 255.0
    out[..., :3] = base
    crest = base * 0.55 + 0.45
    for _ in range(int(w * h / 9000)):
        x, y = rng.integers(0, w), rng.integers(0, h)
        L = rng.integers(10, 28)
        out[y:y + 2, x:x + L, :3] = out[y:y + 2, x:x + L, :3] * 0.6 + crest * 0.4
    return out


def load(root, pid):
    with open(os.path.join(root, pid, "manifest.json"), encoding="utf-8") as f:
        return json.load(f)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--mundo", default="arcilla")
    ap.add_argument("--art", default=os.path.join(REPO, "art"))
    ap.add_argument("--out", default=None)
    ap.add_argument("--dpr", type=float, default=2.0)
    ap.add_argument("--ancho", type=int, default=1800)
    a = ap.parse_args(argv)
    art = os.path.abspath(a.art)
    root = os.path.join(art, "mundos", a.mundo)
    out = a.out or os.path.join(REPO, "docs", "informes", "img", "p002-t18-hoja-%s.png" % a.mundo)
    ship_dir = os.path.join(art, "barco", "estilos", SHIP_STYLE[a.mundo])
    with open(os.path.join(ship_dir, "manifest.json"), encoding="utf-8") as f:
        ship = json.load(f)
    w_anc = ship["directions"]["W"]["anchors"]
    ship_len = float(np.hypot(w_anc["bow"][0] - w_anc["wake_origin"][0], w_anc["bow"][1] - w_anc["wake_origin"][1]))
    s = CS.SHIP_LENGTH / ship_len * a.dpr
    D = a.dpr
    W = a.ancho
    pad = int(14 * D)
    with open(os.path.join(HERE, "lugares.json"), encoding="utf-8") as f:
        order = [e["id"] for e in json.load(f)["lugares"]]
    places = [p for p in order if os.path.exists(os.path.join(root, p, "manifest.json"))]

    rows = []

    def flush(items, title):
        """Coloca los elementos (imagen, rótulo) en estantes de ancho W; devuelve el bloque."""
        head = text(title, k=3)
        shelves, cur, x, hmax = [], [], pad, 0
        for img, lab in items:
            w = max(img.shape[1], lab.shape[1])
            if cur and x + w > W - pad:
                shelves.append((cur, hmax))
                cur, x, hmax = [], pad, 0
            cur.append((x, img, lab))
            x += w + pad
            hmax = max(hmax, img.shape[0] + lab.shape[0] + int(4 * D))
        if cur:
            shelves.append((cur, hmax))
        H = head.shape[0] + pad + sum(h + pad for _, h in shelves)
        block = sea(W, H, len(rows) + 3, SEA[a.mundo])
        CS.over(block, head, pad, pad // 2)
        y = head.shape[0] + pad
        for items_, h in shelves:
            for x, img, lab in items_:
                CS.over(block, img, x, y + h - lab.shape[0] - img.shape[0] - int(4 * D))
                CS.over(block, lab, x, y + h - lab.shape[0])
            y += h + pad
        rows.append(block)

    # El barco y la tripulante.
    items = []
    for d in ("SE", "S", "W"):
        items.append((CS.scaled(CS.load_rgba(os.path.join(ship_dir, "base", d + ".png")), s), text("barco %s %s" % (a.mundo, d))))
    fi = load(root, "fiestera") if "fiestera" in places else None
    trip = next((p for p in fi["parts"] if p["id"] == "tripulante"), None) if fi else None
    if trip:
        for d in ("SE", "S", "W"):
            base = CS.load_rgba(os.path.join(ship_dir, "base", d + ".png"))
            t = CS.load_rgba(os.path.join(root, "fiestera", trip["images"][0]["file"]))
            slot = ship["directions"][d]["anchors"]["slot_passenger"]
            CS.over(base, t, slot[0] - trip["pivot_px"][0], slot[1] - trip["pivot_px"][1])
            items.append((CS.scaled(base, s), text("tripulante %s" % d)))
    flush(items, "%s: barco y tripulante" % a.mundo)

    for pid in places:
        man = load(root, pid)
        items = []
        for p in man["parts"]:
            ims = p["images"]
            if p.get("tile"):
                t = CS.load_rgba(os.path.join(root, pid, ims[0]["file"]))
                t = np.concatenate([t, t], axis=0 if p["tile"]["axis"] == "y" else 1)
                items.append((CS.scaled(t, s), text("%s  (losa x2)" % p["id"])))
                continue
            for im in ims:
                lab = p["id"]
                if im.get("animation"):
                    lab += " %s %d" % (im["animation"], im["frame"])
                elif im.get("variant"):
                    lab += " %s" % im["variant"]
                items.append((CS.scaled(CS.load_rgba(os.path.join(root, pid, im["file"])), s), text(lab)))
        name = man["place"].get("name") or ""
        flush(items, "%s  %s%s" % (pid, name, "  (isla de evento)" if man["place"]["event_island"] else ""))

    sheet = np.concatenate(rows, axis=0)
    CS.write_png(out, sheet)
    print("CONTACT_SHEET %s %dx%d escala=%.4f (juego %.4f × dpr %.1f), %d lugares" % (
        os.path.relpath(out, REPO), sheet.shape[1], sheet.shape[0], s, s / a.dpr, a.dpr, len(places)))


if __name__ == "__main__":
    main()
