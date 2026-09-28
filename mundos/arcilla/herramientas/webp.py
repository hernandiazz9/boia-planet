#!/usr/bin/env python3
"""Convierte los maestros PNG de render/ a WebP para el visor, con tope de peso.

    python3 mundos/arcilla/herramientas/webp.py [--dir mundos/arcilla/render]

Topes: vista general 900 KB por hora; primer plano 250 KB. Busca la mayor
calidad de cwebp (-q) que queda por debajo del tope, entre 50 y 92. cwebp es
determinista: el mismo PNG da el mismo WebP. Escribe webp.json con el peso y
la calidad de cada imagen.
"""
import argparse
import json
import os
import subprocess
import sys

import mapa

LIMITS = {"general": 900 * 1024, "primer": 250 * 1024}


def encode(src, dst, q):
    subprocess.run(["cwebp", "-quiet", "-q", str(q), "-m", "6", "-sharp_yuv", "-metadata", "none", src, "-o", dst], check=True)
    return os.path.getsize(dst)


def best(src, dst, limit):
    lo, hi, found = 50, 92, None
    while lo <= hi:
        q = (lo + hi) // 2
        if encode(src, dst, q) <= limit:
            found, lo = q, q + 1
        else:
            hi = q - 1
    if found is None:
        found = 50
    size = encode(src, dst, found)
    return found, size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.path.join(mapa.ARCILLA, "render"))
    a = ap.parse_args()
    out, bad = {}, 0
    for fn in sorted(os.listdir(a.dir)):
        if not fn.endswith(".png"):
            continue
        kind = "general" if "general-" in fn else "primer"
        src = os.path.join(a.dir, fn)
        dst = src[:-4] + ".webp"
        q, size = best(src, dst, LIMITS[kind])
        ok = size <= LIMITS[kind]
        bad += not ok
        out[fn[:-4] + ".webp"] = {"calidad": q, "kb": round(size / 1024, 1), "tope_kb": LIMITS[kind] // 1024, "ok": ok}
        print("%-28s q=%2d %7.1f KB / %d KB %s" % (fn[:-4] + ".webp", q, size / 1024, LIMITS[kind] // 1024, "" if ok else "SUPERA EL TOPE"))
    with open(os.path.join(a.dir, "webp.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
