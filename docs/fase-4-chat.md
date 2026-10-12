# Fase 4 — Revisión visual y rendimiento del chat Next

Fecha: 9 de octubre de 2026, Argentina. Producto revisado: `Modulo chat`, build de producción Next, servido en localhost. Se conserva el único tema existente (claro); no se inventó un modo oscuro.

## Entorno y alcance verificable

Se usó Chrome real en modo sin ventana con Playwright, axe-core y Lighthouse. El backend de esta revisión fue una **API ficticia en memoria** con 120 mensajes y respuestas controladas. SSR, páginas y handlers Next son reales. No se usaron cuentas, credenciales, IA, correo o base de datos remotos.

Para permitir probar el proxy de producción desde HTTP local, el harness envió solicitudes de API mediante `route.fetch` con el Origin HTTPS de prueba configurado. La aplicación conserva sus controles de origen y cookies de producción. Este ajuste pertenece sólo a la herramienta de pruebas; no acredita por sí solo la configuración HTTPS de un despliegue real. Las pruebas HTTP/SQL aisladas del backend se documentan en fase 5.

Las herramientas y los pasos para repetir esta revisión se conservan en [evidencia-chat/README.md](evidencia-chat/README.md).

## Pantallas y flujos

| Tamaño | Capturas y verificaciones |
| --- | --- |
| Móvil 390 × 844 | Login, credenciales incorrectas, historial, tarea creada, fallo de envío, fallo de cierre, sesión vencida, fallo/reintento de historial, vacío y carga. |
| Tablet 768 × 1024 | Los mismos diez estados. |
| Escritorio 1440 × 900 | Los mismos diez estados. |
| Ancho 320 CSS px | Login y chat con texto normal y texto al 200 %, controles dentro de pantalla. Es ampliación de texto; no se presenta como una prueba de zoom nativo del navegador. |

Los recorridos comprobaron cronología y paginación de 50 → 100 → 120 mensajes; envío exitoso; borrador restaurado tras fallo; borrador nuevo que no es sobrescrito por una respuesta vieja; 401 con texto conservado; logout que permanece en chat al fallar y navega sólo al confirmarse; carga, vacío y error separados; reintento sin borrar trabajo.

La comprobación de teclado recorrió Tab por cabecera, región desplazable y compositor, envió con Enter, volvió al cierre con Tab/Enter y completó login por teclado. Se verificó anillo visible de 3 px en compositor y movimiento reducido sin animación de puntos ni scroll suave.

Resultados finales: **30 capturas principales, 15 comprobaciones de pantallas/flujos y cuatro estados de reflow**, sin desbordamientos horizontales ni controles fuera de pantalla, sin errores JavaScript observados y **0 violaciones axe detectadas** en los estados auditados. Esto no sustituye una evaluación humana con lector de pantalla; no se hizo esa afirmación.

Evidencias:

- [Resultados por viewport y estado](evidencia-chat/qa-resultados.json).
- [Reflow y texto ampliado](evidencia-chat/qa-reflow.json).
- [Recorrido por teclado](evidencia-chat/qa-teclado.json).
- [Historial móvil](evidencia-chat/movil-historial.png), [estado vacío tablet](evidencia-chat/tablet-vacio.png), [login escritorio](evidencia-chat/escritorio-login.png).
- [Fallo de envío](evidencia-chat/tablet-envio-error.png), [sesión vencida](evidencia-chat/movil-sesion-vencida.png), [texto 200 % a 320 px](evidencia-chat/320-chat-texto-200.png).

## Problemas encontrados en vivo y correcciones

1. **Historial temporalmente ilegible:** cada fila entraba desde opacity 0. La captura y axe detectaron texto tenue al cargar una página completa. Se quitó la aparición ornamental de filas y el scroll inicial pasa directamente al final. [Captura anterior](evidencia-chat/antes-movil-historial.png) y [hallazgos anteriores](evidencia-chat/qa-antes-correccion.json).
2. **Cerrar sesión fuera del ancho al ampliar texto:** la cabecera no podía envolver sus grupos. Se habilitó wrapping y se comprobó otra vez a 320 px/200 %.
3. **Altura del documento excesiva:** etiquetas sr-only con referencia de posición fuera del contenedor generaban un área vacía larga. Los contenedores ahora establecen una referencia de posición; la altura del chat coincide con el viewport y las capturas no esconden ese desbordamiento.
4. **Favicon 404:** Lighthouse detectó el recurso faltante. Metadata usa los iconos ya existentes.
5. **Cambio de posición al llegar la fuente:** mediciones móviles anteriores variaron en CLS hasta 0,309. Next usa fuentes locales precargadas para cuerpo/título y `font-display: optional`: si no llegan a tiempo, mantiene la fuente de respaldo durante esa visita en lugar de cambiar la geometría tarde. La identidad tipográfica se usa cuando la fuente está disponible. La lectura final dio CLS 0 en ambos tamaños/rutas.

## Lighthouse real de laboratorio

Se ejecutó Lighthouse 13.5.0 contra el build de producción local. Móvil usa la emulación/restricción predeterminada; escritorio usa el archivo de configuración desktop del propio Lighthouse, con sus parámetros de red/CPU. `/chat` usa cookie ficticia y 50 mensajes. Los reportes guardan la configuración completa.

| Ruta / perfil | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Login móvil | 92 | 100 | 100 | 100 | 2,61 s | 0 | 203 ms |
| Login escritorio | 100 | 100 | 100 | 100 | 0,57 s | 0 | 11 ms |
| Chat móvil | 93 | 100 | 100 | 100 | 3,04 s | 0 | 148 ms |
| Chat escritorio | 100 | 100 | 100 | 100 | 0,63 s | 0 | 0 ms |

El LCP móvil todavía supera el objetivo de 2,5 s en estas lecturas. No se declara un rendimiento de campo aprobado ni se equipara TBT con INP. La carga del host produjo variación apreciable: se conservaron las tres repeticiones del login anteriores a la última corrección (scores 59, 88 y 90) y sus métricas, además de la medición final. La mejora concreta verificable es la eliminación del salto observado; un score aislado no garantiza tiempos para todos los usuarios.

- [Resumen final](evidencia-chat/lighthouse-resumen.json).
- [Login móvil HTML](evidencia-chat/lighthouse-login-mobile.html) · [JSON](evidencia-chat/lighthouse-login-mobile.json).
- [Chat móvil HTML](evidencia-chat/lighthouse-chat-mobile.html) · [JSON](evidencia-chat/lighthouse-chat-mobile.json).
- [Login escritorio HTML](evidencia-chat/lighthouse-login-desktop.html) · [Chat escritorio HTML](evidencia-chat/lighthouse-chat-desktop.html).
- [Variación anterior conservada](evidencia-chat/lighthouse-variacion.json).

## Límites y seguimiento

No se probaron entrega de correo/push, interpretación del proveedor IA, persistencia remota ni topología real del proxy. Idempotencia/transacción del flujo de mensajes, identidad confiable detrás del proxy, baseline inicial de DB e índices medidos permanecen detallados en `cambios-back-chat.md`. Para rendimiento, el siguiente paso es medir en un dispositivo objetivo con visitas reales y revisar la carga inicial de JavaScript del chat, con datos suficientes antes de dividir más componentes.
