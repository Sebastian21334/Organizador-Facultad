# Fase 6 — Revisión final de backend y módulo chat

Fecha: 9 de octubre de 2026, Argentina. No se hicieron commits.

## Revisión del cambio completo

Se releyeron los cambios de backend, cliente Next, validación de respuestas, pruebas nuevas y documentación. Se contrastaron los contratos entre DTO, controlador, servicio y repositorio para asegurar que null quita un valor y undefined lo conserva. Se revisaron los límites de propiedad, el momento de selección/reserva de recordatorios, la comparación con preferencias actuales y la protección frente a intentos obsoletos.

En el chat se revisaron cronología/paginación, datos recibidos, recuperación de errores, envío concurrente y cierre de sesión. Se verificó que la sesión permanece en cookie HttpOnly y que el tratamiento especial del Origin pertenece exclusivamente a las herramientas de QA. La CSP del producto conserva sus restricciones y elimina los orígenes externos de fuentes que ya no necesita.

La política de fechas es coherente con el front: la API acepta instantes con zona, la interfaz los presenta en hora local y una fecha IA sin hora se convierte al final del día en Argentina. No se reinterpretó información histórica sin conocer su intención. La resolución consulta todas las materias pero el modelo recibe un máximo de 100; la documentación distingue ambos pasos.

La estructura existente se mantuvo: responsabilidades y rutas siguen dentro de sus módulos. Los archivos nuevos de lógica/prueba se ubicaron en `lib` o junto al servicio correspondiente; las fuentes locales y licencias están en `public/fonts`. La instrumentación reproducible se conserva dentro de `docs/evidencia-chat`, sin nueva carpeta de producto. No se identificó un archivo externo de estructura adicional, por lo que se tomó como contrato la organización existente.

Se corrigió sólo una línea en blanco sobrante al final del CSS durante esta revisión. `git diff --check` del backend y chat pasó (configuración que reconoce finales CRLF de Windows). Las advertencias de conversión LF/CRLF de Git no son fallos del producto.

## Última verificación, después de revisar

| Aplicación | Build | Tests | Evidencia |
| --- | --- | --- | --- |
| Backend Nest | PASS | **20 suites, 143 pruebas PASS** | [Build](evidencia-chat/fase6-back-build.txt), [tests](evidencia-chat/fase6-back-tests.txt) |
| Chat Next | PASS, TypeScript y rutas generadas | **8 pruebas PASS** | [Build](evidencia-chat/fase6-chat-build.txt), [tests](evidencia-chat/fase6-chat-tests.txt) |

Los cuatro comandos se ejecutaron en serie. Los mensajes de advertencia de MailService corresponden a casos de fallo de proveedor simulados deliberadamente por la suite. No se enviaron correos reales.

Tras terminar la integración global se repitieron los cuatro comandos y se actualizaron estos registros: builds PASS, backend 143 pruebas PASS y chat 8 pruebas PASS. Durante este cierre, la verificación simultánea inicial de Angular agotó memoria del equipo; sus intentos y recuperación se documentan en el informe global. Backend y chat completaron sin fallos. Se suspendieron las otras comprobaciones intensivas antes de ejecutar el build final de Next.

La [revisión visual final](fase-4-chat.md) conserva 30 capturas en tres tamaños, 15 comprobaciones de flujos/axe sin hallazgos, cuatro estados adicionales a 320 px con texto 100/200 % y recorrido completo por teclado. Lighthouse final: móvil login 92/chat 93; escritorio 100/100; accesibilidad, buenas prácticas y SEO 100 en las cuatro mediciones; CLS 0. El LCP móvil de laboratorio sigue por encima de 2,5 s, por lo que no se presenta el rendimiento como perfecto ni como medición de campo.

Se preservaron los [scripts y pasos de reproducción](evidencia-chat/README.md), comprobando sintaxis y resolución de dependencias. Al finalizar se cerraron los servidores propios de QA (puertos 3001 y 4301); no se detuvieron servidores de otros agentes.

## Límites pendientes, sin cambios ocultos

- Transacción e idempotencia al consolidar mensaje/tarea: requiere definir el contrato de reintento y evitar una transacción abierta durante una llamada IA. El cliente no reintenta automáticamente.
- Cuotas por origen detrás de proxies: dependen de una topología y una identidad confiable de despliegue, todavía no disponibles.
- Índices y volumen: requieren EXPLAIN con datos representativos antes de proponer una migración.
- El historial de migraciones no contiene un esquema inicial completo; queda documentado, sin activar synchronize ni inventar una migración sobre una base desconocida.
- No se probó un despliegue HTTPS real ni proveedores reales. Una reserva revalidada evita enviar según datos ya obsoletos antes de reclamar, pero no puede retirar un correo que el proveedor ya aceptó después.
- Los históricos con fechas ambiguas y el contexto IA de 100 materias necesitan decisiones explícitas posteriores; no se transformaron silenciosamente.

Los detalles de cada cambio y su principio están en [cambios de backend/chat](cambios-back-chat.md); las prioridades originales están en [auditoría](auditoria-back-chat.md).
