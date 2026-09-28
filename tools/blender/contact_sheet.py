"""Hoja de contacto del arte del mundo sobre agua, a escala de juego.

    Blender -b -P tools/blender/contact_sheet.py
    Blender -b -P tools/blender/contact_sheet.py -- --art tools/blender/out/try --out /tmp/hoja.png --dpr 2

Escala de juego: la misma que aplica el motor al barco para que su eslora
(bow - wake_origin en la vista W) mida SHIP_LENGTH px (48, D-15). Todo el arte
comparte pixels_per_unit con el barco, así que todo va a esa escala. `--dpr`
multiplica el resultado (2 = pantalla de densidad 2).

Filas:
  1. Mundo de muestra: costas izquierda y derecha repetidas en vertical, isla de
     evento, isla pequeña, dos rocas, boia tutorial y el barco (base/SE).
  2. Los fotogramas del bucle de la boia tutorial, de izquierda a derecha.
  3. Planeta (escala de la entrada, no de juego): globo + nubes + isla, y la
     banda de mar + isla.
Lee los PNG con Blender y escribe el PNG con zlib: sin gestión de color.
"""
import argparse
import json
import os
import struct
import sys
import zlib

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
SHIP_LENGTH = 48.0
WATER = (0x0F, 0x5F, 0x7D)
WAVE = (0x2A, 0x8F, 0xAE)
BG = (0xF4, 0xEF, 0xE6)


def load_rgba(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1].copy()
    bpy.data.images.remove(img)
    a[..., :3] *= a[..., 3:4]            # alfa premultiplicado para mezclar y escalar
    return a


def resample_matrix(n_in, n_out):
    """Promedio de área (caja) de n_in muestras a n_out."""
    m = np.zeros((n_out, n_in), dtype=np.float32)
    scale = n_in / float(n_out)
    for i in range(n_out):
        a, b = i * scale, (i + 1) * scale
        j0, j1 = int(np.floor(a)), int(np.ceil(b))
        for j in range(j0, min(j1, n_in)):
            m[i, j] = min(b, j + 1) - max(a, j)
        m[i] /= m[i].sum()
    return m


def scaled(a, s):
    h, w = a.shape[:2]
    ho, wo = max(1, int(round(h * s))), max(1, int(round(w * s)))
    R, C = resample_matrix(h, ho), resample_matrix(w, wo)
    tmp = (R @ a.reshape(h, w * 4)).reshape(ho, w, 4)                       # filas
    return (tmp.transpose(0, 2, 1) @ C.T).transpose(0, 2, 1).copy()        # columnas


def over(dst, src, x, y):
    """Pega `src` (premultiplicada) sobre `dst` con su esquina en (x, y); recorta en los bordes."""
    x, y = int(round(x)), int(round(y))
    h, w = src.shape[:2]
    H, W = dst.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x0 >= x1 or y0 >= y1:
        return
    s = src[y0 - y:y1 - y, x0 - x:x1 - x]
    d = dst[y0:y1, x0:x1]
    dst[y0:y1, x0:x1] = s + d * (1.0 - s[..., 3:4])


def water(w, h, seed=0):
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w, 4), dtype=np.float32)
    out[..., :3] = np.array(WATER) / 255.0
    out[..., 3] = 1.0
    wave = np.array(WAVE) / 255.0
    for _ in range(int(w * h / 9000)):
        x, y = rng.integers(0, w), rng.integers(0, h)
        L = rng.integers(10, 28)
        out[y:y + 2, x:x + L, :3] = out[y:y + 2, x:x + L, :3] * 0.45 + wave * 0.55
    return out


def panel(w, h, color=BG):
    out = np.zeros((h, w, 4), dtype=np.float32)
    out[..., :3] = np.array(color) / 255.0
    out[..., 3] = 1.0
    return out


def write_png(path, a):
    a = np.clip(a, 0.0, 1.0)
    rgb = np.where(a[..., 3:4] > 0, a[..., :3] / np.maximum(a[..., 3:4], 1e-6), 0.0)
    img = (np.concatenate([rgb, a[..., 3:4]], axis=2) * 255.0 + 0.5).astype(np.uint8)
    h, w = img.shape[:2]
    raw = b"".join(b"\x00" + img[y].tobytes() for y in range(h))

    def chunk(t, data):
        c = struct.pack(">I", len(data)) + t + data
        return c + struct.pack(">I", zlib.crc32(t + data) & 0xFFFFFFFF)

    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def manifest(root, rid):
    with open(os.path.join(root, rid, "manifest.json"), encoding="utf-8") as f:
        return json.load(f)


def sprite_at(dst, root, rid, file, cx, cy, s, pivot=None):
    """Dibuja un sprite con su pivote en (cx, cy) de la hoja."""
    m = manifest(root, rid)
    pv = pivot or m.get("pivot_px") or m["projection"]["pivot_px"]
    a = scaled(load_rgba(os.path.join(root, rid, file)), s)
    over(dst, a, cx - pv[0] * s, cy - pv[1] * s)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--art", default=os.path.join(REPO, "art"))
    ap.add_argument("--out", default=os.path.join(REPO, "docs", "informes", "img", "p001-t01-hoja-mundo.png"))
    ap.add_argument("--dpr", type=float, default=2.0)
    a = ap.parse_args(argv)
    root = os.path.abspath(a.art)

    ship = manifest(root, "barco")
    w_anc = ship["directions"]["W"]["anchors"]
    ship_len = np.hypot(w_anc["bow"][0] - w_anc["wake_origin"][0], w_anc["bow"][1] - w_anc["wake_origin"][1])
    s = SHIP_LENGTH / ship_len * a.dpr          # escala de juego × densidad

    W = int(1000 * a.dpr)
    # 1. Mundo de muestra ------------------------------------------------------
    H1 = int(620 * a.dpr)
    world = water(W, H1, 1)
    coast = manifest(root, "costa")
    for name, v in coast["tile"]["variants"].items():
        t = scaled(load_rgba(os.path.join(root, "costa", v["file"])), s)
        th, tw = t.shape[:2]
        x = 0 if v["land_side"] == "left" else W - tw
        for y in range(-th, H1 + th, th):
            over(world, t, x, y)
    D = a.dpr
    sprite_at(world, root, "isla-evento", "base.png", 470 * D, 250 * D, s)
    sprite_at(world, root, "isla-pequena", "base.png", 800 * D, 470 * D, s)
    sprite_at(world, root, "roca-a", "base.png", 250 * D, 470 * D, s)
    sprite_at(world, root, "roca-b", "base.png", 740 * D, 110 * D, s)
    buoy = manifest(root, "boia-tutorial")
    sprite_at(world, root, "boia-tutorial", buoy["images"][0]["file"], 420 * D, 520 * D, s)
    sprite_at(world, root, "barco", "base/SE.png", 520 * D, 560 * D, s)

    # 2. Bucle de la boia -------------------------------------------------------
    frames = buoy["images"]
    cell = int(256 * s) + 8
    H2 = cell + int(24 * D)
    row2 = water(W, H2, 2)
    for k, im in enumerate(frames):
        cx = int(16 * D) + k * cell + cell / 2
        sprite_at(row2, root, "boia-tutorial", im["file"], cx, H2 - 20 * D, s)

    # 3. Planeta ----------------------------------------------------------------
    planet = manifest(root, "planeta")
    L = {l["id"]: l for l in planet["layers"]}
    H3 = int(360 * D)
    row3 = panel(W, H3)
    g = L["globo"]
    gs = (H3 - 20 * D) / g["height"]
    gx, gy = 10 * D, 10 * D
    for lid in ("globo", "nubes"):
        over(row3, scaled(load_rgba(os.path.join(root, "planeta", L[lid]["file"])), gs), gx, gy)
    isla = L["isla"]
    k = gs * g["pixels_per_unit"] / isla["pixels_per_unit"]
    pole = g["anchors"]["polo"]
    mark = scaled(load_rgba(os.path.join(root, "planeta", isla["file"])), k)
    over(row3, mark, gx + pole[0] * gs - isla["anchors"]["pivot"][0] * k, gy + pole[1] * gs - isla["anchors"]["pivot"][1] * k)
    b = L["banda-mar"]
    bx = gx + g["width"] * gs + 20 * D
    bs = (W - bx - 10 * D) / b["width"]
    by = (H3 - b["height"] * bs) / 2
    over(row3, scaled(load_rgba(os.path.join(root, "planeta", b["file"])), bs), bx, by)
    k = bs * b["pixels_per_unit"] / isla["pixels_per_unit"]
    pole = b["anchors"]["polo"]
    mark = scaled(load_rgba(os.path.join(root, "planeta", isla["file"])), k)
    over(row3, mark, bx + pole[0] * bs - isla["anchors"]["pivot"][0] * k, by + pole[1] * bs - isla["anchors"]["pivot"][1] * k)

    gap = panel(W, int(8 * D))
    sheet = np.concatenate([world, gap, row2, gap, row3], axis=0)
    write_png(a.out, sheet)
    print("CONTACT_SHEET %s %dx%d escala=%.4f (juego %.4f × dpr %.1f)" % (
        os.path.relpath(a.out, REPO), sheet.shape[1], sheet.shape[0], s, s / a.dpr, a.dpr))


if __name__ == "__main__":
    main()
