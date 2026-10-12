# Fase 3 — Implementación y control

Se implementaron primero los errores de integridad y después accesibilidad y resiliencia, según `auditoria.md` y `ui-ux-guidelines.md`. No se hicieron commits ni se movieron carpetas.

## Cambios concretos

- Las fechas de la API representan instantes ISO. Calendario, agenda y edición trabajan con hora local; editar un título preserva segundos; `null` borra un dato opcional y omitirlo lo conserva. IA sin hora usa fin de día argentino. No se migran datos históricos ambiguos.
- El calendario descarta cargas anteriores, Inicio reutiliza el diálogo nativo y ambos actualizan el día con reloj limpio al destruir.
- La consulta SQL selecciona avisos debidos antes del límite, evita bloqueo por otras 100 tareas y reprogramar invalida la reserva anterior.
- La resolución de materias considera todo el catálogo del usuario y no confunde niveles I/II ni elige empates arbitrarios.
- Chat Next conserva borradores, ordena/pagina historial y confirma logout; se restauran zoom, foco y preferencia de movimiento reducido.
- Formularios accesibles con errores vinculados, foco, exclusión de doble envío y reglas Unicode/bytes coherentes; guardar recordatorio no envía un nombre sin guardar.
- Drawer móvil con comportamiento de teclado, salto al contenido, etiquetas de navegación visibles, fuentes locales y preferencia de tema resistente a almacenamiento bloqueado.

## Control al cierre de implementación

| Aplicación | Build | Pruebas |
| --- | --- | --- |
| Angular | PASS producción, con advertencias CSS conservadas | 17 suites / 129 tests PASS en control funcional; registro consolidado `fase-3-front-tests.log` |
| NestJS | PASS | 20 suites / 136 tests PASS; HTTP `test:e2e`: 3 suites / 28 tests PASS |
| Next.js | PASS | Suite Node nativa: 8 / 8 PASS |

Los intentos afectados por permisos temporales/artefactos concurrentes se repitieron en un entorno válido; no se cuentan como fallos funcionales ni se eliminó un test para hacerlos pasar. Las siguientes ejecuciones de build/tests de una misma app se serializan para evitar pisar la caché.

## Registro pedagógico y pendientes

`CAMBIOS.md` y los anexos `cambios-front-funcional.md`, `cambios-auth-perfil.md`, `cambios-back-chat.md` relacionan cada archivo, problema y principio. Las recomendaciones estructurales permanecen documentadas sin aplicarse. Pendientes de diseño de backend (idempotencia, topología del proxy, baseline de migraciones) no se confunden con verificaciones aprobadas; se retoman en la revisión final.

La fase 4 verifica comportamiento real en Chromium con una API aislada (`front/scripts/qa-api.mjs`). Estas pruebas no certifican proveedor de IA, correo, push ni una base de producción.
