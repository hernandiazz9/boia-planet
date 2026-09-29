# 04 · Aventura

Fuente: v14 §7, §8, §9, §11, §12, §13, §47-A, §49.11 (adelantado a L1 por D-20) y los encuentros que enumeran los Prompts 1 y 3; D-22 para la duración de los diálogos. Todos los encuentros se construyen con los comportamientos de [03-mundo-y-motor](03-mundo-y-motor.md): nada de lógica pegada a «la isla 3» o «el cocodrilo». Los logros y la economía que reparten están en [05-identidad-y-comunidad](05-identidad-y-comunidad.md).

## Primera boia y diálogos

El mundo enseña a jugar sin modales: una boia habla, el jugador puede saltarla y sigue navegando.

- **REQ-AVE-001** `L1` — Colocar en el puerto de salida, justo tras el spawn inicial, una primera boia informativa prácticamente imposible de ignorar, que habla por proximidad con bocadillos y sonidos «plop», sin modal ni bloqueo. *Fuente: §7, P3, D-20*
- **REQ-AVE-002** `L1` — Mantener cada bocadillo de boies, náufragos, personajes y demás encuentros al menos 3 s, más si el texto es largo (+60 ms por carácter a partir del 50, con tope de 8 s) [provisional], en lugar del 1,5 s de D-07; dar a cada bocadillo un botón de cerrar con etiqueta accesible, permitir avanzar o saltar con un toque sin obligar a esperar, e interrumpir con una reacción juguetona si el barco se aleja; igual en `/mar` y en `/juego`. *Fuente: §7, §25, §47-A, D-07, D-22*
- **REQ-AVE-003** `L1` — Hacer que el diálogo tutorial explique la misión (encontrar a la Boia Fiestera y llevarla a la última isla) y mencione descuentos, monedas y secretos [pendiente Álvaro]. *Fuente: §7, §31.2*
- **REQ-AVE-004** `L1` — Cerrar el tutorial señalando el Menú de a bordo con un pulso breve de su icono de ancla, sin abrirlo; al explicar el minimapa, una sola vez («tocar para ampliar, mantener pulsado para mover»), hacerlo pulsar entre 1 y 2 s sin abrirlo. *Fuente: §7, §10, §46, P3*

## Misión principal: Boia Fiestera

«Tripulante» sí se usa aquí: la Boia Fiestera sube a bordo. No se usa para relaciones entre usuarios (D-08).

- **REQ-AVE-005** `L1` — Presentar a la Boia Fiestera flotando entre 3 y 4 cocodrilos que, al acercarse el barco, reaccionan y se sumergen uno a uno con ondas o burbujas, mientras la boia pide ayuda en bocadillos para llegar a la última isla. *Fuente: §8.1, P3*
- **REQ-AVE-006** `L1` — Al rescatarla, animarla saliendo del agua y subiendo físicamente al barco, y mostrar el aviso «Nueva tripulante a bordo · Boia Fiestera rescatada · Destino: última isla». *Fuente: §8.1, D-08*
- **REQ-AVE-007** `L1` — Mantener a la Boia Fiestera visible a bordo durante el trayecto, en el slot TRIPULANTE, con reacciones ocasionales a descubrimientos y sin recordatorio permanente de misión en pantalla. *Fuente: §8.2, §35.1*
- **REQ-AVE-008** `L1` — Al llegar a la última isla desde cualquier lado navegable, lanzar una secuencia corta en la que la Boia Fiestera baja y queda en la isla, con celebración, sonido, logro y una recompensa importante [pendiente Álvaro]. *Fuente: §8.3, P3*
- **REQ-AVE-009** `L1` — Dejar el mundo abierto tras la misión y permitir, entre rescate y entrega, descubrir islas, eventos, descuentos, restos, cofres, delfín, remolinos, botellas, secretos y circuito sin romper el hilo principal, con el estado de la misión persistente. *Fuente: §8.3, §46, P3*
- **REQ-AVE-010** `L1` — Guardar el destino de la misión por ID de lugar y versión de temporada (el mundo, D-20), nunca por coordenada ni por el evento prioritario del día; una ampliación no cambia misiones empezadas o completadas y no se publica una misión con destino inexistente. *Fuente: §13, §49.7, P1, D-20*
- **REQ-AVE-011** `L1` — Dejar que el Admin fije el destino de nuevas partidas y exigir una migración previsualizada y auditada para cambiar el de partidas existentes. *Fuente: §49.7*

## Islas

- **REQ-AVE-012** `L1` — Activar cada isla con un radio de proximidad amplio; el puerto puede existir como elemento gráfico, nunca como requisito para entrar. *Fuente: §9, §46*
- **REQ-AVE-013** `L1` — Marcar la primera llegada con descubrimiento, aviso y posible logro o puntos, y ofrecer en visitas posteriores acceso directo a «Explorar la isla». *Fuente: §9*
- **REQ-AVE-014** `L1` — Ofrecer en cada isla, al acercarse, sus fotos, vídeos, cartel y relato disponibles más un bloque Próximos eventos que prioriza su evento activo y luego el prioritario global; sin fotos, mostrar un estado honesto de contenido pendiente. *Fuente: §9, §48.5, §49.6*
- **REQ-AVE-015** `L1` — Colocar secretos en el mar con comportamientos del catálogo e insinuarlos cerca de las islas sin bloquear el acceso comercial. *Fuente: §9, §25, P1*

## Mar vivo y encuentros

«Islas fijas, mar vivo» (§1): el mar da razones para volver cuando los logros finitos se acaban.

- **REQ-AVE-016** `L1` — Repartir muchos grupos de restos flotantes que se recogen pasando por encima (ping, desaparecen, monedas o puntos) y se regeneran en posiciones aleatorias o semialeatorias al volver a entrar, como progresión repetible sin antitrampas complejas. *Fuente: §11.1, D-09*
- **REQ-AVE-017** `L1` — Hacer aparecer cofres fugaces en posiciones temporales que, alcanzados antes de desaparecer, dan monedas o recompensa y raramente un cosmético, sin tutorial. *Fuente: §11.2*
- **REQ-AVE-018** `L1` — Hacer aparecer un delfín junto al barco cada 2 a 4 minutos en mar abierto, que avanza, se sumerge y reaparece durante unos segundos hacia algo que el visitante todavía no ha descubierto y luego se va; seguirlo es opcional y lleva a una recompensa, cofre, botella, monedas o secreto. *Fuente: §11.3, D-23*
- **REQ-AVE-019** `L1` — Convertir la entrada voluntaria en un remolino en un reto de control con navegación y drift, con más recompensa cuanto más tiempo se controle el barco dentro. *Fuente: §11.4*
- **REQ-AVE-020** `L1` — Situar antes de una primera isla un náufrago que pide que lo acerquen a una fiesta BOIA y, al ayudarlo, entrega un código de descuento para entradas (ejemplo de la v14: 10 %) [pendiente Álvaro]. *Fuente: §12*
- **REQ-AVE-021** `L1` — Permitir que restos o tesoros entreguen descuentos para la tienda (ejemplo de la v14: 20 %), configurables y no fijados a ese valor [pendiente Álvaro]. *Fuente: §12*
- **REQ-AVE-022** `L1` — Situar en el mundo un puerto de Fotos como localización de la galería. *Fuente: §4.3, P1, P3*
- **REQ-AVE-023** `L1` — Colocar una boia de WhatsApp que, por proximidad, abre el acceso voluntario al WhatsApp de BOIA [provisional] [pendiente Álvaro]. *Fuente: §4.4, P1, P3*
- **REQ-AVE-040** `L1` — Colocar cinco boies informativas a lo largo de la primera ruta del mapa compartido, con textos propios de cada mundo, que hablan por proximidad como la primera boia; con ella son seis y cuentan para el logro de las boies; todas las boies del juego (la primera, las informativas, la de WhatsApp y la Boia Fiestera con sus detalles de fiesta) parten de la mascota de BOIA (`art/marca/boia-mascota.jpg`) con forma de boya. *Fuente: §7, §14, D-23*
- **REQ-AVE-024** `L2` — Colocar una boia musical con 4 canciones autorizadas o de prueba [provisional]. *Fuente: P1, P3*
- **REQ-AVE-025** `diferido` — Guardar en reserva las corrientes o estelas musicales y la ruta de boies musicales que construye un beat por capas. *Fuente: §11.5, D-02*

Los códigos de descuento que entregan náufrago y restos siguen las reglas de REQ-COM-020 a REQ-COM-022.

## Circuito de velocidad

- **REQ-AVE-026** `L1` — Situar el circuito en una zona lateral como atajo opcional hacia la última isla de la misión, con la salida junto a ella y el destino referenciado por ID de temporada. *Fuente: §13, §49.16*
- **REQ-AVE-027** `L1` — Dar al circuito inicio, cuenta atrás, meta y récord personal guardado en local. *Fuente: §13, P3, D-09*
- **REQ-AVE-028** `L1` — Mostrar durante la carrera un cronómetro muy pequeño arriba, sin contador grande, modal ni centrado, y dejar récords y detalles para antes o después. *Fuente: §13, §47-A*
- **REQ-AVE-029** `L1` — Hacer que banderas y checkpoints produzcan un WHOOSH y un boost fuerte de 2 s. *Fuente: §13, §46, D-07*
- **REQ-AVE-030** `L1` — Usar sólo 3 obstáculos: cocodrilo móvil con colisión que ralentiza un 60 % durante 2 s, roca fija con rebote o pérdida de velocidad y medusa con ralentización temporal [provisional]. *Fuente: §13, §46, §48.5*
- **REQ-AVE-031** `L1` — Bifurcar el trazado en una ruta normal más ancha y segura y un atajo más corto, estrecho y peligroso señalizado «ATAJO →», que se unen antes de meta. *Fuente: §13, §46*
- **REQ-AVE-032** `L1` — Invalidar el intento al abrir un panel, ocultar la pestaña, recargar o teletransportarse. *Fuente: P3*
- **REQ-AVE-033** `L1` — Guardar cada récord con la versión del circuito y crear una versión nueva si cambian trazado o física. *Fuente: P1, P3, D-02*
- **REQ-AVE-034** `L2` — Añadir un ranking global de tiempos con cuenta, validación de servidor (sesión, semilla y duración) y versión de circuito, junto al ranking de puntos. *Fuente: §13, §21, P3, D-02, D-09*

## Minijuegos

D-20 adelanta a L1 los dos minijuegos de §49.11, que D-02 y D-08 dejaban en L2. Arrancan desde sus islas Faro y Cañón con INICIAR_MINIJUEGO (REQ-MUN-026), con los IDs `faro` y `canon`, y existen en todos los mundos, cada uno con su estilo. En la versión de prueba, la validación de REQ-AVE-038 se hace en el navegador; la del servidor llega con Supabase. Configurarlos desde el Admin (REQ-ADM-036) sigue en L2.

- **REQ-AVE-035** `L1` — Completar INICIAR_MINIJUEGO dentro del motor: inicio por proximidad y acción explícita, conservación de isla y posición segura, vuelta al mismo contexto, y controles, pausa, audio, calidad, movimiento reducido, sesión, economía y telemetría compartidos. *Fuente: §49.11, P3, D-20*
- **REQ-AVE-036** `L1` — Implementar en una isla Faro visible y visitable Vigilancia del faro: escena oscurecida, haz movido con dedo, puntero o teclado, barcos en silueta con direcciones y velocidades configurables, bandera identificable tras iluminarla el tiempo mínimo, señuelos parecidos que no dependen sólo del color, ALARMA ante un pirata, que se retira si acierta mientras los barcos normales deben llegar, feedback visual y sonoro para acierto, falsa alarma y escape sin destellos peligrosos, y fin al identificar 5 piratas o agotar tiempo, errores o barcos; el Faro es visible en el mundo y el minimapa y tiene un panel editorial que explica la actividad. *Fuente: §49.11, P3, D-20*
- **REQ-AVE-037** `L1` — Implementar en una isla Cañón visible y visitable Cañón contra tiburones: cañón orientado por arrastre, puntero o teclado con una ayuda de trayectoria legible en móvil que no exige precisión de un píxel, bola en arco que salpica, tiburones con patrones versionados que se sumergen y cambian de rumbo, y fin al ahuyentar 3 tiburones o agotar tiempo o munición, sin mostrar heridas. *Fuente: §49.11, P3, D-20*
- **REQ-AVE-038** `L1` — Crear cada sesión de minijuego en el servidor (ID, juego, versión, semilla, configuración, inicio y límites) y conceder premios sólo tras validar sesión, semilla y duración con una transacción idempotente, según la política de recompensa (única, diaria, por temporada o sólo récord personal) y sus límites de puntos y monedas; abandonar, ocultar, recargar o cambiar la configuración invalida la marca; en la versión de prueba, sin servidor, la misma validación se hace en el navegador. *Fuente: P3, D-09, D-20*
- **REQ-AVE-039** `L1` — Dar a los minijuegos pausa y salida claras, instrucciones breves, áreas táctiles amplias, estado comprensible sin audio, control de volumen, teclado, un patrón además del color en las banderas, contraste, movimiento reducido y luz atenuada, sin bloquear Tickets, la misión ni la navegación. *Fuente: P3, D-20*
