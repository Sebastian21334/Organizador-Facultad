# Reproducir la revisión del chat

Estos scripts prueban el build de producción de Next contra una API **ficticia local**, con mensajes y respuestas deterministas. No requieren credenciales ni llaman a IA, correo o bases reales. `qa-chat-token`, `qa@example.test` y las contraseñas del fixture son datos sintéticos sin acceso a ningún servicio. El fixture escucha únicamente en 127.0.0.1.

## Preparación

Se usaron Node 24, Playwright 1.64.0, axe-core 4.14.0, Lighthouse 13.5.0 y Chrome local. Desde la raíz del repositorio:

```powershell
npm install --prefix .tmp/qa --no-save playwright@1.64.0 axe-core@4.14.0 lighthouse@13.5.0
```

Las dependencias de QA quedan fuera de las aplicaciones, en `.tmp/qa`. `chrome-launcher` es una dependencia de Lighthouse. Por defecto se usa Chrome de Windows en `C:/Program Files/Google/Chrome/Application/chrome.exe`; para otro equipo definí `CHROME_PATH` con la ruta de su Chrome/Chromium antes de ejecutar los scripts.

En una terminal, desde la raíz:

```powershell
node docs/evidencia-chat/chat-fixture.cjs
```

En otra terminal, desde la carpeta `Modulo chat`, después de instalar sus dependencias con `npm ci`:

```powershell
$env:BACKEND_URL = 'http://127.0.0.1:4301'
$env:APP_ORIGIN = 'https://chat-qa.example'
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
```

El origen público de prueba es un dominio reservado, no un servidor al que se envíen solicitudes. Los scripts de Playwright sustituyen el encabezado Origin de las llamadas locales mediante `route.fetch`, para atravesar la comprobación HTTPS del proxy de producción sin cambiarla. Chrome acepta la cookie Secure en loopback. Esto no sustituye una prueba de despliegue HTTPS real.

## Ejecución

Desde la raíz, con ambos servidores funcionando, ejecutar **en serie** porque comparten el estado del fixture:

```powershell
node docs/evidencia-chat/chat-visual.cjs
node docs/evidencia-chat/chat-reflow.cjs
node docs/evidencia-chat/chat-keyboard.cjs
node docs/evidencia-chat/chat-lighthouse.cjs
```

- `chat-visual.cjs`: 3 tamaños, 30 capturas, comprobaciones de flujo y axe en pantallas representativas. Escribe `qa-resultados.json`; ante una aserción fallida guarda el avance en `qa-resultados-parcial.json`.
- `chat-reflow.cjs`: ancho 320 px y texto al 100/200 %, con capturas y `qa-reflow.json`. Es ampliación del texto, no emulación del zoom nativo del navegador.
- `chat-keyboard.cjs`: Tab/Enter para iniciar sesión, alcanzar compositor, enviar y cerrar sesión. Escribe `qa-teclado.json`.
- `chat-lighthouse.cjs`: login/chat en móvil simulado y escritorio, 4 informes HTML/JSON y `lighthouse-resumen.json`. Ejecutarlo sin otros builds o navegadores intensivos para reducir ruido. TBT es una medida de laboratorio; no es INP de usuarios reales.

Los archivos de resultados se sobrescriben al repetir la herramienta; guardar una copia si se comparan versiones. Las violaciones axe se guardan para inspección y no equivalen a una certificación de accesibilidad. Vercel Analytics se bloquea en las revisiones para aislar recursos ajenos al flujo. Los informes conservados y su interpretación están en [fase 4](../fase-4-chat.md).

Al terminar, detener las dos terminales con Ctrl+C. No arrancar el fixture en una interfaz pública ni apuntar estas herramientas a cuentas reales. Los registros de build/tests de fases 5 y 6 se guardan como `.txt` para quedar disponibles en el diff aunque `.log` esté ignorado por Git.
