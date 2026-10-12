# Fase 5 — Pruebas y regresiones

## Estrategia

Se agregaron casos para los errores de la auditoría, junto a los módulos existentes. Una prueba útil expresa una regla observable: editar un título conserva la hora; borrar un campo persiste; una respuesta vieja no pisa la nueva; fallar un envío conserva el borrador. No se añadieron snapshots masivos para fijar colores o detalles internos.

La implementación incluye pruebas desde la fase 3 para poder corregir con seguridad. Esta fase consolida la suite completa después de la revisión visual. Las ejecuciones de una misma aplicación se serializan para evitar conflictos de caché o artefactos. En este equipo también conviene ejecutar las aplicaciones una por vez: el cierre de fase 6 detectó falta de memoria al combinar suites completas de aplicaciones distintas.

## Cobertura funcional agregada en Angular

- Fechas: conversión local/ISO, día local, valores imposibles y preservación de precisión al editar.
- Tareas: `null` frente a omisión, alta bloqueada mientras carga/guarda, fallo y reintento sin perder entradas, actualización de listas y edición pendiente.
- Calendario e Inicio: respuestas fuera de orden, reloj al cambiar día, diálogo reutilizado, selección/agrupación y resumen coherente durante carga/error.
- Materias: límites de nombre/año, enteros, orden, altas/ediciones y conservación de datos ante error.
- Mensajes: límite de texto, exclusión de envíos y protección frente a historial tardío.
- Registro/recuperación/perfil: requerido, relación de errores con campos, foco, mínimo Unicode, máximo en bytes, confirmación, tokens inválidos y guardados independientes.
- Tema/almacenamiento: una preferencia bloqueada no rompe la aplicación.
- Instalación: primera visita Android/iPhone sin modal automático; apertura manual, evento consumible y estado instalado. La caché de recursos se comprueba además con un service worker real.
- Paginación: páginas completas/vacías, fallo de una página y acumulador independiente por suscripción.

Las pruebas DOM se complementan con 20 grupos de flujos de navegador (cuatro de primera visita móvil suman 40 aserciones) y 7 flujos de autenticación/perfil/contacto (65 aserciones). Se conservan en [flujos.json](evidencia-flujos/flujos.json), [primera visita móvil](evidencia-flujos/pwa-primeras-visitas.json) y [auth/perfil/contacto](evidencia-flujos/auth-perfil-contacto.json). Hay además seis comprobaciones de entrega de recursos en [preview.json](evidencia-flujos/preview.json) y la prueba de [caché estática PWA](evidencia-flujos/pwa.json). Los 84 escenarios visuales y sus límites pertenecen a [fase 4](fase-4-revision-visual.md).

## Backend y Next

El detalle está en [fase-5-back-chat.md](fase-5-back-chat.md): fechas ISO estrictas en HTTP, controles de autorización, SQL con PostgreSQL efímero mediante PGlite, filtro de avisos antes del límite, invalidación/reclamación de reservas y resolución conservadora de materias. Next incorpora una suite Node para sus contratos, errores, paginación y orden, complementada por sus recorridos reales de navegador.

## Comandos reproducibles

Desde `front`:

```powershell
npm run build
npm test -- --watch=false
```

Desde `back`:

```powershell
npm run build
npm test -- --runInBand
npm run test:e2e
```

Desde `Modulo chat`:

```powershell
npm run build
npm test
```

`test:e2e` es un subconjunto HTTP de la suite Nest; no se suma otra vez al total. En Windows se usó una carpeta temporal local para Vitest y ejecución local ampliada cuando el sandbox impedía resolver/renombrar archivos. No se cambió la seguridad del producto para que pasaran pruebas.

No se publica un porcentaje de cobertura no medido. Quedan fuera correo/push/IA reales, migración de una base productiva, navegadores adicionales y lectores de pantalla: se detallan en la revisión final.

## Resultado al cerrar la fase

| Aplicación | Build | Suite completa | Evidencia |
| --- | --- | --- | --- |
| Angular | PASS, con cinco advertencias preventivas de CSS | **17 suites / 136 pruebas PASS** | [Build](evidencia-flujos/fase5-front-build.txt), [tests](evidencia-flujos/fase5-front-tests.txt) |
| NestJS | PASS | **20 suites / 143 pruebas PASS** | [Build](evidencia-chat/fase5-back-build.txt), [tests](evidencia-chat/fase5-back-tests.txt) |
| Next.js | PASS | **8 pruebas PASS** | [Build](evidencia-chat/fase5-chat-build.txt), [tests](evidencia-chat/fase5-chat-tests.txt) |

Total: **287 pruebas aprobadas**. Los recorridos de navegador, axe, comprobaciones de servidor y PWA son controles adicionales y no se suman como si fueran casos de estas suites. No quedaron pruebas fallando ni se retiraron aserciones para aprobar.

Las tres regresiones finales de Tareas verifican que el aviso y los filtros esperan la preferencia inicial y se liberan correctamente tanto con recordatorios activos/inactivos como con error. Las dos de primera visita PWA verifican Android/iOS sin almacenamiento preparado artificialmente.
