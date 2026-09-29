# Inventario v14 → código · 2026-09-29

Cruce de la v14 (`docs/fuente/v14-maestro.md`), la spec v15 (`docs/spec/`, 286 REQ)
y el código de `main` en b032bce (plan 002 hasta T29 + `/mar` 23890e5). Siete
auditorías en paralelo, una por área más una de ideas de la v14 que no llegaron a
la spec. Sólo se listan huecos: lo que no aparece aquí está HECHO o es humano y
ya está cubierto.

Leyenda: **FALTA** no hay nada · **PARCIAL** hay una parte · el ID remite a
`docs/spec/09-requisitos.md`.

## 1. Decisiones de Hernán, 2026-09-29 (segunda tanda)

Para registrar como D-23 cuando la T32 del plan 003 haya escrito la D-22
(tarea T38 de `plans/004-cierre-v14.md`).

1. **Economía de barcos.** Las monedas compran barcos y skins. Al empezar está
   todo bloqueado menos los dos barcos de los mundos iniciales: B05 Arcilla y
   B02 Acuarela. Con puntos se desbloquea un barco concreto.
2. **`/mar` en 3D se queda** aunque rompa D-05 (ya lo recoge la D-22 de la T32).
3. **Lo pendiente de Álvaro que pueda decidir el orquestador, lo decide** (§2).
4. **Cambio de mundo con animación de agujero negro.** El mundo se hunde en un
   vórtice y sale el nuevo con todo en el mismo sitio: mismas islas, posiciones,
   enlaces y funciones. Sólo cambian los renders y los diálogos. Cambiar de mundo
   es cambiar la skin del mundo.
5. **Las tarjetas de descuento llevan un botón para ir a la isla** del evento
   automáticamente.
6. **Al comprar en la isla del evento se ve el descuento**: «Tienes un código de
   descuento para este evento», aplicado en el checkout.
7. **La isla ofrece «Ver fotos de la isla»**, que abre la página «Fotos y
   eventos» en la galería de esa isla o evento.
8. **Ranking activo, sólo local** en esta versión.
9. **Los textos de todas las zonas los escribe el equipo** (`muestra` hasta que
   Álvaro los lea).
10. **Preguntas del Carnet: las decide el equipo.** Se mantienen las cinco de
    §44.1, que ya eligió Álvaro y ya están en el código tal cual.
11. **El móvil físico funciona bien** (probado por Hernán). P6 queda cerrada.

## 2. Decisiones que toma el orquestador por delegación (pendientes de Álvaro sólo como visto bueno)

| # | Tema | Decisión |
|---|---|---|
| O1 | P4 · alcance e idioma | Se aprueba el corte L1/L2 de D-02 con los cambios de D-20/D-22, y español solo en L1 |
| O2 | P8 · estilos | Arcilla (B05) y Acuarela (B02) son los mundos y barcos iniciales. Los otros seis estilos pasan a ser barcos de la tienda |
| O3 | P9 · botón de entrada | «Zarpar». La entrada se ve en cada carga de `/` (D-21) |
| O4 | P10–P12 | Se sigue con D-20: minijuegos, dos mundos, letras 3D y arranque en el puerto |
| O5 | Precios de barcos (`muestra`) | Monedas: B03 Low-poly 300, B06 Cartoon 30 400, B08 Pixel art 400, B01 Boceto lápiz 500. Skins noche/fiesta de cada barco: 150. Puntos: **B04 Semi-realista «El Veterano»** al llegar a 1500 puntos. Los puntos no se gastan, son umbral. **B07 Cel-shaded** queda reservado como barco-premio del logro complejo de la D-22. Si el catálogo de la T32 elige otro, se intercambian |
| O6 | Salida por temporada | Un solo punto de salida y un solo puerto en el mapa compartido (`mapa:salida`, `mapa:puerto`). Las temporadas no recolocan islas: gana el mapa compartido (D-20.7). Se cierra la contradicción REQ-MUN-035 / REQ-ADM-032 |
| O7 | Satélites (§39.3) | Un evento satélite sin isla aparece en el panel de Tickets y en «Próximos eventos» de la isla All Day, con la línea «Calienta para el próximo All Day» y enlace a él. La localización común (REQ-COM-010) es la isla All Day vigente |
| O8 | Descuento de tienda (§12) | Se muestra y se copia el código, con «Ir a la tienda» (externa). Lo valida la tienda de BOIA |
| O9 | Moderación de Carnets | Botón «Reportar» en el Carnet público. En el Admin, Moderación lista los Carnets reportados y permite ocultar una respuesta o la foto, o restablecer el apodo, todo auditado |
| O10 | Música de ambiente | Un loop por mundo generado (`muestra`) hasta que haya música con licencia. Arranca con el primer toque en `/juego` y `/mar` al 30 % si la música está activa. La landing no suena |
| O11 | HUD | Se quedan Inicio, saldos y brújula (decisiones de Hernán). La caja de fps sólo sale con `?debug`. REQ-PRO-009 se ajusta |
| O12 | Seis boies | Se añaden cinco boies informativas a la ruta del mapa compartido, con textos por mundo. El logro «X/6 boies» pasa a ser alcanzable |
| O13 | Instagram | Enlace en el pie, en la cabecera y en el panel de la boia de WhatsApp (URL `muestra`) |
| O14 | Legales | Plantillas genéricas `muestra` con los datos del titular vacíos y marcados |
| O15 | Delfín | Aparece junto al barco cada 2–4 min en mar abierto, guía unos segundos hacia algo sin descubrir y se va |

## 3. Huecos que se pueden construir ya

### Comercial y eventos
- **FALTA** ficha compartible por evento `/eventos/<slug>` y enlaces directos a evento o galería (COM-012, COM-005, ENT-011, ENT-036).
- **PARCIAL** la isla no muestra el estado del evento: agotado, pospuesto/cancelado con aviso, recuerdos con cartel y fotos (COM-003, COM-007, COM-008, AVE-014).
- **FALTA** «Próximos eventos» en el panel de la isla de evento (AVE-014).
- **PARCIAL** los estados sólo cambian a mano; falta derivarlos de las fechas (COM-004).
- **PARCIAL** faltan en el evento cartel, actividades, precio (hoy en `lib/ticketing/pricing.ts`) y apertura de venta; `format` es texto libre en vez de All Day/satélite (COM-001, PRO-006).
- **FALTA** localización común para satélites sin isla y su enlace al siguiente All Day (COM-010, PRO-007, §39.3; ver O7).
- **PARCIAL** descuentos: la tarjeta no enlaza al evento ni a la isla; no hay «Mis códigos»; no se crean en el Admin; no hay descuento de tienda en los datos (COM-020, COM-022, PRO-005, AVE-021).
- **FALTA** devoluciones con ajuste de sello (COM-019); vídeos (COM-032).
- **PARCIAL** Filosofía es sólo un bloque de la home (COM-030). No hay galería por evento (COM-031).
- **PARCIAL** no hay e2e del ciclo de 5 pasos del evento (COM-014).

### Accesos desde la landing
- **PARCIAL** Tickets, Fotos y Tienda no llevan el barco a su isla: son panel HTML y anclas (ENT-034, AVE-022).
- **PARCIAL** la cabecera no tiene Mi Carnet ni control de sonido. El pie no invita a Carnet ni a WhatsApp (ENT-029, ENT-032).
- **FALTA** Instagram (P3 de la v14, no está en la spec; ver O13).
- **PARCIAL** falta el test de Tickets con 0, 1 y 3 eventos (ENT-037). Hay que volver a comprobar que Tickets se ve sin scroll a 360×640 con el CTA 3D (PRO-001).

### Identidad y comunidad
- **FALTA** ranking. `sections/ranking.tsx` dice «Próximamente» (IDE-038, IDE-017). Decidido: sólo local.
- **PARCIAL** Mi Barco: no hay color ni tienda; los cosméticos no se equipan desde la UI ni se pintan en el barco; no hay test de física igual con cosméticos (IDE-030, IDE-031, IDE-032, MUN-028).
- **FALTA** invitaciones a crear el Carnet (al comprar, al cerrar la galería, a los 5 min o 3 logros) y su ritmo (IDE-008, IDE-009).
- **PARCIAL** la posición del barco no se guarda. El aviso de progreso local no explica sus límites (IDE-004, IDE-007).
- **FALTA** moderación y reporte de Carnets (no está en la spec; ver O9).

### Mundo y aventura
- **FALTA** transición de cambio de mundo (decisión 4).
- **FALTA** cinco boies más. El logro de las seis es inalcanzable (IDE-025, §7; ver O12).
- **PARCIAL** no hay pantalla de Admin para el destino de la Fiestera ni migración auditada. No se valida una misión sin destino (AVE-010, AVE-011).
- **PARCIAL** el delfín tiene un sitio fijo y nunca aparece junto al barco (AVE-018; ver O15).
- **PARCIAL** los secretos no tienen arte (AVE-015).
- **PARCIAL** no hay atajo «Explorar la isla» en visitas posteriores (AVE-013).
- **PARCIAL** cofres sin premio de cosmético raro (AVE-017).
- **PARCIAL** el récord no cambia de versión al mover las puertas del circuito (AVE-033).
- **PARCIAL** sonido: no hay música de ambiente, falta el «ping» al recoger y el WHOOSH del boost, y no hay sonido ni animación asignables por comportamiento (PRO-011, AVE-016, AVE-029, IDE-037).
- **PARCIAL** la estela no reacciona a giro, boost ni choque (MUN-004).
- **PARCIAL** no hay sensibilidad de teclado ni táctil (MUN-008).
- **PARCIAL** B05 y B02 sólo tienen skin base. Faltan sprites de giro, drift y regreso. Bandera y accesorio van horneados (MUN-029, MUN-028).
- **PARCIAL** el HUD tiene más de lo que permite la spec (PRO-009; ver O11).
- **PARCIAL** `/juego` carga todo el arte al arrancar (unos 6 MB en Arcilla): sin sectores, atlas ni calidad adaptable (MUN-012, ARQ-014).
- **PARCIAL** la telemetría de los minijuegos no está cableada (AVE-035).
- **PARCIAL** el mapa no tiene rutas explícitas ni tests de rodeo y salida del circuito (MUN-013, MUN-016).

### Admin
- **FALTA** aviso de impacto y borrado escribiendo el nombre (ADM-029).
- **PARCIAL** la papelera no tiene plazo ni purga (ADM-030).
- **PARCIAL** los logros no se crean, duplican ni versionan, y no llevan icono, fechas ni ámbito (ADM-021, ADM-022). Coordinar con la T36 del plan 003.
- **PARCIAL** no hay borrador ni publicación para home y eventos (ADM-015). El formulario de la home no deja cambiar las CTA ni excluir eventos (ADM-017).
- **PARCIAL** faltan validaciones de destino de misión, circuitos, referencias y rangos de parámetros (ADM-013, ADM-014).
- **PARCIAL** la música no se sube con licencia (ADM-020). Compras y sellos no se auditan (ADM-007).
- **FALTA** procedimiento de peticiones de datos a mano (ADM-031).

### Técnico y entrega
- **FALTA** archivo de estado por REQ con evidencia (PRO-017).
- **PARCIAL** analítica: `discount_found` no se emite y `purchase_confirmed` no tiene emisor (ARQ-019).
- **PARCIAL** i18n sólo en la landing; `/juego` y el Admin tienen cadenas en el código (ARQ-020).
- **PARCIAL** faltan CSP, límites y comprobación de origen (ARQ-012).
- **FALTA** `.env.example`, README raíz, manuales y lista de entrega (ARQ-024, ARQ-006).
- **PARCIAL** falta la matriz de 16 casos (ARQ-016). `check.py` de arte no corre en `pnpm test` (MUN-031).

### Documentos desfasados
- `docs/PLAN.md` sigue con Faro y Cañón congelados (D-20 los adelantó).
- `mundos/arcilla/diseno.md` marca Faro y Cañón como L2.
- `docs/spec/00-indice.md` cita D-01…D-20 y falta D-21 (y D-22/D-23).
- Los textos de §31.2 no incluyen Welcome Aboard, los minijuegos ni las invitaciones.

## 4. Aplazado a la versión final (D-20, sin cambios)

Supabase compartido, acceso por correo con fusión del invitado, login del Admin
con TOTP y roles, editor visual de arrastrar y soltar, ticketera real con
webhook, PostHog, validación de recompensas en servidor, dominio y cuentas de
BOIA, copias y restauración (ARQ-023).

## 5. En la v14 pero aparcado (L2 o reserva)

Inglés, entrada editable desde el Admin, bloques de actividades y comunidad,
día y noche en `/juego` (`/mar` ya lo tiene), boia musical y corrientes
musicales, ranking global del circuito, preguntas del Carnet editables, perfil
público de artista, sello por QR y check-in, fotos personales y mini blog,
«Mis bolleros», encuestas, Mensajes, logros retroactivos y masivos, tienda
propia, exportar o borrar la cuenta desde la web, roles de moderador y artista,
duplicar temporada y configurar minijuegos desde el Admin.

## 6. Respuestas de Álvaro (vía Hernán, 2026-09-29)

| # | Tema | Respuesta | Qué hacemos |
|---|---|---|---|
| 1 | Ticketera | Por decidir | P2 sigue abierta; seguimos con el sandbox |
| 2 | Primer evento real | Halloween en el **Kiki García Bar**; sin cartel todavía | Evento real `halloween-2026`, **BOIA Club · Halloween**, 31-10-2026, sitio «Kiki García Bar», cartel «próximamente», precio `muestra`. Hernán: **no es un All Day, es un BOIA Club**. Se trata como activación satélite (§39.2) de la serie «BOIA Club»: sin isla propia, sale en el panel de Tickets y en «Próximos eventos» de la isla `allday`, y enlaza al próximo All Day cuando exista |
| 3 | Enlaces | Sin respuesta | Siguen siendo `muestra` |
| 4 | Códigos de descuento | Llegarán cuando funcionen con la ticketera | Inventados de momento, marcados `muestra` |
| 5 | Artistas | Se mantiene la lista de 26; fotos y sus Carnets con preguntas, más adelante | La lista deja de ser provisional; sin fotos ni Carnets de artistas por ahora |
| 6 | Fotos de eventos | Sí, con **una selección personal que sale en la página inicial** antes de ver el resto | Las fotos llevan la marca «selección»: la home enseña sólo esas y «Ver todas» lleva a `/fotos` |
| 7 | Música | Dejar las de ambiente; las opciones llegarán más adelante | Se mantiene O10 |
| 8 | Logo y tipografía | Adjuntos: `art/marca/boia-mascota.jpg` (mascota: boia naranja con gorro azul marino, ojos grandes y sonrisa) y `art/marca/boia-wordmark.jpg` («BOIA» en naranja, palo grueso con cantos blandos) | **La mascota es la base de todas las boias 3D del juego**, renderizadas con forma de boya: la primera boia, las informativas, la de WhatsApp y la Boia Fiestera (con sus detalles de fiesta). Las letras 3D de la entrada se rehacen con la forma del wordmark en lugar de Inter |
| 9 | Datos legales | Inventados, con nombres graciosos y juegos de palabras un poco guarros | Ver abajo |
| 10–11 | Dominio, cuentas y enseñar la demo | Permiso total para Hernán | P13 cerrada; Hernán crea las cuentas y decide a quién enseñarla |

Datos legales `muestra` (decisión del orquestador; se sustituyen antes de publicar de verdad):
titular **Bollería Fina del Mediterráneo, S.L.**, NIF B00000069 (no válido a
propósito), domicilio **C/ Rosa Melano, 69, 03001 Alicante**, administrador
**Benito Camelas**, delegada de protección de datos **Débora Melo**, atención
al público **Paco Merlo**, correo `privacidad@boia.example`.

Siguen abiertas con Álvaro: P2 (ticketera), enlaces reales, códigos reales,
fotos de artistas, música, cartel de Halloween y fichero de la tipografía (si
existe un .otf/.ttf; si no, se calca del wordmark).

## 7. Lista enviada a Álvaro (histórico)

1. **Ticketera**: cuál usáis (o si os la montamos) y acceso a la cuenta. Hasta
   entonces la compra es de prueba.
2. **Primer evento real**: nombre, fecha, sitio, precio, cartel y si es All Day
   o satélite.
3. **Enlaces reales**: entradas, tienda, WhatsApp, Instagram y un correo de
   contacto.
4. **Códigos de descuento reales**: creados en vuestra ticketera o tienda, con
   el % de cada uno.
5. **Artistas**: si la lista de 26 está bien y una foto de cada uno.
6. **Fotos de eventos pasados**, separadas por evento.
7. **Música**: canciones que podamos usar, con permiso (una por mundo basta).
8. **Logo y tipografía** de BOIA en archivo.
9. **Datos legales**: titular, NIF/CIF, dirección y correo de privacidad.
10. **Dominio y cuentas** (Vercel, base de datos, analítica) a nombre de BOIA,
    o autorizar a Hernán a crearlas.
11. **Visto bueno para enseñar la versión de prueba** fuera del equipo.
12. **Una lectura rápida** de los textos que escribimos nosotros y de lo que
    decidimos por él (§2), por si quiere cambiar algo.
