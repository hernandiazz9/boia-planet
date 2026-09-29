"""Mundo de acuarela (B02): el arte de juego de cada lugar del mapa compartido. MUESTRA.

La costa de Alicante pintada en un cuaderno de viaje (mundos/acuarela/diseno.md).
Mismos ids, posiciones, huellas, piezas, anclajes y animaciones que el mundo de
arcilla (mundo_arcilla.py), para que el motor cambie de mundo sin cambiar nada
más; lo que cambia es la skin: cada isla con su forma (zócalo de caliza, meseta
y cala), su hito, su nombre de un lugar real de la costa y sus colores.

- Escenas: el Builder de mundos/arcilla/escena.py (con la malla canónica de
  mundo_arcilla, que da los mismos bytes en cada corrida), las piezas comunes de
  mundos/arcilla/piezas.py y las propias de mundos/acuarela (piezas.py, zonas/).
- Materiales: el tema de mundos/acuarela/tema.py (estilo 02, el del barco B02),
  con el mismo sol del estudio del barco y su contorno.
- Pasada de acuarela sobre cada PNG (postprocess): borde húmedo, borde irregular
  y sangrado, como la del barco pero sin el velo que se escapa de la silueta
  (notas_render de B02: ensucia otros fondos) y con el ruido en píxeles; en las
  losas, el ruido se repite con el periodo de la losa.

Ver mundos_arte.py para el contrato y tools/blender/lugares.json para los ids.
"""
import importlib.util
import json
import math
import os
import random

import bpy
import numpy as np
from mathutils import Matrix, Vector

import mundo_arcilla as ARC          # malla canónica (parchea escena.Builder.mk), selección y piezas de lugar
import mundos_arte as MA
import world

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
ACU = os.path.join(REPO, "mundos", "acuarela")

escena, P, MAPA = ARC.escena, ARC.P, ARC.MAPA


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


TEMA = _load("acuarela_tema", os.path.join(ACU, "tema.py"))
AP = _load("acuarela_piezas", os.path.join(ACU, "piezas.py"))
_ZONAS = {}


def zona(name):
    if name not in _ZONAS:
        _ZONAS[name] = _load("acuarela_zona_" + name, os.path.join(ACU, "zonas", name + ".py"))
    return _ZONAS[name]


ID, STYLE, SHIP = "acuarela", "acuarela", "B02"
M, Z, C, MJ, COSTA = ARC.M, ARC.Z, ARC.C, ARC.MJ, ARC.COSTA
with open(os.path.join(ACU, "lugares.json"), encoding="utf-8") as _f:
    SKIN = {e["id"]: e for e in json.load(_f)["lugares"]}
PPU = MA.PPU
SHIP_SPRITES = "art/barco/estilos/acuarela/manifest.json"

pick, part, circle, outline, lugar, isla, prox, ground, top_point, static = (
    ARC.pick, ARC.part, ARC.circle, ARC.outline, ARC.lugar, ARC.isla, ARC.prox, ARC.ground, ARC.top_point, ARC.static)


def name_of(pid):
    return SKIN[pid]["nombre"]


def place(pid, parts):
    return ARC.place(pid, parts, name=name_of(pid))


# --- Escenas ------------------------------------------------------------------------
def new_context(group):
    """Escena nueva para un grupo: `zona:<id>[@variante]`, `vacio`, `aire` (sin agua), `minijuego:<id>`, `costa:<id>`."""
    kind, _, arg = group.partition(":")
    period = None
    if kind == "costa" and arg in ("oeste", "este"):
        period = ("y", ARC.TILE_H)
    elif kind == "costa" and arg == "sur":
        period = ("x", ARC.SUR_W)
    tema = TEMA.Acuarela(period=period)
    scene = tema.setup(256, 256)
    ctx = MA.Ctx(scene, group)
    root = bpy.data.objects.new("mundo_root", None)
    scene.collection.objects.link(root)
    ctx.tema, ctx.root = tema, root
    ctx.B = escena.Builder(tema, ARC.temas.A, M, root)
    if kind != "aire":
        world.holdout_plane()
    GROUPS[kind](ctx, arg)
    return ctx


def set_light(ctx):
    ctx.scene.render.film_transparent = True


def g_zona(ctx, arg):
    zid, _, var = arg.partition("@")
    B = ctx.B
    B.variante = var or "venta"
    with B.zona(zid):
        zona(ZONE_MODULE.get(zid, zid)).build(B, Z.get(zid), M, AP)


ZONE_MODULE = {}


def g_vacio(ctx, arg):
    pass


GROUPS = {"zona": g_zona, "vacio": g_vacio, "aire": g_vacio}


# --- Pasada de acuarela ---------------------------------------------------------------
def _axis_noise(n, cell, rng_vals, periodic):
    """Coordenadas de celda para n píxeles: índices (i0, i1) y fracción suavizada. Si periodic (px), la rejilla
    se enrolla cada `periodic` píxeles con un número entero de celdas."""
    if periodic:
        cells = max(1, int(round(periodic / cell)))
        cs = periodic / float(cells)
        u = (np.arange(n, dtype=np.float64) + 0.5) / cs
        i0 = np.floor(u).astype(int)
        f = u - i0
        return i0 % cells, (i0 + 1) % cells, f * f * (3 - 2 * f), cells
    cells = int(math.ceil(n / cell)) + 2
    u = (np.arange(n, dtype=np.float64) + 0.5) / cell
    i0 = np.floor(u).astype(int)
    f = u - i0
    return i0, i0 + 1, f * f * (3 - 2 * f), cells


def value_noise(h, w, cell, seed, period=None):
    """Ruido de valor suave con celdas de `cell` px (0..1); periódico en un eje si period = (eje, px)."""
    py = period[1] if period and period[0] == "y" else None
    px_ = period[1] if period and period[0] == "x" else None
    y0, y1, fy, ny = _axis_noise(h, cell, None, py)
    x0, x1, fx, nx = _axis_noise(w, cell, None, px_)
    g = np.random.default_rng(seed).random((ny, nx))
    a, b = g[y0][:, x0], g[y0][:, x1]
    c, d = g[y1][:, x0], g[y1][:, x1]
    top = a + (b - a) * fx[None, :]
    bot = c + (d - c) * fx[None, :]
    return (top + (bot - top) * fy[:, None]).astype(np.float32)


def blur(img, sigma, period=None):
    """Desenfoque gaussiano separable. Los bordes se extienden (el borde de una losa no se mezcla con el del
    otro lado); a lo largo del eje periódico de una losa, la imagen se enrolla."""
    r = max(1, int(math.ceil(sigma * 3)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    out = img
    for axis in (0, 1):
        wrap = period is not None and ((period[0] == "y") == (axis == 0))
        pad = [(0, 0)] * img.ndim
        pad[axis] = (r, r)
        src = np.pad(out, pad, mode="wrap" if wrap else "edge")
        n = out.shape[axis]
        acc = np.zeros_like(out)
        for i, wgt in enumerate(k):
            acc += wgt * np.take(src, np.arange(i, i + n), axis=axis)
        out = acc
    return out


def sample(img, dy, dx):
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    sy = np.clip(yy + dy, 0, h - 1.001)
    sx = np.clip(xx + dx, 0, w - 1.001)
    y0, x0 = sy.astype(int), sx.astype(int)
    fy, fx = (sy - y0)[..., None], (sx - x0)[..., None]
    return ((img[y0, x0] * (1 - fx) + img[y0, x0 + 1] * fx) * (1 - fy) +
            (img[y0 + 1, x0] * (1 - fx) + img[y0 + 1, x0 + 1] * fx) * fy)


def postprocess(img, period=None):
    """La pasada del estilo 02 (watercolor_pass) a escala de píxel fija, sin el velo exterior."""
    a = img.astype(np.float32) / 255.0
    h, w = a.shape[:2]
    rgb, al = a[..., :3], a[..., 3:4]
    n1 = value_noise(h, w, 11.6, 11, period)[..., None]
    n2 = value_noise(h, w, 28.4, 12, period)[..., None]
    # 1. Borde húmedo: el pigmento se acumula en la silueta y donde se tocan dos lavados.
    sil = np.clip((al - blur(al, 1.3, period)) * 2.8, 0.0, 1.0)
    pm = rgb * al
    col_edge = np.clip(np.abs(pm - blur(pm, 1.0, period)).sum(axis=2, keepdims=True) * 2.2, 0.0, 1.0)
    edge = np.maximum(sil, col_edge * 0.8) * (0.55 + 0.9 * n1) * al
    deep = np.power(np.clip(rgb, 0, 1), 1.55)
    rgb = rgb + (deep - rgb) * np.clip(edge * 0.75, 0.0, 0.85)
    pm = np.concatenate([rgb * al, al], axis=2)
    # 2. Bordes irregulares: el trazo no sigue la silueta al píxel.
    dx = (value_noise(h, w, 9.8, 21, period) - 0.5) * 2.4
    dy = (value_noise(h, w, 9.8, 22, period) - 0.5) * 2.4
    pm = sample(pm, dy, dx)
    # 3. Sangrado: en manchas, los colores vecinos se funden un poco.
    f = np.clip((n2 - 0.42) * 1.6, 0.0, 0.45)
    pm = pm + (blur(pm, 1.2, period) - pm) * f
    a2 = pm[..., 3:4]
    out_rgb = np.where(a2 > 1e-4, pm[..., :3] / np.maximum(a2, 1e-4), 0.0)
    out = np.concatenate([out_rgb, a2], axis=2)
    return np.clip(np.round(out * 255.0), 0, 255).astype(np.uint8)


# --- Piezas de lugar ------------------------------------------------------------------
def island_part(zid, pid=None, images=None, prox_obj="isla", **kw):
    return ARC.island_part(zid, pid=pid, images=images, prox_obj=prox_obj, **kw)


def p_isla(zid, doc):
    return place(zid, [island_part(zid, doc=doc)])


# --- Puerto ---------------------------------------------------------------------------
PASEO_A = 6.4


def p_puerto():
    zid, g = "puerto", "zona:puerto"
    esc = {i["id"]: i for i in Z[zid]["islas"]}
    paseo = dict(esc["paseo"], a=PASEO_A, p=8.0)
    bx, by = lugar(zid, "boia")
    wx, wy = lugar(zid, "whatsapp")
    sx, sy = lugar(zid, "salida")

    def base(ctx):
        return pick(ctx, zid, {"paseo", "mosaico", "palmeras", "farolas", "bancos", "casas", "quiosco", "muelle",
                               "norays", "barcas", "gaviotas", "guardamuelle"})

    def muelle(ctx):
        return {"caseta": ground(ctx, *lugar(zid, "caseta")), "muelle": MA.to_b(-1.85, 25.45, 0.24)}

    parts = [
        part("puerto", "puerto", "bloquear", g, (0.0, 30.6), static(base), anchors=muelle, rotulo=True,
             footprint=lambda ctx: outline(paseo), doc="tramo central de la Explanada: muro, mosaico de olas, "
             "datileras, quiosco de la música, muelle y barcas; a los lados siguen las losas de costa_sur"),
    ]
    for iid in ("escollera_oeste", "escollera_este"):
        s = esc[iid]
        parts.append(part(iid, "isla", "bloquear", g, tuple(s["centro"]),
                          static(lambda ctx, c=s["centro"]: pick(ctx, zid, {"escolleras"}, near=c, r=3.4)),
                          footprint=lambda ctx, s=s: outline(dict(s, p=2.0)), doc="escollera de bloques de hormigón"))
    for pid, pos in (("baliza_verde", (-2.6, 22.4)), ("baliza_roja", (2.6, 22.4))):
        parts.append(part(pid, "objeto", "bloquear", g, pos,
                          static(lambda ctx, pos=pos: pick(ctx, zid, {"balizas"}, near=pos, r=0.6)),
                          footprint=lambda ctx, pos=pos: circle(pos, 0.24), anchors=lambda ctx, pos=pos: {
                              "luz": MA.to_b(pos[0], pos[1], 1.02)}))
    parts += [
        part("anillo", "spawn", "ninguna", g, (sx, sy), static(lambda ctx: pick(ctx, zid, {"anillo"})),
             doc="anillo de salida (SPAWN/RESPAWN) con farolillos flotantes: el barco aparece en su centro"),
        part("boia", "personaje", "bloquear", g, (bx, by), static(lambda ctx: pick(ctx, zid, {"boia"})),
             footprint=lambda ctx: circle((bx, by), 0.55), prox_units=prox(zid, "boia"),
             anchors=lambda ctx: {"tope": MA.to_b(bx, by, 0.56 * 1.9)}),
        part("bocadillo", "decoracion", "ninguna", g, (bx + 0.55, by), static(lambda ctx: pick(ctx, zid, {"bocadillo"})),
             doc="bocadillo de papel que flota sobre la boia de la entrada; el pivote es el punto del agua bajo él"),
        part("whatsapp", "personaje", "bloquear", g, (wx, wy), static(lambda ctx: pick(ctx, zid, {"whatsapp"})),
             footprint=lambda ctx: circle((wx, wy), 0.32), prox_units=prox(zid, "whatsapp"),
             anchors=lambda ctx: {"tope": MA.to_b(wx, wy, 0.95)}),
    ]
    return place("puerto", parts)


# --- Lugares que comparten estructura con arcilla ----------------------------------------------
def skin(pl, docs=None):
    """Un lugar construido con la función de mundo_arcilla (mismas piezas, grupos y selecciones, que aquí
    construyen las zonas de acuarela) con el nombre y los textos de este mundo."""
    pl["place"]["name"] = name_of(pl["id"])
    for p in pl["parts"]:
        if docs and p["id"] in docs:
            p["doc"] = docs[p["id"]]
    return pl


# --- Encuentro de la Boia Fiestera ---------------------------------------------------------
def p_fiestera():
    zid, g = "fiestera", "zona:fiestera"
    fx, fy = lugar(zid, "fiestera")
    n_pide = 6
    FZ = zona("fiestera")

    def pide(f):
        def setup(ctx):
            objs = pick(ctx, zid, {"fiestera", "farolillos"})
            e = MA.rig_objects(ctx, "fiestera", objs, MA.to_b(fx, fy, 0.0))
            ph = 2 * math.pi * f / n_pide
            e.matrix_world = (Matrix.Translation(MA.to_b(fx, fy, 0.03 * math.sin(ph)))
                              @ Matrix.Rotation(math.radians(3.0 * math.sin(ph + 1.0)), 4, MA.RIGHT))
            return objs + pick(ctx, zid, {"ondas"}, near=(fx, fy), r=1.0)
        return setup

    parts = [part("fiestera", "personaje", "bloquear", g, (fx, fy),
                  [{"file": "fiestera_pide_%d.png" % f, "frame": f, "animation": "pide", "setup": pide(f)}
                   for f in range(n_pide)],
                  animations={"pide": {"frames": n_pide, "fps": 6, "loop": True}},
                  footprint=lambda ctx: circle((fx, fy), 0.48), prox_units=prox(zid, "rescate"),
                  anchors=lambda ctx: {"tope": top_point(pick(ctx, zid, {"fiestera"}), (fx, fy))},
                  doc="la Boia Fiestera pidiendo ayuda, con su ristra de farolillos; al rescatarla pasa al slot "
                      "TRIPULANTE (pieza tripulante)")]
    parts.append(part("posidonia", "decoracion", "ninguna", g, (fx, fy),
                      static(lambda ctx: pick(ctx, zid, {"posidonia"}, near=(fx, fy), r=3.2)),
                      doc="matas de posidonia flotante alrededor del corro; va debajo de los cocodrilos"))
    for i, (dx, dy, sz) in enumerate(FZ.ROCAS):
        x, y = fx + dx, fy + dy
        parts.append(part("roca_%d" % (i + 1), "obstaculo", "rebote", g, (x, y),
                          static(lambda ctx, c=(x, y): pick(ctx, zid, {"rocas"}, near=c, r=0.9)),
                          footprint=lambda ctx, c=(x, y), sz=sz: circle(c, sz * 1.05),
                          doc="tambor de columna romana caído (Lucentum): rebote suave"))
    for i, (ang, rad, k) in enumerate(ARC.CORRO):
        cx = fx + rad * math.cos(math.radians(ang))
        cy = fy + rad * math.sin(math.radians(ang))
        key = "cocodrilo_%d" % (i + 1)
        parts.append(part(key, "personaje", "ralentizar", "vacio", (cx, cy), ARC.croc_images(key, cx, cy, ang + 180.0, k),
                          animations=ARC.CROC_ANIMS, footprint=lambda ctx, c=(cx, cy), k=k: circle(c, 0.45 * k),
                          doc="ralentiza 60 %% durante 2 s; se sumerge (uno cada 0,4 s) cuando el barco entra a %.1f u "
                              "de la Fiestera (zonas/fiestera/proximidad/cocodrilos) y emerge al alejarse"
                              % prox(zid, "cocodrilos")))
    parts.append(part("tripulante", "tripulante", "ninguna", "aire", None,
                      [{"file": "tripulante_baile_%d.png" % f, "frame": f, "animation": "baile",
                        "setup": ARC.tripulante_setup(f, ARC.TRIP_FRAMES)} for f in range(ARC.TRIP_FRAMES)],
                      animations={"baile": {"frames": ARC.TRIP_FRAMES, "fps": 8, "loop": True}}, no_water=True,
                      anchors=lambda ctx: {"tope": top_point([o for o in ctx.fresh["tripulante"] if o.type == "MESH"],
                                                             (0.0, 0.0))},
                      attach={"ship": SHIP, "sprites": SHIP_SPRITES, "anchor": "slot_passenger",
                              "doc": "slot TRIPULANTE (REQ-AVE-007): el pivote va sobre slot_passenger de la dirección "
                                     "que se dibuja, por encima del barco (sus imágenes base, sin la pasajera _p)"},
                      doc="la Boia Fiestera a bordo, a escala del barco B02, mirando a cámara"))
    return place("fiestera", parts)


# --- Minijuegos ----------------------------------------------------------------------------------
def g_minijuego(ctx, arg):
    B = ctx.B
    MZ = zona("minijuegos")
    with B.zona(arg):
        if arg == "faro":
            ctx.data["linterna"] = MZ.faro(B, AP, MJ["faro"]["isla"])
        else:
            ctx.data["boca"] = MZ.canon(B, AP, MJ["canon"]["isla"])


GROUPS["minijuego"] = g_minijuego


# --- Costas ----------------------------------------------------------------------------------------
def g_costa(ctx, arg):
    B = ctx.B
    CZ = zona("costas")
    L, LS, Y0, X0 = ARC.L_OESTE, ARC.L_SUR, ARC.Y_OESTE, ARC.X_SUR
    if arg == "oeste":
        with B.zona("costa_oeste"):
            CZ.oeste(B, AP, Y0, range(-2, 3), L)
            with B.pieza("fondo"):
                CZ.back_strip(B, -34.0, -19.0, Y0 - 2.2 * L, Y0 + 3.2 * L, 1.2, "scrub")
    elif arg == "este":
        with B.zona("costa_este"):
            CZ.este(B, AP, Y0, range(-2, 3), L)
            with B.pieza("fondo"):
                CZ.back_strip(B, 19.2, 34.0, Y0 - 2.2 * L, Y0 + 3.2 * L, 0.95, "sand")
    elif arg == "sur":
        with B.zona("costa_sur"):
            CZ.sur(B, AP, X0, range(-2, 3), LS)
    elif arg in ("esquina_oeste", "esquina_este"):
        sgn = -1 if arg == "esquina_oeste" else 1
        with B.zona("costa_oeste" if sgn < 0 else "costa_este"):
            if sgn < 0:
                CZ.oeste(B, AP, Y0, range(0, 2), L, y_max=29.0)
                with B.pieza("fondo"):
                    CZ.back_strip(B, -34.0, -19.0, Y0, 40.0, 1.2, "scrub")
            else:
                CZ.este(B, AP, Y0, range(0, 2), L, y_max=29.0)
                with B.pieza("fondo"):
                    CZ.back_strip(B, 19.2, 34.0, Y0, 40.0, 0.95, "sand")
        with B.zona("costa_sur"):
            if sgn < 0:
                CZ.sur(B, AP, X0, range(-2, 2), LS, land=(-15.6, 17.4), items_in=(-14.0, 20.0))
            else:
                CZ.sur(B, AP, X0, range(0, 3), LS, land=(-8.7, 15.6), items_in=(-20.0, 14.0))


GROUPS["costa"] = g_costa
ZONE_MODULE.update({"marvivo": "marvivo"})


def places():
    out = [p_puerto(),
           p_isla("cala", "isla de la pintora: " + SKIN["cala"]["hito"]),
           p_fiestera(),
           skin(ARC.p_allday()),
           p_isla("fotos", "casas de colores de La Vila Joiosa: " + SKIN["fotos"]["hito"]),
           p_isla("tienda", "tienda de la cúpula de Altea: " + SKIN["tienda"]["hito"]),
           p_isla("ultima", "Tabarca: " + SKIN["ultima"]["hito"]),
           skin(ARC.p_naufrago(), {"naufrago": "banco de arena con el náufrago, su vela remendada de sombra, el SOS de "
                                               "conchas y la balsa varada"}),
           skin(ARC.p_restos(), {"restos": "grupo de restos flotantes (cajas de naranjas, tablas, un sombrero de paja); "
                                           "tres variantes para repartir por las posiciones de zonas/marvivo/restos"}),
           skin(ARC.p_cofres()), skin(ARC.p_botellas()), skin(ARC.p_delfin()),
           skin(ARC.p_remolino(), {"remolino": "aguada turquesa con tres brazos de espuma: gira 120° en el bucle "
                                               "(simetría de tres vueltas), se ve continua"}),
           skin(ARC.p_circuito(), {"dents": "el Penyal: peñón de caliza en miniatura sobre el islote Els Dents de "
                                            "mapa.json"}),
           skin(ARC.p_minijuego("faro", None)), skin(ARC.p_minijuego("canon", None)),
           skin(ARC.p_costa_lateral("costa_oeste")), skin(ARC.p_costa_lateral("costa_este")), skin(ARC.p_costa_sur())]
    ARC._fills_for_corners(out)
    return out


BASE_SCRIPTS = ["tools/blender/rig.py", "tools/blender/world.py", "tools/blender/lugares.py", "tools/blender/lugares.json",
                "tools/blender/mundos_arte.py", "tools/blender/mundo_arcilla.py", "tools/blender/mundo_acuarela.py",
                "tools/blender/render.py", "tools/blender/styles/02_acuarela_ilustrada.py", "mundos/temas.py",
                "mundos/arcilla/escena.py", "mundos/arcilla/piezas.py", "mundos/arcilla/herramientas/mapa.py",
                "mundos/arcilla/mapa.json", "mundos/acuarela/tema.py", "mundos/acuarela/piezas.py",
                "mundos/acuarela/lugares.json"]
ZONE_FILES = {"naufrago": ["marvivo"], "restos": ["marvivo"], "cofres": ["marvivo"], "botellas": ["marvivo"],
              "delfin": ["marvivo"], "remolino": ["marvivo"], "faro": ["minijuegos"], "canon": ["minijuegos"],
              "costa_oeste": ["costas"], "costa_este": ["costas"], "costa_sur": ["costas"], "fiestera": ["fiestera"],
              "puerto": ["puerto"], "circuito": ["circuito"]}


ARCILLA_FILES = {"fiestera": ["mundos/arcilla/zonas/fiestera.py"], "circuito": ["mundos/arcilla/zonas/circuito.py"],
                 "costa_oeste": ["mundos/arcilla/zonas/costas.py"], "costa_este": ["mundos/arcilla/zonas/costas.py"]}


def scripts(place):
    zs = ZONE_FILES.get(place["id"], [place["id"]])
    return (BASE_SCRIPTS + ["mundos/acuarela/zonas/%s.py" % z for z in zs]
            + ARCILLA_FILES.get(place["id"], []))


ANCHOR_DOC = dict(ARC.ANCHOR_DOC)


def anchor_doc(place, name):
    if name in ANCHOR_DOC:
        return ANCHOR_DOC[name]
    extra = SKIN.get(place["id"], {}).get("anclajes", {})
    for z in M["zonas"]:
        for lg in z.get("lugares", []):
            if lg["id"] == name and (place["id"] == z["id"] or place["place"]["ref"].startswith("zonas/" + z["id"])):
                what = extra.get(name)
                return "punto zonas/%s/lugares/%s de mapa.json%s" % (z["id"], name, (": " + what) if what else "")
    return name
