# PWA y notificaciones de Tempo

## 1. Probar la PWA instalable

Desde `front/`:

```powershell
npm ci
npm run build
npm run preview:pwa
```

Abrí `http://localhost:8080`. Es un servidor estático del build de producción con fallback para las rutas Angular; no usa `ng serve`. En desarrollo el service worker está deshabilitado. Para probar también login y tareas, iniciá `back/` en el puerto 3000 y agregá `http://localhost:8080` a `FRONTEND_URLS` del backend. El servidor reenvía `/api` a ese backend (se puede cambiar con `PWA_API_URL`).

En DevTools → Application verificá:

- Manifest: nombre Tempo, colores, standalone e íconos normales/maskable de 192 y 512.
- Service Workers: `ngsw-worker.js` activo; recargá una vez después del registro.
- Cache Storage: solo el shell y recursos estáticos. Las respuestas de `/api/auth/session`, tareas, perfil y demás endpoints nunca deben aparecer allí.
- Offline: después de una visita online abre el shell; los datos personales siguen requiriendo conexión.

En producción necesitás HTTPS. `localhost` permite la prueba del worker, pero abrir una IP de tu PC por HTTP desde el teléfono no permite push: usá una URL HTTPS de Vercel para probar dispositivos reales.

Vercel conserva el rewrite de `/api` a Render. Los archivos existentes (manifest, worker e íconos) se sirven antes del fallback Angular. El worker y su manifiesto llevan cabeceras para revalidar cada despliegue.

## 2. Probar la invitación de instalación

- Android/Chrome: abrí la URL HTTPS en un dispositivo no instalado. El popup ofrece la versión mobile; el botón **Instalar** aparece cuando Chrome emite `beforeinstallprompt`.
- Cerrá con **Ahora no**, la cruz o Escape y recargá: no reaparece. Para repetir la prueba borrá `tempo-pwa-install-dismissed-v1` de localStorage.
- Entrá a **Instalar app** desde el menú, el enlace del pie público o `/instalar`: las instrucciones siguen disponibles después de cerrar el popup.
- iPhone/iPad: Safari muestra **Compartir → Agregar a pantalla de inicio → Agregar** y explica que push requiere instalación e iOS/iPadOS 16.4+. Chrome iOS recomienda abrir Safari.
- Abrí desde el ícono instalado: no aparece el popup. En escritorio se ofrece la sección permanente sin invitación automática.
- La detección de iPad considera el agente de escritorio (`MacIntel` + pantalla táctil). La preferencia de cierre tolera localStorage deshabilitado.

## 4. Probar suscripción, correo y navegación

1. Prepará el backend siguiendo `../back/PUSH.md`: claves VAPID, migración y orígenes permitidos. Compilá el frontend de producción y abrilo con el servidor estático o con HTTPS en Vercel.
2. Iniciá sesión y entrá a **Perfil → Notificaciones**. Cargar una página nunca solicita permiso. Esperá que se compruebe la configuración y tocá **Activar notificaciones**: solo entonces aparece el permiso del navegador.
3. Aceptá. El estado debe cambiar a **Activadas** después de que el backend registre el endpoint. Recargá: se comprueba que la suscripción pertenezca a la cuenta actual; no se registra automáticamente una suscripción de otra cuenta.
4. Rechazá el permiso en otro navegador de prueba: debe indicar **Bloqueadas por el navegador**. Para reintentar, cambiá el permiso en la configuración del sitio (el botón no puede saltarse un bloqueo).
5. Activá los avisos por email en Perfil. Creá una tarea con fecha próxima y una anticipación que ya corresponda. El procesamiento actual al arrancar o en el siguiente minuto debe disparar correo y push. Si Render está dormido, ambos esperan al despertar existente; no se agregó otro cron ni servicio. La entrega final de cada proveedor puede demorar.
6. Cerrá la pestaña/app y tocá el aviso: el worker abre o enfoca Tempo en `/tareas`. Con la app abierta, `SwPush.notificationClicks` también maneja rutas internas. En Chrome DevTools → Application → Service Workers podés simular un aviso con este payload:

```json
{"notification":{"title":"Recordatorio: Parcial · Tempo","body":"Física. Vence mañana.","icon":"/icons/icon-192x192.png","data":{"url":"/tareas","onActionClick":{"default":{"operation":"navigateLastFocusedOrOpen","url":"/tareas"}}}}}
```

7. Tocá **Desactivar notificaciones**: primero se elimina del servidor y después del navegador. Otros dispositivos de la cuenta siguen suscritos. El correo continúa según la preferencia de email.
8. Volvé a activarlas y cerrá sesión: DELETE debe ir antes de `/auth/logout`, con la cookie JWT HttpOnly y CSRF. Si la baja falla por red, se conserva la sesión para reintentar; no se presenta un cierre exitoso sin haber completado esa baja.

Para pruebas reales en iPhone: iOS/iPadOS 16.4+, Safari, instalación en inicio y abrir desde ese ícono antes de activar. `ng serve` no sirve para probar SwPush. La clave pública se precarga antes del clic para evitar perder el gesto del usuario esperando una petición de red.

Pruebas automatizadas del frontend: `npm test -- --watch=false`. Los permisos, suscripciones y solicitudes HTTP se simulan; las pruebas no muestran permisos reales ni envían avisos.

## Archivos del frontend

| Archivo | Función |
| --- | --- |
| `package.json`, `package-lock.json` | Dependencia oficial `@angular/service-worker` y comando de preview; generados a partir de `@angular/pwa@22.2.1` |
| `angular.json` | Genera `ngsw` únicamente para el build de producción |
| `ngsw-config.json` | Caché de archivos estáticos, sin dataGroups, sin URLs remotas y con navegación `/api` excluida |
| `public/manifest.webmanifest` | Identidad, colores, alcance, inicio y modos de instalación |
| `public/icons/icon-192x192.png`, `icon-512x512.png` | Íconos normales derivados del favicon de Tempo |
| `public/icons/icon-maskable-192x192.png`, `icon-maskable-512x512.png` | Íconos con margen seguro para recortes de Android |
| `public/icons/icon-180x180.png` | Ícono de inicio para Apple |
| `src/index.html` | Enlaces al manifest y Apple icon, color y metadatos mobile |
| `src/app/app.config.ts` | Registra el worker solo si `environment.production` es verdadero |
| `vercel.json` | Conserva API/fallback y evita una copia antigua del worker en el caché del hosting |
| `scripts/serve-pwa.mjs` | Preview estático local con rutas Angular y proxy `/api` |
| `src/app/core/services/pwa-platform.service.ts` | Plataforma, modo standalone, evento de instalación y preferencia de cierre |
| `src/app/shared/components/install-instructions.component.ts` | Instrucciones reutilizables por plataforma y botón de instalación |
| `src/app/shared/components/install-prompt.component.ts` | Popup mobile con diálogo nativo accesible, cierre y persistencia |
| `src/app/features/instalar/instalar.component.ts` | Sección permanente pública “Instalar app” |
| `src/app/app.routes.ts` | Ruta pública `/instalar` |
| `src/app/app.ts`, `app.html` | Menú/pie de instalación, popup y sincronización del estado de sesión con push |
| `src/app/core/services/push-notifications.service.ts` | SwPush, permiso por clic, estado real por cuenta, registro, baja, renovación y navegación |
| `src/app/shared/components/push-preferences.component.ts` | Estado y controles de notificaciones en Perfil |
| `src/app/features/perfil/perfil.component.ts` | Inserta los controles sin cambiar las preferencias de correo |
| `src/app/core/services/auth.service.ts` | Da de baja el dispositivo antes de revocar la sesión |
| `src/app/core/interceptors/api-url.interceptor.ts` | Envía las rutas push al backend usando el interceptor de cookie/CSRF existente |
| `src/app/core/services/pwa-platform.service.spec.ts` | Pruebas de plataformas, evento y cierre recordado |
| `src/app/core/services/push-notifications.service.spec.ts` | Pruebas de consentimiento, estados, fallos, baja, renovación y navegación |
| `src/app/core/services/auth.service.spec.ts` | Regresión de sesión y orden DELETE/logout con cookie y CSRF |
| `README.md`, `PWA.md` | Acceso a esta guía de instalación y pruebas |
