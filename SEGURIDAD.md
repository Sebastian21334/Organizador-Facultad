# Seguridad de Tempo

Implementación: 5 de octubre de 2026. Se mantuvieron los módulos y la organización de controllers/services/repositories/dto/entities del backend. No se ejecutaron migraciones ni se modificaron secretos o datos de la base real.

## Antes de desplegar: obligatorio

Esta actualización **no se debe publicar como un cambio de frontend aislado**: la nueva sesión requiere el backend actualizado y la migración. Preparar una ventana de mantenimiento para retirar las instancias anteriores y desplegar ambas partes coordinadamente.

1. Crear un snapshot/backup de PostgreSQL y comprobar el procedimiento de restauración del proveedor.
2. Configurar las variables del backend a partir de `back/.env.example`. `NODE_ENV` y `FRONTEND_URL` ahora son obligatorias. En producción, `NODE_ENV=production` y las URLs del frontend deben usar HTTPS. La configuración local anterior no incluía `FRONTEND_URL`: agregarla antes de arrancar.
3. Revisar la conexión TLS de PostgreSQL. Por defecto se verifica el certificado. Neon con certificado público debería funcionar con las CA del sistema; si el proveedor utiliza una CA privada, configurar `DB_SSL_CA` con su PEM, no desactivar la verificación. Runtime y migraciones usan la misma política. `DB_SSL=false` solo se permite en desarrollo.
4. Revisar cookies, CORS y proxy según los apartados siguientes.
5. Comprobar que no haya cuentas con el mismo email diferenciadas únicamente por mayúsculas/minúsculas. La migración crea un índice único sobre `LOWER(email)` y falla si encuentra duplicados, sin fusionar ni eliminar cuentas. Resolverlos manualmente antes de continuar.
6. Ejecutar desde `back`: `npm ci`, `npm run build`, `npm test -- --runInBand` y, con la configuración de la base correcta, `npm run migration:run`. Este último comando modifica la base: no fue ejecutado sobre la base real durante este trabajo.
7. Desplegar el backend y generar/publicar el frontend con `npm ci` y `npm run build` desde `front`. Verificar login, recarga, logout, registro/verificación, recuperación y permisos con dos cuentas de prueba.

La migración `1791200000000-SeguridadSesionesYLimites.ts` agrega campos de sesión/tokens, una tabla de límites, reservas de recordatorios e índices. Si ya había una tarea relacionada con una materia de otra cuenta, elimina **solo ese vínculo**; conserva la tarea y la materia. Esa reparación no se revierte al bajar la migración. Las migraciones anteriores de recordatorios también deben estar aplicadas.

Todos los JWT y enlaces de correo de la versión anterior dejan de ser aceptados. Los usuarios deben iniciar sesión nuevamente; quienes tengan enlaces viejos pueden solicitar otros desde Login. No se borran sus cuentas ni sus tareas.

## Variables y despliegue

- `JWT_SECRET`: secreto aleatorio de al menos 32 bytes. La longitud se valida, pero eso no demuestra aleatoriedad. Mantenerlo en el gestor de secretos del proveedor, nunca en Git ni en el frontend.
- `FRONTEND_URL`: URL de Tempo usada para los enlaces de correo. No debe contener credenciales, parámetros ni fragmentos.
- `FRONTEND_URLS`: orígenes autorizados, separados por comas. Se comparan orígenes completos, no subcadenas ni comodines. Incluir el frontend Angular y, si se usa, el chat Next.
- `COOKIE_SAME_SITE=lax`: recomendado si frontend y API comparten sitio, por ejemplo `tempo.example` y `api.tempo.example`, o si se usa un proxy del mismo origen. No basta con que ambos usen HTTPS para que sean el mismo sitio.
- `COOKIE_SAME_SITE=none`: para frontend y API en sitios distintos. Requiere producción/HTTPS; la cookie se marca también como particionada para navegadores compatibles. Sigue exigiendo origen autorizado y CSRF. Algunos navegadores o políticas pueden bloquearla: comprobarlo en navegadores reales. Un proxy del mismo origen o dominios del mismo sitio es la alternativa más robusta. No volver a guardar JWT en `localStorage` como solución.
- `TRUST_PROXY`: lista de IPs/rangos CIDR de proxies conocidos. Sin esta configuración, no se confía en `X-Forwarded-For` enviado por clientes. Nunca usar `true` ni un número de saltos a ciegas. Verificar con el proveedor la cadena real y que el proxy elimine/sobrescriba cabeceras falsificadas. Si todos los usuarios aparecen con la IP del proxy, compartirán el límite por IP; **comprobar esto antes de publicar**. No se inventaron rangos de Render.

El backend falla al arrancar si faltan variables críticas, si el secreto es corto o si la configuración de producción es insegura. No se usó la configuración real para iniciar un servidor durante las pruebas.

## Sesiones, recuperación y registro

- Angular ya no persiste el JWT: la cookie es `HttpOnly`, `Secure` en producción, sin `Domain`, con `Path=/` y prefijo `__Host-` en producción. La duración es de 24 horas.
- El navegador recibe únicamente la cookie al iniciar sesión. Los clientes servidor-a-servidor sin `Origin`, como el proxy Next, conservan la respuesta Bearer. No se adjuntan cookies, Authorization ni CSRF a orígenes externos desde Angular.
- El JWT debe tener propósito `session`, algoritmo HS256, emisor/audiencia previstos, vencimiento, identificadores válidos y versión de sesión coincidente con PostgreSQL. El usuario debe existir y tener su email verificado.
- `/auth/session` restaura el estado desde el servidor y entrega un CSRF ligado a esa sesión. Las rutas privadas esperan esa comprobación. Las escrituras con cookie requieren origen autorizado y el encabezado CSRF correcto. Los endpoints públicos aceptan JSON y comprueban el origen cuando está presente.
- Logout revoca **todas las sesiones de la cuenta**, no solo elimina una credencial del navegador. También lo hacen el cambio y la recuperación de contraseña. Una copia anterior del JWT deja de funcionar.
- Los enlaces de correo ya no son JWT: usan 32 bytes aleatorios y solo su hash SHA-256 se guarda en la base. Verificación: 24 horas. Recuperación: una hora. Solicitar otro reemplaza el anterior; consumirlo es atómico y de un solo uso.
- Confirmar una cuenta exige el enlace **y la contraseña elegida al registrarse**. Evita legitimar accidentalmente una cuenta pre-registrada por otra persona y que un escáner de correos consuma el enlace al abrirlo. Si no se reconoce esa contraseña, se puede recuperar el acceso por email y elegir una nueva.
- Registro, reenvío y recuperación usan respuestas genéricas. Registrar nuevamente un email existente no cambia su contraseña. Los errores/demoras del proveedor de correo no se transmiten como una señal de existencia de una cuenta.
- Las contraseñas nuevas requieren 15 caracteres, como frase de contraseña, y no más de 72 bytes UTF-8 para evitar el truncamiento de bcrypt. Se usa bcrypt con coste 12 para nuevos hashes. Las contraseñas antiguas siguen siendo válidas para login; al cambiarlas se aplica la política nueva.
- Los tokens de correo se retiran del historial/URL visible al abrir el formulario y se usa `Referrer-Policy: no-referrer`.

Los correos de autenticación se envían en segundo plano con timeout y límites. Se intentan completar durante el apagado ordenado. Esto no es una cola durable: un apagado abrupto puede perder un envío; el reenvío de enlaces permite recuperarlo. Para garantías mayores, implementar un outbox/cola persistente antes de aumentar escala.

También se limita a ocho trabajos bcrypt concurrentes por instancia para evitar llenar la cola de CPU con verificaciones/hashes de contraseña.

## Permisos y validación

- El PATCH de tareas usa una clase DTO real, no `Partial<T>` sin metadatos.
- Se rechazan campos desconocidos e internos. Los servicios también aplican listas explícitas de campos permitidos, aunque un caller interno omita el DTO.
- La materia vinculada debe existir y pertenecer al mismo usuario, tanto al crear como al editar o crear desde IA.
- Consultas, actualizaciones y borrados de tareas/materias incluyen el propietario en el SQL. Un UUID conocido no concede acceso.
- Se validan UUID, enums, fechas, tamaños de mensajes/descripciones/nombres y parámetros numéricos. Los cuerpos JSON se limitan a 32 KB.
- Las listas aceptan `limit` de 1 a 100 y `offset` de 0 a 10000. Angular lee las páginas sucesivamente para no perder datos en las vistas existentes. Las consultas de calendario se restringen a un año.
- El SDK de IA tiene timeout de 30 segundos, sin reintentos automáticos, salida limitada a 1200 tokens y concurrencia máxima de cuatro solicitudes por instancia. Texto y materias se envían como datos separados de las instrucciones.
- La respuesta de IA se valida nuevamente en el servidor: campos exactos, longitudes, confianza 0–1, enums y fechas de calendario reales. No se confía en el JSON del modelo como si fuera un DTO validado. La IA sigue sin herramientas para ejecutar código ni acceder a cuentas ajenas.

## Límites compartidos

La tabla `limites_seguridad` usa un UPSERT atómico. Los contadores sobreviven reinicios y se comparten entre instancias. Las claves contienen hashes, no IPs/emails en texto plano; las ventanas vencidas se limpian por lotes. Las respuestas 429 incluyen `Retry-After` conservador.

| Operación | Límite inicial |
| --- | --- |
| API por IP | 240 solicitudes/minuto |
| Escrituras de auth por IP | 20 cada 10 minutos |
| Login por email | 10 cada 10 minutos |
| Otros envíos de auth por email y ruta | 3 cada 10 minutos |
| IA por usuario | 5/minuto y 30/día |
| IA global | 500/día |
| Tareas creadas por usuario | 200/día |
| Contacto | 3/IP y 30 globales cada 10 minutos |
| Correo global | 60/minuto y 1000/día |
| Recordatorios por usuario | 20/día |

Son valores conservadores, ajustables en código después de medir el uso y presupuesto. Los intentos fallidos también consumen cuota. La concurrencia de correo se limita a ocho envíos por instancia y hay un timeout de 45 segundos.

Los recordatorios tienen una reserva atómica de 15 minutos con identificador de intento: dos réplicas no pueden enviarlos simultáneamente y un intento viejo no puede marcar uno nuevo como enviado. Se procesan hasta 100 candidatos por vuelta y se evitan intervalos solapados. Esto reduce duplicados, pero no garantiza entrega exactamente una vez si el proveedor acepta un correo y falla la confirmación/escritura posterior. Para esa garantía se necesita idempotencia del proveedor y un outbox.

## Encabezados, errores y chat Next

- Helmet y `Cache-Control: no-store` en la API; se elimina `X-Powered-By`.
- Angular genera CSP basada en hashes para los scripts del build de producción, sin habilitar `unsafe-eval`.
- `front/public/_headers` agrega protección de framing, tipos de contenido, referrer, permisos y destinos de conexión/recursos para hosts que soportan ese archivo. **Si el hosting no lo interpreta, configurar los mismos encabezados en su panel/proxy**. `frame-ancestors` requiere encabezado HTTP, no una metaetiqueta.
- Los errores inesperados del backend se devuelven genéricamente con un identificador; no se imprimen cuerpos, credenciales, SQL ni respuestas completas de proveedores. El correo deja de registrar direcciones.
- El chat Next actualiza su cookie, protege POST por origen exacto, limita la lectura del cuerpo, aplica timeouts al proxy y revoca sesiones en el backend al salir. Verifica la sesión en el servidor antes de mostrar `/chat`.
- Configurar `Modulo chat/.env.example`: `BACKEND_URL` y `APP_ORIGIN`. Producción requiere `APP_ORIGIN` explícito. En desarrollo el origen esperado es `http://localhost:3001`; ejecutar el chat en ese puerto para no chocar con el backend.
- Next usa CSP con nonce por solicitud y renderizado dinámico para que los scripts reciban ese nonce. Se quitaron `ignoreBuildErrors` y `X-Powered-By`. El chat solo reenvía solicitudes a rutas fijas del backend configurado.

## Dependencias y comprobaciones

Actualizaciones verificadas: Nest 11.2.7 con Multer 2.4.0 y qs 6.16.0; Angular 22.2.1; Next 16.3.8. Se mantienen lockfiles reproducibles y se agregó el entorno de pruebas de Angular/PostgreSQL en memoria.

Las auditorías de dependencias de producción no reportan vulnerabilidades conocidas en backend, Angular ni Next. Backend y dependencia auxiliar de la raíz tampoco reportan avisos incluyendo desarrollo. Quedan cinco nodos de paquetes con aviso en las herramientas de desarrollo de Angular y siete en las del chat, derivados de `braces` sin versión corregida compatible disponible. Shadcn ya no es dependencia de producción. No se aplicaron downgrades ni una migración forzada de Tailwind 3 a 4 para ocultar estos avisos.

Estas herramientas no procesan patrones suministrados por los usuarios de la API. No publicar servidores de desarrollo ni ejecutar shadcn/Tailwind con contenido o patrones arbitrarios de terceros. Revisar periódicamente los parches; el aviso de origen es [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

Pruebas del backend: validación, JWT/cookies/CSRF, permisos, errores seguros, recuperación/verificación y SQL atómico con PostgreSQL efímero en memoria. Pruebas de Angular: restauración, guards, ausencia de almacenamiento de credenciales, alcance del interceptor, logout, paginación y política Unicode. Los proveedores de correo/IA están simulados y no se usó la base real. Ejecutar `npm test -- --runInBand` desde `back` y `npm test -- --watch=false` desde `front`.

Se verifican compilaciones del backend, Angular y Next. Angular mantiene advertencias de presupuesto de estilos existentes; no son errores de seguridad.

Resultado final: 73 pruebas en el ejecutor del backend (incluye comprobaciones del proxy Next) y nueve en Angular. También se verificó el login Next por HTTP en localhost: todos sus scripts reciben el nonce CSP y los encabezados de framing, referrer y caché son los esperados. El servidor temporal de esa comprobación fue detenido.

## Pendiente fuera del código / límites de alcance

Esta implementación no certifica la configuración publicada ni reemplaza un pentest autorizado del despliegue. Antes de abrir el acceso, comprobar los certificados, cookies, CORS, cabeceras e IPs reales del proxy. Quedan tareas operativas: backups probados, permisos mínimos/rotación de credenciales de PostgreSQL/Azure, presupuestos y alertas de correo/IA, WAF/límites perimetrales contra ataques volumétricos, registro de eventos de seguridad con retención limitada y revisión de nuevos avisos de dependencias. Considerar MFA/passkeys y una cola durable si aumenta la sensibilidad o escala.

Referencias: [OWASP: sesiones](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP: CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [Nest: validación](https://docs.nestjs.com/application/validation), [Express: proxies](https://expressjs.com/en/guide/behind-proxies.html), [Next: CSP](https://nextjs.org/docs/app/guides/content-security-policy).
