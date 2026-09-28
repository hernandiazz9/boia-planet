# 03 · Mundo y motor

Fuente: v14 §6, §10, §24, §34, §35, §48 (48.1 a 48.3, 48.6, 48.9), §49.7, §49.14, §49.16, §49.17, MAP 01 y ART 01; D-04, D-05 y D-12. El editor que coloca estos objetos está en [07-admin](07-admin.md); los encuentros concretos (boies, Fiestera, circuito), en [04-aventura](04-aventura.md).

## Dirección visual y técnica

El mundo es 2D/2.5D con sprites por capas; el 3D sólo existe offline, en Blender, para producir sprites (D-05). Estética propia de BOIA: ilustración artesanal, personajes expresivos, carácter musical y pirata, sin copiar una obra concreta (§6.1).

- **REQ-MUN-001** `L1` — Construir un mundo 2D/2.5D isométrico ilustrado con sprites por capas, parallax, sombras, escalado y animaciones cortas, sin runtime 3D. *Fuente: §1, §6.1, P1*
- **REQ-MUN-002** `L1` — Separar MOTOR BOIA, DATOS/EDITOR DEL MUNDO y ARTE/ASSETS, de modo que islas, obstáculos, personajes, banderas y decoración se sustituyan por recursos compatibles sin cambiar reglas ni perder asociaciones de contenido. *Fuente: §6.1, §24, §48.9, §49.17*
- **REQ-MUN-003** `L1` — Animar el agua con texturas u ondas ligeras para que se sienta viva. *Fuente: §6.2, P1*
- **REQ-MUN-004** `L1` — Dibujar una estela que se desvanece, reacciona a velocidad, giro, drift, boost, choque y parada, y corresponde al desplazamiento real del barco. *Fuente: §6.2, §49.17*
- **REQ-MUN-005** `L2` — Añadir un ciclo de día y noche configurable [provisional]. *Fuente: P1, P3*

## Controles y física

- **REQ-MUN-006** `L1` — Crear el joystick táctil donde toca el primer dedo, en cualquier punto de la zona de juego, con origen en ese punto. *Fuente: §6.2, P1, P3, D-12*
- **REQ-MUN-007** `L1` — Activar el drift y un giro más rápido con un segundo dedo. *Fuente: §6.2, P1, P3*
- **REQ-MUN-008** `L1` — Ofrecer en escritorio teclado con dos modos (dirección de pantalla por defecto y control de tanque elegible en Controles, con la preferencia guardada), una alternativa para el drift y sensibilidad ajustable. *Fuente: P1, P3, D-14*
- **REQ-MUN-009** `L1` — Calcular movimiento, colisiones y física con independencia de la tasa de imágenes. *Fuente: P3*
- **REQ-MUN-010** `L1` — Detener la aceleración al perder un dedo o cambiar de pestaña, y devolver el barco a agua segura si queda en una posición inválida. *Fuente: P3*

## Mapa, sectores y ritmo

Antes de construir bastan las reglas; el mapa de lanzamiento se diseña, se navega y se ajusta durante la construcción del mundo (§49.14, autonomía de §49.18). Después, el Admin amplía y recoloca sin reconstruir la aplicación.

- **REQ-MUN-011** `L1` — Hacer infranqueables las costas laterales, dejar que el mapa crezca hacia arriba sin pared superior permanente y conducir suavemente de vuelta a aguas navegables desde la zona no publicada. *Fuente: §49.7, P3*
- **REQ-MUN-012** `L1` — Cargar el mundo por sectores bajo demanda, con atlas, calidad adaptable y límites de memoria. *Fuente: P1, P3, D-02*
- **REQ-MUN-013** `L1` — Definir el contrato de mapa: coordenadas isométricas, sectores, colisiones, anclajes de assets, rutas, destinos y validaciones. *Fuente: §49.14, P1, P2*
- **REQ-MUN-014** `L1` — Usar la misma geometría y las mismas transformaciones isométricas en motor, colisión, minimapa, cámara y editor, de modo que lo colocado en el editor aparezca en el mismo sitio al jugar. *Fuente: P2, P3, D-04*
- **REQ-MUN-015** `L1` — Ordenar la navegación desde la zona inicial hacia las islas principales de eventos, intercalando islas secundarias, personajes, eventos y actividades, sin agrupar las actividades en una esquina ni poner todas las islas comerciales seguidas. *Fuente: §49.16*
- **REQ-MUN-016** `L1` — Entregar un plano con ruta principal, desvíos opcionales y circuito diferenciados, y comprobar que las actividades opcionales se pueden rodear, que la salida del circuito lleva al destino configurado y que el mapa se amplía sin cambiar misiones existentes. *Fuente: §49.16 · alias MAP 01*
- **REQ-MUN-017** `L1` — Ajustar velocidad, distancias y señales hacia dos objetivos medidos con el barco base en móvil: 1 minuto de navegación directa al destino principal y 10 minutos para explorar el mapa inicial y sus sorpresas principales, sin contar carga, lectura, compra ni actividades largas. *Fuente: §49.7, P3*
- **REQ-MUN-018** `L1` — Documentar el boceto del mapa de lanzamiento: inicio, islas principales, destino de la Boia Fiestera, circuito y atajo, costas, Fotos, Tienda, zonas de sorpresas, orden narrativo, evento prioritario provisional y relación de cada isla con sus eventos. *Fuente: §49.14, P3*

Los objetivos de tiempo son objetivos, no resultados garantizados; los logros de 20 minutos siguen siendo retos opcionales de retorno (§49.7). Faro y Cañón, que la v14 sitúa en este mapa, son L2 (D-02, D-08).

## Minimapa y brújula

- **REQ-MUN-019** `L1` — Dibujar el minimapa con 96 px de lado en móvil, sin superar el 22 % del ancho, y 128 px en escritorio. *Fuente: §10, D-07*
- **REQ-MUN-020** `L1` — Ampliar el minimapa con un toque y mostrar en la vista ampliada nombres y funciones de las islas y puntos descubiertos. *Fuente: §10, P1*
- **REQ-MUN-021** `L1` — Entrar en modo reposicionamiento con una pulsación larga de 500 ms, arrastrar y soltar con ajuste a zonas seguras que no tapan controles, y guardar la posición elegida. *Fuente: §10, D-07*
- **REQ-MUN-022** `L1` — Orientar una brújula hacia el objetivo seleccionado o, si no lo hay, hacia la siguiente isla u objetivo no explorado; al entrar desde un evento, señalar su isla. *Fuente: §5, §10, P3*

## Objetos modulares

Un cocodrilo no es «un cocodrilo que ralentiza»: es un asset + un área + el comportamiento RALENTIZAR AL COLISIONAR. Mañana se cambia el PNG por un tiburón y hace lo mismo (§48.1). Se programa una mecánica una vez y se configura muchas veces desde el Admin (§48.6).

Catálogo inicial de comportamientos (§48.3, con el corte de D-02):

| Módulo | Qué hace | Parámetros principales |
|---|---|---|
| COLISIÓN | Bloquear, rebotar, frenar, ralentizar o impulsar (boost) | efecto, intensidad en %, duración en s |
| PROXIMIDAD | Activa al entrar o salir de un radio | radio, entrada o salida |
| DIÁLOGO | Secuencia de bocadillos con avance y salto por toque y reacción al alejarse | mensajes, intervalo (por defecto el de REQ-AVE-002) |
| RECOGIBLE | Desaparece al pasar por encima y entrega algo | monedas, puntos, descuento, objeto o logro |
| RECOMPENSA | Concede un premio | tipo, cantidad, frecuencia: una vez, por sesión, por temporada o repetible |
| EVENTO/CONTENIDO | Abre panel de evento, fotos, tienda, artista, información u otra pantalla soportada | destino |
| TICKET | Muestra o dirige a la compra si el evento está a la venta; desaparece al pasar a histórico | evento |
| CHECKPOINT/BOOST | Valida paso, registra circuito o aplica velocidad | circuito, orden, duración del boost |
| TELETRANSPORTE/DESTINO | Mueve a otro punto o experiencia soportada, nunca dentro de tierra | destino |
| SPAWN/RESPAWN | Reglas de aparición | frecuencia, probabilidad, posiciones permitidas |
| LOGRO/TRIGGER | Dispara o avanza una condición de logros | trigger |
| DECORATIVO | Sin interacción | loop o animación |

Ejemplos de §48.5: cocodrilo con colisión que ralentiza un 60 % durante 2 s; tronco o roca con frenazo o rebote; boia informativa con proximidad y diálogo; boia con premio que además entrega monedas y logro una sola vez; isla de evento con proximidad y panel de evento; cofre recogible con aparición temporal.

- **REQ-MUN-023** `L1` — Modelar todo objeto del mundo, islas incluidas, como asset + geometría + comportamientos del catálogo + parámetros, sin lógica ligada a un asset ni a una isla concreta. *Fuente: §9, §24, §48.1, §48.9*
- **REQ-MUN-024** `L1` — Describir cada objeto con las 9 partes de §48.2: identidad, apariencia, posición, geometría, comportamientos, parámetros, contenido, estado y recompensa o trigger. *Fuente: §48.2*
- **REQ-MUN-025** `L1` — Implementar los 12 módulos de la tabla, cada uno con un esquema de parámetros compartido por motor y editor. *Fuente: §48.3, P2, D-02*
- **REQ-MUN-026** `L1` — Registrar INICIAR_MINIJUEGO en el catálogo como punto de extensión sin ningún juego activo. *Fuente: §48.6, §49.11, D-08*
- **REQ-MUN-027** `L1` — Programar cada mecánica nueva una sola vez como módulo reutilizable que aparece en la biblioteca del Admin; el Admin combina sólo los comportamientos que el motor ya conoce. *Fuente: §48.6*

## Barco, skins y sprites

El barco es el riesgo número uno del arte (D-05). Es modular: cambiar la bandera sustituye sólo su sprite; cambiar el barco sustituye la base (§35).

- **REQ-MUN-028** `L1` — Construir el barco por slots (BASE, SKIN/COLOR, BANDERA, ACCESORIO, ESTELA y TRIPULANTE) con anclajes compartidos por orientación, sin GIF monolítico para lo personalizable. *Fuente: §35, §35.1, §49.17*
- **REQ-MUN-029** `L1` — Producir un barco base y al menos 3 skins distinguibles, cada una en 8 direcciones y en los estados del contrato: giro, parada, drift, regreso y con la Boia Fiestera a bordo. *Fuente: §49.17, D-05*
- **REQ-MUN-030** `L1` — Mantener coherentes proa, popa, cubierta, mástil, sombra y pasajera al ir hacia abajo, de vuelta o marcha atrás; nunca invertir verticalmente un sprite y, si hay marcha atrás, distinguir la dirección del casco de la del desplazamiento. *Fuente: §49.17*
- **REQ-MUN-031** `L1` — Acompañar cada recurso con un manifiesto (ID, versión, archivo o atlas, fotogramas, direcciones, escala, anclajes, pivote y licencia u origen) y separar la geometría de juego de la imagen. *Fuente: §49.17, D-05*
- **REQ-MUN-032** `L1` — Generar los sprites que rotan con scripts de Blender sin interfaz reproducibles desde el repositorio (sombreado toon con contorno, cámara ortográfica a 30° de elevación que da la proyección 2:1, PNG con alfa y manifiesto), y hacer islas, decoración y personajes que no rotan como ilustración 2D de una sola vista. *Fuente: §34, D-05, D-13*
- **REQ-MUN-033** `L1` — Revisar cada skin en 8 direcciones, giros, parada, drift, regreso y rescate; sustituir barco, isla y obstáculo en una prueba de Admin, verificar anclajes y colisiones, restaurar la versión anterior y entregar fuentes editables y una guía para añadir una variante. *Fuente: §49.17 · alias ART 01*
- **REQ-MUN-034** `L1` — Aceptar sólo los formatos del contrato de assets: SVG o PNG para logo e iconos, sprites o atlas para barco y personajes, WebP o PNG por capas para islas, WebP o JPG para fotos y carteles, y audio web para efectos (plop, ping, boost, choque, logro) y música con derechos. *Fuente: §34, §48.8*

Tres skins es el mínimo de arranque, no el límite del catálogo; las skins comparten física, hitbox y reglas competitivas (REQ-IDE-032). El barco mide unos 48 px de eslora en pantalla, valor de muestra que se revisa en el hito 1 (D-15).
