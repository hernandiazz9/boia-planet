# Catálogo de logros · borrador — pendiente de Hernán

- Fecha: 2026-09-29
- Pide: Hernán (D-22, punto 5)
- Estado: **borrador — pendiente de Hernán**. Cuando lo apruebe (o lo
  corrija), T36 del plan 003 lo implementa. Todo es `muestra` hasta el visto
  bueno de Álvaro (P14).
- Sustituye a: los 10 logros de muestra de
  `packages/store/src/sample/progress.ts` (ver «Qué pasa con los 10 de hoy»).

## Cómo funciona

Cada logro pasa por tres estados, igual en `/mar` y en `/juego`:

1. **En curso**: se ve lo que lleva y lo que pide («3 de 7») y una frase
   «te queda…».
2. **Listo para reclamar**: al cumplirse, sale el aviso «¡Logro completado!
   Reclama tu premio» y el icono de logros lleva un contador.
3. **Reclamado**: el premio llega sólo al pulsar «Reclamar», una sola vez.

Arriba del panel, un contador «X de Y logros». Los **ocultos** cuentan en
Y, pero se ven como «???» hasta completarlos.

## Reglas de premio

- **Siempre puntos** (dan rango y ranking). Escala de muestra: fácil 10 pts,
  medio 30–50 pts, difícil 80–150 pts.
- **Por defecto, además monedas** (se gastan en cosméticos): fácil 5, medio
  10–20.
- **Premio especial en lugar de monedas** en tres casos:
  - **Insignia del Carnet** por comprar entradas (se ve en Mi Carnet).
  - **Barco de estilo** para los logros complejos: queda bloqueado en Mi
    Barco hasta reclamarlo. Son 5 de los 8 estilos de `art/barco/estilos/`;
    Arcilla, Acuarela y Semi-realista siguen libres.
  - **Cosmético del barco** (bandera o estela) para algunos.
- Con todo reclamado se suman 1320 pts y 160 monedas (el rango más alto de
  muestra, «Capitana de la fiesta», pide 600 pts).

## Catálogo (23 logros)

«Señal» es lo que el juego ya envía (`apps/web/app/juego/achievements.ts`,
tipo `AchievementSignal`) o lo que habría que añadir (**NUEVO**).

| # | id | Nombre | Qué hay que hacer | Meta · «te queda» | Señal | Premio |
|---|---|---|---|---|---|---|
| 1 | `primera-boia` | Primera boia | Habla con tu primera boia. | 1 · «Te falta 1 boia» | `find_buoy` (el mapa la llama `find_boia`) | 10 pts + 5 monedas |
| 2 | `boies-3` | Coro de boies | Habla con 3 boies distintas. | 3 · «Te quedan 2 boies» | `find_buoy`; **NUEVO en el mapa**: disparador en la boia de WhatsApp y una tercera boia | 30 pts + 10 monedas |
| 3 | `islas-3` | Isla a isla | Descubre 3 islas. | 3 · «Te quedan 2 islas» | `visit_island` | 30 pts + 10 monedas |
| 4 | `islas-7` | Cartógrafa | Descubre todas las islas del mapa. | 7 · «Te quedan 4 islas» | `visit_island` | 80 pts + barco **Cartoon años 30** |
| 5 | `fiestera-rescatada` | Boia Fiestera rescatada | Saca a la Boia Fiestera de entre los cocodrilos. | 1 · «Búscala entre los cocodrilos» | `rescue_character` (`boia-fiestera`) | 50 pts + 20 monedas |
| 6 | `fiestera-entregada` | Hasta el amanecer | Lleva a la Boia Fiestera a la última isla. | 1 · «Llévala a la última isla» | `deliver_character` (`boia-fiestera`) | 150 pts + **Bandera de la Fiestera** |
| 7 | `circuito` | Por El Freu | Termina una vuelta al circuito. | 1 · «Termina una vuelta» | `complete_circuit` (lo concede `finishLap`, en `circuit-hud.tsx`) | 40 pts + 15 monedas |
| 8 | `circuito-atajo` | ¿Atajo? Atajo. *(oculto)* | Termina una vuelta por el atajo. | 1 · «???» | `complete_circuit` + **NUEVO** dato de la vuelta: por qué rama pasó (checkpoint `circuito-cp-a`) | 40 pts + **Bandera a cuadros** (cosmético nuevo) |
| 9 | `circuito-rapido` | Rayo del Freu | Haz una vuelta en menos de 45 s (muestra). | 45 s · «Tu récord: 52 s, te sobran 7 s» | `complete_circuit` + **NUEVO** parámetro `maxMs` (`finishLap` ya tiene los ms) | 100 pts + barco **Low-poly** |
| 10 | `faro` | Vigía del faro | Gana Vigilancia del faro. | 1 · «Gana una partida en el Faro» | **NUEVO** `win_minigame` (`faro`); hoy sólo hay premio `minigame:faro` en el libro | 40 pts + 15 monedas |
| 11 | `canon` | Ni un tiburón | Gana Cañón contra tiburones. | 1 · «Gana una partida en el Cañón» | **NUEVO** `win_minigame` (`canon`) | 40 pts + 15 monedas |
| 12 | `guardacostas` | Guardacostas | Gana los dos minijuegos. | 2 · «Te queda 1 minijuego» | **NUEVO** `win_minigame`, contando juegos distintos | 100 pts + barco **Cel-shaded cómic** |
| 13 | `secretos` | Ojo de marinera *(oculto)* | Encuentra los 4 secretos del mapa. | 4 · «Te quedan 3 secretos» | `collect_objects` (`secreto`) | 80 pts + barco **Boceto a lápiz** |
| 14 | `delfin` | Amiga del delfín *(oculto)* | Sigue al delfín hasta el final de sus saltos. | 1 · «???» | **NUEVO** `complete_encounter` (`delfin`); hoy `encounters.ts` sólo da monedas | 30 pts + **Estela de burbujas** (cosmético nuevo) |
| 15 | `botellas-3` | Correo del mar | Lee 3 botellas. | 3 · «Te quedan 2 botellas» | **NUEVO** `read_bottle` (al leer en `bottle-sheet.tsx`, botellas distintas) | 20 pts + 10 monedas |
| 16 | `carnet` | Con Carnet | Crea tu Carnet BOIA. | 1 · «Crea tu Carnet» | **NUEVO** `create_carnet` (`carnet-editor.tsx`) | 20 pts + 10 monedas |
| 17 | `carnet-preguntas` | Libro abierto | Responde las 5 preguntas del Carnet. | 5 · «Te quedan 3 preguntas» | **NUEVO** `answer_question` (respuestas del Carnet) | 40 pts + 20 monedas |
| 18 | `minutos-5` | Cinco minutos a bordo | Navega 5 minutos. | 5 · «Te quedan 2 minutos» | `time_played` | 10 pts + 5 monedas |
| 19 | `minutos-20` | Veinte minutos a bordo | Navega 20 minutos. | 20 · «Te quedan 12 minutos» | `time_played` | 30 pts + 10 monedas |
| 20 | `minutos-60` | Lobo de mar | Navega una hora (en varias visitas). | 60 · «Te quedan 40 minutos» | `time_played` | 100 pts + barco **Pixel art** |
| 21 | `entrada` | Con entrada | Compra una entrada para un evento de BOIA. | 1 · «Compra tu primera entrada» | `buy_ticket` (lo concede `sandbox.ts`) | 100 pts + insignia **Con entrada** |
| 22 | `entradas-3` | Fiel a BOIA | Ten entradas de 3 eventos distintos. | 3 · «Te quedan 2 eventos» | `buy_ticket` + **NUEVO** dato: sellos de eventos distintos | 150 pts + insignia **Fiel a BOIA** |
| 23 | `mundos-2` | Entre dos mundos | Navega en Arcilla y en Acuarela. | 2 · «Te queda 1 mundo» | **NUEVO** `visit_world` (al cambiar de mundo, mundos distintos) | 30 pts + 15 monedas |

Las cifras de «te queda» son ejemplos; el juego pone las de cada persona.

## Qué pasa con los 10 de hoy

- `primera-boia`, `islas-3`, `minutos-5`, `minutos-20`,
  `fiestera-rescatada` y `circuito`: se quedan igual.
- `boies-6` → **`boies-3`**. El mapa sólo tiene una boia con disparador, así
  que nadie ha podido conseguirlo y no hay nada que migrar.
- `entrada`: se queda; su premio pasa de 100 pts + 30 monedas a 100 pts +
  insignia «Con entrada».
- `fiestera-entregada`: se queda con su bandera y pierde las 50 monedas (la
  misión ya da 100 pts y 100 monedas al entregar).
- `secretos`: se queda, oculto; su premio pasa de 80 pts + 25 monedas a
  80 pts + barco Boceto a lápiz.

Los logros ya concedidos antes de este cambio cuentan como reclamados y
conservan sus puntos y monedas (T36).

## Señales nuevas que harían falta

Hoy existen `find_buoy`, `visit_island`, `collect_objects`, `time_played`,
`rescue_character`, `deliver_character`, `complete_circuit` y `buy_ticket`.
Para este catálogo habría que añadir:

- `win_minigame` (id del juego): al ganar una partida de Faro o Cañón.
- `complete_encounter` (id del encuentro): al terminar el delfín.
- `read_bottle`, `create_carnet`, `answer_question`, `visit_world`.
- Datos nuevos en señales que ya existen: la rama y el tiempo máximo de la
  vuelta (`complete_circuit`) y los eventos distintos con sello
  (`buy_ticket`).
- En el mapa compartido: el disparador de boia en la boia de WhatsApp y una
  tercera boia (para `boies-3`).

Cada señal nueva es un valor más de `ACHIEVEMENT_TRIGGERS`
(`packages/contracts`) y, en la versión final, del enum de Supabase.

## Puntos abiertos para Hernán

1. **Barcos bloqueados.** Hoy los 8 estilos se eligen libremente en Mi
   Barco. La propuesta bloquea 5 (Cartoon años 30, Low-poly, Cel-shaded
   cómic, Boceto a lápiz y Pixel art) y deja libres Arcilla, Acuarela y
   Semi-realista. ¿Te vale, o prefieres bloquear menos?
2. **Boies.** `boies-3` pide poner una tercera boia en el mapa compartido.
   Otra opción: quedarse con `primera-boia` y quitar el escalón.
3. **Tiempo del «Rayo del Freu».** 45 s es un valor a ojo: nadie ha medido
   todavía una vuelta con el barco base. Propuesta: medirlo en T36 y fijarlo
   en un 80 % del tiempo de una vuelta limpia.
4. **Islas de `/mar`.** El castillo y la Explanada son decorado de `/mar`,
   sin disparador: no cuentan para «Cartógrafa» (7 islas en los dos
   mundos). ¿Deben contar?
5. **Botellas sólo en `/juego`.** `/mar` todavía no tiene botellas, así que
   «Correo del mar» sólo avanza en `/juego`. ¿Se añaden botellas a `/mar`
   o se acepta así?
6. **Premio nuevo para quien ya lo tenía.** Quien ya consiguió `entrada` o
   `secretos` con el premio viejo: ¿le damos también la insignia o el barco
   al migrar (sin tocar sus saldos)? Propuesta: sí.
7. **Ocultos.** Son 3 (`circuito-atajo`, `secretos`, `delfin`) y se ven
   como «???» hasta completarlos. ¿Más, menos, o que `secretos` se vea en
   cuanto encuentras el primero?
8. **Candidatos que se quedaron fuera** para no pasar de ~20: aguantar 10 s
   en el remolino, echar tu propia botella y llevar al náufrago a una
   fiesta. ¿Entra alguno?
9. **Texto del aviso.** «Reclama tu premio» (español de España); el plan
   decía «Reclamá».
