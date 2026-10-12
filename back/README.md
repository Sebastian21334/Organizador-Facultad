# API de Tempo

Backend NestJS, TypeORM y PostgreSQL del organizador universitario. Conserva módulos de autenticación, usuarios, materias, tareas, mensajes, IA, correo, contacto y push. Cada módulo separa controllers HTTP, servicios de aplicación y repositorios.

## Compilar

```sh
npm ci
npm run build
```

Los archivos de pruebas y la configuración de Jest se eliminaron por pedido del usuario el 10 de octubre de 2026. Ya no hay comandos de tests configurados. Los informes de `../docs` conservan los resultados históricos anteriores a esa eliminación.

## Ejecutar la API

```sh
npm run start:dev
# Después de compilar:
npm run start:prod
```

Puerto predeterminado: 3000. La configuración se valida al iniciar. Son obligatorias las variables `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `ACS_CONNECTION_STRING` y `ACS_SENDER_ADDRESS`. También se admite `DB_PORT`. El secreto JWT requiere al menos 32 bytes aleatorios. No guardar secretos reales en Git ni copiarlos a reportes.

Producción requiere HTTPS en los orígenes públicos y TLS verificado en PostgreSQL. `FRONTEND_URLS` agrega orígenes permitidos; `COOKIE_SAME_SITE=none` sólo se admite en producción con cookies seguras. Configurar `TRUST_PROXY` únicamente con rangos/IPs de proxies conocidos. Push es opcional: consultar [PUSH.md](PUSH.md).

**Antes de usar una base nueva:** las migraciones presentes amplían tablas que ya existían; no incluyen la creación inicial completa del esquema. Obtener/documentar ese baseline antes de ejecutar `npm run migration:run`. No activar `synchronize` en una base con datos para compensar esta ausencia.

Al iniciar la aplicación se activa el procesamiento periódico de recordatorios. Para revisiones visuales usar una API de pruebas aislada, sin credenciales o datos de producción.

## Contratos relevantes

- Las consultas/escrituras privadas usan el usuario de la sesión. El navegador usa cookies HttpOnly y CSRF; los clientes servidor a servidor admiten Bearer.
- PATCH distingue omisión (`undefined`: conservar) y `null` (quitar) para `fechaLimite`, `materiaId` y anticipación opcional del recordatorio. Título y estado no admiten null.
- Las fechas API son instantes ISO. La interfaz presenta la hora local. Una fecha extraída por IA sin horario vence a las 23:59:59.999 del día indicado en Argentina; no se reinterpretan históricos automáticamente.
- Los listados aceptan `limit` de 1 a 100 y `offset` de 0 a 10000. Mensajes llegan del más reciente al más antiguo; el cliente invierte cada página para mostrarlos como conversación.
- La resolución IA utiliza materias existentes del propietario y pide aclaración si los niveles o candidatos son ambiguos. La respuesta del modelo se valida antes de crear datos.

La investigación y el detalle de cambios están en `../docs/ui-ux-guidelines.md`, `../docs/auditoria-back-chat.md` y `../docs/CAMBIOS.md`.
