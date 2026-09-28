#!/usr/bin/env python3
"""Genera mundos/arcilla/plano.svg desde mapa.json: plano cenital (MAP 01, REQ-MUN-016).

    python3 mundos/arcilla/herramientas/plano.py

Vista desde arriba en coordenadas del mapa: x a la derecha, arriba del mapa
arriba. Zonas, tierras, ruta principal, desvíos, circuito (ruta segura y
atajo), costas, secretos, restos, proximidad y escala.
"""
import html
import math
import os

import mapa
import ritmo

PX = 20.0                      # px del SVG por u_maq
PAD = 30
LEGEND_W = 330
INK, MUTED = "#2a2420", "#6f655b"


def esc(s):
    return html.escape(str(s), quote=True)


class Svg:
    def __init__(self, M):
        E = M["limites"]["encuadre_general"]
        self.x0, self.x1 = E["x"]
        self.y0, self.y1 = E["y"]
        self.w = (self.x1 - self.x0) * PX + 2 * PAD
        self.h = (self.y1 - self.y0) * PX + 2 * PAD
        self.parts = []

    def P(self, p):
        return (PAD + (p[0] - self.x0) * PX, PAD + (p[1] - self.y0) * PX)

    def pts(self, pts):
        return " ".join("%.1f,%.1f" % self.P(p) for p in pts)

    def add(self, s):
        self.parts.append(s)


def build(M):
    global ZONE_COLORS
    ZONE_COLORS = {z["id"]: z["color"] for z in M["zonas"]}      # color de diagrama de cada zona (mapa.json)
    S = Svg(M)
    W, H = S.w + LEGEND_W, S.h
    a = S.add
    a('<rect x="0" y="0" width="%.0f" height="%.0f" fill="#FBF7EF"/>' % (W, H))
    # Mar y bajíos
    a('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#CFE6EC"/>' % (PAD, PAD, S.w - 2 * PAD, S.h - 2 * PAD))
    L = M["limites"]
    # Zona no publicada, arriba
    top = S.P((L["x_min"], L["y_arriba"]))[1]
    a('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="url(#rayas)" opacity="0.6"/>' % (PAD, PAD, S.w - 2 * PAD, top - PAD))
    # Zonas
    for z in M["zonas"]:
        c = ZONE_COLORS.get(z["id"], "#888")
        a('<polygon points="%s" fill="%s" fill-opacity="0.10" stroke="%s" stroke-width="1.6" stroke-dasharray="6 4"/>'
          % (S.pts(z["contorno"]), c, c))
    # Proximidad
    for z in M["zonas"]:
        for pr in z.get("proximidad", []):
            cx, cy = S.P(pr["centro"])
            a('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="%s" stroke-width="1" stroke-opacity="0.55" stroke-dasharray="2 3"/>'
              % (cx, cy, pr["radio"] * PX, ZONE_COLORS.get(z["id"], "#888")))
    # Tierras (bajío y tierra)
    for zid, isla in mapa.all_islands(M):
        if isla.get("bajio"):
            a('<polygon points="%s" fill="#A9D8E2"/>' % S.pts(mapa.outline(isla, margin=0.55)))
    for zid, isla in mapa.all_islands(M):
        fill = {"rock": "#A89C8F"}.get(isla.get("rol"), "#E9D2A6")
        if zid.startswith("costa"):
            fill = "#C9B48C"
        a('<polygon points="%s" fill="%s" stroke="#8C7458" stroke-width="1"/>' % (S.pts(mapa.outline(isla)), fill))
    # Costas laterales infranqueables
    for c in M["costas"]:
        if c["tipo"] == "infranqueable":
            x = c["linea"][0][0]
            side = -1 if x < 0 else 1
            x_edge = S.P((x, 0))[0]
            x_far = PAD if side < 0 else S.w - PAD
            a('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#C9B48C"/>'
              % (min(x_edge, x_far), PAD, abs(x_far - x_edge), S.h - 2 * PAD))
            a('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#5A4632" stroke-width="3"/>'
              % (x_edge, PAD, x_edge, S.h - PAD))
        else:
            p0, p1 = S.P(c["linea"][0]), S.P(c["linea"][1])
            a('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#0E6E8C" stroke-width="2" stroke-dasharray="10 6"/>'
              % (p0[0], p0[1], p1[0], p1[1]))
            a('<text x="%.1f" y="%.1f" class="small" fill="#0E6E8C" text-anchor="middle">borde abierto: la corriente devuelve el barco</text>'
              % ((p0[0] + p1[0]) / 2, p0[1] - 6))
    # Circuito
    C = M["circuito"]
    for key, col, w, dash in (("comun", "#D19A00", C["ancho_segura"], ""), ("segura", "#D19A00", C["ancho_segura"], ""),
                              ("atajo", "#B3261E", C["ancho_atajo"], ""), ("final", "#D19A00", C["ancho_segura"], "")):
        a('<polyline points="%s" fill="none" stroke="%s" stroke-opacity="0.22" stroke-width="%.1f" stroke-linejoin="round" stroke-linecap="round"/>'
          % (S.pts(C[key]), col, w * PX))
        a('<polyline points="%s" fill="none" stroke="%s" stroke-width="2" stroke-dasharray="%s"/>'
          % (S.pts(C[key]), col, dash or "none"))
    x, y = S.P(C["cartel_atajo"])
    a('<text x="%.1f" y="%.1f" class="tag" fill="#B3261E" text-anchor="end">ATAJO →</text>' % (x - 4, y + 4))
    for cp in C["checkpoints"]:
        x, y = S.P(cp["pos"])
        a('<rect x="%.1f" y="%.1f" width="10" height="10" transform="rotate(45 %.1f %.1f)" fill="#FFFFFF" stroke="#D19A00" stroke-width="2"/>'
          % (x - 5, y - 5, x, y))
        a('<text x="%.1f" y="%.1f" class="small" fill="#8A6500">%s</text>' % (x + 9, y + 4, cp["id"]))
    for o in C["obstaculos"]:
        x, y = S.P(o["pos"])
        a('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#B3261E" fill-opacity="0.85"/>' % (x, y, max(4, o["radio"] * PX)))
        a('<text x="%.1f" y="%.1f" class="small" fill="#B3261E">%s</text>' % (x + 9, y - 6, esc(o["tipo"])))
    for key, label in (("salida", "SALIDA"), ("meta", "META")):
        x, y = S.P(C[key])
        a('<rect x="%.1f" y="%.1f" width="46" height="16" rx="3" fill="#2a2420"/><text x="%.1f" y="%.1f" class="small" fill="#fff" text-anchor="middle">%s</text>'
          % (x - 23, y - 8, x, y + 4, label))
    # Rutas
    R = M["rutas"]
    for d in R["desvios"]:
        a('<polyline points="%s" fill="none" stroke="#0E6E8C" stroke-width="2.4" stroke-dasharray="7 5" stroke-linecap="round"/>' % S.pts(d["puntos"]))
    a('<polyline points="%s" fill="none" stroke="#2a2420" stroke-width="1.6" stroke-dasharray="2 4"/>' % S.pts(R["directa"]["puntos"]))
    a('<polyline points="%s" fill="none" stroke="#F26A1B" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>' % S.pts(R["principal"]["puntos"]))
    pts = R["principal"]["puntos"]
    for p, q in zip(pts[2::4], pts[3::4]):
        (x1, y1), (x2, y2) = S.P(p), S.P(q)
        ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
        a('<path d="M -6 -5 L 6 0 L -6 5 z" fill="#F26A1B" transform="translate(%.1f %.1f) rotate(%.1f)"/>' % ((x1 + x2) / 2, (y1 + y2) / 2, ang))
    # Restos y secretos
    mv = next(z for z in M["zonas"] if z["id"] == "marvivo")
    for p in mv["restos"]:
        x, y = S.P(p)
        a('<circle cx="%.1f" cy="%.1f" r="3.4" fill="#7C4B2B"/><circle cx="%.1f" cy="%.1f" r="3.4" fill="#7C4B2B"/>' % (x - 3, y, x + 3, y + 2))
    for s in M["secretos"]:
        x, y = S.P(s["pos"])
        a('<path d="%s" fill="#FFD27E" stroke="#8A6500" stroke-width="1.2"/>' % star(x, y, 9, 4))
        a('<text x="%.1f" y="%.1f" class="small" fill="#6B4E00">%s</text>' % (x + 11, y + 4, esc(s["nombre"])))
    for s in M["solares_l2"]:
        x, y = S.P(s["pos"])
        a('<text x="%.1f" y="%.1f" class="tag" fill="#5A4632" text-anchor="middle">L2</text>' % (x, y + 5))
    # Lugares
    for z in M["zonas"]:
        for lg in z.get("lugares", []):
            x, y = S.P(lg["pos"])
            a('<circle cx="%.1f" cy="%.1f" r="2.6" fill="%s" stroke="#fff" stroke-width="1"/>' % (x, y, ZONE_COLORS[z["id"]]))
    # Salida y boia
    pz = next(z for z in M["zonas"] if z["id"] == "puerto")
    x, y = S.P(next(lg["pos"] for lg in pz["lugares"] if lg["id"] == "salida"))
    a('<circle cx="%.1f" cy="%.1f" r="9" fill="none" stroke="#2a2420" stroke-width="2.5"/>' % (x, y))
    # Etiquetas de zona
    for z in M["zonas"]:
        x, y = S.P(z["centro"])
        c = ZONE_COLORS[z["id"]]
        a('<g><circle cx="%.1f" cy="%.1f" r="12" fill="%s"/><text x="%.1f" y="%.1f" class="num" fill="#fff" text-anchor="middle">%d</text>'
          '<text x="%.1f" y="%.1f" class="zone" fill="%s" text-anchor="middle" paint-order="stroke" stroke="#FBF7EF" stroke-width="4">%s</text></g>'
          % (x, y, c, x, y + 5, z["n"], x, y + 30, c, esc(z["nombre"])))
    # Escala
    x0, y0 = PAD + 10, S.h - PAD - 16
    a('<rect x="%.1f" y="%.1f" width="%.1f" height="6" fill="#2a2420"/>' % (x0, y0, 5 * PX))
    a('<text x="%.1f" y="%.1f" class="small" fill="#2a2420">5 u_maq = 124 u de motor · ×15 en el juego</text>' % (x0, y0 - 6))
    # Leyenda
    lx = S.w + 10
    ly = [PAD + 10]

    def row(sym, text, h=26):
        a('<g transform="translate(%.1f %.1f)">%s<text x="46" y="14" class="leg" fill="%s">%s</text></g>' % (lx, ly[0], sym, INK, esc(text)))
        ly[0] += h

    a('<text x="%.1f" y="%.1f" class="title" fill="%s">Mundo de arcilla · plano</text>' % (lx, ly[0] + 12, INK))
    ly[0] += 26
    a('<text x="%.1f" y="%.1f" class="small" fill="%s">Generado desde mapa.json · muestra</text>' % (lx, ly[0] + 8, MUTED))
    ly[0] += 28
    row('<line x1="0" y1="10" x2="38" y2="10" stroke="#F26A1B" stroke-width="4.5"/>', "Ruta principal")
    row('<line x1="0" y1="10" x2="38" y2="10" stroke="#2a2420" stroke-width="1.6" stroke-dasharray="2 4"/>', "Ruta directa al All Day")
    row('<line x1="0" y1="10" x2="38" y2="10" stroke="#0E6E8C" stroke-width="2.4" stroke-dasharray="7 5"/>', "Desvíos opcionales")
    row('<line x1="0" y1="10" x2="38" y2="10" stroke="#D19A00" stroke-width="10" stroke-opacity="0.3"/><line x1="0" y1="10" x2="38" y2="10" stroke="#D19A00" stroke-width="2"/>', "Circuito: ruta segura")
    row('<line x1="0" y1="10" x2="38" y2="10" stroke="#B3261E" stroke-width="6" stroke-opacity="0.3"/><line x1="0" y1="10" x2="38" y2="10" stroke="#B3261E" stroke-width="2"/>', "Circuito: atajo «ATAJO →»")
    row('<rect x="14" y="5" width="10" height="10" transform="rotate(45 19 10)" fill="#fff" stroke="#D19A00" stroke-width="2"/>', "Checkpoint")
    row('<circle cx="19" cy="10" r="6" fill="#B3261E"/>', "Obstáculo (3 en total)")
    row('<path d="%s" fill="#FFD27E" stroke="#8A6500"/>' % star(19, 10, 9, 4), "Secreto")
    row('<circle cx="16" cy="10" r="3.4" fill="#7C4B2B"/><circle cx="22" cy="12" r="3.4" fill="#7C4B2B"/>', "Restos flotantes")
    row('<circle cx="19" cy="10" r="9" fill="none" stroke="#888" stroke-dasharray="2 3"/>', "Radio de proximidad")
    row('<rect x="0" y="2" width="38" height="16" fill="#C9B48C"/><line x1="38" y1="0" x2="38" y2="20" stroke="#5A4632" stroke-width="3"/>', "Costa infranqueable")
    row('<line x1="0" y1="10" x2="38" y2="10" stroke="#0E6E8C" stroke-width="2" stroke-dasharray="10 6"/>', "Borde superior abierto")
    ly[0] += 10
    a('<text x="%.1f" y="%.1f" class="leg" fill="%s" font-weight="700">Zonas</text>' % (lx, ly[0] + 12, INK))
    ly[0] += 24
    for z in M["zonas"]:
        row('<circle cx="19" cy="10" r="10" fill="%s"/><text x="19" y="14.5" class="num" fill="#fff" text-anchor="middle">%d</text>'
            % (ZONE_COLORS[z["id"]], z["n"]), z["nombre"], 24)
    ly[0] += 10
    r = ritmo.compute(M)
    a('<text x="%.1f" y="%.1f" class="leg" fill="%s" font-weight="700">Ritmo en el juego (×%s)</text>' % (lx, ly[0] + 12, INK, r["factor_juego"]))
    ly[0] += 24
    for x in r["rutas"][:4]:
        a('<text x="%.1f" y="%.1f" class="small" fill="%s">%s: %.0f s</text>' % (lx, ly[0] + 10, INK, esc(x["nombre"]), x["s_juego"]))
        ly[0] += 18

    defs = ('<defs><pattern id="rayas" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
            '<line x1="0" y1="0" x2="0" y2="10" stroke="#9CC3CF" stroke-width="3"/></pattern>'
            '<style>text{font-family:system-ui,-apple-system,"Segoe UI",sans-serif}.small{font-size:11px}.leg{font-size:13px}'
            '.zone{font-size:14px;font-weight:700}.num{font-size:13px;font-weight:700}.tag{font-size:15px;font-weight:800}'
            '.title{font-size:18px;font-weight:800}</style></defs>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%.0f" height="%.0f" viewBox="0 0 %.0f %.0f" role="img" '
            'aria-labelledby="t d"><title id="t">Plano del mundo de arcilla</title><desc id="d">Plano cenital generado desde mapa.json: '
            'nueve zonas, ruta principal, desvíos, circuito con ruta segura y atajo, costas, secretos y radios de proximidad. Muestra.</desc>'
            % (W, H, W, H) + defs + "".join(S.parts) + "</svg>\n")


def star(cx, cy, R, r, n=5):
    pts = []
    for k in range(2 * n):
        ang = -math.pi / 2 + k * math.pi / n
        rad = R if k % 2 == 0 else r
        pts.append("%.1f,%.1f" % (cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    return "M " + " L ".join(pts) + " Z"


if __name__ == "__main__":
    M = mapa.load()
    out = os.path.join(mapa.ARCILLA, "plano.svg")
    with open(out, "w", encoding="utf-8") as f:
        f.write(build(M))
    print("plano:", os.path.relpath(out))
