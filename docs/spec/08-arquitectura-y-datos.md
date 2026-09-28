# 08 · Arquitectura y datos

Fuente: v14 §24, §49.13 y los apartados de arquitectura, calidad y entrega de los Prompts 1 a 3; D-03, D-04, D-09 y D-10. El stack de D-04 se confirma o ajusta en un ADR y sólo cambia si una prueba lo contradice.

## Stack y módulos

La v14 separa MOTOR BOIA (movimiento, cámara, colisiones, proximidad, interacción, audio, economía, logros, usuarios y reglas), DATOS/EDITOR (mundo, objetos, eventos, triggers, temporadas y publicación), ARTE/ASSETS y PROGRESO DE USUARIO (§24). D-04 lo traduce a paquetes.

- **REQ-ARQ-001** `L1` — Montar un monorepo pnpm en TypeScript estricto con apps/web (Next.js App Router: landing, tickets, Carnet y Admin como grupo de rutas), packages/engine (PixiJS v8 y motor propio de comportamientos, sin Phaser), packages/world (esquema del mundo en zod) y packages/contracts. *Fuente: P2, D-04*
- **REQ-ARQ-002** `L1` — Usar Supabase (Postgres con RLS, Auth por email, Storage, Edge Functions para webhooks y validaciones, pg_cron para los estados de evento) y Vercel para apps/web. *Fuente: D-04*
- **REQ-ARQ-003** `L1` — Separar aplicación pública, Admin, motor, contratos, datos del mundo, reglas, adaptadores e infraestructura; ningún componente de UI escribe saldos, roles, sellos ni estados de compra. *Fuente: §24, P2*

Entorno de desarrollo (D-16, D-17): hasta que exista la biblioteca de assets del editor, la web sirve `art/` desde el repositorio y Storage entra con el editor. Esquema, migraciones (SQL plano en `supabase/migrations/`) y pruebas de RLS corren contra el PostgreSQL 17 local con un shim compatible con Supabase; Auth, Storage y Edge Functions se prueban contra un proyecto Supabase de desarrollo en la nube.

## Entidades

Entidades con ID estable y versión (P2). Las de L2 se diseñan sólo si omitirlas obligaría a migrar datos (D-02).

| Entidad | Qué guarda | Alcance |
|---|---|---|
| Cuenta e identidad anónima | Acceso privado: email, sesiones, factores; sesión anónima del invitado | L1 |
| Carnet | Identidad pública: apodo, avatar, fecha de alta, respuestas | L1 |
| Evento | Datos, estado, formato, ticket, descuentos, álbum | L1 |
| Isla | Objeto del mundo con historial de eventos | L1 |
| Objeto, asset, comportamiento, plantilla | Mundo modular de §48 | L1 |
| Mundo, revisión y temporada | Borrador, revisiones inmutables, versión activa, destino de misión | L1 |
| Home | Bloques y reglas de publicación | L1 |
| Logro y trigger | Condición, versión, recompensa | L1 |
| Transacción | Libro idempotente de puntos, monedas, logros, sellos y cosméticos | L1 |
| Compra y sello | Confirmación del proveedor, validez, sello en el Carnet | L1 |
| Descuento | Código, evento, fechas, condiciones, descubrimientos | L1 |
| Carrera | Récord por versión de circuito | L1 local; L2 global |
| Botella y reporte | Mensaje, posición, lecturas, moderación | L1 |
| Auditoría | Autor, fecha, motivo, valor anterior y nuevo | L1 |
| Encuesta, respuesta y mensaje de BOIA | Versiones, audiencia, lectura | L2 |
| Promoción, check-in y perfil oficial | Primera compra, WhatsApp, exclusivos, asistencia, reclamación | L2 |
| Sesión de minijuego | ID, juego, versión, semilla, configuración, límites | L2 |

- **REQ-ARQ-004** `L1` — Dar ID estable y campo de versión a cada entidad de la tabla, diseñando las de L2 sólo si omitirlas obligaría a migrar datos. *Fuente: P2, D-02*
- **REQ-ARQ-005** `L1` — Escribir migraciones acumulativas que nunca reinician datos y corren igual desde una base vacía que sobre una con datos. *Fuente: P2*
- **REQ-ARQ-006** `L1` — Etiquetar los datos de ejemplo como muestra, con un procedimiento para eliminarlos o sustituirlos, y versionar variables de entorno de ejemplo sin secretos. *Fuente: §33, P2*
- **REQ-ARQ-007** `L1` — Registrar toda concesión de puntos, monedas, logros, sellos y cosméticos como transacción idempotente con ID estable, de modo que reintentos, concurrencia y fallos parciales no dupliquen nada; una corrección es una compensación, nunca un borrado. *Fuente: §49.1, P1, P2, P3*
- **REQ-ARQ-008** `L1` — Conservar entre temporadas cuenta, Carnet, sellos, cosméticos, puntos históricos y preferencias, y guardar misión, descubrimientos y puntuación de temporada en el ámbito de su temporada. *Fuente: §28, P1*
- **REQ-ARQ-009** `L1` — Guardar en la auditoría autor, fecha, motivo, valor anterior y valor nuevo de cada corrección sensible. *Fuente: §49.2, §49.13, P2*

## Invitado, seguridad y antitrampas

El invitado juega con progreso local y una identidad anónima de servidor; al registrarse se fusiona por IDs (REQ-IDE-004 a REQ-IDE-006). Para una comunidad de cientos de personas no se construye validación por repetición de decisiones (D-09).

- **REQ-ARQ-010** `L1` — Conceder las recompensas del mundo desde el servidor con sesión firmada y límites de plausibilidad (tiempo mínimo por logro, cadencia máxima de recogidas), sin validación por repetición de decisiones. *Fuente: §21, D-09*
- **REQ-ARQ-011** `L1` — Separar la identidad pública del Carnet del acceso privado (email, sesiones y factores). *Fuente: §49.13, P1, D-10*
- **REQ-ARQ-012** `L1` — No renderizar HTML de usuarios; proteger formularios y APIs con límites, comprobación de origen y defensa frente a repetición; guardar los secretos en configuración segura, enmascarados, y nunca en cliente, logs, repositorio ni ejemplos. *Fuente: §49.9, P2*
- **REQ-ARQ-013** `L1` — Definir la conservación mínima de registros de compras y auditoría, la anonimización y el tratamiento en copias, de modo que una restauración no vuelva a publicar contenido retirado [pendiente Álvaro]. *Fuente: §49.13, P1*

## Rendimiento

- **REQ-ARQ-014** `L1` — Cumplir un presupuesto de 1 MB comprimido para la home crítica y de 5 MB para el primer sector, sin canciones ni vídeos completos, medido en la conexión y el dispositivo de referencia [pendiente Hernán]. *Fuente: P3*
- **REQ-ARQ-015** `L1` — Navegar estable a 30 FPS en el dispositivo mínimo y a 60 FPS en el de referencia, reduciendo efectos cuando haga falta [pendiente Hernán]. *Fuente: P3*

## Calidad y pruebas

- **REQ-ARQ-016** `L1` — Probar móvil corto, áreas seguras, scroll, teclado, foco, contraste, lector de pantalla en contenido editorial, zoom, movimiento reducido, audio desactivado, WebGL no disponible, conexión lenta, sin conexión, recarga, retorno desde el checkout y pérdida de contexto gráfico. *Fuente: P3*
- **REQ-ARQ-017** `L1` — Probar en iPhone y Android físicos y en escritorio joystick, segundo dedo, drift, fluidez, áreas táctiles, minimapa, paneles, rotación, audio, cinemática y memoria, registrando modelo, sistema, navegador, conexión y resultado; ningún control se da por bueno probado sólo con ratón o emulación. *Fuente: §4.4, P3*
- **REQ-ARQ-018** `L1` — Escribir pruebas unitarias, de integración y de permisos desde el principio, con repetición, concurrencia y fallo parcial en las operaciones críticas, datos de prueba independientes y ningún pago real. *Fuente: P2, P3*

## Operación y entrega

- **REQ-ARQ-019** `L1` — Medir el embudo con PostHog en la nube UE con los eventos landing_view, explore_start, discount_found, tickets_panel_open, ticket_click_out y purchase_confirmed, este último emitido sólo desde el webhook de la ticketera. *Fuente: D-04*
- **REQ-ARQ-020** `L1` — Preparar i18n por claves desde el principio y publicar el contenido sólo en español. *Fuente: P2, D-03*
- **REQ-ARQ-021** `L2` — Añadir inglés: traducción del contenido administrable, resolución automática del idioma y selector en Ajustes. *Fuente: §4.1, §20, §47-B, D-02, D-03*
- **REQ-ARQ-022** `L1` — Preparar entornos de prueba y producción con HTTPS, caché con archivos versionados, métricas de errores, alertas y límites de coste. *Fuente: P3*
- **REQ-ARQ-023** `L1` — Hacer copias de seguridad y una prueba documentada de restauración antes de publicar. *Fuente: §49.18, P3*
- **REQ-ARQ-024** `L1` — Entregar repositorio exportable, URL pública y del Admin, manual para BOIA y manual técnico, catálogo de comportamientos, recursos y plantillas, migraciones, variables de ejemplo, integraciones, procedimiento de recuperación, resultados de pruebas y lista de contenido provisional o integración no activada. *Fuente: §50, P3*
