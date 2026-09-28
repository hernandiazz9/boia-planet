# 01 · Producto y flujos

Fuente: v14 §1 a §3, §25 a §27, §30 y §39; también §28, §33, §45 a §47 y §49.18, que la v14 no asigna a ningún bloque. Alcance según D-02.

## Qué es BOIA.PLANET

BOIA.PLANET es la web-universo de BOIA, colectivo de eventos musicales de Alicante: web de eventos, venta de entradas, mundo navegable, descubrimiento cultural y comunidad en un solo producto. No debe sentirse como una web con un minijuego añadido (§1, P1). Se construye desde cero (D-01), mobile-first, con un mundo 2D/2.5D ilustrado y ligero.

Principios de la v14 que ordenan las decisiones de diseño:

- «El mundo te enseña a jugar. El menú te permite consultar.» (§1)
- «Islas fijas, mar vivo.» (§1)
- «Puedes comprar directamente. Si decides explorar, BOIA hace que el camino hasta tu entrada sea parte de la experiencia.» (§1)
- En el evento y en la web, BOIA recompensa la curiosidad: ves algo raro, te desvías, descubres (§37.13).

El objetivo principal es vender entradas (§2.1). Los secundarios (§2.2) son una identidad digital reconocible, más tiempo con la marca sin publicidad constante, descubrir artistas y estilos, comunidad con Carnets, ranking y botellas, retorno por progresión y mar dinámico, y renovar eventos y temporadas sin rehacer código. Los secundarios no generan requisitos propios: los cubren los de cada área.

## Dos caminos y tres flujos

- **REQ-PRO-001** `L1` — Ofrecer desde la landing dos caminos igual de comprensibles, COMPRAR TICKETS y EXPLORAR EL UNIVERSO; Explorar puede ser el CTA más llamativo, pero Tickets nunca queda escondido. *Fuente: §2.1, §3*
- **REQ-PRO-002** `L1` — No condicionar la compra de entradas a jugar, conducir, registrarse ni conseguir logros. *Fuente: §2.1, §25, §26, P1*
- **REQ-PRO-003** `L1` — Implementar el flujo comercial directo (landing, Tickets, isla con el panel de entradas abierto, Comprar), que llega al checkout externo del evento prioritario en 2 toques. *Fuente: §4.3, §26*
- **REQ-PRO-004** `L1` — Implementar el flujo experiencial: entrada cinemática, landing, Explorar, barco, primera boia, Boia Fiestera y cocodrilos, rescate, exploración de islas, eventos, descuentos y secretos, posible compra, última isla y mundo abierto, sin que login ni Carnet lo interrumpan. *Fuente: §26, §46*
- **REQ-PRO-005** `L1` — Tratar el juego como segunda vía de conversión (explorar, descubrir, obtener sorpresa o descuento, conocer el evento, comprar) sin añadir fricción a la compra. *Fuente: §2.1*

El tercer flujo, el de atajo (landing, Fotos, Tienda o evento, barco en esa localización con el contenido abierto, cerrar y seguir navegando), es REQ-ENT-034.

## Tipos de evento

ALL DAY BOIA es el producto cultural principal; las activaciones satélite son herramientas de comunidad, contenido y promoción que conducen al siguiente All Day (§39.3).

- **REQ-PRO-006** `L1` — Clasificar cada evento como All Day BOIA (formato principal de día y noche, grandes islas y destino comercial principal) o como activación satélite (pequeña, normalmente gratuita o de bajo coste, orientada a comunidad y promoción). *Fuente: §39, P2*
- **REQ-PRO-007** `L1` — Permitir publicar activaciones satélite sin isla principal ni el tratamiento visual de un All Day BOIA. *Fuente: §39.2*

## Reglas de experiencia no negociables

- **REQ-PRO-008** `L1` — Diseñar y probar cada pantalla primero en móvil táctil y después en escritorio. *Fuente: §1, §25*
- **REQ-PRO-009** `L1` — Dar más mundo y menos HUD: ninguna tarjeta de progreso permanente ni overlay grande durante la conducción, salvo una acción puntual imprescindible. *Fuente: §14, §25, §47-A*
- **REQ-PRO-010** `L1` — Evitar modales que detengan la navegación salvo necesidad real, y usar la proximidad cuando la interacción lo permita. *Fuente: §25*
- **REQ-PRO-011** `L1` — Dar feedback inmediato con animación y sonido corto a cada interacción del mundo. *Fuente: §25*
- **REQ-PRO-012** `L1` — Hacer que las mecánicas importantes se entiendan visualmente, sin manuales largos, y no añadir sistemas que exijan demasiada explicación. *Fuente: §25*
- **REQ-PRO-013** `L1` — Recompensar la curiosidad y mantener el mundo interesante después de la misión principal. *Fuente: §8.3, §25, §37.13*
- **REQ-PRO-014** `L1` — Mantener la identidad BOIA en interfaz, arte, sonido y lenguaje, sin copiar una obra concreta ni usar estética de plantilla. *Fuente: §6.1, §25, §30*

## Lo que debe sobrevivir

La v14 audita el piloto (§45) y pide que ninguna mejora probada desaparezca al reconstruir (§27, §47). Cobertura en esta spec:

| Punto de §47 y §27 | REQ |
|---|---|
| CTA Explorar prominente y Tickets directo | REQ-ENT-025, REQ-ENT-026, REQ-ENT-027 |
| Home y mundo conectados físicamente | REQ-ENT-024, REQ-ENT-034 |
| Compra directa y compra por descubrimiento | REQ-PRO-003, REQ-PRO-005 |
| Artistas rotativos y A–Z completo | REQ-COM-026, REQ-COM-027 |
| Tutorial por boia con bocadillos, sin modal | REQ-AVE-001, REQ-AVE-002, REQ-AVE-004 |
| Islas por proximidad y minimapa manipulable | REQ-AVE-012, REQ-MUN-020, REQ-MUN-021 |
| Misión Boia Fiestera completa | REQ-AVE-005 a REQ-AVE-011 |
| Drift, estela y navegación táctil | REQ-MUN-004, REQ-MUN-006, REQ-MUN-007 |
| Mar vivo: restos, cofres, delfín y remolino | REQ-AVE-016 a REQ-AVE-019 |
| Circuito con boost, 3 obstáculos y atajo | REQ-AVE-029, REQ-AVE-030, REQ-AVE-031 |
| Logros, puntos, cosméticos y ranking | REQ-IDE-024, REQ-IDE-027, REQ-IDE-031, REQ-IDE-038 |
| Avisos sin HUD permanente | REQ-IDE-026, REQ-PRO-009 |
| Carnet BOIA con 5 preguntas y sellos (antes «Carta de Navegación») | REQ-IDE-010, REQ-IDE-014, REQ-IDE-021 |
| Botellas públicas sin mensajes privados | REQ-IDE-040, REQ-IDE-044 |
| Bolleros como lenguaje interno | REQ-IDE-020 |
| Admin, triggers, spawn y temporadas | REQ-ADM-009, REQ-ADM-021, REQ-ADM-032, REQ-ADM-033 |
| Separación motor, datos y assets | REQ-MUN-002, REQ-ARQ-003 |

- **REQ-PRO-015** `L1` — Conservar cada comportamiento del piloto marcado INTEGRADO en §45 y cada punto de §27, y declarar toda desviación antes de implementarla. *Fuente: §27, §45, §47*

## Revisión y trazabilidad

- **REQ-PRO-016** `L1` — Revisar en cada hito las 14 preguntas de §30, cada una con sí o no y su evidencia. *Fuente: §30*
- **REQ-PRO-017** `L1` — Llevar el estado de cada REQ con los valores No integrado, En proceso, Implementado mejorable e Implementado satisfactorio, con evidencia y prueba, separando decisión, implementación, comprobación automática y validación real. *Fuente: §49.15, §49.18, P2*

Las 14 preguntas de §30, resumidas: comprar en pocos pasos sin jugar; explorar hace más atractivo comprar; misión comprensible sin HUD permanente; razones para volver a navegar; Carnets y botellas hacen el mundo habitado; circuito comprensible y rejugable; puntos con uso claro; menú completo sin ocupar la pantalla; minimapa que ayuda sin molestar; temporada nueva sin rehacer el juego; Admin cambia spawn, prioritario, islas, boies y logros; arte sustituible sin romper la lógica; todo con prioridad en móvil; se siente BOIA y no una plantilla.

## Contenido de BOIA y publicación

Identidad, negocio y publicación los aprueba Álvaro (§33). La IA puede proponer o producir, nunca sustituir su aprobación. Lo que BOIA aporta, según §33:

| Área | Qué aporta BOIA |
|---|---|
| Identidad | Definición en 1 a 3 frases, historia y origen, valores y antivalores, tono y nivel de humor pirata |
| Marca | Logo y variantes, paleta y referencias, tipografías con licencia |
| Arte | Referencias sí y no; aprobación de barco, Boia Fiestera y temas de islas |
| Artistas | Lista final con géneros, fotos oficiales, biografías |
| Eventos y negocio | Carteles y datos, ticketera y URLs, evento prioritario de lanzamiento, reglas y valores de descuentos |
| Tienda | Productos, precios, fotos y stock |
| Juego y comunidad | Lista inicial de logros y puntos, economía de cosméticos, normas de botellas y moderación, progreso entre temporadas |
| Producto y técnica | Idiomas de lanzamiento, dominio, hosting y cuentas, privacidad, cookies y términos con revisión profesional, móviles reales de prueba |
| Lanzamiento | Aprobación final de la publicación, no delegable |

- **REQ-PRO-018** `L1` — Marcar como muestra o pendiente todo contenido real no aprobado por Álvaro (fechas, enlaces de tickets, códigos, fotos, canciones, productos, precios y textos) y no publicarlo sin su aprobación. *Fuente: §33, §49.18, P1*
- **REQ-PRO-019** `L1` — Reunir antes de la carga final el contenido de la tabla anterior, con responsable y estado por fila [pendiente Álvaro]. *Fuente: §28, §33*
- **REQ-PRO-020** `L1` — Publicar sólo con autorización expresa de Álvaro y tras confirmar contenido y derechos, cuentas y dominio de BOIA, correo y autenticación, pagos y confirmaciones, estados y stock, permisos del Admin, textos legales revisados, copia y restauración, métricas, accesibilidad y pruebas físicas, enumerando lo no activado sin sustituirlo por una interfaz simulada. *Fuente: §33, §49.18, P3*
- **REQ-PRO-021** `L1` — Poner dominio, hosting, ticketera, correo y demás cuentas de producción a nombre y bajo control de BOIA; el equipo de desarrollo no crea cuentas, no acepta condiciones ni paga en su nombre. *Fuente: §49.18, P3, D-04*
