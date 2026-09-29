"""Cobertura del mundo de acuarela: cada lugar del mapa compartido tiene diseño, skin y arte. MUESTRA.

    python3 mundos/acuarela/herramientas/cobertura.py

Lee el catálogo compartido (tools/blender/lugares.json) y, para cada id, busca:

- su entrada en mundos/acuarela/lugares.json (nombre, lugar real, hito, historia);
- su sección en mundos/acuarela/diseno.md (`<a id="<id>"></a>` en un título `###`);
- su arte en art/mundos/acuarela/<id>/manifest.json, con las imágenes que nombra;
- el nombre: las islas de evento llevan el mismo que en arcilla (nombre compartido, D-20);
  el resto, uno propio de acuarela, distinto del de arcilla.

Imprime una línea por lugar y el total de faltas. Sale con 1 si falta algo.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MUNDO = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(MUNDO))
CATALOGO = os.path.join(REPO, "tools", "blender", "lugares.json")
SKINS = os.path.join(MUNDO, "lugares.json")
DISENO = os.path.join(MUNDO, "diseno.md")
ARTE = os.path.join(REPO, "art", "mundos", "acuarela")
ARCILLA = os.path.join(REPO, "art", "mundos", "arcilla")
CAMPOS = ("nombre", "hito", "historia")


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def manifest_images(man):
    for part in man.get("parts", []):
        for im in part.get("images", []):
            yield im["file"]


def main():
    ids = [e["id"] for e in load(CATALOGO)["lugares"]]
    evento = {e["id"]: e.get("isla_evento", False) for e in load(CATALOGO)["lugares"]}
    skins = {e["id"]: e for e in load(SKINS)["lugares"]}
    with open(DISENO, encoding="utf-8") as f:
        diseno = f.read()
    secciones = set(re.findall(r'^###[^\n]*<a id="([^"]+)"></a>', diseno, re.M))
    faltas = []
    for pid in ids:
        mias = []
        s = skins.get(pid)
        if not s:
            mias.append("sin entrada en lugares.json")
        else:
            mias += ["lugares.json sin %s" % c for c in CAMPOS if not s.get(c)]
        if pid not in secciones:
            mias.append("sin sección en diseno.md")
        man_path = os.path.join(ARTE, pid, "manifest.json")
        n_img = 0
        if not os.path.exists(man_path):
            mias.append("sin arte (art/mundos/acuarela/%s/manifest.json)" % pid)
        else:
            man = load(man_path)
            files = list(manifest_images(man))
            n_img = len(files)
            perdidas = [f for f in files if not os.path.exists(os.path.join(ARTE, pid, f))]
            if not files:
                mias.append("manifiesto sin imágenes")
            if perdidas:
                mias.append("%d imágenes del manifiesto no están" % len(perdidas))
            nombre = man.get("place", {}).get("name")
            arc_path = os.path.join(ARCILLA, pid, "manifest.json")
            nombre_arc = load(arc_path).get("place", {}).get("name") if os.path.exists(arc_path) else None
            if s and nombre != s.get("nombre"):
                mias.append("el manifiesto se llama %r y lugares.json %r" % (nombre, s.get("nombre")))
            if evento[pid]:
                if nombre_arc is not None and nombre != nombre_arc:
                    mias.append("isla de evento con otro nombre que en arcilla (%r / %r)" % (nombre, nombre_arc))
                if s and not s.get("nombre_compartido"):
                    mias.append("isla de evento sin nombre_compartido")
            elif nombre_arc is not None and nombre == nombre_arc:
                mias.append("mismo nombre que en arcilla (%r)" % nombre)
        estado = "ok" if not mias else "; ".join(mias)
        print("%-12s %-40s %3d imágenes  %s" % (pid, (s or {}).get("nombre", "?"), n_img, estado))
        faltas += mias
    sobran = sorted(set(skins) - set(ids))
    if sobran:
        print("lugares.json tiene ids que no están en el catálogo: %s" % ", ".join(sobran))
        faltas += sobran
    print("%d lugares del mapa compartido, %d faltas" % (len(ids), len(faltas)))
    return 1 if faltas else 0


if __name__ == "__main__":
    sys.exit(main())
