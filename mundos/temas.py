"""Temas de mundo: cómo se ve cada rol de la escena en cada estilo.

Un tema aporta materiales por rol, la luz y el render de su estilo, su barco y,
si tiene sentido, una variante de noche. Reutiliza los scripts de estilo de
tools/blender/styles/ importándolos, sin modificarlos: sólo se ajustan algunas
constantes de módulo para una imagen grande (el estilo está calibrado a 256 px).
"""
import importlib.util
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
STYLES = os.path.join(os.path.dirname(HERE), "tools", "blender", "styles")


def load_style(filename, alias):
    spec = importlib.util.spec_from_file_location(alias, os.path.join(STYLES, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)          # sólo define: main() va tras `if __name__ == "__main__"`
    return mod


A = load_style("05_arcilla_maqueta.py", "estilo_arcilla")
P = load_style("01_boceto_lapiz.py", "estilo_lapiz")
C6 = load_style("06_cartoon_anos_30.py", "estilo_cartoon")
import rig  # noqa: E402  (ya en sys.path por los estilos)


class Tema:
    id = nombre = barco = ""
    variantes = ("dia",)

    def __init__(self):
        self.cache = {}

    def material(self, role):
        if role not in self.cache:
            self.cache[role] = self.make(role)
        return self.cache[role]

    def decorate(self, obj, role):
        pass

    def lights(self, scene, B):
        pass

    def hora(self, scene, B, hora):
        pass

    def base_scene(self, W, H):
        scene = rig.reset_scene()
        rig.setup_render(scene, transparent=False, width=W, height=H)
        rig.add_sun(scene)
        return scene


# --- Arcilla (B05, mundo principal) -------------------------------------------
class Arcilla(Tema):
    id, nombre, barco = "arcilla", "Arcilla", "B05"
    variantes = ("dia", "noche")
    C = A.C
    HEX = {
        "sand": "#EBCF9E", "grass": "#7DB043", "terracotta": "#C8643A", "trunk": "#9C6B45", "coconut": "#6E4A2E",
        "leaf": A.C["leaf"], "wall": A.C["wall"], "wood": A.C["wood"], "wood_dark": A.C["wood_dark"],
        "tile_a": "#FFF7EC", "tile_b": "#2C62BE", "foam": "#D9F3F7", "rock": "#8C7F73", "rice": "#F2B233",
        "pepper": "#E43B30", "pea": "#4F9A45", "pan": "#3A3F58", "iron": A.C["iron"], "smoke": "#EDE6DA",
        "kiln_mouth": "#2B1E1A", "wire": A.C["wire"], "band": A.C["band"], "flag": A.C["flag"], "door": A.C["door"],
        "speaker": A.C["dark"], "red": A.C["red"], "white": A.C["white"], "skin": "#E8B98F",
        "person_a": "#F26A1B", "person_b": "#2C62BE", "person_c": "#E43B30", "person_d": "#86BE36",
        "shirt_a": "#F26A1B", "shirt_b": "#2C62BE",
        # --- Mundo de arcilla completo (mundos/arcilla): papeles nuevos, muestra ---
        # Mar más claro que el #0F5F7D del primer archipiélago: el verde del casco B05 queda a ΔE ≥ 30.
        "sea": "#1A7AA6", "shallow": "#3AA3C4",
        "ink": "#231C1A", "hair": "#4A3024", "whitewash": "#F4EFE6", "blue_door": "#2F6FB0", "stone": "#B9AA96",
        "cliff": "#D69B5F", "cliff_dark": "#A86E3E", "pine": "#4E7D3A", "roof_tile": "#C4553A",
        "fiestera": "#F2557A", "fiestera_band": "#FFD23F", "croc": "#5E9A3C", "croc_dark": "#3F6E28",
        "croc_belly": "#D6E08A", "posidonia": "#3F7F4A", "dolphin": "#7F9CB6", "dolphin_belly": "#E4ECF0",
        "chest": "#9A5B2E", "gold": "#F2C230", "coin": "#F7D046", "bottle": "#E3A33C", "cork": "#B98556",
        "paper": "#FFF4DC", "jelly": "#F28BB8", "lane_a": "#F26A1B", "lane_b": "#FFF7EC",
        "checker_a": "#231C1A", "checker_b": "#FFF7EC", "photo_body": "#2B2B33", "photo_lens": "#6FA8C8",
        "photo_paper": "#FFFBF2", "darkroom": "#B23A2E", "tote": "#EADBC0", "sticker_a": "#FFD23F",
        "sticker_b": "#29A8E0", "canvas": "#F1E4CC", "stage_wood": "#A9683A", "firework_a": "#FF5DA2",
        "firework_b": "#FFD23F", "firework_c": "#29A8E0", "sea_deep": "#0A4459", "seagull": "#FAFAF5",
        "gull_wing": "#9AA3AD", "beak": "#F2A33A", "rope": "#C9A36B", "metal": "#8C8F99", "net": "#5F7F86",
        "person_e": "#8E3FB0", "person_f": "#FFD23F", "hat": "#F4EFE6", "stripe": "#2C62BE",
        "barrel": A.C["barrel"], "chimney": A.C["chimney"], "frame": A.C["frame"], "hull": A.C["hull"],
    }
    # Papeles que brillan: (sRGB, fuerza de día, atardecer, noche). Con luz, de noche.
    GLOW = {
        "bulb": (A.C["bulb"], 1.5, 5.0, 16.0), "fire": ("#FF8A3D", 3.0, 4.0, 9.0),
        "lantern": ("#FFB85C", 0.0, 2.5, 7.0), "croc_eye": ("#FFE45C", 0.0, 1.0, 6.0),
        "window_lit": ("#FFD9A0", 0.0, 1.5, 5.0), "spawn_glow": ("#BFF3FF", 0.0, 0.8, 3.0),
        "stage_light": ("#FFB347", 0.3, 3.0, 12.0), "stage_magenta": ("#FF5DA2", 0.3, 3.0, 12.0),
        "lumi": ("#7FF6E6", 0.0, 0.4, 2.2), "red_light": ("#FF3B2E", 0.0, 2.0, 7.0),
        "green_light": ("#3BFF6A", 0.0, 2.0, 7.0), "flash": ("#FFFFFF", 0.2, 2.0, 8.0),
    }
    # Luz de cada hora: sol (energía, color, hacia la luz en ejes de cámara) y cielo (color, fuerza).
    HORAS = {
        "dia": dict(sun=(4.2, (1.0, 1.0, 1.0), (-0.45, 0.55, 0.85)), sky=((0.78, 0.85, 1.0), 0.5), exposure=0.0),
        "atardecer": dict(sun=(3.6, (1.0, 0.48, 0.22), (-0.9, 0.3, 0.36)), sky=((1.0, 0.5, 0.42), 0.6), exposure=0.0),
        "noche": dict(sun=(0.75, (0.66, 0.74, 1.0), (-0.3, 0.6, 0.8)), sky=((0.10, 0.13, 0.30), 0.7), exposure=0.0),
    }

    def setup(self, W, H):
        scene, cam = A.setup_scene()
        bpy.data.objects.remove(cam, do_unlink=True)
        scene.render.resolution_x, scene.render.resolution_y = W, H
        scene.render.film_transparent = False
        self.glows, self.lamps = [], []
        return scene

    def lights(self, scene, B):
        """Crea las luces puntuales de la escena (B.luces); hora() decide cuáles se encienden."""
        for i, (pos, col, energy, horas) in enumerate(B.luces):
            ld = bpy.data.lights.new("luz_%d" % i, type="POINT")
            ld.energy, ld.color, ld.shadow_soft_size = energy, col, 0.15
            lo = bpy.data.objects.new("luz_%d" % i, ld)
            lo.location = pos
            scene.collection.objects.link(lo)
            self.lamps.append((lo, horas))

    def hora(self, scene, B, hora):
        """Pone la luz de la hora: sol, cielo, brillo de los papeles emisivos y luces puntuales."""
        H = self.HORAS[hora]
        idx = ("dia", "atardecer", "noche").index(hora)
        sun = next(o for o in scene.objects if o.type == "LIGHT" and o.data.type == "SUN")
        energy, color, (kr, kt, kz) = H["sun"]
        sun.data.energy, sun.data.color = energy, color
        right, toward, _ = rig.camera_basis()
        to_light = (kr * right + kt * toward + Vector((0, 0, kz))).normalized()
        sun.rotation_euler = to_light.to_track_quat("Z", "Y").to_euler()
        bg = scene.world.node_tree.nodes.get("Background")
        bg.inputs["Color"].default_value = H["sky"][0] + (1.0,)
        bg.inputs["Strength"].default_value = H["sky"][1]
        scene.view_settings.exposure = H["exposure"]
        for sock, role in self.glows:
            sock.default_value = self.GLOW[role][1 + idx]
        for lo, horas in self.lamps:
            lo.hide_render = hora not in horas

    def make(self, role):
        if role in self.GLOW:
            # Arcilla que además brilla: de día se ve su color, de noche su luz.
            hexcol, day, _, _ = self.GLOW[role]
            mat = A.clay(role, hexcol, rough=0.5, sss=0.1, bump=0.1, emit=1.0)
            bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
            sock = bsdf.inputs["Emission Strength"]
            sock.default_value = day
            self.glows.append((sock, role))
            return mat
        if role == "sea":
            return A.clay(role, self.HEX["sea"], rough=0.35, sss=0.0, bump=0.45, scale=5.0, vary=0.08)
        if role == "sea_deep":
            return A.clay(role, self.HEX[role], rough=0.3, sss=0.0, bump=0.5, scale=6.0, vary=0.1)
        if role in ("gold", "coin"):
            return A.clay(role, self.HEX[role], rough=0.35, sss=0.0, bump=0.1, sheen=0.3)
        if role == "bottle":
            return A.clay(role, self.HEX[role], rough=0.22, sss=0.2, bump=0.05, emit=0.08)
        if role == "jelly":
            return A.clay(role, self.HEX[role], rough=0.3, sss=0.4, bump=0.05, emit=0.15)
        if role == "photo_lens":
            return A.clay(role, self.HEX[role], rough=0.2, sss=0.0, bump=0.02, emit=0.1)
        if role == "shallow":
            return A.clay(role, self.HEX["shallow"], rough=0.4, sss=0.0, bump=0.25, scale=7.0, vary=0.1)
        if role == "sand":
            return A.clay(role, self.HEX["sand"], bump=0.35, scale=22.0, vary=0.08)
        if role == "deck":
            return A.clay(role, A.C["deck"], pattern="y", pattern_k=70.0, pattern_bump=0.35)
        if role == "thatch":
            return A.clay(role, A.C["thatch"], pattern="radial", pattern_k=34.0, pattern_bump=0.55, vary=0.22, sheen=0.1)
        if role == "glass":
            return A.clay(role, A.C["glass"], rough=0.3, sss=0.0, bump=0.05, emit=0.25)
        return A.clay(role, self.HEX[role])

    def build_ship(self):
        return A.build_ship()[0]

    def night(self, scene, B):
        sun = next(o for o in scene.objects if o.type == "LIGHT")
        sun.data.energy = 0.9
        sun.data.color = (1.0, 0.62, 0.42)
        bg = scene.world.node_tree.nodes.get("Background")
        bg.inputs["Color"].default_value = (0.10, 0.13, 0.30, 1.0)
        bg.inputs["Strength"].default_value = 0.7
        for mat in bpy.data.materials:
            if mat.node_tree:
                for n in mat.node_tree.nodes:
                    if n.type == "EMISSION":
                        n.inputs["Strength"].default_value *= 3.0
        for i, (pos, col, energy) in enumerate(B.luces):
            ld = bpy.data.lights.new("luz_%d" % i, type="POINT")
            ld.energy, ld.color, ld.shadow_soft_size = energy, col, 0.15
            lo = bpy.data.objects.new("luz_%d" % i, ld)
            lo.location = pos
            scene.collection.objects.link(lo)


# --- Papel (B01) ----------------------------------------------------------------
class Papel(Tema):
    id, nombre, barco = "papel", "Papel", "B01"
    DARK = {
        "sand": 0.0, "grass": 0.12, "terracotta": 0.24, "trunk": 0.3, "coconut": 0.45, "leaf": 0.2, "wall": 0.0,
        "thatch": 0.1, "wood": 0.18, "wood_dark": 0.32, "deck": 0.28, "tile_a": 0.0, "tile_b": 0.4, "rock": 0.25,
        "rice": 0.04, "pepper": 0.45, "pea": 0.45, "pan": 0.55, "iron": 0.55, "smoke": 0.0, "band": 0.3,
        "flag": 0.55, "door": 0.35, "speaker": 0.6, "red": 0.45, "white": 0.0, "skin": 0.05, "person_a": 0.3,
        "person_b": 0.45, "person_c": 0.15, "person_d": 0.55, "shirt_a": 0.2, "shirt_b": 0.45,
    }
    FLAT = {"sea": 0.955, "shallow": 0.925, "foam": 0.99, "bulb": 0.99, "fire": 0.96, "glass": 0.3, "wire": 0.25,
            "kiln_mouth": 0.2, "sea_deep": 0.8, "ink": 0.15, "lantern": 0.97, "croc_eye": 0.9, "window_lit": 0.95,
            "spawn_glow": 0.99, "stage_light": 0.97, "stage_magenta": 0.9, "lumi": 0.98, "red_light": 0.6,
            "green_light": 0.7, "flash": 0.99}
    # Papeles nuevos del mundo de arcilla completo: cuánto tramado llevan.
    DARK.update({
        "hair": 0.5, "whitewash": 0.0, "blue_door": 0.45, "stone": 0.2, "cliff": 0.14, "cliff_dark": 0.35, "pine": 0.4,
        "roof_tile": 0.3, "fiestera": 0.2, "fiestera_band": 0.02, "croc": 0.35, "croc_dark": 0.5, "croc_belly": 0.08,
        "posidonia": 0.4, "dolphin": 0.25, "dolphin_belly": 0.0, "chest": 0.35, "gold": 0.05, "coin": 0.02,
        "bottle": 0.15, "cork": 0.25, "paper": 0.0, "jelly": 0.1, "lane_a": 0.2, "lane_b": 0.0, "checker_a": 0.6,
        "checker_b": 0.0, "photo_body": 0.6, "photo_lens": 0.3, "photo_paper": 0.0, "darkroom": 0.45, "tote": 0.04,
        "sticker_a": 0.05, "sticker_b": 0.3, "canvas": 0.02, "stage_wood": 0.25, "firework_a": 0.2, "firework_b": 0.05,
        "firework_c": 0.3, "seagull": 0.0, "gull_wing": 0.3, "beak": 0.2, "rope": 0.15, "metal": 0.4, "net": 0.35,
        "person_e": 0.4, "person_f": 0.05, "hat": 0.0, "stripe": 0.4,
    })

    def setup(self, W, H):
        P.REF_RES = 900.0            # tramado: ~6 px entre líneas a 1600 px (calibrado a 256 en el estilo)
        scene = self.base_scene(W, H)
        P.setup_lines(scene, 1.6)
        return scene

    def make(self, role):
        if role in self.FLAT:
            return P.flat_material(role, self.FLAT[role])
        return P.pencil_material(role, self.DARK.get(role, 0.3))

    def build_ship(self):
        return P.build_ship()


# --- Cartoon (B06) --------------------------------------------------------------
class Cartoon(Tema):
    id, nombre, barco = "cartoon", "Cartoon", "B06"
    TONES = {
        "sand": ("#F1E3BF", "#C9B28A", "#7E6547"),
        "grass": ("#9AAE52", "#6B7C33", "#3C4620"),
        "leaf": ("#7FA23F", "#566F28", "#34431A"),
        "sea": ("#5F9C9A", "#467A78", "#2C5250"),
        "shallow": ("#8FC3BE", "#6FA3A0", "#4C7D7A"),
        "rock": ("#A89A88", "#7A6D5E", "#4A4038"),
        "blue": ("#4E7FB8", "#35598A", "#1F3553"),
        "rice": ("#E8C36A", "#B8923F", "#6E5424"),
    }
    ROLE = {
        "sand": "sand", "grass": "grass", "terracotta": "red", "trunk": "wood", "coconut": "black", "leaf": "leaf",
        "wall": "cream", "thatch": "wood", "wood": "wood", "wood_dark": "black", "deck": "wood", "tile_a": "cream",
        "tile_b": "red", "sea": "sea", "shallow": "shallow", "rock": "rock", "rice": "rice", "pepper": "red",
        "pea": "leaf", "pan": "black", "iron": "black", "band": "red", "flag": "red", "door": "wood",
        "speaker": "black", "red": "red", "glass": "black", "white": "cream", "skin": "cream",
        "person_a": "red", "person_b": "blue", "person_c": "cream", "person_d": "black", "shirt_a": "red", "shirt_b": "blue",
    }
    FLAT = {"foam": C6.CREAM, "smoke": C6.CREAM, "bulb": C6.GLOW, "fire": C6.GLOW, "wire": C6.INK, "kiln_mouth": C6.INK,
            "ink": C6.INK, "lantern": C6.GLOW, "croc_eye": C6.GLOW, "window_lit": C6.GLOW, "spawn_glow": C6.CREAM,
            "stage_light": C6.GLOW, "stage_magenta": C6.RED, "lumi": C6.CREAM, "red_light": C6.RED,
            "green_light": C6.GLOW, "flash": C6.CREAM, "coin": C6.GLOW, "gold": C6.GLOW}
    ROLE.update({
        "hair": "black", "whitewash": "cream", "blue_door": "blue", "stone": "rock", "cliff": "sand", "cliff_dark": "wood",
        "pine": "leaf", "roof_tile": "red", "fiestera": "red", "fiestera_band": "cream", "croc": "grass",
        "croc_dark": "leaf", "croc_belly": "sand", "posidonia": "leaf", "dolphin": "blue", "dolphin_belly": "cream",
        "chest": "wood", "bottle": "rice", "cork": "wood", "paper": "cream", "jelly": "red", "lane_a": "red",
        "lane_b": "cream", "checker_a": "black", "checker_b": "cream", "photo_body": "black", "photo_lens": "blue",
        "photo_paper": "cream", "darkroom": "red", "tote": "cream", "sticker_a": "rice", "sticker_b": "blue",
        "canvas": "cream", "stage_wood": "wood", "firework_a": "red", "firework_b": "rice", "firework_c": "blue",
        "sea_deep": "sea", "seagull": "cream", "gull_wing": "rock", "beak": "rice", "rope": "sand", "metal": "rock",
        "net": "rock", "person_e": "red", "person_f": "rice", "hat": "cream", "stripe": "blue",
    })
    NO_OUTLINE = {"sea", "shallow"}
    OUTLINE = 0.03
    # Piezas finas: el casco invertido las convierte en manchas si el trazo es grueso.
    THIN = {"leaf": 0.006, "flag": 0.006, "shirt_a": 0.006, "shirt_b": 0.006, "deck": 0.01, "pan": 0.01,
            "rice": 0.006, "tile_a": 0.008, "tile_b": 0.008, "band": 0.012, "pepper": 0.004, "pea": 0.004,
            "wire": 0.0, "foam": 0.01, "bulb": 0.008, "fire": 0.0, "kiln_mouth": 0.0, "glass": 0.008}

    def setup(self, W, H):
        C6.HALFTONE_CELLS = 300      # puntos de ~5 px a 1600 px (calibrado a 256 en el estilo)
        C6.TONES.update(self.TONES)
        self.outline_mat = None
        return self.base_scene(W, H)

    def make(self, role):
        if role in self.FLAT:
            return C6.toon_material(role, self.FLAT[role], flat=True)
        tone = self.ROLE.get(role, "cream")
        return C6.toon_material(role, tone, glint=(tone == "black"))

    def decorate(self, obj, role):
        width = self.THIN.get(role, self.OUTLINE)
        if role in self.NO_OUTLINE or width <= 0:
            return
        # Piezas diminutas (bombillas, monedas, puntas de fuegos): el casco invertido las ensucia.
        cos = [v.co for v in obj.data.vertices]
        if cos and max(max(c[k] for c in cos) - min(c[k] for c in cos) for k in range(3)) < 0.12:
            return
        if self.outline_mat is None:
            self.outline_mat = C6.outline_material()
        me = obj.data
        n = len(me.materials)
        me.materials.append(self.outline_mat)
        mod = obj.modifiers.new("outline", "SOLIDIFY")
        mod.thickness = width
        mod.offset = 1.0
        mod.use_flip_normals = True
        mod.use_even_offset = False          # con even offset, los picos finos del mundo lanzan espigas negras
        mod.material_offset = n
        mod.material_offset_rim = n

    def build_ship(self):
        return C6.build_ship()[0]


TEMAS = {t.id: t for t in (Arcilla, Papel, Cartoon)}
