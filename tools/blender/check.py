#!/usr/bin/env python3
"""Comprueba los sprites del barco y su manifiesto. Python del sistema, sin dependencias.

    python3 tools/blender/check.py                 # valida art/barco
    python3 tools/blender/check.py --diff          # además compara con tools/blender/out/rerun
    python3 tools/blender/check.py --diff OTRA/DIR

Exit 0 si todo pasa; 1 si algo falla (lista cada fallo).
"""
import argparse
import json
import math
import os
import re
import struct
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))

# Lo que pide el encargo 01: 3 skins × 8 direcciones × con/sin pasajera + 8 fotogramas de balanceo base/S.
SKINS = ["base", "noche", "fiesta"]
DIRECTIONS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]
BOB = ("base", "S", 8)
BORDER_PX = 4
MAX_DIFF_FRACTION = 0.005          # reproducibilidad: ≤ 0,5 % de píxeles distintos por imagen
MIN_PASSENGER_PX = 150             # píxeles que la pasajera tiene que cambiar como mínimo
HEADING_TOL_DEG = 1.0
ANCHOR_NEAR_PX = 3                 # mast_top y slot_passenger tienen que caer sobre el barco


# --- JSON Schema (subconjunto usado por manifest.schema.json) ---------------
ANNOTATIONS = {"$schema", "$id", "title", "description", "$defs"}
TYPES = {
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
    "string": lambda v: isinstance(v, str),
    "boolean": lambda v: isinstance(v, bool),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
}


def validate(value, schema, root, path="$"):
    errs = []
    if "$ref" in schema:
        ref = schema["$ref"]
        if not ref.startswith("#/"):
            raise ValueError("$ref no soportada: " + ref)
        target = root
        for part in ref[2:].split("/"):
            target = target[part]
        return validate(value, target, root, path)
    for kw in schema:
        if kw in ANNOTATIONS:
            continue
        if kw not in {"type", "const", "enum", "required", "properties", "additionalProperties", "items",
                      "minItems", "maxItems", "minLength", "pattern", "minimum", "maximum"}:
            raise ValueError("palabra clave de esquema no soportada: %s (en %s)" % (kw, path))
    t = schema.get("type")
    if t and not TYPES[t](value):
        return ["%s: se esperaba %s" % (path, t)]
    if "const" in schema and value != schema["const"]:
        errs.append("%s: tiene que valer %r" % (path, schema["const"]))
    if "enum" in schema and value not in schema["enum"]:
        errs.append("%s: %r no está en %r" % (path, value, schema["enum"]))
    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            errs.append("%s: cadena demasiado corta" % path)
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errs.append("%s: %r no cumple %s" % (path, value, schema["pattern"]))
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errs.append("%s: %r < %r" % (path, value, schema["minimum"]))
        if "maximum" in schema and value > schema["maximum"]:
            errs.append("%s: %r > %r" % (path, value, schema["maximum"]))
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            errs.append("%s: menos de %d elementos" % (path, schema["minItems"]))
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errs.append("%s: más de %d elementos" % (path, schema["maxItems"]))
        if "items" in schema:
            for i, item in enumerate(value):
                errs += validate(item, schema["items"], root, "%s[%d]" % (path, i))
    if isinstance(value, dict):
        for k in schema.get("required", []):
            if k not in value:
                errs.append("%s: falta %r" % (path, k))
        props = schema.get("properties", {})
        extra = schema.get("additionalProperties", True)
        for k, v in value.items():
            if k in props:
                errs += validate(v, props[k], root, "%s.%s" % (path, k))
            elif extra is False:
                errs.append("%s: propiedad no permitida %r" % (path, k))
            elif isinstance(extra, dict):
                errs += validate(v, extra, root, "%s.%s" % (path, k))
    return errs


# --- PNG ---------------------------------------------------------------------
class Png:
    def __init__(self, path):
        with open(path, "rb") as f:
            data = f.read()
        if data[:8] != b"\x89PNG\r\n\x1a\n":
            raise ValueError("no es PNG")
        pos, idat = 8, []
        while pos < len(data):
            (length,) = struct.unpack(">I", data[pos:pos + 4])
            ctype, chunk = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + length]
            pos += 12 + length
            if ctype == b"IHDR":
                self.w, self.h, depth, self.color_type, _, _, interlace = struct.unpack(">IIBBBBB", chunk)
            elif ctype == b"IDAT":
                idat.append(chunk)
            elif ctype == b"IEND":
                break
        if depth != 8 or interlace:
            raise ValueError("sólo PNG de 8 bits sin entrelazado (depth=%d)" % depth)
        self.channels = {0: 1, 2: 3, 4: 2, 6: 4}[self.color_type]
        self.has_alpha = self.color_type in (4, 6)
        self.px = self._unfilter(zlib.decompress(b"".join(idat)))
        self.size = len(data)

    def _unfilter(self, raw):
        c, stride = self.channels, self.w * self.channels
        out = bytearray(self.h * stride)
        prev = bytearray(stride)
        i = 0
        for y in range(self.h):
            ft = raw[i]
            line = bytearray(raw[i + 1:i + 1 + stride])
            i += 1 + stride
            if ft == 1:
                for x in range(c, stride):
                    line[x] = (line[x] + line[x - c]) & 255
            elif ft == 2:
                line = bytearray((a + b) & 255 for a, b in zip(line, prev))
            elif ft == 3:
                for x in range(stride):
                    left = line[x - c] if x >= c else 0
                    line[x] = (line[x] + ((left + prev[x]) >> 1)) & 255
            elif ft == 4:
                for x in range(stride):
                    a = line[x - c] if x >= c else 0
                    b = prev[x]
                    cc = prev[x - c] if x >= c else 0
                    p = a + b - cc
                    pa, pb, pc = abs(p - a), abs(p - b), abs(p - cc)
                    pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else cc)
                    line[x] = (line[x] + pr) & 255
            elif ft != 0:
                raise ValueError("filtro PNG desconocido %d" % ft)
            out[y * stride:(y + 1) * stride] = line
            prev = line
        return out

    def alpha(self, x, y):
        return self.px[(y * self.w + x) * self.channels + self.channels - 1]

    def alpha_bbox(self):
        xs, ys = [], []
        for y in range(self.h):
            for x in range(self.w):
                if self.alpha(x, y):
                    xs.append(x)
                    ys.append(y)
        if not xs:
            return None
        return min(xs), min(ys), max(xs), max(ys)

    def border_opaque(self, b):
        n = 0
        for y in range(self.h):
            for x in range(self.w):
                if (x < b or y < b or x >= self.w - b or y >= self.h - b) and self.alpha(x, y):
                    n += 1
        return n

    def near_opaque(self, pt, r):
        cx, cy = int(pt[0]), int(pt[1])
        for y in range(max(0, cy - r), min(self.h, cy + r + 1)):
            for x in range(max(0, cx - r), min(self.w, cx + r + 1)):
                if self.alpha(x, y):
                    return True
        return False


def diff_pixels(a, b, threshold=0):
    """Píxeles en que algún canal difiere más que `threshold`."""
    c = a.channels
    n = 0
    pa, pb = a.px, b.px
    for i in range(0, len(pa), c):
        if pa[i:i + c] != pb[i:i + c]:
            if threshold == 0 or max(abs(x - y) for x, y in zip(pa[i:i + c], pb[i:i + c])) > threshold:
                n += 1
    return n


def expected_files():
    files = []
    for skin in SKINS:
        for p in ("", "_p"):
            for d in DIRECTIONS:
                files.append("%s/%s%s.png" % (skin, d, p))
    skin, d, n = BOB
    files += ["%s/%s_bob_%d.png" % (skin, d, k) for k in range(n)]
    return files


def expected_heading_deg(direction, elevation_deg):
    """Ángulo en pantalla (y hacia abajo, horario) del rumbo del casco en proyección dimétrica."""
    phi = math.radians(45.0 * DIRECTIONS.index(direction))
    sx, sy = -math.sin(phi), math.sin(math.radians(elevation_deg)) * math.cos(phi)
    return math.degrees(math.atan2(sy, sx)) % 360.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.path.join(REPO, "art", "barco"))
    ap.add_argument("--diff", nargs="?", const=os.path.join(HERE, "out", "rerun"), default=None,
                    help="otra salida de render.py -- --all con la que comparar píxel a píxel")
    a = ap.parse_args()
    fails = []
    info = []

    with open(os.path.join(HERE, "manifest.schema.json"), encoding="utf-8") as f:
        schema = json.load(f)
    man_path = os.path.join(a.dir, "manifest.json")
    with open(man_path, encoding="utf-8") as f:
        man = json.load(f)
    fails += validate(man, schema, schema)

    exp = expected_files()
    listed = [im["file"] for im in man.get("images", [])]
    if sorted(listed) != sorted(exp):
        fails.append("el manifiesto lista %d imágenes; faltan %s; sobran %s" % (
            len(listed), sorted(set(exp) - set(listed))[:5], sorted(set(listed) - set(exp))[:5]))
    on_disk = sorted(os.path.relpath(os.path.join(dp, fn), a.dir)
                     for dp, _, fns in os.walk(a.dir) for fn in fns if fn.endswith(".png"))
    if on_disk != sorted(exp):
        fails.append("en disco hay %d PNG; faltan %s; sobran %s" % (
            len(on_disk), sorted(set(exp) - set(on_disk))[:5], sorted(set(on_disk) - set(exp))[:5]))
    for im in man.get("images", []):
        want = "%s/%s%s" % (im["skin"], im["direction"],
                            "_%s_%d" % (im["animation"], im["frame"]) if "animation" in im else ("_p" if im["passenger"] else ""))
        if im["file"] != want + ".png":
            fails.append("%s: skin/direction/frame/passenger no coinciden con el nombre" % im["file"])

    # Imágenes: alfa, borde transparente, márgenes.
    pngs = {}
    margins = []
    W = man["image"]["width"]
    H = man["image"]["height"]
    for name in exp:
        path = os.path.join(a.dir, name)
        if not os.path.exists(path):
            continue
        p = Png(path)
        pngs[name] = p
        if (p.w, p.h) != (W, H):
            fails.append("%s: mide %dx%d, se esperaba %dx%d" % (name, p.w, p.h, W, H))
        if not p.has_alpha:
            fails.append("%s: sin canal alfa" % name)
            continue
        n = p.border_opaque(BORDER_PX)
        if n:
            fails.append("%s: %d píxeles no transparentes en el borde de %d px" % (name, n, BORDER_PX))
        bb = p.alpha_bbox()
        if bb is None:
            fails.append("%s: imagen vacía" % name)
            continue
        margins.append((min(bb[0], bb[1], p.w - 1 - bb[2], p.h - 1 - bb[3]), name, bb))

    # Anclajes: pivote fijo, dentro de la imagen, sobre el barco; rumbo coherente.
    dirs = man.get("directions", {})
    pivot = man["projection"]["pivot_px"]
    elev = man["projection"]["camera_elevation_deg"]
    headings = []
    for d in DIRECTIONS:
        info_d = dirs.get(d)
        if not info_d:
            continue
        anc = info_d["anchors"]
        for k, pt in anc.items():
            if not (0 <= pt[0] <= W and 0 <= pt[1] <= H):
                fails.append("%s: anclaje %s fuera de la imagen %r" % (d, k, pt))
        if max(abs(anc["pivot"][0] - pivot[0]), abs(anc["pivot"][1] - pivot[1])) > 0.05:
            fails.append("%s: el pivote %r no coincide con pivot_px %r" % (d, anc["pivot"], pivot))
        dx, dy = anc["bow"][0] - anc["wake_origin"][0], anc["bow"][1] - anc["wake_origin"][1]
        ang = math.degrees(math.atan2(dy, dx)) % 360.0
        want = expected_heading_deg(d, elev)
        err = (ang - want + 180.0) % 360.0 - 180.0
        headings.append((d, ang, err))
        if abs(err) > HEADING_TOL_DEG:
            fails.append("%s: la proa apunta a %.1f° en pantalla; se esperaba %.1f°" % (d, ang, want))
        for skin in SKINS:
            for name, key in (("%s/%s.png" % (skin, d), "mast_top"), ("%s/%s_p.png" % (skin, d), "slot_passenger")):
                if name in pngs and not pngs[name].near_opaque(anc[key], ANCHOR_NEAR_PX):
                    fails.append("%s: el anclaje %s %r no cae sobre el barco" % (name, key, anc[key]))
    for (d0, a0, _), (d1, a1, _) in zip(headings, headings[1:] + headings[:1]):
        step = (a1 - a0) % 360.0
        if not 15.0 < step < 75.0:
            fails.append("rumbo %s→%s gira %.1f°: la secuencia no es horaria y continua" % (d0, d1, step))
    for im in man.get("images", []):
        if "anchors" in im:
            pv = im["anchors"]["pivot"]
            if max(abs(pv[0] - pivot[0]), abs(pv[1] - pivot[1])) > 0.05:
                fails.append("%s: el pivote se mueve en la animación %r" % (im["file"], pv))
            if im["file"] in pngs and not pngs[im["file"]].near_opaque(im["anchors"]["mast_top"], ANCHOR_NEAR_PX):
                fails.append("%s: mast_top no cae sobre el barco" % im["file"])

    # La pasajera se ve en todas las direcciones y skins.
    pvis = []
    for skin in SKINS:
        for d in DIRECTIONS:
            a0, a1 = pngs.get("%s/%s.png" % (skin, d)), pngs.get("%s/%s_p.png" % (skin, d))
            if a0 and a1:
                n = diff_pixels(a0, a1, threshold=24)
                pvis.append((n, "%s/%s" % (skin, d)))
                if n < MIN_PASSENGER_PX:
                    fails.append("%s/%s_p: la pasajera sólo cambia %d píxeles" % (skin, d, n))

    # Reproducibilidad.
    if a.diff:
        worst = (0.0, None)
        changed = 0
        for name in exp:
            other = os.path.join(a.diff, name)
            if name not in pngs:
                continue
            if not os.path.exists(other):
                fails.append("--diff: falta %s" % other)
                continue
            b = Png(other)
            frac = diff_pixels(pngs[name], b) / float(W * H)
            changed += frac > 0
            if frac > worst[0]:
                worst = (frac, name)
            if frac > MAX_DIFF_FRACTION:
                fails.append("--diff: %s difiere en %.3f %% de píxeles" % (name, 100 * frac))
        info.append("diff contra %s: %d/%d imágenes con algún píxel distinto; peor %.4f %% (%s)" % (
            os.path.relpath(a.diff, REPO), changed, len(pngs), 100 * worst[0], worst[1]))

    if margins:
        m = min(margins)
        info.append("margen mínimo hasta el borde: %d px (%s)" % (m[0], m[1]))
    if pvis:
        m = min(pvis)
        info.append("pasajera: mínimo %d píxeles cambiados (%s); media %d" % (m[0], m[1], sum(n for n, _ in pvis) // len(pvis)))
    if headings:
        info.append("rumbo en pantalla (°): " + ", ".join("%s %.1f" % (d, ang) for d, ang, _ in headings))
    sizes = [p.size for p in pngs.values()]
    if sizes:
        info.append("PNG: media %d bytes, mín %d, máx %d" % (sum(sizes) // len(sizes), min(sizes), max(sizes)))
    for line in info:
        print(line)
    if fails:
        for f in fails:
            print("FALLO " + f)
        print("%d fallos" % len(fails))
        return 1
    print("%d imágenes, manifest válido" % len(pngs))
    return 0


if __name__ == "__main__":
    sys.exit(main())
