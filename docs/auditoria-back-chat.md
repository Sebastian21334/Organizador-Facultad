# Auditoría de backend y módulo chat — Fase 2

Fecha de revisión: 9 de octubre de 2026 (Argentina). Revisión de código y ejecución local, sin cambios de implementación durante esta fase. No se leyeron secretos ni archivos `.env`. No se hicieron commits.

## Alcance y arquitectura observada

Se revisaron los módulos Nest de autenticación, seguridad, usuarios, límites, materias/planes, tareas/recordatorios, mensajes, IA, correo y push; las entidades, DTO, repositorios y pruebas; y las páginas, proxy, rutas de API y estilos de Next en `Modulo chat`. Se conserva la separación actual controller → service → repository y app/lib/components del chat. No se encontró un `AGENTS.md` dentro de estos módulos ni un archivo explícito de estructura. La estructura existente es la referencia provisional: no mover carpetas ni consolidar proyectos.

## Verificación basal

- Backend: `npm run build` pasó.
- Backend: `npm test -- --runInBand` pasó: **17 suites, 121 pruebas**. Se usan proveedores simulados y PostgreSQL efímero PGlite, sin escribir en una base real.
- Sandbox Windows: Jest falló inicialmente por `EPERM realpath` en temporales; repetir fuera del sandbox, mediante la revisión automática de aprobación, permitió terminar. No fue un fallo de código.
- Chat: compilación inicial bloqueada por `Acceso denegado` de Turbopack al canonicalizar la carpeta; la repetición fuera del sandbox pasó: compilación, verificación TypeScript y generación de rutas completadas.
- No se afirma cobertura porcentual: la ejecución basal no recogió cobertura. El inventario sí permite identificar flujos sin pruebas directas.

## Hallazgos priorizados

P1: corregir antes de entrega por pérdida de intención, datos incorrectos o barrera importante. P2: corregir en esta iteración cuando el esfuerzo sea acotado. P3: recomendación posterior o limpieza menor. No se encontró una vulnerabilidad crítica demostrada en esta revisión.

| ID | Prioridad / impacto / esfuerzo | Evidencia y caso concreto | Corrección propuesta |
| --- | --- | --- | --- |
| B01 | P1 / alto / medio | `back/src/tareas/controllers/tareas.controller.ts:95`, `:96`; `services/tareas.service.ts:201`: PATCH solo propaga fecha/materia truthy. Elegir «sin materia» o quitar fecha en el front da éxito sin quitar el dato anterior. | Acordar `null` explícito para eliminar y `undefined` para conservar; tipos/DTO/controller/service coherentes. Prueba HTTP del contrato y protección de propiedad. |
| B02 | P1 / alto / medio | `back/src/mensajes/services/mensajes.service.ts:102`; `back/src/ia/services/ia.service.ts:111`: la IA usa hoy UTC y convierte un día a medianoche UTC. Reproducción local: `2026-10-09` se muestra en Argentina como **8/10/26 21:00**. Después de las 21:00 también cambia «hoy» prematuramente. | Mantener ISO de instantes; calcular hoy en Argentina y convertir una fecha IA sin hora a fin de ese día en Argentina. Front muestra y edita local. Documentar política y no alterar históricos sin conocer su origen. |
| B03 | P1 / alto / medio | `back/src/mensajes/services/mensajes.service.ts:148–172`: inclusión de strings y fuzzy match confunden niveles y empates. Reproducción sobre el servicio compilado: «Álgebra II» con única materia «Álgebra I» selecciona Álgebra I; dos candidatos a igual distancia seleccionan el primero. | Resolver coincidencias de forma conservadora: igualdad normalizada primero, respetar identificadores de nivel y rechazar candidatos ambiguos; pedir aclaración. Tests de I/II, números, empate y acentos. |
| B04 | P1 / alto / medio | `back/src/tareas/repositories/tareas.repository.ts:66` limita a 100 filas, pero `services/tareas.service.ts:61` descarta todavía-no-debidas después. Cien tareas próximas con recordatorio de 1 min pueden ocupar el lote y ocultar otra posterior con recordatorio de 30 días ya debido. | Filtrar el momento real del aviso en SQL antes del límite, ordenar por momento de aviso y probar con >100 futuras y una ya debida. |
| B05 | P1 / alto / bajo | `Modulo chat/app/chat/chat-client.tsx:25`: logout espera fetch pero no comprueba `ok`; `/api/auth/logout` sí conserva cookie al error. La UI se va a login con sesión todavía vigente. | Comprobar resultado; mantener pantalla y mostrar error si falla; bloquear doble click, comunicar carga; navegar solo tras cierre confirmado. |
| B06 | P1 / alto / bajo | `Modulo chat/app/layout.tsx:7` fija `userScalable:false`. Impide ampliar texto en navegadores que respetan esta directiva. | Permitir zoom; verificar viewport móvil y 200 % de ampliación. |
| B07 | P2 / medio-alto / bajo | `back/src/mensajes/services/mensajes.service.ts:53`, `:137` consulta `buscarPorUsuario` con límite por defecto 100. Ya existe `buscarTodasPorUsuario` para planes. Materias fuera de la primera página no pueden resolverse pese a existir. | Consultar todas para resolver; mantener entrada del modelo acotada; probar materia #101. |
| B08 | P2 / medio-alto / bajo | `Modulo chat/app/chat/chat-client.tsx:22`; `back/src/mensajes/repositories/mensajes.repository.ts:21`: servidor devuelve recientes primero, UI los dibuja igual pero añade nuevos al final. Historial queda en orden mixto y no se pueden consultar mensajes >100. | Mostrar cronología ascendente dentro de cada página; botón cargar anteriores con offset/límite y estados; proteger respuesta de historial que llegue después del envío. |
| B09 | P2 / medio-alto / medio | `Modulo chat/app/chat/chat-client.tsx:24`: vacía input antes de enviar, borra solo burbuja pendiente al error y pierde texto editable. No trata 401 de POST y no limita 4000 caracteres en UI. | Conservar/restaurar borrador, representar fallo de envío, pedir nuevo login al 401, limitar y describir máximo; evitar sobrescribir texto nuevo si la solicitud anterior falla. |
| B10 | P2 / medio / bajo | `Modulo chat/app/globals.css:66`, `:75–82`; `chat-client.tsx:23`: compositor quita outline sin foco alternativo; movimiento infinito y smooth scroll no respetan reduced-motion; botones icono de tamaño reducido. | `focus-visible` perceptible, foco del contenedor, objetivos al menos 44 px, reduced-motion en CSS y scroll; log/status accesible para llegada y procesamiento de mensajes. |
| B11 | P2 / medio / bajo | `Modulo chat/app/globals.css:6`, `:28`, `:34`, `:67`: `--label:#a69577` se usa en texto pequeño sobre fondos crema claros. Contraste insuficiente para lectura normal. Texto/URLs largos no tienen protección de wrap. | Oscurecer token secundario, medir ratio sobre cada fondo, `overflow-wrap:anywhere` y tamaños móviles. |
| B12 | P2 / medio-alto / medio | `back/src/tareas/services/tareas.service.ts:169`: reprogramación borra envío pero mantiene `recordatorioIntentoId` y `recordatorioBloqueadoHasta`. Un intento anterior aún puede marcar enviada la nueva programación o bloquearla 15 min. | Invalidar intento y reserva al cambiar fecha/anticipación; reclamar solo tareas todavía elegibles; prueba de finalización vieja tras reprogramar. |
| B13 | P2 / medio / alto | `back/src/mensajes/services/mensajes.service.ts:43`, `:97`, `:115`: guardar mensaje, tarea y vínculo son escrituras separadas. Si falla la última, queda tarea creada sin resultado y reintentar texto puede duplicarla. | Posterior: operación final transaccional e idempotencia por solicitud, conservando entrada original como registro; sin mantener transacción abierta durante llamada IA. Requiere diseño de contrato, no solo retry automático. |
| B14 | P2 / medio / medio | `back/src/auth/guards/seguridad.guard.ts:93–97`; `Modulo chat/app/api/auth/login/route.ts:10`: usuarios Next comparten IP saliente del proxy y cuota auth-IP 20/10 min. Depende del despliegue, puede limitar múltiples usuarios como si fueran uno. | Diseñar identidad confiable del proxy o limitar en borde; nunca confiar sin validar en un X-Forwarded-For arbitrario. Mantener límite por email y global. Verificar topología antes de modificar. |
| B15 | P2 / medio / bajo | `back/src/ia/services/ia.service.ts:112` no explicita `store:false` en extracción de tareas, a diferencia del plan en `:202`. | Explicitar misma minimización de datos en ambos tipos de extracción y probar opciones enviadas al proveedor. |
| B16 | P3 / medio / medio | Migraciones existentes tienen índice de recordatorios, pero no documentan índices compuestos de propietario + orden para listados materias/tareas/mensajes. Consultas frecuentes filtran usuario y ordenan fecha/nombre. | Medir planes de consulta con cardinalidad representativa; luego migraciones de índices alineadas a consultas. No inventar mejora de rendimiento sin EXPLAIN ni tocar base real. |
| B17 | P3 / bajo-medio / bajo | `back/README.md` conserva plantilla Nest y `back/package.json:20` referencia `test/jest-e2e.json`, archivo no existente. `Modulo chat/package.json:5` no ofrece test/lint ni README de ejecución. | Documentar comandos reales, puertos/configuración sin secretos y estrategia de pruebas. No mover carpetas ni duplicar herramientas sin necesidad. |
| B18 | P3 / bajo-medio / bajo | `Modulo chat/app/chat/chat-client.tsx` concentra estados, requests, conversiones y JSX en líneas enormes; `fromIncoming(item:any)` acepta cualquier payload. Backend `capitalizar` privado está sin uso, imports de operadores TypeORM sin uso. | Formatear, tipos explícitos, helpers locales y funciones de responsabilidad concreta dentro de carpetas existentes; evitar extraer arquitecturas por estética. |

## Seguridad y decisiones que ya están bien

- Sesiones HttpOnly, CSRF por origen y token, emisor/audiencia/algoritmo JWT explícitos y revocación por versión en base. Hash de token de recuperación de un solo uso; comparación de contraseña antes de verificar correo.
- Filtros de propietario en consultas y actualizaciones, whitelist de DTO y segunda whitelist interna en servicios; pruebas de relaciones entre cuentas.
- Límites atómicos compartidos por SQL, cuotas IA/email, concurrencia de proveedor y timeouts; límites de tamaño JSON; validación estructural y semántica de respuesta IA.
- Importación del plan transaccional con bloqueo por cuenta; normalización que conserva niveles I/II. Esta precaución falta en resolución de materias del chat (B03).
- Email escapa contenido y muestra zona; push valida hosts/HTTPS antes de enviar y maneja 404/410; detalles internos no salen por respuestas de error.
- CSP con nonce en Next, respuestas privadas no-store, cookies host-only en producción y sin JWT expuesto al JavaScript cliente.

No se recomienda debilitar estas protecciones para facilitar una demostración local. Tampoco arrancar la app real con secretos de producción si eso activa correos/recordatorios.

## Huecos de pruebas

Hay pruebas fuertes de auth, DTO, CSRF, límites SQL, push, correo y planes. Faltan pruebas directas del flujo `MensajesService` (resolución, >100 materias, umbral, cuotas, fecha), de reprogramación/anulación en `TareasService`, selección SQL de recordatorios ya debidos y del comportamiento React/rutas Next. Las cuatro pruebas `security.next.spec.ts` comprueban utilidades del proxy, no logout/envío UI ni los handlers completos.

Pruebas prioritarias para fase 5: PATCH con null y rechazo de null en campos no anulables; fecha IA cerca de medianoche UTC; niveles I/II y empate; materia posterior a #100; reservas obsoletas; selección de recordatorios; historial cronológico, conservar borrador, cierre fallido y 401; teclado/reduced-motion/contraste en tres tamaños.

## Decisiones propuestas para ejecución

1. Conservar carpetas existentes. Tests junto a servicios/repositorios que cubren; documentación en docs.
2. Adoptar ISO de instante como contrato API. Fecha IA sin hora es vencimiento inclusivo al fin del día en Argentina. No reinterpretar registros históricos automáticamente.
3. `null` elimina campos anulables; omisión conserva. Front y back deben cambiar juntos.
4. Corregir P1 y P2 acotados; B13/B14/B16 requieren diseño o evidencia adicional y se dejan explícitos si no se resuelven.
5. Cualquier prueba en vivo con backend simulado se identifica como tal; no afirmar validación de proveedores ni DB remota.


## Hallazgo adicional al preparar la ejecución aislada

**B19 — P2, impacto medio/alto, esfuerzo medio:** las migraciones disponibles comienzan modificando tablas `usuarios`/`tareas` ya existentes; falta una migración o snapshot de creación inicial. `AppModule` conserva `synchronize: false`, correcto para proteger datos, pero una base vacía no puede reproducir el entorno sólo con las migraciones actuales. Documentar y verificar un baseline compatible antes de agregar una migración inicial. No se creó una migración que pudiese chocar con instalaciones existentes.
