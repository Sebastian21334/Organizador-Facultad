# Fase 5 — Pruebas de backend y módulo chat

Fecha: 9 de octubre de 2026, Argentina. Sin commits. Se conservaron módulos y carpetas existentes.

## Resultado

| Aplicación | Verificación | Resultado | Evidencia |
| --- | --- | --- | --- |
| Backend Nest | Build TypeScript | PASS | [Log](evidencia-chat/fase5-back-build.txt) |
| Backend Nest | Suite completa Jest, en serie | **20 suites, 143 pruebas PASS** | [Log](evidencia-chat/fase5-back-tests.txt) |
| Chat Next | Build de producción y validación TypeScript | PASS | [Log](evidencia-chat/fase5-chat-build.txt) |
| Chat Next | Suite nativa de Node | **8 pruebas PASS** | [Log](evidencia-chat/fase5-chat-tests.txt) |

El backend partía de 17 suites y 121 pruebas. Se agregaron 22 regresiones sobre reglas concretas; no se midió cobertura porcentual ni se presenta el número de casos como garantía de ausencia de defectos. El módulo chat no tenía comando de pruebas y ahora incluye una suite sin agregar un framework.

## Qué protege cada grupo

- **Fechas y formularios:** POST/PATCH rechazan días imposibles, fechas sin hora e instantes sin zona; aceptan Z y offsets equivalentes. PATCH distingue dato omitido de null para quitar fecha/materia. La fecha civil que extrae IA vence al finalizar ese día en Argentina; el cálculo de “hoy” contempla el cambio de día UTC.
- **Materias:** la resolución utiliza todo el catálogo aunque supere 100 entradas; prioriza igualdad normalizada, distingue niveles I/II y 1/2 y solicita aclaración ante empates. Se mantienen controles de confianza y cuota. El contexto enviado al modelo sigue limitado a 100 nombres, lo que es distinto de la resolución posterior.
- **Recordatorios:** SQL real con PostgreSQL efímero comprueba que 100 avisos futuros no ocultan uno debido; cambiar la fecha o anticipación invalida su intento viejo; las preferencias actuales de usuario se verifican al reclamar. Un cambio a una anticipación que aún no corresponde o la desactivación de avisos impide reservar el envío antiguo. Editar sólo el título conserva la reserva.
- **Chat:** cronología sin mutar datos, páginas superpuestas sin duplicar, respuestas malformadas recuperables, mensajes pendientes explicados, cierre de sesión confirmado por el servidor y errores HTTP con estado conservado.

Las pruebas HTTP atraviesan validación y autorización. Las de repositorios ejecutan SQL con PGlite; las llamadas a correo e IA se sustituyen por dobles y no consumen proveedores reales. Los escenarios de navegador complementarios —paginación completa, borrador conservado, respuestas tardías, error/401, reintento, teclado y tamaños— están documentados en [fase 4](fase-4-chat.md).

## Límites y próximos casos útiles

No se obtuvo una base productiva ni credenciales; faltan una prueba de despliegue con el esquema real y mediciones con volumen representativo. La creación final de tarea/mensaje todavía requiere diseñar transacción e idempotencia antes de introducir reintentos automáticos. El origen confiable para cuotas detrás de proxy también depende del despliegue. Estos puntos están en la auditoría y no se ocultaron mediante mocks.

Jest y el build de Next se ejecutaron con permiso de proceso local ampliado después de fallos de canonicalización/realpath del sandbox de Windows. No se relajó configuración del producto ni se usaron datos reales.
