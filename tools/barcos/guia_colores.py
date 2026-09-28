#!/usr/bin/env python3
"""Guía de colores de los barcos. Python del sistema, sin dependencias.

Uso, desde la raíz del repo:

    python3 tools/barcos/guia_colores.py          # escribe docs/barcos/colores.html
    python3 tools/barcos/guia_colores.py --check  # sólo comprueba las referencias

Lee docs/barcos/barcos.json. Los colores no se copian: cada referencia
("ref") se resuelve leyendo las constantes de nivel superior del script de
Blender del barco (con ast, sin ejecutarlo). Si un script cambia un nombre o
un valor, la guía cambia con él; si una referencia deja de existir, sale con 1.

Además mide cada render ampliado ('render': vista SE a 512 px con alfa, que el
script del estilo escribe en tools/blender/out/, fuera de git):
  - los 6 colores que más se ven, por k-medias sobre los píxeles opacos;
  - el contraste con el mar del juego: de los colores que ocupan al menos el
    10 % del barco, el más parecido al mar y su distancia ΔE76;
  - qué color de la paleta queda más cerca de cada color de marca.
"""
import ast
import html
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "docs" / "barcos" / "barcos.json"
OUT = ROOT / "docs" / "barcos" / "colores.html"
sys.path.insert(0, str(ROOT / "tools" / "blender"))
from check import Png  # noqa: E402  decodificador PNG sin dependencias del encargo 01

K_CLUSTERS = 6
BIG_SHARE = 0.10                     # un color "grande" ocupa al menos el 10 % del barco
SEA_SCALE = ((20, "se confunde"), (30, "poco contraste"), (1e9, "se distingue"))  # ΔE76, heurística


# --- Lectura de constantes de un script ------------------------------------
class Unsupported(Exception):
    pass


def _eval(node, env):
    if isinstance(node, ast.Constant) and isinstance(node.value, (str, int, float)):
        return node.value
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        v = _eval(node.operand, env)
        if isinstance(v, (int, float)):
            return -v
    if isinstance(node, ast.Name) and node.id in env:
        return env[node.id]
    if isinstance(node, (ast.Tuple, ast.List)):
        return [_eval(e, env) for e in node.elts]
    if isinstance(node, ast.Dict) and all(isinstance(k, ast.Constant) for k in node.keys):
        return {k.value: _eval(v, env) for k, v in zip(node.keys, node.values)}
    raise Unsupported


def script_constants(path):
    env = {}
    for node in ast.parse(path.read_text(encoding="utf-8")).body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            try:
                env[node.targets[0].id] = _eval(node.value, env)
            except Unsupported:
                pass
    return env


def resolve(env, ref):
    v = env
    for key in ref:
        if isinstance(v, dict) and key in v:
            v = v[key]
        elif isinstance(v, list) and isinstance(key, int) and 0 <= key < len(v):
            v = v[key]
        else:
            raise KeyError(".".join(str(k) for k in ref))
    return v


def to_hex(value):
    """Hex '#RRGGBB' en sRGB. Un número suelto es un gris sRGB en 0..1."""
    if isinstance(value, str) and len(value) == 7 and value.startswith("#"):
        int(value[1:], 16)
        return value.upper()
    if isinstance(value, (int, float)) and 0 <= value <= 1:
        g = round(value * 255)
        return "#%02X%02X%02X" % (g, g, g)
    raise ValueError("no es un color: %r" % (value,))


def ref_label(ref):
    head, rest = str(ref[0]), ref[1:]
    return head + "".join("[%d]" % k if isinstance(k, int) else ".%s" % k for k in rest)


# --- Color ------------------------------------------------------------------
def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def rgb_hex(c):
    return "#%02X%02X%02X" % tuple(max(0, min(255, round(x))) for x in c)


def lab(c):
    def lin(u):
        u /= 255.0
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(x) for x in c)
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883

    def f(t):
        return t ** (1 / 3) if t > 216 / 24389 else (24389 / 27 * t + 16) / 116
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def delta_e(a, b):
    return math.dist(lab(a), lab(b))


def text_on(h):
    L = lab(hex_rgb(h))[0]
    return "#111" if L > 60 else "#fff"


# --- Medida del render -----------------------------------------------------
def opaque_bins(png):
    """Histograma de píxeles opacos en cubos de 5 bits, con la suma real de cada cubo."""
    bins, total, c = {}, 0, png.channels
    px = png.px
    for i in range(0, len(px), c):
        if px[i + c - 1] < 255:
            continue
        r, g, b = px[i], px[i + 1], px[i + 2]
        k = (r >> 3, g >> 3, b >> 3)
        e = bins.get(k)
        if e is None:
            bins[k] = [1, r, g, b]
        else:
            e[0] += 1
            e[1] += r
            e[2] += g
            e[3] += b
        total += 1
    pts = [(e[0], (e[1] / e[0], e[2] / e[0], e[3] / e[0])) for e in bins.values()]
    pts.sort(key=lambda p: (-p[0], p[1]))
    return pts, total


def kmeans(pts, k, iters=20):
    """k-medias ponderada y determinista: arranca del cubo más poblado y añade el más lejano."""
    total = sum(w for w, _ in pts)
    pool = [p for p in pts if p[0] >= total * 0.002] or pts
    centers = [pool[0][1]]
    while len(centers) < min(k, len(pool)):
        best = max(pool, key=lambda p: p[0] * min(math.dist(p[1], c) for c in centers) ** 2)
        centers.append(best[1])
    for _ in range(iters):
        acc = [[0.0, 0.0, 0.0, 0.0] for _ in centers]
        for w, c in pts:
            j = min(range(len(centers)), key=lambda i: math.dist(c, centers[i]))
            a = acc[j]
            a[0] += w
            a[1] += w * c[0]
            a[2] += w * c[1]
            a[3] += w * c[2]
        new = [(a[1] / a[0], a[2] / a[0], a[3] / a[0]) if a[0] else centers[i] for i, a in enumerate(acc)]
        if new == centers:
            break
        centers = new
    weights = [0] * len(centers)
    for w, c in pts:
        weights[min(range(len(centers)), key=lambda i: math.dist(c, centers[i]))] += w
    out = [(weights[i] / total, rgb_hex(centers[i])) for i in range(len(centers))]
    return sorted(out, key=lambda t: (-t[0], t[1]))


def sea_contrast(clusters, sea_hexes):
    """De los colores grandes, el más parecido al mar: (hex, cuota, ΔE, veredicto)."""
    seas = [hex_rgb(h) for h in sea_hexes]
    big = [c for c in clusters if c[0] >= BIG_SHARE] or clusters[:1]
    share, h = min(big, key=lambda c: min(delta_e(hex_rgb(c[1]), s) for s in seas))
    de = min(delta_e(hex_rgb(h), s) for s in seas)
    verdict = next(label for limit, label in SEA_SCALE if de < limit)
    return h, share, de, verdict


# --- Página -----------------------------------------------------------------
CSS = """
:root{--bg:#f6f4ef;--card:#fff;--ink:#1b1d24;--muted:#5d6270;--line:#e2ded5;--sea:#0F5F7D;}
@media (prefers-color-scheme:dark){:root{--bg:#14161c;--card:#1d2029;--ink:#eceae4;--muted:#a3a7b3;--line:#2e3240;}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1080px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:28px;margin:0 0 4px}h2{font-size:22px;margin:0}h3{font-size:14px;margin:16px 0 8px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
p{margin:6px 0}.muted{color:var(--muted)}code{font:12px ui-monospace,Menlo,monospace}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin:18px 0}
.refs{display:flex;flex-wrap:wrap;gap:12px}
.chip{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:10px;padding:8px 12px}
.dot{width:28px;height:28px;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(127,127,127,.45)}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:middle}
th{color:var(--muted);font-weight:600}
.mini{display:inline-block;width:18px;height:18px;border-radius:5px;vertical-align:middle;box-shadow:inset 0 0 0 1px rgba(127,127,127,.45);margin-right:2px}
.thumb{width:64px;height:64px;border-radius:10px;background:var(--sea)}
.head{display:grid;grid-template-columns:260px 1fr;gap:18px;align-items:start}
.hero{width:100%;border-radius:12px;background:var(--sea);display:block}
.sheet{width:100%;border-radius:10px;background:var(--sea);display:block;margin-top:10px}
.bar{display:flex;height:34px;border-radius:9px;overflow:hidden;border:1px solid var(--line)}
.bar span{display:flex;align-items:center;justify-content:center;font:11px ui-monospace,Menlo,monospace;min-width:0;overflow:hidden;white-space:nowrap}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:10px}
.sw{border:1px solid var(--line);border-radius:10px;overflow:hidden}
.sw .c{height:54px;box-shadow:inset 0 -1px 0 rgba(127,127,127,.35)}.sw .t{padding:6px 8px;font-size:13px}.sw .t b{display:block;font:600 13px ui-monospace,Menlo,monospace}
.metrics{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.pill{border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:13px}
ul{margin:6px 0;padding-left:20px}
@media (max-width:720px){.head{grid-template-columns:1fr}}
"""


def esc(s):
    return html.escape(str(s))


def build(reg):
    refs = reg["referencias"]
    sea_hexes = [m["hex"] for m in refs["mar"]]
    boats, errors = [], []
    for b in reg["barcos"]:
        env = script_constants(ROOT / b["script"])
        groups = []
        for g in b["paleta"]:
            cols = []
            for c in g["colores"]:
                try:
                    cols.append({"hex": to_hex(resolve(env, c["ref"])), "uso": c["uso"], "ref": ref_label(c["ref"])})
                except (KeyError, ValueError) as e:
                    errors.append("%s: %s no resuelve (%s)" % (b["id"], ref_label(c["ref"]), e))
            groups.append({"grupo": g["grupo"], "colores": cols})
        boats.append({"b": b, "groups": groups})
    return boats, errors


def render(reg, boats):
    refs = reg["referencias"]
    sea_hexes = [m["hex"] for m in refs["mar"]]
    rows, sections = [], []
    for item in boats:
        b, groups = item["b"], item["groups"]
        img_rel = "../../" + b["render"]
        fallback_rel = "../../" + b["imagen"]
        sheet_rel = "../../" + b["hoja"]
        png = Png(ROOT / b["render"])
        pts, total = opaque_bins(png)
        clusters = kmeans(pts, K_CLUSTERS)
        sea_h, sea_s, sea_de, sea_v = sea_contrast(clusters, sea_hexes)
        palette = [c for g in groups for c in g["colores"]]
        brand = []
        for m in refs["marca"]:
            best = min(palette, key=lambda c: delta_e(hex_rgb(c["hex"]), hex_rgb(m["hex"])))
            brand.append((m, best, delta_e(hex_rgb(best["hex"]), hex_rgb(m["hex"]))))
        name = b["nombre"] or "sin nombre"
        title = "%s · %s" % (b["id"], b["estilo"])

        rows.append(
            "<tr><td><img class=thumb src='%s' onerror=\"this.onerror=null;this.src='%s'\" alt='%s'></td><td><b>%s</b><br><span class=muted>%s</span></td>"
            "<td>%s</td><td><span class=mini style='background:%s'></span> ΔE %.0f · %s</td><td><span class=mini style='background:%s'></span> %s · ΔE %.0f</td></tr>"
            % (esc(img_rel), esc(fallback_rel), esc(title), esc(b["id"]), esc(b["estilo"]),
               "".join("<span class=mini title='%s %.0f %%' style='background:%s'></span>" % (h, s * 100, h) for s, h in clusters[:4]),
               sea_h, sea_de, sea_v, brand[0][1]["hex"], esc(brand[0][1]["uso"]), brand[0][2]))

        bar = "".join(
            "<span style='flex:%.4f;background:%s;color:%s' title='%s · %.1f %%'>%s</span>"
            % (s, h, text_on(h), h, s * 100, "%s %d%%" % (h, round(s * 100)) if s >= 0.09 else "")
            for s, h in clusters)
        pal_html = ""
        for g in groups:
            cards = "".join(
                "<div class=sw><div class=c style='background:%s'></div><div class=t><b>%s</b>%s<br><code class=muted>%s</code></div></div>"
                % (c["hex"], c["hex"], esc(c["uso"]), esc(c["ref"])) for c in g["colores"])
            pal_html += "<h3>%s</h3><div class=grid>%s</div>" % (esc(g["grupo"]), cards)
        brand_pills = "".join(
            "<span class=pill><span class=mini style='background:%s'></span>→<span class=mini style='background:%s'></span> más cerca de %s: %s (ΔE %.0f)</span>"
            % (m["hex"], best["hex"], esc(m["nombre"]), esc(best["uso"]), de) for m, best, de in brand)
        notes = "".join("<li>%s</li>" % esc(n) for n in b.get("notas_render", []))
        sections.append(
            "<section class=card id='%s'><div class=head><div><img class=hero src='%s' onerror=\"this.onerror=null;this.src='%s'\" alt='%s'><img class=sheet src='%s' alt='8 direcciones de %s'></div>"
            "<div><h2>%s</h2><p class=muted>Nombre: %s · script <code>%s</code></p><p>%s</p>"
            "<h3>En pantalla (medido en el render)</h3><div class=bar>%s</div>"
            "<div class=metrics><span class=pill>Contraste con el mar: <span class=mini style='background:%s'></span> %s (%d %% del barco) a ΔE %.0f, %s</span>%s</div>"
            "<h3>Notas de render</h3><ul>%s</ul></div></div>%s</section>"
            % (esc(b["id"]), esc(img_rel), esc(fallback_rel), esc(title), esc(sheet_rel), esc(title), esc(title), esc(name),
               esc(b["script"]), esc(b["aspecto"]), bar, sea_h, sea_h, round(sea_s * 100), sea_de, sea_v, brand_pills, notes, pal_html))

    chips = lambda lst: "".join(
        "<div class=chip><span class=dot style='background:%s'></span><div><b>%s</b> <code>%s</code><br><span class=muted>%s</span></div></div>"
        % (m["hex"], esc(m["nombre"]), m["hex"], esc(m["fuente"])) for m in lst)
    return """<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Colores de los barcos</title><style>%s</style></head><body><main>
<h1>Colores de los barcos</h1>
<p class=muted>Estado: %s. Generado por <code>tools/barcos/guia_colores.py</code> desde <code>docs/barcos/barcos.json</code>. Cada color se lee del script de Blender del barco, así que esta página no se edita a mano: se regenera.</p>
<p class=muted>«En pantalla» agrupa en %d colores los píxeles opacos del render ampliado de cada barco; esos tonos salen de la luz, la sombra y el contorno, por eso no coinciden con la paleta de diseño. «Contraste con el mar» toma, de los colores que ocupan al menos el %d %% del barco, el más parecido al mar o a las olas del juego y da su distancia ΔE76. Escala orientativa: menos de 20 se confunde, de 20 a 30 poco contraste, más de 30 se distingue. Los colores de marca también son muestra hasta que Álvaro los apruebe.</p>
<section class=card><h3>Referencias</h3><div class=refs>%s%s</div></section>
<section class=card><h3>Resumen</h3><table><tr><th></th><th>Barco</th><th>Más visibles</th><th>Contraste con el mar</th><th>Más cerca del naranja BOIA</th></tr>%s</table></section>
%s
</main></body></html>
""" % (CSS, esc(reg["estado"]), K_CLUSTERS, round(BIG_SHARE * 100), chips(refs["marca"]), chips(refs["mar"]), "".join(rows), "".join(sections))


def main(argv):
    reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
    boats, errors = build(reg)
    if "--check" not in argv:
        for it in boats:
            b = it["b"]
            if not (ROOT / b["render"]).exists():
                errors.append("%s: falta %s; se regenera con: /Applications/Blender.app/Contents/MacOS/Blender -b -P %s -- --out %s"
                              % (b["id"], b["render"], b["script"], str(Path(b["render"]).parent)))
    n_colors = sum(len(g["colores"]) for it in boats for g in it["groups"])
    for e in errors:
        print("error: " + e)
    if errors:
        print("%d barcos, %d colores, %d referencias rotas" % (len(boats), n_colors, len(errors)))
        return 1
    if "--check" in argv:
        print("%d barcos, %d colores, 0 referencias rotas" % (len(boats), n_colors))
        return 0
    OUT.write_text(render(reg, boats), encoding="utf-8")
    print("%d barcos, %d colores, 0 referencias rotas; escrito %s" % (len(boats), n_colors, OUT.relative_to(ROOT)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
