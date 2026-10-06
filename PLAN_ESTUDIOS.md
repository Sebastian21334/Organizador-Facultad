# Importación del plan de estudios

En **Materias → Cargá tu plan de estudios**, el usuario puede elegir un PDF con texto seleccionable o pegar el texto del plan. La IA integrada identifica nombre, año de cursado y primer/segundo cuatrimestre o anual. Los campos que no aparecen claramente quedan sin definir; se muestran advertencias para revisión.

Antes de guardar, el usuario puede editar datos y desmarcar materias. Solo al confirmar se crean las seleccionadas, con estado Regular. Las materias existentes conservan todos sus datos y su estado.

## Formatos y límites

- PDF de hasta 10 MB y 50 páginas; hasta 60000 caracteres de texto y 200 materias por análisis.
- No incluye OCR: fotos y páginas escaneadas no se analizan. Un PDF con páginas sin texto se rechaza para evitar importar un plan parcial.
- El PDF se lee en el navegador con PDF.js y recursos locales; se envía únicamente su texto al servidor y a la IA.
- Coincidencias por nombre, ignorando tildes, mayúsculas y espacios repetidos. Se conservan los niveles I/II; no se intentan equivalencias entre nombres diferentes.

## Servidor

`POST /materias/plan/analizar` recibe `{ "texto": "…" }` y devuelve materias con `existe` y advertencias. Reutiliza `IaService` y las variables existentes `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT` y `AZURE_OPENAI_DEPLOYMENT`; el deployment debe admitir Responses con Structured Outputs. No guarda materias en esta etapa.

`POST /materias/plan/importar` recibe `{ "materias": [{ "nombre": "…", "anioCursado": 1, "cuatrimestre": "1" }] }`. Año y período admiten `null`. Devuelve `creadas` y `omitidas`. Ambos endpoints requieren sesión; la importación usa la protección CSRF existente. El usuario siempre se toma de la sesión, nunca del documento.

Se validan tanto la respuesta de IA como los datos confirmados. El análisis comparte los límites de IA del chat y agrega un máximo de 5 análisis diarios por cuenta. El tiempo máximo de espera al proveedor es de 60 segundos. Las respuestas incompletas o inválidas no se guardan.

El guardado comprueba todas las materias de la cuenta dentro de una transacción. Un bloqueo por usuario serializa importaciones concurrentes; reimportar el mismo plan omite coincidencias. Si falla el guardado, se revierte el lote completo. No requiere cambios en el esquema de base de datos.

## Verificación y publicación

Las pruebas automatizadas cubren validación, autorización, CSRF, límites, extracción de texto, edición, duplicados, separación entre cuentas y rollback usando PostgreSQL en memoria. La prueba de navegador usa un PDF real y respuestas simuladas de IA; no llama al proveedor ni modifica la base publicada.

Para habilitarlo en la página publicada deben desplegarse **front y back**. La integración con el deployment real de IA queda pendiente de una prueba tras desplegar; no requiere nuevas credenciales.
