# Push en el mismo proceso que los correos

## 3. Preparar y probar el backend

Desde `back/`:

```powershell
npm ci
npm run push:keys
npm run build
npm test -- --runInBand push
```

`push:keys` genera **una sola vez** `back/.env.vapid.local`, ignorado por Git, sin imprimir la clave privada. El backend lee ese archivo en local junto con `.env`; las variables del entorno y `.env` tienen prioridad. Si ya existe, el comando conserva sus claves.

En Render cargá **VAPID_PUBLIC_KEY**, **VAPID_PRIVATE_KEY** y **VAPID_SUBJECT** desde ese archivo. Subject debe ser un contacto `mailto:` o una URL HTTPS; el generador usa el correo de soporte que ya está en el proyecto. No regeneres las claves en cada arranque o despliegue: los dispositivos se suscriben a la clave pública y cambiarla requiere volver a activarlos. La privada nunca va al frontend ni a Git.

La nueva tabla requiere una migración. En una base de prueba primero, y después como parte del despliegue preparado para Neon:

```powershell
npm run migration:run
```

La migración crea `push_subscriptions`, un endpoint único, las claves de cifrado en JSONB, el vínculo al usuario con borrado en cascada y fechas de creación/actualización. `synchronize` sigue deshabilitado. Las pruebas usan PostgreSQL efímero en memoria y no conectan a Neon.

Endpoints (en Angular/Vercel llevan prefijo `/api`):

| Método/ruta | Autenticación | Uso |
| --- | --- | --- |
| GET `/push/public-key` | Pública | `{ publicKey }`; nunca devuelve la privada |
| GET `/push/subscriptions` | JWT | Endpoints de la cuenta para comprobar el estado real de este dispositivo |
| POST `/push/subscriptions` | JWT | `{ endpoint, keys: { p256dh, auth }, userAgent? }`, registro idempotente |
| DELETE `/push/subscriptions` | JWT | `{ endpoint }`, solo elimina una suscripción del usuario autenticado |

Con cookies se usa el mismo interceptor de sesión y CSRF existente; clientes de prueba también pueden usar Bearer. Sin sesión, POST/DELETE/listado deben devolver 401. Repetir POST del mismo endpoint no crea duplicados. Otro usuario no puede borrarlo. El endpoint y las claves se toman de `PushSubscription.toJSON()`; no inventes valores para una prueba real.

Se aceptan endpoints HTTPS de Google/Chrome, Mozilla/Firefox, Apple/Safari y Windows/Edge. Otros destinos, credenciales en URL, puertos alternativos y direcciones internas se rechazan antes de persistir o enviar. Si un navegador incorpora otro proveedor oficial habrá que actualizar la lista de hosts en `PushService`.

Sin las tres variables VAPID, push queda deshabilitado y su endpoint de configuración devuelve 503; el flujo de correos sigue funcionando. Los errores 404/410 eliminan el dispositivo inválido; los fallos temporales lo conservan. Cada envío tiene timeout de 5 segundos y TTL de una hora.

## 4. Integración con el correo

`TareasService` conserva su ejecución al arrancar y cada minuto mientras el proceso está despierto, su anticipación y el reclamo de recordatorios. Ahora pasa `usuarioId` a `MailService.enviarRecordatorio`. Este método dispara push y correo desde la misma invocación, sin esperar push para confirmar el correo. El resumen push contiene el mismo título de tarea, materia y vencimiento del correo, y dirige a `/tareas`.

No hay un nuevo scheduler ni un servicio externo para ejecutar recordatorios. Cuando Render gratuito duerme, ambos avisos esperan al próximo despertar. Las notificaciones de recordatorio dependen de la preferencia existente de email; desactivar push en un dispositivo no desactiva el correo. Verificación de email, recuperación de contraseña y contacto conservan su funcionamiento y no envían tokens por push.

Para verificar fallos y el mismo flujo sin enviar nada real:

```powershell
npm test -- --runInBand
```

Las pruebas comprueban que un push rechazado o pendiente no bloquea la confirmación de correo; que 404/410 limpia solo la versión inválida del dispositivo; y que el procesamiento existente no envía de nuevo una tarea reclamada. El permiso y la entrega real deben verificarse con un dispositivo en HTTPS siguiendo `../front/PWA.md`.

Antes de desplegar: aplicar la migración a la base elegida, configurar VAPID y confirmar que `FRONTEND_URL`/`FRONTEND_URLS` correspondan al Angular publicado. No se aplicó la migración a Neon ni se modificaron las variables de Render desde estas pruebas locales.

## Archivos del backend

| Archivo | Función |
| --- | --- |
| `package.json`, `package-lock.json` | `web-push`, sus tipos y comando de generación de claves |
| `.gitignore`, `.env.example` | Ignora claves locales y documenta VAPID sin incluir secretos |
| `scripts/generate-vapid.cjs` | Genera una vez las claves en el archivo local ignorado |
| `.env.vapid.local` (solo local, fuera de Git) | Claves generadas para cargar en el entorno del backend |
| `src/push/entities/push-subscription.entity.ts` | Endpoint único, cifrado, usuario y fechas; varios dispositivos por cuenta |
| `src/migrations/1791432000000-AgregarPushSubscriptions.ts` | Crea la tabla e índice sin usar synchronize |
| `src/push/dto/push-subscription.dto.ts` | Valida endpoint, claves y userAgent; rechaza campos internos |
| `src/push/repositories/push-subscriptions.repository.ts` | Registro idempotente, consultas por usuario y bajas con pertenencia |
| `src/push/services/push.service.ts` | VAPID, validación de proveedores, envío aislado por dispositivo y limpieza 404/410 |
| `src/push/controllers/push.controller.ts` | Endpoints públicos/de JWT para clave, estado, alta y baja |
| `src/push/push.module.ts` | Registra las capas y exporta el servicio |
| `src/app.module.ts` | Incorpora PushModule y lee el archivo local de claves |
| `src/mail/mail.module.ts` | Inyecta el servicio push en el módulo existente de correo |
| `src/mail/services/mail.service.ts` | Añade push paralelo solo a los recordatorios; preserva el envío de correo |
| `src/tareas/services/tareas.service.ts` | Pasa la identidad del destinatario desde el flujo actual de recordatorios |
| `src/push/services/push.service.spec.ts` | Envíos multi-dispositivo, aislamiento de fallos, endpoints y VAPID |
| `src/push/repositories/push-subscriptions.repository.spec.ts` | Migración y persistencia reales en PostgreSQL efímero |
| `src/push/controllers/push.http.spec.ts` | JWT/CSRF y validación con HTTP real y almacenamiento simulado |
| `src/mail/services/mail.service.spec.ts` | Verifica que los errores y demoras push no afectan al correo |
| `src/tareas/services/recordatorios-push.spec.ts` | Verifica el flujo/identidad y conserva el control de duplicados |
| `README.md`, `PUSH.md` | Guía de configuración, migración, endpoints, archivos y pruebas |

Referencias oficiales: [Angular SwPush y clics](https://angular.dev/ecosystem/service-workers/push-notifications), [Web Push en iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [web-push](https://github.com/web-push-libs/web-push).
