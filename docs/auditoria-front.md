# Auditoría funcional del frontend — fase 2

Fecha: 9 de octubre de 2026 (Argentina). Se inspeccionó el frontend sin modificar código de aplicación. No se encontró `AGENTS.md` ni un archivo inequívoco que corresponda al marcador `[ARCHIVO DE ESTRUCTURA]`; se conserva la organización actual `core`, `features`, `shared` y componentes standalone. Este informe complementa la auditoría general de arquitectura/UI.

## Línea base comprobada

- `npm --prefix front run build`: **falló** al intentar descargar Google Fonts (`ENOTFOUND fonts.googleapis.com`). Evidencia en `baseline-front-build.log`. Es una dependencia de red del build, no un error TypeScript demostrado.
- `npm --prefix front test -- --watch=false`: primer intento abortó las 8 suites antes de ejecutar tests por `EPERM` al renombrar archivos temporales del entorno aislado. No cuenta como fallo funcional de 65 pruebas.
- Repetición con `TEMP` y `TMP` apuntando a `front/.angular/test-temp`: **8 suites, 65 pruebas aprobadas**, sin modificar fuentes. Evidencia en `baseline-front-tests-local-temp.log`.
- No hay configuración E2E, test de `TareaManualFormComponent`, CRUD de materias o mensajes. No se midió porcentaje de cobertura; no se debe inferir de la cantidad de pruebas.

## Hallazgos priorizados

| ID | Impacto / esfuerzo | Evidencia y consecuencia | Corrección propuesta y comprobación |
|---|---|---|---|
| F01 | Alto / medio | `features/tareas/tareas.component.ts:919,939,1008`: editar usa fecha sin hora y siempre la vuelve a enviar. Cambiar solo el título de una entrega a las 14:30 reemplaza su hora por medianoche y puede alterar recordatorios. | Usar fecha/hora local y omitir `fechaLimite` si no cambió, preservando segundos del instante original. Pruebas de cambio de título, cambio de fecha y fecha vacía. |
| F02 | Alto / medio | `tareas.component.ts:938-939` envía `undefined` al quitar materia o fecha. `back/src/tareas/controllers/tareas.controller.ts:95-96` solo propaga valores truthy. La interfaz informa éxito pero no elimina esos campos. | Contrato PATCH explícito: `undefined` conserva, `null` elimina. Tipar DTO de actualización y modificar backend coordinadamente; probar el flujo completo, no solo el botón. |
| F03 | Alto / medio | Alta manual (`tarea-manual-form.component.ts:183`) convierte hora local a un instante UTC real. Calendario/Inicio muestran UTC como hora civil y agrupan por `getUTCDate`; el diálogo también crea fechas anexando `Z`. En Argentina, crear 22:30 puede mostrar 01:30 del día siguiente. Los tests actuales fijan la convención anterior y no detectan esta discrepancia. | Contrato único: API ISO representa un instante, visualización y controles en hora local del navegador. Comparaciones, intervalos del calendario y agenda local. IA que solo entrega fecha: fin de día en `America/Argentina/Buenos_Aires` (23:59:00-03:00), coordinado con backend. **Sin migración ciega de datos históricos** porque no hay marcador de su semántica. Tests con fechas próximas a medianoche en Argentina. |
| F04 | Alto / bajo | `calendario.component.ts:331-358`: cada navegación suscribe otra petición. Una respuesta lenta de octubre puede llegar después de noviembre; usa además `this.vista()` y `construirPeriodo()` actuales con datos antiguos. | Cancelar la petición anterior y al destruir; conservar snapshot del período o identificador de solicitud. Prueba con dos respuestas en orden inverso y error viejo. |
| F05 | Alto / bajo | `inicio.component.ts:144-173`: detalle montado como dos `div` sin semántica modal, foco inicial, confinamiento del teclado, Escape ni nombre accesible de cierre. Existe un diálogo nativo ya implementado en calendario. | Reutilizar `TareaCalendarioDialogComponent`, recargar resumen cuando actualiza. Prueba de apertura/cierre y actualización más verificación real del foco. Evita duplicar lógica de detalles. |
| F06 | Medio / bajo | `materias.component.ts`: formularios manuales validan nombre solo requerido y año solo mínimo. Backend exige nombre ≤150 y año entero 1–20. Edición no muestra errores de campos. | Igualar límites y validación, asociar mensajes con `aria-describedby`/`aria-invalid`. Pruebas para nombre vacío, largo, año fraccionario y >20; retener formulario ante errores. |
| F07 | Medio / bajo | `tarea-manual-form.component.ts:24` permite cerrar con la X mientras guarda (Cancelar sí se bloquea). El botón de nueva tarea del padre también desmonta el formulario. La petición puede completar sin que el padre reciba el evento y la tarea desaparece hasta recargar. | Propagar estado ocupado al padre, bloquear cierre durante el guardado y normalizar finalización. Prueba con petición pendiente. |
| F08 | Medio / bajo | `tarea-manual-form.component.ts:38,157` no limita descripción aunque backend limita a 4000; `mensajes.component.ts` tampoco limita texto frente al contrato backend. Fechas no válidas pueden arrojar `RangeError` antes de manejar un error de servidor. | Validación defensiva y límites consistentes con API antes de enviar; mensajes específicos y conservación de datos. |
| F09 | Medio / bajo | `inicio.component.ts:320-385`: `computed` lee `new Date()` sin señal de reloj. Resumen, semana y próximo vencimiento quedan obsoletos al cambiar el día si no cambian las tareas. Calendario tiene reloj para pendientes pero `dias.esHoy` solo se reconstruye con carga. | Señal de reloj de baja frecuencia con limpieza al destruir; día/semana derivados. Tests de cambio de día/semana con reloj simulado. |
| F10 | Medio / bajo | `src/styles.css:1` + build production: Google Fonts se descarga al compilar. Una caída o restricción de red impide construir. | Fuentes locales, o inlining de fuentes deshabilitado con fallback sólido. Documentar diferencia entre build reproducible y carga de la tipografía en red. No aumentar budgets para tapar problemas. |
| F11 | Medio / medio | `core/services/paginacion.ts` agrega arrays copiando todo en cada página, espera todas antes de mostrar datos y corta silenciosamente tras offset 10000. Tareas, materias y mensajes cargan todo; el chat renderiza toda la historia. | Para esta escala: eliminar copias acumulativas innecesarias; a futuro paginación visible o carga incremental desde API y límite explícito. No afirmar pérdida habitual: requiere >10100 elementos. Tests de páginas completas/vacías/error/límite. |
| F12 | Medio / bajo | `inicio.component.ts:425` y `tareas.component.ts:827`: una caída al listar materias se convierte silenciosamente en lista vacía. El usuario ve cero materias o select vacío, confundiéndose un error con ausencia real. | Estado de error independiente y opción de reintento que preserve datos previos. No bloquear consulta de tareas ya cargadas. |
| F13 | Bajo / bajo | `materias.component.ts` ordena alfabéticamente y luego `reverse()` por grupo, más variable `label` sin uso y bloque `if (!key)` sin efecto. | Orden explícito y consistente, quitar código muerto dentro del mismo archivo. Verificar agrupación año/cuatrimestre y mantener ubicación de archivos. |
| F14 | Bajo / medio | `pdf-plan.service.ts` libera el documento en finally y la importación ignora respuestas viejas correctamente; sin embargo cancelar durante lectura no aborta extracción PDF y puede continuar leyendo hasta 50 páginas. | Cancelación cooperativa o AbortSignal a futuro, sin confundir cancelar visualmente con parar trabajo. Texto por filas usa búsqueda repetida (potencial O(n²) en páginas densas); medir antes de optimizar. |

## Aspectos sólidos que conviene conservar

- Rutas lazy, modelos y servicios separados por dominio, componentes standalone y señales para estado derivado.
- Sesión basada en cookie del servidor, CSRF limitado al origen/ruta de API, restauración compartida y protección contra comprobaciones anteriores al logout. Tests de red simulada cubren login, expiración, cortes, carreras y baja push.
- `ImportarPlanComponent` valida, pide revisión, evita duplicados normalizados, conserva datos al fallar, impide dobles envíos y cancela la suscripción de análisis. No envía el PDF binario a IA: extrae texto limitado y valida tipo/tamaño/páginas.
- `PdfPlanService` tiene carga dinámica, worker separado y liberación de recursos en finally. La importación no acepta silenciosamente un PDF mixto parcial.
- Diálogo de calendario usa `<dialog>`, restaura el formulario y evita cierres/envíos duplicados mientras guarda. Es la base adecuada para unificar detalles.
- Los mutadores muestran feedback y suelen preservar datos ante fallos. Eliminar exige confirmación.

## Clean code y alcance de refactorización

Hay componentes muy largos (Tareas supera 1000 líneas), principalmente por HTML y estilos inline. Extraer template/CSS mejoraría lectura, pero supone una decisión de estructura; se registra como recomendación, no se aplica por la restricción del usuario. Dentro de la estructura existente sí conviene unificar transformaciones de fecha en `core`, reutilizar el diálogo, eliminar código muerto y mantener pruebas próximas al código.

La mayoría de suscripciones HTTP finalizan por sí mismas, por lo que no se afirma una fuga permanente generalizada. Aun así, cancelar lecturas al destruir o reemplazar una petición evita trabajo innecesario y respuestas fuera de orden. No conviene cancelar a ciegas escrituras pensando que deshace lo que el servidor ya guardó: el estado de guardado debe modelarse explícitamente.

## Plan de pruebas recomendado

1. Regresiones de fecha: creación, edición sin cambiar hora, limpiar campos, agrupación local, rango de mes/semana, fin de día IA.
2. Calendario: respuestas cruzadas al navegar; detalle compartido desde Inicio; guardado fallido y reintento.
3. Tareas: doble envío, bloqueo de cierre pendiente, filtros combinados, completar/eliminar con fallo.
4. Materias: validación coincidente con backend, CRUD con error y retención, agrupación determinista.
5. Chat: texto vacío/largo, retención tras fallo, solicitud única, no sobrescribir un envío con la carga inicial.
6. Verificación en navegador: foco modal y retorno, 3 tamaños, teclado, dark mode, estados loading/error/empty y Lighthouse. jsdom no sustituye esas verificaciones.

La prioridad es integridad de datos y claridad de estados. Las mejoras cosméticas y grandes refactors quedan detrás de estas regresiones observables.
