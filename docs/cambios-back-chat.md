# Cambios de backend y módulo chat — Fase 3

Fecha: 9 de octubre de 2026 (Argentina). Sin commits. Se respetaron carpetas y módulos existentes; nuevos archivos de lógica/prueba se agregaron dentro de `lib` y de los servicios existentes. Guía aplicada: `docs/ui-ux-guidelines.md`.

## Registro para integrar en CAMBIOS.md

| Archivos | Qué se cambió | Por qué y principio que aplica |
| --- | --- | --- |
| `back/src/tareas/entities/tarea.entity.ts`, `dto/crear-tarea.dto.ts`, `controllers/tareas.controller.ts`, `services/tareas.service.ts` | Tipos anulables y propagación explícita de null para fecha/materia; omisión sigue conservando datos. | Un formulario debe respetar la intención de quitar un dato. Contratos explícitos: ausencia y valor vacío tienen significados distintos. No se relajan título/estado ni controles de propietario. |
| `back/src/tareas/services/tareas.service.ts`, `repositories/tareas.repository.ts` | Reprogramar invalida intento/reserva; reclamar compara fecha/anticipación leídas; selección SQL incluye únicamente avisos ya debidos antes de aplicar el límite de 100. | Integridad ante concurrencia y paginación: filtrar después de limitar puede ocultar trabajo válido. Un intento antiguo no debe confirmar una programación nueva. |
| `back/src/ia/services/ia.service.ts`, `back/src/mensajes/services/mensajes.service.ts` | Hoy se calcula en zona de Argentina. Fecha IA sin hora se convierte a 23:59:59.999 del día indicado, con offset -03. Se agrega `store:false` al pedido de extracción de tarea. | Distinguir fecha civil de instante. Evitar vencimientos en el día anterior y minimizar datos enviados para almacenamiento del proveedor. No se reinterpretan históricos. |
| `back/src/mensajes/services/mensajes.service.ts` | Resolución consulta todas las materias; igualdad normalizada precede aproximaciones; niveles I/II/1/2 incompatibles y empates exigen aclaración. Se elimina helper privado sin uso. | Una coincidencia dudosa nunca debe enlazar una tarea a otra materia. Conservadurismo en automatización y eliminación de código muerto. La entrada del modelo mantiene su límite de tamaño. |
| `Modulo chat/lib/chat.ts` | Tipos, validación de payloads consumidos, error con estado HTTP, conversión cronológica, combinación de páginas sin duplicar y logout que sólo resuelve si el servidor confirma. | Separar lógica comprobable de renderizado; tratar respuestas externas como datos y evitar éxito falso. |
| `Modulo chat/app/chat/chat-client.tsx` | Historial de 50 mensajes con carga anterior; cronología consistente y posición de lectura conservada. Carga/error/vacío separados, reintento visible, formulario espera la carga inicial. | Visibilidad del estado y consistencia temporal. Paginación explícita evita ocultar silenciosamente datos y carreras con la carga inicial. |
| `Modulo chat/app/chat/chat-client.tsx` | Fallo conserva el texto y marca envío no confirmado; respuesta antigua no pisa un borrador nuevo. Mensaje 401 ofrece volver al login conservando texto en pantalla; no hay reenvío automático. Logout muestra error si no se confirmó y bloquea doble click. | Recuperación de errores sin perder trabajo y feedback veraz. Un reintento automático podría duplicar una tarea si se perdió sólo la respuesta. |
| `Modulo chat/app/chat/chat-client.tsx`, `app/globals.css`, `app/layout.tsx` | Zoom habilitado, foco visible, región de mensajes con nombre/log, feedback textual de procesamiento, controles táctiles de 44 px, movimiento reducido CSS/JS, contraste secundario más alto, wrapping y compositor en el flujo flex con altura dinámica. | Accesibilidad operable y perceptible. El área para escribir ya no tapa mensajes o errores al crecer y el texto largo puede refluir. Se conserva paleta y familias tipográficas. |
| `Modulo chat/app/chat/chat-client.tsx`, `app/globals.css`, `app/layout.tsx` | Formateo de código antes comprimido en líneas enormes, sin mover responsabilidades a nuevas carpetas. | Legibilidad: cada estado y rama se puede revisar, comentar y localizar. |
| `back/src/mensajes/services/mensajes.service.spec.ts`, `back/src/ia/services/tareas-ia.spec.ts`, `back/src/tareas/services/tareas.service.spec.ts` | Nuevas regresiones de fecha local/UTC, materias >100, niveles/empates, confianza/cuota, null/omisión y reservas. | Probar reglas de negocio y escenarios que originaron bugs, no sólo que un método fue llamado. |
| `back/src/auth/controllers/seguridad.http.spec.ts`, `back/src/usuarios/repositories/seguridad.repository.spec.ts` | Pruebas con DTO/auth HTTP y SQL PostgreSQL efímero: null permitido donde corresponde, filtro antes del límite y reserva obsoleta. | Verificar límites entre capas; mocks puros no detectan SQL inválido o metadatos de validación rotos. |
| `Modulo chat/lib/chat.test.mjs`, `Modulo chat/package.json` | Suite de Node nativa y script `npm test`; tipo módulo explícito. | Pruebas útiles sin incorporar otro framework/dependencia. |
| `back/package.json`, `back/README.md`, `Modulo chat/README.md` | Comando HTTP de tests reemplaza referencia a configuración inexistente. README describe ejecución/configuración, alcance de mocks y contratos. | Reproducibilidad y documentación honesta; ninguna credencial se publica. Se documenta falta de baseline inicial de DB en lugar de habilitar sincronización peligrosa. |

## Verificación al terminar fase 3

- Backend `npm run build`: **PASS**.
- Backend `npm test -- --runInBand`: **20 suites, 136 pruebas PASS** (basal: 17 suites, 121).
- Backend comando reparado `npm run test:e2e`: **3 suites HTTP, 28 pruebas PASS**.
- Chat `npm test`: **8 pruebas PASS**, sin tráfico real.
- Chat `npm run build`: **PASS**, compilación, chequeo TypeScript y todas las rutas generadas. Se repitió tras las últimas modificaciones de utilidades/configuración.
- Jest y Turbopack requieren salir del sandbox Windows por errores de canonicalización/realpath. La revisión automática permitió esas verificaciones locales. No se cambió la configuración de seguridad del producto.
- La revisión visual y Lighthouse pertenecen a fase 4; estos builds/tests no la sustituyen.

## Pendientes explícitos

- B13: idempotencia y transacción de la creación final de tarea/vínculo del mensaje. Corregir requiere acordar el contrato de reintento y no mantener una transacción abierta durante IA. No se reintenta automáticamente.
- B14: cuotas de IP detrás del proxy Next. Se necesita conocer topología y una identidad de origen verificable; no se confía en cabeceras arbitrarias.
- B16: índices adicionales de listado. Requieren EXPLAIN y cardinalidad representativa antes de migrar una base real.
- B19: baseline del esquema inicial, ausente en migraciones. Documentado; no se inventó una migración incompatible con bases existentes.
- Persisten carreras inevitables después de que un proveedor haya aceptado un envío: reprogramar una tarea no puede retirar un correo ya enviado. La nueva invalidación sí impide que ese intento marque como enviada la programación nueva.
- Los registros de fecha históricos pueden haber mezclado UTC civil e instantes. No se modificaron porque falta evidencia de la intención original.

## Revisión posterior a la primera implementación

- DTO de tarea: fecha ISO estricta con fecha real, hora y zona explícita (Z u offset). Se rechazan 31 de febrero, fecha sin hora y hora sin zona antes de construir Date. Pruebas POST/PATCH verifican ISO Z/offset equivalentes y mantienen null para quitar la fecha.
- Reserva de recordatorio: el UPDATE vuelve a consultar la preferencia actual del usuario mediante EXISTS; si deshabilitó avisos, dejó de estar verificado o la anticipación nueva todavía no corresponde, no se reserva el envío basado en una lectura vieja.
- Resultado posterior: backend build PASS y 20 suites / 143 pruebas PASS.
- Aclaración de escala: se consultan todas las materias para resolver la respuesta; el contexto enviado al modelo sigue limitado a las primeras 100 por costo/tamaño. No se afirma que la IA reciba todos los nombres.
- Fuentes Next: reutilizadas las mismas tres fuentes WOFF2 y sus licencias OFL ya presentes en el front, dentro de public/fonts. La medición inicial con font-display swap mostró desplazamientos; se adoptó optional con precarga de Sora/Fraunces para evitar cambiar la métrica del texto cuando la fuente llega tarde. CLS final 0 en las cuatro mediciones. CSP ya no autoriza dominios de fuentes ajenos.
- Revisión visual detectó que animar con opacidad todas las filas del historial las hacía temporalmente ilegibles. Se eliminó esa entrada ornamental y se posiciona el historial inmediatamente al abrirlo; reduced-motion también gobierna scroll provocado por mensajes nuevos.
- Lighthouse detectó una petición favicon.ico 404. Metadata ahora declara el icono y apple icon existentes, evitando ese error de recurso.
- Verificación adicional a 320 px y texto 200 % encontró que el botón de cierre quedaba fuera de pantalla: la cabecera ahora puede envolver sus grupos. Los contenedores de etiquetas sr-only tienen referencia de posición para no ampliar accidentalmente la altura del documento.
- Flujos de navegador finales: 30 capturas, 15 comprobaciones en móvil/tablet/escritorio, cero violaciones axe detectadas y cero errores JavaScript. Reflow/texto ampliado: 4 estados adicionales sin desbordamiento de controles ni hallazgos axe. Tab/Enter recorren login, región desplazable, compositor, envío y cierre de sesión.

## Cierre de fases 5 y 6

- Ambas fases repitieron build y suite completa por aplicación: backend 20 suites/143 pruebas PASS, chat 8 pruebas PASS y builds PASS. Informes: `docs/fase-5-back-chat.md` y `docs/fase-6-back-chat.md`, con registros `.txt` incluidos en el diff.
- `docs/evidencia-chat/*.cjs` y su README conservan fixture, navegación, teclado, reflow y Lighthouse reproducibles. Usan datos ficticios y dependencias aisladas en `.tmp/qa`; ninguna credencial real. Buena práctica: poder repetir la evidencia y declarar su alcance, no entregar sólo una puntuación.
- Revisión final de contratos, carreras y estados completada; comprobación de whitespace sin errores. Servidores propios de QA cerrados. No se modificó arquitectura ni se hicieron commits.
