# Tipografías locales

Se conservan las familias del diseño original. Los archivos WOFF2 se obtuvieron de los paquetes `@fontsource-variable/fraunces`, `@fontsource-variable/sora` y `@fontsource-variable/jetbrains-mono` en octubre de 2026. Se incluye el subconjunto latino, que contiene los caracteres españoles y puntuación habitual; el sistema utiliza fallback para otros alfabetos.

Cada familia mantiene su licencia OFL 1.1 en el archivo `*-LICENSE.txt` correspondiente. No se modificó el binario de las fuentes. `app/globals.css` declara `font-display: optional`; Sora y Fraunces se precargan por ser las fuentes de lectura y título. El build no descarga Google Fonts y el navegador no necesita conexiones externas para estas tipografías.

Las herramientas de descarga no se agregan a las dependencias del producto: sólo se distribuyen los tres assets necesarios y sus licencias.


En una primera visita lenta se conserva la tipografía de respaldo si la fuente todavía no está lista, para evitar cambios tardíos de tamaño y posición. La fuente local queda disponible para visitas posteriores. Esta decisión se tomó tras observar variaciones de CLS en Lighthouse móvil.

