# Auditoría y mejoras de Tempo

**Actualización del 10 de octubre de 2026:** por pedido posterior del usuario se eliminaron todos los archivos de pruebas propios de `front` y `back`, los scripts de QA de `front` y su configuración de ejecución. Los resultados y pasos de las seis fases siguientes son históricos; las suites y herramientas eliminadas ya no pueden ejecutarse desde el estado actual. Las pruebas de `Modulo chat` permanecen fuera del alcance de esa eliminación.

Este recorrido conserva las tres aplicaciones y su organización existente. No se hicieron commits. El marcador `[ARCHIVO DE ESTRUCTURA]` no identificaba un archivo real; por eso se tomó como contrato la estructura del repositorio, sin mover carpetas ni fusionar módulos.

## Recorrido de las seis fases

1. [Investigación de UI/UX](ui-ux-guidelines.md): criterios, decisiones para Tempo y fuentes primarias.
2. [Auditoría inicial](auditoria.md): prioridades de impacto/esfuerzo, con anexos de [frontend](auditoria-front.md) y [backend/chat](auditoria-back-chat.md). Describe el estado **anterior** a las correcciones.
3. [Implementación](fase-3-implementacion.md): cambios de integridad, accesibilidad y recuperación de errores; primer control de build/tests.
4. [Revisión visual Angular](fase-4-revision-visual.md) y [chat Next](fase-4-chat.md): capturas, teclado, tamaños, estados, accesibilidad automática y Lighthouse real de laboratorio.
5. [Pruebas](fase-5-pruebas.md): estrategia, comandos y resultados de suites; [anexo backend/chat](fase-5-back-chat.md).
6. [Revisión final](fase-6-revision-final.md): estado de los hallazgos, última verificación, decisiones y pendientes; [anexo backend/chat](fase-6-back-chat.md).

## Para aprender y revisar el diff

[CAMBIOS.md](CAMBIOS.md) relaciona **archivo → cambio → motivo → principio**. Los anexos conservan detalles funcionales: [frontend](cambios-front-funcional.md), [autenticación/perfil](cambios-auth-perfil.md) y [backend/chat](cambios-back-chat.md).

Los resultados de ejecución se distinguen por alcance: una prueba de navegador con API sintética comprueba interfaz e interacción; una prueba HTTP/SQL comprueba contratos y consultas; ninguna de ellas demuestra por sí sola la integración con un proveedor real. Las capturas y reportes permiten revisar los resultados sin depender del historial del chat.

## Evidencia reproducible

- Angular: [matriz visual](evidencia-visual/matriz.json), [flujos](evidencia-flujos/flujos.json), [auth/perfil/contacto](evidencia-flujos/auth-perfil-contacto.json), [entrega estática](evidencia-flujos/preview.json) y [Lighthouse final](lighthouse/resumen.json).
- Next: [instrucciones y scripts](evidencia-chat/README.md), [revisión visual](evidencia-chat/qa-resultados.json), [Lighthouse](evidencia-chat/lighthouse-resumen.json) y registros de build/tests.
- Los subdirectorios de `lighthouse` conservan mediciones intermedias para comparar. No se mezclan sus puntuaciones con las finales de la carpeta principal.
- Los archivos `.log` son registros locales ignorados por Git; los cierres de build/tests se preservan como `.txt`. Capturas de fallos e informes «antes» son evidencia histórica, no el estado final.
