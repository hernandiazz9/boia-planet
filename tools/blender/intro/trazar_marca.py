"""Vectoriza la marca de BOIA (T50): art/marca/*.jpg → art/marca/*.svg.

    Blender -b -P tools/blender/intro/trazar_marca.py
    Blender -b -P tools/blender/intro/trazar_marca.py -- --out OTRA/CARPETA   # p. ej. para comparar

Álvaro mandó la marca en JPG (inventario v14 §6.8): el wordmark «BOIA» naranja y
la mascota (la boia con gorro). Aquí se calcan a vectores limpios, sin
herramientas externas (Blender sólo para leer el JPG; el resto es numpy):

1. cada color de la marca da una máscara (qué tanto es de ese color cada píxel),
   suavizada un poco para quitar el ruido del JPG;
2. el contorno de nivel 0,5 de la máscara (marching squares, con interpolación
   lineal: subpíxel);
3. Douglas-Peucker para quedarse con los puntos que importan;
4. curvas de Bézier cúbicas que pasan por esos puntos (tangente de
   Catmull-Rom; esquina viva donde el contorno gira fuerte).

Salida (art/marca/):
    boia-wordmark.svg  una <path> por letra (id B, O, I, A), naranja del wordmark;
                       titulo.py extruye estas mismas letras para la entrada
    boia-mascota.svg   capas apiladas: silueta negra (el trazo), naranja, azul y
                       blanco (ojos y dientes), cada una con sus agujeros
    logo/*.svg         las mismas, ligeras para la web (a LOGO_SCALE, menos puntos,
                       cúbicas relativas): logo de cabecera, pie y Admin, y favicon

Los colores son los medianos de cada imagen (ver COLORS). Determinista: la misma
imagen da el mismo SVG byte a byte.
"""
import argparse
import math
import os
import sys
from collections import deque

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
MARCA = os.path.join(REPO, "art", "marca")

# Colores de marca, medianas de los píxeles de cada clase (muestreo de T50).
COLORS = {
    "wordmark": "#EC4F24",   # naranja del wordmark
    "orange": "#FF5219",     # naranja del cuerpo de la mascota
    "blue": "#36278A",       # azul del gorro
    "black": "#000000",      # trazo
    "white": "#FFFFFF",
}
LETTERS = "BOIA"
# Variantes «logo» (art/marca/logo/, las que sirve la web): escala y tolerancia de Douglas-Peucker (px).
LOGO_SCALE = 0.5
LOGO_PREC = 0             # enteros: a media escala, una rejilla de 2 px del original
LOGO_TOL = 2.0


# ---------------------------------------------------------------- imagen

def load_rgb(path):
    """RGB en [0, 1], filas de arriba abajo (float32, h×w×3)."""
    im = bpy.data.images.load(path)
    w, h = im.size
    buf = np.empty(w * h * 4, dtype=np.float32)
    im.pixels.foreach_get(buf)
    bpy.data.images.remove(im)
    return buf.reshape(h, w, 4)[::-1, :, :3].copy()


def blur(a, sigma):
    """Desenfoque gaussiano separable (bordes: replica)."""
    r = max(1, int(math.ceil(sigma * 3)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    p = np.pad(a, ((r, r), (0, 0)), mode="edge")
    a = sum(k[i] * p[i:i + a.shape[0], :] for i in range(2 * r + 1))
    p = np.pad(a, ((0, 0), (r, r)), mode="edge")
    return sum(k[i] * p[:, i:i + a.shape[1]] for i in range(2 * r + 1))


def flood_from_border(mask):
    """Píxeles de `mask` conectados (4-vecinos) con el borde de la imagen."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


# ---------------------------------------------------------------- contornos

def contours(field, level=0.5):
    """Contornos cerrados de `field` a `level` (marching squares). El campo se rodea de ceros, así
    que todo contorno se cierra. Puntos en px de la imagen (x, y), y hacia abajo."""
    f = np.pad(field.astype(np.float64), 1, mode="constant", constant_values=0.0)
    h, w = f.shape
    inside = f > level

    def edge_point(key):
        # key = (y, x, 'h'|'v'): arista horizontal de (y,x)-(y,x+1) o vertical de (y,x)-(y+1,x)
        y, x, d = key
        a = f[y, x]
        b = f[y, x + 1] if d == "h" else f[y + 1, x]
        t = (level - a) / (b - a)
        return (x + t - 1.0, float(y) - 1.0) if d == "h" else (float(x) - 1.0, y + t - 1.0)

    nxt = {}
    tl, tr = inside[:-1, :-1], inside[:-1, 1:]
    br, bl = inside[1:, 1:], inside[1:, :-1]
    code = tl * 8 + tr * 4 + br * 2 + bl * 1
    ys, xs = np.nonzero((code > 0) & (code < 15))
    for y, x in zip(ys.tolist(), xs.tolist()):
        c = int(code[y, x])
        T, R, B, L = (y, x, "h"), (y, x + 1, "v"), (y + 1, x, "h"), (y, x, "v")
        # Segmentos orientados con el interior a la izquierda (en coordenadas de imagen, y abajo).
        segs = {
            1: [(B, L)], 2: [(R, B)], 3: [(R, L)], 4: [(T, R)], 6: [(T, B)], 7: [(T, L)],
            8: [(L, T)], 9: [(B, T)], 11: [(R, T)], 12: [(L, R)], 13: [(B, R)], 14: [(L, B)],
        }.get(c)
        if segs is None:   # silla: decide el centro de la celda
            center = (f[y, x] + f[y, x + 1] + f[y + 1, x] + f[y + 1, x + 1]) / 4 > level
            if c == 5:
                segs = [(L, T), (R, B)] if center else [(B, L), (T, R)]
            else:  # 10
                segs = [(T, R), (B, L)] if center else [(L, T), (R, B)]
        for a, b in segs:
            nxt[a] = b
    loops = []
    for start in sorted(nxt):
        if start not in nxt:
            continue
        loop, k = [], start
        while k in nxt:
            loop.append(edge_point(k))
            k = nxt.pop(k)
        loops.append(loop)
    return loops


def area(pts):
    s = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i - 1]
        x1, y1 = pts[i]
        s += x0 * y1 - x1 * y0
    return s / 2.0


def dp(pts, tol):
    """Douglas-Peucker sobre un contorno cerrado: parte en los dos puntos más alejados."""
    P = np.asarray(pts)
    i0 = 0
    i1 = int(np.argmax(((P - P[0]) ** 2).sum(1)))

    def rec(a, b, out):
        seg = P[a:b + 1] if b > a else np.concatenate([P[a:], P[:b + 1]])
        A, Bp = seg[0], seg[-1]
        d = Bp - A
        n = math.hypot(*d)
        if n < 1e-9:
            dist = np.sqrt(((seg - A) ** 2).sum(1))
        else:
            dist = np.abs(d[0] * (seg[:, 1] - A[1]) - d[1] * (seg[:, 0] - A[0])) / n
        k = int(np.argmax(dist))
        if dist[k] > tol and 0 < k < len(seg) - 1:
            m = (a + k) % len(P)
            rec(a, m, out)
            rec(m, b, out)
        else:
            out.append(a)

    out = []
    rec(i0, i1, out)
    rec(i1, i0, out)
    return [tuple(P[i]) for i in out]


def bezier(pts, corner_deg, bulge):
    """Curvas cúbicas que pasan por `pts` (cerrado). Devuelve [(c1, c2, p)] por segmento; el
    segmento i va de pts[i] a pts[i+1]."""
    n = len(pts)
    P = [np.asarray(p, dtype=np.float64) for p in pts]
    tan, corner = [], []
    for i in range(n):
        a, b, c = P[i - 1], P[i], P[(i + 1) % n]
        u, v = b - a, c - b
        nu, nv = np.linalg.norm(u), np.linalg.norm(v)
        turn = math.degrees(math.acos(max(-1.0, min(1.0, float(u @ v) / (nu * nv))))) if nu and nv else 0.0
        corner.append(turn > corner_deg)
        t = u / nu + v / nv if nu and nv else c - a
        tn = np.linalg.norm(t)
        tan.append(t / tn if tn else t)
    def handle(t, chord, L):
        # Asa de L/3 en la dirección de la tangente, acortada si la curva se separaría de la
        # cuerda más de `bulge` px (un lado recto largo junto a una esquina suave no se abomba).
        s = abs(float(t[0] * chord[1] - t[1] * chord[0]))
        return min(L / 3, bulge / (0.75 * s)) if s > 1e-9 else L / 3

    segs = []
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]
        L = float(np.linalg.norm(b - a))
        chord = (b - a) / L if L else b - a
        t0, t1 = tan[i], tan[(i + 1) % n]
        # En una esquina el asa sigue la cuerda (asa nula no: al extruir en Blender el bisel se pellizca).
        c1 = a + chord * L / 3 if corner[i] else a + t0 * handle(t0, chord, L)
        c2 = b - chord * L / 3 if corner[(i + 1) % n] else b - t1 * handle(t1, chord, L)
        segs.append((c1, c2, b))
    return segs


def fmt(v):
    s = "%.1f" % v
    s = s.rstrip("0").rstrip(".") if "." in s else s
    return "0" if s in ("-0", "") else s


def path_d(loops, ox, oy, corner_deg, bulge):
    """Atributo d de una <path> con los contornos dados (ya simplificados), desplazados por (ox, oy)."""
    out = []
    for pts in loops:
        segs = bezier(pts, corner_deg, bulge)
        x, y = pts[0]
        d = ["M%s %s" % (fmt(x - ox), fmt(y - oy))]
        for c1, c2, p in segs:
            d.append("C%s %s %s %s %s %s" % tuple(fmt(v) for v in (
                c1[0] - ox, c1[1] - oy, c2[0] - ox, c2[1] - oy, p[0] - ox, p[1] - oy)))
        out.append("".join(d) + "Z")
    return "".join(out)


def path_d_compact(loops, ox, oy, k, corner_deg, bulge, prec=1):
    """Como path_d, en pequeño para la web: escala `k`, `prec` decimales y cúbicas relativas (c)
    calculadas sobre los valores ya redondeados (sin deriva)."""
    unit = 10 ** prec

    def q(v, o):
        return int(round((v - o) * k * unit))

    def num(n):
        t = "%d" % n if prec == 0 else ("%.*f" % (prec, n / unit)).rstrip("0").rstrip(".")
        if t.startswith("0."):
            t = t[1:]
        elif t.startswith("-0."):
            t = "-" + t[2:]
        return "0" if t in ("", "-0", "-") else t

    def join(ns):
        out, last = "", ""
        for n in ns:
            t = num(n)
            # Sin separador si el número empieza por «-», o por «.» y el anterior ya tiene punto.
            if out and not (t.startswith("-") or (t.startswith(".") and "." in last)):
                out += " "
            out += t
            last = t
        return out

    out = []
    for pts in loops:
        segs = bezier(pts, corner_deg, bulge)
        cx, cy = q(pts[0][0], ox), q(pts[0][1], oy)
        rel = []
        for c1, c2, p in segs:
            a = [q(c1[0], ox), q(c1[1], oy), q(c2[0], ox), q(c2[1], oy), q(p[0], ox), q(p[1], oy)]
            rel += [a[0] - cx, a[1] - cy, a[2] - cx, a[3] - cy, a[4] - cx, a[5] - cy]
            cx, cy = a[4], a[5]
        # Una sola «c»: las cúbicas siguientes repiten el comando implícitamente.
        out.append("M" + join([q(pts[0][0], ox), q(pts[0][1], oy)]) + "c" + join(rel) + "z")
    return "".join(out)


def short(hex_):
    """#RRGGBB → #RGB cuando se puede."""
    h = hex_.lstrip("#").lower()
    return "#" + h[::2] if all(h[i] == h[i + 1] for i in (0, 2, 4)) else "#" + h


def write(path, svg, label):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    print("%s: %d B -> %s" % (label, len(svg), os.path.relpath(path, REPO)))


def trace(field, sigma, tol, min_area):
    """Contornos simplificados del campo suavizado; descarta motas de menos de `min_area` px²."""
    loops = contours(blur(field, sigma) if sigma else field)
    kept = []
    for L in loops:
        if abs(area(L)) < min_area:
            continue
        s = dp(L, tol)
        if len(s) >= 3:
            kept.append(s)
    return kept


def bbox(loops):
    xs = [p[0] for L in loops for p in L]
    ys = [p[1] for L in loops for p in L]
    return min(xs), min(ys), max(xs), max(ys)


def contains(outer, pt):
    """Punto dentro de un polígono (par-impar)."""
    x, y = pt
    inside = False
    for i in range(len(outer)):
        x0, y0 = outer[i - 1]
        x1, y1 = outer[i]
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
            inside = not inside
    return inside


# ---------------------------------------------------------------- marcas

def wordmark(out_dir):
    rgb = load_rgb(os.path.join(MARCA, "boia-wordmark.jpg"))
    # Tinta: 0 en el blanco, 1 en el naranja (el verde separa los dos: 1,0 frente a ~0,31).
    g = rgb[:, :, 1]
    ink = np.clip((1.0 - g) / (1.0 - 0.31), 0.0, 1.0)
    loops = trace(ink, sigma=1.6, tol=0.9, min_area=40.0)
    # Una letra por contorno exterior (el que no está dentro de otro), de izquierda a derecha;
    # cada agujero va con la letra que lo contiene.
    nested = [any(contains(o, L[0]) for o in loops if o is not L) for L in loops]
    outers = sorted([L for L, n in zip(loops, nested) if not n], key=lambda L: bbox([L])[0])
    holes = [L for L, n in zip(loops, nested) if n]
    if len(outers) != len(LETTERS):
        raise SystemExit("wordmark: %d contornos exteriores, se esperan %d" % (len(outers), len(LETTERS)))
    groups = [[o] for o in outers]
    for hl in holes:
        for gr in groups:
            if contains(gr[0], hl[0]):
                gr.append(hl)
                break
        else:
            raise SystemExit("wordmark: agujero sin letra en %r" % (hl[0],))
    x0, y0, x1, y1 = bbox(loops)
    m = 4.0
    ox, oy = math.floor(x0 - m), math.floor(y0 - m)
    W, H = math.ceil(x1 + m) - ox, math.ceil(y1 + m) - oy
    parts = []
    for ch, gr in zip(LETTERS, groups):
        parts.append('<path id="%s" d="%s"/>' % (ch, path_d(gr, ox, oy, 62.0, 1.4)))
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" role="img" aria-label="BOIA">'
           '<title>BOIA</title><g fill="%s" fill-rule="evenodd">%s</g></svg>\n'
           % (W, H, COLORS["wordmark"], "".join(parts)))
    write(os.path.join(out_dir, "boia-wordmark.svg"), svg, "wordmark (%d letras, %d contornos)" % (len(groups), len(loops)))
    # Logo para la web: el mismo trazo a LOGO_SCALE, cúbicas relativas.
    k = LOGO_SCALE
    d = "".join(path_d_compact(gr, ox, oy, k, 62.0, 1.4, LOGO_PREC) for gr in groups)
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s"><path fill="%s" fill-rule="evenodd" d="%s"/></svg>\n'
           % (fmt(W * k), fmt(H * k), COLORS["wordmark"], d))
    write(os.path.join(out_dir, "logo", "boia-wordmark.svg"), svg, "wordmark logo")


def mascot(out_dir):
    rgb = load_rgb(os.path.join(MARCA, "boia-mascota.jpg"))
    pal = np.array([[1, 1, 1], [1, 0.32, 0.1], [0.21, 0.15, 0.54], [0, 0, 0]], dtype=np.float32)
    d = ((rgb[:, :, None, :] - pal[None, None, :, :]) ** 2).sum(-1)
    cls = np.argmin(d, axis=-1)
    white, orange, blue = cls == 0, cls == 1, cls == 2
    background = flood_from_border(white)
    layers = [
        ("black", ~background),                 # silueta entera: el trazo negro asoma por los huecos
        ("orange", orange),
        ("blue", blue),
        ("white", white & ~background),         # ojos, brillos y dientes
    ]
    traced = [(name, trace(mask.astype(np.float32), sigma=1.3, tol=0.7, min_area=30.0)) for name, mask in layers]
    # El logo (de 32 a 180 px en pantalla) se calca con menos puntos.
    light = [(name, trace(mask.astype(np.float32), sigma=1.6, tol=LOGO_TOL, min_area=60.0)) for name, mask in layers]
    x0, y0, x1, y1 = bbox(traced[0][1])
    m = 4.0
    ox, oy = math.floor(x0 - m), math.floor(y0 - m)
    W, H = math.ceil(x1 + m) - ox, math.ceil(y1 + m) - oy
    parts = ['<path fill="%s" d="%s"/>' % (COLORS[name], path_d(loops, ox, oy, 70.0, 1.2)) for name, loops in traced]
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" role="img" aria-label="BOIA">'
           '<title>BOIA</title><g fill-rule="evenodd">%s</g></svg>\n' % (W, H, "".join(parts)))
    write(os.path.join(out_dir, "boia-mascota.svg"), svg,
          "mascota (%s)" % ", ".join("%s %d" % (n, len(L)) for n, L in traced))
    k = LOGO_SCALE
    parts = ['<path fill="%s" d="%s"/>' % (short(COLORS[name]), path_d_compact(loops, ox, oy, k, 70.0, LOGO_TOL, LOGO_PREC))
             for name, loops in light]
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s"><g fill-rule="evenodd">%s</g></svg>\n'
           % (fmt(W * k), fmt(H * k), "".join(parts)))
    write(os.path.join(out_dir, "logo", "boia-mascota.svg"), svg, "mascota logo")


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=MARCA)
    a = ap.parse_args(argv)
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)
    wordmark(out)
    mascot(out)


if __name__ == "__main__":
    main()
