# Registro funcional frontend — fases 3 y 5

Este registro se integra en `CAMBIOS.md`; mantiene detalles por archivo para aprendizaje y trazabilidad. No se movieron carpetas ni se hicieron commits.

| Archivos | Cambio y motivo | Principio aplicado |
|---|---|---|
| `front/src/app/core/services/fechas.ts` y su spec | Conversión explícita ISO ↔ control de fecha/hora local, comparación por día local y rechazo de fechas imposibles. Evita desplazar una entrega nocturna al día siguiente y errores de conversión. | Un contrato de datos consistente y validación antes de mutar estado. Un instante UTC y una fecha civil no son lo mismo. |
| `core/models/tarea.model.ts`, `features/tareas/tareas.service.ts` | DTO PATCH con campos anulables: omitir conserva; `null` quita fecha/materia. | Semántica explícita de actualización parcial; tipos que expresan intención. |
| `features/tareas/tareas.component.ts` y su spec | Edición con fecha/hora local, omisión de vencimiento sin cambios para conservar segundos, borrado explícito, protección contra doble envío y cierre de alta pendiente. Errores de materias separados de lista vacía. | Integridad de datos, prevención de errores y feedback fiel al estado real. |
| `features/tareas/tarea-manual-form.component.ts` y su spec | Descripción limitada a 4000, fecha validada, mensajes asociados, estado ocupado notificado al padre y cierre bloqueado mientras se guarda. | Validación alineada con API; una única operación por intención; no perder entradas durante solicitudes. |
| `features/calendario/calendario.component.ts` y su spec | Intervalos y agrupación en día local; trae 42 días visibles o semana completa. Cancela lecturas reemplazadas y al destruir; agrupa con Map. Reintento de carga, vista seleccionada anunciada, sección sin segundo main. | Evitar condiciones de carrera, O(tareas + días) en lugar de filtrar todas por cada celda, semántica accesible. |
| `features/calendario/tarea-calendario-dialog.component.ts` | Muestra e ingresa hora local; fecha opcional con `null` explícito; preserva instante exacto si no cambia. | Misma regla de negocio en todos los puntos de entrada. |
| `features/inicio/inicio.component.ts` y su spec | Reutiliza diálogo nativo con edición y completar; actualiza resumen con respuesta real. Reloj de baja frecuencia actualiza próximos vencimientos/semana. Conserva materias ante fallo y comunica error. Vista de ejemplo no abre mutaciones. | Reutilización, derivados reactivos y separación del ejemplo respecto de datos reales. |
| `features/materias/materias.component.ts` y nuevo spec | Nombre ≤150, año entero 1–20 u opcional; errores identificados en alta/edición. Orden alfabético estable, sin reverse ni código muerto. | Límites coincidentes con servidor, orden predecible y claridad del código. |
| `features/mensajes/mensajes.component.ts` y nuevo spec | Espera historial antes de enviar para evitar sobrescribir el nuevo mensaje; cancela cargas reemplazadas, valida máximo 4000, retiene texto ante error. Quitado estado “En línea” no comprobado. | Concurrencia segura, conservación de entrada y no presentar estados inventados. |
| `core/services/paginacion.ts` y nuevo spec | Acumulación lineal, dentro de `defer` para tener una lista independiente por suscripción. | Evitar copias repetidas sin compartir estado mutable entre consumidores. |

## Decisión sobre fechas históricas

La API conserva ISO como instante real. El frontend presenta la zona local del navegador. Backend coordina que fechas IA sin hora venzan al final del día en Argentina. No se reinterpretaron ni migraron registros históricos: no existe un marcador fiable para saber si su UTC representaba un instante o una hora civil. Corregirlos automáticamente podría dañar datos válidos.

## Verificación de fase 3

- Baseline: 65 pruebas aprobadas en 8 suites, usando directorio temporal local para evitar EPERM del sandbox Windows.
- Primera ejecución tras correcciones: pruebas funcionales propias aprobadas; suite general 98 aprobadas, un fallo ajeno en expectativa de texto de recuperación de contraseña y una suite push interrumpida por resolución temporal de dependencia. Comunicado al coordinador para corregir y repetir.
- Suite ampliada aprobada: **17 suites / 129 pruebas**, ejecutada con zona Argentina. Log `fase3-front-funcional-tests.log`.
- Build producción aprobado: log `fase3-front-funcional-build.log`. Permanecen avisos de presupuesto CSS en Inicio, Calendario, Tareas, shell y Landing; no se elevaron umbrales. Se quitó un import de badge que quedó sin uso al reutilizar el diálogo.
- Revisión adicional: se bloquea crear mientras carga el listado inicial para que una respuesta lenta no sobrescriba registros nuevos, se conserva otra edición abierta si termina una anterior y se esperan materias antes de habilitar importación (duplicados consistentes).
- La revisión visual de tres tamaños y ambos temas corresponde a la fase 4 coordinada; no se sustituye por estas pruebas de jsdom.

## Correcciones de fase 4 basadas en navegador real

Evidencia inicial: `docs/evidencia-visual/matriz.json`, obtenida por el coordinador en 390/768/1440 px y ambos temas. Se corrigieron estos problemas observados, conservando el lenguaje visual:

- **`features/inicio/inicio.component.ts`:** las filas de tareas ahora permiten salto de línea tanto en título como en fecha/materia, admiten filas flexibles y no fuerzan una línea sin cortes. Esto evita desbordamientos con títulos largos en móvil/tablet. Principio: el contenido determina altura y se adapta al ancho disponible.
- **Inicio y Calendario:** iniciales visuales de día y contador decorativo llevan `aria-hidden`; el nombre accesible conserva la fecha completa, número de día y cantidad de tareas. La etiqueta visible numérica queda incluida en el nombre anunciado. Principio: nombre accesible coherente con contenido visible (control por voz y lector de pantalla).
- **`shared/components/agenda-dia.component.ts`:** nivel de título configurable (h2 predeterminado en Calendario, h3 dentro de “Esta semana” en Inicio). **Mensajes:** título de cada tarea es h2 debajo del h1 de la página. Principio: jerarquía de encabezados que refleja la estructura, sin saltos por razones de estilo.
- **Calendario:** el panel de próximas/vencidas se oculta durante carga y error para no presentar datos del período anterior. El vacío distingue mes y semana. Se añade regresión con respuesta pendiente y fallo.
- **Alta de tareas:** recibe estado de bloqueo del listado padre; conserva entradas pero impide enviar durante un reintento de carga. Se añade regresión para evitar que la respuesta del listado sobrescriba una tarea recién creada.

Estos cambios quedaron preparados sin ejecutar build/tests durante la primera matriz, para no sobrescribir el `dist` que se estaba midiendo. Su validación se realizará en la siguiente ejecución coordinada.

## Flujos de autenticación, perfil y contacto en navegador

`front/scripts/verify-auth-flows.mjs` terminó con **7 de 7 flujos y 65 aserciones aprobadas** en Chrome real, contra el build y la API fixture local. Registro, login, recuperación, restablecimiento, verificación de email, guardados independientes del perfil y contacto cubren 390/768/1440 px; verificación y perfil también se ejercitaron en oscuro. Reporte: `docs/evidencia-flujos/auth-perfil-contacto.json`, con capturas por estado; ejecución: `docs/qa-auth-final.log`.

El primer intento reveló una carrera del propio harness: consultaba `disabled` al recibir el evento de solicitud, antes del siguiente render. Se retiene ahora la solicitud, se espera el estado DOM y se libera después de verificarlo. También se observan de inmediato rechazos de las promesas de red para que cerrar un contexto tras fallar no oculte la aserción original. No hizo falta modificar producto ni reconstruir por este ajuste de QA.

Estos resultados verifican interfaz, navegación, teclado, feedback y retención con respuestas HTTP simuladas; no significan que se haya enviado correo real ni verifican por sí solos seguridad o persistencia del backend de producción.

## Reserva de navegación durante restauración de sesión

La medición posterior de fase 4 detectó un desplazamiento horizontal del `main`: de x=0 a x=154 al aparecer la barra lateral después de comprobar la sesión (CLS observado por el coordinador: 0,114). Se modificaron `front/src/app/app.ts`, `app.html` y `app.css` para reservar ese ancho desde el primer render de una ruta privada pendiente. En móvil un bloque vacío `aria-hidden` e `inert` reserva la altura de los controles; comparte tamaño de control y padding responsive con la barra real.

La detección usa `Location` (normaliza el `base href` y no depende de `window`) y las rutas planas existentes con `authGuard`, sin mantener una segunda lista de URL. La reserva se apaga al completar la primera navegación y sólo existe mientras se comprueba una sesión todavía no autenticada. Las rutas públicas conservan su geometría y la navegación privada sigue condicionada a `isAuthenticated()`.

Principio: mantener espacio estable para contenido asíncrono sin confundir presentación con autorización. No se ejecutaron build, tests ni mediciones durante este ajuste para no alterar el preview que usa el coordinador; la comprobación de geometría y CLS queda en su siguiente ejecución integrada.
