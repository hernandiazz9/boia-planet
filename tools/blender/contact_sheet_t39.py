"""Hojas de contacto de T39: las skins de todos los barcos y las boias con la mascota de BOIA.

    Blender -b -P tools/blender/contact_sheet_t39.py -- --sheet skins
    Blender -b -P tools/blender/contact_sheet_t39.py -- --sheet boias
    ... --art tools/blender/out/rerun --out /tmp/h.png

skins (docs/informes/img/p004-t39-skins.png): una fila por barco (el por defecto
arriba y después los 8 estilos, en el orden de style_variants); en cada fila las
skins base, noche y fiesta (las que tenga: B01 sólo base, ship_skins.HELD), y en cada skin las direcciones SE, SW, NW y NE sin
pasajera y SE con ella (la Boia Fiestera, la mascota en pequeño). Sobre agua, a
`--zoom` veces la escala de juego (eslora W = 48 px, D-15) por `--dpr`.

boias (docs/informes/img/p004-t39-boias-mascota.png): arriba el logo
(art/marca/boia-mascota.jpg); después, por mundo (arcilla y acuarela), una fila a
tamaño de render con la primera boia (reposo y habla), la de WhatsApp, las cinco
informativas, la Boia Fiestera pidiendo ayuda, la Fiestera a bordo de su barco
(tripulante sobre slot_passenger) y el marcador de secreto; y debajo la misma
fila a escala de juego (× dpr).
"""
import argparse
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from contact_sheet import REPO, SHIP_LENGTH, load_rgba, over, panel, scaled, water, write_png  # noqa: E402

SKINS = ["base", "noche", "fiesta"]
SKIN_DIRS = [("SE", ""), ("SW", ""), ("NW", ""), ("NE", ""), ("SE", "_p")]
WORLDS = ["arcilla", "acuarela"]


def load_manifest(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def game_scale(ship_man):
    w = ship_man["directions"]["W"]["anchors"]
    return SHIP_LENGTH / np.hypot(w["bow"][0] - w["wake_origin"][0], w["bow"][1] - w["wake_origin"][1])


def sheet_skins(art, out, dpr, zoom):
    ship_dir = os.path.join(art, "barco")
    root = load_manifest(os.path.join(ship_dir, "manifest.json"))
    ships = [(root["style"], ship_dir)] + [
        (v["id"], os.path.dirname(os.path.join(ship_dir, v["manifest"]))) for v in root["style_variants"]]
    s = game_scale(root) * zoom * dpr
    cw, ch = 64 * zoom, 84 * zoom          # px CSS por celda
    base_y, gap, n = 62 * zoom, 18, len(SKIN_DIRS)
    W = int((8 + 3 * n * cw + 2 * gap + 8) * dpr)
    rows = []
    for sid, sdir in ships:
        m = load_manifest(os.path.join(sdir, "manifest.json"))
        pv = m["projection"]["pivot_px"]
        row = water(W, int(ch * dpr), seed=len(rows) + 5)
        for g, skin in enumerate(SKINS):
            if skin not in m["skins"]:          # ship_skins.HELD: el hueco queda en agua
                continue
            for k, (d, suf) in enumerate(SKIN_DIRS):
                cx = (8 + g * (n * cw + gap) + k * cw + cw / 2) * dpr
                img = scaled(load_rgba(os.path.join(sdir, skin, d + suf + ".png")), s)
                over(row, img, cx - pv[0] * s, base_y * dpr - pv[1] * s)
        rows.append(row)
        rows.append(panel(W, int(4 * dpr)))
        print("fila %d: %s %s" % (len(rows) // 2, sid, m.get("skins")))
    sheet = np.concatenate(rows[:-1], axis=0)
    write_png(out, sheet)
    print("CONTACT_SHEET %s %dx%d barcos=%d" % (os.path.relpath(out, REPO), sheet.shape[1], sheet.shape[0], len(ships)))


def place(art, wid, pid):
    d = os.path.join(art, "mundos", wid, pid)
    return d, load_manifest(os.path.join(d, "manifest.json"))


def part_of(man, part_id):
    return next(p for p in man["parts"] if p["id"] == part_id)


def items_for(art, wid):
    """(imagen premultiplicada, pivote, extra) de cada boia del mundo, en orden."""
    bdir, boias = place(art, wid, "boias")
    fdir, fiest = place(art, wid, "fiestera")
    sdir, sec = place(art, wid, "secreto")
    out = []
    for pid, files in (("primera", ("idle_0", "habla_0")), ("whatsapp", ("idle_0",))) + tuple(
            ("info_%d" % i, ("idle_0",)) for i in range(1, 6)):
        p = part_of(boias, pid)
        for f in files:
            out.append((load_rgba(os.path.join(bdir, "%s_%s.png" % (pid, f))), p["pivot_px"], None))
    p = part_of(fiest, "fiestera")
    out.append((load_rgba(os.path.join(fdir, "fiestera_pide_0.png")), p["pivot_px"], None))
    # la Fiestera a bordo: el barco del mundo (base, S) con el tripulante sobre slot_passenger
    t = part_of(fiest, "tripulante")
    ship_man = load_manifest(os.path.join(REPO, t["attach"]["sprites"]))
    ship_dir = os.path.dirname(os.path.join(REPO, t["attach"]["sprites"]))
    ship_img = load_rgba(os.path.join(ship_dir, "base", "S.png"))
    slot = ship_man["directions"]["S"]["anchors"]["slot_passenger"]
    trip = load_rgba(os.path.join(fdir, "tripulante_baile_0.png"))
    out.append((ship_img, ship_man["projection"]["pivot_px"], (trip, t["pivot_px"], slot)))
    p = part_of(sec, "secreto")
    out.append((load_rgba(os.path.join(sdir, "secreto_brillo_0.png")), p["pivot_px"], None))
    return out


def draw_row(items, s, seed, pad=10):
    """Una fila sobre agua: cada imagen en su celda (ancho de la imagen escalada), pivotes en la misma línea."""
    above = max(pv[1] * s for _, pv, _ in items)
    below = max((img.shape[0] - pv[1]) * s for img, pv, _ in items)
    widths = [max(img.shape[1] * s, 60) + pad for img, _, _ in items]
    base_y = above + pad
    row = water(int(sum(widths) + 2 * pad), int(base_y + below + pad), seed=seed)
    x = pad
    for (img, pv, extra), w in zip(items, widths):
        cx = x + w / 2
        over(row, scaled(img, s), cx - pv[0] * s, base_y - pv[1] * s)
        if extra:
            trip, tpv, slot = extra
            sx, sy = cx + (slot[0] - pv[0]) * s, base_y + (slot[1] - pv[1]) * s
            over(row, scaled(trip, s), sx - tpv[0] * s, sy - tpv[1] * s)
        x += w
    return row


def sheet_boias(art, out, dpr, zoom):
    ship_root = load_manifest(os.path.join(art, "barco", "manifest.json"))
    g = game_scale(ship_root) * dpr
    rows = []
    blocks = []
    for i, wid in enumerate(WORLDS):
        items = items_for(art, wid)
        big = draw_row(items, zoom, seed=11 + i)
        small = draw_row(items, g, seed=21 + i)
        blocks += [big, small]
    W = max(b.shape[1] for b in blocks)
    logo = load_rgba(os.path.join(REPO, "art", "marca", "boia-mascota.jpg"))
    lh = 220
    head = panel(W, lh + 16)
    over(head, scaled(logo, lh / logo.shape[0]), 8, 8)
    rows.append(head)
    for b in blocks:
        if b.shape[1] < W:
            b = np.concatenate([b, panel(W - b.shape[1], b.shape[0])], axis=1)
        rows += [b, panel(W, 6)]
    sheet = np.concatenate(rows[:-1], axis=0)
    write_png(out, sheet)
    print("CONTACT_SHEET %s %dx%d mundos=%s" % (os.path.relpath(out, REPO), sheet.shape[1], sheet.shape[0], WORLDS))


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--sheet", choices=["skins", "boias"], required=True)
    ap.add_argument("--art", default=os.path.join(REPO, "art"))
    ap.add_argument("--out")
    ap.add_argument("--dpr", type=float, default=2.0)
    ap.add_argument("--zoom", type=float)
    a = ap.parse_args(argv)
    art = os.path.abspath(a.art)
    img = os.path.join(REPO, "docs", "informes", "img")
    if a.sheet == "skins":
        sheet_skins(art, a.out or os.path.join(img, "p004-t39-skins.png"), a.dpr, a.zoom or 1.5)
    else:
        sheet_boias(art, a.out or os.path.join(img, "p004-t39-boias-mascota.png"), a.dpr, a.zoom or 1.0)


if __name__ == "__main__":
    main()
