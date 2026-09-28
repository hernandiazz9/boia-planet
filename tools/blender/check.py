#!/usr/bin/env python3
"""Comprueba todo el arte de art/ y sus manifiestos. Python del sistema, sin dependencias.

    python3 tools/blender/check.py                 # valida cada art/<id>/manifest.json
    python3 tools/blender/check.py --diff          # además compara con tools/blender/out/rerun/<id>
    python3 tools/blender/check.py --diff OTRA/DIR
    python3 tools/blender/check.py --art OTRA/RAIZ

El barco (kind "ship") se valida con manifest.schema.json y sus reglas del
encargo 01; el resto (sprite, tile, layers) con asset.schema.json y las reglas
de check_world(). Tienen que existir todos los recursos que lista render.py.
Exit 0 si todo pasa; 1 si algo falla (lista cada fallo).
"""
import argparse
import ast
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


def check_ship(ship_dir, diff_dir=None):
    class _A:
        pass
    a = _A()
    a.dir, a.diff = ship_dir, diff_dir
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
    return fails, info, len(pngs)


# --- Recursos del mundo (sprite, tile, layers) --------------------------------
TILE_FILL_MIN = 0.99               # fracción del borde de tierra que tiene que ser exactamente outer_fill
TILE_LAND_COLS = 2                 # columnas del lado de tierra que tienen que ser opacas
TILE_WATER_COLS = 4                # columnas del lado del agua que tienen que ser transparentes
SEAM_FACTOR = 3.0                  # la costura vertical no puede saltar más que 3× la mediana entre filas vecinas
REQUIRED_BY_KIND = {
    "sprite": ["image", "pivot_px", "anchors", "anchors_on_art", "footprint", "hitbox_hint"],
    "tile": ["image", "tile"],
    "layers": ["layers"],
}


def alpha_row(p, y):
    stride = p.w * p.channels
    return p.px[y * stride + p.channels - 1:(y + 1) * stride:p.channels]


def opaque_bbox(p):
    """Como Png.alpha_bbox, pero por filas (rápido en imágenes grandes)."""
    x0, y0, x1, y1 = p.w, None, -1, None
    for y in range(p.h):
        r = alpha_row(p, y)
        body = r.lstrip(b"\0")
        if not body:
            continue
        y0 = y if y0 is None else y0
        y1 = y
        x0 = min(x0, len(r) - len(body))
        x1 = max(x1, len(r.rstrip(b"\0")) - 1)
    return None if y0 is None else (x0, y0, x1, y1)


def border_opaque_fast(p, b):
    n = 0
    for y in range(p.h):
        r = alpha_row(p, y)
        if y < b or y >= p.h - b:
            n += len(r) - r.count(0)
        else:
            n += (b - r[:b].count(0)) + (b - r[-b:].count(0))
    return n


def row_diff(p, y0, y1):
    stride = p.w * p.channels
    a, b = p.px[y0 * stride:(y0 + 1) * stride], p.px[y1 * stride:(y1 + 1) * stride]
    return sum(abs(x - y) for x, y in zip(a, b)) / float(stride)


def inside(pt, w, h):
    return 0 <= pt[0] <= w and 0 <= pt[1] <= h


def check_sprite(man, pngs, fails, info):
    W, H = man["image"]["width"], man["image"]["height"]
    pv = man["pivot_px"]
    anchors = man["anchors"]
    if anchors.get("pivot") != pv:
        fails.append("anchors.pivot %r no coincide con pivot_px %r" % (anchors.get("pivot"), pv))
    missing_doc = sorted(set(anchors) - set(man["anchors_doc"]))
    if missing_doc:
        fails.append("anclajes sin documentar en anchors_doc: %s" % missing_doc)
    for im in man["images"]:
        anc = im.get("anchors", anchors)
        for k, pt in anc.items():
            if not inside(pt, W, H):
                fails.append("%s: anclaje %s fuera de la imagen %r" % (im["file"], k, pt))
        if max(abs(anc["pivot"][0] - pv[0]), abs(anc["pivot"][1] - pv[1])) > 0.05:
            fails.append("%s: el pivote se mueve %r" % (im["file"], anc["pivot"]))
        p = pngs.get(im["file"])
        for k in man["anchors_on_art"]:
            if k not in anc:
                fails.append("%s: anchors_on_art nombra %r, que no es un anclaje" % (im["file"], k))
            elif p and not p.near_opaque(anc[k], ANCHOR_NEAR_PX):
                fails.append("%s: el anclaje %s %r no cae sobre el arte" % (im["file"], k, anc[k]))
    # Huella, colisión y proximidad: coherentes entre sí y con la proyección 2:1.
    ppu = man["scale"]["pixels_per_unit"]
    pts = man["footprint"]["points_px"]
    for pt in pts:
        if not inside(pt, W, H):
            fails.append("huella: punto fuera de la imagen %r" % (pt,))
    radii = [math.hypot(x - pv[0], 2.0 * (y - pv[1])) for x, y in pts]     # radio en el agua, en px horizontales
    hit = man["hitbox_hint"]
    for name in ("hitbox_hint", "proximity_hint"):
        c = man.get(name)
        if c is None:
            continue
        if c["center_px"] != pv:
            fails.append("%s: el centro %r no es el pivote %r" % (name, c["center_px"], pv))
        if abs(c["radius_units"] * ppu - c["radius_px"]) > 0.05:
            fails.append("%s: radius_units × pixels_per_unit (%.2f) ≠ radius_px (%.2f)" % (
                name, c["radius_units"] * ppu, c["radius_px"]))
    if not min(radii) <= hit["radius_px"] <= max(radii) * 1.02:
        fails.append("hitbox_hint: radio %.1f px fuera de la huella (%.1f a %.1f)" % (hit["radius_px"], min(radii), max(radii)))
    r = hit["radius_px"]
    if not (0 <= pv[0] - r and pv[0] + r <= W and 0 <= pv[1] - r / 2 and pv[1] + r / 2 <= H):
        fails.append("hitbox_hint: la elipse de %.1f px no cabe en la imagen" % r)
    prox = man.get("proximity_hint")
    if prox and prox["radius_px"] < hit["radius_px"]:
        fails.append("proximity_hint más pequeño que hitbox_hint")
    info.append("huella %d puntos, radio %.0f–%.0f px; colisión %.0f px%s" % (
        len(pts), min(radii), max(radii), hit["radius_px"], "; proximidad %.0f px" % prox["radius_px"] if prox else ""))
    # Animaciones: fotogramas 0..n-1, con movimiento de verdad.
    for name, spec in man.get("animations", {}).items():
        frames = sorted((im["frame"], im["file"]) for im in man["images"] if im.get("animation") == name)
        if [f for f, _ in frames] != list(range(spec["frames"])):
            fails.append("animación %s: fotogramas %r, se esperaban 0..%d" % (name, [f for f, _ in frames], spec["frames"] - 1))
            continue
        distinct = len({bytes(pngs[f].px) for _, f in frames if f in pngs})
        if distinct < max(2, spec["frames"] // 2):
            fails.append("animación %s: sólo %d fotogramas distintos de %d" % (name, distinct, spec["frames"]))
        info.append("animación %s: %d fotogramas a %s fps, %d distintos" % (name, spec["frames"], spec["fps"], distinct))
    for im in man["images"]:
        if "animation" not in im and im["frame"] != 0:
            fails.append("%s: imagen fija con frame %d" % (im["file"], im["frame"]))


def check_tile(man, pngs, fails, info):
    W, H = man["image"]["width"], man["image"]["height"]
    t = man["tile"]
    if t["axis"] != "y" or t["period_px"] != H:
        fails.append("tile: sólo se admite axis y con period_px = alto de la imagen (%d)" % H)
        return
    files = sorted(v["file"] for v in t["variants"].values())
    if files != sorted(im["file"] for im in man["images"]):
        fails.append("tile: las variantes %s no son las imágenes del manifiesto" % files)
    for name, v in t["variants"].items():
        p = pngs.get(v["file"])
        if not p:
            continue
        left = v["land_side"] == "left"
        fill = tuple(int(v["outer_fill"][i:i + 2], 16) for i in (1, 3, 5))
        land_cols = range(TILE_LAND_COLS) if left else range(W - TILE_LAND_COLS, W)
        water_cols = range(W - TILE_WATER_COLS, W) if left else range(TILE_WATER_COLS)
        not_opaque = sum(1 for y in range(H) for x in land_cols if p.alpha(x, y) != 255)
        if not_opaque:
            fails.append("%s: %d píxeles no opacos en el borde de tierra" % (v["file"], not_opaque))
        same = 0
        for y in range(H):
            for x in land_cols:
                i = (y * W + x) * p.channels
                same += tuple(p.px[i:i + 3]) == fill
        frac = same / float(H * len(land_cols))
        if frac < TILE_FILL_MIN:
            fails.append("%s: sólo el %.1f %% del borde de tierra es outer_fill %s" % (v["file"], 100 * frac, v["outer_fill"]))
        not_clear = sum(1 for y in range(H) for x in water_cols if p.alpha(x, y) != 0)
        if not_clear:
            fails.append("%s: %d píxeles no transparentes en el borde del agua" % (v["file"], not_clear))
        s = v["shore_x_px"]
        c = v["collision_x_px"]
        if not (0 < s["min"] <= s["mean"] <= s["max"] < W):
            fails.append("%s: shore_x_px incoherente %r" % (v["file"], s))
        if not (0 < c < W) or (left and c <= s["max"]) or (not left and c >= s["min"]):
            fails.append("%s: collision_x_px %.1f no queda del lado del agua de la orilla" % (v["file"], c))
        # Los números tienen que describir el arte: tierra opaca antes de la orilla, agua detrás de la colisión.
        land_x = int(s["min"] - 4) if left else int(s["max"] + 4)
        water_x = int(c + 2) if left else int(c - 2)
        bad_land = sum(1 for y in range(H) if p.alpha(land_x, y) != 255)
        bad_water = sum(1 for y in range(H) if p.alpha(water_x, y) == 255)
        if bad_land:
            fails.append("%s: en x=%d (antes de la orilla) hay %d filas sin tierra opaca" % (v["file"], land_x, bad_land))
        if bad_water:
            fails.append("%s: en x=%d (pasada la colisión) hay %d filas opacas" % (v["file"], water_x, bad_water))
        # Costura: la última fila tiene que continuar en la primera como dos filas vecinas cualesquiera.
        diffs = sorted(row_diff(p, y, y + 1) for y in range(H - 1))
        median = diffs[len(diffs) // 2]
        seam = row_diff(p, H - 1, 0)
        limit = max(SEAM_FACTOR * median, diffs[int(0.95 * len(diffs))])
        if seam > limit:
            fails.append("%s: la costura vertical salta %.2f (límite %.2f)" % (v["file"], seam, limit))
        info.append("%s: tierra a la %s, orilla %.0f–%.0f px, colisión %.0f px, relleno %s (%.1f %%), costura %.2f (mediana %.2f, límite %.2f)" % (
            name, "izquierda" if left else "derecha", s["min"], s["max"], c, v["outer_fill"], 100 * frac, seam, median, limit))


def check_layers(man, pngs, fails, info, known_ids):
    layers = man["layers"]
    ids = [l["id"] for l in layers]
    by_id = {l["id"]: l for l in layers}
    if len(set(ids)) != len(ids):
        fails.append("capas repetidas: %r" % ids)
    if sorted(l["file"] for l in layers) != sorted(im["file"] for im in man["images"]):
        fails.append("las capas no son las imágenes del manifiesto")
    for im in man["images"]:
        l = by_id.get(im.get("layer"))
        if not l or l["file"] != im["file"]:
            fails.append("%s: la imagen no apunta a su capa (%r)" % (im["file"], im.get("layer")))
    for l in layers:
        p = pngs.get(l["file"])
        if not p:
            continue
        for k, pt in l["anchors"].items():
            if not inside(pt, l["width"], l["height"]):
                fails.append("%s: anclaje %s fuera de la capa %r" % (l["id"], k, pt))
        for k in l["anchors_on_art"]:
            if k not in l["anchors"]:
                fails.append("%s: anchors_on_art nombra %r, que no es un anclaje" % (l["id"], k))
            elif not p.near_opaque(l["anchors"][k], ANCHOR_NEAR_PX):
                fails.append("%s: el anclaje %s %r no cae sobre el arte" % (l["id"], k, l["anchors"][k]))
        ca = l.get("clear_around")
        if ca:
            cx, cy = l["anchors"][ca["anchor"]]
            r = ca["radius_px"]
            n = sum(1 for y in range(max(0, int(cy - r)), min(p.h, int(cy + r) + 1))
                    for x in range(max(0, int(cx - r)), min(p.w, int(cx + r) + 1))
                    if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r and p.alpha(x, y))
            if n:
                fails.append("%s: %d píxeles no transparentes a menos de %.0f px de %s" % (l["id"], n, r, ca["anchor"]))
        for target, anchor in l.get("place_on", {}).items():
            if target not in by_id or anchor not in by_id[target]["anchors"]:
                fails.append("%s: place_on apunta a %s.%s, que no existe" % (l["id"], target, anchor))
        if "matches" in l and l["matches"] not in known_ids:
            fails.append("%s: matches %r no es un recurso de art/" % (l["id"], l["matches"]))
        info.append("capa %s: %dx%d, %.2f px/unidad%s" % (
            l["id"], l["width"], l["height"], l["pixels_per_unit"], ", sobre %s" % ", ".join(sorted(l["place_on"])) if l.get("place_on") else ""))


def check_world(res_dir, schema, diff_dir, known_ids):
    fails, info = [], []
    with open(os.path.join(res_dir, "manifest.json"), encoding="utf-8") as f:
        man = json.load(f)
    fails += validate(man, schema, schema)
    if man.get("id") != os.path.basename(res_dir):
        fails.append("el id %r no es el nombre de la carpeta" % man.get("id"))
    for k in REQUIRED_BY_KIND.get(man.get("kind"), []):
        if k not in man:
            fails.append("kind %s exige %r" % (man.get("kind"), k))
    if fails:
        return fails, info, 0
    listed = [im["file"] for im in man["images"]]
    if len(set(listed)) != len(listed):
        fails.append("imágenes repetidas en el manifiesto")
    on_disk = sorted(os.path.relpath(os.path.join(dp, fn), res_dir)
                     for dp, _, fns in os.walk(res_dir) for fn in fns if fn.endswith(".png"))
    if on_disk != sorted(listed):
        fails.append("en disco hay %s; el manifiesto lista %s" % (on_disk, sorted(listed)))
    if man["kind"] == "layers":
        dims = {l["file"]: (l["width"], l["height"], l["transparent_border_px"]) for l in man["layers"]}
    else:
        im = man["image"]
        dims = {f: (im["width"], im["height"], im["transparent_border_px"]) for f in listed}
    pngs = {}
    for name in listed:
        path = os.path.join(res_dir, name)
        if not os.path.exists(path) or name not in dims:
            continue
        p = Png(path)
        pngs[name] = p
        w, h, border = dims[name]
        if (p.w, p.h) != (w, h):
            fails.append("%s: mide %dx%d, se esperaba %dx%d" % (name, p.w, p.h, w, h))
        if not p.has_alpha:
            fails.append("%s: sin canal alfa" % name)
            continue
        if opaque_bbox(p) is None:
            fails.append("%s: imagen vacía" % name)
        if border:
            n = border_opaque_fast(p, border)
            if n:
                fails.append("%s: %d píxeles no transparentes en el borde de %d px" % (name, n, border))
    if man["kind"] == "sprite":
        check_sprite(man, pngs, fails, info)
    elif man["kind"] == "tile":
        check_tile(man, pngs, fails, info)
    else:
        check_layers(man, pngs, fails, info, known_ids)
    if diff_dir:
        same, worst = 0, (0.0, None)
        for name, p in sorted(pngs.items()):
            other = os.path.join(diff_dir, name)
            if not os.path.exists(other):
                fails.append("--diff: falta %s" % other)
                continue
            with open(other, "rb") as f1, open(os.path.join(res_dir, name), "rb") as f2:
                if f1.read() == f2.read():
                    same += 1
                    continue
            b = Png(other)
            frac = diff_pixels(p, b) / float(p.w * p.h) if (b.w, b.h) == (p.w, p.h) else 1.0
            if frac > worst[0]:
                worst = (frac, name)
            if frac > MAX_DIFF_FRACTION:
                fails.append("--diff: %s difiere en %.3f %% de píxeles" % (name, 100 * frac))
        info.append("diff: %d/%d PNG idénticos byte a byte; peor %.4f %% (%s)" % (same, len(pngs), 100 * worst[0], worst[1]))
    sizes = [p.size for p in pngs.values()]
    if sizes:
        info.append("PNG: %d bytes en total, máx %d" % (sum(sizes), max(sizes)))
    return fails, info, len(pngs)


def expected_resources():
    """La lista RESOURCES de render.py: el check exige exactamente esas carpetas."""
    with open(os.path.join(HERE, "render.py"), encoding="utf-8") as f:
        tree = ast.parse(f.read())
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", None) == "RESOURCES" for t in node.targets):
            return ast.literal_eval(node.value)
    raise ValueError("render.py no define RESOURCES")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--art", default=os.path.join(REPO, "art"), help="raíz con una carpeta por recurso")
    ap.add_argument("--diff", nargs="?", const=os.path.join(HERE, "out", "rerun"), default=None,
                    help="otra salida de render.py -- --all (misma estructura) con la que comparar")
    a = ap.parse_args()
    with open(os.path.join(HERE, "asset.schema.json"), encoding="utf-8") as f:
        schema = json.load(f)
    expected = expected_resources()
    found = sorted(d for d in os.listdir(a.art) if os.path.exists(os.path.join(a.art, d, "manifest.json")))
    total_fails = 0
    if sorted(expected) != found:
        print("FALLO recursos: render.py lista %s; en %s hay %s" % (sorted(expected), os.path.relpath(a.art, REPO), found))
        total_fails += 1
    counts = {}
    for rid in [r for r in expected if r in found] + [r for r in found if r not in expected]:
        res_dir = os.path.join(a.art, rid)
        diff_dir = os.path.join(a.diff, rid) if a.diff else None
        with open(os.path.join(res_dir, "manifest.json"), encoding="utf-8") as f:
            kind = json.load(f).get("kind", "ship")
        if kind == "ship":
            fails, info, n = check_ship(res_dir, diff_dir)
        else:
            fails, info, n = check_world(res_dir, schema, diff_dir, found)
        for line in info:
            print("%s: %s" % (rid, line))
        for f in fails:
            print("FALLO %s: %s" % (rid, f))
        if fails:
            print("%s (%s): %d fallos" % (rid, kind, len(fails)))
        else:
            print("%s (%s): %d %s, manifest válido" % (rid, kind, n, "imagen" if n == 1 else "imágenes"))
            counts[rid] = n
        total_fails += len(fails)
    if total_fails:
        print("%d fallos" % total_fails)
        return 1
    print("%d manifiestos válidos, %d imágenes (%s)" % (
        len(counts), sum(counts.values()), ", ".join("%s %d" % kv for kv in counts.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
