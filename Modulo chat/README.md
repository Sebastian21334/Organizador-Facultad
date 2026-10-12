# Chat de Apunte / Tempo

Cliente Next.js del chat universitario. Las páginas están en `app`, las rutas `/api` hacen de proxy al backend y `lib` contiene utilidades compartidas. El JWT se conserva en una cookie HttpOnly; no se expone a JavaScript ni a almacenamiento local.

## Desarrollo local

Con Node.js 24 (la suite requiere Node 22.18 o superior):

```sh
npm ci
npm run dev -- --port 3001
```

La API backend se espera en `http://localhost:3000`; `BACKEND_URL` permite indicar otro origen. En desarrollo el origen público por defecto es `http://localhost:3001`. Si cambiás el puerto del chat, configurá también `APP_ORIGIN`.

En producción configurar `APP_ORIGIN` con el origen HTTPS real del chat y `BACKEND_URL` con el backend HTTPS. El proxy comprueba el origen de escrituras. No debilitar esta comprobación para una demostración local.

## Verificaciones

```sh
npm test
npm run build
npm run start -- --port 3001
```

`npm test` usa el runner nativo de Node, sin dependencias nuevas, y cubre transformación/paginación de historial, respuestas inválidas, errores de sesión y confirmación de logout. El backend incluye además pruebas de las utilidades de seguridad del proxy. Las pruebas de navegador, accesibilidad y rendimiento se documentan por separado en `../docs`.

El chat muestra 50 mensajes por página y permite cargar los anteriores conservando la posición de lectura. Un fallo de envío conserva el texto; no reintenta automáticamente para evitar crear duplicados si el servidor había guardado la tarea antes de perderse la respuesta. El cierre de sesión sólo navega tras confirmación del servidor.

La identidad visual se mantiene. Los estilos permiten zoom, foco visible, texto largo, tamaños táctiles y preferencia de movimiento reducido.
