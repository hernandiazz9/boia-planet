"""Estilo `muestra`: el del barco del encargo 01, compartido con el mundo.

Toon de tres tonos (Diffuse -> Shader to RGB -> rampa CONSTANT -> Emission),
sombras que tiran a violeta, luces cálidas y contorno por casco invertido.
Es un estilo de muestra: lo aprueba Álvaro. Otro estilo es otro archivo en
styles/ con la misma API (ver tools/blender/style.py) y un re-render.
"""
import colorsys
import math

import bmesh
import bpy

STYLE_API = 1
NAME = "muestra"
VERSION = "0.1.0"

OUTLINE_COLOR = "#161A2E"
OUTLINE_WIDTH = 0.024          # unidades del mundo (≈2,1 px a 88,28 px por unidad)
SHADOW_TINT = "#3B3470"        # las sombras tiran a violeta: se lee como ilustración
LIGHT_TINT = "#FFF6DC"
TOON_STEPS = (0.12, 0.66)      # umbrales de iluminación (Shader to RGB): sombra | medio | luz
SHARP_ANGLE_DEG = 38           # aristas más vivas que esto no se suavizan

# Paleta de muestra del mundo. Naranja y azul marino de BOIA sin valores de
# marca definitivos (pendiente Álvaro). Arena, pino y roca ocre de costa
# alicantina; el agua sale del agua del motor (#0F5F7D con olas #2A8FAE).
PALETTE = {
    "orange": "#F26A1B", "navy": "#12233F", "cream": "#F7EEDC",
    "sand": "#EBCB8F", "sand_dark": "#D2A96B",
    "grass": "#93C25E", "grass_dark": "#6FA24A",
    "foliage": "#3E9A5A", "foliage_dark": "#2F7E4E",
    "trunk": "#98683F", "wood": "#8A5A3B", "wood_light": "#C08A57",
    "cliff": "#C98F5E", "rock": "#7F8CA3", "rock_light": "#A3B0C4",
    "foam": "#EAF8FA", "shallow": "#5CC9DA",
    "ocean": "#1F7A9A", "ocean_deep": "#155F7E", "land": "#93C25E", "land_sand": "#EBCB8F",
    "cloud": "#FFFFFF",
    "lamp": "#FFD34D", "lamp_off": "#B8A15A", "eye": "#FFFFFF", "pupil": "#12233F",
    "stage": "#2A2F4F", "speaker": "#1B1F33", "canvas": "#F7EEDC",
}
SHALLOW_ALPHA = 0.45


# --- Color ------------------------------------------------------------------
def hex_srgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin4(rgb):
    return tuple(srgb_to_linear(c) for c in rgb) + (1.0,)


def mix(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def toon_tones(hexcol):
    """(sombra, medio, luz) en sRGB a partir del color base."""
    base = hex_srgb(hexcol)
    h, s, v = colorsys.rgb_to_hsv(*base)
    darker = colorsys.hsv_to_rgb(h, min(1.0, s * 1.05), v * 0.70)
    shadow = mix(darker, hex_srgb(SHADOW_TINT), 0.30)
    light = mix(base, hex_srgb(LIGHT_TINT), 0.28)
    return shadow, base, light


def _tones(spec):
    if isinstance(spec, str):
        spec = {"hex": spec}
    if spec.get("flat"):
        return (hex_srgb(spec["hex"]),) * 3
    return toon_tones(spec["hex"])


# --- Materiales -------------------------------------------------------------
def _toon_ramp(nt, name):
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.name = name
    ramp.color_ramp.interpolation = "CONSTANT"
    els = ramp.color_ramp.elements
    els[0].position = 0.0
    els[1].position = TOON_STEPS[0]
    els.new(TOON_STEPS[1])
    return ramp


def toon_material(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    diffuse = nt.nodes.new("ShaderNodeBsdfDiffuse")
    diffuse.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    to_rgb = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = _toon_ramp(nt, "toon_ramp")
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(diffuse.outputs["BSDF"], to_rgb.inputs["Shader"])
    nt.links.new(to_rgb.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], emit.inputs["Color"])
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


def set_material_color(mat, spec):
    els = mat.node_tree.nodes["toon_ramp"].color_ramp.elements
    for el, tone in zip(els, _tones(spec)):
        el.color = lin4(tone)


def toon(name, spec):
    mat = toon_material(name)
    set_material_color(mat, spec)
    return mat


def flat_material(name, hexcol, alpha=1.0):
    """Color plano, sin luz. Con alfa < 1 deja ver el agua del motor debajo."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = lin4(hex_srgb(hexcol))
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    if alpha >= 1.0:
        nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
        return mat
    transp = nt.nodes.new("ShaderNodeBsdfTransparent")
    mixer = nt.nodes.new("ShaderNodeMixShader")
    mixer.inputs["Fac"].default_value = alpha
    nt.links.new(transp.outputs["BSDF"], mixer.inputs[1])
    nt.links.new(emit.outputs["Emission"], mixer.inputs[2])
    nt.links.new(mixer.outputs["Shader"], out.inputs["Surface"])
    mat.surface_render_method = "BLENDED"
    return mat


def masked_material(name, spec_a, spec_b, build_mask):
    """Toon con dos juegos de tonos: `spec_b` donde la máscara vale 1, `spec_a` donde vale 0.

    `build_mask(node_tree)` devuelve un socket de salida con valores en [0, 1].
    """
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    diffuse = nt.nodes.new("ShaderNodeBsdfDiffuse")
    to_rgb = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp_a = _toon_ramp(nt, "toon_ramp_a")
    ramp_b = _toon_ramp(nt, "toon_ramp_b")
    for ramp, spec in ((ramp_a, spec_a), (ramp_b, spec_b)):
        for el, tone in zip(ramp.color_ramp.elements, _tones(spec)):
            el.color = lin4(tone)
    mixer = nt.nodes.new("ShaderNodeMix")
    mixer.data_type = "RGBA"
    sock = lambda sockets, ident: next(x for x in sockets if x.identifier == ident)   # noqa: E731
    emit = nt.nodes.new("ShaderNodeEmission")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(diffuse.outputs["BSDF"], to_rgb.inputs["Shader"])
    nt.links.new(to_rgb.outputs["Color"], ramp_a.inputs["Fac"])
    nt.links.new(to_rgb.outputs["Color"], ramp_b.inputs["Fac"])
    nt.links.new(build_mask(nt), sock(mixer.inputs, "Factor_Float"))
    nt.links.new(ramp_a.outputs["Color"], sock(mixer.inputs, "A_Color"))
    nt.links.new(ramp_b.outputs["Color"], sock(mixer.inputs, "B_Color"))
    nt.links.new(sock(mixer.outputs, "Result_Color"), emit.inputs["Color"])
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


def outline_material():
    mat = bpy.data.materials.new("outline")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = lin4(hex_srgb(OUTLINE_COLOR))
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    mat.use_backface_culling = True
    return mat


# --- Objetos ----------------------------------------------------------------
def link_object(name, bm, mats, parent, outline_mat, outline=True, thickness=0.0, outline_scale=1.0,
                smooth=True, recalc=True):
    me = bpy.data.meshes.new(name)
    if recalc:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # Sombreado suave con aristas vivas: los cortes del toon siguen la forma, no las caras.
    for f in bm.faces:
        f.smooth = smooth
    sharp = math.radians(SHARP_ANGLE_DEG)
    for e in bm.edges:
        e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(0.0) < sharp
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    if thickness:
        mod = obj.modifiers.new("thickness", "SOLIDIFY")
        mod.thickness = thickness
        mod.offset = 0.0
    if outline:
        # Casco invertido: copia hacia fuera con normales giradas; sólo se ven
        # sus caras traseras, que dibujan la silueta de cada pieza.
        n = len(mats)
        for _ in range(n):
            me.materials.append(outline_mat)
        mod = obj.modifiers.new("outline", "SOLIDIFY")
        mod.thickness = OUTLINE_WIDTH * outline_scale
        mod.offset = 1.0
        mod.use_flip_normals = True
        mod.use_even_offset = True
        mod.material_offset = n
        mod.material_offset_rim = n
    return obj
