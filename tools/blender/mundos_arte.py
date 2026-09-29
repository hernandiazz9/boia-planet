"""Arte de los mundos: un manifiesto por lugar del mapa compartido en art/mundos/<mundo>/<lugar>/.

Cada mundo es un módulo `mundo_<id>.py` (registrado en WORLDS) que describe sus
lugares como piezas (`parts`): qué objetos de su escena forman cada sprite, dónde
cae su pivote en el mapa, sus anclajes, su huella y sus fotogramas. Este módulo
pone la cámara del barco (rig.py: 30°, D-13) con su misma densidad de píxeles,
encuadra, renderiza y escribe los manifiestos (place.schema.json). Las losas de
costa (`tile`) se renderizan con tres periodos y se recorta el del medio, así la
costura no depende de los efectos de pantalla de Eevee.

Contrato de un módulo de mundo:
    ID, STYLE, SHIP                         id del mundo, estilo, barco (docs/barcos/barcos.json)
    new_context(group) -> Ctx               escena nueva para un grupo (fábrica; la resetea entera)
    places() -> [place]                     lugares del catálogo tools/blender/lugares.json, con sus piezas
    scripts(place) -> [ruta]                fuentes que definen el lugar (van al sources_sha256)

Un `place` es {id, name, shared_name, parts: [part]}. Una `part` es un dict:
    id, role, collision, map_pos (x, y) o None, group
    images: [{file, frame, animation?, variant?, group?, origin?, setup(ctx) -> objs}]
    anchors(ctx) -> {nombre: Vector}        opcional; pivot se añade solo
    footprint(ctx) -> [Vector a ras de agua] opcional (obligatorio salvo en losas y esquinas)
    hit_units, prox_units                   opcionales
    animations {nombre: {frames, fps, loop, reverse_of?}}
    tile {...} / corner {...} / attach {...} / no_water / canvas (w, h, pivot)

Opcional en el módulo: postprocess(img, period=None) -> img (RGBA uint8, fila 0 arriba), una pasada sobre
cada imagen recién renderizada (la acuarela la usa); en las losas se aplica a los tres periodos antes de
recortar, con period = (eje, px) para que la pasada también se repita.
"""
import hashlib
import json
import math
import os
import struct
import time
import zlib

import bpy
import numpy as np
from mathutils import Vector

import rig
import world

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
WORLDS = {"arcilla": "mundo_arcilla", "acuarela": "mundo_acuarela"}
PPU = rig.pixels_per_unit()
VERSION = "0.1.0"
LICENSE = "muestra interna"
MARGIN_PX = 12
STEP_PX = 16
BORDER_PX = 4
FILL_SOLID_PX = 8          # losas: franja del borde de tierra que es exactamente outer_fill
FILL_FADE_PX = 40          # y franja en la que el arte funde hacia outer_fill
S2 = math.sqrt(0.5)
RIGHT, TOWARD, FORWARD = rig.camera_basis()
UPC = rig.camera_up()
TMP = os.path.join(HERE, "out", "mundos-tmp")


def to_b(x, y, z=0.0):
    """Mapa → Blender (mismas cuentas que mundos/arcilla/herramientas/mapa.py)."""
    return Vector((S2 * (x + y), S2 * (x - y), z))


def from_b(v):
    return (S2 * (v.x + v.y), S2 * (v.x - v.y))


def rel(p):
    return os.path.relpath(p, REPO)


def load_world(wid):
    import importlib
    return importlib.import_module(WORLDS[wid])


# --- Escena ----------------------------------------------------------------------
class Ctx:
    """Escena de un grupo: la construye el módulo del mundo; aquí se lleva el estado del render."""

    def __init__(self, scene, group):
        self.scene = scene
        self.group = group
        self.rigs = {}          # empties que animan grupos de objetos: {clave: (empty, reposo)}
        self.fresh = {}         # objetos de construcciones por fotograma: {clave: [obj]}
        self.data = {}


def show_only(ctx, objs):
    keep = {o.name for o in objs}
    for o in ctx.scene.objects:
        if o.type in ("MESH", "CURVE", "FONT"):
            o.hide_render = not (o.name in keep or o.get("no_bounds"))


def world_points(objs, clip=True):
    """Vértices evaluados (con modificadores) en coordenadas del mundo; sin lo que queda bajo el agua."""
    dg = bpy.context.evaluated_depsgraph_get()
    chunks = []
    for obj in objs:
        if obj.type != "MESH":
            continue
        ev = obj.evaluated_get(dg)
        me = ev.to_mesh()
        co = np.empty(len(me.vertices) * 3)
        me.vertices.foreach_get("co", co)
        ed = np.empty(len(me.edges) * 2, dtype=np.int64)
        me.edges.foreach_get("vertices", ed)
        ev.to_mesh_clear()
        co = co.reshape(-1, 3)
        mw = np.array(ev.matrix_world)
        w = co @ mw[:3, :3].T + mw[:3, 3]
        if clip:
            # lo que queda bajo el agua no se ve, pero las aristas que la cruzan sí llegan hasta ella
            ed = ed.reshape(-1, 2)
            za, zb = w[ed[:, 0], 2], w[ed[:, 1], 2]
            m = (za > 0.0) != (zb > 0.0)
            t = (za[m] / (za[m] - zb[m]))[:, None]
            cross = w[ed[m, 0]] + (w[ed[m, 1]] - w[ed[m, 0]]) * t
            w = np.concatenate([w[w[:, 2] > -0.01], cross])
        if len(w):
            chunks.append(w)
    return np.concatenate(chunks) if chunks else np.zeros((0, 3))


def screen_offsets(pts, origin):
    d = pts - np.array(origin)
    return np.stack([d @ np.array(RIGHT) * PPU, -(d @ np.array(UPC)) * PPU], axis=1)


def fit(boxes, margin=MARGIN_PX, step=STEP_PX):
    x0 = min(b[0] for b in boxes)
    y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes)
    y1 = max(b[3] for b in boxes)
    w = int(math.ceil((x1 - x0 + 2 * margin) / step) * step)
    h = int(math.ceil((y1 - y0 + 2 * margin) / step) * step)
    return w, h, (float(round(-x0 + (w - (x1 - x0)) / 2.0)), float(round(-y0 + (h - (y1 - y0)) / 2.0))), y0


def place_camera(scene, w, h, pivot, origin):
    for o in [o for o in scene.objects if o.type == "CAMERA"]:
        bpy.data.objects.remove(o, do_unlink=True)
    cam = rig.add_camera(scene, width=w, height=h, pivot_px=pivot, ppu=PPU, origin=tuple(origin))
    cam.location = cam.location - FORWARD * 170.0       # lejos: nada del lugar queda detrás de la cámara
    cam.data.clip_end = 500.0
    scene.render.resolution_x, scene.render.resolution_y = w, h
    scene.render.resolution_percentage = 100
    bpy.context.view_layer.update()
    return cam


def px(scene, cam, p):
    x, y = rig.project_px(scene, cam, p)
    return [round(x, 2), round(y, 2)]


def rig_objects(ctx, key, objs, pivot):
    """Cuelga `objs` de un empty en `pivot` (una vez) para moverlos juntos entre fotogramas."""
    if key not in ctx.rigs:
        e = bpy.data.objects.new("rig_" + key, None)
        ctx.scene.collection.objects.link(e)
        e.location = pivot
        bpy.context.view_layer.update()
        inv = e.matrix_world.inverted()
        for o in objs:
            mw = o.matrix_world.copy()
            o.parent = e
            o.matrix_parent_inverse = inv
            o.matrix_world = mw
        ctx.rigs[key] = (e, e.matrix_world.copy())
    return ctx.rigs[key][0]


def reset_rigs(ctx):
    for e, rest in ctx.rigs.values():
        e.matrix_world = rest
    bpy.context.view_layer.update()


def fresh(ctx, key):
    """Borra lo construido antes con esta clave y devuelve un empty raíz nuevo para construir otra vez."""
    for o in ctx.fresh.pop(key, []):
        bpy.data.objects.remove(o, do_unlink=True)
    root = bpy.data.objects.new("fresh_" + key, None)
    ctx.scene.collection.objects.link(root)
    ctx.fresh[key] = [root]
    return root


def fresh_collect(ctx, key, root):
    objs = [o for o in ctx.scene.objects if o.parent == root]
    ctx.fresh[key] += objs
    return objs


# --- PNG ---------------------------------------------------------------------------
def read_png(path):
    """RGBA uint8 (alto, ancho, 4), fila 0 arriba. Blender da los bytes del PNG sin gestión de color."""
    img = bpy.data.images.load(path)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]
    bpy.data.images.remove(img)
    return np.clip(np.round(a * 255.0), 0, 255).astype(np.uint8)


def write_png(path, img):
    """PNG RGBA de 8 bits, filtro Up en todas las filas: determinista byte a byte."""
    h, w = img.shape[:2]
    img = np.ascontiguousarray(img, dtype=np.uint8)
    up = img.astype(np.int16)
    up[1:] = (up[1:] - up[:-1]) % 256
    up = up.astype(np.uint8)
    raw = b"".join((b"\x00" if y == 0 else b"\x02") + up[y].tobytes() for y in range(h))

    def chunk(t, data):
        c = struct.pack(">I", len(data)) + t + data
        return c + struct.pack(">I", zlib.crc32(t + data) & 0xFFFFFFFF)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def near_opaque(img, pt, r=3):
    cx, cy = int(pt[0]), int(pt[1])
    h, w = img.shape[:2]
    y0, y1, x0, x1 = max(0, cy - r), min(h, cy + r + 1), max(0, cx - r), min(w, cx + r + 1)
    return bool(y0 < y1 and x0 < x1 and img[y0:y1, x0:x1, 3].any())


def fade_to_fill(img, side, fill=None):
    """Funde el borde de tierra (`side`: left/right/bottom) hacia un color plano y lo deja opaco.
    Devuelve el color (#RRGGBB): el medio de la franja si no se da."""
    a = img.astype(np.float32)
    if side == "right":
        a = a[:, ::-1]
    elif side == "bottom":
        a = a[::-1].transpose(1, 0, 2)
    band = a[:, :FILL_FADE_PX]
    if fill is None:
        m = band[..., 3] > 0
        fill = tuple(int(round(v)) for v in band[..., :3][m].mean(axis=0))
    f = np.array(fill + (255,), dtype=np.float32)
    for d in range(FILL_FADE_PX):
        t = 1.0 if d < FILL_SOLID_PX else 1.0 - (d - FILL_SOLID_PX + 0.5) / (FILL_FADE_PX - FILL_SOLID_PX)
        col = a[:, d]
        a[:, d] = col * (1.0 - t) + f * t
        a[:, d, 3] = np.where(col[:, 3] > 0, np.maximum(col[:, 3], 255.0 * t), 255.0 * t)
    if side == "right":
        a = a[:, ::-1]
    elif side == "bottom":
        a = a.transpose(1, 0, 2)[::-1]
    return np.clip(np.round(a), 0, 255).astype(np.uint8), "#%02X%02X%02X" % fill


# --- Una pieza ---------------------------------------------------------------------
class State:
    def __init__(self, mod):
        self.mod = mod
        self.ctx = None

    def ensure(self, group):
        if self.ctx is None or self.ctx.group != group:
            self.ctx = self.mod.new_context(group)
        return self.ctx


def _setup(state, part, e):
    ctx = state.ensure(e.get("group", part["group"]))
    objs = e["setup"](ctx)
    show_only(ctx, objs)
    bpy.context.view_layer.update()
    org = e.get("origin", part["map_pos"]) or (0.0, 0.0)
    return ctx, objs, to_b(*org)


def render_part(state, part, out_dir, stats):
    """Renderiza las imágenes de una pieza y devuelve su entrada del manifiesto."""
    entries = part["images"]
    tile, corner = part.get("tile"), part.get("corner")
    clip = not part.get("no_water")
    if tile or part.get("canvas"):
        w, h, pivot = part["canvas"] if not tile else tile["canvas"]
        ytop = None
    else:
        boxes = []
        for e in entries:
            ctx, objs, origin = _setup(state, part, e)
            off = screen_offsets(world_points(objs, clip), origin)
            if not len(off):
                raise ValueError("%s/%s: la pieza no tiene geometría" % (part["id"], e["file"]))
            # el pivote (origen, 0,0) siempre dentro del lienzo, aunque la pieza flote lejos de él
            boxes.append((min(0.0, off[:, 0].min()), min(0.0, off[:, 1].min()), max(0.0, off[:, 0].max()),
                          max(0.0, off[:, 1].max())))
        w, h, pivot, ytop = fit(boxes)
    images, first, rendered = [], None, []
    post = getattr(state.mod, "postprocess", None)
    for i, e in enumerate(entries):
        ctx, objs, origin = _setup(state, part, e)
        rw, rh, rpivot = (w, 3 * h, (pivot[0], pivot[1] + h)) if tile and tile["axis"] == "y" else \
            (3 * w, h, (pivot[0] + w, pivot[1])) if tile else (w, h, pivot)
        cam = place_camera(ctx.scene, rw, rh, rpivot, origin)
        state.mod.set_light(ctx)
        path = os.path.join(out_dir, e["file"])
        t0 = time.perf_counter()
        if tile or corner:
            raw = os.path.join(TMP, os.path.basename(out_dir), e["file"])
            os.makedirs(os.path.dirname(raw), exist_ok=True)
            ctx.scene.render.filepath = raw
            bpy.ops.render.render(write_still=True)
            img = read_png(raw)
            if post:
                img = post(img, period=(tile["axis"], h if tile["axis"] == "y" else w) if tile else None)
            if tile:
                img = img[h:2 * h] if tile["axis"] == "y" else img[:, w:2 * w]
                img, fill = fade_to_fill(img, tile["land"], tile.get("fill"))
                tile["outer_fill"] = fill
                tile["collision_px"] = collision_px(img, tile["land"])
            else:
                for side in corner["land"]:
                    img, _ = fade_to_fill(img, side, corner["fills"].get(side))
            write_png(path, img)
        else:
            ctx.scene.render.filepath = path
            bpy.ops.render.render(write_still=True)
            img = None
            if post:
                img = post(read_png(path))
                write_png(path, img)
        stats.append({"file": path, "seconds": round(time.perf_counter() - t0, 3), "bytes": os.path.getsize(path)})
        im = {"file": e["file"], "frame": e.get("frame", 0)}
        for k in ("animation", "variant"):
            if e.get(k):
                im[k] = e[k]
        rendered.append(img if img is not None else read_png(path))
        if i == 0:
            first = (ctx, cam, rendered[0])
            if tile:
                # Orilla y línea de mapa.json en px de la losa. Recortar el periodo del medio sólo quita filas
                # (eje y) o columnas (eje x): la coordenada que se mide no cambia.
                k = 0 if tile["axis"] == "y" else 1
                tile["_shore_px"] = [px(ctx.scene, cam, p)[k] for p in tile["shore"](ctx)]
                tile["map_line"]["px"] = px(ctx.scene, cam, to_b(*tile["line_point"]))[k]
        images.append(im)
    out = {"id": part["id"], "role": part["role"], "collision": part["collision"]}
    if part.get("map_pos") is not None:
        out["map_pos"] = [round(v, 4) for v in part["map_pos"]]
    for k in ("offset_units", "instances", "attach", "doc"):
        if part.get(k) is not None:
            out[k] = part[k]
    out["image"] = {"width": w, "height": h, "format": "png", "mode": "RGBA",
                    "transparent_border_px": 0 if (tile or corner) else BORDER_PX}
    out["pivot_px"] = list(pivot)
    if tile:
        out["anchors"] = {"pivot": list(pivot)}
        out["anchors_on_art"] = []
        out["tile"] = tile_block(tile, w, h)
    else:
        # Anclajes, huella y pistas: con la escena y la cámara de la primera imagen (el pivote es el mismo en todas).
        ctx, _, origin = _setup(state, part, entries[0])
        cam = place_camera(ctx.scene, w, h, pivot, origin)
        anchors = {"pivot": list(pivot)}
        for name, p in (part["anchors"](ctx) if part.get("anchors") else {}).items():
            anchors[name] = px(ctx.scene, cam, p)
        if part.get("rotulo") and ytop is not None:
            anchors["rotulo"] = [pivot[0], round(pivot[1] + ytop - 4.0, 2)]
        out["anchors"] = anchors
        # sobre el arte en todas las imágenes (en una animación el arte se mueve)
        out["anchors_on_art"] = [k for k, v in anchors.items() if all(near_opaque(im, v) for im in rendered)]
        if corner:
            out["corner"] = {k: v for k, v in corner.items() if k != "fills"}
            out["corner"]["outer_fill"] = {s: corner["fills"][s] for s in corner["land"]}
        if part.get("footprint"):
            pts = [px(ctx.scene, cam, p) for p in part["footprint"](ctx)]
            radii = [math.hypot(x - pivot[0], 2.0 * (y - pivot[1])) for x, y in pts]
            # radio medio de la huella, sin pasar de lo que cabe en el lienzo (huellas alargadas: el paseo)
            fit_px = min(pivot[0], w - pivot[0], 2.0 * pivot[1], 2.0 * (h - pivot[1]))
            hit = part.get("hit_units") or (min(sum(radii) / len(radii), max(fit_px, min(radii))) / PPU)
            out["footprint"] = {"shape": "polygon", "points_px": pts, "doc": part.get("footprint_doc", FOOTPRINT_DOC)}
            out["hitbox_hint"] = world.circle_hint(pivot, hit, PPU)
            if part.get("prox_units"):
                out["proximity_hint"] = world.circle_hint(pivot, part["prox_units"], PPU)
    if part.get("animations"):
        out["animations"] = part["animations"]
    out["images"] = images
    reset_rigs(state.ctx)
    return out


FOOTPRINT_DOC = "contorno a ras de agua en px de la imagen: lo que el barco no puede cruzar (o, en decoración, lo que ocupa)"


def collision_px(img, land):
    """Donde tiene que pararse el casco: más allá del último píxel opaco del lado del agua (orilla, rocas, espuma)."""
    solid = img[..., 3] == 255
    if land == "left":
        return float(max(np.nonzero(r)[0].max() for r in solid if r.any()) + 1)
    if land == "right":
        return float(min(np.nonzero(r)[0].min() for r in solid if r.any()) - 1)
    return None     # bottom: lo que está de pie en tierra sube sobre el agua en pantalla; se mide sobre la orilla


BOTTOM_MARGIN_PX = 9.0      # losa de abajo: el casco para a 0,2 u (a la mitad en vertical) de la orilla más saliente


def tile_block(tile, w, h):
    v = tile.pop("_shore_px")
    shore = {"mean": round(sum(v) / len(v), 2), "min": round(min(v), 2), "max": round(max(v), 2)}
    if tile["collision_px"] is None:
        tile["collision_px"] = round(min(v) - BOTTOM_MARGIN_PX, 2)
    return {"axis": tile["axis"], "land_side": tile["land"], "period_px": h if tile["axis"] == "y" else w,
            "period_units": round(tile["period_units"], 4), "shore_px": shore,
            "collision_px": tile["collision_px"], "outer_fill": tile["outer_fill"],
            "map_line": tile["map_line"],
            "doc": tile["doc"]}


# --- Un mundo -----------------------------------------------------------------------
def sources_sha256(paths):
    hsh = hashlib.sha256()
    for p in paths:
        with open(os.path.join(REPO, p), "rb") as f:
            hsh.update(f.read())
    return hsh.hexdigest()


def render_world(wid, out_root, stats, only=None, command="Blender -b -P tools/blender/render.py -- --all"):
    """Renderiza todos los lugares del mundo `wid` (o sólo `only`) en out_root/<lugar>/. Devuelve {lugar: n}."""
    mod = load_world(wid)
    state = State(mod)
    counts = {}
    for place in mod.places():
        if only and place["id"] not in only:
            continue
        out_dir = os.path.join(out_root, place["id"])
        if os.path.isdir(out_dir):
            for fn in os.listdir(out_dir):
                if fn.endswith(".png") or fn == "manifest.json":
                    os.remove(os.path.join(out_dir, fn))
        t0 = time.perf_counter()
        parts = [render_part(state, part, out_dir, stats) for part in place["parts"]]
        scripts = mod.scripts(place)
        man = {
            "id": place["id"],
            "kind": "place",
            "category": place["category"],
            "world": wid,
            "version": VERSION,
            "status": "muestra",
            "license": LICENSE,
            "style": mod.STYLE,
            "ship": mod.SHIP,
            "generator": {"scripts": scripts, "sources_sha256": sources_sha256(scripts), "blender": rig.blender_version(),
                          "engine": "BLENDER_EEVEE", "samples": state.ctx.scene.eevee.taa_render_samples,
                          "command": command},
            "projection": {"type": "dimetric-2:1", "camera_elevation_deg": rig.CAMERA_ELEVATION_DEG,
                           "camera_azimuth_deg": rig.CAMERA_AZIMUTH_DEG, "pixels_per_unit": round(PPU, 4)},
            "scale": {"pixels_per_unit": round(PPU, 4), "reference": "barco",
                      "doc": "misma cámara y densidad que los sprites del barco (D-13, D-15): una unidad de la maqueta "
                             "mide pixels_per_unit px en horizontal y la mitad en vertical sobre el agua. Tamaños a 1:1 "
                             "con el barco; las posiciones del mapa las escala el motor (mapa.json, ritmo.factor_juego)"},
            "coordinates": "píxeles continuos; (0,0) = esquina superior izquierda, y crece hacia abajo; el centro del "
                           "píxel (i,j) está en (i+0.5, j+0.5). map_pos y offset_units en unidades del mapa (u_maq, ejes "
                           "de mapa.json: x a la derecha, y hacia el espectador); offset_units = map_pos - place.pos. "
                           "En los círculos sobre el agua radius_px es el semieje horizontal; el vertical mide la mitad",
            "place": place["place"],
            "anchors_doc": {},
            "parts": parts,
        }
        docs = {}
        for p in parts:
            for k in p["anchors"]:
                docs[k] = mod.anchor_doc(place, k)
        man["anchors_doc"] = docs
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
            json.dump(man, f, indent=2, ensure_ascii=False)
            f.write("\n")
        counts[place["id"]] = sum(len(p["images"]) for p in parts)
        print("[mundos] %s/%s: %d piezas, %d imágenes, %.1f s" % (wid, place["id"], len(parts), counts[place["id"]],
                                                                   time.perf_counter() - t0))
    return counts
