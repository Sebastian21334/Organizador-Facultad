# Fase 6 — Revisión final del proyecto

Fecha: 9 de octubre de 2026, Argentina. Este informe reúne las tres aplicaciones. La última verificación se registra al final después de releer el cambio completo.

## Qué se revisó

Se contrastaron los contratos de fechas y actualizaciones entre formularios, DTO, controlador, servicio y repositorio. Se revisaron respuestas fuera de orden, preservación de borradores, exclusión de envíos, foco de navegación/diálogos, preferencias opcionales y tratamiento de errores. El backend y Next recibieron una revisión independiente, con su [cierre detallado](fase-6-back-chat.md).

Los cambios finales de rendimiento surgieron de evidencia del navegador: un desplazamiento de 154 px al restaurar sesión, opacidad aplicada a toda la ruta, un modal de instalación automático en móvil y un favicon de 820 KB. Se corrigieron las causas y se ampliaron los verificadores para impedir falsos positivos por una redirección a otra ruta. Las fuentes locales también se comprobaron con el service worker real y sin red.

Después de retirar el modal, Lighthouse permitió detectar otros dos estados intermedios: el aviso de recordatorios empujaba los filtros y el pie de la portada aparecía antes que su contenido. Se sincroniza la presentación de cada bloque con la información que necesita; Tareas sigue disponible si falla la preferencia auxiliar. La última serie dejó CLS 0 en las seis mediciones Angular.

La revisión cruzada de documentación corrigió una afirmación demasiado amplia: **cambiar fecha o anticipación** invalida una reserva de recordatorio; editar sólo el título no lo hace. La documentación debe explicar la regla que implementa el código, no una aproximación más general.

## Conservación de estructura y decisiones

- No se hicieron commits, se conserva el diff para revisión.
- No se movieron, renombraron ni eliminaron carpetas de producto. Se mantuvieron Angular `core/features/shared`, módulos Nest y Next `app/lib/components`.
- `[ARCHIVO DE ESTRUCTURA]` no identificaba un archivo real y no se encontró otro contrato de arquitectura; se documentó la decisión de preservar la organización existente.
- Los helpers/pruebas se ubicaron junto a responsabilidades existentes. Fuentes y licencias usan los directorios públicos; herramientas Angular usan su carpeta `scripts`; informes y evidencia están en `docs`.
- No se aumentaron presupuestos de build, no se habilitó `synchronize`, no se alteraron datos históricos ni se sustituyeron proveedores reales para aparentar una integración aprobada.

## Estado de la auditoría inicial

| Hallazgos | Resultado y evidencia |
| --- | --- |
| A01–A05: fechas, campos opcionales, respuestas tardías, recordatorios y materias | Corregidos con pruebas de lógica, HTTP y SQL. Edición de título conserva precisión; `null` quita; omisión conserva. Navegador verifica 22:30 Argentina → 01:30 UTC del día siguiente sin alterar la hora presentada. |
| A06: chat Next | Corregidos orden/paginación, recuperación de borrador y cierre confirmado. Pruebas Node y flujos reales sobre API sintética. |
| A07–A11 y A13: navegación, diálogos, contraste, formularios, almacenamiento y zoom | Corregidos y verificados con teclado, axe, tres tamaños, ambos temas Angular y reflow/espaciado ampliado. |
| A12: fuentes y build dependiente de red | Fuentes locales con licencia. Carga opcional evita sustituciones tardías y precargas acotadas priorizan texto. Configuración de PWA incorpora su caché. |
| A14: huecos de pruebas | Se agregaron regresiones de las reglas y flujos principales. No se afirma cobertura total ni un porcentaje que no se midió. |
| A15: CSS global y componentes grandes | Parcial: tokens, duplicación puntual y código muerto corregidos. Refactorizar completamente estilos/componentes sigue pendiente; no se cambió la arquitectura. |
| A16: documentación y comandos | READMEs y seis fases documentados; scripts de QA reproducibles; pruebas HTTP del backend usan un comando real. |
| F11: listas de gran volumen | Parcial: acumulación lineal por suscripción. Angular aún carga todas las páginas y corta tras 10.100 registros; Next tiene carga explícita de mensajes anteriores. |
| F14: extracción de PDF | Pendiente de optimización: cancelar la interfaz no aborta la extracción en curso. No se agregó una cancelación ficticia. |
| B13, B14, B16 y B19 | Pendientes de contrato/despliegue/medición; se detallan debajo. B01–B12, B15, B17 y B18 se cubren en los cambios y pruebas de backend/chat. |

## Qué queda sin resolver y próximo orden recomendado

1. **Idempotencia y transacción final mensaje/tarea (B13).** Si se pierde la respuesta después de crear una tarea, repetir el mensaje todavía puede duplicarla. Definir una clave de solicitud y una operación final atómica, sin mantener abierta una transacción durante la llamada a IA. El cliente conserva el borrador y no reenvía automáticamente.
2. **Base de datos y despliegue (B19/B14).** El historial de migraciones carece de un esquema inicial completo. Preparar/verificar el baseline con una base de ensayo conocida. Definir cómo identifica usuarios/IP el proxy antes de cambiar cuotas; confiar en cualquier `X-Forwarded-For` no sería una solución segura.
3. **Integración real.** Probar en un entorno de ensayo con HTTPS, PostgreSQL, correo, IA y push; recuperación de sesión, instalación y actualización PWA. No se usaron cuentas ni proveedores reales para estas pruebas. Una reserva revalidada tampoco puede retirar un correo ya aceptado por el proveedor.
4. **Escala y rendimiento sostenido.** Paginación visible/incremental para las listas Angular, límite explícito y manejo de más de 10.100 registros. Revisar contexto IA de 100 nombres frente al catálogo completo que usa el resolvedor. Medir consultas con datos representativos y `EXPLAIN` antes de crear índices (B16). Medir producción y usuarios reales; los informes locales no son INP ni datos de campo.
5. **Mantenibilidad y compatibilidad.** Reducir CSS global/`!important` y tamaño de componentes gradualmente, sin reorganizar carpetas. Añadir cancelación cooperativa de PDF y medir páginas densas. Completar Safari/Firefox, dispositivos físicos, lector de pantalla y zoom nativo; la emulación de iPhone en Chromium no prueba WebKit.
6. **Históricos de fechas.** Analizar el origen de los registros antes de migrarlos: sin un marcador de su antigua semántica, una conversión automática puede corregir unos y dañar otros.

## Límites de la validación

Las capturas se obtuvieron de los builds reales con una API sintética controlada; validan interfaz y flujos, no persistencia de producción. El backend se probó también por HTTP y con PostgreSQL efímero mediante PGlite. Cero hallazgos automáticos de accesibilidad no equivale a certificación WCAG.

Angular conserva cinco advertencias de CSS por encima del umbral preventivo de 4 KB (Inicio, Calendario, Tareas, Landing y shell); el límite que hace fallar el build permanece en 8 KB. No se ocultaron avisos aumentando el presupuesto. Los mensajes de proveedor fallido en tests del backend pertenecen a fallos simulados deliberados.

La compresión se verifica en el servidor local de preview. El alojamiento real debe ofrecer su propia compresión/caché. Las fuentes recuperables sin conexión son recursos estáticos: la sesión y los datos privados siguen requiriendo API y no se almacenan como respuestas en la caché del service worker.

## Incidencia de recursos en el cierre

Un primer pase de fase 6 ejecutó las suites de aplicaciones distintas simultáneamente. Node/Vitest abortó workers con `process out of memory` y Git no pudo reservar memoria. Se conserva el [intento interrumpido](evidencia-flujos/fase6-front-intento-sin-memoria.txt); sus casos parciales no se cuentan como aprobación. Se repiten los comandos con una aplicación por vez, sin modificar producto ni retirar tests. Es una limitación de capacidad del equipo, distinta de una aserción funcional fallida.

## Última verificación después de la revisión

Se completaron nuevamente los tres builds y suites al cierre global. Backend y Next se ejecutaron en serie; después se repitió Angular solo, resolviendo la incidencia de memoria. Todos finalizaron con código de salida 0.

| Aplicación | Build final | Tests finales | Registros |
| --- | --- | --- | --- |
| Angular | **PASS** | **17 suites / 136 pruebas PASS** | [Build](evidencia-flujos/fase6-front-build.txt), [tests](evidencia-flujos/fase6-front-tests.txt) |
| Backend NestJS | **PASS** | **20 suites / 143 pruebas PASS** | [Build](evidencia-chat/fase6-back-build.txt), [tests](evidencia-chat/fase6-back-tests.txt) |
| Chat Next.js | **PASS** | **8 pruebas PASS** | [Build](evidencia-chat/fase6-chat-build.txt), [tests](evidencia-chat/fase6-chat-tests.txt) |

**287 pruebas aprobadas en total.** El subconjunto HTTP no se vuelve a sumar. La última ejecución Angular completó sus 136 casos en 12,70 s de runner; no quedaron errores de workers ni aserciones pendientes.

La [revisión visual final Angular](fase-4-revision-visual.md) conserva 84 escenarios limpios, 20 grupos de flujos, 7 flujos adicionales con 65 aserciones, seis comprobaciones de entrega estática y cinco de PWA. Next conserva [30 capturas y sus recorridos](fase-4-chat.md). Se renovaron los reportes después de corregir los hallazgos; los artefactos históricos se identifican por separado.

Lighthouse Angular: escritorio **100/100/100**, móvil **77/92/89** para portada/Inicio/Tareas, accesibilidad **100** y CLS **0** en las seis mediciones. Next: móvil **92/93**, escritorio **100/100** para login/chat, accesibilidad **100** y CLS **0**. El trabajo móvil pendiente se comunica con sus LCP/TBT reales en cada informe; no se oculta detrás de la puntuación de escritorio.

`git diff --check` pasó con finales CRLF reconocidos; la consulta de renombres/eliminaciones no devuelve archivos. Los enlaces locales de los informes se comprobaron contra los archivos guardados. Los servidores propios de QA quedaron detenidos y no se hicieron commits. La documentación conserva las seis fases y [CAMBIOS.md](CAMBIOS.md) permite revisar qué se cambió, por qué y qué práctica aplica.
