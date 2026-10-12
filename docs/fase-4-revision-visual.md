# Fase 4 — Revisión visual y de uso en navegador

## Entorno y alcance

Se usó Chrome real en modo headless con el build de producción, no el DOM simulado de las pruebas unitarias. Angular se sirve con `scripts/serve-pwa.mjs` en `127.0.0.1:8080`; `scripts/qa-api.mjs` responde en `127.0.0.1:4300` con datos sintéticos y fallos controlados. Se prueban pantallas reales, pero la API visual **no valida persistencia, seguridad ni proveedores externos**. Eso se separa de las pruebas HTTP/SQL del backend.

Tamaños principales: móvil 390 × 844, tablet 768 × 1024 y escritorio 1440 × 1000. Prueba adicional de reflow a 320 px con espaciado ampliado y `prefers-reduced-motion`. Zona horaria del navegador: Argentina. Angular se revisa en tema claro y oscuro.

Rutas Angular: portada, login, registro, recuperación de contraseña, restablecimiento, verificación de correo, instalación, contacto, Inicio, Calendario, Tareas, Materias, Mensajes y Perfil. Restablecimiento y verificación se revisan tanto sin enlace válido como dentro de sus flujos válidos. La matriz combina 14 rutas × 3 tamaños × 2 temas = 84 escenarios. Las pantallas con scroll interno se capturan también al final; `fullPage` por sí solo no muestra su contenido inferior.

Se ejecuta axe-core con reglas WCAG A/AA 2.0, 2.1, 2.2 y buenas prácticas. Se registran errores JavaScript, ancho real y desbordamientos. Las reglas automáticas se complementan con acciones de teclado, inspección de capturas y comprobaciones funcionales; cero violaciones automáticas no equivale a certificación WCAG ni sustituye una prueba con lector de pantalla.

## Problemas encontrados y correcciones

| Problema observado | Corrección y comprobación |
| --- | --- |
| Etiquetas crema demasiado claras y acciones oscuras con texto gris heredado | Tokens más contrastados y reglas específicas para las acciones; repetir axe en ambos temas. Se evita subir el brillo de todos los colores sin considerar su fondo. |
| Nombre accesible diferente del texto visible en marca y celdas de fecha | Marca con nombre natural; nombres de fechas empiezan por su contenido visible y añaden fecha completa/cantidad. Ayuda a lectores de pantalla y control por voz. |
| Varios `main`, región de avisos repetida y niveles de título incoherentes | Un único contenido principal en el shell, región «Avisos de la aplicación», títulos de agenda según contexto. |
| Títulos largos de tareas desbordaban Inicio en móvil/tablet | Permitir que la fila y su texto se reduzcan y envuelvan, conservando fecha y acciones. |
| Abrir el drawer dejaba el foco en `body` | La transición de `visibility` impedía enfocar el botón en el primer render; ahora sólo se anima el desplazamiento. Se prueban foco inicial, Tab, Shift+Tab, Escape, fondo inerte y retorno. |
| El enlace para saltar al contenido podía resolver a la raíz por `base href` | Se intercepta el salto para enfocar y desplazar el contenido sin cambiar la ruta. |
| La navegación móvil conservaba el scroll de la página anterior | Al terminar la navegación, se reinician scroll y foco del contenido principal. |
| Toast de error cubría el botón de envío; el mouse sobre él pausaba su desaparición | Avisos arriba, debajo de la barra en móvil, con cierre explícito. El reintento del chat puede usarse conservando el borrador. |
| Ejemplos sugerían que la IA interpretaba horarios exactos, aunque sólo devuelve fechas | Texto del producto alineado con el contrato: la IA agenda al final del día; la hora precisa se ajusta en Tareas. |
| Calendario mostraba información lateral durante un error/carga y texto vacío incoherente en vista semanal | Estados excluyentes y mensaje correspondiente al período visible. |
| Cargar la sesión desplazaba el contenido al aparecer la navegación | Se reserva la geometría de la barra lateral/superior desde la entrada a una ruta protegida, sin mostrar controles privados. El flujo prueba la posición antes y después de autenticar en los tres tamaños. |
| El título principal esperaba una animación de entrada | Se excluyen h1 y bloques que los contienen de la animación ornamental. El contenido que orienta no debe esperar a una decoración. |
| Un estado aparecía como `en_progreso` | Se presenta como «En progreso»; el contrato de datos conserva su valor original. |
| El preview enviaba JavaScript sin comprimir | Se negocia gzip para recursos estáticos y se verifica identidad del contenido, `q=0`, HEAD y 404. La configuración del alojamiento real queda por comprobar. |
| Lighthouse móvil mostraba un diálogo de instalación no solicitado y descargaba un favicon de 820 KB | La instalación queda a disposición del usuario en «Instalar app», con apertura manual. Se reutiliza el icono PNG de 18,6 KB y se elimina el ICO del prefetch de la PWA. Se amplía el flujo con agentes de usuario Android/iPhone y almacenamiento vacío. |
| La opacidad de toda la ruta reducía el contraste durante la entrada | Se retira el desvanecimiento global. Título y texto principal aparecen directamente; se conservan microinteracciones puntuales y reduced-motion. |
| El aviso de recordatorios tardío empujaba filtros y el pie público aparecía antes que la portada | El bloque de Tareas espera la preferencia inicial con loader y se libera también ante error. El pie espera la primera navegación completada. Se repite Lighthouse hasta verificar CLS 0 en las seis mediciones. |

La evidencia del módulo Next, sus correcciones y mediciones se documenta en [fase-4-chat.md](fase-4-chat.md).

## Reproducción

Desde la raíz, instalar las herramientas de QA en un directorio temporal ignorado (no modifica dependencias de las aplicaciones):

```powershell
npm install --prefix .tmp/qa playwright@1.64.0 axe-core@4.14.0 lighthouse@13.5.0
```

Con Chrome instalado, desde `front`, en terminales separadas:

```powershell
node scripts/qa-api.mjs
```

```powershell
$env:PWA_API_URL='http://127.0.0.1:4300'
npm run build
npm run preview:pwa
```

Luego, **en serie**, desde `front`:

```powershell
node scripts/verify-flows.mjs
node scripts/verify-auth-flows.mjs
node scripts/verify-preview.mjs
node scripts/verify-pwa.mjs
node scripts/verify-ui.mjs
node scripts/measure-lighthouse.mjs
```

La API de QA tiene estado compartido: no ejecutar dos flujos que la resetean al mismo tiempo. Restablecer el escenario normal antes de la matriz y Lighthouse. Tampoco compilar la misma aplicación mientras se navega: la recompilación reemplaza los archivos que el navegador está cargando.

Para restablecer explícitamente el fixture desde PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4300/__qa/reset -ContentType 'application/json' -Body '{"escenario":"normal"}'
```

Lighthouse mide laboratorio local con su simulación móvil/escritorio, build de producción y API sintética. Se conserva cada reporte JSON/HTML con versión, tiempo y entorno. Según la [documentación oficial de Lighthouse](https://developer.chrome.com/docs/lighthouse/overview), los resultados sirven para diagnosticar oportunidades; la [variabilidad de las puntuaciones](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring) exige interpretar carga del equipo y condiciones de medición. No se presenta TBT como INP real ni se afirma rendimiento de una API desplegada.

La matriz de tamaños usa Chromium con su identificación habitual; no equivale a ejecutar Safari real. El hallazgo del diálogo automático muestra por qué se complementó con primera visita Android/iPhone mediante agentes de usuario móviles. Esa emulación verifica la detección de plataforma y su flujo en Chromium, no compatibilidad completa con los motores WebKit ni un dispositivo físico.

## Resultado final de la revisión

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| 14 rutas × 3 tamaños × 2 temas | **84/84**, cero infracciones axe, cero excepciones JavaScript y cero desbordamientos; origen/ruta final comprobados | [Matriz y nombres de capturas](evidencia-visual/matriz.json) |
| Navegación, tareas, calendario, materias, chat, estados y primera visita móvil | **20/20 grupos**; los cuatro grupos Android/iPhone contienen 40 aserciones | [Flujos](evidencia-flujos/flujos.json), [primera visita](evidencia-flujos/pwa-primeras-visitas.json) |
| Registro, login, recuperación, reset, verificación, perfil y contacto | **7/7 flujos, 65/65 aserciones** | [Reporte](evidencia-flujos/auth-perfil-contacto.json) |
| Entrega estática | **6 comprobaciones PASS**; JavaScript principal de 245.801 a 53.498 bytes con gzip | [Preview](evidencia-flujos/preview.json) |
| Service worker real | **5 comprobaciones PASS**; fuentes disponibles sin red; sin caché de respuestas privadas ni ICO pesado | [PWA](evidencia-flujos/pwa.json) |

Se inspeccionaron capturas representativas de móvil, tablet y escritorio, ambos temas, títulos largos, formularios, diálogos, errores e instrucciones Android/iPhone. La matriz automatizada cubre todas las rutas enumeradas; no se presenta cada captura como una evaluación manual independiente. Reflow a 320 px con espaciado de texto ampliado, reduced-motion, Tab/Shift+Tab/Escape, retorno de foco y enlaces internos forman parte de los flujos.

## Lighthouse final — Angular

Chrome 147 y Lighthouse 13.5.0, 9 de octubre de 2026 en Argentina (los reportes usan fecha UTC del 10). Una medición final por ruta/perfil; datos sintéticos normales; sin builds concurrentes. La configuración escritorio es la oficial de Lighthouse y no sólo una ventana más ancha.

| Ruta/perfil | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Portada móvil | 77 | 100 | 96 | 100 | 3,9 s | 400 ms | 0 |
| Portada escritorio | 100 | 100 | 96 | 100 | 0,7 s | 0 ms | 0 |
| Inicio móvil | 92 | 100 | 100 | 100 | 3,3 s | 50 ms | 0 |
| Inicio escritorio | 100 | 100 | 100 | 100 | 0,7 s | 0 ms | 0 |
| Tareas móvil | 89 | 100 | 100 | 100 | 3,6 s | 60 ms | 0 |
| Tareas escritorio | 100 | 100 | 100 | 100 | 0,7 s | 0 ms | 0 |

[Resumen exacto](lighthouse/resumen.json), reportes HTML: [portada móvil](lighthouse/portada-mobile.html), [Inicio móvil](lighthouse/inicio-mobile.html), [Tareas móvil](lighthouse/tareas-mobile.html), [portada escritorio](lighthouse/portada-desktop.html), [Inicio escritorio](lighthouse/inicio-desktop.html) y [Tareas escritorio](lighthouse/tareas-desktop.html).

La portada obtiene 96 en buenas prácticas porque la comprobación anónima de `/api/auth/session` devuelve el 401 esperado. Se mantiene el contrato de autenticación y se documenta el motivo; no se transforma ese error HTTP en un éxito artificial para subir la puntuación. Esto no es una excepción JavaScript sin controlar.

La [medición inicial sin compresión](lighthouse/sin-compresion/resumen.json) dio rendimiento móvil **60/66/66** y LCP **9,6/9,5/9,6 s** (portada/Inicio/Tareas). El resultado final **77/92/89** y **3,9/3,3/3,6 s** refleja el conjunto de cambios de entrega, tipografía, icono, instalación y presentación; no es un experimento que aísle el efecto de cada uno. Se conservaron las etapas intermedias `compresion-antes-layout`, `reserva-antes-pwa` y `sin-modal-antes-contenido`, incluidos sus resultados menos favorables. La desaparición del modal permitió medir y corregir saltos que antes quedaban tapados por él.

Queda trabajo de rendimiento móvil: la portada tiene TBT de 400 ms y los tres LCP superan 2,5 s en este laboratorio. El siguiente paso es perfilar el trabajo inicial de JavaScript y el costo de la vista de ejemplo de la portada, además de medir el alojamiento/API reales. No se promete el mismo puntaje para una red, dispositivo o servidor diferente.
