"""El barco en los 8 estilos de exploración (tools/blender/styles/NN_*.py).

Cada script de estilo construye su propio remolcador con su sombreado, su luz
y, a veces, un postproceso. Este módulo los envuelve para que render.py saque
de cada uno el mismo juego de imágenes que del barco actual, con la misma
cámara (rig.py, 30°, D-13): skin `base`, 8 direcciones con y sin pasajera y
los fotogramas de balanceo, con anclajes y manifiesto.

Lo que se añade a cada estudio, sin tocar su script:
  - un empty de balanceo entre la raíz y las piezas (el pivote no se mueve);
  - la pasajera de ship.py (misma geometría) con materiales del estilo;
  - anclajes: `bow` y `wake_origin` en los extremos del casco a la altura del
    agua, `mast_top` en el punto más alto, `slot_passenger` en la cubierta.

Son muestras para comparar estilos con Álvaro en el juego (T11); no son arte
aprobado. Las skins noche/fiesta sólo existen en el estilo actual (`muestra`).
"""
import importlib.util
import json
import math
import os

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import rig
import ship

HERE = os.path.dirname(os.path.abspath(__file__))
STYLES_DIR = os.path.join(HERE, "styles")
RAW_DIR = os.path.join(HERE, "out", "estilos-raw")      # intermedios del pixel-art (EXR); no van a art/

# id (slug del manifiesto y de ?estilo=), script y punto de la pasajera en cubierta (x, y).
# El punto se eligió mirando un mapa de alturas de cada cubierta: libre de carga y visible
# en las 8 direcciones (check.py exige que la pasajera cambie la imagen en todas).
# Nombre visible y descripción salen del registro de barcos (docs/barcos/barcos.json):
# `estilo` y `aspecto` de la entrada cuyo `script` es el del estudio.
STUDIES = [
    {"id": "boceto-lapiz", "script": "01_boceto_lapiz", "slot": (0.36, -0.28)},
    {"id": "acuarela", "script": "02_acuarela_ilustrada", "slot": (0.44, 0.10)},
    {"id": "low-poly", "script": "03_low_poly", "slot": (0.62, -0.10)},
    {"id": "semi-realista", "script": "04_semi_realista", "slot": (0.52, -0.32)},
    {"id": "arcilla", "script": "05_arcilla_maqueta", "slot": (0.36, -0.20)},
    {"id": "cartoon-30", "script": "06_cartoon_anos_30", "slot": (0.40, -0.20)},
    {"id": "cel-shaded", "script": "07_cel_shaded_comic", "slot": (0.50, -0.20)},
    {"id": "pixel-art", "script": "08_pixel_art", "slot": (0.48, -0.30)},
]
REGISTRY = os.path.join(os.path.dirname(os.path.dirname(HERE)), "docs", "barcos", "barcos.json")


def _with_registry(studies):
    with open(REGISTRY, encoding="utf-8") as f:
        by_script = {b["script"]: b for b in json.load(f)["barcos"]}
    for st in studies:
        entry = by_script["tools/blender/styles/%s.py" % st["script"]]      # KeyError: falta en el registro
        st.update(barco=entry["id"], label=entry["estilo"], description=entry["aspecto"])
    return studies


STUDIES = _with_registry(STUDIES)
BY_ID = {s["id"]: s for s in STUDIES}
IDS = [s["id"] for s in STUDIES]

WATERLINE_Z = 0.15          # vértices por debajo de esto: extremos del casco en el agua
MAST_TOP_DROP = 0.03        # el ancla queda un pelo bajo la punta: en 64 px de arte la punta puede no verse

# Colores de la pasajera: los de ship.py (Boia Fiestera de muestra).
PC = {r: (v if isinstance(v, str) else v["hex"]) for r, v in ship.PASSENGER_COLORS.items()}

_modules = {}


def script_path(sid):
    return "tools/blender/styles/%s.py" % BY_ID[sid]["script"]


def load(sid):
    if sid not in _modules:
        name = BY_ID[sid]["script"]
        spec = importlib.util.spec_from_file_location("boia_study_" + name, os.path.join(STYLES_DIR, name + ".py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _modules[sid] = mod
    return _modules[sid]


# --- Escena, luz y render de cada estilo ------------------------------------
def _plain_render(scene, path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def _scene_default(mod, scene):
    rig.add_sun(scene)


def _scene_shadow_sun(mod, scene):
    sun = rig.add_sun(scene)
    sun.data.use_shadow = True
    if hasattr(scene.eevee, "use_shadows"):
        scene.eevee.use_shadows = True


def _scene_low_poly(mod, scene):
    mod.setup_lighting(scene)


def _scene_semi(mod, scene):
    _scene_shadow_sun(mod, scene)
    mod.setup_look(scene)


def _scene_clay(mod, scene):
    # Igual que setup_scene() del estudio, sin volver a crear escena ni cámara.
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = mod.LOOK
    ee = scene.eevee
    ee.taa_render_samples = mod.SAMPLES
    ee.use_shadows = True
    ee.shadow_ray_count = 2
    ee.shadow_step_count = 8
    ee.use_raytracing = True
    ee.use_fast_gi = True
    ee.fast_gi_method = "GLOBAL_ILLUMINATION"
    ee.fast_gi_distance = 0.6
    ee.fast_gi_ray_count = 4
    ee.fast_gi_step_count = 8
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = mod.WORLD_COLOR + (1.0,)
    bg.inputs["Strength"].default_value = mod.WORLD_STRENGTH
    sun = rig.add_sun(scene)
    sun.data.use_shadow = True
    sun.data.angle = math.radians(mod.SUN_ANGLE_DEG)
    sun.data.energy = mod.SUN_STRENGTH


def _scene_pixel(mod, scene):
    rig.add_sun(scene)
    scene.eevee.taa_render_samples = 1
    scene.render.filter_size = 0.0
    scene.render.image_settings.file_format = "OPEN_EXR"
    scene.render.image_settings.color_depth = "32"
    scene.render.image_settings.exr_codec = "ZIP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"


def _after_pencil(mod, scene):
    mod.setup_lines(scene, 1.0)


def _after_cel(mod, scene):
    mod.setup_ink(scene)


def _render_watercolor(mod):
    def f(scene, path):
        _plain_render(scene, path)
        mod.watercolor_pass(path)
    return f


def _render_pixel(mod):
    def f(scene, path):
        rel = os.path.relpath(path, os.path.dirname(os.path.dirname(os.path.dirname(path))))
        raw = os.path.join(RAW_DIR, os.path.splitext(rel)[0] + ".exr")
        os.makedirs(os.path.dirname(raw), exist_ok=True)
        data = mod.render_data(scene, raw, mod.ART * mod.SS)
        mod.write_png(path, mod.upscale(mod.pixelate(data, mod.ART), mod.SS))
    return f


# --- Pasajera con los materiales de cada estilo -----------------------------
# Cada función devuelve link(name, bm, roles, parent, outline) -> objeto.
def _pax_pencil(mod, ctx):
    m = {"buoy_a": mod.pencil_material("pax_buoy_a", 0.30), "buoy_b": mod.pencil_material("pax_buoy_b", 0.0),
         "hat": mod.pencil_material("pax_hat", 0.12), "face": mod.flat_material("pax_face", 0.18)}
    return lambda name, bm, roles, parent, outline: mod.link_object(name, bm, [m[r] for r in roles], parent)


def _pax_watercolor(mod, ctx):
    m = {"buoy_a": mod.wc_material("pax_buoy_a", PC["buoy_a"]), "buoy_b": mod.wc_material("pax_buoy_b", PC["buoy_b"]),
         "hat": mod.wc_material("pax_hat", PC["hat"]), "face": mod.wc_material("pax_face", PC["face"], flat=True)}
    line = mod.outline_material()
    return lambda name, bm, roles, parent, outline: mod.link_object(name, bm, [m[r] for r in roles], parent, line,
                                                                    outline=outline)


def _pax_low_poly(mod, ctx):
    m = {r: mod.principled("pax_" + r, PC[r]) for r in ("buoy_a", "buoy_b", "hat")}
    m["face"] = mod.emissive("pax_face", PC["face"])
    return lambda name, bm, roles, parent, outline: mod.link(name, bm, [m[r] for r in roles], parent)


def _pax_semi(mod, ctx):
    m = {r: mod.mat_simple("pax_" + r, PC[r], 0.55) for r in ("buoy_a", "buoy_b", "hat")}
    m["face"] = mod.mat_simple("pax_face", PC["face"], 0.4)
    return lambda name, bm, roles, parent, outline: mod.link(name, bm, [m[r] for r in roles], parent, smooth=40)


def _pax_clay(mod, ctx):
    m = {r: mod.clay("pax_" + r, PC[r]) for r in ("buoy_a", "buoy_b", "hat")}
    m["face"] = mod.clay("pax_face", PC["face"], bump=0.0)
    return lambda name, bm, roles, parent, outline: mod.make_obj(name, bm, [m[r] for r in roles], parent, sharp_deg=40)


class _CartoonMats(dict):
    outline = None


def _pax_cartoon(mod, ctx):
    # Paleta de tres colores del estilo: la pasajera va en rojo y crema, con gorro de madera.
    M = _CartoonMats(buoy_a=mod.toon_material("pax_buoy_a", "red"), buoy_b=mod.toon_material("pax_buoy_b", "cream"),
                     hat=mod.toon_material("pax_hat", "wood"), face=mod.toon_material("pax_face", mod.INK, flat=True))
    M.outline = mod.outline_material()
    return lambda name, bm, roles, parent, outline: mod.link_object(name, bm, roles, parent, M,
                                                                    outline=mod.OUTLINE_W_SMALL if outline else 0)


def _pax_cel(mod, ctx):
    mod.COLORS.update({"pax_" + r: PC[r] for r in ship.PASSENGER_ROLES})
    mod.FLAT.add("pax_face")
    mod.NO_RIM.add("pax_face")
    mats = mod.Mats()
    return lambda name, bm, roles, parent, outline: mod.link_object(name, bm, ["pax_" + r for r in roles], mats,
                                                                    parent)


def _pax_pixel(mod, ctx):
    # Paleta fija de 16: rojo, blanco, farol y contorno.
    mod.MATS.update({"pax_buoy_a": mod.MATS["red"], "pax_buoy_b": mod.MATS["white"],
                     "pax_hat": mod.MATS["lamp"], "pax_face": (0, 0, 0)})

    def link(name, bm, roles, parent, outline):
        parts = ctx.setdefault("pixel_parts", mod.Parts(parent))
        parts.parent = parent
        parts.next_id = max(parts.next_id, 200)         # índices de objeto propios: no chocan con el casco
        return parts.add(name, bm, ["pax_" + r for r in roles])
    return link


ADAPTERS = {
    "boceto-lapiz": (_scene_default, _after_pencil, None, _pax_pencil),
    "acuarela": (_scene_default, None, _render_watercolor, _pax_watercolor),
    "low-poly": (_scene_low_poly, None, None, _pax_low_poly),
    "semi-realista": (_scene_semi, None, None, _pax_semi),
    "arcilla": (_scene_clay, None, None, _pax_clay),
    "cartoon-30": (_scene_default, None, None, _pax_cartoon),
    "cel-shaded": (_scene_shadow_sun, _after_cel, None, _pax_cel),
    "pixel-art": (_scene_pixel, None, _render_pixel, _pax_pixel),
}


# --- Construcción -----------------------------------------------------------
def _empty(name, parent, loc):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.08
    bpy.context.scene.collection.objects.link(e)
    e.parent = parent
    e.location = loc
    return e


def _geometry(scene):
    """Vértices y triángulos de todas las mallas evaluadas, en coordenadas del mundo."""
    dg = bpy.context.evaluated_depsgraph_get()
    verts, tris = [], []
    for ob in scene.objects:
        if ob.type != "MESH":
            continue
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        base = len(verts)
        mw = ob.matrix_world.copy()
        verts += [mw @ v.co for v in me.vertices]
        me.calc_loop_triangles()
        tris += [tuple(base + i for i in t.vertices) for t in me.loop_triangles]
        ev.to_mesh_clear()
    return verts, tris


def canonical_order(scene):
    """Ordena vértices, aristas y caras de cada malla por su geometría.

    Algunas operaciones de bmesh (p. ej. create_uvsphere) crean las mismas caras
    en distinto orden en cada proceso de Blender. Con otro orden cambian, en el
    último bit, la suma de normales y el orden de los trazos de Freestyle, y el
    PNG deja de ser idéntico byte a byte entre dos corridas. Con este orden fijo,
    sí lo es.
    """
    done = set()
    for ob in scene.objects:
        if ob.type != "MESH" or ob.data.name in done:
            continue
        done.add(ob.data.name)
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        for seq, key in ((bm.verts, lambda v: (tuple(v.co), v.index)),
                         (bm.edges, lambda e: tuple(sorted(v.index for v in e.verts))),
                         (bm.faces, lambda f: tuple(v.index for v in f.verts))):
            seq.index_update()
            rank = {el.index: r for r, el in enumerate(sorted(seq, key=key))}   # sort() pide una clave numérica
            seq.sort(key=lambda el: rank[el.index])
            seq.index_update()
        bm.to_mesh(ob.data)
        bm.free()


def build(sid):
    """Escena nueva con cámara, luz y el barco del estilo `sid`.

    Devuelve (scene, cam, ship_dict, render_fn); ship_dict tiene la forma de
    ship.build_ship() (root, bob, passenger, anchors) para usar set_direction,
    set_bob y set_passenger de ship.py.
    """
    mod = load(sid)
    setup, after, render_wrap, pax = ADAPTERS[sid]
    scene = rig.reset_scene()
    rig.setup_render(scene)
    cam = rig.add_camera(scene)
    setup(mod, scene)
    built = mod.build_ship()
    root = built[0] if isinstance(built, tuple) else built
    root.rotation_euler = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()

    # Medidas del casco con la raíz en reposo (coordenadas del barco = del mundo).
    verts, tris = _geometry(scene)
    low = [v.x for v in verts if v.z < WATERLINE_Z]
    top = max(verts, key=lambda v: (v.z, -abs(v.x), -abs(v.y)))
    x, y = BY_ID[sid]["slot"]
    hit = BVHTree.FromPolygons(verts, tris).ray_cast(Vector((x, y, 10.0)), Vector((0.0, 0.0, -1.0)))
    if hit[0] is None:
        raise RuntimeError("%s: el punto de la pasajera %r no cae sobre el barco" % (sid, (x, y)))
    deck = hit[0].z

    bob = _empty("ship_bob", root, (0, 0, 0))
    for child in list(root.children):
        if child is not bob:
            child.parent = bob
    pivot = _empty("pivot", root, (0, 0, 0))
    slot = _empty("slot_passenger", bob, (x, y, deck))
    slot.scale = (ship.PASSENGER_SCALE,) * 3
    link = pax(mod, {})
    passenger = [link(name, bm, roles, slot, outline) for name, bm, roles, outline in ship.passenger_meshes()]
    anchors = {
        "pivot": pivot,
        "mast_top": _empty("mast_top", bob, (top.x, top.y, top.z - MAST_TOP_DROP)),
        "slot_passenger": slot,
        "wake_origin": _empty("wake_origin", bob, (min(low), 0, 0)),
        "bow": _empty("bow", bob, (max(low), 0, 0)),
    }
    canonical_order(scene)
    if after:
        after(mod, scene)
    render_fn = render_wrap(mod) if render_wrap else _plain_render
    return scene, cam, {"root": root, "bob": bob, "passenger": passenger, "anchors": anchors}, render_fn
