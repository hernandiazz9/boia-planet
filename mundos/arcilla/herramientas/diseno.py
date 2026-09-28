#!/usr/bin/env python3
"""Rellena las secciones generadas de mundos/arcilla/diseno.md desde mapa.json y temas.py.

    python3 mundos/arcilla/herramientas/diseno.py

Sólo reescribe lo que hay entre <!-- generado:NOMBRE --> y <!-- /generado:NOMBRE -->.
El resto del documento se escribe a mano. Así las zonas, el ritmo y la paleta
no se copian: salen de la fuente.
"""
import ast
import os
import re

import mapa
import ritmo

MUNDOS = os.path.dirname(mapa.ARCILLA)
TEMAS = os.path.join(MUNDOS, "temas.py")
STYLE05 = os.path.join(os.path.dirname(MUNDOS), "tools", "blender", "styles", "05_arcilla_maqueta.py")
DOC = os.path.join(mapa.ARCILLA, "diseno.md")


def style_c():
    tree = ast.parse(open(STYLE05, encoding="utf-8").read())
    for node in tree.body:
        if isinstance(node, ast.Assign) and getattr(node.targets[0], "id", "") == "C":
            return ast.literal_eval(node.value)
    return {}


def palette():
    """Papeles del tema de arcilla: (papel, hex, nuevo). Los nuevos van tras el comentario del mundo completo."""
    src = open(TEMAS, encoding="utf-8").read()
    C = style_c()
    start = src.index("class Arcilla")
    hex_start = src.index("HEX = {", start)
    hex_end = src.index("\n    }\n", hex_start)
    block = src[hex_start:hex_end]
    marker = block.find("# --- Mundo de arcilla completo")
    out = []
    for m in re.finditer(r'"(\w+)":\s*(?:"(#[0-9A-Fa-f]{6})"|A\.C\["(\w+)"\])', block):
        role, hx, ref = m.group(1), m.group(2), m.group(3)
        out.append((role, hx or C.get(ref, "?"), m.start() > marker))
    glow_start = src.index("GLOW = {", hex_end)
    glow_end = src.index("\n    }\n", glow_start)
    glows = []
    for m in re.finditer(r'"(\w+)":\s*\((?:"(#[0-9A-Fa-f]{6})"|A\.C\["(\w+)"\]),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)', src[glow_start:glow_end]):
        glows.append((m.group(1), m.group(2) or C.get(m.group(3), "?"), m.group(4), m.group(5), m.group(6)))
    return out, glows


def usage():
    """Dónde se usa cada papel: zonas cuyo script lo nombra entre comillas."""
    used = {}
    zdir = os.path.join(mapa.ARCILLA, "zonas")
    for fn in sorted(os.listdir(zdir)):
        if fn.endswith(".py"):
            src = open(os.path.join(zdir, fn), encoding="utf-8").read()
            for role in set(re.findall(r'"(\w+)"', src)):
                used.setdefault(role, []).append(fn[:-3])
    return used


def zonas_md(M):
    L = ["| # | Zona | Papel en el recorrido | Encuentro | Piezas | REQ |", "|---|---|---|---|---:|---|"]
    for z in M["zonas"]:
        L.append("| %d | [%s](#%s) | %s | %s | %d | %s |" % (
            z["n"], z["nombre"], z["id"], z["papel"].split(". ")[0].rstrip(".") + ".", z["encuentro"]["personaje"],
            len(z["piezas"]), ", ".join(r.replace("REQ-", "") for r in z["req"])))
    L.append("")
    pal = dict((r, h) for r, h, _ in palette()[0])
    for g in palette()[1]:
        pal[g[0]] = g[1]
    for z in M["zonas"]:
        L += ["", '### %d · %s <a id="%s"></a>' % (z["n"], z["nombre"], z["id"]), "",
              "Propuesta de nombre: **%s** (muestra)." % z.get("propuesta_nombre", "—"), "",
              "**Papel.** " + z["papel"], "",
              "**Piezas (%d).** " % len(z["piezas"]) + "; ".join(p["nombre"] for p in z["piezas"]) + ".", "",
              "**Encuentro: %s.** %s" % (z["encuentro"]["personaje"], z["encuentro"]["que_pasa"]), "",
              "| Objeto | Comportamientos (§48) | Parámetros |", "|---|---|---|"]
        for c in z["comportamientos"]:
            L.append("| %s | %s | %s |" % (c["objeto"], c["modulos"], c["parametros"]))
        L += ["", "**REQ que cubre.** " + ", ".join(z["req"]) + ".", "",
              "**Texto de muestra.** " + " ".join("«%s»" % t for t in z["texto"]), "",
              "**Paleta local.** " + ", ".join("`%s` %s" % (r, pal.get(r, "?")) for r in z["paleta"]) + ".", "",
              "**Día y noche.** " + z["dia_noche"]]
    return "\n".join(L)


def paleta_md():
    roles, glows = palette()
    used = usage()
    L = ["Papeles nuevos del tema de arcilla (`Arcilla.HEX` en `mundos/temas.py`). Ninguna pieza lleva un color suelto: "
         "cada objeto nombra un papel y el tema lo traduce a material.", "",
         "| Papel | Hex | Dónde se usa |", "|---|---|---|"]
    for role, hx, new in roles:
        if new:
            L.append("| `%s` | `%s` | %s |" % (role, hx, ", ".join(used.get(role, [])) or "piezas.py"))
    L += ["", "Papeles que brillan (`Arcilla.GLOW`): color y fuerza de emisión de día, atardecer y noche.", "",
          "| Papel | Hex | Día | Atardecer | Noche |", "|---|---|---:|---:|---:|"]
    for role, hx, d, a, n in glows:
        L.append("| `%s` | `%s` | %s | %s | %s |" % (role, hx, d, a, n))
    return "\n".join(L)


def fill(doc, name, body):
    pat = re.compile(r"(<!-- generado:%s -->\n)(?:.*?\n)?(<!-- /generado:%s -->)" % (name, name), re.S)
    if not pat.search(doc):
        raise SystemExit("falta el marcador generado:%s en diseno.md" % name)
    return pat.sub(lambda m: m.group(1) + body + "\n" + m.group(2), doc)


def write_paleta_json():
    """paleta.json para el visor: los papeles y sus hex, generados desde temas.py (no se editan)."""
    import json
    roles, glows = palette()
    data = {"nota": "Generado por herramientas/diseno.py desde mundos/temas.py. No editar.",
            "papeles": {r: h for r, h, _ in roles}, "brillan": {g[0]: g[1] for g in glows}}
    with open(os.path.join(mapa.ARCILLA, "paleta.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")


def main():
    write_paleta_json()
    M = mapa.load()
    doc = open(DOC, encoding="utf-8").read()
    doc = fill(doc, "zonas", zonas_md(M))
    doc = fill(doc, "ritmo", ritmo.markdown(ritmo.compute(M)))
    doc = fill(doc, "paleta", paleta_md())
    open(DOC, "w", encoding="utf-8").write(doc)
    print("diseno.md: secciones generadas al día")


if __name__ == "__main__":
    main()
