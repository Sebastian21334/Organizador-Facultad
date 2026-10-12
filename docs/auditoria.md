# Fase 2 — Auditoría previa a modificar el código

Fecha de inicio: 9 de octubre de 2026, Argentina. Alcance: frontend Angular, API NestJS y módulo Next.js. Auditoría estática y ejecución de comprobaciones basales; las mediciones de navegador corresponden a la fase 4 y no se presuponen aquí.

## Arquitectura que se conserva

No se recibió un nombre real en lugar de `[ARCHIVO DE ESTRUCTURA]` y no existe un documento equivalente encontrado en el repositorio. Se respeta la estructura observada:

- `front/src/app/core`: modelos, servicios, guards e interceptores transversales.
- `front/src/app/features`: pantallas y servicios por funcionalidad.
- `front/src/app/shared`: componentes y directivas reutilizables.
- `back/src`: módulos de dominio con controllers, services, repositories, DTO y entidades; migraciones separadas.
- `Modulo chat/app`: rutas y handlers de Next.js; `lib` y `components` existentes.
- `docs`: entregables solicitados, evidencia y registro pedagógico.

No se mueve ninguna carpeta ni se fusionan aplicaciones. La separación de lógica de dominio y acceso a datos del backend y la carga diferida de rutas del frontend son buenas bases existentes.

## Prioridades

P1 = pérdida/inconsistencia de datos o bloqueo de un flujo importante; P2 = accesibilidad, fiabilidad y mantenibilidad con efecto directo; P3 = mejora posterior. Esfuerzo: bajo (acotado), medio (varias piezas/tests), alto (requiere rediseño o migración).

| ID | Hallazgo y evidencia inicial | Impacto | Esfuerzo | Acción prevista |
| --- | --- | --- | --- | --- |
| A01 | `tareas.component.ts` recorta la fecha a día al editar; vaciar fecha/materia envía `undefined`. | P1: perder horario o confirmar un borrado que no persiste. | Medio | Conservar precisión y diferenciar campo ausente de `null`; verificar API y UI. |
| A02 | Alta manual convierte a ISO UTC; calendario, inicio y diálogos muestran UTC como hora civil; IA interpreta el día desde UTC. | P1: tareas en día/hora equivocados. | Alto | Contrato de instantes ISO, calendario local, IA al final del día argentino; documentar datos históricos ambiguos. |
| A03 | `calendario.component.ts` acepta respuestas de una navegación anterior. | P1: mostrar tareas de otro período bajo un encabezado nuevo. | Medio | Invalidar/cancelar peticiones obsoletas y probar respuesta fuera de orden. |
| A04 | Selección de recordatorios limita a 100 antes de decidir qué aviso ya venció. | P1: avisos listos pueden quedar bloqueados. | Medio | Filtrar por momento del aviso antes del límite y comprobar reservas/reprogramación. |
| A05 | `mensajes.service.ts` resuelve materias usando sólo una página y coincidencias permisivas. | P1: asociación a materia incorrecta o incompleta. | Medio | Cubrir todas las materias del usuario y resolver ambigüedad conservadoramente. |
| A06 | Next chat ordena historial descendente pero agrega nuevos al final; borra borrador antes de confirmar y navega al salir aunque logout falle. | P1/P2: conversación incoherente, pérdida de texto y falso cierre. | Medio | Orden cronológico, recuperación del borrador y logout según respuesta real. |
| A07 | `app.html/app.css`: drawer fuera de pantalla sigue siendo alcanzable por Tab; falta Escape, encierro/retorno del foco y cierre explícito. | P1: navegación móvil por teclado bloqueada o invisible. | Medio | Panel modal accesible en móvil, contenido inerte mientras está abierto, foco gestionado. |
| A08 | Inicio usa un `div` como modal, sin semántica, foco ni Escape; calendario ya dispone de diálogo nativo. | P2: experiencia inconsistente y barreras de accesibilidad. | Bajo | Reutilizar diálogo existente sin mover carpetas. |
| A09 | `styles.css`: foco con accent al 28%, etiquetas claras, botones oscuros con combinaciones dudosas. | P2: poca legibilidad y foco difícil de ver. | Medio | Tokens semánticos contrastados; medir contraste en ambos temas y estados reales. |
| A10 | Formularios auth no vinculan errores con campos; algunos errores de contraseña máxima/requerida no se muestran y submit no bloquea duplicados. | P2: imposibilidad de comprender o corregir error, solicitudes repetidas. | Medio | `aria-invalid`, `aria-describedby`, validación explicativa y exclusión de envío concurrente. |
| A11 | `ThemeService` lee/escribe localStorage sin protección; perfil hace lo mismo para un aviso. | P2: preferencias secundarias pueden romper la app con almacenamiento restringido. | Bajo | Degradación a memoria y preferencia del sistema; tests de fallo. |
| A12 | Build Angular descarga Google Fonts en cada compilación (fallo ENOTFOUND basal). | P1 para entrega/build, P2 rendimiento. | Medio | Fuentes locales con licencia, `font-display: swap`, sin petición externa obligatoria. |
| A13 | Next viewport impide zoom; compositor/foco y movimiento reducido incompletos. | P2: barrera de lectura y navegación. | Bajo | Restaurar zoom, foco visible y reduced-motion. |
| A14 | Faltan pruebas en CRUD materias, alta manual, servicios tareas/mensajes, shell, tema y chat Next. | P2: errores de flujo no detectados por suites actuales. | Medio | Regresiones dirigidas a A01–A13; pruebas de navegador, estados y contrato. |
| A15 | Repetición de colores literales y overrides globales con `!important`; componentes de cientos de líneas con HTML/CSS inline. | P3: alto costo de mantenimiento. | Alto | Mejorar tokens donde haya impacto inmediato; documentar futura extracción sin cambiar arquitectura ahora. |
| A16 | README de backend mayormente plantilla; no hay entrada unificada de verificación de las tres apps. | P2/P3: onboarding y verificación incompletos. | Bajo | Documentar comandos reales y resultados de fases; no prometer e2e inexistente. |

## Clean code y organización

Las responsabilidades de controladores/repositorios están relativamente claras. En frontend los componentes mezclan plantilla, estilo, normalización, peticiones y estado. No es necesario reescribirlos todos para corregir errores: primero se extraen únicamente operaciones repetidas con significado de dominio, por ejemplo la conversión entre fecha local e ISO. Evitar extraer helpers que sólo renombren una línea y creen más navegación.

Los nombres en español son coherentes con el dominio. La cantidad de estilos literales dificulta mantener claro/oscuro. Conviene una migración gradual a tokens; una reestructuración completa de componentes, unificación Angular/Next o cambio de diseño quedan como recomendaciones y no se aplican.

## Rendimiento

Las rutas Angular ya son lazy y PDF.js se importa al usar PDF: conservar ambos. Evaluar Lighthouse sobre build de producción, con perfil móvil y escritorio y datos locales reproducibles. Separar demora de backend frío de costo del frontend. Hay riesgos de consultas sin paginación funcional para grandes listas, carga global de tipografías externas y animaciones decorativas continuas. Las métricas de laboratorio no prueban rendimiento de usuarios reales ni INP de campo.

## Pruebas basales y limitaciones del entorno

- Build frontend falla por descarga obligatoria de Google Fonts: `baseline-front-build.log`.
- Primer intento frontend tests no llega a ejecutar tests por EPERM en temporales del sandbox. Es un fallo de infraestructura, no un resultado de la lógica. Se reintenta con permisos/rutas adecuados y se conserva el resultado válido.
- Backend: build válido y baseline 17 suites / 121 tests válidos según ejecución de auditoría; detalle en anexo.
- Módulo Next.js: build basal y pruebas disponibles documentados en anexo (no existía script de tests).

No se publica porcentaje de cobertura sin medición. Se distingue test de comportamiento, prueba HTTP con base aislada, prueba visual con API simulada y servicios externos reales.

## Documentos relacionados

- `ui-ux-guidelines.md`: investigación y criterios de aceptación de fase 1.
- `auditoria-front.md`: evidencia detallada de frontend y huecos de pruebas.
- `auditoria-back-chat.md`: evidencia detallada de API y Next.js.
- `CAMBIOS.md`: decisiones de implementación y principios aplicados.

La fase 3 resuelve primero P1 y después P2. Los hallazgos nuevos de ejecución visual se incorporan a `fase-4-revision-visual.md`; los pendientes finales se contrastan en `fase-6-revision-final.md`.
