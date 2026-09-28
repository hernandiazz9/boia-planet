<!-- Texto extraído del docx original (docs/fuente/BOIA_PLANET_Documento_Maestro_Definitivo_v14_TRES_PROMPTS.docx)
el 2026-09-28 con un script del orquestador. Es la FUENTE HISTÓRICA v14: se lee entera una vez,
pero las decisiones vigentes y las contradicciones resueltas están en docs/DECISIONES.md, que prevalece.
Los encabezados "N.M" se reconstruyeron; dos secciones del original no tienen número
(las que siguen a la 47: "AJUSTES DE PACING…" y "DECISIÓN FINAL ENTRADA AUTOMÁTICA…"). -->

BOIA PLANET
Documento maestro version definitiva
Versión 14 con entrada cinematográfica prioritaria y tres prompts actualizados
Especificación conceptual funcional técnica comercial y operativaActualización del 28 de septiembre de 2026
Este documento reúne la especificación de BOIA.PLANET para el equipo de diseño, desarrollo y operación. Define la experiencia definitiva y cómo debe evolucionar entre eventos y temporadas. Para continuar el trabajo existente, se conserva el repositorio y se contrastan sus funciones con estos requisitos; no se reinicia el proyecto por actualizar el documento.
La versión 14 conserva el alcance del maestro y los dos minijuegos incorporados en la revisión 13. Refuerza como prioridad de diseño la entrada automática desde el planeta BOIA hasta las islas, el barco y la landing. Los apartados 4.4 y 49.16 a 49.18 y las actualizaciones de los tres prompts prevalecen donde corrigen instrucciones anteriores. Este documento especifica lo que debe construirse; no certifica que esté implementado ni autoriza por sí solo una publicación.
Guía de revisión del equipo: entrada y landing en 4.4; mapa, sprites y autonomía en 49.16 a 49.18; encargos actualizados en 50. Las observaciones de esta revisión están junto a los cambios. Los registros históricos conservan su función de referencia.

# 1 Visión del producto
BOIA.PLANET no debe sentirse como una web con un minijuego añadido. Debe sentirse como el universo digital de BOIA: una web de eventos, una experiencia navegable, una comunidad musical y un sistema de descubrimiento que conviven en el mismo producto.
Principio UX: «El mundo te enseña a jugar. El menú te permite consultar.»
Principio de mundo: «Islas fijas, mar vivo.»
Principio comercial: «Puedes comprar directamente. Si decides explorar, BOIA hace que el camino hasta tu entrada sea parte de la experiencia.»
La versión definitiva se plantea desde cero, mobile-first, con un mundo 2D/2.5D ilustrado y animado, modular y ligero, evitando depender de un entorno 3D pesado.

# 2 Objetivos y jerarquía

## 2.1 Objetivo principal vender entradas
- El acceso a Tickets debe ser evidente y rápido desde la home. Muestra la isla y abre automáticamente la compra, sin exigir navegación manual, cuenta ni logros.
- Debe existir un EVENTO PRIORITARIO configurable, que sea el evento que BOIA quiere vender en ese momento.
- El juego funciona como una segunda vía de conversión: explorar → descubrir → obtener sorpresa/descuento → conocer evento → comprar.
- Las islas de eventos presentan recuerdos y una llamada clara a entradas de próximos eventos disponibles. Nunca ofrecen comprar una entrada de un evento finalizado.
- Los descuentos encontrados deben conducir de forma sencilla al ticket/evento correspondiente.
- Las decisiones de gameplay nunca deben añadir fricción innecesaria a la compra.

## 2.2 Objetivos secundarios
- Crear una identidad digital reconocible para BOIA.
- Aumentar el tiempo de interacción con la marca sin convertir la experiencia en publicidad constante.
- Descubrir artistas y estilos musicales.
- Construir comunidad mediante Carnets BOIA, ranking y mensajes en botellas.
- Generar retorno mediante progresión, cosméticos, logros y mar dinámico.
- Permitir que BOIA renueve eventos y temporadas sin rehacer el código.

# 3 Estructura general dos caminos desde la entrada
Desde el primer momento deben coexistir dos intenciones igualmente comprensibles:
- COMPRAR TICKETS: elegir evento y comprar directamente.
- EXPLORAR EL UNIVERSO: entrar en la aventura, descubrir eventos, descuentos, artistas y secretos, y comprar cuando tenga sentido.
Explorar puede ser el CTA más llamativo visualmente, pero Tickets nunca debe quedar escondido.

# 4 Entrada y home

## 4.1 Pantalla cinemática inicial
- La entrada comienza con una cinemática automática y muy breve. Debe aparecer una frase o marca sobria en pantalla —preferencia actual: “BOIA.PLANET”— sobre el universo/planeta BOIA.
- NO mostrar selector de idioma como paso previo ni exigir ninguna interacción antes de llegar a la landing. El idioma podrá resolverse automáticamente cuando sea posible y cambiarse después desde Ajustes.
- NO mostrar login ni “continuar como invitado” como pantalla previa. La cinemática debe avanzar sola. El acceso/creación de cuenta y al Carnet BOIA estarán disponibles desde la landing o el menú, pero nunca bloquearán la entrada inicial.
- Si el usuario crea/inicia sesión desde la landing o posteriormente, accede a su Carnet BOIA, identidad persistente, progresión, barco, cosméticos, sellos y demás datos asociados.
- Tras unos instantes, SIN CLIC, la cinemática transiciona automáticamente: la cámara se acerca al mundo BOIA y desemboca en la landing principal. Debe sentirse como una continuidad cinematográfica, no como dos pantallas/formularios separados. La entrada debe ser especialmente cuidada porque es el primer momento de captación.

## 4.2 Home
- Título: BOIA UNDERGROUND MUSIC FESTIVAL.
- Una frase breve de posicionamiento, orientada a amantes de toda la música.
- CTA principal: EXPLORAR EL UNIVERSO, con subtítulo «Encuentra descuentos para tus entradas» cuando existan promociones vigentes; en caso contrario, invitar a descubrir eventos y secretos. Debe ser el CTA visual dominante de la home y aproximadamente el doble de prominente que en el prototipo revisado.
- Puede utilizar una animación sutil y continua (pulso, brillo o pequeño movimiento) que atraiga la atención sin resultar molesta.
- Acceso directo y claro a Tickets.
- Accesos a Artistas, Filosofía y Tienda.
- La home debe poder recorrerse verticalmente: al hacer scroll aparecen contenidos (eventos, fotos, artistas, etc.) sin obligar a entrar en cada apartado.

## 4.3 Home como puerta física al universo
- Fotos → transición breve a la isla o puerto de Fotos → se ve el barco y se abre automáticamente la galería.
- Evento/Tickets → se ve la isla del evento seleccionado y el barco → se abre automáticamente el panel de entradas. Tickets general muestra el evento prioritario y permite elegir entre todos los próximos eventos comprables.
- Tienda → se ve la Isla Tienda y el barco → se abre automáticamente el catálogo. El pago externo, si existe, requiere la acción expresa de comprar.
- Al cerrar el panel, el usuario permanece en ese lugar y puede navegar.
- Explorar el universo es la entrada narrativa; los accesos funcionales actúan como teletransportes contextuales.

## 4.4 Diseño prioritario de la transición del planeta a las islas
La animación de entrada es una pieza central del diseño, no un efecto que se añade al final. Queremos una primera pantalla limpia y elegante, con un toque divertido propio de BOIA. Una bola del mundo presenta el universo y se transforma visualmente en el mar, las islas y el barco donde aparece la landing completa. La calidad de esta continuidad debe revisarse como requisito de lanzamiento.

### Dirección artística
Usar la identidad de BOIA, su naranja y violeta o azul marino, con espacio libre, tipografía legible y pocos elementos en movimiento. El planeta debe leerse como un pequeño mundo ilustrado, no como un icono genérico. La mascota puede aportar un gesto breve o un detalle cómplice, sin competir con la marca. Evitar una estética infantil, la acumulación de partículas, rebotes constantes, destellos y efectos de plantilla.
Mantener el mismo lenguaje de ilustración, luz, agua y proporciones durante toda la secuencia. El planeta puede resolverse con capas 2D y una ilusión de volumen 2.5D. No exige construir un globo 3D pesado. El mundo final debe reconocerse como el que acabamos de ver de lejos.

### Secuencia visual de referencia
- Planeta. Desde la primera imagen se ve BOIA.PLANET y el globo sobre un fondo despejado. Un giro muy leve o la flotación del planeta aporta vida. La página carga su contenido esencial en paralelo; no espera a que se descargue todo el mapa.
- Acercamiento. La cámara se aproxima suavemente a una zona de mar del globo. Una costa, forma de isla o detalle gráfico sirve como referencia de continuidad. La aceleración y la desaceleración son progresivas; no hay giros bruscos ni un túnel de zoom.
- Revelación. La curvatura del planeta deja paso al mar isométrico mediante una transición de escala y capas. Se distinguen las primeras islas y aparece el barco en una posición segura. Si se usa un fundido, debe conservar la correspondencia visual entre ambas escenas y evitar el aspecto de un vídeo desconectado del juego.
- Llegada a la landing. La cámara se estabiliza, el barco y el agua conservan un movimiento ambiental discreto y entran el titular, los botones y la navegación. El texto no gira ni se deforma con el mundo. La landing queda lista para leer, desplazarse y comprar; el usuario todavía no está obligado a conducir.
Valor inicial de diseño: unos 3 segundos para la secuencia completa, ajustable tras probarla en móvil. Es una propuesta de ritmo, no un resultado medido ni una espera mínima obligatoria. Una conexión lenta no debe alargar una pantalla vacía. Si los recursos no están preparados, se muestra directamente la landing ligera.

### Entrada automática y control del usuario
La primera visita avanza automáticamente y sin audio. No se pide pulsar Entrar, escoger idioma, iniciar sesión ni crear Carnet antes de mostrar la landing. Un control discreto Saltar animación permite llegar antes al mismo estado final, sin convertirse en un paso obligatorio. Idioma, cuenta y sonido permanecen disponibles desde la landing o el menú.
En visitas posteriores se puede entrar directamente a la landing, con una opción para volver a ver la introducción. Respetar la preferencia de movimiento reducido mediante una escena estática o un fundido breve sin desplazamiento de cámara. Los enlaces directos a Tickets, un evento o una galería abren su contenido sin repetir la introducción.
EXPLORAR EL UNIVERSO activa después la navegación del barco y presenta el tutorial orgánico. No reinicia el mundo ni vuelve a reproducir el acercamiento del planeta. Mientras se lee la landing, el scroll y los gestos pertenecen a la página; al explorar, pertenecen al juego dentro de su zona. Debe existir una vuelta clara a Inicio. La cinemática no concede descubrimientos, puntos, rescates ni récords.

### Landing completa dentro del mundo
El mar, las islas y el barco forman la escena del hero. El contenido y los controles se presentan en HTML accesible por encima o junto a esa escena, con zonas de contraste y sin tapar innecesariamente el barco. La lectura tiene prioridad sobre el movimiento del fondo. En móvil, el encuadre se recompone para mantener visibles el barco y los botones, sin comprimir toda la versión de escritorio.
- Primer encuadre: marca, BOIA UNDERGROUND MUSIC FESTIVAL, frase breve de posicionamiento, EXPLORAR EL UNIVERSO como CTA visual protagonista y Tickets siempre evidente. La promesa de descuentos solo se muestra si hay promociones publicadas y vigentes; si no, se usa una invitación a descubrir eventos y secretos.
- Navegación: Tickets, Artistas, Filosofía, Tienda, Fotos y vídeos; acceso claro a Mi Carnet, idioma y ajustes de sonido. En móvil se agrupa lo secundario en un menú reconocible. No es necesario desplegar todos los iconos del juego sobre el hero.
- Continuación mediante scroll: evento prioritario y próximos eventos, recuerdos con fotos y vídeos, Personas detrás del sonido y acceso A a Z, Filosofía, actividades, tienda, comunidad y contacto. Mantener los bloques administrables y mostrar solo los que tengan contenido publicado útil.
- Cierre de página: enlaces oficiales de BOIA, contacto y accesos legales de privacidad, condiciones y preferencias de cookies cuando correspondan. La invitación a crear Carnet o acceder a WhatsApp es voluntaria. No añadir un formulario de suscripción sin definir su uso y tratamiento de datos.
Tickets, Fotos y Tienda mantienen la regla de isla visible y panel abierto del apartado 49.6. Comprar no exige jugar ni registrarse. El evento prioritario sigue siendo configurable y debe estar vigente; una campaña de Nochevieja u otra fecha no permanece como oferta activa después de terminar. El archivo conserva sus recuerdos.

### Configuración y resistencia a fallos
Separar recursos del planeta, mar, islas y barco de la secuencia de cámara y de los bloques de la landing. Versionar duración, curvas de movimiento, escalas, encuadres por dispositivo, capas, momentos de aparición y alternativa reducida. Admin podrá cambiar recursos compatibles y parámetros dentro de límites seguros, previsualizar y restaurar una revisión. Inventar un tipo de animación nuevo puede requerir programación.
El estado final de la introducción y el inicial de la landing deben compartir cámara, posición y referencias del mundo. Evitar un salto de escala o un barco duplicado al entregar el control. Permitir saltar una sola vez de forma idempotente y cancelar limpiamente animaciones al cambiar de ruta, rotar el móvil o abandonar la pestaña.
El HTML comercial debe estar disponible aunque falle el motor, una imagen o JavaScript. Usar una ilustración ligera del mismo mundo como respaldo, enlaces funcionales y mensajes de error recuperables. Probar expresamente el arranque que antes dejó la demo en blanco; no dar por resuelta su causa sin reproducirla. Diferenciar el archivo de demostración, su visor y el sitio servido por HTTPS.

### Criterios de aceptación de la entrada
- ENT 01. En una primera visita, el planeta desemboca automáticamente en islas, barco y landing sin formularios ni clic obligatorio. Se puede reconocer la continuidad de la escena y no hay flashes, fotogramas vacíos ni saltos de cámara.
- ENT 02. Al terminar o saltar, Tickets, menú, scroll y Explorar responden inmediatamente. No quedan capas invisibles interceptando toques ni controles del barco activos mientras se lee la página.
- ENT 03. Movimiento reducido, retorno, enlace profundo y fallo del renderizador conservan contenido, isla representada y acciones esenciales. Saltar repetidamente o usar Atrás no duplica mundos ni inicia una partida.
- ENT 04. Revisar vídeo del recorrido en escritorio, iPhone y Android físicos, en vertical y horizontal. Verificar tipografía, contraste, áreas seguras, carga lenta, foco, lector de pantalla y ausencia de audio automático. Registrar dispositivo y resultados; una simulación no sustituye esta comprobación.
- ENT 05. Medir la carga y fluidez con los presupuestos del Prompt 3. Si la animación no los cumple, reducir capas o mostrar la alternativa ligera. No sacrificar compra o accesibilidad para conservar un efecto.
- ENT 06. La revisión visual del equipo debe comprobar composición limpia, carácter divertido sin saturación y correspondencia entre el último fotograma y la landing real. Entregar storyboard, grabación y configuración editable. Una transición provisional no se etiqueta como diseño definitivo aprobado.

# 5 Tickets y eventos
- Sección «Elige tu evento» con próximos eventos y compra directa.
- Añadir una invitación tipo «También puedes encontrar sorpresas navegando hasta su isla», enlazada al universo.
- Al entrar desde un evento concreto, el juego debe señalar su isla mediante brújula/minimapa.
- Cada evento debe poder asociar cartel, fecha, artistas, descripción, URL/flujo de ticket, isla, recompensas/descuentos y estado de publicación.
- El evento prioritario debe poder cambiar desde administración sin reconstruir el mundo.

# 6 Mundo navegable definitivo

## 6.1 Dirección técnica y visual
- Mundo 2D/2.5D ilustrado, con sprites, capas, parallax, sombras, escalado y animaciones cortas.
- Estética propia BOIA: no copiar una obra concreta; buscar ilustración artesanal, personajes expresivos y carácter musical/pirata.
- Optimización mobile-first, carga rápida y buena fluidez.
- Separar MOTOR BOIA, DATOS/EDITOR DEL MUNDO y ARTE/ASSETS.

## 6.2 Agua y movimiento
- El agua debe sentirse viva mediante textura/ondas animadas ligeras.
- El barco deja una estela dinámica que se desvanece.
- La estela reacciona a velocidad, giro, drift, boost, choque y parada.
- Las estelas pueden ser cosméticos desbloqueables.
- El control táctil debe ser prioritario; el barco puede avanzar con un dedo y usar un segundo toque/gesto para ejecutar drift y girar más rápido.

# 7 Tutorial orgánico
- Tras el spawn inicial, colocar una primera boya informativa prácticamente imposible de ignorar.
- Al entrar en proximidad, la boya habla con bocadillos y pequeños sonidos «plop», sin modal ni bloqueo.
- Ritmo de conversación: cada bocadillo/mensaje breve debe avanzar aproximadamente cada 1,5 segundos. Evitar pausas largas que hagan que el tutorial o los diálogos se sientan lentos.
- El usuario puede tocar para avanzar/saltar el diálogo si no quiere leerlo completo; nunca debe quedar obligado a esperar a que termine una conversación.
- Explica la misión: encontrar a la Boya Fiestera y llevarla a la última isla; menciona descuentos, monedas y secretos.
- La última intervención señala el Menú de a bordo y hace pulsar brevemente su icono.
- El mismo lenguaje de bocadillos sirve para boyas, náufragos, personajes y otros encuentros.
- Si el jugador se aleja durante un diálogo, puede interrumpirse y reaccionar de forma juguetona.

# 8 Misión principal Boya Fiestera

## 8.1 Encuentro
- La Boya Fiestera aparece flotando y rodeada por 3–4 cocodrilos.
- Al aproximarse el barco, los cocodrilos reaccionan y se sumergen uno a uno con ondas/burbujas.
- La boya habla mediante bocadillos y pide ayuda para llegar a la última isla.
- Al rescatarla, animación de salida del agua y subida física al barco.
- Notificación especial: «Nueva tripulante a bordo · Boya Fiestera rescatada · Destino: última isla».

## 8.2 Viaje
- La Boya Fiestera permanece físicamente visible en el barco durante el trayecto.
- Puede reaccionar ocasionalmente a descubrimientos sin saturar al usuario.
- Su presencia sustituye a un recordatorio permanente de misión.

## 8.3 Final
- Al llegar a la última isla se activa una secuencia corta.
- La Boya Fiestera baja/salta del barco y queda físicamente en la isla.
- Celebración, sonido, logro y recompensa importante.
- La misión principal se completa, pero el mundo sigue abierto para explorar, comprar, completar logros, competir y conseguir cosméticos.

# 9 Islas
- Cada isla tiene una zona amplia de proximidad; el puerto puede ser decorativo, nunca obligatorio.
- Primera llegada: descubrimiento + notificación + posible logro/puntos.
- Visitas posteriores: acceso directo a «Explorar la isla».
- Las islas de evento muestran cartel, fecha, artistas, información, fotos y vídeos disponibles, además de próximos eventos con entradas. Si el evento original terminó, conserva su recuerdo y ofrece otros eventos vigentes, sin vender el pasado.
- Puede insinuarse que existen secretos cercanos sin bloquear el acceso comercial.
- Las islas deben ser objetos configurables, no lógica rígida incrustada en código.

# 10 Minimapa y orientación
- Minimapa discreto, aproximadamente 25–35 % menor que el del prototipo revisado.
- Toque: ampliar.
- Pulsación larga (~0,5 s): entrar en modo reposicionamiento.
- Arrastrar y soltar: mover; aplicar anclaje/snap a zonas seguras para no tapar controles.
- Guardar la posición preferida del usuario.
- El tutorial explica una sola vez: tocar para ampliar y mantener pulsado para mover.
- Mientras se explica, el minimapa debe hacer un pequeño pulso visual durante aproximadamente 1–2 segundos para indicar qué elemento se está mencionando, sin abrirlo automáticamente.
- Al ampliarse, mostrar nombres/funciones de islas y puntos relevantes descubiertos.
- Brújula orientada hacia la siguiente isla/objetivo no explorado cuando corresponda.

# 11 Mar vivo y progresión repetible

## 11.1 Restos de naufragio flotsam
- Muchos grupos de maderas/restos flotantes repartidos por el mar.
- Se recogen simplemente pasando por encima: ping → desaparecen → monedas/puntos.
- Regeneración y posiciones aleatorias/semi-aleatorias al volver a entrar/recargar.
- Fuente de progresión repetible cuando los logros finitos ya se han completado.
- No priorizar sistemas anti-farming complejos; el valor es cosmético/ranking.

## 11.2 Cofres fugaces
- Aparecen ocasionalmente en posiciones temporales.
- Si se alcanzan antes de desaparecer: monedas/recompensa y, raramente, cosmético.
- Deben provocar curiosidad visual sin requerir tutorial.

## 11.3 Delfín
- Aparece ocasionalmente junto al barco y avanza/sumerge/reaparece.
- Seguirlo es opcional.
- Si se sigue, conduce a una recompensa, cofre, botella, monedas o secreto.

## 11.4 Remolinos
- Entrar voluntariamente inicia un pequeño reto de control.
- Cuanto más tiempo se controle el barco dentro, mayor recompensa.
- Debe aprovechar el sistema de navegación y drift.

## 11.5 Ideas en reserva
- Corrientes/estelas musicales: concepto no confirmado.
- Ruta de boyas musicales que construye un beat por capas: mantener en el cajón de ideas hasta validar que no exige demasiada explicación.

# 12 Náufrago descuentos y secretos
- Antes de una primera isla puede existir un náufrago que pide que lo acerquen porque está a punto de empezar una fiesta BOIA.
- Ayudarlo puede otorgar un código de descuento para entradas (ejemplo conceptual: 10 %).
- Restos/tesoro pueden otorgar descuentos para tienda (ejemplo conceptual: 20 %).
- Las recompensas comerciales deben ser configurables y no estar fijadas para siempre a esos porcentajes.
- Los descuentos deben poder copiarse/aplicarse fácilmente y llevar al producto/evento correcto.

# 13 Circuito de velocidad
- Minijuego con cronómetro, récord personal y ranking global.
- Durante la carrera, el cronómetro debe ser MUY PEQUEÑO y estar situado en la parte superior de la pantalla. No usar un contador grande, modal ni centrado que tape el trazado.
- Mostrar únicamente la información imprescindible del tiempo mientras se conduce; récords y detalles completos se muestran antes/después de la carrera, no ocupando el área jugable.
- El circuito ocupa una zona lateral y funciona como atajo hacia la última isla de la misión. No es una etapa obligatoria de la ruta principal. Su salida se sitúa junto a esa isla; el destino se referencia por ID de temporada, no por su coordenada.
- Banderas/checkpoints generan ráfaga/WHOOSH y boost fuerte de ~2 segundos.
- Solo tres obstáculos: cocodrilo móvil (frenazo fuerte), roca fija (rebote/pérdida de velocidad), medusa (ralentización temporal).
- Bifurcación visible: ruta normal más ancha/segura y atajo más corto, estrecho y peligroso, señalizado «ATAJO →».
- Ambas rutas se unen antes de meta.
- El ranking de tiempos debe convivir con el ranking general de puntos.

# 14 Logros puntos y economía
- Unificar conceptualmente Misiones/Achievements como sistema de LOGROS/PROGRESO.
- Debe responder «qué he conseguido» y «qué me falta».
- Ejemplos: primera boya, X/6 boyas, islas descubiertas, entrada comprada, 5/20 minutos jugando, Boya Fiestera rescatada/entregada, circuito, secretos, etc.
- Cada logro puede otorgar puntos/monedas.
- Los puntos acumulados determinan prestigio, rango y ranking. Las monedas son un saldo independiente que se gasta en personalización. Gastar monedas nunca reduce puntos, rango ni ranking.
- Los descubrimientos se comunican mediante notificaciones temporales (~3–4 s), con estética BOIA azul marino/naranja, sonido corto y cola si hay varias.
- No mantener una tarjeta de progreso ocupando permanentemente la pantalla.

# 15 Mi Barco y cosméticos
- Al principio permitir al menos cambiar color.
- Con monedas desbloquear/comprar banderas, accesorios, aspectos y estelas. Los logros también pueden conceder cosméticos directamente.
- La personalización es estética: no modifica velocidad, drift, colisiones ni tiempos competitivos.
- La configuración visual elegida debe persistir en la cuenta.

# 16 Carnet BOIA identidad social

## 16.1 Mi Carnet
- Acceso permanente desde el Menú de a bordo.
- Al entrar, primero ver el Carnet tal como lo ven otros usuarios.
- Botón «Editar mi Carnet».
- Si no existe: invitación «Crear mi Carnet».
- Foto/avatar, apodo y elementos de identidad musical; evitar convertirla en una ficha demográfica.

## 16.2 Preguntas
- Las respuestas nunca deben mostrarse sin contexto.
- Mostrar pregunta pequeña/secundaria + respuesta grande/protagonista.
- Preguntas orientadas a identidad y memoria musical: artista con el que has bailado mucho, canción/disco que recomendarías, mejor experiencia en un festival/pista, algo que compartir con otros navegantes, etc.
- Las preguntas definitivas deben ser editables/configurables en la versión final si es razonable.

## 16.3 Descubrir a otros
- Ranking → pulsar usuario → ver Carnet.
- Mensaje en botella → ver Carnet del autor.
- Artista → ver su Carnet/perfil.
- La filosofía es: «Tu Carnet está en tu menú; los Carnets de los demás se descubren navegando».

# 17 Mensajes en botellas
- Usuarios con perfil pueden dejar un mensaje flotante; objetivo inicial: uno por persona.
- Máximo aproximado de 140 caracteres.
- Mostrar apodo y permitir entrar en su Carnet BOIA.
- La botella no desaparece por ser leída.
- No otorgar puntos por escribir/leer; es una mecánica social.
- El sistema debe poder moderarse/gestionarse en administración para la versión definitiva.

# 18 Artistas y Personas detrás del sonido
- En home, mostrar tres artistas simultáneos que cambian aproximadamente cada 5 segundos.
- Rotación equilibrada, sin duplicados dentro del trío y evitando repetición inmediata.
- Transición suave; en desktop se puede pausar una tarjeta al hover.
- Cada tarjeta: foto, nombre y géneros.
- «Ver todos los artistas» abre A–Z completo.
- Los artistas pueden utilizar una versión pública de Carnet BOIA/perfil.

## 18.1 Lista provisional consolidada
- Alba Fitz — Melodic Techno, Downtempo
- Amenaza Verde — Cumbia
- Casta Diva — Hip Hop
- DJ Alpina — Electro, Techno
- DJ Sacred — Techno
- EGFNK — House
- Franco Maltratto — Reggaeton, House
- Koko Moreno — Reggaeton, House, Hard Dance
- Las Precarias de Torrevieja — Techno, Hard Dance
- Latin Master X — House
- Manija — Melodic Techno, Techno, Psytrance
- Marabina — Ambient, Experimental
- Moglia (Live) — Hip Hop, Jazz Fusion
- Nacho Age — House
- Nat — House
- Pollo Can Fly — Hard Dance, Hard Trance
- The Rancho Cashmere Band — Country
- RBS — Techno
- RKVX — Techno
- Soviet Gym — House
- Spowy — House
- Stonzze — Hard Bounce, Hard Trance
- Tere Ling — Hard Bounce, Hard Groove, Hard Trance
- Tonitto — Reggaeton, Hip Hop
- Torvik — Tech House
- Wet Kisses — Trance

# 19 Menú de a bordo
Navegación superior principalmente mediante iconos grandes y reconocibles; el título textual aparece en el contenido de la sección, no repetido junto a cada icono.
- ⚓ Inicio / Welcome Aboard — qué es BOIA.PLANET, objetivo y ayuda básica.
- 🪪 Mi Carnet — ver/crear/editar identidad.
- 🏅 Logros — progreso, logros conseguidos y pendientes.
- ⛵ Mi Barco — personalización y cosméticos.
- 🏆 Ranking — puntos y acceso a ranking de circuito; perfiles clicables.
- 🎮 Controles — navegación, drift, minimapa, etc.
- ⚙ Ajustes — idioma, música, efectos y futuras preferencias técnicas.
En desktop puede haber tooltips al hover. En móvil, el icono seleccionado se resalta. Puede existir una separación visual antes de Controles/Ajustes para distinguir herramientas de progresión.

# 20 Ajustes
- Idioma.
- Volumen/activación de música.
- Volumen/activación de efectos de sonido por separado.
- Mantener efectos aunque el usuario silencie la música, si así lo desea.
- Guardar preferencias.

# 21 Ranking
- Ranking general por puntos de prestigio acumulados y validados; nunca por monedas restantes. Distinguir clasificación histórica y de temporada.
- Ranking separado para mejores tiempos del circuito.
- Desde un usuario del ranking se puede abrir su Carta.
- Los puntos tienen valor de prestigio; las monedas compran cosméticos. Aplicar validación de servidor proporcionada: no aceptar saldos o récords enviados sin evidencia desde el cliente.

# 22 Filosofía Fotos y Tienda
- Filosofía: explicar qué es BOIA, su visión musical y comunitaria.
- Fotos: galería de eventos integrada tanto en home como en su localización del universo.
- Tienda: camisetas, tote bags, packs de pegatinas y futuros productos; acceso convencional y desde la isla/zona de tienda.
- Los accesos de la home deben poder llevar físicamente al punto correspondiente del universo.

# 23 Administración definitiva
La versión final debe diseñarse desde el principio para que el contenido cambiante sea DATA, no código.

## 23.1 Modo Panel Admin
- Autenticación y permisos de administrador.
- Editor visual del mundo con opción «Editar mundo».
- Crear, seleccionar, mover, escalar, rotar, activar/desactivar y eliminar elementos compatibles.
- Definir punto de aparición (spawn) y orientación inicial del barco.
- Guardar/publicar cambios de forma persistente.

## 23.2 Objetos configurables
- Islas: nombre, asset/animación, posición, escala, radio, contenido, evento, ticket, recompensa, visibilidad.
- Boyas/personajes: posición, asset, diálogo, radio, recompensa, comportamiento.
- Eventos: cartel, fecha, artistas, descripción, URL de tickets, prioridad, isla asociada.
- Recompensas/descuentos: tipo, valor, disponibilidad, destino comercial.
- Objetos dinámicos y puntos de aparición cuando sea razonable.
- Mensajes/botellas: moderación y retirada.

## 23.3 Logros configurables
- Nombre, descripción, icono, puntos y estado.
- Condiciones basadas en un catálogo de eventos del motor: visitar isla, encontrar boya, recoger X objetos, completar circuito, tiempo jugado, comprar entrada, rescatar/entregar personaje, etc.
- Evitar un constructor de lógica arbitraria innecesariamente complejo; ampliar el catálogo de triggers cuando aparezcan nuevas necesidades.

## 23.4 Temporadas mundos
- Poder duplicar una configuración de mundo/temporada.
- Ejemplo: Halloween → duplicar → Nochevieja → recolocar islas, cambiar spawn, evento prioritario, diálogos y logros → publicar.
- Separar borrador/publicado para evitar romper la experiencia en vivo.
- El objetivo es que una nueva fiesta pueda configurarse principalmente desde Admin.

# 24 Arquitectura conceptual desde cero
- MOTOR BOIA: movimiento, cámara, colisiones, proximidad, interacción, audio, economía, logros, usuarios y reglas.
- DATOS/EDITOR: configuración del mundo, objetos, eventos, triggers, temporadas y publicación.
- ARTE/ASSETS: sprites, ilustraciones, animaciones, sonidos, partículas y UI.
- PROGRESO DE USUARIO: carta, puntos, logros, cosméticos, preferencias, posición/configuración pertinente.
- Nunca acoplar un logro concreto a una isla concreta mediante lógica ad hoc si puede resolverse con eventos/triggers.
- Nunca exigir modificar código para cambiar el evento prioritario, cartel, URL de ticket, diálogos o spawn.

# 25 UX reglas no negociables
- Mobile-first y táctil antes que desktop.
- Más mundo visible, menos HUD.
- Evitar modales que detengan la navegación salvo cuando sean realmente necesarios.
- Interacciones por proximidad cuando sea natural.
- Bocadillos para personajes; notificaciones temporales para logros/recompensas.
- Pacing de diálogos: ~1,5 s por bocadillo/mensaje breve, con avance/salto manual mediante toque.
- Feedback inmediato mediante animación y sonidos cortos.
- Las mecánicas importantes deben entenderse visualmente sin manuales largos.
- Comprar entradas nunca debe quedar bloqueado por gameplay.
- La exploración debe recompensar la curiosidad: «veo algo raro → me desvío → descubro algo».
- El mundo debe seguir siendo interesante después de completar la misión principal.
- No sobrecargar con sistemas que requieran demasiada explicación.
- Mantener identidad BOIA coherente en interfaz, arte, sonido y lenguaje.

# 26 Flujo UX definitivo
FLUJO COMERCIAL DIRECTO
Entrada → Home → Tickets → vista de la isla con panel de entradas abierto automáticamente → Comprar entrada. No exige conducir ni registrarse.
FLUJO EXPERIENCIAL
Entrada/cinemática automática (sin clics) → transición/zoom al mundo → Landing/Home → el usuario elige Tickets / Artistas / Filosofía / Tienda o EXPLORAR EL UNIVERSO → si explora: spawn/barco → primera boya/tutorial → navegación → Boya Fiestera + cocodrilos → rescate → exploración de islas/eventos/descuentos/secretos → posible compra → última isla → misión completada → mundo abierto. El login/Carnet está disponible desde la landing o después, pero no interrumpe este flujo.
FLUJOS DE ATAJO
Home → Fotos/Tienda/Evento → transición al universo → barco aparece en la localización correspondiente → contenido abierto → cerrar → continuar navegando.

# 27 Contenido y comportamiento que debe sobrevivir a futuras iteraciones
- La misión de la Boya Fiestera.
- Compra directa y compra mediante descubrimiento.
- Islas de eventos y zonas de proximidad.
- Minimapa ampliable y reposicionable.
- Drift, estela y navegación táctil.
- Restos, cofres, delfín y remolino.
- Circuito con boosts, tres obstáculos y atajo.
- Logros, puntos, cosméticos y ranking.
- Carta de Navegación, artistas y botellas.
- Home integrada físicamente con el mundo.
- Admin, triggers configurables, spawn y temporadas.
- Separación motor/datos/assets.
Los inventarios y casillas de los apartados 28 a 38 son seguimiento editorial, no nuevas condiciones para iniciar el Prompt 1. Las preguntas del Carnet, acceso por email, economía separada y alcance del Admin ya están definidos. Las decisiones de diseño y balance pueden avanzar bajo la autonomía de 49.18; los contenidos reales, integraciones y publicación requieren su comprobación y aprobación correspondiente.

# 28 Inventario de decisiones y aprobaciones
- Dirección artística exacta: referencias, nivel de detalle, línea, textura, proporciones y tratamiento de personajes.
- Diseño definitivo del barco y sus variantes.
- Diseño definitivo de Boya Fiestera y personajes.
- Paleta final BOIA y reglas de uso del azul marino/naranja.
- Mapa definitivo y número/nombres de islas de lanzamiento.
- Preguntas del Carnet: cinco iniciales cerradas en 44.1; cambios posteriores desde Admin con versión.
- Economía: separación cerrada entre puntos y monedas; aprobar cantidades, precios y recompensas iniciales.
- Temporadas: conservar identidad, sellos, cosméticos y puntos históricos; versionar misión, descubrimientos y ranking de temporada.
- Login e invitados: enlace de email y política de progreso validado de 49.10; Admin con segundo factor.
- Integración concreta con ticketera y tienda.
- Moderación de contenido social.
- Lista definitiva de logros de lanzamiento.

# 29 Prompt inicial sustituido
El prompt único de esta sección queda sustituido por los tres prompts definitivos de la sección 50. Se conserva esta referencia para entender el historial de la especificación.

# 30 Checklist de revisión conceptual
- ¿Se puede comprar una entrada en pocos pasos sin jugar?
- ¿Explorar hace más atractivo descubrir/comprar el evento?
- ¿La misión principal se entiende sin HUD permanente?
- ¿El mar tiene razones para volver a navegar?
- ¿Los Carnets y botellas hacen que el mundo parezca habitado?
- ¿El circuito es comprensible y rejugable?
- ¿Los puntos tienen un uso claro?
- ¿El menú contiene todo sin ocupar permanentemente la pantalla?
- ¿El minimapa ayuda sin molestar?
- ¿Una nueva temporada puede configurarse sin rehacer el juego?
- ¿Un admin puede cambiar spawn, evento prioritario, islas, boyas y logros soportados?
- ¿El arte puede sustituirse sin romper la lógica?
- ¿Todo funciona con prioridad en móvil?
- ¿La experiencia sigue sintiéndose BOIA y no una plantilla genérica?

# 31 Filosofía BOIA y arquitectura de textos
Esta parte debe cerrarse antes de la producción visual definitiva. La filosofía no es un texto decorativo: define la voz, el criterio editorial y la forma en que BOIA se presenta en toda la experiencia.

## 31.1 Qué debemos definir de la filosofía
- Qué es BOIA y por qué existe.
- Qué significa BOIA.PLANET y por qué el universo marítimo forma parte de su identidad.
- Relación con la música: apertura de géneros, curiosidad, mezcla y descubrimiento.
- Qué comunidad quiere construir BOIA y qué papel tienen público y artistas.
- Qué significa “underground” para BOIA sin elitismo ni clichés.
- Cómo conviven fiesta, juego, cultura musical y comunidad.
- Qué diferencia a BOIA de una fiesta convencional.
- Qué valores sí representa BOIA y qué cosas no quiere representar.
- Tono de voz: cercano, reconocible, con humor cuando proceda y sin lenguaje corporativo genérico.

## 31.2 Inventario de textos a escribir y aprobar

| Zona | Qué hay que escribir | Prioridad | Estado |
|---|---|---|---|
| Entrada/carga | Cinemática automática, transición y acceso posterior a idioma y Carnet | CLAVE | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Home hero | Título, frase de posicionamiento, Tickets y Explorar | CLAVE | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Explorar | Promesa de descuentos, eventos y secretos | CLAVE | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Tickets | Evento prioritario y enlace narrativo hacia su isla | CLAVE | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Filosofía | Manifiesto completo + versión breve | CLAVE | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Artistas | Introducción a Personas detrás del sonido + A–Z | MEDIA | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Carnet BOIA | Crear/editar, preguntas, estados vacíos | CLAVE | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Primera boya | Diálogo tutorial completo | CLAVE | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Boya Fiestera | Rescate, reacciones y final de misión | CLAVE | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Náufrago | Diálogo y recompensa/descuento | MEDIA | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Islas/eventos | Llegada, descubrir, explorar, comprar | CLAVE | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Logros | Nombres, descripciones y mensajes | MEDIA | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Circuito | Inicio, atajo, meta y récord | MEDIA | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Botellas | Crear, límite, leer y ver carta | MEDIA | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Tienda | Introducción y microcopy comercial | MEDIA | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Controles/Ajustes | Etiquetas e instrucciones breves | MEDIA | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Errores/estados vacíos | Sin conexión, sin perfil, no disponible, etc. | MEDIA | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |
| Privacidad/moderación | Legal y normas sociales; revisión profesional | CLAVE | ☐ Pendiente  ☐ Borrador  ☐ Aprobado |


## 31.3 Briefing que debe responder BOIA
☐ ¿Qué es BOIA para alguien que nunca ha venido?
☐ ¿Qué queremos que sienta alguien al entrar en BOIA.PLANET?
☐ ¿Qué significa realmente “para los amantes de toda la música”?
☐ ¿Qué valores queremos comunicar y qué clichés queremos evitar?
☐ ¿Cuánto humor/piratería queremos en textos comerciales frente a funcionales?
☐ ¿Cómo llamamos definitivamente a los usuarios/comunidad?
☐ ¿Qué historia real de BOIA merece formar parte del manifiesto?
☐ ¿Qué promesa hacemos al público que podamos mantener en todos los eventos?

# 32 Producción desde cero plan paso a paso

| ✓ | Fase | Qué se hace | Responsable | Prioridad |
|---|---|---|---|---|
| ☐ | 0. Alcance vigente | Documento v14 y límites de lanzamiento; registrar decisiones pendientes reales | TÚ + IA | CLAVE |
| ☐ | 1. Prompt 1 | Análisis, arquitectura, contratos de mapa y assets, datos, permisos y pruebas | Work/IA + aprobación | CLAVE |
| ☐ | 2. Inventario | Contenido disponible, muestras, responsables y pendientes comerciales | TÚ + IA | CLAVE |
| ☐ | 3. Preparación visual | Referencias y guía provisional; no exige mapa ni ilustraciones finales | TÚ + IA | CLAVE |
| ☐ | 4. Prompt 2 datos | Repositorio, autenticación, progreso validado, contratos y migraciones | Work/IA | CLAVE |
| ☐ | 5. Prompt 2 Admin | Editor, bloques, perfiles, logros, encuestas, mensajes y publicación | Work/IA | CLAVE |
| ☐ | 6. Mapa técnico | Escena de prueba para validar motor y editor; sin entrega piloto independiente | Work/IA | CLAVE |
| ☐ | 7. Cierre del mapa | Prompt 3: diseñar y revisar boceto, destinos y rutas | TÚ + IA | CLAVE |
| ☐ | 8. Prompt 3 integración | Experiencia pública completa, escenas comerciales y sistemas compartidos | Work/IA | CLAVE |
| ☐ | 9. Arte y mundo | Producir assets, poblar mapa, ajustar distancias, agua, barco y orientación | Work/IA + aprobación | CLAVE |
| ☐ | 10. Aventura | Rescate, circuito, mar vivo, logros y Vigilancia del faro y Cañón contra tiburones | Work/IA | MEDIA |
| ☐ | 11. Comunidad | Carnets, botellas, encuestas, avisos, registro contextual y moderación | Work/IA | MEDIA |
| ☐ | 12. Integraciones reales | Activar tickets y tienda; aprobar textos, fotos, música y promociones | TÚ + Work/IA | MEDIA |
| ☐ | 13. QA y lanzamiento | Pruebas reales, tiempos, permisos, backups y autorización de publicación | TÚ + Work/IA | CLAVE |
| ☐ | 14. Carga final | Sustituir muestras por contenido aprobado y comprobar fechas y enlaces | TÚ + Work/IA | CLAVE |
| ☐ | 15. Publicación | Publicar con autorización y entregar accesos privados y manuales | TÚ + Work/IA | CLAVE |
| ☐ | 16. Operación | Gestionar eventos, avisos, encuestas y ampliaciones desde Admin | TÚ/equipo | MEDIA |


# 33 Checklist imprimible lo que BOIA debe aportar
CLAVE = bloquea o condiciona una parte importante del producto. IA puede proponer o producir, pero identidad, negocio y aprobación final siguen siendo de BOIA.

| ✓ | Necesidad | Área | Prioridad | Quién decide/aporta | IA puede |
|---|---|---|---|---|---|
| ☐ | Definición de BOIA en 1–3 frases | Identidad | CLAVE | TÚ | Redactar opciones |
| ☐ | Historia/origen de BOIA | Identidad | CLAVE | TÚ | Estructurar |
| ☐ | Valores y anti-valores | Identidad | CLAVE | TÚ | Crear guía de voz |
| ☐ | Tono y nivel de humor/piratería | Identidad | CLAVE | TÚ | Proponer ejemplos |
| ☐ | Nombre de la comunidad | Identidad | MEDIA | TÚ | Proponer nombres |
| ☐ | Logo y variantes | Marca | CLAVE | TÚ | Adaptar, no sustituir sin aprobar |
| ☐ | Paleta/referencias actuales | Marca | CLAVE | TÚ | Desarrollar sistema |
| ☐ | Tipografías/licencias/preferencias | Marca | MEDIA | TÚ | Proponer alternativas |
| ☐ | Referencias visuales sí/no | Arte | CLAVE | TÚ | Moodboard conceptual |
| ☐ | Diseño final del barco | Arte | CLAVE | TÚ aprueba | Generar propuestas |
| ☐ | Diseño Boya Fiestera | Arte | CLAVE | TÚ aprueba | Generar propuestas |
| ☐ | Temas/diseños de islas | Arte | CLAVE | TÚ decide | Producir propuestas |
| ☐ | Fotos oficiales de artistas | Contenido | CLAVE | TÚ/artistas | Optimizar, no inventar |
| ☐ | Biografías/datos de artistas | Contenido | MEDIA | TÚ/artistas | Editar/redactar |
| ☐ | Lista final artistas/géneros | Contenido | CLAVE | TÚ aprueba | Organizar |
| ☐ | Carteles y datos de eventos | Eventos | CLAVE | TÚ | Adaptar formatos |
| ☐ | URLs/ticketera | Negocio | CLAVE | TÚ | Integrar |
| ☐ | Evento prioritario lanzamiento | Negocio | CLAVE | TÚ | No delegable |
| ☐ | Reglas/valores de descuentos | Negocio | CLAVE | TÚ | Simular opciones |
| ☐ | Productos/precios/fotos/stock | Tienda | CLAVE | TÚ | Organizar |
| ☐ | Preguntas finales de Carta | Social | CLAVE | TÚ aprueba | Proponer |
| ☐ | Lista inicial de logros/puntos | Gameplay | CLAVE | TÚ aprueba | Diseñar/balancear |
| ☐ | Economía de cosméticos | Gameplay | MEDIA | TÚ aprueba | Balancear |
| ☐ | Normas botellas/moderación | Social | CLAVE | TÚ aprueba | Redactar |
| ☐ | Progreso entre temporadas | Producto | CLAVE | TÚ decide | Recomendar |
| ☐ | Idiomas de lanzamiento | Producto | CLAVE | TÚ | Traducir; revisar |
| ☐ | Dominio/hosting/cuentas | Técnico | CLAVE | TÚ | Configurar con autorización |
| ☐ | Privacidad/cookies/términos | Legal | CLAVE | TÚ/profesional | Borrador; revisión profesional |
| ☐ | Móviles reales de prueba | QA | CLAVE | TÚ | Corregir resultados |
| ☐ | Aprobación final publicación | Lanzamiento | CLAVE | TÚ | No delegable |


# 34 Checklist de assets

| ✓ | Asset | Formato conceptual | Origen | Prioridad |
|---|---|---|---|---|
| ☐ | Logo + variantes | SVG/PNG transparente | TÚ | CLAVE |
| ☐ | Iconos/identidad | SVG/PNG | IA/ilustrador + aprobación | MEDIA |
| ☐ | Barco base + orientaciones | Sprites/atlas | IA/ilustrador | CLAVE |
| ☐ | Skins/cosméticos barco | Sprites/capas | IA/ilustrador | MEDIA |
| ☐ | Banderas/accesorios | Sprites/capas | IA/ilustrador | MEDIA |
| ☐ | Estelas | Partículas/texturas | IA/Work | MEDIA |
| ☐ | Mar/agua | Texturas/loops/FX | IA/Work | CLAVE |
| ☐ | Boya Fiestera | Sprites/loops | IA/ilustrador | CLAVE |
| ☐ | Boyas informativas | Sprites/loops | IA/ilustrador | CLAVE |
| ☐ | Islas | WebP/PNG/sprites por capas | IA/ilustrador | CLAVE |
| ☐ | Cocodrilos/delfín/medusa | Sprites/loops | IA/ilustrador | MEDIA |
| ☐ | Rocas/restos/cofres/remolinos | Sprites/FX | IA/ilustrador | MEDIA |
| ☐ | Náufrago/personajes | Sprites/loops | IA/ilustrador | MEDIA |
| ☐ | Fotos artistas | WebP/JPG | TÚ/artistas | CLAVE |
| ☐ | Carteles eventos | WebP/JPG | TÚ | CLAVE |
| ☐ | Fotos eventos | WebP/JPG | TÚ | MEDIA |
| ☐ | Productos tienda | WebP/JPG | TÚ | CLAVE |
| ☐ | SFX: plop/ping/boost/choque/logro | Audio web | IA/licenciado/producción | MEDIA |
| ☐ | Música/ambiente con derechos | Audio web | TÚ/licenciado | MEDIA |


# 35 Barco banderas y cosméticos en 2D
Cambiar una bandera en 2D/2.5D no tiene por qué ser más complicado que cambiar el barco entero. Solo se vuelve complicado si el barco se crea como una única animación cerrada con la bandera dibujada dentro.
- Recomendación: avatar modular por capas/slots: barco base + skin/color + bandera + accesorios + estela + tripulante.
- Cada capa comparte puntos de anclaje y las orientaciones necesarias. Cambiar la bandera sustituye solo su sprite; cambiar el barco sustituye la base.
- Evitar un GIF monolítico para elementos personalizables. Los loops animados sí son adecuados para agua, personajes y decoraciones.
- Si usamos animación frame-by-frame compleja, cada accesorio puede necesitar variantes por orientación/frame. Por eso el número de orientaciones y slots debe decidirse antes de producir assets.

## 35.1 Slots recomendados
- BASE: casco/barco.
- SKIN/COLOR: variante visual.
- BANDERA: sprite independiente anclado al mástil.
- ACCESORIO: proa/mástil/cubierta según slots definidos.
- ESTELA: efecto independiente ligado al movimiento.
- TRIPULANTE: slot temporal para Boya Fiestera u otros personajes.

# 36 Checklist por momento de desarrollo
☐ Documento conceptual revisado y aprobado.
☐ Filosofía consolidada disponible; aprobar manifiesto y copy de publicación antes del lanzamiento.
☐ Textos clave: borradores para desarrollo y aprobación antes de publicación.
☐ Flujos de compra y exploración cerrados.
☐ Alcance de lanzamiento definido por esta versión; Vigilancia del faro y Cañón contra tiburones incluidos en el Prompt 3, y capa social ampliada diferida.
☐ Prompt 3: dirección artística y boceto del mapa documentados para revisión; assets finales producidos y sustituibles según 49.16 a 49.18.
☐ Prompt 2: barco, Boya Fiestera e isla de prueba con contrato de assets definido. No requieren arte final.
☐ Prompt 1: contrato modular de barco, cosméticos y assets aprobado.
☐ Antes de producción: evento prioritario, ticketera y credenciales disponibles. No bloquean el análisis ni pruebas con adaptadores.
☐ Prompt 1: reglas de logros, Carnet y economía definidas; valores iniciales ajustables desde Admin.
☐ Prompt 1: alcance completo del Admin y permisos aprobados según esta especificación.
☐ Assets y contenidos críticos identificados con responsable.

# 37 Filosofía BOIA consolidada
Esta sección incorpora las respuestas del fundador y debe considerarse la base conceptual para redactar el manifiesto y el resto del copy definitivo.

## 37.1 Por qué nace BOIA
BOIA nace en Alicante de una necesidad concreta: encontrar un espacio para propuestas musicales que no encajan fácilmente en una escena de club muy segmentada por géneros y con programaciones que tienden a repetir nombres y fórmulas. BOIA no nace contra el reguetón, el house, el techno ni ningún estilo; nace precisamente porque quiere evitar tener que elegir uno solo.
Su propósito es abrir espacio a nuevos DJs, productores, artistas en directo y proyectos musicales interesantes, tanto emergentes como consolidados, permitiendo que diferentes estilos y energías convivan en un mismo evento.

## 37.2 Dar espacio
La idea central de BOIA puede resumirse en dos palabras: DAR ESPACIO. Espacio a artistas nuevos, propuestas diferentes, proyectos que todavía no tienen circuito y personas que tienen algo interesante que compartir.
A largo plazo, BOIA no quiere limitarse a un único escenario. La ambición es crecer hacia formatos con varios espacios o escenarios simultáneos, capaces de albergar más propuestas a la vez y permitir que el público elija qué descubrir en cada momento.

## 37.3 Más que música
BOIA es un espacio de cultura y encuentro. La música es su eje, pero puede convivir con fotografía, ilustración, fanzines, pequeñas marcas, proyectos independientes, gastronomía, juegos, actividades y otras expresiones creativas. Un proyecto de fotografía puede exponerse o venderse; un fanzine puede presentarse; alguien puede cocinar una paella durante el día o vender hamburguesas por la noche. La regla es que tenga sentido dentro del espíritu del evento.
BOIA busca funcionar como escaparate, plataforma y punto de encuentro, no únicamente como promotor de fiestas.

## 37.4 Relación con la música
BOIA parte de la idea de que una persona no tiene por qué pertenecer a un único género. En un mismo universo pueden convivir house, reguetón, techno, hip hop, cumbia, country, ambient, trance u otros estilos si la propuesta tiene algo interesante que aportar.
La programación debe provocar descubrimiento: que alguien llegue por un artista que conoce y se vaya habiendo descubierto otros proyectos.

## 37.5 Qué significa underground para BOIA
Underground no significa exclusividad, elitismo ni rechazo de lo popular. Para BOIA significa independencia, curiosidad y dar oportunidad a lo que todavía no ocupa el centro. Un proyecto puede ser underground aunque utilice un género popular si aporta una visión propia, nueva o poco representada.
La pregunta no es “¿este género es suficientemente underground?”, sino “¿esta persona o proyecto aporta algo interesante al espacio BOIA?”.

## 37.6 Modelo humano y económico
BOIA no nace con la intención principal de maximizar el beneficio económico del organizador. Busca ser un proyecto lo más autosostenible y equitativo posible. El dinero generado debe permitir cubrir espacio, producción, materiales, logística, comunicación y trabajo organizativo, y después intentar que quienes construyen el evento participen de manera justa en el valor generado.
Esto no implica que todas las personas cobren siempre exactamente lo mismo: un artista profesional puede tener un caché mayor, una actuación puede requerir más producción y el trabajo de organización también debe poder remunerarse. La filosofía, sin embargo, es clara: BOIA intenta crecer con sus artistas, no crecer a costa de ellos.

## 37.7 La emoción central pertenecer
BOIA no quiere tener simplemente público; quiere crear miembros de una comunidad. Al entrar en un evento, una persona debería sentir que forma parte de BOIA, no que está consumiendo una experiencia desde fuera.
La distancia entre artista, público y organización debe ser reducida. Se puede escuchar a un artista, hablar con él, bailar a su lado, coincidir comiendo o compartir una conversación. El objetivo es un espacio de buen rollo, cercanía y participación.
Idea central de marca: “No vienes simplemente a BOIA. Formas parte de BOIA.”

## 37.8 All Day BOIA
Los All Day BOIA representan la experiencia más completa del proyecto y, dentro de BOIA.PLANET, pueden corresponder a las grandes islas. Son eventos de día completo que deben evolucionar con el paso de las horas y ofrecer música, comida, actividades, juegos, proyectos culturales, encuentros y situaciones inesperadas, además del baile.
La promesa no es que cada evento BOIA tenga siempre la misma escala, sino que un All Day BOIA nunca debería sentirse como “otra fiesta de techno”, “otra fiesta de reguetón” o cualquier otra noche convencional de género único. Una persona debería poder pasar el día descubriendo cosas.

## 37.9 Qué debe decir alguien al salir
El objetivo no es que una persona diga “he ido a una fiesta de techno”, sino “he estado en BOIA”. Ese nombre debe representar una experiencia propia: música, personas, descubrimientos, comida, actividades y situaciones que no habría vivido en una fiesta convencional.

## 37.10 Tres verbos de marca
- DAR ESPACIO — a artistas, proyectos, ideas y personas.
- DESCUBRIR — música, cultura, personas y cosas que no esperabas.
- PERTENECER — sentir que formas parte de una comunidad, no que eres un espectador externo.

## 37.11 Frases de trabajo para la identidad
- BOIA nace para dar espacio a lo que merece ser descubierto.
- No vienes simplemente a BOIA. Formas parte de BOIA.
- Ven por la música. Quédate por todo lo que ocurre alrededor.
- Música sin un único género. Cultura sin un único formato.

## 37.12 Implicación para BOIA PLANET Carnet BOIA
BOIA.PLANET debe traducir digitalmente la sensación de pertenencia. El usuario no debería sentir que tiene una simple cuenta, sino una identidad dentro de la comunidad. Se propone el concepto CARNET BOIA como contenedor de identidad, y dentro de él la Carta de Navegación como perfil personal/social.
- Apodo e imagen/avatar.
- Preguntas y respuestas públicas del Carnet BOIA, como capa expresiva/personal de la identidad.
- Eventos BOIA a los que ha asistido, cuando sea técnicamente viable y deseado.
- Logros, puntos y cosméticos.
- Barco personalizado.
- Posible indicación “Miembro de BOIA desde…”.
- El carnet comunica pertenencia, no estatus VIP ni exclusividad.

## 37.13 Traducción física digital
La misma regla debe existir en el evento y en BOIA.PLANET: BOIA recompensa la curiosidad. En el evento físico, caminas, ves algo extraño, te acercas y descubres. En BOIA.PLANET, navegas, ves algo extraño, te desvías y descubres. Esta equivalencia debe guiar el diseño de ambas experiencias.

# 38 Hitos de definición registro de trabajo
NOTA DE ESTADO: esta sección conserva el histórico de decisiones que estaban pendientes en ese momento. Los estados vigentes y decisiones cerradas están en las secciones 39–50 y prevalecen sobre este registro. Las peticiones de información que siguen son históricas y no se repiten si ya están resueltas.
El concepto general ya está suficientemente definido como para pasar a la siguiente capa: convertir la filosofía en contenido real de la web. El siguiente trabajo no es todavía producir assets ni programar. Primero debemos cerrar voz, textos, formatos de evento e identidad del usuario.

| ✓ | Orden | Bloque | Qué necesito de ti | Quién lo resuelve | Prioridad |
|---|---|---|---|---|---|
| ☐ | 1 | Nombre definitivo de la comunidad | ¿Cómo llamamos a una persona que forma parte de BOIA? ¿Miembro BOIA, navegante, tripulante, otro? | TÚ | CLAVE |
| ☐ | 2 | Carnet BOIA | Decidir nombre, qué información muestra, cuándo se obtiene y diferencia exacta respecto a Carta de Navegación. | TÚ + IA | CLAVE |
| ☐ | 3 | Tipos de evento | Enumerar formatos BOIA actuales y futuros: All Day BOIA, House Parties, colaboraciones, noches especiales, etc.; qué promete cada uno. | TÚ | CLAVE |
| ☐ | 4 | Historia real | Año/edición de nacimiento, contexto y hitos que sí quieras contar públicamente. | TÚ | MEDIA |
| ☐ | 5 | Manifiesto | Con las respuestas anteriores, redactar versión corta, media y completa de Filosofía. | IA redacta / TÚ apruebas | CLAVE |
| ☐ | 6 | Home | Aprobar titular, subtítulo, frase de marca y CTAs reales. | IA propone / TÚ apruebas | CLAVE |
| ☐ | 7 | Textos del universo | Tutorial, Boya Fiestera, náufrago, islas, logros, circuito, botellas. | IA redacta / TÚ apruebas | CLAVE |
| ☐ | 8 | Carnet BOIA | Preguntas definitivas que responderá cada persona y qué será público. | TÚ + IA | CLAVE |
| ☐ | 9 | Comunidad y moderación | Qué puede escribir un usuario, normas de convivencia y qué se puede reportar/eliminar. | TÚ + IA | CLAVE |
| ☐ | 10 | Contenido comercial | Qué información debe tener cada evento, descuento y producto; integración con ticketera. | TÚ | CLAVE |
| ☐ | 11 | Dirección artística | Para cerrar el arte de lanzamiento: referencias, barco, mar, islas, personajes, UI y animación. | TÚ + IA | SIGUIENTE FASE |


## 38.1 Lo siguiente que te pediría ahora
Para avanzar con el menor número de decisiones abiertas, el siguiente bloque debería ser “TIPOS DE EVENTO + CARNET BOIA”. Son dos piezas que afectan a la estructura de BOIA.PLANET y todavía no están cerradas del todo.
☐ Enumérame todos los tipos de evento BOIA que existen o quieres que existan, aunque algunos sean futuros.
☐ Para cada tipo, dime duración aproximada, qué lo diferencia y qué puede esperar una persona.
☐ Dime si te gusta definitivamente el nombre “Carnet BOIA” o si quieres explorar otros nombres.
☐ Decide cuándo una persona “se convierte” en miembro: al crear perfil, al comprar entrada, al asistir a una fiesta, al escanear algo en el evento o de otra forma.
☐ Dime qué datos/recuerdos te gustaría que acumulase ese carnet con el tiempo.
Después de cerrar esas respuestas, podremos redactar todo el copy real de la web y marcar en el checklist del documento qué textos quedan aprobados. El arte de lanzamiento se aprueba antes de publicarse; los prompts 1 y 2 no dependen de tener todo el copy y el mapa terminados.

# 39 Tipos de evento BOIA y función dentro del proyecto
La estructura de eventos queda organizada alrededor de un formato principal y una serie de activaciones secundarias. No todos los eventos deben prometer la misma escala ni la misma experiencia.

## 39.1 ALL DAY BOIA formato principal
- Es el evento principal de BOIA y el destino de la mayor parte del trabajo promocional.
- Es la experiencia BOIA más completa: día + noche, música diversa, artistas emergentes y consolidados, actividades, cultura, gastronomía, relaciones y descubrimiento.
- Debe intentar que durante el día ocurran cosas que no sucederían en una fiesta convencional.
- A largo plazo puede crecer hacia varios escenarios o espacios simultáneos para dar cabida a más propuestas.
- En BOIA.PLANET, los All Day BOIA son las grandes “islas” del universo y los principales destinos comerciales de venta de entradas.
- La comunicación, el contenido y las activaciones previas deben ayudar a crear deseo y contexto para el siguiente All Day BOIA.

## 39.2 Activaciones promocionales satélites
- Entre All Day BOIA pueden realizarse eventos más pequeños, normalmente gratuitos o de bajo coste, cuyo objetivo principal es generar comunidad, contenido, visibilidad y movimiento alrededor de la marca.
- No son el producto principal ni necesitan convertirse en formatos fijos obligatorios.
- Pueden incluir house parties, fiestas previas, colaboraciones con clubs, sesiones de house, eventos matinales en cafeterías, activaciones con clubs de runners u otras ideas que encajen con BOIA.
- Su función estratégica es mantener BOIA activo entre ediciones y alimentar la promoción del siguiente All Day BOIA.
- BOIA.PLANET debe permitir registrarlos como eventos secundarios sin otorgarles necesariamente una isla principal o el mismo tratamiento visual que un All Day.

## 39.3 Regla de producto
ALL DAY BOIA = producto cultural principal.Activaciones satélite = herramientas de comunidad, contenido y promoción que conducen hacia el siguiente All Day BOIA.

# 40 Carnet BOIA identidad digital y pertenencia
El antiguo concepto de pasaporte/perfil y la Carta de Navegación se unifican bajo una identidad más clara: el CARNET BOIA. Se crea obligatoriamente online al crear una cuenta en BOIA.PLANET y simboliza que esa persona ya forma parte de BOIA.

## 40.1 Versión esencial del Carnet
- Apodo/nombre de usuario y foto/avatar.
- Fecha “Miembro de BOIA desde…”.
- Un pequeño conjunto de preguntas musicales/personales fáciles de completar.
- Carta de Navegación integrada como la cara expresiva/personal del Carnet, no como un sistema separado.
- Puntos, logros y barco/cosméticos asociados a la cuenta.
- Diseño rápido de consultar y rápido de crear: la dimensión social ampliada nunca debe complicar el alta inicial.

## 40.2 Evolución opcional mini página personal
- Historial de eventos BOIA vinculados al usuario mediante compra de entrada y, cuando proceda, mediante activación/check-in con QR.
- No incluir listas de artistas vistos ni valoraciones públicas en el Carnet. Las encuestas privadas y voluntarias de organización quedan incluidas según 49.8.
- Hasta 6 fotos personales por evento BOIA, vinculadas a ese evento dentro del Carnet.
- Mini blog / espacio de texto libre: preparar la arquitectura para una fase futura, pero NO incluirlo en la primera versión definitiva.
- El objetivo no es convertir BOIA.PLANET en una red social generalista: estas funciones son secundarias y deben mantener límites claros de contenido, almacenamiento y moderación.

## 40.3 Pertenencia y nombre de la comunidad
- La denominación formal y universal puede ser “miembro de BOIA”.
- “Bolleros” es un apodo interno y humorístico que puede utilizarse puntualmente en copy, logros o mensajes con tono cómplice.
- No debería sustituir siempre a “miembro de BOIA”, para que la experiencia siga siendo comprensible para quien llega por primera vez y para evitar que una broma interna se convierta en barrera de entrada.
- El Carnet debe transmitir pertenencia, no jerarquía ni estatus VIP.

# 41 Decisiones ya cerradas y siguiente información necesaria

| ✓ | Tema | Decisión / pendiente | Estado |
|---|---|---|---|
| ☑ | Formato principal | All Day BOIA | CERRADO |
| ☑ | Eventos secundarios | Activaciones promocionales flexibles | CERRADO |
| ☑ | Alta como miembro | Al crear cuenta en BOIA.PLANET | CERRADO |
| ☑ | Perfil/pasaporte | Se unifican como Carnet BOIA | CERRADO |
| ☑ | Núcleo del Carnet | Fecha + preguntas + identidad + progreso | CERRADO |
| ☑ | Capa social ampliada | Mini página opcional, limitada | DIRECCIÓN CERRADA |
| ☑ | Nombre formal comunidad | Miembros de BOIA | CERRADO |
| ☑ | Apodo informal | Bolleros, uso humorístico puntual | CERRADO |
| ☑ | Preguntas exactas del Carnet | Cinco preguntas públicas seleccionadas | CERRADO |
| ☐ | Qué cuenta como “asistido” | QR / ticket / check-in / manual | SIGUIENTE |
| ☐ | Valoraciones de artistas | No se incluyen valoraciones | CERRADO |
| ☐ | Fotos personales | Cantidad, privacidad y moderación | SIGUIENTE |
| ☐ | Mini blog | Preparado para una fase posterior | DIFERIDO |
| ☐ | Textos definitivos | Home, manifiesto, onboarding, etc. | DESPUÉS |


## 41.1 Estado actualizado del bloque
Este bloque ya está resuelto y no debe tratarse como una lista de pendientes.
- Cinco preguntas públicas del Carnet seleccionadas.
- Sello de evento automático al comprar con cuenta + QR alternativo para casos especiales.
- Sin listas de artistas vistos ni valoraciones públicas en el Carnet; encuestas privadas sí incluidas.
- Máximo 6 fotos por evento dentro de la futura capa personal.
- Mini-blog diferido; arquitectura preparada para una fase posterior.
- “Bollero” confirmado como término social/comunitario interno; sin mensajería privada.

# 42 Carnet BOIA decisiones cerradas

## 42.1 Cómo se obtiene y qué significa
- El Carnet BOIA se crea al registrarse en BOIA.PLANET. Crear la cuenta equivale a convertirse digitalmente en miembro de BOIA.
- Debe seguir siendo rápido y sencillo: identidad, fecha de alta y unas pocas preguntas personales/musicales. Las funciones sociales ampliadas son secundarias.
- El concepto de pasaporte, perfil y Carta de Navegación queda unificado dentro del Carnet BOIA.

## 42.2 Sellos de eventos
- Cuando una entrada se compra vinculada a una cuenta BOIA, el evento se registra automáticamente en el Carnet como sello/evento asociado.
- Debe existir también una vía mediante QR para activar el sello del evento cuando sea necesario: por ejemplo, entradas compradas de otra forma, invitaciones, incidencias o activaciones presenciales.
- El QR no debe convertirse en una acción obligatoria para todo el mundo si la compra ya permite registrar el evento automáticamente.
- El diseño del sello debe transmitir recuerdo y colección de experiencias, no simplemente una fila de transacciones.

## 42.3 Qué NO incluimos en la primera versión
- No habrá lista pública de artistas que he visto en el Carnet; una encuesta privada puede preguntar por ello.
- No habrá valoraciones públicas ni puntuaciones de artistas en Carnets. Las encuestas voluntarias privadas de organización sí pueden preguntar por la experiencia, artistas escuchados, favoritos y sugerencias.
- El mini blog / texto libre no se implementará inicialmente. La arquitectura puede dejar previsto un módulo futuro sin exponerlo todavía al usuario.

## 42.4 Fotos personales
- Cada miembro podrá asociar como máximo 6 fotos personales a cada evento BOIA registrado en su Carnet.
- La función debe sentirse como memoria personal del evento y aportar personalidad tipo pequeña página personal, sin intentar competir con una red social.
- Decisión posterior: la futura capa de fotos/publicaciones debe permitir al usuario configurar su visibilidad, como mínimo pública o privada, y podrá ampliar scopes si se considera útil.

## 42.5 Estado actual del Carnet

| Estado | Decisión | Situación |
|---|---|---|
| ☑ | Carnet creado al registrarse | CERRADO |
| ☑ | Fecha «Miembro de BOIA desde…» | CERRADO |
| ☑ | Evento añadido automáticamente al comprar entrada vinculada | CERRADO |
| ☑ | QR alternativo para activar sello | CERRADO |
| ☑ | Máximo 6 fotos por evento | CERRADO |
| ☑ | Sin “artistas vistos” | CERRADO |
| ☑ | Sin valoraciones de artistas | CERRADO |
| ☑ | Mini blog preparado pero pospuesto | CERRADO |
| ☑ | Preguntas exactas del Carnet | Cinco preguntas públicas seleccionadas |
| ☑ | Visibilidad de las fotos | Configurable por usuario; mínimo pública/privada |


# 43 Estado del Carnet tras la definición
El núcleo funcional del Carnet BOIA está cerrado para la especificación: identidad, fecha de alta, cinco preguntas públicas, sellos de eventos, puntos/logros/barco y acceso social desde ranking, artistas y botellas.
La capa personal ampliada (hasta 6 fotos por evento y mini-blog) queda preparada para una fase posterior con privacidad configurable.
El contenido editorial y el arte de lanzamiento se aprueban antes de publicarse. Los prompts 1 y 2 pueden avanzar con contenido y mapa de prueba; el mapa de lanzamiento se desarrolla y revisa durante el Prompt 3 conforme a 49.14 y 49.18.

# 44 Carnet BOIA preguntas y relaciones sociales

## 44.1 Preguntas públicas seleccionadas
El Carnet BOIA utilizará inicialmente cinco preguntas personales relacionadas con la música, el arte y las experiencias culturales. Sus respuestas forman parte de la capa pública del Carnet y deben ayudar a conocer a la persona sin convertir el perfil en un test de gustos.
- ¿Cuál ha sido la cosa más rara que has visto pasar en una fiesta o festival?
- ¿Cuál es el mejor descubrimiento musical que hiciste por casualidad?
- ¿Qué obra, fotografía, película, disco o pieza artística te cambió un poco la cabeza?
- ¿Cuál es tu mejor recuerdo relacionado con la música?
- Completa la frase: una buena fiesta necesita siempre…

## 44.2 Relaciones entre miembros bolleros
La palabra “bollero” se incorpora como lenguaje interno de BOIA para representar, de forma humorística y propia, a otros miembros con los que una persona conecta dentro de BOIA.PLANET.
- La denominación formal general sigue siendo “miembro de BOIA”.
- “Bollero” puede utilizarse como término de comunidad y como nombre de la relación social entre miembros.
- Una sección del Carnet puede mostrar “Mis bolleros” o “Bolleros”, siempre que la interfaz deje claro su significado a usuarios nuevos.
- La relación no debe denominarse “tripulación” ni depender de terminología pirata genérica; se prioriza lenguaje propio nacido de la cultura interna de BOIA.
- No habrá mensajería privada entre miembros en la primera versión ni se considera necesaria como dirección principal del producto.

## 44.3 Comunicación social
- La mecánica social de mensaje abierto se concentra en los mensajes en botella del mar.
- Las botellas funcionan como mensajes breves para cualquiera que las encuentre, en vez de como sistema de mensajes directos.
- La ausencia de DM es deliberada: BOIA.PLANET no pretende convertirse en una red social generalista.

## 44.4 Fotos y futura capa personal
- Las respuestas esenciales del Carnet son públicas.
- La futura capa tipo mini página personal / blog podrá incluir hasta 6 fotos por evento.
- La visibilidad de publicaciones y fotos de esa capa ampliada deberá poder configurarse por el usuario (por ejemplo, pública o privada).
- El mini blog y esta capa social ampliada se dejan preparados en arquitectura, pero no forman parte del núcleo de la primera versión.

## 44.5 Estado
☑ Cinco preguntas iniciales seleccionadas.
☑ “Bollero” incorporado como término social/comunitario interno.
☑ Sin mensajería privada.
☑ Botellas mantienen la función de mensaje abierto en el mundo.
☑ Fotos/blog se reservan para una capa posterior con control de privacidad.

# 45 Auditoría de cobertura piloto documento maestro definitivo
Objetivo de esta auditoría. Se ha comparado la iteración completa del piloto con este Documento Maestro para garantizar que ninguna decisión funcional probada o solicitada en el piloto se pierda al reconstruir BOIA.PLANET desde cero. Las decisiones de esta sección son requisitos del producto definitivo, salvo que una sección posterior las sustituya explícitamente.

| Piloto | Requisito | Sección maestro | Estado | Observación |
|---|---|---|---|---|
| 1 | Home — CTA principal | 4.2 / 2.1 | INTEGRADO | Añadir especificación exacta de tamaño aproximado x2 y animación sutil. |
| 2 | Integración Home ↔ mundo | 4.3 / 26 | INTEGRADO | Teletransportes contextuales y permanencia del barco tras cerrar panel. |
| 3 | Tickets → isla del evento | 5 | INTEGRADO | Enlace de “sorpresas en su isla” + brújula/minimapa. |
| 4 | Personas detrás del sonido | 18 | INTEGRADO | 3 artistas, ~5 s, rotación equilibrada, sin duplicados y A–Z. |
| 5 | Descubrimientos temporales | 14 | INTEGRADO | Notificaciones ~3–4 s, sonido y cola; sin tarjeta fija. |
| 6 | Misiones = Logros/Progreso | 14 | INTEGRADO | Qué tengo / qué me falta + recompensas. |
| 7 | Primera boya / tutorial orgánico | 7 / 10 | INTEGRADO | Bocadillos, plop, sin modal, ~1,5 s por mensaje y salto manual; pulso del minimapa y del ancla. |
| 8 | Islas por proximidad | 9 | INTEGRADO | Puerto decorativo; no obligatorio. |
| 9 | Minimapa | 10 | INTEGRADO | 25–35 % menor, toque, pulsación larga, drag, snap y persistencia. |
| 10–13 | Boya Fiestera: misión completa | 8 | INTEGRADO | Encuentro, cocodrilos, rescate, a bordo, entrega y mundo abierto. |
| 14 | Restos / flotsam | 11.1 | INTEGRADO | Recogida automática, regeneración y progresión repetible. |
| 15 | Mar vivo | 11.2–11.5 | INTEGRADO | Cofres, delfín, remolino; ideas musicales en reserva. |
| 16–19 | Circuito | 13 | INTEGRADO | Cronómetro muy pequeño arriba, ranking, boosts ~2 s, 3 obstáculos y ruta/atajo. |
| 20 | Botellas | 17 / 44.3 | INTEGRADO | 140 caracteres, 1 aprox./usuario, sin puntos ni DM, acceso al Carnet. |
| 21–23 | Carnet BOIA | 16 / 40 / 42 / 44 | INTEGRADO | Unifica perfil/pasaporte; preguntas visibles y seleccionadas. |
| 24–27 | Menú / iconos / ajustes / Welcome | 19 / 20 | INTEGRADO | Iconos claros, Mi Carnet, audio separado y ayuda consultable. |
| 28 | Reglas UX | 25 | INTEGRADO | Menos HUD/modales, proximidad, feedback, mobile y conversión. |
| 29 | Flujo principal | 26 | INTEGRADO | Se refuerza con todos los encuentros secundarios del piloto. |
| 30 | Forma de trabajo | 29 / 32 | INTEGRADO | Auditoría, sistemas base, integración técnica inicial, pruebas y progresividad. |
| 31 | Artistas A–Z | 18.1 | INTEGRADO | Lista provisional de 26 artistas y géneros. |
| 32 | Filosofía BOIA | 37 / 39 | INTEGRADO | Dar espacio · Descubrir · Pertenecer; All Day como formato principal. |
| 33 | Sellos del Carnet | 42.2 | INTEGRADO | Compra vinculada automática + QR alternativo. |
| 34 | Bolleros / lenguaje social | 44.2–44.3 | INTEGRADO | Sin DM; botellas como comunicación abierta. |
| 35 | Límites del piloto | — | NO APLICA A FINAL | Las limitaciones de no rehacer/2D/Admin eran solo del piloto; la versión final sí contempla reconstrucción 2D/2.5D y Admin. |
| 36 | Orden de prioridad | 32 | INTEGRADO | El plan definitivo amplía y ordena las fases. |


# 46 Ajustes exactos incorporados tras la auditoría
- Home / CTA: EXPLORAR EL UNIVERSO debe ser aproximadamente el doble de prominente que en el prototipo revisado y puede utilizar una animación sutil. El subtítulo sobre descuentos depende de promociones vigentes según 4.4. Tickets permanece siempre claramente accesible.
- Tutorial / feedback: Cuando la primera boya explique el Menú de a bordo, el icono del ancla debe pulsar brevemente. Cuando explique el minimapa, el minimapa debe pulsar durante aproximadamente 1–2 segundos para señalarlo sin abrirlo.
- Notificaciones: Los descubrimientos y logros usan avisos temporales de aproximadamente 3–4 segundos. Si se producen varios, se encolan: nunca deben cubrir la pantalla simultáneamente.
- Islas: La activación se basa en un RADIO DE PROXIMIDAD amplio. El puerto puede existir como elemento gráfico/narrativo, pero nunca como requisito técnico para entrar.
- Welcome Aboard: Debe ser una sección consultable del Menú de a bordo. El tutorial no la abre automáticamente; el mundo enseña primero y el menú sirve para volver a consultar.
- Carnet en la navegación: La opción superior del Menú de a bordo se denomina “Mi Carnet”, no “Mi Carta”. Carta de Navegación queda absorbida conceptualmente dentro del Carnet BOIA.
- Botellas: Al leer una botella, la acción social relevante es “VER SU CARNET”. No existe mensajería privada; la comunicación espontánea del mundo se concentra en las botellas públicas.
- Bolleros: “Miembro de BOIA” sigue siendo el término formal. “Bollero” es lenguaje interno/humorístico y puede aparecer en zonas sociales e informales. No usar “tripulación” como etiqueta para las relaciones entre usuarios.
- Flujo principal: El recorrido de aventura debe contemplar explícitamente que, entre rescate y entrega de la Boya Fiestera, el usuario pueda descubrir islas, eventos, descuentos, restos, cofres, delfín, remolinos, botellas, secretos y circuito sin romper el hilo principal.
- Circuito: Las banderas/checkpoints provocan WHOOSH + boost fuerte de unos 2 segundos; solo hay cocodrilo, roca y medusa como obstáculos; ruta normal y atajo se reúnen antes de meta.
- Carnet / sellos: La compra de una entrada vinculada a la cuenta añade automáticamente su sello/registro al Carnet. El QR es una vía alternativa para entradas externas, invitaciones o incidencias, no una obligación adicional.
- Carnet / contenido: No incluir listas de artistas vistos ni valoraciones públicas. Las encuestas privadas de experiencia son un sistema independiente incluido. La futura capa personal podrá incluir hasta 6 fotos por evento y mini-blog con privacidad configurable; no es el núcleo de la primera versión.

# 47 Requisito de trazabilidad para el nuevo Work
Antes de comenzar la reconstrucción definitiva, Work debe tratar las secciones 45 y 46 como control de cobertura. Durante el plan técnico inicial debe comprobar que cada requisito del piloto marcado como INTEGRADO tiene un sistema o componente equivalente en la arquitectura nueva. Ninguna mejora puede desaparecer por el cambio de motor visual, de estructura técnica o de nombre. Si una solución se modifica, debe conservar el comportamiento/objetivo UX o señalar explícitamente la desviación antes de implementarla.
☐ CTA Explorar prominente + Tickets directo.
☐ Home y mundo conectados físicamente.
☐ Artistas rotativos + A–Z completo.
☐ Tutorial por boya y bocadillos; sin modal.
☐ Islas por proximidad y minimapa manipulable.
☐ Misión Boya Fiestera completa.
☐ Mar vivo con progresión repetible.
☐ Circuito con boost, 3 obstáculos y atajo.
☐ Carnet BOIA + 5 preguntas + sellos.
☐ Botellas públicas, sin DM.
☐ Bolleros como lenguaje interno.
☐ Logros/notificaciones sin HUD permanente.

# AJUSTES DE PACING Y VISIBILIDAD VALIDADOS EN PILOTO
Estos valores sustituyen cualquier cifra o comportamiento anterior que entre en conflicto con ellos y deben mantenerse en la versión definitiva:
- ARTISTAS EN HOME: los tres artistas visibles rotan aproximadamente cada 5 segundos, no cada 3 segundos.
- BOYAS Y DIÁLOGOS: los bocadillos/mensajes breves avanzan aproximadamente cada 1,5 segundos para dar más ritmo a la experiencia.
- SALTO DE DIÁLOGOS: el usuario puede tocar para avanzar o saltar una conversación; no se le obliga a esperar.
- CRONÓMETRO DEL CIRCUITO: durante la carrera debe ser muy pequeño, discreto y estar arriba, dejando libre el trazado y la mayor parte posible del mundo.
- No usar overlays grandes durante la conducción salvo que sean estrictamente necesarios para una acción puntual.

# DECISIÓN FINAL ENTRADA AUTOMÁTICA A BOIA PLANET
Esta decisión SUSTITUYE cualquier versión anterior que plantee una pantalla inicial separada para elegir idioma, hacer login o pulsar “continuar”.
- 1. Al abrir BOIA.PLANET no se pide ningún clic.
- 2. Se reproduce inmediatamente una cinemática corta y sobria. Preferencia de copy actual: “BOIA.PLANET” centrado; alternativamente puede probarse “Bienvenido a BOIA” durante la fase de copy, pero nunca debe convertirse en un formulario.
- 3. La cinemática avanza automáticamente. La cámara/transición se acerca al universo BOIA y desemboca directamente en la landing principal.
- 4. No debe sentirse como “pantalla 1 → pantalla 2” mediante botones; debe sentirse como una única entrada cinematográfica continua.
- 5. En la landing aparecen inmediatamente la estructura y accesos ya definidos: EXPLORAR EL UNIVERSO como CTA protagonista, Tickets claramente accesible y los accesos a Artistas, Filosofía y Tienda. La página continúa hacia abajo mediante scroll con el resto de contenidos.
- 6. El usuario puede navegar por la landing sin cuenta. Login/registro/Carnet BOIA se ofrecen desde la propia landing o el menú cuando sean necesarios, sin bloquear el acceso inicial.
- 7. El idioma no se selecciona en una pantalla previa. Debe resolverse automáticamente cuando sea viable y quedar siempre modificable desde Ajustes.
- 8. Prioridad UX: cero fricción antes de ver BOIA. La primera acción consciente del usuario debe ocurrir ya dentro de la landing, no en una pantalla de configuración.
- 9. En móvil, esta transición debe ser ligera, rápida y no impedir que la landing sea interactiva inmediatamente al terminar.

# 48 DECISIÓN FINAL MUNDO EDITABLE MEDIANTE OBJETOS MODULARES
La versión definitiva de BOIA.PLANET debe desacoplar la APARIENCIA de un elemento de su COMPORTAMIENTO. Una imagen no debe determinar lo que hace el objeto. El Admin debe poder reutilizar la misma lógica con cualquier asset compatible.

## 48.1 Principio fundamental
- Un cocodrilo no es técnicamente “un cocodrilo que ralentiza”: es un asset visual + una geometría/área + el comportamiento RALENTIZAR AL COLISIONAR.
- Ese mismo comportamiento puede asignarse mañana a una roca, un tronco, una medusa, un bloque de hielo o cualquier PNG/WebP transparente que suba el administrador.
- Una boya no debe estar codificada únicamente como “boya de diálogo”: puede ser un asset visual al que se le asignen proximidad, diálogo, recompensa, logro, teletransporte, apertura de contenido u otros comportamientos soportados.
- Una isla es igualmente un objeto visual colocado en el mundo al que se asocian zona de proximidad, evento, contenido, ticket, estado histórico, fotografías u otras acciones.
- Así, el Admin edita el mundo combinando piezas preprogramadas en vez de modificar código.

## 48.2 Anatomía de cualquier objeto del mundo

| Parte | Qué define |
|---|---|
| 1. Identidad | Nombre interno, categoría, etiquetas, activo/inactivo. |
| 2. Apariencia | PNG/WebP transparente, sprite/loop compatible, escala, rotación, capa/profundidad. |
| 3. Posición | Coordenadas X/Y, orientación y zona permitida. |
| 4. Geometría | Radio de proximidad, hitbox/colisión, zona de activación. |
| 5. Comportamientos | Uno o varios módulos elegidos del catálogo del motor. |
| 6. Parámetros | Duración, intensidad, porcentaje, cooldown, probabilidad, recompensa, etc. |
| 7. Contenido | Texto, bocadillos, imágenes, evento asociado, URL, fotografías, mensaje. |
| 8. Estado | Visible, borrador, publicado, fechas de activación, repetible/una vez. |
| 9. Recompensa/trigger | Monedas, logro, sello, descuento u otro evento del sistema. |


## 48.3 Catálogo inicial de comportamientos reutilizables
- COLISIÓN: bloquear, rebotar, frenar, ralentizar durante X segundos, aplicar impulso/boost, etc.
- PROXIMIDAD: activar cuando el barco entra o sale de un radio.
- DIÁLOGO: secuencia de uno o varios bocadillos; tiempo entre mensajes editable (valor recomendado actual: ~1,5 s), posibilidad de avanzar/saltar y reacción al alejarse.
- RECOGIBLE: desaparecer al tocar/pasar por encima y entregar monedas, puntos, descuento, objeto o logro.
- RECOMPENSA: configurar cantidad/tipo y si se concede una vez, por sesión o de forma repetible.
- EVENTO/CONTENIDO: abrir panel de evento, fotos, tienda, artista, información u otra pantalla ya soportada.
- TICKET: mostrar o dirigir a compra cuando el evento está activo; desaparecer al pasar a estado histórico.
- CHECKPOINT/BOOST: validar paso, registrar circuito o aplicar velocidad durante un tiempo configurable.
- TELETRANSPORTE/DESTINO: mover al usuario a otro punto/experiencia cuando sea una mecánica ya soportada.
- SPAWN/RESPAWN: reglas de aparición, frecuencia, probabilidad y posiciones permitidas.
- LOGRO/TRIGGER: disparar o avanzar una condición del sistema de logros.
- DECORATIVO: elemento sin interacción, con posible loop/animación.

## 48.4 Flujo ideal en el Panel Admin
Ejemplo de creación de un objeto sin tocar código:
- 1. Pulsar “+ AÑADIR OBJETO”.
- 2. Elegir una categoría orientativa: isla, obstáculo, personaje/boya, coleccionable, decoración, checkpoint, etc. La categoría aporta valores por defecto, pero no fija la lógica para siempre.
- 3. Subir/seleccionar el asset PNG/WebP transparente o sprite compatible.
- 4. Colocarlo visualmente en el mapa, ajustar tamaño, rotación y profundidad.
- 5. Definir radio de interacción y/o colisión.
- 6. Añadir uno o varios comportamientos desde una biblioteca.
- 7. Editar sus parámetros: por ejemplo “ralentiza 45 % durante 2 s”, “muestra 4 mensajes cada 1,5 s”, “entrega 20 monedas”, etc.
- 8. Asociar contenido, evento, logro, recompensa o destino si procede.
- 9. Probar en modo PREVISUALIZACIÓN/TEST.
- 10. Guardar como borrador o PUBLICAR.

## 48.5 Ejemplos concretos

| Ejemplo | Configuración |
|---|---|
| Cocodrilo actual | Asset: cocodrilo. Comportamiento: colisión → ralentizar 60 % durante 2 s. Mañana se sustituye el PNG por un tiburón y conserva exactamente la misma función. |
| Tronco / roca | Asset intercambiable. Comportamiento: colisión → frenazo/rebote. Cambiar tronco por roca no requiere tocar la lógica. |
| Boya informativa | Asset de boya elegido por Admin. Proximidad → diálogo. El Admin escribe los mensajes y define ritmo/duración dentro de límites seguros. |
| Boya con premio | Mismo tipo visual o uno diferente. Proximidad/recogida → diálogo + monedas + logro. Puede configurarse como una sola vez. |
| Isla de evento | Asset isométrico transparente. Proximidad → abrir evento. Muestra recuerdos disponibles y entradas del evento vigente. Al terminar, conserva FOTOS/RECUERDO y ofrece entradas para próximos eventos. |
| Cofre | Asset de cofre. Recogible → premio. Spawn temporal/aleatorio. La apariencia puede sustituirse por cualquier otro objeto de recompensa. |


## 48.6 Hasta dónde llega lo no code del Admin
El Admin debe poder combinar libremente los COMPORTAMIENTOS QUE EL MOTOR YA CONOCE. No debe prometer que una persona pueda inventar cualquier mecánica imaginable sin programación.
- Si mañana BOIA quiere un monstruo marino gigante que emerge, persigue al barco, se lo traga y abre un minijuego completamente nuevo, esa primera mecánica requerirá código y assets específicos.
- La nueva mecánica debe implementarse como un módulo reutilizable del motor (por ejemplo: MONSTRUO_MARINO / INICIAR_MINIJUEGO).
- Una vez creada, debe aparecer en la biblioteca del Admin para que futuras instancias puedan colocarse, cambiar de asset y configurarse sin volver a programar la mecánica base.
- Regla: PROGRAMAR UNA MECÁNICA NUEVA UNA VEZ; CONFIGURAR Y REUTILIZAR ESA MECÁNICA MUCHAS VECES DESDE ADMIN.

## 48.7 Plantillas para acelerar la edición
- Permitir guardar/duplicar objetos como plantillas: “Obstáculo lento”, “Boya de diálogo”, “Isla de evento”, “Cofre”, “Boost”, etc.
- Duplicar una plantilla conserva comportamientos y parámetros; el Admin puede cambiar únicamente imagen, posición, texto o valores.
- Esto reduce errores y permite construir nuevas zonas del mapa rápidamente.

## 48.8 Seguridad y validación
- Validar formatos, tamaño y peso de assets antes de publicarlos.
- Limitar parámetros a rangos razonables para evitar objetos imposibles o que bloqueen el mapa.
- Mostrar advertencias si una hitbox, radio o elemento queda fuera del mar/zona válida.
- Mantener borrador, previsualización y publicación para no romper el mundo activo.
- Registrar versión/historial suficiente para poder deshacer cambios importantes.

## 48.9 Consecuencia arquitectónica
BOIA.PLANET debe construirse como un MOTOR DE COMPORTAMIENTOS + EDITOR DE OBJETOS + BIBLIOTECA DE ASSETS. La forma visual de una isla, boya, obstáculo o recompensa no debe quedar pegada a su lógica. Esta separación es un requisito de arquitectura y debe decidirse antes de construir el mundo definitivo.

# 49 Decisiones finales de administracion y eventos
Esta sección incorpora las últimas correcciones y prevalece sobre cualquier instrucción anterior que limite el panel, una isla a un único evento o el sistema de logros a un catálogo fijo.

## 49.1 Logros globales y concesiones masivas
El panel permite crear logros nuevos para todos los usuarios mediante condiciones del catálogo de triggers. Un logro global puede estar disponible desde su publicación o evaluar hechos anteriores cuando su condición sea compatible y se marque como retroactiva.
El propietario y los administradores autorizados también pueden conceder un logro a todas las cuentas o a un segmento. Antes de confirmar se muestra el número de personas afectadas, el premio y la política para cuentas futuras. La operación se procesa por lotes, es idempotente, registra autor y motivo y no duplica puntos o monedas al reintentarse. Una corrección crea una compensación auditada en vez de borrar el historial.

## 49.2 Administracion completa de Carnets
El panel permite buscar, crear y editar Carnets BOIA. Se pueden crear perfiles oficiales de artistas, miembros y colaboradores aunque todavía no tengan una cuenta. Después se vinculan a una identidad verificada mediante una invitación de un solo uso, sin duplicar el perfil.
El propietario y los administradores con permiso específico pueden editar cualquier campo del Carnet, incluidos identidad pública, imagen, respuestas, sellos, logros, puntos, monedas, barco y cosméticos. Las correcciones sensibles requieren motivo y conservan valor anterior, valor nuevo, autor y fecha. Las credenciales, contraseñas y sesiones privadas quedan fuera del editor de perfiles.

## 49.3 Pagina principal editable
La home se compone de bloques gestionados desde Admin. El equipo puede ordenar, traducir, activar, ocultar y programar hero, evento prioritario, próximos eventos, fotos y vídeos, artistas, filosofía, tienda y contacto. Añadir o retirar una tarjeta no exige modificar código ni eliminar su evento.

## 49.4 Eventos historicos sin eliminar islas
Evento e isla son entidades separadas. Una isla puede conservar varios eventos históricos y tener un evento activo nuevo. Finalizar un evento lo retira de la venta en home, Tickets y mundo; la isla permanece y cambia su acción principal a ver cartel, artistas, relato, fotos y vídeos. Un bloque separado ofrece entradas para los próximos eventos vigentes de BOIA.
Cuando Admin vincula a esa isla un nuevo evento publicado y a la venta, la home lo incorpora de nuevo y la isla presenta su compra, manteniendo accesible el archivo anterior. El sistema distingue borrador, próximamente, a la venta, agotado, pospuesto, cancelado y finalizado. Las reglas por fecha se pueden previsualizar y corregir manualmente con auditoría.

| Estado | Home y Tickets | Isla |
|---|---|---|
| Borrador | No visible | Solo en previsualización |
| Próximamente | Visible si se publica; CTA informativo | Información sin compra hasta la apertura |
| A la venta | Visible y comprable | Compra y contenido del evento activo |
| Agotado | Visible como agotado; sin compra inválida | Información vigente y estado agotado; recuerdos anteriores si existen |
| Pospuesto | Mensaje y política definida | Conserva el evento y la actualización |
| Cancelado | Sale de venta; información de cancelación | Recuerdo o aviso según decisión editorial |
| Finalizado | No aparece en próximos ni en compra | Fotos, vídeos, cartel y memoria del evento |


## 49.5 Alcance del trabajo actual
Esta revisión actualiza la especificación y los tres encargos de desarrollo. No ejecuta cambios de la aplicación ni certifica sus funciones. El desarrollo ya iniciado debe continuar sobre su repositorio, con una primera versión jugable como hito de revisión y con los pendientes visibles hasta la validación final.

## 49.6 Accesos comerciales con la isla visible
Tickets, Fotos y Tienda siempre muestran la isla o localización correspondiente y abren automáticamente su panel. No requieren conducir. El panel permite comprar, consultar el catálogo o ver la galería de inmediato; cerrar devuelve al barco en esa localización. No iniciar un checkout externo ni un cobro sin acción explícita. Tickets y demás paneles deben conservar URLs compartibles y navegación Atrás coherente.
Para Tickets general, usar la isla del evento prioritario vigente y mostrar todos los próximos eventos con compra disponible. Cada evento concreto tiene su enlace directo. Si no hay eventos a la venta, mostrar Próximamente; no inventar entradas ni ocultar recuerdos. Un evento sin isla propia usa una localización comercial común configurada en Admin.
Cargar primero el contenido HTML y la representación ligera de la isla, después el sector navegable bajo demanda. La animación es breve y omisible con movimiento reducido. Si el motor no carga, conservar la isla ilustrada y el panel accesible. La equivalencia funcional del modo ligero es obligatoria; no es una página comercial distinta.
Todo acceso por proximidad a una isla ofrece sus fotos, vídeos, cartel y relato disponibles más un bloque Próximos eventos. Priorizar su evento activo y luego el evento prioritario global. Si aún no hay fotos, mostrar un estado honesto de contenido pendiente. Ninguna tarjeta enlaza a tickets de un evento pasado. Los teletransportes no conceden rescate, entrega ni descubrimientos competitivos.

## 49.7 Objetivos de tiempo y destino de la aventura
Objetivo de lanzamiento: aproximadamente un minuto de navegación directa hasta el destino principal, excluyendo carga, lectura y compra; unos diez minutos para explorar el mapa inicial y sus principales sorpresas. No significa obtener todos los logros, cosméticos, compras o recompensas de temporadas futuras. Los logros de veinte minutos siguen siendo objetivos opcionales de retorno.
Medir ambos recorridos con el barco base en móvil y ajustar velocidad, distancias y señales después de navegar. Registrar una ruta directa reproducible y una ruta de exploración de referencia. El mapa puede crecer hacia arriba sin una pared superior permanente; las costas laterales sí colisionan. La zona aún no publicada conduce suavemente de vuelta a aguas navegables, sin mar vacío ilimitado.
La misión guarda un destino explícito por ID y versión de temporada, no la isla de coordenada más alta ni el evento prioritario del día. Una ampliación no cambia misiones empezadas o completadas. Admin decide el destino de nuevas partidas; cambiar el de partidas existentes requiere migración previsualizada y auditada. No permitir publicar una misión con destino inexistente.

## 49.8 Encuestas voluntarias
Incluir encuentros o eventos de encuesta vinculables a boya, objeto del mundo, evento musical o panel. Se anuncian también mediante un icono persistente de botella de misiones, distinto de las botellas sociales de usuarios. La invitación indica para qué se recoge la opinión y siempre ofrece Ahora no. Nunca bloquea navegar, comprar ni conservar progreso.
Admin crea preguntas, opciones, texto libre limitado, idiomas, fechas, audiencia, evento asociado y recompensa opcional. Ejemplos: cómo fue la experiencia, qué artistas escuchaste, cuál te gustó más y a quién te gustaría escuchar después. Estas respuestas son privadas para el equipo; no aparecen en el Carnet ni crean puntuaciones públicas de artistas.
Una respuesta por cuenta y versión de encuesta, con envío idempotente. Invitados pueden responder con sesión anónima; al vincular cuenta se reconcilian duplicados. Su respuesta no genera puntos globales sin validación. Admin consulta resultados agregados y exporta respuestas autorizadas; separar datos de contacto de opinión cuando no sean necesarios. Publicar nueva versión si cambian preguntas después de recibir respuestas.

## 49.9 Panel de mensajes de BOIA
Añadir Mensajes al Menú de a bordo, con icono de campana y contador de no leídos. Es un buzón editorial de BOIA para personas que entran al juego, incluidas invitadas; no es mensajería privada entre usuarios. Las botellas sociales y los avisos de logros siguen siendo sistemas distintos.
Admin crea título, cuerpo, imagen opcional, idioma, enlace o acción compatible, prioridad, audiencia, publicación y caducidad. Permite borrador, vista previa, programación, publicación, retirada y archivo. La audiencia predeterminada es Todos los que entren. Un aviso nuevo genera una señal discreta y opcionalmente un banner una vez; no obliga a leerlo ni interrumpe una carrera.
Guardar leído, descartado y versión por cuenta o sesión invitada. Al registrarse, fusionar esas marcas. Corregir una errata no vuelve a marcar como nuevo; Admin puede publicar una revisión importante que sí lo haga. Caducados desaparecen de no leídos y quedan en archivo según configuración. Sanitizar contenido y validar destinos; no permitir scripts.

## 49.10 Registro contextual y progreso invitado
Ofrecer Crear mi Carnet antes de continuar a comprar, después de cerrar una galería y tras jugar varios minutos o conseguir varios logros. El mensaje explica el beneficio pertinente: guardar recuerdos, asociar la entrada, conservar barco y progreso o unirse a BOIA. La compra conserva una alternativa visible Continuar sin registrarme; tras verificar email vuelve al mismo evento o panel.
Valores iniciales ajustables desde Admin: primera invitación de progreso tras cinco minutos activos o tres logros distintos; separación mínima de tres minutos entre avisos proactivos y máximo tres por sesión. Registrar el motivo para no repetirlo sin nuevo contexto. El acceso voluntario a registro siempre sigue disponible. Nunca mostrar sobre una carrera, un diálogo activo o el pago, y respetar Ahora no.
Invitado guarda localmente preferencias, posición segura, progreso narrativo, descubrimientos y personalización provisional. Cuando exista conexión, usar identidad anónima del servidor para validar recompensas. No importar un saldo local ni un récord como verdad competitiva. Al registrarse, preservar progreso narrativo y sincronizar solo recompensas verificables, una vez por ID.
Si ya existe una cuenta con progreso, mostrar qué se vincula y fusionar por IDs: unión de descubrimientos compatibles, sin sumar premios repetidos. No sobrescribir preferencias o barco sin criterio visible. El avance sin conexión puede conservarse como experiencia local; solo se incorpora a rankings tras validación. Explicar este límite sin prometer recuperación si se borran datos del dispositivo.

## 49.11 Minijuegos integrados y ampliaciones
En el lanzamiento existe una isla Faro visible en mundo y minimapa, visitable y con el minijuego Vigilancia del faro activo. El jugador oscurece la escena, orienta una luz circular hacia barcos que se aproximan y activa una alarma solo cuando identifica correctamente una bandera pirata entre señales parecidas. Debe localizar cinco barcos pirata; los barcos normales han de poder continuar. El faro no es necesario para terminar la misión principal.
El lanzamiento incluye también Cañón contra tiburones como actividad arcade: el jugador orienta un cañón, anticipa la caída de la bola y ahuyenta tres tiburones que emergen, se sumergen y cambian de trayectoria. La representación es caricaturesca y no muestra daño. Ambos juegos utilizan un módulo reutilizable INICIAR_MINIJUEGO, assets sustituibles, configuración desde Admin y recompensas verificadas por servidor. Fotos personales ampliadas, mini blog y relaciones sociales Bolleros permanecen fuera del lanzamiento; el circuito sí se implementa completo.

## 49.12 Promociones sellos e incidencias
Descuentos generales compartibles por evento, con fechas, porcentaje o importe, condiciones, destino y prioridad configurables. Recompensar el descubrimiento una sola vez aunque se vuelva a copiar. Mantener disponibles los códigos encontrados y ocultar o marcar caducados cuando corresponda.
Configurar un pack de primera compra y la promoción de WhatsApp de pegatina gratis con compra de un producto. Especificar desde Admin productos elegibles, stock, límite por cliente, compatibilidad con otros códigos y método real de verificación. Abrir WhatsApp no demuestra una suscripción; si no existe verificación, presentar la promoción como código promocional y no como suscripción comprobada.
Los cosméticos exclusivos por compra tienen ventana de adquisición vinculada al evento. Al terminar dejan de obtenerse por compra; quienes ya los tienen los conservan. Admin puede crear códigos especiales de desbloqueo con artículo, caducidad, usos máximos y auditoría. Son promociones controladas, no contraseñas universales ocultas en el cliente.
Una entrada confirmada vinculada añade un sello de compra o evento asociado. Solo check-in verificable añade asistencia confirmada. Para compras de varias entradas, asignar cada titular mediante vínculo verificable; no atribuir asistencia al comprador de todas. QR promocionales compartibles no acreditan asistencia; check-in usa referencia verificable y control de repetición.
No se desarrolla un portal de reembolsos o cancelaciones como prioridad comercial. Conservar estados internos y gestión de incidencias: si el proveedor notifica devolución o anulación, registrar el hecho y actualizar la validez del ticket mediante un ajuste auditado. La política comercial se aprueba antes del lanzamiento; no asumir que una incidencia nunca podrá ocurrir.

## 49.13 Seguridad administrativa y retirada de datos
El acceso de propietario y administradores requiere contraseña y segundo factor, con recuperación segura y códigos de respaldo entregados privadamente. Generar credenciales temporales únicamente al desplegar; nunca publicar una contraseña en este documento o en el repositorio. La recuperación no permite saltarse roles ni apropiarse de cuentas.
Antes de borrar, mostrar exactamente el elemento, sus relaciones y el efecto. Exigir una segunda confirmación inequívoca, como escribir el nombre. Para operaciones masivas mostrar número y muestra; para una purga irreversible exigir reautenticación. Usar archivar o papelera recuperable como acción habitual, con plazo configurable y registro de auditoría.
Editar o borrar un objeto referenciado debe avisar de impacto en mapa, eventos, misiones, logros y mensajes. Proteger al último propietario. La edición de Carnets no expone contraseñas, sesiones o factores de autenticación. Avisar al usuario antes de crear su Carnet de qué campos serán públicos; email y datos de autenticación nunca son públicos.
Incluir solicitud de descarga y eliminación de cuenta, retirada de contenido público y gestión administrativa de la petición. Definir en el Prompt 1 conservación mínima de registros de compras y auditoría, anonimización y tratamiento en backups; una restauración no debe volver a publicar contenido retirado. Son flujos de producto que deberán validarse antes de producción.

## 49.14 Cuándo hace falta el mapa
Antes del Prompt 1 bastan las reglas del mundo recogidas aquí. No se exige diseño final, número definitivo de islas, imágenes terminadas ni coordenadas cerradas. El Prompt 1 define formato de mapa, coordenadas isométricas, sectores, colisiones, anclajes de assets, rutas, destinos y validaciones.
El Prompt 2 construye el editor y una escena técnica de prueba con islas, obstáculos y contenidos de muestra. Esa escena verifica publicación, colisiones y comportamiento compartido con el motor; no es una entrega piloto independiente ni fija el arte de lanzamiento.
Para el Prompt 3 se documenta un boceto de lanzamiento con inicio, islas principales, destino de Fiestera, circuito y atajo, costas, Fotos, Tienda, Faro, Cañón y zonas de sorpresas. La autorización de diseño autónomo permite proponer y construir ese primer mapa sin pedir cada decisión menor; sus rutas se prueban y el equipo puede revisarlo. El arte definitivo se valida antes de publicar.
Entregar también orden narrativo, evento prioritario provisional, relación de cada isla con eventos y rutas principales. El Prompt 3 ajusta distancias con pruebas de navegación y documenta el mapa publicado. Después, Admin puede ampliar y recolocar dentro de los comportamientos soportados sin reconstruir la aplicación.

## 49.15 Criterios verificables de cierre
Accesos: tocar Tickets, Fotos y Tienda muestra la localización correcta y abre el panel sin conducir; cerrar deja el barco allí. Con fallo del motor se conserva la vista ligera y las acciones. Ningún teletransporte completa la misión.
Eventos: finalizar retira solo la venta del evento pasado, conserva isla y recuerdos y ofrece próximos eventos. Agotado mantiene información de evento aún vigente. Reutilizar una isla no elimina su archivo. Cambiar prioridad no altera una misión iniciada.
Comunidad: encuesta voluntaria con resultados privados y envío sin duplicados; mensaje global visible a invitado y miembro, leído persistente y caducidad correcta; recordatorios de registro en los tres contextos sin bloquear compra ni carrera.
Progresión: gastar monedas no cambia rango; importar progreso local alterado no concede saldo o récord competitivo; fusionar invitado dos veces no duplica logros. Los resultados de Vigilancia del faro y Cañón contra tiburones solo conceden premios o marcas globales cuando el servidor valida una sesión real y una operación idempotente.
Admin: alta global de logros y perfiles, edición de Carnets, mensajes y encuestas, doble factor, doble confirmación y recuperación de archivados. Medir rutas de un minuto y diez minutos y registrar resultados en móvil.
Cada requisito tendrá ID estable, apartado fuente, estado, satisfacción, responsable, comentario, evidencia y prueba. Separar cerrado como decisión, implementado y verificado. Estados mínimos: No integrado, En proceso, Implementado mejorable e Implementado satisfactorio. Solo pruebas reales permiten marcar satisfactorio.

## 49.16 Mapa progresivo y carrera como atajo
La navegación principal avanza desde la zona inicial hacia las islas principales de eventos y venta de entradas. Entre ellas se intercalan islas secundarias, personajes, eventos y actividades, incluidos el Faro y el Cañón. Se alternan descubrimiento, navegación y pausas para que no queden todos los minijuegos agrupados en una esquina ni todas las islas comerciales seguidas.
La progresión organiza la experiencia y su dificultad, pero no bloquea las entradas: los accesos comerciales directos siguen disponibles desde la landing. El mapa debe permitir rodear actividades opcionales y seguir hacia el destino. La carrera es la excepción lateral, un recorrido más rápido hasta la última isla; dentro de ella se mantienen la bifurcación segura y el atajo arriesgado que confluyen antes de meta.
MAP 01. Entregar un plano con ruta principal, desvíos opcionales y circuito diferenciados. Comprobar que Faro y Cañón no son peajes, que la salida de carrera conduce al destino configurado y que el mapa se puede ampliar sin cambiar las misiones existentes. Medir el ritmo real y conservar los objetivos de tiempo de 49.7 como objetivos, no como resultados garantizados.

## 49.17 Barco y biblioteca de sprites sustituibles
Corregir expresamente la orientación del barco al ir hacia abajo, de vuelta o marcha atrás. La proa, la popa, la cubierta, el mástil, la sombra y la pasajera deben conservar una perspectiva coherente. No invertir verticalmente un sprite para fingir otra vista. Si existe marcha atrás, distinguir dirección del casco y dirección de desplazamiento; la estela debe corresponder al movimiento real.
Como base de prueba, producir un barco y al menos tres skins distinguibles, ampliables. Cada variante debe cubrir las ocho direcciones y los estados compatibles del contrato de assets. Este mínimo es una decisión inicial de diseño, no un límite del catálogo. Las skins son estéticas y comparten física, hitbox y reglas competitivas.
Mantener los slots de 35.1 y un manifiesto por recurso con ID, versión, archivo o atlas, fotogramas, direcciones, escala, anclajes, pivote y licencia u origen. Separar la geometría de juego de la imagen. Islas, cocodrilos, tiburones, faro, banderas y decoración deben poder sustituirse por recursos compatibles desde Admin, sin cambiar reglas ni perder asociaciones de contenido.
ART 01. Revisar cada skin en las ocho direcciones, giros, parada, drift, regreso y rescate con Fiestera a bordo. Sustituir barco, isla y obstáculo en una prueba de Admin, verificar anclajes y colisiones y restaurar la versión anterior. Entregar fuentes editables y una guía breve para añadir una nueva variante.

## 49.18 Autonomía documentación y estado verificable
Se autoriza al desarrollo a tomar decisiones reversibles de diseño, mapa, sprites, skins y ajustes iniciales, documentando el motivo y manteniendo la posibilidad de cambiarlas. Elegir una ticketera adecuada para España exige comprobar sus condiciones e integración en el momento de contratar. Si hace falta crear una cuenta, aceptar condiciones, aportar datos del titular o realizar un pago, se solicita la intervención de BOIA; no se afirma que esas acciones ya se hayan realizado.
Organizar la entrega por áreas: 00 lectura y estado; 01 producto y flujos; 02 dirección artística y storyboard; 03 mapa y gameplay; 04 assets y skins; 05 arquitectura e integraciones; 06 pruebas y trazabilidad; 07 operación y publicación. Cada área tendrá índice, versión, responsable o pendiente y referencias al repositorio. No duplicar documentos divergentes como si todos fueran vigentes.
La primera versión jugable es un hito intermedio útil para probar diseño y mecánicas, no una declaración de producción. La entrada cinematográfica descrita aquí sigue pendiente de validación visual; esta revisión no aporta pruebas nuevas de la aplicación. La matriz debe separar requisito decidido, implementación, comprobación automática y validación real con usuarios o dispositivos.
Antes de publicar, confirmar contenido real y derechos de uso; cuentas y dominio de BOIA; correo y autenticación; pagos y confirmaciones; estados y stock; permisos del Admin; textos legales y privacidad revisados; copia y restauración; métricas; accesibilidad y pruebas físicas. Enumerar todo lo no activado, sin sustituirlo por una interfaz simulada. Cerrar los criterios ENT 01 a ENT 06, MAP 01 y ART 01 junto con los demás requisitos del maestro.

# 50 Tres prompts definitivos para construir la aplicacion
Los tres prompts forman una secuencia sobre el mismo repositorio: análisis, cimientos y administración, y experiencia completa. En el Prompt 3 se permite una primera versión jugable para revisión. Esa entrega intermedia no sustituye el cumplimiento final de requisitos, pruebas e integraciones.

## Cómo utilizar los tres prompts
1. Abre un Work nuevo y adjunta el documento maestro v14.
2. Pega el Prompt 1. Revisa el mapa funcional, las decisiones y el plan antes de autorizar código.
3. Cuando el Prompt 1 esté aprobado, pega el Prompt 2 en el mismo Work. Debe trabajar en un repositorio exportable y dejar una entrega técnica verificable.
4. Revisa que el panel Admin y sus pruebas funcionen. Después pega el Prompt 3 para terminar el producto completo.
5. No empieces de nuevo entre prompts. Cada encargo debe leer el repositorio, la especificación y los informes dejados por el anterior.
El mapa definitivo no bloquea los prompts 1 y 2. En el tercero, el equipo desarrolla y documenta el boceto conforme a 49.14 y a la autonomía de 49.18. Los tres prompts pueden requerir varias interacciones, pruebas y aprobaciones; no prometen acabar en tres respuestas.
Si el trabajo cambia de herramienta o de persona, se entrega el repositorio completo, las migraciones, los recursos, las variables de entorno de ejemplo y los informes de estado. No basta con compartir una URL publicada.

# Prompt 1

## Analisis de producto y arquitectura definitiva
Quiero iniciar BOIA.PLANET desde cero como un proyecto limpio y definitivo. He adjuntado el documento BOIA_PLANET_Documento_Maestro_Definitivo_v14_TRES_PROMPTS.docx. Debes leerlo completo antes de responder. Ese documento es la fuente principal de requisitos y sus decisiones posteriores sustituyen a las versiones históricas que las contradigan.
En este primer encargo no programes la aplicación, no generes una demo y no publiques una web. Tu trabajo consiste en convertir la visión completa en una arquitectura y un plan de ejecución que puedan seguirse sin perder funcionalidades durante el desarrollo.

## Resultado que necesito
Entrega un documento de análisis dentro del repositorio con estas secciones:
1. Resumen del producto y de sus dos recorridos principales: compra directa y exploración.
2. Mapa completo de pantallas, sistemas, datos, integraciones, actores y relaciones.
3. Flujos de usuario para invitado, miembro, artista, editor, moderador, administrador y propietario.
4. Arquitectura técnica propuesta, con decisiones justificadas y alternativas solo cuando exista una duda real.
5. Modelo de datos y catálogo inicial de eventos del motor, comportamientos configurables y permisos.
6. Diseño funcional del panel Admin y del editor visual del mundo.
7. Ciclo de vida de eventos, islas, home, descuentos, logros, perfiles y temporadas.
8. Estrategia de autenticación, seguridad, privacidad, moderación, copias y recuperación.
9. Plan de implementación completo, ordenado por dependencias, sin presentar un piloto jugable como entrega final.
10. Matriz de trazabilidad que asigne cada requisito de esta versión a un componente, una fase y una prueba.
11. Inventario de contenido y recursos que BOIA debe aportar, distinguiendo bloqueante, sustituible provisionalmente y futuro.
12. Registro de decisiones abiertas. Propón un valor inicial cuando se pueda avanzar sin comprometer la identidad o el negocio; deja como pendiente lo que solo BOIA pueda aprobar.
Incluye como requisitos obligatorios todos los apartados 49.6 a 49.15: escenas comerciales con isla visible, recuerdos y próximos tickets, encuestas, Mensajes de BOIA, registro contextual, progreso invitado validado, Vigilancia del faro, Cañón contra tiburones, objetivos de tiempo, promociones, segundo factor, doble confirmación y planificación del mapa. Asigna IDs propios y pruebas; no los reduzcas a notas opcionales.
Incorpora también 4.4 y 49.16 a 49.18: storyboard y estados de entrada, continuidad planeta y mundo, landing HTML accesible, mapa progresivo, carrera lateral a la última isla y contrato de skins con orientación correcta. Asigna los IDs ENT 01 a ENT 06, MAP 01 y ART 01 a diseño, implementación y pruebas, sin reiniciar un repositorio existente.

## Decisiones que debes tratar como cerradas
BOIA.PLANET es la plataforma digital de BOIA y debe unir web de festival, venta de entradas, universo navegable, descubrimiento cultural y comunidad. El objetivo comercial principal es vender entradas, con Tickets visible y rápido para quien no quiera jugar. Explorar puede ser el CTA más llamativo, pero nunca puede bloquear la compra.
La entrada es una cinemática automática, breve y sobria con BOIA.PLANET. No hay selector de idioma, login ni botón obligatorio antes de la landing. El idioma se resuelve automáticamente cuando sea posible y se cambia después. Login, registro y Carnet BOIA se ofrecen desde la landing o el menú.
La home permite desplazarse hacia abajo y consultar próximos eventos, fotos y vídeos, artistas, filosofía, tienda y contacto. Sus accesos también pueden llevar físicamente al barco hasta el lugar correspondiente del universo y abrir el contenido. Al cerrar el panel, la persona permanece en ese punto y puede navegar.
El mundo definitivo es 2D o 2.5D con vista isométrica, mobile first, ilustrado y ligero. Utiliza sprites y recursos por capas, parallax, animaciones cortas, agua viva, estela, ciclo de día y noche configurable y carga por zonas. No debe depender de un entorno 3D pesado.
El control táctil nace al tocar el barco: el punto tocado se convierte en el origen del joystick. Un segundo dedo activa drift y permite girar más rápido. En escritorio se ofrecen teclado y alternativa para drift. El minimapa es discreto, se amplía al tocarlo, se mueve mediante pulsación larga y arrastre, recuerda su posición y muestra nombres y funciones en la vista ampliada.
La aventura mantiene el tutorial orgánico mediante una boya, la misión completa de la Boya Fiestera, los cocodrilos, el rescate físico, la pasajera visible, la entrega en la última isla y el mundo abierto posterior. Los diálogos breves avanzan aproximadamente cada 1,5 segundos y se pueden acelerar o saltar. Los avisos de logro duran aproximadamente cuatro segundos, se muestran arriba con estética azul marino y naranja, tienen sonido y se encolan.
El mar contiene islas, boyas, náufrago, descuentos, restos recogibles, cofres temporales, delfín guía, remolino, botellas, boya musical, puerto de fotos, boya de WhatsApp, secretos y circuito. El circuito usa cronómetro muy pequeño en la parte superior, checkpoints con boost aproximado de dos segundos, ruta segura y atajo, y solo tres obstáculos iniciales: cocodrilo, roca y medusa.
El Carnet BOIA unifica perfil, pasaporte y Carta de Navegación. Incluye identidad, fecha de alta, cinco preguntas públicas, rango, puntos, logros, barco, cosméticos y sellos de eventos. No incluye valoraciones de artistas ni lista de artistas vistos. Miembro de BOIA es el término formal y Bollero es el apodo interno. No hay mensajería privada. Cada cuenta puede mantener una botella pública de hasta 140 caracteres, sin recompensa por escribir o leer.
Los invitados conservan en el dispositivo todo el progreso que sea razonable. Al crear una cuenta se ofrece vincularlo de forma idempotente, sin duplicar monedas ni recompensas. El acceso público recomendado es email mediante enlace de un solo uso. Las cuentas administrativas usan autenticación más fuerte, recuperación y permisos verificados en servidor.
La apariencia de cada objeto debe estar desacoplada de su comportamiento. El Admin combina un asset compatible con geometría, posición, contenidos y módulos preprogramados como colisión, proximidad, diálogo, recogida, recompensa, apertura de contenido, ticket, checkpoint, boost, teletransporte, spawn o logro. Una mecánica inédita puede requerir código una vez; después debe quedar reutilizable como comportamiento o plantilla.

## Requisitos nuevos de administracion que debes incorporar
El Admin debe poder crear logros nuevos y publicarlos para todos los usuarios sin tocar código. Debes distinguir dos operaciones:
- Crear un logro global, que aparece disponible para todas las cuentas y puede evaluar actividad anterior si su condición lo permite.
- Conceder un logro de forma masiva a todas las cuentas o a un segmento autorizado, con vista previa del número de afectados, confirmación, operación idempotente, registro de auditoría y posibilidad de compensación. Nunca debe duplicar puntos o monedas si se reintenta.
El Admin debe poder editar cualquier Carnet BOIA y crear perfiles con libertad. Define una solución que permita crear perfiles oficiales de artistas, miembros o colaboradores incluso antes de que tengan una cuenta, y vincularlos posteriormente mediante invitación. Propietario y administradores autorizados podrán editar campos públicos, imagen, respuestas, sellos, logros, puntos, monedas, barco y cosméticos, siempre con historial de cambios y motivo para correcciones sensibles. No deben poder ver contraseñas ni apropiarse de la sesión de otra persona. El sistema debe separar la identidad pública del acceso privado.
El Admin debe poder editar la página principal por bloques: ordenar, activar, ocultar, programar, traducir y previsualizar hero, evento prioritario, próximos eventos, fotos, artistas, filosofía, tienda y contacto. Las opciones habituales deben ser formularios y selectores; no HTML libre obligatorio.
La isla y el evento son entidades separadas. Una isla puede conservar el historial de varios eventos y recibir uno nuevo más adelante. Cuando un evento termina:
- Deja de aparecer automáticamente en el bloque de próximos eventos y en los CTAs de compra de la home, aunque Admin pueda controlar el momento exacto y revisar la transición.
- Desaparece la compra del evento finalizado de su ficha y de su isla; permanece el bloque separado de entradas para próximos eventos.
- La isla no se elimina. Cambia a modo recuerdo y ofrece cartel, artistas, relato, fotos y vídeos del evento, con una acción como Ver las fotos, más un bloque separado para comprar próximos eventos.
- Si esa isla recibe un nuevo evento publicado y a la venta, el nuevo evento vuelve a aparecer en la home y la isla muestra la compra del evento activo, manteniendo accesible su archivo histórico.
- Agotado, cancelado, pospuesto y finalizado son estados distintos y no deben resolverse simplemente borrando una tarjeta.
Modela la home a partir de consultas y reglas de publicación, no como una lista escrita a mano en el código. Admin debe poder añadir o retirar un evento de la home sin eliminar su entidad, su isla ni su archivo.
No solicites un mapa final para realizar este análisis. Define el contrato de mapa y assets y el inventario del boceto que se aprobará entre los prompts 2 y 3. La escena técnica del Prompt 2 debe demostrar el editor sin fijar el mapa ni el arte final.

## Puntos que debes resolver expresamente
Separa puntos de prestigio y monedas gastables, para que comprar un cosmético no reduzca el rango. Define identificadores estables y un registro idempotente de recompensas. La compra solo genera sello o logro cuando existe confirmación verificable; pulsar un botón o volver desde la ticketera no basta.
Define qué datos se conservan entre temporadas. Como base, conserva cuenta, Carnet, sellos, cosméticos, puntos históricos y preferencias. Guarda misión, descubrimientos y puntuación de temporada en su ámbito correspondiente. Versiona el circuito si cambia la geometría o la física.
Incluye un modelo claro de estados para eventos: borrador, próximamente, a la venta, agotado, pospuesto, cancelado y finalizado. Especifica las transiciones automáticas por fecha y las modificaciones manuales, el comportamiento de la home y el comportamiento de la isla para cada estado.
Define el editor visual con lienzo isométrico, biblioteca de assets, inspector, capas, selección, mover, escala, orientaciones compatibles, zonas de proximidad, hitbox, puntos seguros, plantillas, deshacer, rehacer, borrador, vista previa, validación, publicación y restauración.
Incluye validaciones para que una isla no bloquee la navegación, un teletransporte no aparezca dentro de tierra, una misión tenga destino, un circuito tenga rutas válidas y una referencia eliminada no rompa home, mapa, evento o logro.
Define roles como propietario, administrador, editor, moderador y artista. El propietario gestiona permisos e integraciones. Los cambios de mundo, perfiles, puntos, promociones, compras, sellos y moderación deben quedar auditados.
La contraseña del propietario no se escribe en el repositorio ni en este documento. En la implantación se generará una contraseña temporal aleatoria, se entregará a Álvaro por un canal privado y se cambiará en el primer acceso. Cada miembro del equipo tendrá una cuenta propia.
Define el modelo de encuestas, preguntas versionadas y respuestas privadas; mensajes editoriales con audiencia, fechas y estado leído; política configurable de invitaciones al registro; identidad anónima y evidencia de recompensas. Concreta doble factor, papelera, confirmación de borrado, eliminación de cuentas y diferencias entre compra, asistencia y promociones QR.

## Forma de trabajo
Lee todos los apartados de esta versión, incluida la auditoría del piloto y la decisión final sobre objetos modulares. No resumas hasta perder comportamientos concretos. Si dos requisitos se contradicen, cita ambos dentro de tu análisis, aplica la regla de precedencia y deja una decisión única.
Selecciona y justifica una ticketera que funcione bien en España, comprobando coste total, cobros, reembolsos, códigos, checkout móvil y confirmaciones. Usa un adaptador sustituible. Aplica la autonomía de 49.18 para la elección técnica; solicita las cuentas, datos reales o autorización de contratación que falten.
Propón una pila técnica actual y mantenible para una web editorial accesible, un renderizador 2D isométrico y un backend con autenticación, base de datos, almacenamiento y permisos. Explica qué se aloja dónde, cómo se desarrolla localmente y cómo se exporta. Evita una arquitectura innecesariamente compleja.
No uses contenido ficticio como si fuera real. Las fechas, enlaces de tickets, códigos, fotografías, canciones, productos y textos no aprobados se marcan como muestra o pendiente. Respeta los 26 artistas del documento y solicita validación de nombres, fotos y biografías antes de publicar.

## Criterios de aceptación de este encargo
No des por completado el Prompt 1 hasta que:
- Cada requisito del documento v14 tenga destino en la matriz de trazabilidad.
- El Admin tenga flujos completos para crear una isla, reemplazar su imagen, asignar comportamientos y publicarla.
- Estén definidos los flujos para crear logros globales, concederlos masivamente, editar cualquier Carnet y crear perfiles oficiales.
- Esté definido el cambio de un evento a histórico sin borrar su isla y la aparición automática de un evento nuevo en la home.
- Haya criterios de aceptación verificables para compra, juego, social, datos, administración, rendimiento y accesibilidad.
- El plan indique dependencias, riesgos, entregables y orden de desarrollo hasta la aplicación definitiva.
Termina con un listado breve de decisiones que debo aprobar antes de ejecutar el Prompt 2. No programes hasta que yo lo autorice.

# Prompt 2

## Construccion de cimientos y administracion completa
Continúa en el mismo Work y utiliza el repositorio, el documento maestro v14 y el análisis aprobado del Prompt 1. Antes de modificar archivos, comprueba el estado del repositorio y convierte cualquier decisión aprobada después del Prompt 1 en un registro breve. No reinicies el proyecto, no sustituyas una solución funcional sin justificarlo y no elimines requisitos para acelerar la entrega.
En este encargo debes construir los cimientos completos del producto y dejar operativo el panel de administración. No necesito una demo jugable separada. El resultado debe ser una base de producción exportable sobre la que el Prompt 3 pueda terminar la experiencia sin rehacer datos, autenticación, editor o publicación.

## Objetivos del encargo
1. Crear el repositorio, configuración local, entornos de prueba y producción, validación automática, migraciones y documentación de instalación.
2. Implementar el modelo de datos versionado para usuarios, Carnets, eventos, islas, objetos, assets, comportamientos, mundo, temporadas, home, logros, economía, promociones, sellos, carreras, botellas, moderación y auditoría.
3. Implementar autenticación pública por enlace de email, sesión invitada y vinculación de progreso sin duplicados.
4. Implementar acceso administrativo con email, contraseña y doble factor obligatorio, recuperación segura, roles y protección real en servidor y base de datos.
5. Implementar la web editorial base y el sistema de bloques de home que consumirá contenido publicado.
6. Implementar el panel Admin, el editor visual isométrico y el flujo de borrador, previsualización, validación, publicación y restauración.
7. Implementar la biblioteca de objetos modulares y comportamientos reutilizables.
8. Implementar la administración de eventos, perfiles, logros, recompensas, artistas, galerías, tienda, textos e idiomas.
9. Probar que el sistema puede ampliarse sin editar código para las operaciones previstas.

## Arquitectura y calidad obligatorias
Utiliza TypeScript estricto o una alternativa equivalente aceptada en el Prompt 1. Separa aplicación pública, Admin, motor, contratos compartidos, datos del mundo, reglas, adaptadores e infraestructura. Ningún componente de UI debe escribir directamente saldos, roles, sellos o estados de compra.
Las entidades usan IDs estables y campos de versión. Las migraciones son acumulativas y no reinician datos de producción. Incluye datos de ejemplo explícitamente etiquetados y un procedimiento para eliminarlos o sustituirlos. Añade variables de entorno de ejemplo sin secretos.
El sitio público debe ofrecer contenido comercial en HTML aunque el renderizador no cargue. La home, tickets y fichas compartibles funcionan aunque WebGL falle: conservan una representación ligera de la isla y su panel HTML, con la misma información y acciones. El juego y el Admin comparten esquema de mundo y transformaciones isométricas, para que lo colocado en el editor aparezca en el mismo sitio al ejecutarlo.
Implementa pruebas unitarias, de integración y de permisos desde el principio. Las operaciones críticas necesitan pruebas de repetición, concurrencia y fallo parcial. Usa datos de prueba independientes y no conectes pagos reales durante las pruebas.

## Panel Admin que debes entregar operativo
La navegación incluye Resumen, Página principal, Eventos, Mundo, Artistas, Fotos y vídeos, Tienda, Promociones y QR, Logros y cosméticos, Perfiles y Carnets, Encuestas, Mensajes de BOIA, Moderación, Textos y música, Temporadas, Revisión, Usuarios de administración e Integraciones.
Página principal debe permitir:
- Editar hero, titular, subtítulo, CTA Explorar, CTA Tickets y sus traducciones.
- Añadir, ocultar, ordenar y programar bloques.
- Elegir el evento prioritario.
- Mostrar próximos eventos mediante reglas y permitir exclusión manual sin borrar el evento.
- Configurar últimas fotos, artistas rotativos, filosofía, tienda y contacto.
- Previsualizar escritorio y móvil antes de publicar.
Añadir la configuración de entrada del apartado 4.4: recursos compatibles, duración, encuadres y alternativa reducida, con vista previa y restauración. Preparar una máquina de estados que entregue la cámara a la landing sin duplicar escena ni bloquear contenido comercial.
- Restaurar una versión anterior.
Eventos debe permitir crear, duplicar, editar, publicar, finalizar, cancelar, posponer y archivar. Cada evento tiene cartel, formato, fecha y zona horaria, artistas, actividades, descripción, ticket, promociones, álbum y una isla opcional. Implementa la separación entre evento e isla y la relación temporal muchos a muchos o equivalente aprobada.
Cuando un evento pasa a finalizado, debe salir del bloque de venta y desaparecer Comprar de todos sus puntos. Su isla permanece publicada, muestra la experiencia pasada y abre su galería o relato, junto a un bloque de próximos eventos comprables. Si se vincula un nuevo evento a esa isla y se publica a la venta, la home vuelve a mostrarlo y la isla prioriza ese evento, dejando el anterior en Historial. Añade una tarea programada o evaluación segura de fecha para aplicar transiciones, junto con controles manuales y auditoría.
El editor del Mundo permite subir o elegir PNG, WebP y sprites compatibles, colocar, mover, escalar y seleccionar orientación, definir capa, radio, hitbox, zona y punto seguro. Permite añadir comportamientos del catálogo, cambiar parámetros, vincular contenido y probarlo. Implementa plantillas, duplicado, capas, snap opcional, deshacer, rehacer, validación y publicación atómica.
El catálogo inicial de comportamientos incluye bloqueo, rebote, frenado, ralentización, boost, proximidad, diálogo, recogida, recompensa, contenido, ticket, checkpoint, teletransporte, spawn, logro y decoración. Apariencia y comportamiento no se acoplan. Un cocodrilo que ralentiza debe poder convertirse en una roca cambiando el asset y conservando el comportamiento.
Implementa Encuestas y Mensajes de BOIA con los campos, versiones, audiencia, programación, respuestas, lectura y moderación del apartado 49. Añade controles para recordatorios de registro, destino de misión por temporada, promociones de primera compra, WhatsApp y exclusivos. Admin prepara la configuración versionada de Vigilancia del faro y Cañón contra tiburones para su implementación jugable en el Prompt 3. No presentar como activo un módulo todavía no construido.

## Logros para todos los usuarios
Logros permite crear, traducir, duplicar, activar, desactivar y versionar objetivos mediante triggers soportados. El formulario muestra condición legible, ámbito, puntos, monedas, icono, secreto o visible, fechas y comportamiento retroactivo.
Implementa dos acciones diferentes:
1. Publicar logro global. Todas las cuentas activas pueden verlo y conseguirlo. Si se marca retroactivo, una tarea segura evalúa hechos históricos compatibles y concede una sola vez.
2. Conceder logro masivo. Propietario o administrador autorizado selecciona todos los miembros o un segmento, ve una estimación, escribe motivo, confirma y crea un trabajo procesable por lotes. Cada usuario recibe una transacción idempotente; reintentar no duplica puntos ni monedas. Se muestra progreso, errores y resumen, y se ofrece una acción compensatoria auditada en lugar de borrar el historial.
Un logro existente no debe cambiar de significado alterando su condición después de que usuarios lo hayan obtenido. Para ese caso se crea una nueva versión o un nuevo logro. Desactivar evita nuevas concesiones sin quitar silenciosamente lo ya conseguido.

## Perfiles y Carnets con administracion total
Perfiles y Carnets permite buscar por apodo, email privado autorizado, rol, tipo, estado, rango y fecha. El Admin puede crear un perfil oficial sin cuenta, elegir si es miembro, artista, colaborador o perfil editorial, completar todos sus campos públicos y asociarlo a eventos.
El propietario y los administradores con permiso específico pueden editar cualquier Carnet: apodo, imagen, biografía autorizada, respuestas, visibilidad, sellos, logros, puntos, monedas, barco y cosméticos. Las correcciones sensibles exigen motivo. El historial conserva valor anterior, valor nuevo, autor y fecha. Las contraseñas, enlaces de acceso y sesiones no se muestran ni se editan desde el Carnet.
Un perfil creado por Admin puede reclamarse mediante una invitación de un solo uso que vincula una cuenta verificada. El proceso detecta duplicados y requiere confirmación del equipo cuando ya existe un perfil parecido. La reclamación no concede permisos de artista o administrador que no hayan sido aprobados.
Incluye creación y edición por lotes solo para operaciones claras y reversibles. Antes de una acción masiva se muestra el número de perfiles, los campos que cambiarán y un ejemplo. Nunca permitas una edición silenciosa de todas las cuentas desde el navegador sin tarea, validación y auditoría del servidor.
Usa una escena técnica de prueba para verificar el editor y el motor en el Prompt 2. No pidas el diseño final del mapa. Implementa el contrato de sectores, coordenadas y assets, una localización comercial ligera y los mecanismos de carga de isla y panel que completará el Prompt 3.

## Seguridad del panel
Crea el mecanismo de inicialización de un solo uso para el propietario. No fijes una contraseña conocida en el código ni la incluyas en un commit. En el momento de desplegar, genera una contraseña temporal aleatoria de al menos 20 caracteres y muestra o entrega sus datos una sola vez por un canal privado a Álvaro. Obliga a cambiarla al entrar y permite recuperación mediante el correo verificado. Documenta la URL del panel y cómo invitar a otras personas con cuentas separadas.
Aplica permisos en rutas, servicios y base de datos. Un miembro no puede convertirse en administrador manipulando una petición. Editor no publica; moderador no altera saldos; artista solo modifica su ficha; administrador no transfiere propiedad. Registra login administrativo, cambios de rol, publicaciones, correcciones de progreso, acciones masivas, moderación e integraciones.
Valida archivos, extensiones, peso y dimensiones; almacena originales de forma segura y crea variantes optimizadas. No renderices HTML de usuarios. Protege formularios y APIs con límites, comprobaciones de origen y defensa frente a repetición. Los secretos se guardan en configuración segura y se presentan enmascarados.
Aplica segundo factor a todo acceso administrativo, incluida recuperación controlada. Añade papelera/archivo, advertencias de dependencias, segunda confirmación explícita y reautenticación antes de purgas irreversibles. Prueba también que restaurar una versión de mundo no repone perfiles o mensajes retirados ni revierte transacciones.

## Publicacion y temporadas
Guardar crea borradores versionados. Previsualizar usa el motor real en un entorno privado y no concede puntos, publica botellas ni ejecuta cobros. Validar comprueba referencias, rutas, colisiones, traducciones esenciales, tickets y destinos. Publicar crea una revisión inmutable y cambia la versión activa de forma atómica.
Duplicar temporada copia la configuración del mundo como borrador, sin duplicar cuentas, ventas, mensajes ni recompensas concedidas. Permite cambiar spawn, evento prioritario, destinos, eventos, diálogos y logros. La restauración del contenido no revierte transacciones comerciales o saldos de usuarios.
El seguimiento de implementación debe incluir para cada requisito estado, grado de satisfacción, comentario, evidencia y prueba. Utiliza como mínimo No integrado, En proceso, Implementado mejorable e Implementado satisfactorio. No marques satisfactorio sin enlace a prueba o captura verificable.

## Pruebas de aceptación del Prompt 2
Ejecuta y documenta al menos estos recorridos:
1. Crear una isla con un asset de prueba, colocarla, asociarle una zona de proximidad y un evento, previsualizarla, publicarla y restaurar la versión anterior.
2. Cambiar el asset de un obstáculo manteniendo su comportamiento de ralentización.
3. Crear un evento futuro y comprobar que aparece en la home y en su isla; finalizarlo y comprobar que sale de ventas, conserva la isla y muestra Fotos o Recuerdo; añadir después un nuevo evento a esa isla y comprobar que vuelve a la home.
4. Crear un logro global retroactivo y confirmar que cada usuario elegible lo recibe una sola vez.
5. Conceder un logro masivo, reintentar el trabajo y comprobar que no duplica puntos ni monedas.
6. Crear un perfil oficial sin cuenta, editar todos sus campos, invitar a reclamarlo y comprobar que la cuenta queda vinculada sin duplicar el perfil.
7. Editar el Carnet de un usuario como administrador, verificar auditoría y confirmar que un editor o un miembro no pueden hacerlo.
8. Publicar home, evento y mundo de forma atómica, y recuperar una revisión sin alterar compras o recompensas.
9. Confirmar que ningún secreto o contraseña aparece en cliente, logs públicos, repositorio o archivo de ejemplo.
10. Ejecutar migraciones desde una base vacía y sobre una base con datos, sin reinicios destructivos.
Pruebas adicionales obligatorias: crear encuesta y recibir una respuesta privada una sola vez; publicar mensaje para todos y comprobar lectura de invitado y miembro; comprobar rechazo de saldo local manipulado; gasto sin pérdida de rango; doble factor y doble confirmación; archivado recuperable; destino estable tras añadir isla; configuración de ambos minijuegos y contratos de la transición preparados. Entrega además el boceto o las decisiones pendientes del mapa para continuarlas con la autonomía definida en 49.18.

## Entrega del Prompt 2
Entrega el repositorio completo y exportable con instrucciones exactas de instalación, desarrollo, pruebas, migraciones, despliegue y recuperación. Incluye diagramas y decisiones en docs, ejemplos de datos, catálogo de comportamientos, matriz de permisos, variables de entorno de ejemplo y un informe de pruebas con resultados reales.
Termina con una tabla de requisitos: completado, parcial o pendiente; evidencia; deuda técnica; y acción necesaria en el Prompt 3. No afirmes que una función está completa si solo existe su interfaz. La escena técnica de esta fase no es la primera versión jugable de revisión que se construirá en el Prompt 3.

# Prompt 3

## Construccion completa de BOIA PLANET
Continúa en el mismo Work y sobre el repositorio entregado por el Prompt 2. Lee el documento maestro v14, el análisis aprobado, la matriz de trazabilidad, las decisiones, las pruebas y la deuda pendiente. Comprueba primero que las migraciones y el panel Admin funcionan. Si encuentras una deficiencia estructural, corrígela manteniendo compatibilidad de datos antes de completar la aplicación.
Este encargo debe completar BOIA.PLANET para validación final y producción. Entrega primero un hito jugable revisable con diseño, mapa progresivo y ambos minijuegos, y continúa hasta integrar los sistemas acordados con Admin. Documenta lo que impida el lanzamiento; no presentes una maqueta o una integración simulada como producto terminado.
Utiliza el boceto disponible o diseña uno conforme a 49.14 y 49.16, documentando las decisiones. La autorización de trabajo autónomo permite avanzar con el primer diseño de prueba. Produce assets sustituibles, al menos tres skins y vistas correctas del barco según 49.17. Mantén la revisión final de identidad, contenido y publicación por BOIA.

## Experiencia pública completa
Implementa como prioridad de diseño la entrada definida en 4.4 y verifica ENT 01 a ENT 06. Comienza por un storyboard y una prueba corta de movimiento: planeta BOIA limpio y elegante, acercamiento continuo, revelación del mar, islas y barco, y aparición de la landing completa. Mantén el toque divertido de la marca. La secuencia avanza sin clic ni formularios, comparte escena con la landing, se puede saltar y dispone de alternativa reducida y tolerante a fallos. No cierres esta tarea con un simple fundido genérico o una pantalla Welcome. Entrega grabaciones de escritorio y móvil para revisión visual.
La home obtiene sus bloques y eventos del contenido publicado por Admin. Muestra solo eventos vigentes para compra según estado y reglas. Un evento finalizado desaparece de la oferta de entradas, pero conserva su URL histórica y su isla. Las pruebas deben demostrar que añadir, finalizar y sustituir eventos cambia home e isla sin desplegar código.
Construye el mundo 2.5D isométrico mediante el motor modular: mar vivo, costas laterales infranqueables, zonas ampliables hacia arriba, islas separadas, barco por capas, estela, ocho o más orientaciones según las pruebas, agua animada y ciclo día y noche. Usa atlas, carga por sectores, calidad adaptable y límites de memoria.
Distribuye las islas principales de entradas de forma progresiva, intercalando islas secundarias, minijuegos y eventos. Mantén la carrera lateral como atajo hasta la última isla. Verifica MAP 01 y ART 01 y documenta cómo sustituir sprites y añadir skins sin tocar la lógica.
Implementa los controles táctiles desde el barco, joystick creado en el punto tocado, segundo dedo para drift, teclado, control alternativo y sensibilidad. Movimiento, colisiones y física son independientes de la tasa de imágenes. Evita aceleración bloqueada al perder un dedo o cambiar de pestaña. Añade recuperación a agua segura.
Completa minimapa pequeño, toque para ampliar, pulsación larga para arrastrar, snap a zonas seguras, persistencia, nombres y funciones, destinos descubiertos y brújula hacia el objetivo seleccionado. El mapa, la colisión, el editor y la cámara utilizan la misma geometría del mundo.
Implementa literalmente los accesos Tickets, Fotos y Tienda del apartado 49.6: isla visible y panel automático, sin conducir, con escena ligera de respaldo. En cada isla muestra recuerdos disponibles y próximos eventos comprables. No cambies estos accesos por una página convencional sin isla. El checkout externo sigue requiriendo una acción de compra.

## Aventura y mar
Implementa la primera boya tutorial con bocadillos, plop, ritmo de 1,5 segundos, avance y salto. Debe señalar con pulso el icono del Menú de a bordo y el minimapa sin abrirlos. Welcome Aboard queda consultable después.
Implementa la misión completa de Fiestera: encuentro rodeada por 3–4 cocodrilos, reacciones y sumersión, diálogo, rescate, subida física al barco, pasajera visible, reacciones ocasionales, persistencia, llegada desde cualquier lado navegable, desembarco, celebración, logro y mundo abierto. Un teletransporte comercial no debe completar el rescate o la entrega.
Añade islas por proximidad, náufrago, descuentos configurables, restos regenerables, cofres temporales, delfín, remolino, boya musical con cuatro canciones autorizadas o de prueba, boya de WhatsApp, puerto de fotos, botellas y secretos. Sus imágenes y parámetros deben poder cambiarse desde Admin mediante comportamientos reutilizables.
Completa el circuito lateral como atajo a la última isla, con inicio, cuenta atrás, cronómetro muy pequeño arriba, ruta normal y atajo que se reúnen, checkpoints, boost de unos dos segundos, cocodrilo, roca, medusa, meta, récord personal y ranking validado. Abrir un panel, ocultar la pestaña, recargar o teletransportarse invalida el intento competitivo. Versiona la clasificación si cambian física o trazado.

## Minijuegos integrados
Crea un módulo reutilizable INICIAR_MINIJUEGO dentro del mismo motor, no una página o aplicación separada. Cada actividad se inicia por proximidad y acción explícita, conserva la isla y la posición segura de origen y devuelve al jugador al mismo contexto al terminar o salir. El módulo comparte controles, pausa, audio, calidad, movimiento reducido, sesión, economía y telemetría, pero cada juego mantiene reglas, assets y configuración versionada propios.
Implementa Vigilancia del faro en la isla Faro. Al aceptar la actividad, oscurece el mar y permite mover con dedo, puntero o teclado un haz circular o cónico. Barcos en silueta se aproximan desde direcciones y velocidades configurables; la bandera solo puede identificarse tras iluminarla el tiempo mínimo. Mezcla banderas pirata con señales deliberadamente parecidas, como ancla, calavera sin huesos o tela deteriorada, sin depender solo del color. El jugador pulsa ALARMA ante un pirata: un acierto lo hace retirarse; un barco normal debe llegar. La ronda termina al identificar cinco piratas o alcanzar el límite de tiempo, errores o barcos perdidos. Muestra feedback visual y sonoro para acierto, falsa alarma y escape, sin destellos peligrosos.
Implementa Cañón contra tiburones desde una localización administrable del mapa. El jugador orienta el cañón con arrastre táctil, puntero o teclado y ve una ayuda aproximada de trayectoria y zona de caída. Al disparar, la bola sigue un arco y salpica al tocar el agua. Los tiburones aparecen, se sumergen, reaparecen y cambian de dirección mediante patrones versionados. La partida termina al ahuyentar tres tiburones o agotar tiempo o munición. El impacto no muestra heridas: el tiburón gira, se asusta o se aleja. Ajusta la anticipación para que sea legible en móvil y no dependa de precisión de un solo píxel.
El servidor crea cada sesión con ID, juego, versión, semilla, configuración, hora de inicio y límites. El cliente comunica decisiones, disparos e impactos; el servidor comprueba secuencia, duración y resultados plausibles antes de crear una transacción idempotente. Admin define si la recompensa es única, diaria, por temporada o solo récord personal, con límites de puntos y monedas. Una práctica invitada puede guardarse localmente, pero no entra en ranking ni convierte un resultado enviado por el navegador en saldo verificado. Abandonar, ocultar la pestaña, recargar o cambiar la configuración invalida cualquier marca competitiva.
Desde Admin permite activar o desactivar cada minijuego, elegir su objeto o isla de acceso, textos ES y EN, assets, sonidos, dificultad, número y mezcla de objetivos, velocidad, tiempo, errores, munición, recarga, radio de impacto, recompensas, límites y disponibilidad por temporada. Incluye duplicado, previsualización privada, validación, publicación atómica y restauración. Los valores de una partida iniciada quedan congelados aunque se publique otra configuración.
Añade pausa y salida clara, instrucciones breves antes de jugar, áreas táctiles amplias, estado comprensible sin audio, control de volumen, alternativa de teclado, contraste suficiente y modos de movimiento reducido y luz atenuada. En Vigilancia del faro ofrece un patrón adicional a la bandera para no depender del color. Ninguno de los minijuegos bloquea Tickets, la misión de Fiestera o la navegación principal.
Integra el Faro como isla visible y visitable con Vigilancia del faro disponible y un panel editorial que explique la actividad. Sitúa Cañón contra tiburones en una localización coherente del boceto aprobado, sin obligar a completarlo para avanzar. Configura el destino de la misión por ID de temporada, estable para partidas empezadas. Ajusta y mide una ruta directa de aproximadamente un minuto y exploración principal de diez minutos; excluye carga, lectura, compras y minijuegos opcionales de larga duración.

## Conversion y contenidos
Implementa Tickets y eventos con evento prioritario, compra directa, fichas compartibles, enlace a isla, promociones y estados. Integra la ticketera elegida mediante un adaptador. Si los datos reales o la cuenta del proveedor no están disponibles, deja el adaptador probado con sandbox y un procedimiento exacto de activación; no simules compras reales en producción.
Las compras confirmadas vinculadas a una cuenta añaden el sello una vez. El QR es una vía alternativa para entradas externas, invitaciones o incidencias. Distingue sello de compra de asistencia comprobada y QR de promoción de QR de check-in. Reintentos y notificaciones duplicadas no duplican sellos ni recompensas. Los descuentos indican evento, fecha, condiciones y enlace; descubrir un código se premia una vez aunque se pueda compartir y copiar.
Construye la tienda con camisetas, tote bags, pegatinas y pack inicial como contenido administrable. Incluye variantes, disponibilidad, envío y recogida en evento. Integra checkout o adaptador y no almacenes datos de tarjeta. La promoción de WhatsApp debe reflejar la verificación que realmente exista.
Construye Personas detrás del sonido con tres tarjetas simultáneas, rotación equilibrada cada cinco segundos, sin duplicados, transición suave, pausa con foco y A a Z. Carga los 26 artistas provisionales de esta versión con avatar neutro cuando falten fotos; no inventes testimonios ni biografías de personas reales. Admin puede sustituirlos y vincular perfiles reclamables.
Integra Filosofía, actividades, galería general, álbumes por evento, fotos, vídeos, Instagram y contacto. Los eventos históricos muestran sus recuerdos desde la home de archivo y desde la isla. Los vídeos no bloquean la carga y todas las imágenes tienen texto alternativo o descripción editorial adecuada.

## Identidad progresion y comunidad
Completa invitado, registro por enlace de email, recuperación de acceso mediante nuevo enlace, Carnet BOIA, cinco preguntas públicas, avatar o foto, fecha de alta, rango, sellos, logros, puntos, monedas, barco y cosméticos. Invita a registrarse para conservar y compartir el progreso sin convertirlo en barrera.
Separa puntos de prestigio y monedas. Añade transacciones idempotentes y recompensas de una vez, por temporada o repetibles según la configuración. La personalización incluye color inicial, modelos, banderas, accesorios y estelas; no modifica física ni tiempos.
Completa Logros con conseguidos, pendientes, progreso, puntos y recompensas. Los avisos aparecen uno a uno durante cuatro segundos, arriba, con azul marino, naranja y sonido breve. Incluye rangos lúdicos configurables. Comprueba que los logros globales y concesiones masivas creados desde Admin aparecen correctamente a cuentas existentes y nuevas según su política.
Completa los rankings de puntos y circuito, con perfiles clicables, posición propia, versión de temporada o circuito y moderación. Las marcas globales requieren cuenta y validación; las prácticas invitadas pueden conservarse localmente.
Completa las botellas: una activa por cuenta, 140 caracteres, posición válida, lectura persistente, apodo, Ver su Carnet, edición o retirada propia y reporte. No dan puntos y no abren mensajes privados. Implementa la moderación y propagación de retiradas.
Utiliza las cinco preguntas públicas exactas de esta versión. No añadas listas de artistas vistos ni valoraciones públicas en los Carnets. Implementa aparte las encuestas voluntarias privadas definidas en 49, sin convertirlas en un ranking de artistas. Mantén preparada, sin exponer, la capa futura de hasta seis fotos personales por evento, privacidad configurable, mini blog y relaciones Bolleros.
Implementa los eventos de encuesta voluntaria y el icono persistente de misiones, con respuestas privadas y envío idempotente. Completa Mensajes de BOIA con avisos generales para todos, no leídos, programación, caducidad y marcas de lectura por invitado/cuenta. No introducir mensajes privados entre usuarios.
Implementa las invitaciones a crear Carnet antes de comprar, al cerrar fotos y tras cinco minutos o tres logros, con separación y límites configurables. Mantén Continuar sin registrarme y retorno al contexto después del enlace de email. Fusiona progreso por IDs y evidencia del servidor, sin importar saldos ni récords locales como competitivos.

## Panel Admin integrado
No rehagas el Admin como una herramienta aparte. Cada sistema público debe ser gestionable allí y usar las mismas entidades y validaciones. Comprueba expresamente:
- Crear, mover, escalar, cambiar imagen y configurar una isla sin código.
- Añadir o cambiar comportamientos de objetos y guardar plantillas.
- Editar spawn, rutas, circuitos, radios, colisiones, diálogos y recompensas.
- Editar y ordenar la home, evento prioritario, bloques y traducciones.
- Crear, finalizar y sustituir eventos sin borrar la isla ni su archivo.
- Crear logros globales, evaluar actividad anterior y conceder un logro de forma masiva sin duplicados.
- Crear perfiles oficiales y artistas sin cuenta, editarlos por completo, invitar a reclamarlos y editar cualquier Carnet con auditoría.
- Gestionar fotos, vídeos, música, tienda, descuentos, QR, botellas, reportes y textos.
- Configurar, previsualizar, publicar, desactivar y restaurar Vigilancia del faro y Cañón contra tiburones sin cambiar código, manteniendo versiones y partidas empezadas.
- Duplicar temporada, probarla, publicarla y volver a una revisión anterior.
Realiza una prueba de usabilidad del Admin con una persona que no haya escrito el código. Con assets y textos preparados, debe poder crear un evento, añadir o reutilizar su isla, comprobar la home y publicarlo en unos diez minutos después de una explicación breve. Registra dónde duda y corrige las fricciones importantes.
Verifica de forma específica las promociones de primera compra, pegatina con compra y códigos especiales de exclusivos; distingue compra y asistencia. Prueba encuestas, mensajes globales, ritmo de registro, segundo factor, doble confirmación y papelera. Comprueba también que Admin puede cambiar dificultad, assets, recompensas y disponibilidad de ambos minijuegos sin editar código ni alterar sesiones comenzadas. Estas comprobaciones y todos los criterios del apartado 49.15 forman parte de la entrega final.

## Calidad y pruebas finales
Prueba en iPhone y Android físicos de referencia y en escritorio. Documenta modelos, sistema, navegador, conexión y resultados. Evalúa joystick, segundo dedo, drift, fluidez, áreas táctiles, minimapa, paneles, rotación, audio, día y noche, cinemática, el haz y botón de alarma del faro, la puntería y disparo del cañón y el consumo de memoria. No declares perfecto un control que solo se haya probado con ratón o emulación.
Prioriza una revisión visual específica de la introducción y de todas las direcciones del barco. Reproduce y documenta cualquier pantalla en blanco, incluido el contexto de apertura. Si una prueba física o una integración no está disponible, declárala pendiente y conserva la alternativa comercial funcional.
La compra directa debe mostrar la isla y abrir el panel sin descargar el mundo completo ni iniciar una partida. Cargar primero el sector de destino o una vista ligera de esa misma isla; si el motor falla, mantener isla ilustrada y panel HTML funcional. La home debe ser utilizable rápidamente en una conexión y dispositivo definidos. Establece y mide presupuestos de carga; como base, alrededor de 1 MB comprimido para la home crítica y alrededor de 5 MB para el primer sector, sin canciones ni vídeos completos. Objetivo mínimo de navegación estable a 30 FPS en el dispositivo mínimo y 60 FPS en el de referencia, con reducción de efectos cuando sea necesario.
Prueba español e inglés, móvil corto, áreas seguras, scroll, teclado, foco, contraste, lector de pantalla en contenido editorial, zoom, movimiento reducido, audio desactivado, WebGL no disponible, conexión lenta, sin conexión, recarga, retorno desde checkout y pérdida de contexto gráfico.
Ejecuta pruebas de permisos para cada rol. Prueba acciones masivas con fallos parciales, reintentos y concurrencia. Verifica que no se duplican puntos, monedas, compras, sellos, logros, perfiles o botellas. Revisa que la dirección secreta de una secret location no se filtra en HTML, datos públicos o assets.
Realiza pruebas completas de ciclo de evento:
1. Publicar un evento futuro y comprobar su presencia en home, Tickets, mapa e isla.
2. Marcarlo agotado y comprobar que se informa sin ofrecer una compra inválida.
3. Finalizarlo y confirmar que desaparece de la venta, mantiene URL e isla y muestra fotos o recuerdo.
4. Vincular un evento nuevo a esa isla y comprobar que vuelve a la home con su propia compra, conservando el histórico anterior.
5. Cancelar y posponer eventos y comprobar textos, promociones, ticket y archivo.
Completa pruebas de aventura, economía, carrera, minijuegos, compra, Carnet, artistas, botellas, moderación, Admin, publicación y restauración. Corrige defectos críticos y altos. Un requisito parcial debe quedar visible en el seguimiento, no oculto detrás de un botón que no funciona.
Ejecuta para Vigilancia del faro partidas con cinco piratas, señuelos parecidos, falsa alarma, pirata perdido, pausa, pestaña oculta, cambio de configuración y movimiento reducido. Ejecuta para Cañón contra tiburones acierto y fallo de trayectoria, objetivo que se sumerge, tres impactos, munición agotada, pausa y controles táctiles. En ambos casos prueba repetición de la petición, resultado falsificado, sesión caducada, recompensa única y por temporada, invitado y cuenta, límites diarios y ausencia de duplicados. Documenta equilibrio, claridad y accesibilidad además del resultado técnico.

## Despliegue y entrega final
Prepara entornos de prueba y producción, dominio, HTTPS, caché con archivos versionados, backups, restauración, métricas de errores, alertas y límites de coste. Los servicios y cuentas de producción deben quedar bajo control de BOIA. Publica solo cuando Álvaro autorice expresamente los contenidos y las integraciones reales.
En la entrega incluye:
1. Repositorio y commit final exportable.
2. URL pública y URL Admin.
3. Manual breve para BOIA y manual técnico.
4. Acceso del propietario entregado de forma privada con cambio obligatorio de contraseña.
5. Catálogo de comportamientos, recursos y plantillas.
6. Migraciones, variables de entorno, integraciones y procedimiento de recuperación.
7. Resultados de pruebas automáticas y en dispositivos físicos.
8. Matriz de trazabilidad final con estado, satisfacción, evidencia y pendiente.
9. Lista exacta de contenido provisional o integración todavía no activada.
10. Copia de seguridad inicial y prueba documentada de restauración.
No des por terminada BOIA.PLANET hasta que la web directa, el mundo, la progresión y el panel Admin trabajen sobre los mismos datos publicados; el ciclo de eventos mantenga islas y recuerdos; los logros globales y perfiles puedan administrarse de forma segura; y cada requisito del documento maestro tenga una prueba o una desviación aprobada.

# Lista de control antes de entregar el proyecto a otra persona
- Documento maestro v14 adjunto.
- Resultado aprobado del Prompt 1.
- Repositorio y commit del Prompt 2.
- Migraciones y datos de prueba reproducibles.
- Variables de entorno de ejemplo sin secretos.
- Informe de pruebas y matriz de trazabilidad.
- Decisiones pendientes y contenidos provisionales identificados.
- Credenciales reales transmitidas solo por un canal privado.
- Instrucción clara de continuar sobre el mismo repositorio.
Los tres prompts forman una secuencia. El tercero termina el producto; no sustituye la revisión de arquitectura ni la construcción correcta del Admin realizadas antes.
