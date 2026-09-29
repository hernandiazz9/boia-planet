"""Los 8 barcos de estilo (tools/blender/styles/NN_*.py) como modelos glTF para el mar 3D (/mar).

Mismo `build_ship()` que da los sprites del 2D (ship_styles.py): misma geometría,
mismas piezas y los colores de cada hoja. Lo que no viaja a glTF (arcilla con
subsuperficie, tramados, rampas toon, postprocesos) se aplana a un color por
material: el color base del Principled, el de la emisión o el tono iluminado de
la rampa. Los contornos de casco invertido se quitan (en el mar 3D no hacen
falta). Proa a +X y flotación en y = 0, como en Blender.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/export_barcos_glb.py
    ... -- --only arcilla acuarela

Salida: art/barco/3d/<id>.glb y art/barco/3d/manifest.json (muestra).
"""
import argparse
import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rig  # noqa: E402
import ship_styles  # noqa: E402

# Tope de triángulos por barco: en el móvil el barco se ve pequeño. muestra
MAX_TRIS = 12000

OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), "art", "barco", "3d")


def _ramp_color(node):
    """Tono iluminado de una rampa: el de su tramo claro (toon) o su media."""
    return tuple(node.color_ramp.evaluate(0.7))


def _color_from_socket(sock, seen):
    """Primer color que se puede leer subiendo por un enlace."""
    if not sock.is_linked:
        v = getattr(sock, "default_value", None)
        try:
            return tuple(v)[:4] if v is not None and len(v) >= 3 else None
        except TypeError:
            return None
    node = sock.links[0].from_node
    return _color_from_node(node, seen)


def _color_from_node(node, seen):
    if node in seen:
        return None
    seen.add(node)
    t = node.bl_idname
    if t == "ShaderNodeRGB":
        return tuple(node.outputs[0].default_value)
    if t == "ShaderNodeValToRGB":
        return _ramp_color(node)
    for name in ("Base Color", "Color", "Color1", "A", "Color2", "B", "Emission Color"):
        s = node.inputs.get(name)
        if s is not None and s.type == "RGBA":
            c = _color_from_socket(s, seen)
            if c:
                return c
    for s in node.inputs:
        if s.type in ("RGBA", "SHADER"):
            c = _color_from_socket(s, seen)
            if c:
                return c
    return None


def _hex_lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


def _hex_of(v):
    if isinstance(v, str) and v.startswith("#") and len(v) == 7:
        return v
    if isinstance(v, dict):
        return _hex_of(v.get("hex") or v.get("color") or v.get("base"))
    if isinstance(v, (tuple, list)) and v and isinstance(v[0], str):
        return _hex_of(v[0])
    return None


def palette_of(mod):
    """Colores con nombre del script de estilo: sus diccionarios de hex (C, PAL, COLORS…)."""
    pal = {}
    for k, v in vars(mod).items():
        if k.startswith("_") or not isinstance(v, dict):
            continue
        for name, val in v.items():
            h = _hex_of(val)
            if isinstance(name, str) and h:
                pal.setdefault(name.lower(), h)
    for k, v in vars(mod).items():
        h = _hex_of(v)
        if k.isupper() and h:
            pal.setdefault(k.lower(), h)
    # Pixel art: cada material son índices (sombra, medio, luz) de una paleta fija.
    table, mats = getattr(mod, "PALETTE", None), getattr(mod, "MATS", None)
    if isinstance(table, list) and isinstance(mats, dict):
        for name, idx in mats.items():
            if isinstance(idx, tuple) and len(idx) == 3:
                pal[name.lower()] = table[idx[1]]
    # Boceto a lápiz: grafito sobre papel; cada pieza es un gris (oscuridad o valor plano).
    dark, flat = getattr(mod, "DARK", None), getattr(mod, "FLAT", None)
    if isinstance(dark, dict):
        for name, d in dark.items():
            pal[name.lower()] = _gray(0.95 - d * 0.7)
    if isinstance(flat, dict):
        for name, v in flat.items():
            pal[name.lower()] = _gray(v)
    return pal


def _gray(v):
    """Gris de papel (un pelo cálido) con luminosidad v (0..1, sRGB)."""
    v = max(0.0, min(1.0, v))
    r, g, b = (min(255, round(v * 255 * k)) for k in (1.0, 0.985, 0.955))
    return "#%02X%02X%02X" % (r, g, b)


def from_palette(pal, mat_name):
    """El color de la hoja para un material: por su nombre (sin sufijos .001, _mat…)."""
    base = mat_name.split(".")[0].lower()
    cands = [base, base.replace("_mat", ""), base.replace("mat_", ""), base.split("_")[0]]
    for c in cands:
        if c in pal:
            return pal[c]
    return None


def flatten(mat):
    """(color lineal, emisivo) de un material de estilo, leyendo su árbol de nodos."""
    if not mat.use_nodes or not mat.node_tree:
        return tuple(mat.diffuse_color), False
    nt = mat.node_tree
    out = next((n for n in nt.nodes if n.bl_idname == "ShaderNodeOutputMaterial" and n.is_active_output), None)
    out = out or next((n for n in nt.nodes if n.bl_idname == "ShaderNodeOutputMaterial"), None)
    emissive = any(n.bl_idname == "ShaderNodeEmission" for n in nt.nodes) and not any(
        n.bl_idname in ("ShaderNodeBsdfPrincipled", "ShaderNodeBsdfDiffuse") for n in nt.nodes
    )
    color = None
    if out and out.inputs["Surface"].is_linked:
        color = _color_from_node(out.inputs["Surface"].links[0].from_node, set())
    if color is None:
        color = tuple(mat.diffuse_color)
    return tuple(color[:3]) + (1.0,), emissive


def simple_material(name, color, emissive):
    m = bpy.data.materials.new(name + "_gltf")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = color
    b.inputs["Roughness"].default_value = 0.8
    b.inputs["Metallic"].default_value = 0.0
    if emissive:
        b.inputs["Emission Color"].default_value = color
        b.inputs["Emission Strength"].default_value = 1.0
    nt.links.new(b.outputs["BSDF"], o.inputs["Surface"])
    return m


def is_outline(obj, mat):
    """Contorno de casco invertido: un material 'outline' o de caras traseras."""
    n = (mat.name if mat else "").lower()
    return "outline" in n or "contorno" in n


def export(sid):
    rig.reset_scene()
    mod = ship_styles.load(sid)
    built = mod.build_ship()
    # Unos estudios devuelven (raíz, piezas); otros, sólo la raíz.
    root = built[0] if isinstance(built, tuple) else built
    # Los modificadores de contorno (Solidify con normales invertidas) fuera.
    for obj in [o for o in bpy.data.objects if o.type == "MESH"]:
        for mod_ in list(obj.modifiers):
            if mod_.type == "SOLIDIFY" and mod_.use_flip_normals:
                obj.modifiers.remove(mod_)
    cache = {}
    pal = palette_of(mod)
    unmatched = set()
    tris = 0
    for obj in [o for o in bpy.data.objects if o.type == "MESH"]:
        slots = obj.material_slots
        if slots and all(s.material and is_outline(obj, s.material) for s in slots):
            bpy.data.objects.remove(obj)
            continue
        for s in slots:
            if not s.material:
                continue
            key = s.material.name
            if key not in cache:
                color, emissive = flatten(s.material)
                h = from_palette(pal, key)
                if h:
                    color = _hex_lin(h)
                else:
                    unmatched.add(key)
                cache[key] = simple_material(key, color, emissive)
            s.material = cache[key]
    # Mallas densas (superelipsoides, tornos) a dieta si el barco pasa del tope.
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    total = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    if total > MAX_TRIS:
        ratio = MAX_TRIS / total
        for o in meshes:
            if len(o.data.polygons) > 300:
                d = o.modifiers.new("dieta", "DECIMATE")
                d.ratio = max(0.2, ratio)
    # Sólo la jerarquía del barco (sin luces ni cámara).
    bpy.ops.object.select_all(action="DESELECT")
    for o in bpy.data.objects:
        top = o
        while top.parent:
            top = top.parent
        if top == root and o.type in ("MESH", "EMPTY", "CURVE"):
            o.select_set(True)
            if o.type == "MESH":
                ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get())
                tris += sum(len(p.vertices) - 2 for p in ev.data.polygons)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, sid + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=False,
        export_normals=True,
        export_materials="EXPORT",
        export_lights=False,
        export_cameras=False,
    )
    print("[glb] %s: %d triángulos aprox., %d kB; sin hoja: %s"
          % (sid, tris, os.path.getsize(path) // 1024, ", ".join(sorted(unmatched)) or "-"))
    return {"id": sid, "file": sid + ".glb", "barco": ship_styles.BY_ID[sid]["barco"],
            "label": ship_styles.BY_ID[sid]["label"], "slot": ship_styles.BY_ID[sid]["slot"]}


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*")
    a = ap.parse_args(argv)
    done = [export(sid) for sid in (a.only or ship_styles.IDS)]
    man = os.path.join(OUT, "manifest.json")
    prev = {}
    if os.path.exists(man):
        with open(man, encoding="utf-8") as f:
            prev = {s["id"]: s for s in json.load(f).get("barcos", [])}
    for d in done:
        prev[d["id"]] = d
    with open(man, "w", encoding="utf-8") as f:
        json.dump({
            "status": "muestra",
            "nota": "Generado por tools/blender/export_barcos_glb.py desde los scripts de estilo. No editar.",
            "unidades": "Blender: proa a +X, flotación en y = 0 (glTF, y arriba)",
            "barcos": [prev[k] for k in ship_styles.IDS if k in prev],
        }, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
