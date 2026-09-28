"""Comprueba el título 3D de la entrada (art/intro/titulo/, kind "title-sheet"; titulo.py).

check.py lo llama con su lector de PNG (`Png`); también se puede correr solo:

    python3 tools/blender/intro/check_titulo.py [--art RAIZ] [--diff OTRA/RAIZ]

Reglas: el manifiesto describe una rejilla fila = letra, columna = fotograma que
coincide con el PNG; cada celda tiene su letra con un margen transparente (nada
cortado ni sangrando a la vecina), centrada en el pivote; el giro cambia la
imagen de una columna a otra; la WebP que pide la web mide lo mismo; y el
manifiesto viene del titulo.py actual (sources_sha256). Con --diff, los
archivos tienen que ser idénticos byte a byte a los de otra corrida.
"""
import hashlib
import json
import os
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BLENDER_DIR = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(BLENDER_DIR))
SUBDIR = os.path.join("intro", "titulo")
MARGIN_PX = 4                 # franja transparente mínima alrededor de cada letra
CENTER_TOL_PX = 12            # a guiñada ~0 la caja de la letra se centra en el pivote (x) a ± esto
MIN_TURN_PX = 400             # píxeles que tienen que cambiar entre la primera y la última columna
REQUIRED = ["id", "kind", "version", "status", "license", "text", "images", "sheet", "frames",
            "cap_px", "pivot_px", "word", "letters", "generator"]


def webp_size(path):
    """(ancho, alto) de una WebP (VP8X, VP8L o VP8), o None."""
    with open(path, "rb") as f:
        d = f.read(40)
    if d[:4] != b"RIFF" or d[8:12] != b"WEBP":
        return None
    tag = d[12:16]
    if tag == b"VP8X":
        w = 1 + int.from_bytes(d[24:27], "little")
        h = 1 + int.from_bytes(d[27:30], "little")
        return w, h
    if tag == b"VP8L":
        b = int.from_bytes(d[21:25], "little")
        return 1 + (b & 0x3FFF), 1 + ((b >> 14) & 0x3FFF)
    if tag == b"VP8 ":
        w, h = struct.unpack("<HH", d[26:30])
        return w & 0x3FFF, h & 0x3FFF
    return None


def cell_bbox(p, x0, y0, w, h):
    xs0 = ys0 = None
    xs1 = ys1 = -1
    ch = p.channels
    for y in range(y0, y0 + h):
        row = p.px[(y * p.w + x0) * ch:(y * p.w + x0 + w) * ch]
        alpha = row[ch - 1::ch]
        idx = [i for i, a in enumerate(alpha) if a]
        if not idx:
            continue
        ys0 = y - y0 if ys0 is None else ys0
        ys1 = y - y0
        xs0 = idx[0] if xs0 is None else min(xs0, idx[0])
        xs1 = max(xs1, idx[-1])
    return None if xs0 is None else (xs0, ys0, xs1, ys1)


def cell_diff(p, ax, bx, y0, w, h):
    ch = p.channels
    n = 0
    for y in range(y0, y0 + h):
        a = p.px[(y * p.w + ax) * ch:(y * p.w + ax + w) * ch]
        b = p.px[(y * p.w + bx) * ch:(y * p.w + bx + w) * ch]
        n += sum(1 for i in range(0, len(a), ch) if a[i:i + ch] != b[i:i + ch])
    return n


def check_title(art, Png, diff_root=None):
    """-> (label, kind, fails, info, n_imágenes). Sin carpeta: un fallo (la entrada la necesita)."""
    label = SUBDIR.replace(os.sep, "/")
    fails, info = [], []
    res = os.path.join(art, SUBDIR)
    mpath = os.path.join(res, "manifest.json")
    if not os.path.exists(mpath):
        return label, "title-sheet", ["falta %s (Blender -b -P tools/blender/intro/titulo.py)" % os.path.relpath(mpath, REPO)], info, 0
    with open(mpath, encoding="utf-8") as f:
        man = json.load(f)
    missing = [k for k in REQUIRED if k not in man]
    if missing:
        return label, "title-sheet", ["faltan campos: %s" % missing], info, 0
    if man["id"] != label:
        fails.append("id %r; la carpeta es %r" % (man["id"], label))
    if man["kind"] != "title-sheet":
        fails.append("kind %r (se espera title-sheet)" % man["kind"])
    if man["status"] not in ("muestra", "aprobada"):
        fails.append("status %r" % man["status"])
    text, sheet, frames, letters = man["text"], man["sheet"], man["frames"], man["letters"]
    rows, cols = sheet["rows"], sheet["cols"]
    cw, chh = sheet["cell"]
    if rows != len(text) or len(letters) != len(text):
        fails.append("%d filas y %d letras para %r" % (rows, len(letters), text))
    if frames["count"] != cols or cols < 2:
        fails.append("frames.count %r; la hoja tiene %d columnas" % (frames["count"], cols))
    y0, y1 = frames["yaw_deg"]
    if not y0 < y1:
        fails.append("yaw_deg %r: tiene que crecer" % frames["yaw_deg"])
    if sheet["width"] != cols * cw or sheet["height"] != rows * chh:
        fails.append("hoja %dx%d; la rejilla da %dx%d" % (sheet["width"], sheet["height"], cols * cw, rows * chh))
    if list(man["pivot_px"]) != [cw / 2, chh / 2]:
        fails.append("pivot_px %r; se espera el centro de la celda" % man["pivot_px"])
    prev = -1.0
    for i, L in enumerate(letters):
        if i < len(text) and L.get("char") != text[i]:
            fails.append("letra %d: %r, el texto dice %r" % (i, L.get("char"), text[i]))
        if L.get("row") != i:
            fails.append("letra %d: fila %r" % (i, L.get("row")))
        if not (L["center_px"] > prev and 0 < L["width_px"] < cw):
            fails.append("letra %d: center_px %r / width_px %r" % (i, L["center_px"], L["width_px"]))
        prev = L["center_px"]
    if letters and abs(letters[-1]["center_px"] + letters[-1]["width_px"] / 2 - man["word"]["width_px"]) > 0.05:
        fails.append("word.width_px %r no acaba en la última letra" % man["word"]["width_px"])

    gen = man["generator"]
    for s in gen.get("scripts", []):
        if not os.path.exists(os.path.join(REPO, s)):
            fails.append("generator.scripts: no existe %s" % s)
    h = hashlib.sha256()
    for s in gen.get("scripts", []):
        with open(os.path.join(REPO, s), "rb") as f:
            h.update(f.read())
    if h.hexdigest() != gen.get("sources_sha256"):
        fails.append("sources_sha256 no es el de %s: hay que volver a renderizar" % gen.get("scripts"))

    files = [man["images"].get("png"), man["images"].get("webp")]
    for fn in files:
        if not fn or not os.path.exists(os.path.join(res, fn)):
            fails.append("falta la imagen %r" % fn)
    if fails:
        return label, "title-sheet", fails, info, 0

    p = Png(os.path.join(res, man["images"]["png"]))
    if (p.w, p.h) != (sheet["width"], sheet["height"]) or not p.has_alpha:
        fails.append("PNG %dx%d%s; el manifiesto dice %dx%d RGBA" % (
            p.w, p.h, "" if p.has_alpha else " sin alfa", sheet["width"], sheet["height"]))
        return label, "title-sheet", fails, info, 1
    ws = webp_size(os.path.join(res, man["images"]["webp"]))
    if ws != (sheet["width"], sheet["height"]):
        fails.append("WebP %r; el manifiesto dice %dx%d" % (ws, sheet["width"], sheet["height"]))

    mid = min(range(cols), key=lambda c: abs(y0 + (y1 - y0) * c / (cols - 1)))
    for r in range(rows):
        ch_ = text[r] if r < len(text) else "?"
        worst = None
        for c in range(cols):
            bb = cell_bbox(p, c * cw, r * chh, cw, chh)
            if bb is None:
                fails.append("%s, columna %d: celda vacía" % (ch_, c))
                continue
            m = min(bb[0], bb[1], cw - 1 - bb[2], chh - 1 - bb[3])
            worst = m if worst is None else min(worst, m)
            if m < MARGIN_PX:
                fails.append("%s, columna %d: la letra toca el borde de la celda (margen %d px < %d)" % (ch_, c, m, MARGIN_PX))
            if c == mid:
                cx = (bb[0] + bb[2] + 1) / 2
                if abs(cx - cw / 2) > CENTER_TOL_PX:
                    fails.append("%s: a guiñada ~0 el centro cae en x=%.1f, pivote %.1f" % (ch_, cx, cw / 2))
        turn = cell_diff(p, 0, (cols - 1) * cw, r * chh, cw, chh)
        if turn < MIN_TURN_PX:
            fails.append("%s: el giro apenas cambia la imagen (%d px)" % (ch_, turn))
        info.append("%s: margen mínimo %s px, el giro cambia %d px" % (ch_, worst, turn))

    if diff_root:
        other = os.path.join(diff_root, SUBDIR)
        for fn in files + ["manifest.json"]:
            a, b = os.path.join(res, fn), os.path.join(other, fn)
            if not os.path.exists(b):
                fails.append("--diff: falta %s" % os.path.relpath(b, REPO))
                continue
            with open(a, "rb") as fa, open(b, "rb") as fb:
                if fa.read() != fb.read():
                    fails.append("--diff: %s no es idéntico byte a byte" % fn)
    return label, "title-sheet", fails, info, 2


def main():
    import argparse
    sys.path.insert(0, BLENDER_DIR)
    from check import Png
    ap = argparse.ArgumentParser()
    ap.add_argument("--art", default=os.path.join(REPO, "art"))
    ap.add_argument("--diff", default=None, help="raíz de otra corrida (con intro/titulo/ dentro)")
    a = ap.parse_args()
    label, kind, fails, info, n = check_title(a.art, Png, a.diff)
    for line in info:
        print("%s: %s" % (label, line))
    for f in fails:
        print("FALLO %s: %s" % (label, f))
    print("%s (%s): %s" % (label, kind, "%d fallos" % len(fails) if fails else "%d imágenes, manifest válido" % n))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
