"""Skins `noche` y `fiesta` de los 8 barcos de estilo (T39). MUESTRA.

Una skin es la misma geometría con otra paleta. Cada script de estilo guarda sus
colores en variables de módulo (PAL, C, COLORS, TONES, MATS, constantes sueltas)
que lee al construir los materiales; una skin las cambia antes de
`build_ship()` y se restauran después. Así la skin viaja igual al sprite
(ship_styles.py → render.py) y al glTF (export_barcos_glb.py lee las mismas
variables para el color de cada pieza).

Criterio común, el de las skins del barco por defecto (ship.py): de noche, casco
azul noche, acentos ámbar y ventanas y banderas que se leen como luz; de fiesta,
casco turquesa con rosa y amarillo. Cada estilo lo traduce a sus reglas:
- lápiz (B01): sigue siendo grafito; de noche, más tramado y papel azulado con
  las ventanas encendidas; de fiesta, lápices de color en casco, bandera y aros
  (un tinte multiplicado sobre el gris de cada pieza);
- cartoon años 30 (B06): sigue siendo tres tintas y negro, con otras tres tintas;
- pixel art (B08): sigue siendo la paleta fija de 16 colores; cambia qué índices
  usa cada material.
"""
import copy

NIGHT = {"hull": "#1E2B4D", "accent": "#F2A33A", "light": "#FFD34D", "cabin": "#7A7FA8", "roof": "#2A2F5C",
         "deck": "#8C6A4E", "wood": "#6A4A32"}
PARTY = {"teal": "#1FB5A8", "pink": "#E6397E", "yellow": "#FFD23F", "blush": "#FFE3EF", "hot": "#FF5FA2"}
N, F = NIGHT, PARTY

SKINS = ["base", "noche", "fiesta"]

# Estudios con sus skins listas aquí pero que no se renderizan (salen sólo en base), con el motivo.
HELD = {
    "boceto-lapiz": "B01 es monocromo: su nota del registro (docs/barcos/barcos.json) dice que no admite skins de "
                    "color y el catálogo sólo le ofrece la base; además ship-style.test.ts espera un estilo sin la skin "
                    "temática. Para sacarlas, quitar esta entrada y la nota (T40)",
}


def skins_for(sid):
    """Las skins que se renderizan (y exportan) de un estudio: las tres, o sólo base si está en HELD."""
    return list(SKINS) if sid in OVERRIDES and sid not in HELD else ["base"]

# Por estudio (id de ship_styles.STUDIES) y skin: {"dicts": {variable: {clave: valor}}, "consts": {variable: valor},
# "tint": {material o "*": "#hex"}}. Los dicts se cambian en su sitio (los estilos los leen al construir).
OVERRIDES = {
    "boceto-lapiz": {
        "noche": {"dicts": {"DARK": {"hull": 0.42, "bulwark": 0.42, "cabin": 0.30, "roof": 0.45, "deck": 0.34,
                                     "funnel": 0.40, "mast": 0.40, "wood": 0.40, "barrel": 0.40, "ring_a": 0.2},
                            "FLAT": {"window": 0.97}},
                  "tint": {"*": "#A4B4E4", "window": "#FFE08A", "glass": "#FFE08A"}},
        "fiesta": {"tint": {"hull": "#FF9CC6", "bulwark": "#FF9CC6", "funnel_band": "#1FB5A8", "ring_b": "#FF5FA2",
                            "flag": "#1FB5A8", "roof": "#FFD23F", "cabin": "#FFF2B8", "crate_edge": "#9CE3DA",
                            "funnel": "#FFE08A"}},
    },
    "acuarela": {
        "noche": {"dicts": {"PAL": {"hull": N["hull"], "cream": "#E9A43B", "cabin": "#6D72A0", "awning": "#3E4480",
                                    "window": "#FFD27E", "flag": N["light"], "chimney": "#16171F", "deck": N["deck"],
                                    "wood": N["wood"], "ring_red": N["accent"], "crate": "#7C6A8C",
                                    "crate_frame": "#4E4466", "barrel": "#6A4A3A", "pot": "#8C4A3A"}}},
        "fiesta": {"dicts": {"PAL": {"hull": F["teal"], "cream": F["yellow"], "cabin": F["blush"], "awning": F["hot"],
                                     "window": F["pink"], "flag": F["pink"], "chimney": F["pink"],
                                     "ring_red": F["yellow"], "crate": F["yellow"], "crate_frame": F["pink"],
                                     "flower": F["hot"], "pot": F["teal"]}}},
    },
    "low-poly": {
        "noche": {"dicts": {"PAL": {"red": N["hull"], "rim": N["accent"], "white": "#C3C9DC", "bulwark_in": "#8E93AD",
                                    "cabin": N["cabin"], "roof": "#1B2240", "glass": "#FFD24A", "flag": N["light"],
                                    "deck": N["deck"], "crate_red": "#6D4A8C", "crate_blue": "#2A3F7A",
                                    "crate_beige": "#8C7A5A", "mast": "#9EA3BC"}}},
        "fiesta": {"dicts": {"PAL": {"red": F["teal"], "rim": F["pink"], "white": F["yellow"], "bulwark_in": "#FFF2B8",
                                     "cabin": F["blush"], "roof": F["pink"], "flag": F["pink"], "crate_red": F["hot"],
                                     "crate_blue": F["teal"], "crate_beige": F["yellow"], "mast": "#FFFFFF"}}},
    },
    "semi-realista": {
        "noche": {"consts": {"TEAL": N["hull"], "TEAL_FADED": "#34405E", "CREAM": "#8A8FA8", "CREAM_FADED": "#6E7390",
                             "GLASS": "#FFC766", "FUNNEL_RED": "#2A2E3E", "FUNNEL_WHITE": N["accent"],
                             "FLAG_BLUE": N["light"], "RING_ORANGE": N["accent"]}},
        "fiesta": {"consts": {"TEAL": "#1FA89C", "TEAL_FADED": "#4CC2B6", "CREAM": "#FFE7F0", "CREAM_FADED": "#F2C6D8",
                              "FUNNEL_RED": F["pink"], "FUNNEL_WHITE": F["yellow"], "FLAG_BLUE": F["pink"],
                              "BOOT_RED": F["pink"], "RING_ORANGE": F["yellow"]}},
    },
    "arcilla": {
        "noche": {"dicts": {"C": {"hull": "#2A4270", "band": N["accent"], "roll": "#F2B45A", "wall": "#8E90B8",
                                  "glass": "#FFD27E", "frame": "#1C2E52", "door": "#5A3A2A", "thatch": "#8C7A5A",
                                  "flag": N["light"], "deck": "#9C7A58", "chimney": "#3A3F66", "leaf": "#4F7A3A"}}},
        "fiesta": {"dicts": {"C": {"hull": F["teal"], "band": F["pink"], "roll": F["hot"], "wall": F["blush"],
                                   "frame": F["pink"], "thatch": F["yellow"], "flag": F["pink"], "chimney": F["yellow"],
                                   "door": F["teal"], "deck": "#F2C98E"}}},
    },
    "cartoon-30": {
        "noche": {"dicts": {"TONES": {"black": ("#22305A", "#141C38", "#141C38"),
                                      "cream": ("#A8AFD0", "#737A9E", "#3E4466"),
                                      "red": ("#E8A83A", "#9E6F1E", "#4A3410"),
                                      "wood": ("#8A6A4A", "#5E452E", "#33251A")}}},
        "fiesta": {"dicts": {"TONES": {"black": ("#1FA89C", "#12685F", "#0A3C37"),
                                       "red": (F["pink"], "#9E2255", "#55122E"),
                                       "cream": ("#FFE27A", "#D9B340", "#8C7020")}}},
    },
    "cel-shaded": {
        "noche": {"dicts": {"COLORS": {"hull": "#2A3A66", "boot": "#10182E", "stripe": N["accent"], "cabin": "#8C93B8",
                                       "roof": "#1B2340", "glass": "#FFD84A", "chimney": "#2A3A66",
                                       "chimney_band": N["accent"], "flag": "#FFD84A", "flag_waves": "#2A3A66",
                                       "deck": "#9C7A58", "wood": N["wood"], "crate": "#8C7A5A",
                                       "crate_frame": "#5A4A3A", "door": "#5A3A2A", "wood_rim": N["wood"]}}},
        "fiesta": {"dicts": {"COLORS": {"hull": F["teal"], "boot": F["pink"], "stripe": F["yellow"],
                                        "cabin": F["blush"], "roof": F["pink"], "chimney": F["yellow"],
                                        "chimney_band": F["pink"], "flag": F["pink"], "flag_waves": F["yellow"],
                                        "crate": F["yellow"], "crate_frame": F["pink"], "ring_a": F["pink"]}}},
    },
    "pixel-art": {
        # Índices de la paleta fija (sombra, medio, luz): 0 contorno, 1 hierro, 2-4 rojos, 5-7 blancos, 8-11 maderas,
        # 12-13 farol, 14-15 cristal.
        "noche": {"dicts": {"MATS": {"red": (0, 14, 15), "keel": (0, 1, 1), "white": (1, 5, 6), "rim": (12, 13, 13),
                                     "roof": (0, 14, 14), "glass": (12, 13, 13), "flag_red": (12, 13, 13),
                                     "flag_white": (14, 14, 14), "ring_red": (12, 13, 13), "ring_white": (5, 6, 6),
                                     "deck": (8, 9, 9), "wood": (8, 8, 9), "crate": (8, 9, 9)}}},
        "fiesta": {"dicts": {"MATS": {"red": (12, 13, 13), "keel": (2, 3, 3), "rim": (2, 3, 4), "roof": (2, 3, 4),
                                      "flag_red": (14, 15, 15), "flag_white": (13, 13, 13), "ring_red": (14, 15, 15),
                                      "crate": (2, 3, 4)}}},
    },
}

_orig = {}


def _snapshot(sid, mod):
    """Valores originales de todo lo que tocan las skins de un estudio (una vez por módulo cargado)."""
    key = (sid, id(mod))
    if key not in _orig:
        saved = {"dicts": {}, "consts": {}}
        for spec in OVERRIDES.get(sid, {}).values():
            for var in spec.get("dicts", {}):
                saved["dicts"].setdefault(var, copy.deepcopy(getattr(mod, var)))
            for var in spec.get("consts", {}):
                saved["consts"].setdefault(var, getattr(mod, var))
        _orig[key] = saved
    return _orig[key]


def original(sid, mod, var):
    """El valor de fábrica de una variable del estilo (sin skin): lo usan las pasajeras para no cambiar de color."""
    saved = _snapshot(sid, mod)
    if var in saved["dicts"]:
        return saved["dicts"][var]
    if var in saved["consts"]:
        return saved["consts"][var]
    return getattr(mod, var)


def apply(sid, mod, skin):
    """Deja el módulo de estilo con la paleta de `skin` (base = la de fábrica). Llamar antes de build_ship()."""
    if skin not in SKINS:
        raise ValueError("skin desconocida %r" % skin)
    saved = _snapshot(sid, mod)
    for var, d in saved["dicts"].items():
        cur = getattr(mod, var)
        for k in list(d):
            cur[k] = copy.deepcopy(d[k])
    for var, v in saved["consts"].items():
        setattr(mod, var, v)
    if skin == "base":
        return
    spec = OVERRIDES[sid][skin]
    for var, vals in spec.get("dicts", {}).items():
        getattr(mod, var).update(copy.deepcopy(vals))
    for var, v in spec.get("consts", {}).items():
        setattr(mod, var, v)


def _lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


def tint_for(sid, skin, mat_name):
    """El tinte (#hex) de un material en una skin, o None."""
    t = OVERRIDES.get(sid, {}).get(skin, {}).get("tint", {})
    base = mat_name.split(".")[0]
    return t.get(base, t.get("*"))


def post_build(sid, skin, materials=None):
    """Tintes multiplicados sobre la emisión de cada material (lápiz). Llamar después de construir el barco."""
    if not OVERRIDES.get(sid, {}).get(skin, {}).get("tint"):
        return
    import bpy
    for mat in sorted(materials if materials is not None else bpy.data.materials, key=lambda m: m.name):
        hexcol = tint_for(sid, skin, mat.name)
        if not hexcol or not mat.use_nodes:
            continue
        nt = mat.node_tree
        for em in sorted((n for n in nt.nodes if n.bl_idname == "ShaderNodeEmission"), key=lambda n: n.name):
            sock = em.inputs["Color"]
            mix = nt.nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.blend_type = "MULTIPLY"
            _sock(mix.inputs, "Factor", "VALUE").default_value = 1.0
            a, b = _sock(mix.inputs, "A", "RGBA"), _sock(mix.inputs, "B", "RGBA")
            if sock.is_linked:
                nt.links.new(sock.links[0].from_socket, a)
            else:
                a.default_value = tuple(sock.default_value)
            b.default_value = _lin(hexcol)
            nt.links.new(_sock(mix.outputs, "Result", "RGBA"), sock)


def _sock(coll, name, typ):
    """El Mix tiene un juego de entradas por tipo con el mismo nombre: se elige por tipo."""
    return next(s for s in coll if s.name == name and s.type == typ)
