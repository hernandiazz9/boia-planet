"""Tema del mundo de acuarela (B02): cómo se ve cada papel de la escena. MUESTRA.

Los materiales son los del estilo 02 (tools/blender/styles/02_acuarela_ilustrada.py,
importado sin tocarlo): rampa toon de dos escalones blandos, sombra con un
glaseado azul violeta (notas_render de B02), manchas de pigmento, segundo
pigmento, grano de papel y papel que asoma en las luces. Dos cambios para el
arte de mundo:

- El grano y las manchas no van en coordenadas de ventana (0..1 en cada eje,
  que en un lienzo no cuadrado estiran el ruido) sino en píxeles de pantalla:
  coordenadas de cámara × pixels_per_unit / 256. Así una mancha mide lo mismo
  que en el barco, renderizado a 256 px, en cualquier lienzo.
- En las losas de costa el ruido es periódico a lo largo de la costa (el eje
  de la losa se enrolla en un círculo de 3D), para que la losa case consigo
  misma sin costura.

Cada pieza nombra un papel, nunca un color (§48). El contorno es el del barco
(casco invertido de OUTLINE_WIDTH, marrón grisáceo), salvo en el agua, la espuma
y las piezas diminutas.
"""
import math
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
MUNDOS = os.path.dirname(HERE)
if MUNDOS not in sys.path:
    sys.path.insert(0, MUNDOS)
import temas  # noqa: E402  (mundos/temas.py: base Tema y load_style)

W = temas.load_style("02_acuarela_ilustrada.py", "estilo_acuarela_mundo")
import rig  # noqa: E402

REF_PX = float(rig.RESOLUTION)           # el estilo está calibrado a 256 px por unidad de ventana

# Paleta del mundo (muestra). Lo que coincide con el barco B02 sale de su PAL.
PAL = W.PAL
HEX = {
    # agua y orilla: aguadas claras, lejos del azul del casco B02 (#2C62BE)
    "sea": "#5FB3AE", "sea_deep": "#2F8A8C", "shallow": "#9ED9CF", "foam": "#FBF6EA",
    # tierra de la costa de Alicante: arenisca clara, caliza, ocre y verdes secos
    "sand": "#F0D9A8", "sand_wet": "#D9BD8A", "grass": "#9DBB6A", "rock": "#B8A48E", "stone": "#D8CBB6",
    "limestone": "#D9C9AE", "limestone_dark": "#A48B70", "scrub": "#B5B874", "scrub_dark": "#7E9150", "ochre": "#D99A55", "cliff": "#E2A970",
    "cliff_dark": "#B77B55", "earth": "#C98E62",
    # vegetación
    "leaf": PAL["leaf"], "leaf2": PAL["leaf2"], "pine": "#4F8446", "palm": "#5E9C48", "agave": "#7FA89A",
    "bougainvillea": "#D9468F", "flower": PAL["flower"], "posidonia": "#6E8C4A", "trunk": "#9B6B45",
    "coconut": "#7A5234",
    # arquitectura: cal, persianas azules, teja, cúpula de Altea, casas de colores de La Vila
    "whitewash": "#FBF3E4", "wall": PAL["cabin"], "blue_door": "#2E6FA8", "roof_tile": "#C8643A",
    "dome_a": "#2F6FC0", "dome_b": "#F3EBDD", "house_a": "#E9A23B", "house_b": "#D9546B", "house_c": "#7FB7C9",
    "house_d": "#F2D16B", "house_e": "#9FC27A", "chimney": PAL["chimney"], "window": PAL["window"],
    # madera y cabos
    "wood": PAL["wood"], "wood_dark": "#7E5132", "deck": PAL["deck"], "stage_wood": "#B07A4A", "rope": PAL["rope"],
    "barrel": PAL["barrel"], "crate": PAL["crate"], "cork": "#C29363", "net": "#6D8C8E",
    # metal y señales
    "iron": PAL["metal"], "metal": "#8E909C", "wire": "#4A4150", "red": "#DA3A2C", "white": PAL["ring_white"],
    "lane_a": "#F2761F", "lane_b": "#FBF4E6", "checker_a": "#2F2A33", "checker_b": "#FBF4E6",
    # el mosaico de olas de la Explanada: rojo, crema y negro
    "mosaic_a": "#C8412F", "mosaic_b": "#F4E6CC", "mosaic_c": "#2E2A2E",
    # toldos de barraca y velas
    "awning_a": "#E0503A", "awning_b": "#FBF1DF", "canvas": PAL["awning"], "sail": "#F7EEDC", "band": "#F2761F",
    "flag": PAL["flag"],
    # personajes y fiesta (la Boia Fiestera conserva su rosa y su amarillo)
    "fiestera": "#F2557A", "fiestera_band": "#FFD23F", "skin": "#EFC39A", "hair": "#5A3A2A", "ink": "#3A2E2A",
    "person_a": "#F2761F", "person_b": "#3C74C4", "person_c": "#DA3A2C", "person_d": "#8FC05A", "person_e": "#9A5BC0",
    "person_f": "#F7C948", "shirt_a": "#F2761F", "shirt_b": "#3C74C4", "hat": "#F6EBD5", "stripe": "#3C74C4",
    "speaker": "#3A3F52", "door": "#2E6FA8", "terracotta": PAL["pot"], "pot": PAL["pot"],
    # animales y objetos del mar vivo
    "croc": "#6FA84A", "croc_dark": "#4C7E34", "croc_belly": "#E0E69A", "dolphin": "#8AA8C4",
    "dolphin_belly": "#F0F4F6", "chest": "#A4643A", "gold": "#F2C230", "coin": "#F7D046", "bottle": "#6FB58E",
    "paper": "#FFF6E0", "jelly": "#F29BC4", "orange": "#F29A2E", "seagull": "#FBF8F0", "gull_wing": "#A3AAB5",
    "beak": "#F2A33A", "shell": "#F4D9C6",
    # fotos, tienda y escenario
    "photo_body": "#34343C", "photo_lens": "#7FB3D3", "photo_paper": "#FFFBF2", "darkroom": "#C0463A",
    "tote": "#EEDDBF", "sticker_a": "#FFD23F", "sticker_b": "#35A9DD", "firework_a": "#FF6FA8",
    "firework_b": "#FFD23F", "firework_c": "#35A9DD", "rice": "#F2B233", "pepper": "#E43B30", "pea": "#5FA34E",
    "pan": "#3A3F58", "tile_a": "#FBF4E6", "tile_b": "#2E6FA8", "hull": PAL["hull"], "frame": "#6B8E5A",
    "kiln_mouth": "#2E2328", "smoke": "#F3EEE6", "glass": "#7FB3D3", "flag_b": "#35A9DD",
}
# Papeles que «brillan»: en acuarela, color plano de papel iluminado (sin sombra), como el farol del barco.
FLAT = {
    "bulb": "#FFD27E", "fire": "#FF9A45", "lantern": "#FFC06A", "croc_eye": "#FFE45C", "window_lit": "#FFE0A8",
    "spawn_glow": "#DDF6F2", "stage_light": "#FFC061", "stage_magenta": "#FF6FA8", "lumi": "#A8F2E6",
    "red_light": "#FF5A48", "green_light": "#5ED67E", "flash": "#FFFDF2", "glow": W.GLOW,
}
NO_OUTLINE = {"shallow", "foam", "sea", "sea_deep", "spawn_glow", "smoke", "posidonia", "lumi"}
TINY = 0.07          # piezas más pequeñas que esto (u) no llevan contorno: se volverían una mancha


class Acuarela(temas.Tema):
    id, nombre, barco = "acuarela", "Acuarela", "B02"
    HEX, FLAT = HEX, FLAT

    def __init__(self, period=None):
        """period: (eje, px) en las losas de costa; el ruido se repite cada px a lo largo de ese eje de pantalla."""
        super().__init__()
        self.period = period
        self.outline_mat = None
        self._coords = None

    def setup(self, W_, H_):
        scene = rig.reset_scene()
        rig.setup_render(scene, transparent=True, width=W_, height=H_)
        rig.add_sun(scene)          # la luz del estudio del barco B02: sol fijo sin sombras proyectadas
        return scene

    # --- coordenadas del ruido ---------------------------------------------------------
    def coords(self, g):
        """Vector de ruido en «unidades de 256 px» de pantalla (periódico a lo largo de la costa en las losas)."""
        k = rig.pixels_per_unit() / REF_PX
        tc = g.new("ShaderNodeTexCoord")
        sep = g.new("ShaderNodeSeparateXYZ")
        g.nt.links.new(tc.outputs["Camera"], sep.inputs[0])
        x = g.math("MULTIPLY", sep.outputs["X"], k)
        y = g.math("MULTIPLY", sep.outputs["Y"], k)
        comb = g.new("ShaderNodeCombineXYZ")
        if self.period is None:
            g.nt.links.new(x, comb.inputs["X"])
            g.nt.links.new(y, comb.inputs["Y"])
            comb.inputs["Z"].default_value = 0.0
        else:
            axis, per_px = self.period
            per = per_px / REF_PX                        # periodo en las mismas unidades
            R = per / (2.0 * math.pi)                    # circunferencia = periodo: la escala del ruido no cambia
            along, across = (y, x) if axis == "y" else (x, y)
            th = g.math("MULTIPLY", along, 2.0 * math.pi / per)
            g.nt.links.new(across, comb.inputs["X"])
            g.nt.links.new(g.math("MULTIPLY", g.math("COSINE", th), R), comb.inputs["Y"])
            g.nt.links.new(g.math("MULTIPLY", g.math("SINE", th), R), comb.inputs["Z"])
        return comb.outputs["Vector"]

    # --- materiales ---------------------------------------------------------------------
    def wc(self, name, hexcol, hue_shift=-0.035, flat=False, blot_amt=0.9, grain_amt=0.24, pool=0.55, pattern=None,
           second=None):
        """wc_material del estilo 02 con el ruido en píxeles de pantalla (ver coords)."""
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        g = W.Graph(mat)
        out = g.new("ShaderNodeOutputMaterial")
        emit = g.new("ShaderNodeEmission")
        emit.inputs["Strength"].default_value = 1.0
        g.nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
        vec = self.coords(g)
        sd = W.seed_of(name)
        grain = g.noise(vec, W.GRAIN_SCALE, 2.0, 0.65)
        if flat:
            c = W.hex_srgb(hexcol)
            col = g.mix(g.math("MULTIPLY", grain, 0.5), W.lin4(c), W.lin4(W.mix(c, W.hex_srgb(W.PAPER), 0.5)))
            g.nt.links.new(col, emit.inputs["Color"])
            return mat
        blot = g.noise(vec, W.BLOT_SCALE, 3.0, 0.55, 0.8, (sd, sd * 0.7, sd * 0.3))
        blot2 = g.noise(vec, W.VARIANT_SCALE, 2.0, 0.5, 0.5, (sd * 1.3 + 7.0, sd * 0.2, 3.0))
        diff = g.new("ShaderNodeBsdfDiffuse")
        diff.inputs["Color"].default_value = (1, 1, 1, 1)
        s2r = g.new("ShaderNodeShaderToRGB")
        g.nt.links.new(diff.outputs["BSDF"], s2r.inputs["Shader"])
        bw = g.new("ShaderNodeRGBToBW")
        g.nt.links.new(s2r.outputs["Color"], bw.inputs["Color"])
        L = bw.outputs["Val"]
        s = g.math("ADD", g.remap(L, 0.05, 0.22, 0.0, 0.5), g.remap(L, 0.52, 0.76, 0.0, 0.5))
        s = g.math("MULTIPLY_ADD", blot, blot_amt, s)
        s = g.math("MULTIPLY_ADD", grain, grain_amt, s)
        s = g.math("SUBTRACT", s, 0.5 * (blot_amt + grain_amt), clamp=True)
        main, variant = W.tones(hexcol, hue_shift)
        col = g.tone_ramp(s, main)
        col = g.mix(g.remap(blot2, 0.46, 0.72, 0.0, 0.55), col, g.tone_ramp(s, variant))
        if pattern:
            mask = pattern(g)
            sec_main, _ = W.tones(second, hue_shift)
            col = g.mix(mask, col, g.tone_ramp(s, sec_main))
        lw = g.new("ShaderNodeLayerWeight")
        lw.inputs["Blend"].default_value = 0.35
        edge = g.math("MULTIPLY", g.remap(lw.outputs["Facing"], 0.5, 0.92), pool)
        deep = g.new("ShaderNodeGamma")
        g.nt.links.new(col, deep.inputs["Color"])
        deep.inputs["Gamma"].default_value = 1.7
        col = g.mix(edge, col, deep.outputs["Color"])
        paper = g.math("MULTIPLY", g.remap(s, 0.72, 0.98), g.remap(grain, 0.57, 0.70, 0.0, 0.35))
        col = g.mix(paper, col, W.lin4(W.hex_srgb(W.PAPER)))
        g.nt.links.new(col, emit.inputs["Color"])
        return mat

    def mosaic(self, g):
        """Olas del mosaico de la Explanada en coordenadas del mapa: bandas onduladas a lo largo de x.
        La onda se repite cada L_SUR/12 u del mapa, así las losas del paseo casan."""
        geo = g.new("ShaderNodeNewGeometry")
        sep = g.new("ShaderNodeSeparateXYZ")
        g.nt.links.new(geo.outputs["Position"], sep.inputs[0])
        s2 = math.sqrt(0.5)
        mx = g.math("MULTIPLY", g.math("ADD", sep.outputs["X"], sep.outputs["Y"]), s2)
        my = g.math("MULTIPLY", g.math("SUBTRACT", sep.outputs["X"], sep.outputs["Y"]), s2)
        lam = 768.0 / rig.pixels_per_unit() / 12.0
        wave = g.math("SINE", g.math("MULTIPLY", mx, 2.0 * math.pi / lam))
        v = g.math("MULTIPLY_ADD", wave, 0.07, my)
        return g.math("FRACT", g.math("MULTIPLY", v, 1.0 / 0.36))

    def make(self, role):
        if role in FLAT:
            return self.wc(role, FLAT[role], flat=True)
        if role in ("mosaic", "mosaic_wave"):
            # tres pigmentos por bandas: crema, rojo y negro
            def pat_red(g):
                f = self.mosaic(g)
                return g.math("MULTIPLY", g.remap(f, 0.22, 0.26), g.remap(f, 0.60, 0.64, 1.0, 0.0))
            mat = self.wc(role, HEX["mosaic_b"], hue_shift=0.03, pool=0.3, pattern=pat_red, second=HEX["mosaic_a"])
            return mat
        if role not in HEX:
            raise KeyError("papel %r sin color en mundos/acuarela/tema.py" % role)
        kw = {}
        if role in ("sea", "sea_deep", "shallow"):
            kw = dict(hue_shift=0.04, pool=0.25, blot_amt=0.7)
        elif role in ("foam", "whitewash", "wall", "white", "paper", "sail", "awning_b", "canvas", "dome_b",
                      "lane_b", "checker_b", "tile_a", "photo_paper", "seagull", "hat", "smoke"):
            kw = dict(hue_shift=0.05, pool=0.4, blot_amt=0.7)
        elif role in ("hull", "blue_door", "dome_a", "window", "tile_b"):
            kw = dict(hue_shift=-0.045)
        elif role in ("deck", "stage_wood"):
            kw = dict(pattern=lambda g: W.pattern_planks(g, g.new("ShaderNodeTexCoord")), second="#A9713F",
                      hue_shift=0.02)
        return self.wc(role, HEX[role], **kw)

    def decorate(self, obj, role):
        if role in NO_OUTLINE:
            return
        me = obj.data
        # Hojas abiertas (banderas, velas de una cara): el casco invertido las cubriría de contorno.
        count = {}
        for p in me.polygons:
            for ek in p.edge_keys:
                count[ek] = count.get(ek, 0) + 1
        if any(n == 1 for n in count.values()):
            return
        cos = [v.co for v in me.vertices]
        if cos and max(max(c[k] for c in cos) - min(c[k] for c in cos) for k in range(3)) < TINY:
            return
        if self.outline_mat is None:
            self.outline_mat = W.outline_material()
        n = len(me.materials)
        me.materials.append(self.outline_mat)
        mod = obj.modifiers.new("outline", "SOLIDIFY")
        mod.thickness = W.OUTLINE_WIDTH
        mod.offset = 1.0
        mod.use_flip_normals = True
        mod.use_even_offset = False
        mod.material_offset = n
        mod.material_offset_rim = n

    def lights(self, scene, B):
        pass

    def hora(self, scene, B, hora):
        pass
