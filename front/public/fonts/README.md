# Tipografías locales

Se conservan las familias del diseño original. Los archivos WOFF2 se obtuvieron de los paquetes `@fontsource-variable/fraunces`, `@fontsource-variable/sora` y `@fontsource-variable/jetbrains-mono` en octubre de 2026. Se incluye el subconjunto latino, que contiene los caracteres españoles y puntuación habitual; el sistema utiliza fallback para otros alfabetos.

Cada familia mantiene su licencia OFL 1.1 en el archivo `*-LICENSE.txt` correspondiente. No se modificó el binario de las fuentes. `styles.css` declara `font-display: swap`; Sora se precarga por ser la fuente de lectura. El build no descarga Google Fonts y el navegador no necesita conexiones externas para estas tipografías.

Las herramientas de descarga no se agregan a las dependencias del producto: sólo se distribuyen los tres assets necesarios y sus licencias.
