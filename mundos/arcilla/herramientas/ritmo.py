#!/usr/bin/env python3
"""Ritmo del mapa: longitudes y tiempos de cada ruta, en la maqueta y en el juego.

    python3 mundos/arcilla/herramientas/ritmo.py            # tabla en Markdown
    python3 mundos/arcilla/herramientas/ritmo.py --json     # los mismos números en JSON

Modelo: el barco sale parado, acelera a `aceleracion` hasta `velocidad` y
navega a velocidad máxima; no se descuentan giros, lectura ni actividades
(REQ-MUN-017), así que es una cota inferior. Conversión: 1 u_maq = 24,87 u de
motor (eslora 1,93 u_maq = 48 u, D-15). En el juego las posiciones se
multiplican por `factor_juego` y los tamaños quedan igual.
"""
import json
import sys

import mapa


def travel_s(dist_u, v, a):
    """Segundos para recorrer dist_u desde parado con aceleración a y tope v."""
    d_acc = v * v / (2 * a)
    if dist_u <= d_acc:
        return (2 * dist_u / a) ** 0.5
    return v / a + (dist_u - d_acc) / v


def compute(M=None):
    M = M or mapa.load()
    U = M["unidades"]["u_motor_por_u_maq"]
    R = M["ritmo"]
    v, a, F = R["velocidad_u_motor_s"], R["aceleracion_u_motor_s2"], R["factor_juego"]
    C = M["circuito"]
    rutas = [
        ("directa", "Directa al destino principal (All Day)", M["rutas"]["directa"]["puntos"], R["objetivo_directa_s"]),
        ("mision", "Misión directa: salida → Fiestera → última isla", M["rutas"]["mision"]["puntos"], None),
        ("principal", "Ruta principal narrativa (8 paradas)", M["rutas"]["principal"]["puntos"], None),
        ("exploracion", "Exploración completa", M["rutas"]["exploracion"]["puntos"], R["objetivo_exploracion_s"]),
        ("vuelta_segura", "Vuelta al circuito por la ruta segura", C["comun"] + C["segura"][1:] + C["final"][1:], None),
        ("vuelta_atajo", "Vuelta al circuito por el atajo", C["comun"] + C["atajo"][1:] + C["final"][1:], None),
    ]
    out = []
    for rid, nombre, pts, objetivo in rutas:
        L = mapa.length(pts)
        t_maq = travel_s(L * U, v, a)
        t_juego = travel_s(L * U * F, v, a)
        out.append({
            "id": rid, "nombre": nombre, "u_maq": round(L, 2), "u_motor_maqueta": round(L * U),
            "u_motor_juego": round(L * U * F), "s_maqueta": round(t_maq, 2), "s_juego": round(t_juego, 1),
            "objetivo_s": objetivo, "vs_objetivo": round(t_juego / objetivo, 3) if objetivo else None,
        })
    return {"velocidad_u_motor_s": v, "aceleracion_u_motor_s2": a, "u_motor_por_u_maq": U,
            "velocidad_u_maq_s": round(v / U, 3), "factor_juego": F, "rutas": out}


def markdown(r):
    lines = [
        "Velocidad del motor: %s u/s (%.3f u_maq/s), aceleración %s u/s². 1 u_maq = %s u de motor. Factor de juego: ×%s."
        % (r["velocidad_u_motor_s"], r["velocidad_u_maq_s"], r["aceleracion_u_motor_s2"], r["u_motor_por_u_maq"], r["factor_juego"]),
        "",
        "| Ruta | Longitud (u_maq) | En el juego (u de motor) | Tiempo en la maqueta | Tiempo en el juego | Objetivo | Juego / objetivo |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for x in r["rutas"]:
        obj = "%d s" % x["objetivo_s"] if x["objetivo_s"] else "—"
        ratio = "%.0f %%" % (100 * x["vs_objetivo"]) if x["vs_objetivo"] else "—"
        lines.append("| %s | %.1f | %s | %.1f s | %.1f s (%.1f min) | %s | %s |" % (
            x["nombre"], x["u_maq"], format(x["u_motor_juego"], ",").replace(",", "."), x["s_maqueta"],
            x["s_juego"], x["s_juego"] / 60, obj, ratio))
    return "\n".join(lines)


if __name__ == "__main__":
    r = compute()
    if "--json" in sys.argv:
        print(json.dumps(r, ensure_ascii=False, indent=2))
    else:
        print(markdown(r))
