# Cómo usar el Admin de BOIA.PLANET

Para Álvaro y el equipo de BOIA. Sin tecnicismos: qué hay en cada pantalla y
cómo se hacen las cosas del día a día. Los detalles finos (qué bloquea una
publicación, la papelera, las peticiones de datos) están en
[manual-admin.md](manual-admin.md).

> **Ojo: esto es la versión de prueba.** El Admin se abre sin contraseña y
> **todo lo que cambies se queda sólo en tu navegador**: nadie más lo ve, ni
> siquiera tú desde otro móvil u ordenador. Sirve para probar cómo será, no
> para cambiar la web de verdad. Cuando exista la versión final (con base de
> datos, D-20) cada persona tendrá su cuenta con contraseña y un código del
> móvil, y los cambios se verán en la web para todo el mundo.

## Entrar y salir

1. Abre la web y baja hasta el pie: pulsa **Probar admin**. (También está en
   el menú de a bordo del mar, o directamente en `/admin`.)
2. Arriba verás el aviso «Admin de prueba». A la izquierda (en el móvil,
   arriba) está la lista de secciones.
3. Para mirar el resultado: **Ver la web** abre la página principal y **Ver
   el mundo** abre el mar. Tus cambios se ven ahí porque es el mismo
   navegador.
4. ¿Lo has liado? En cada sección hay **Volver a la muestra**, y en
   «Auditoría y muestra», **Volver todo a la muestra**: todo queda como
   estaba al principio.

## Lo que se hace más a menudo

### Cambiar la página principal (sección «Página principal»)

- Aquí eliges qué bloques salen en la home y en qué orden (portada, próximo
  evento, próximos eventos, artistas, fotos, tienda…), los ocultas o los
  programas para unas fechas.
- También el titular y el subtítulo de la portada, los textos de los botones
  «Explorar» y «Tickets», el evento que sale destacado y los eventos que no
  quieres en «Próximos eventos».
- Todo esto va a un **borrador**: no se ve en la web hasta que pulsas
  **Publicar**. Antes puedes pulsar **Ver los cambios** para ver la home tal
  como quedará.
- Si algo no se puede publicar (por ejemplo, el evento destacado ya no
  existe), el Admin te dice por qué debajo del botón. Lo arreglas y vuelves a
  pulsar Publicar.

### Crear o cambiar un evento (sección «Eventos»)

1. **Nuevo evento**. Rellena nombre, fecha y hora, lugar, formato (All Day o
   satélite; el satélite puede ir en una serie, como `boia-club`), precio de
   la compra de prueba, cartel (los artistas) y, si quieres, la isla del mar
   donde aparece.
2. **Guardar borrador** lo deja preparado sin que se vea; **Guardar y
   publicar** lo publica ya.
3. El estado va solo por fechas (próximamente → a la venta → finalizado). Si
   hace falta, lo fijas a mano desde la lista: **agotado**, **pospuesto** o
   **cancelado** (para los dos últimos se pide un motivo).
4. Un evento que termina no se borra: pasa a «finalizado» y su isla se queda
   con sus recuerdos (fotos, cartel).
5. La venta es de prueba: «Comprar» no cobra nada y pone el sello del evento
   en el Carnet de quien compra.

### Códigos de descuento (sección «Descuentos»)

- Cada código tiene un texto en mayúsculas (como se copia), un porcentaje o
  una cantidad, fechas, para qué evento vale (o para la tienda) y **dónde se
  esconde** en el mar (un náufrago, unos restos, un cofre…).
- Quien lo encuentra lo guarda en «Mis códigos» y, si es de un evento, el
  barco le lleva a su isla y se aplica al comprar.
- **Caducar ya** lo apaga desde este momento: quien lo tenga lo verá caducado.

### Artistas y fotos

- **Artistas**: nombre, géneros (separados por comas) y foto (un enlace; sin
  foto sale un avatar neutro). La home los enseña de tres en tres.
- **Fotos y vídeos**: álbumes por evento o por isla, con fotos por enlace (en
  la versión de prueba no se suben archivos). Cada foto necesita su texto
  alternativo, que describe lo que se ve para quien no puede verla.

## El mar

### Lugares y nombres (sección «Mundo»)

- El mapa es **uno solo** para todos los mundos (Arcilla, Acuarela…). Mover un
  lugar, activarlo o desactivarlo lo cambia en todos.
- El **nombre** y los textos de un lugar sí pueden ser distintos en cada
  mundo: al renombrar, el Admin pregunta «¿Dónde cambia el nombre?».
- También se colocan aquí la salida del barco, el puerto y el punto donde
  aterriza la entrada.
- Elige un lugar en la lista o tócalo en el mapa.

### A dónde va la Boia Fiestera (sección «Destino de la Fiestera»)

Eliges la isla a la que hay que llevarla en las partidas nuevas. Las partidas
terminadas no cambian nunca; las empezadas sólo si marcas «migrar» y
escribes un motivo.

### Mundos y temporadas (sección «Temporadas»)

Cada mundo es una temporada. El que marques como activo es el que ve quien
llega por primera vez; el visitante puede cambiar de mundo desde su menú.

### Logros y premios (sección «Logros y cosméticos»)

- Un logro tiene título, descripción, una **condición** elegida de una lista
  (visitar islas, encontrar boies, completar el circuito…), sus puntos y
  monedas y, si quieres, un premio (una skin, un barco, una insignia).
- Cambiar la condición de un logro crea una versión nueva: quien ya lo tenía
  lo conserva. **Desactivar** sólo evita que se consiga a partir de ahora.

## Cuidar la comunidad (sección «Moderación»)

- Aquí salen los Carnets y las botellas que alguien ha reportado. Puedes
  retirarlos escribiendo el motivo; queda apuntado.
- En la versión de prueba sólo verás los de muestra y los de tu navegador.

## Textos y música (sección «Textos y música»)

- Busca cualquier texto de la web (por ejemplo «Explorar» o «Tickets»),
  cámbialo y pulsa **Guardar**. Si lo dejas vacío vuelve al original.
- La música de ambiente de cada mundo se sube aquí, con su licencia y su
  autor (hasta ~1 MB en la prueba).

## Borrar sin miedo (sección «Papelera»)

1. Antes de mandar algo a la papelera, el Admin te enseña **qué lo usa**
   (la home, el mapa, un descuento…).
2. Para confirmar tienes que escribir su nombre exacto.
3. Lo borrado se puede **recuperar** hasta que pasa el plazo de la papelera.
   **Purgar** (borrar del todo) no tiene vuelta atrás y pide el nombre otra
   vez.

## Ver qué ha pasado (sección «Auditoría y muestra»)

Cada cambio queda apuntado: quién, cuándo, qué había antes y qué hay ahora.
Esta lista sólo crece; no se puede borrar.

## Lo que todavía no hace (llega con la versión final)

- Entrar con tu cuenta (correo, contraseña y código del móvil) y dar permisos
  al equipo (sección «Usuarios de administración», hoy sólo de lectura).
- Que tus cambios los vea todo el mundo.
- Subir fotos y vídeos como archivos.
- Vender entradas de verdad con la ticketera que elijas.
- Colocar islas arrastrándolas en un editor visual del mapa.

## Si algo falla

Apunta qué sección, qué pulsaste y qué salió (una captura ayuda) y
pásaselo a Hernán. En la prueba no se puede romper nada para nadie más: como
mucho, **Volver todo a la muestra**.
