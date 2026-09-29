# Mundo de acuarela · diseño de la skin del mapa compartido

Estado: `muestra`. Nombres, historia, textos y colores son una propuesta para Álvaro. Es el segundo
mundo del mapa compartido (D-20): los mismos lugares, en los mismos puntos y con las mismas huellas,
anclajes y animaciones que el mundo de arcilla ([`../arcilla/diseno.md`](../arcilla/diseno.md)); lo
que cambia es cómo se ve cada lugar, cómo se llama y qué cuenta. Los datos de cada lugar (nombre,
lugar real, hito, historia, anclajes) están en [`lugares.json`](lugares.json); este documento los
explica. `python3 mundos/acuarela/herramientas/cobertura.py` comprueba que cada id del catálogo
compartido tiene entrada aquí, en `lugares.json` y en `art/mundos/acuarela/`.

## Concepto

La costa de Alicante pintada en un cuaderno de viaje. Es el mundo del barco B02, el remolcador de
acuarela (casco azul, franja y toldo crema, chimenea negra, macetas y bandera naranja con olas):
todo parece pintado a mano sobre papel grueso, con aguadas que no llegan del todo al borde, el
pigmento acumulado en las siluetas y sombras de glaseado azul violeta.

Tres ideas mandan:

1. **Un lugar real en cada isla.** Cada lugar lleva el nombre y el hito de un sitio de verdad de la
   costa de Alicante, de Xàbia a Tabarca: quien es de allí lo reconoce, y quien no, se lleva un mapa
   de la costa de BOIA. Las islas de evento no: se llaman como el evento (nombre compartido).
2. **La noche de Sant Joan.** La arcilla es una temporada que acaba al amanecer; la acuarela es una
   sola noche, la del 23 de junio: farolillos, hogueras y mojarse los pies a medianoche. La
   Fiestera lleva farolillos de papel en vez de globos y la última isla quema su hoguera.
3. **Lo pintado está vivo mientras está húmedo.** Explica por qué el mar se mueve, por qué los restos
   vuelven y de dónde salen los cocodrilos, sin salir del tono del cuaderno.

## Historia del mundo (propuesta)

Cada verano, una pintora que vive en Cala Cantalar, en el Cabo de las Huertas, pinta la costa de
Alicante en un cuaderno. Lo que pinta cobra vida mientras la pintura está húmeda: el mar se mueve,
las gaviotas vuelan y los barcos navegan. Este año pintó un remolcador azul, y el remolcador salió
de la página.

Es la tarde de Sant Joan. El remolcador zarpa de la Explanada cargado de botes de pintura y
farolillos para la verbena, que acaba a medianoche en Tabarca, cuando se quema la hoguera y todos se
mojan los pies para pedir un deseo. La Boia Fiestera tenía que llevar los farolillos, pero en la
página de L'Albufereta cayó una gota de agua y salieron cuatro cocodrilos, que se han quedado con
ella entre las columnas caídas de Lucentum. No muerden: les gustan los farolillos. En cuanto llega un
barco se sumergen, avergonzados.

Por el camino: un náufrago en La Nao que lleva tres verbenas esperando que alguien lo pinte de vuelta
a tierra, la cúpula azul de Altea (la tienda de verdad está en tierra), las casas de colores de La
Vila Joiosa (cada foto de BOIA tiene su casa) y la barraca del All Day, montada como las de
Hogueras. Por fuera, la carrera de llaüts rodea El Penyal; desde el faro del Cap de l'Horta se vigila
que no se cuelen piratas en el cuaderno, y la Torre de l'Illeta ahuyenta tiburones a cañonazos de
agua.

La pintora no sale en el juego salvo en su cala. Ella es la que cierra el cuaderno cuando acaba la
temporada: el año que viene habrá otra página.

## Forma del mapa

Es la del mundo de arcilla, sin cambios: un solo `mundos/arcilla/mapa.json` con las zonas, rutas,
circuito, costas y minijuegos, y un solo catálogo de lugares con arte,
[`tools/blender/lugares.json`](../../tools/blender/lugares.json) (19 ids, cada uno con su `ref` y su
`pos` en mapa.json). El plano es [`../arcilla/plano.svg`](../arcilla/plano.svg); la ruta, el ritmo y
los comportamientos (§48) son los de [`../arcilla/diseno.md`](../arcilla/diseno.md).

Lo que da el mundo de acuarela para cada id es su skin: un `art/mundos/acuarela/<id>/manifest.json`
con las mismas piezas, pivotes en los mismos puntos del mapa, las mismas huellas de colisión y
proximidad, los mismos anclajes (con otro dibujo detrás: donde en arcilla hay un horno, aquí está la
casa de la pintora) y las mismas animaciones con los mismos fotogramas. El motor cambia de mundo
cambiando la carpeta, nada más.

Geografía libre: los sitios reales no están donde están en la costa (Tabarca queda arriba del mapa,
L'Albufereta a un tercio), porque el mapa es el del recorrido. El cuaderno los ordena por la noche de
Sant Joan, no por el GPS.

## Lugares

Una sección por id del catálogo compartido, en el orden del catálogo. «Papel» es el mismo en los dos
mundos; «Arte» dice qué hay en `art/mundos/acuarela/<id>/`.

| Id | Nombre (muestra) | Lugar real | Tipo |
|---|---|---|---|
| [`puerto`](#puerto) | La Explanada | Explanada de España y puerto de Alicante | puerto |
| [`cala`](#cala) | Cala Cantalar | Cala Cantalar, Cabo de las Huertas | isla |
| [`fiestera`](#fiestera) | L'Albufereta | L'Albufereta y Lucentum | encuentro |
| [`allday`](#allday) | Isla del escenario · All Day BOIA | — (nombre compartido) | isla de evento |
| [`fotos`](#fotos) | La Vila Joiosa | Casas de colores de La Vila Joiosa | isla |
| [`tienda`](#tienda) | Altea | Casco antiguo y cúpula de Altea | isla |
| [`ultima`](#ultima) | Tabarca | Nova Tabarca | isla |
| [`naufrago`](#naufrago) | La Nao | Islote de La Nao, Tabarca | mar vivo |
| [`restos`](#restos) | El Bol Nou | Cala del Bol Nou, La Vila Joiosa | mar vivo |
| [`cofres`](#cofres) | La Granadella | Cala de la Granadella, Xàbia | mar vivo |
| [`botellas`](#botellas) | El Racó de l'Albir | El Racó de l'Albir, l'Alfàs del Pi | mar vivo |
| [`delfin`](#delfin) | L'Illa de Benidorm | Isla de Benidorm | mar vivo |
| [`remolino`](#remolino) | Cap de la Nau | Cap de la Nau, Xàbia | mar vivo |
| [`circuito`](#circuito) | El Penyal | Penyal d'Ifac, Calp | circuito |
| [`faro`](#faro) | Cap de l'Horta | Faro del Cabo de la Huerta | minijuego |
| [`canon`](#canon) | Torre de l'Illeta | Torre de la Illeta, El Campello | minijuego |
| [`costa_oeste`](#costa_oeste) | Serra Gelada | Acantilados de la Serra Gelada | costa |
| [`costa_este`](#costa_este) | Platja de Sant Joan | Playa de San Juan, Alicante | costa |
| [`costa_sur`](#costa_sur) | El Postiguet | Playa y paseo del Postiguet | costa |

### 1 · La Explanada <a id="puerto"></a>

**Lugar real.** La Explanada de España y el puerto de Alicante.

**Papel.** Salida del barco y primera boia, en la bocana, justo delante de la proa.

**Hito.** El paseo del mosaico de olas rojas, crema y negras, con la fila de palmeras datileras y el
quiosco de la música (en el punto `caseta` de mapa.json).

**Historia.** Aquí se abre el cuaderno. El remolcador azul sale de la Explanada cargado de botes de
pintura y farolillos para la verbena.

**Arte (9 piezas).** `puerto` (tramo central del paseo, x = ±6,4: muro de caliza, mosaico, datileras,
quiosco, casas de azotea, muelle de tablas y barcas; el resto del borde lo ponen las losas de
`costa_sur`), `escollera_oeste` y `escollera_este` (bloques de hormigón), `baliza_verde`,
`baliza_roja`, `anillo` (anillo de salida con farolillos flotantes), `boia`, `bocadillo` (de papel) y
`whatsapp`.

**Texto de muestra.** «¡Plop! Esta tarde es Sant Joan. La Fiestera se ha quedado en L'Albufereta con
los farolillos: encuéntrala y llévala a Tabarca antes de medianoche.»

### 2 · Cala Cantalar <a id="cala"></a>

**Lugar real.** Cala Cantalar, en el Cabo de las Huertas (Alicante).

**Papel.** La casa del barco, primera isla del recorrido. Enseña qué es BOIA antes de vender nada.

**Hito.** El taller de la pintora: casa encalada con buganvilla y persianas azules (en el `horno` de
arcilla), el caballete con el cuadro a medio pintar (`torno`), las hojas del cuaderno tendidas a
secar (`pista`), la mesa de los botes de pintura (`paella`) y el embarcadero de tablas.

**Historia.** La pintora vive en la cala y pinta el cuaderno cada verano. Lo que pinta cobra vida
mientras la pintura está húmeda: también el remolcador.

**Arte (1 pieza).** `cala`: isla de caliza con zócalo, meseta verde y cala de arena hacia cámara;
pino carrasco, pitas y datileras.

**Texto de muestra.** «Cuidado, que aún estás fresco. Si te mojas mucho, se te corre el azul.»

### 3 · L'Albufereta <a id="fiestera"></a>

**Lugar real.** L'Albufereta, junto al yacimiento íbero y romano de Lucentum (Alicante).

**Papel.** Misión principal: la Boia Fiestera rodeada de cuatro cocodrilos. Al acercarse, se
sumergen uno a uno y ella sube a bordo como tripulante.

**Hito.** La Fiestera (el mismo personaje que en arcilla, pintado) con su ristra de farolillos de
papel, entre tambores de columnas romanas caídas, en los mismos puntos que las rocas de arcilla.

**Historia.** Una gota de agua cayó en la página de L'Albufereta y salieron cuatro cocodrilos. No
muerden: se han quedado con los farolillos de la Fiestera y no la dejan irse.

**Arte (10 piezas).** `fiestera` (`pide`, 6 fotogramas), `posidonia`, `roca_1..3` (tambores de
columna, rebote suave), `cocodrilo_1..4` (`idle` 4, `sumergirse` 6, `emerger` = `reverse_of`
sumergirse) y `tripulante` (la Fiestera a bordo, `baile` 6, con `attach` al `slot_passenger` de
`art/barco/estilos/acuarela`: una capa encima de las imágenes base del B02, como en arcilla).

**Texto de muestra.** «¡Eh, barquito azul! Estos señores se han quedado con mis farolillos.» «¿Me
llevas a Tabarca? A medianoche se quema la hoguera.»

### 4 · Isla del escenario · All Day BOIA <a id="allday"></a>

**Nombre compartido.** Es la isla de evento (con taquilla): se llama igual en todos los mundos y el
nombre lo pone el evento (D-20, REQ-MUN-036). No tiene lugar real.

**Papel.** La gran isla comercial y destino principal: el escenario del All Day BOIA con su taquilla.

**Hito.** La barraca del All Day como las de Hogueras: escenario de madera bajo un toldo a rayas
rojas y crema, altavoces, torres de luces y el rótulo BOIA; público en la arena, barra con toldo,
cabina, arco de entrada de farolillos, muelle, datileras y banderolas.

**Historia.** La barraca se monta como las de Hogueras: toldo a rayas, luces y música hasta la cremà.

**Arte (1 pieza, 2 variantes).** `allday`: `venta` (taquilla abierta) y `recuerdo` (persiana bajada),
REQ-COM-005.

### 5 · La Vila Joiosa <a id="fotos"></a>

**Lugar real.** Las casas de colores del barrio de pescadores de La Vila Joiosa.

**Papel.** La galería de BOIA como lugar del mundo, entre la tienda y el escenario.

**Hito.** Una fila de casas altas y estrechas de colores sobre la meseta; la roja, en el punto
`cuarto`, es el cuarto oscuro. En la cala, la cámara en su trípode, el tendedero de fotos, un llaüt
varado y el marco de madera sobre el agua (logro «Sonríe»).

**Historia.** En La Vila cada casa es de un color para que los marineros la vieran desde el mar. Aquí
cada foto de BOIA tiene su casa.

**Arte (1 pieza).** `fotos`.

### 6 · Altea <a id="tienda"></a>

**Lugar real.** El casco antiguo de Altea y la cúpula de teja vidriada azul de su iglesia.

**Papel.** Escaparate de la tienda externa: camisetas, bolsas y pegatinas.

**Hito.** La tienda encalada bajo una cúpula azul y blanca, con toldo y mostrador; camisetas y bolsas
en el tendedero, el cartel TIENDA, buganvilla y una datilera.

**Historia.** La tienda de verdad está en tierra; esta es su cúpula. Se ve desde lejos, como la de
Altea.

**Arte (1 pieza).** `tienda`.

### 7 · Tabarca <a id="ultima"></a>

**Lugar real.** Nova Tabarca, la isla amurallada frente a Santa Pola.

**Papel.** Destino de la Boia Fiestera y final del recorrido.

**Hito.** Un lienzo de muralla con almenas y su puerta en arco, con el pedestal donde sube la
Fiestera (en el `nicho`); la fachada de la iglesia con su espadaña; en la cala, la hoguera de Sant
Joan con su ninot, las boies amigas en la orilla, el muelle y farolillos entre datileras.

**Historia.** La verbena acaba en Tabarca: a medianoche se quema la hoguera y todos se mojan los pies
para pedir un deseo.

**Arte (1 pieza).** `ultima`.

**Texto de muestra.** «¡Los farolillos! Justo a tiempo. Mójate los pies y pide un deseo.»

### 8 · La Nao <a id="naufrago"></a>

**Lugar real.** El islote de La Nao, junto a Tabarca.

**Papel.** El náufrago del mar vivo, antes de la primera isla: pide que lo acerquen a una fiesta BOIA
y da un código de descuento de entradas (muestra).

**Hito.** Un banco de arena con el náufrago bajo una vela remendada que le da sombra, su balsa varada
y un SOS de conchas.

**Historia.** Lleva tres verbenas esperando que alguien lo pinte de vuelta a tierra.

**Arte (1 pieza).** `naufrago`.

### 9 · El Bol Nou <a id="restos"></a>

**Lugar real.** La cala del Bol Nou, en La Vila Joiosa.

**Papel.** Restos flotantes recogibles que se regeneran (monedas o puntos).

**Hito.** Cajas de naranjas, tablas y un sombrero de paja a la deriva.

**Historia.** Se escaparon de una página mal secada. Vuelven cada vez que se pasa la hoja.

**Arte (1 pieza, 3 variantes).** `restos` (a, b y c), repartidas por las posiciones de
`zonas/marvivo/restos` (8 instancias).

### 10 · La Granadella <a id="cofres"></a>

**Lugar real.** La cala de la Granadella, en Xàbia.

**Papel.** Cofres fugaces: aparecen 20 s en posiciones temporales.

**Hito.** Un cofre forrado de azulejos con conchas.

**Historia.** Asoma veinte segundos y se va, como la luz en la Granadella al atardecer.

**Arte (1 pieza).** `cofre` (2 instancias).

### 11 · El Racó de l'Albir <a id="botellas"></a>

**Lugar real.** El Racó de l'Albir, en l'Alfàs del Pi.

**Papel.** Botellas con mensaje (REQ-IDE-040): las de muestra y las que escriben los visitantes.

**Hito.** Una botella de vidrio verde con el mensaje enrollado.

**Historia.** Las corrientes del Albir traen los mensajes de quien ha pasado antes.

**Arte (1 pieza).** `botella` (3 instancias).

### 12 · L'Illa de Benidorm <a id="delfin"></a>

**Lugar real.** La isla de Benidorm.

**Papel.** El delfín aparece junto al barco; seguirlo tres saltos lleva a una recompensa.

**Hito.** El delfín gris azulado saltando.

**Historia.** Salta junto al barco como salta alrededor de l'Illa: seguirlo lleva a algo.

**Arte (1 pieza).** `delfin` (`salto`, 8 fotogramas).

### 13 · Cap de la Nau <a id="remolino"></a>

**Lugar real.** El Cap de la Nau, en Xàbia.

**Papel.** Remolino: recompensa por aguantar dentro con control.

**Hito.** Un remolino de aguada turquesa con tres brazos de espuma.

**Historia.** Donde el agua del cuaderno se arremolina, como en el cabo: quien aguanta dentro con el
timón firme, gana.

**Arte (1 pieza).** `remolino` (`giro`, 8 fotogramas; gira 120° por bucle y, con tres brazos, se ve
continuo).

### 14 · El Penyal <a id="circuito"></a>

**Lugar real.** El Penyal d'Ifac, en Calp.

**Papel.** El circuito de velocidad por la costa este: ruta segura por fuera del islote y atajo
estrecho pegado a la costa, con tres obstáculos.

**Hito.** El islote Els Dents de mapa.json es aquí un Penyal en miniatura: peñón de caliza de paredes
verticales con estratos y pinos en el collado. Las rocas del Freu son escollos de caliza con
posidonia.

**Historia.** La carrera de los llaüts rodea El Penyal por fuera; los valientes pasan pegados a la
playa, entre escollos.

**Arte (14 piezas).** Los arcos `salida`, `cp1`, `cp-s`, `cp-a`, `cp2` y `meta` (anclajes
`pie_a`/`pie_b`), `semaforo`, `cartel` («ATAJO →»), `dents` (el Penyal), `freu`, `roca`, `medusa`,
`cocodrilo` (derecha e izquierda) y `boia_carril` (a y b). El trazado y los obstáculos son los mismos
que en arcilla.

### 15 · Cap de l'Horta <a id="faro"></a>

**Lugar real.** El faro del Cabo de la Huerta, en Alicante.

**Papel.** Isla del minijuego Vigilancia del faro (D-20).

**Hito.** Un islote de caliza con el faro de torre cuadrada encalada sobre zócalo ocre, la linterna
de cristal con cúpula roja y la casa del torrero.

**Historia.** Desde el faro se vigila de noche el cuaderno: por aquí intentan colarse los piratas.

**Arte (1 pieza).** `faro`, con el anclaje `linterna` (origen del haz).

### 16 · Torre de l'Illeta <a id="canon"></a>

**Lugar real.** La Torre de la Illeta, en El Campello.

**Papel.** Isla del minijuego Cañón contra tiburones (D-20).

**Hito.** Una torre vigía redonda de mampostería con su cañón en la terraza, apuntando al mar.

**Historia.** La torre defendía la costa de piratas; ahora ahuyenta tiburones a cañonazos de agua.

**Arte (1 pieza).** `canon`, con el anclaje `boca`.

### 17 · Serra Gelada <a id="costa_oeste"></a>

**Lugar real.** Los acantilados de la Serra Gelada, entre Benidorm y l'Albir.

**Papel.** Costa lateral infranqueable del oeste (REQ-MUN-011).

**Hito.** Acantilados de caliza clara de pared casi vertical, con estratos ocres y grises, pinos
carrascos y pitas arriba y escollos al pie.

**Historia.** La pared de la Serra Gelada cierra el cuaderno por la izquierda.

**Arte (1 pieza).** `costa_oeste`: losa vertical de 640×768 px que se repite a lo largo de la costa,
con `shore_px`, `collision_px`, `outer_fill` y `map_line` (misma fase y masas de tierra que en
arcilla, así la orilla y la colisión quedan donde marca mapa.json).

### 18 · Platja de Sant Joan <a id="costa_este"></a>

**Lugar real.** La playa de San Juan, en Alicante.

**Papel.** Costa lateral infranqueable del este.

**Hito.** La playa larga de arena fina con datileras, sombrillas de rayas, torres de socorrista y las
hogueras de Sant Joan preparadas.

**Historia.** La playa de la noche de Sant Joan: arena, sombrillas y hogueras esperando la medianoche.

**Arte (1 pieza).** `costa_este`: losa vertical de 640×768 px.

### 19 · El Postiguet <a id="costa_sur"></a>

**Lugar real.** La playa y el paseo del Postiguet, en Alicante.

**Papel.** El borde de abajo, a los dos lados del puerto.

**Hito.** El paseo sigue con el mosaico de olas, datileras, farolas, bancos y casas de azotea.

**Historia.** El paseo sigue a los dos lados de la Explanada hasta tocar la sierra y la playa.

**Arte (3 piezas).** `costa_sur` (losa horizontal de 768×288 px), `esquina_oeste` y `esquina_este`
(1008×768 px), que unen el paseo con la Serra Gelada y con la playa.

## Paleta del mundo

Aguadas claras sobre papel crema. Los colores salen de [`tema.py`](tema.py) (`HEX` y `FLAT`); cada
pieza nombra un papel, nunca un color (§48). Los principales:

| Papel | Color | Uso |
|---|---|---|
| `sea` / `sea_deep` / `shallow` | #5FB3AE / #2F8A8C / #9ED9CF | el mar turquesa, lejos del azul del casco B02 (#2C62BE) |
| `foam` | #FBF6EA | espuma y crestas, del color del papel |
| `sand` / `sand_wet` | #F0D9A8 / #D9BD8A | calas y playa |
| `limestone` / `limestone_dark` | #D9C9AE / #A48B70 | caliza de islotes, Serra Gelada y el Penyal |
| `ochre` | #D99A55 | estratos y zócalo del faro |
| `scrub` / `pine` / `palm` / `agave` | #B5B874 / #4F8446 / #5E9C48 / #7FA89A | matorral, pino carrasco, datilera y pita |
| `whitewash` / `blue_door` | #FBF3E4 / #2E6FA8 | cal y persianas |
| `dome_a` / `dome_b` | #2F6FC0 / #F3EBDD | la cúpula de Altea |
| `house_a…e` | #E9A23B #D9546B #7FB7C9 #F2D16B #9FC27A | las casas de colores de La Vila |
| `mosaic_a` / `mosaic_b` / `mosaic_c` | #C8412F / #F4E6CC / #2E2A2E | el mosaico de la Explanada |
| `awning_a` / `awning_b` | #E0503A / #FBF1DF | toldos de barraca y sombrillas |
| `bougainvillea` | #D9468F | buganvillas |
| `fiestera` / `fiestera_band` | #F2557A / #FFD23F | la Boia Fiestera (igual en los dos mundos) |
| `croc` / `croc_belly` | #6FA84A / #E0E69A | cocodrilos |
| `lantern` (plano) | #FFC06A | farolillos, como el farol del barco |

## Cómo se pinta

- **Estilo 02** (`tools/blender/styles/02_acuarela_ilustrada.py`, el del barco B02) con dos cambios
  en `tema.py`: el grano y las manchas van en píxeles de pantalla (miden lo mismo que en el barco en
  cualquier lienzo) y, en las losas de costa, el ruido es periódico a lo largo de la costa.
- **Pasada de acuarela** sobre cada PNG (`postprocess` de `tools/blender/mundo_acuarela.py`): borde
  húmedo, borde irregular y sangrado. **Sin el velo semitransparente** que el barco deja salir de la
  silueta: la nota de render de B02 dice que ensucia otros fondos, y el arte de mundo va sobre el mar
  del motor. En las losas, la pasada se repite con el periodo de la losa.
- **Sombras de glaseado azul violeta** (nota de render de B02), sin sombras proyectadas: el sol es el
  del estudio del barco.
- Misma cámara (30°, D-13) y misma densidad que el barco B02, como en arcilla. Mallas canónicas y sin
  SSS: dos corridas dan los mismos bytes.

## Decisiones tomadas en este diseño

Todas reversibles:

- **Una noche, no una temporada.** La historia de acuarela es la verbena de Sant Joan y acaba a
  medianoche en Tabarca; la de arcilla, una temporada que acaba al amanecer. Así los dos mundos no
  cuentan lo mismo con otro dibujo.
- **Nombres de sitios reales** de la provincia, en la lengua en que se conocen allí (Cap de la Nau,
  El Penyal, l'Illa de Benidorm; Altea, Tabarca, La Explanada).
- **Geografía libre**: los sitios no están en su orden real en la costa.
- **La Fiestera no cambia de personaje** entre mundos, sólo de accesorio (farolillos en vez de
  globos) y de pintura.
- **La pintora** sólo aparece como hito de Cala Cantalar (su casa, su caballete); no es un personaje
  con diálogo nuevo.
- **La barraca de Hogueras** en la isla del evento: el nombre sigue siendo el compartido.

## Preguntas para Álvaro

1. **Nombres reales.** ¿Podemos usar nombres de sitios de verdad (Tabarca, Altea, La Vila, El
   Penyal…)? ¿Alguno que BOIA prefiera evitar o alguno que falte (Santa Pola, Elche, Dénia)?
2. **Sant Joan.** ¿Te encaja que este mundo sea la noche de Sant Joan, con hogueras y farolillos, o
   prefieres que no se ate a una fecha?
3. **La pintora.** ¿Te gusta que el mundo sea el cuaderno de una pintora? ¿Debería tener nombre o ser
   alguien de BOIA?
4. **Valenciano o castellano** en los nombres y en los textos de este mundo.
