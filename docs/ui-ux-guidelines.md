# Fase 1 — Guía de UI/UX para Tempo

Fecha de investigación: 9 de octubre de 2026, zona America/Buenos_Aires.

Estado: investigación completada. Esta guía define criterios para auditar, implementar y verificar; no certifica que la aplicación ya los cumpla. Se consultaron fuentes primarias en línea. Las referencias de Carbon v10 se identifican como documentación histórica de un sistema de diseño, útil para principios, no como recomendación de instalar esa versión.

## 1. Objetivo y decisiones de aplicación

Tempo organiza materias, tareas, calendario, mensajes y perfil de estudiantes. La interfaz debe permitir responder rápidamente: **qué tengo que hacer, cuándo vence y cómo lo actualizo**. Una pantalla visualmente atractiva es insuficiente si oculta tareas, pierde cambios o resulta inaccesible con teclado.

Se conserva la arquitectura existente (`front/src/app/core`, `shared`, `features`), las rutas y el lenguaje visual de Tempo. Se priorizan correcciones verificables por encima de una renovación estética. No hace falta adoptar un framework de componentes adicional ni reorganizar carpetas para aplicar esta guía.

Convenciones de lectura:

- **Criterio WCAG:** requisito del nivel indicado, con sus excepciones y alcance. La referencia normativa es [WCAG 2.2](https://www.w3.org/TR/WCAG22/); sus documentos Understanding explican cómo interpretarlo.
- **Recomendación:** práctica útil de diseño, no un requisito universal.
- **Decisión para Tempo:** valor inicial o patrón elegido para este producto; se valida en pantalla y se modifica si hay evidencia de problemas.

## 2. Jerarquía visual y arquitectura de la información

Los títulos y etiquetas deben explicar el contenido o propósito. Un encabezado como “Próximas entregas” orienta mejor que uno genérico como “Información”. La jerarquía semántica debe coincidir con la visual; no se elige `h3` simplemente porque su tamaño es cómodo. [W3C: headings and labels](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html).

Decisiones para Tempo:

1. Cada vista tiene un título principal reconocible; debajo aparecen contexto breve, acción principal y contenido. La cabecera global no compite visualmente con el título de la página.
2. Hay una acción primaria por región funcional: “Nueva tarea”, “Agregar materia” o “Guardar cambios”. “Cancelar”, filtros y navegación reciben menor énfasis; las acciones destructivas se distinguen claramente.
3. Se destacan primero vencimientos y datos que requieren actuar. Los indicadores generales acompañan, sin desplazar toda la lista útil debajo del primer pantallazo.
4. Se mantiene el mismo orden de información en cada tarjeta de tarea: título, materia, fecha, estado y acciones. Las fechas de vencimiento no desaparecen al estrechar la pantalla.
5. La selección actual es persistente y explícita: página activa en navegación, filtro elegido, fecha seleccionada y estado de una tarea. Hover comunica disponibilidad momentánea; no sustituye selección.
6. El contenido secundario puede desplegarse progresivamente, pero debe seguir siendo descubrible. Por ejemplo, detalles extensos de una tarea pueden abrirse en un panel; su título, fecha y estado permanecen visibles.

Un conjunto pequeño de tokens —variables con nombres para color, tipografía, espaciado— reduce decisiones aisladas y hace que una corrección común se propague de manera coherente. Reutilizar las variables CSS existentes antes de sumar valores sueltos. [USWDS: design tokens](https://designsystem.digital.gov/design-tokens/).

## 3. Espaciado, alineación y densidad

Usar menos separación dentro de un grupo y más entre grupos aclara relaciones sin añadir bordes a todo. El título de una sección debe quedar más cerca del contenido que presenta que de la sección anterior. [USWDS: typography](https://designsystem.digital.gov/components/typography/).

Una escala de espacios ayuda a mantener ritmo; no obliga a que cada medida sea idéntica. USWDS ofrece una escala discreta de unidades como base consistente. [USWDS: spacing units](https://designsystem.digital.gov/design-tokens/spacing-units/).

Decisión local inicial, compatible con las utilidades existentes:

| Relación | Rango orientativo | Ejemplo |
|---|---:|---|
| Icono y texto, etiqueta y ayuda | 4–8 px | Icono de fecha junto al vencimiento |
| Elementos del mismo grupo | 8–12 px | Botones de filtro relacionados |
| Relleno de campo o tarjeta compacta | 12–16 px | Fila de tarea |
| Bloques de una sección | 16–24 px | Resumen y listado |
| Secciones diferentes | 24–40 px | Agenda y progreso académico |

Los rangos son decisiones de diseño para Tempo, no umbrales de WCAG. Elegir un valor de la escala ya usada y repetirlo según responsabilidad visual. En móvil se reduce el espacio exterior antes de reducir texto o blancos táctiles. No fijar alturas de tarjetas que recorten títulos largos.

Preferir alineación compartida entre título, filtros y contenido. En formularios una columna reduce ambigüedad; dos columnas se reservan para campos breves estrechamente relacionados y vuelven a una en anchos reducidos. Los sistemas de layout oficiales favorecen contenedores y columnas que se adaptan al contenido. [GOV.UK: layout](https://design-system.service.gov.uk/styles/layout/).

## 4. Tipografía y contenido legible

Como punto de partida, USWDS recomienda texto de lectura de tamaño efectivo cercano a 16 px, líneas controladas y una altura de línea de al menos 1,5 para párrafos extensos. Reservar tamaños pequeños para información breve y auxiliar. Evitar párrafos centrados, mayúsculas extensas y grandes bloques en negrita. [USWDS: typography](https://designsystem.digital.gov/components/typography/).

Decisiones para Tempo:

- Conservar las familias existentes mientras resulten legibles. Usar la fuente de display en títulos y la de cuerpo para acciones, formularios y listas; los números monoespaciados sólo donde mejoren comparación.
- Partir de `1rem` en lectura/campos; `0.875rem` puede servir en metadatos breves con suficiente contraste. No usar texto diminuto para “hacer entrar” una pantalla.
- Limitar los textos explicativos largos aproximadamente a 60–75 caracteres por línea; no imponer ese límite a una grilla o tabla de datos.
- Usar `rem`, alturas de línea sin unidad y contenedores flexibles. Permitir títulos largos y palabras extensas sin provocar desbordamiento.
- Mostrar fechas sin ambigüedad. “12 oct, 14:30” se entiende mejor en contexto que una cadena técnica. En mensajes relativos (“mañana”), conservar una forma de conocer la fecha exacta.
- Escribir acciones con verbo y objeto: “Eliminar tarea”, “Guardar materia”, “Reintentar carga”. Un icono de papelera debe tener nombre accesible; no depender de que se conozca el dibujo.

WCAG 1.4.12 AA exige que el contenido siga funcionando cuando el usuario ajusta interlineado a 1,5 veces, espacio entre párrafos a 2 veces, entre letras a 0,12 veces y entre palabras a 0,16 veces el tamaño de fuente. No exige que esos sean los valores predeterminados. Probar las cuatro modificaciones a la vez y comprobar que no haya texto recortado ni acciones ocultas. [W3C: text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).

## 5. Color, contraste y temas

WCAG 1.4.3 AA requiere contraste mínimo **4,5:1** para texto común y **3:1** para texto grande: al menos 24 px normal o aproximadamente 18,67 px en negrita. Los umbrales no se redondean para convertir un fallo en aprobado. Placeholders y texto que aparece al enfocar también se evalúan. Los controles inactivos tienen excepciones normativas, aunque conviene mantenerlos comprensibles. [W3C: contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

WCAG 1.4.11 AA pide **3:1** en la información visual necesaria para identificar controles y sus estados, y en gráficos necesarios para comprender el contenido. No significa que cada borde decorativo deba alcanzar ese contraste; sí hay que identificar el campo o estado si ese borde es su única señal. [W3C: non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

El color no puede ser la única forma de comunicar información. Una tarea vencida necesita texto o un símbolo comprensible además del rojo; un filtro elegido necesita una señal persistente. Enlaces dentro de párrafos deben distinguirse sin depender exclusivamente de su matiz. [W3C: use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

Decisiones para Tempo:

- Medir cada pareja real de texto/fondo en claro y oscuro. Una variable llamada `muted` no justifica ilegibilidad.
- Dar roles semánticos a la paleta: texto principal, secundario, borde de control, acción, error, advertencia y éxito. Evitar usar el color de una materia como texto sin comprobar el fondo.
- En fondos translúcidos, degradados y mezclas, calcular el color compuesto sobre el fondo efectivo. Un `outline` con opacidad baja puede ser casi invisible aunque el acento sólido tenga buen contraste.
- El anillo de foco debe distinguirse sobre tarjeta, fondo general y botón lleno. Como objetivo práctico usar un contorno sólido de 2–3 px, separación exterior y contraste verificado. El espesor elegido es una decisión local; no confundirlo con una declaración de conformidad AAA.
- No elegir texto de botones mediante una única regla “siempre blanco”: el acento oscuro del tema claro y el acento luminoso del oscuro pueden necesitar textos distintos.

## 6. Semántica, teclado y foco

Usar HTML nativo siempre que resuelva el comportamiento: botones para acciones, enlaces para navegación, `label` para controles y encabezados para estructura. Añadir ARIA no implementa automáticamente teclado ni interacción. Un componente con roles incorrectos puede empeorar la experiencia. [W3C APG: read me first](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/).

Toda funcionalidad debe poder operarse por teclado salvo excepciones que dependan intrínsecamente del recorrido de un puntero. Revisar Tab, Shift+Tab, Enter, Espacio y las teclas esperadas por cada patrón; evitar `tabindex` positivo que altere artificialmente el orden. Si se permite arrastrar un elemento, ofrecer una alternativa operable mediante controles. [W3C: keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html).

El foco del teclado debe resultar visible. No eliminar `outline` sin reemplazo, ni mostrar foco sólo por hover. [W3C: focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html). Además, WCAG 2.4.11 AA exige que el elemento enfocado no quede totalmente tapado por contenido creado por el autor. Probar cabeceras fijas, barras inferiores y toasts que puedan cubrir controles. [W3C: focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).

Para Tempo se recomienda un enlace “Saltar al contenido” y una región `main` estable. Tras navegar entre vistas, actualizar título de documento y ofrecer una posición de foco predecible sin robarlo durante actualizaciones menores. Un cambio de filtro no debería expulsar al usuario del control que estaba usando.

### Diálogos y paneles

Un modal debe llevar nombre accesible, colocar foco dentro al abrir, mantener la secuencia Tab en su interior, permitir cerrar con Escape y devolver el foco al disparador o a un destino lógico. El fondo debe quedar inerte para teclado y puntero. Un `aria-modal="true"` sin ese comportamiento no basta. En confirmaciones irreversibles puede ser apropiado enfocar primero la acción menos destructiva. [W3C APG: modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

Decisión para Tempo: reutilizar un diálogo compartido o el `<dialog>` nativo ya existente antes de implementar variantes incompatibles. En móvil, su contenido debe desplazarse y conservar alcanzables título, cierre y acciones aun con el teclado virtual abierto. Un panel no modal no necesita atrapar el foco.

### Blancos táctiles

WCAG 2.5.8 AA fija 24 × 24 CSS px o suficiente separación según su regla geométrica, con excepciones específicas. No implica que todos los iconos deban dibujarse a ese tamaño: importa el área activable. Para Tempo se adopta como objetivo cómodo **44 × 44 px** en botones habituales y acciones de móvil; es una recomendación más amplia, no el mínimo AA. Separar borrar/editar/completar para reducir pulsaciones accidentales. [W3C: target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## 7. Formularios y prevención de errores

Cada campo necesita un nombre accesible estable. Preferir etiqueta visible asociada con `for`/`id`; el placeholder ejemplifica el formato pero desaparece al escribir. Ayuda y errores pueden vincularse mediante `aria-describedby`; grupos de opciones se identifican con `fieldset` y `legend` cuando corresponde. [W3C: labeling controls](https://www.w3.org/WAI/tutorials/forms/labels/).

Si se detecta un error, indicar qué campo lo tiene y describirlo en texto. No marcar todo en rojo sin explicar la corrección. [W3C: error identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html). Para envíos con varios errores, un resumen con enlaces a los campos permite encontrarlos; mantener el mismo mensaje en resumen y error local evita contradicciones. [GOV.UK: error summary](https://design-system.service.gov.uk/components/error-summary/).

Decisiones para Tempo:

1. Explicar restricciones antes del envío: formato de archivo, tamaño máximo, campos requeridos y reglas de contraseña.
2. Validar al salir de un campo o después del primer intento, evitando errores prematuros en cada tecla. Tras un fallo, revalidar de forma útil cuando el usuario corrige.
3. Conservar valores al fallar la red. Diferenciar datos inválidos de sesión vencida y servicio no disponible.
4. Durante un guardado, indicar “Guardando…” y bloquear envíos duplicados; el resto de la pantalla puede seguir operativo si no interfiere.
5. Los errores de servidor deben traducirse a mensajes accionables, sin exponer detalles internos. No afirmar “Guardado” antes de confirmar el resultado salvo que exista una estrategia optimista con reversión y feedback.
6. En importación de plan de estudios, presentar una vista previa de materias, avisar ambigüedades y permitir corregir. Un fallo de lectura de PDF no equivale a “el archivo no tiene materias”.

La autenticación accesible debe permitir ayuda de gestores de contraseñas y copiar/pegar; no introducir pruebas de memoria sin alternativas o mecanismos permitidos por WCAG 3.3.8 AA. Usar `autocomplete` apropiado en correo y contraseñas. Un control para mostrar contraseña conserva un nombre que describe su acción y estado. [W3C: accessible authentication](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html).

## 8. Responsive y contenido resistente

El layout debe adaptarse a anchos intermedios, contenido real y distintas capacidades de entrada. Usar viewport adaptable, Flexbox/Grid, imágenes contenidas y dimensiones reservadas; seleccionar breakpoints cuando el contenido lo requiere. No asumir que toda pantalla grande usa ratón o toda pequeña usa tacto. No ocultar funciones esenciales simplemente por falta de espacio. [web.dev: responsive web design basics](https://web.dev/articles/responsive-web-design-basics).

WCAG 1.4.10 AA exige reflow sin pérdida de información/función ni desplazamiento en dos direcciones para contenido vertical a 320 CSS px de ancho, con excepciones para contenidos que necesitan organización bidimensional. Una excepción para una tabla o calendario no exime al resto de la página ni a sus controles. [W3C: reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

Matriz mínima elegida para revisión visual de Tempo:

| Contexto | Viewport sugerido | Revisar especialmente |
|---|---:|---|
| Móvil | 390 × 844 | Navegación, filtros apilados, botones táctiles, modales y títulos largos |
| Tablet | 768 × 1024 | Transición de columnas, barras de acciones y espacio útil |
| Escritorio | 1440 × 900 | Densidad, ancho de lectura y jerarquía del dashboard |
| Límite adicional de accesibilidad | 320 CSS px y zoom | Reflow, texto ampliado, controles que no se pierdan |

Los tres primeros son tamaños de prueba, no especificaciones de modelos físicos. Complementar con anchuras cercanas a los breakpoints y orientación horizontal. En un calendario mensual, mantener fechas comprensibles y una lista/agenda equivalente cuando la grilla no permite leer eventos. En tarjetas y filas usar `min-width: 0`, wrapping y crecimiento vertical donde corresponda; no aplicar `overflow: hidden` global para esconder el síntoma de un desbordamiento.

## 9. Animaciones y microinteracciones

La animación debe explicar un cambio, señalar respuesta a una acción o ayudar a mantener continuidad. En un organizador que se usa repetidamente, predomina movimiento breve y discreto. Carbon distingue movimiento productivo de expresivo y recomienda ajustar duración a la distancia/tamaño del cambio; su escala histórica incluye 70, 110, 150, 240, 400 y 700 ms. No es una obligación de usar todos esos valores. [Carbon v10: motion](https://v10.carbondesignsystem.com/guidelines/motion/overview/).

Decisiones propuestas para Tempo, que se verifican con interacción real:

| Interacción | Duración inicial | Comportamiento |
|---|---:|---|
| Hover, color y pulsación de botón | 100–160 ms | Cambio pequeño; feedback inmediato |
| Expandir contenido corto o mostrar feedback | 150–220 ms | Transición breve sin retrasar operación |
| Abrir/cerrar diálogo o panel | 180–280 ms | Entrada rápida que desacelera; salida sin espera |
| Primera aparición decorativa | 200–300 ms como máximo orientativo | Sólo si aclara jerarquía y sin ocultar contenido necesario |
| Carga repetida y actualización de listas | Sin entrada ornamental | Priorizar estabilidad y lectura |

Estos rangos son una adaptación local, no evidencia de que una duración exacta sea siempre mejor. Probar antes de generalizar. Evitar cascadas largas en listas, rebotes en tareas recurrentes, zooms de gran amplitud y animar una página completa cada vez que se cambia un filtro.

El easing controla cómo varía la velocidad. Una curva de salida suave sirve para la respuesta a una acción; una curva equilibrada para cambios entre estados presentes. Como referencia, Carbon ofrece `cubic-bezier(0.2, 0, 0.38, 0.9)` para movimiento estándar productivo. Tempo puede conservar su curva existente si el resultado es breve y predecible. [Carbon v10: motion](https://v10.carbondesignsystem.com/guidelines/motion/overview/).

### Reduced motion y movimiento persistente

Respetar `prefers-reduced-motion: reduce` tanto en CSS como en animaciones iniciadas por JavaScript. Quitar desplazamientos, escalas, parallax y scroll suave no esenciales; mantener el estado final visible y el feedback textual. Conviene habilitar efectos opcionales bajo `no-preference`, de modo que la experiencia base ya funcione sin animación. Probar cambios de preferencia con la aplicación abierta. [web.dev: prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion), [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion).

WCAG 2.3.3, nivel AAA, trata la posibilidad de desactivar movimiento provocado por interacciones cuando no es esencial; adoptar esa práctica no permite afirmar conformidad AAA global. [W3C: animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html). WCAG 2.2.2 A requiere controles para ciertas animaciones automáticas de más de cinco segundos mostradas junto a otro contenido. Por ello un adorno flotante infinito merece quitarse, limitarse o poder pausarse; respetar reduced-motion por sí solo no garantiza cubrir a todos los usuarios afectados por ese criterio. [W3C: pause, stop, hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).

### Rendimiento de movimiento

Preferir `transform` y `opacity` para desplazamientos/apariciones, evitando animar medidas que fuerzan layout en cada fotograma. Aplicar `will-change` sólo tras comprobar una necesidad: crear capas indiscriminadamente consume recursos. No usar `transition: all`; nombrar propiedades y medir cuando se animen sombras o efectos costosos. [web.dev: high-performance CSS animations](https://web.dev/articles/animations-guide).

La lógica funcional no debe depender de que termine una animación decorativa. Si se desactiva el movimiento, abrir, cerrar, guardar y navegar siguen funcionando. Los elementos transparentes no deben capturar clics o foco sin una razón explícita.

## 10. Estados vacíos, carga, error y feedback

Un estado vacío útil explica por qué no hay datos y qué puede hacerse. Distinguir primera visita, filtros sin coincidencias, trabajo ya completado y fallos de acceso. Cada caso tiene una acción diferente; un único “No hay datos” oculta el contexto. [Carbon v10: empty states](https://v10.carbondesignsystem.com/patterns/empty-states-pattern/).

| Estado en Tempo | Mensaje y acción recomendados |
|---|---|
| Sin materias | “Agregá tu primera materia” + creación/importación |
| Sin tareas todavía | Explicar para qué sirve una tarea + “Nueva tarea” |
| Filtro sin resultados | Mostrar filtros activos + “Limpiar filtros” |
| Sin vencimientos próximos | Mensaje neutral; permitir consultar todas las tareas |
| Carga inicial | Indicador con nombre: “Cargando tareas…” |
| Actualización de lista | Conservar datos existentes cuando sea posible y anunciar actualización |
| Fallo de red | Explicar qué no se pudo cargar + “Reintentar”; conservar trabajo |
| Sesión vencida | Indicar necesidad de ingresar de nuevo, sin bucle de cargas |
| Importación parcial | Mostrar elementos recuperados y advertencias específicas |

Las cargas pueden representarse en la región afectada; un esqueleto sirve cuando se conoce la estructura. Un spinner sin texto no explica qué está pasando. Evitar bloquear toda la aplicación por una operación local, parpadeos de indicadores y progresos porcentuales inventados. [Carbon v10: loading](https://v10.carbondesignsystem.com/patterns/loading-pattern/).

Los mensajes de estado deben poder anunciarse sin mover el foco: `role="status"` o una región `aria-live="polite"` son apropiados para resultados habituales. Reservar alertas urgentes para información que requiere interrumpir; no anunciar enérgicamente cada tecla o cada fila que aparece. [W3C: status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

Los banners globales se reservan para información relevante a toda la página, sin repetir notificaciones rutinarias ni desplazar el contenido innecesariamente. [GOV.UK: notification banner](https://design-system.service.gov.uk/components/notification-banner/).

Decisiones locales: un éxito breve puede usar toast si el cambio queda visible en la interfaz. Un error que requiere intervención debe persistir hasta poder leerlo y resolverlo. No dejar información esencial sólo en un mensaje que desaparece. Si se incluye una acción en una notificación temporizada, debe resultar alcanzable y no desaparecer mientras se interactúa. Un guardado fallido no debe cerrar el formulario ni limpiar el texto.

## 11. Rendimiento como parte de la UX

Los Core Web Vitals actuales evalúan carga principal (LCP), respuesta a interacciones (INP) y estabilidad (CLS). Sus objetivos “buenos” son **LCP ≤ 2,5 s**, **INP ≤ 200 ms** y **CLS ≤ 0,1**, evaluados al percentil 75 de visitas reales, diferenciando móvil y escritorio. Una medición local no representa esa distribución. [web.dev: Web Vitals](https://web.dev/articles/vitals), [web.dev: fundamentos de los umbrales](https://web.dev/articles/defining-core-web-vitals-thresholds).

Prioridades aplicables a Tempo:

- Conservar carga diferida de rutas. Cargar procesamiento de PDF cuando se usa la importación, si todavía no está separado del flujo inicial.
- Reservar espacio para contenido que llega después y limitar cambios de altura inesperados; especialmente imágenes, fuentes, banners y listas.
- No ejecutar trabajo pesado ni ordenar grandes colecciones repetidamente en cada detección de cambios sin medir antes su costo.
- Mantener estables las identidades de filas para evitar recrear controles, perder foco y repetir animaciones al actualizar datos.
- Optimizar primero el problema observado en una traza o reporte. Un skeleton no reduce el trabajo real, y una animación suave no corrige un bloqueo de JavaScript.

### Cómo interpretar Lighthouse

Ejecutar Lighthouse sobre un build de producción servido localmente y guardar HTML/JSON, URL, fecha, configuración, dispositivo emulado y condiciones. Repetir las rutas representativas bajo condiciones comparables cuando la variación afecte una conclusión. El score es una síntesis con ponderaciones y puede variar según dispositivo, recursos y condiciones de ejecución. [Chrome: Lighthouse performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring).

Reportar LCP, CLS y TBT cuando estén presentes; **TBT no es INP**. Un recorrido con interacciones y mediciones en navegador complementa la carga inicial. No publicar “INP aprobado” a partir de un audit de navegación sin ese dato, ni “rendimiento real de usuarios” a partir de Lighthouse local. Si el entorno impide ejecutarlo, documentar la limitación y nunca inventar puntajes.

## 12. Errores frecuentes y cómo detectarlos

| Error frecuente | Consecuencia | Comprobación práctica |
|---|---|---|
| Jerarquía plana, todos los botones iguales | Cuesta identificar el próximo paso | Explicar la acción principal de cada vista en una frase |
| Texto tenue usado como recurso estético | Información ilegible | Medir los pares de color en ambos temas |
| `div` clickeable o icono sin nombre | Flujo inaccesible | Recorrer por teclado e inspeccionar nombres accesibles |
| Etiqueta sustituida por placeholder | Se pierde contexto al escribir | Completar todos los campos y releer el formulario |
| Modal con fondo todavía interactivo | Foco perdido, acciones accidentales | Tab/Shift+Tab/Escape y retorno al disparador |
| Ocultar overflow a nivel global | Fallos disimulados y controles cortados | Buscar el elemento causante con viewport estrecho |
| Sólo probar listas cortas y nombres ideales | Desbordamiento con datos reales | Nombres largos, varios eventos y fechas límite |
| Estado vacío ante un error de red | Se interpreta que no hay datos | Simular carga fallida y revisar mensaje/reintento |
| Toast efímero como único error | Usuario desconoce cómo recuperarse | Mantener el formulario abierto tras un fallo |
| Movimiento infinito o entrada de todas las filas | Distracción y demora percibida | Activar reduced-motion y repetir navegación |
| Score automático tratado como certificación | Problemas de uso sin detectar | Combinar herramientas, teclado y revisión humana |

Las herramientas automáticas ayudan a detectar problemas concretos, pero no determinan por sí solas la accesibilidad completa. El juicio humano y las pruebas de uso siguen siendo necesarios. [W3C: selecting evaluation tools](https://www.w3.org/WAI/test-evaluate/tools/selecting/).

## 13. Checklist operativo para las fases 2–6

### Antes de modificar

- [ ] Inventariar pantallas, estados y flujos: landing, login, registro, verificación/recuperación, inicio, tareas, calendario, materias/importación, mensajes, perfil, contacto e instalación.
- [ ] Registrar evidencia por hallazgo: archivo, comportamiento observado, usuarios afectados, impacto y esfuerzo.
- [ ] Separar problemas confirmados de hipótesis pendientes de revisión visual.
- [ ] Respetar la estructura actual; anotar propuestas de reorganización sin aplicarlas.

### Por cada corrección

- [ ] Explicar qué problema del usuario resuelve y qué principio aplica en `docs/CAMBIOS.md`.
- [ ] Reutilizar tokens/componentes actuales y preservar el contrato de datos.
- [ ] Verificar estados normal, vacío, carga, error y éxito que afecte la corrección.
- [ ] Confirmar teclado, etiqueta, foco, nombre accesible y contraste relevantes.
- [ ] Comprobar móvil, tablet, escritorio y ambos temas cuando corresponda.
- [ ] Comprobar reduced-motion si se cambian efectos.

### Revisión visual y funcional

- [ ] Navegar cada pantalla y cada flujo disponible; registrar precondiciones y límites de datos/servicios.
- [ ] Guardar capturas con ruta, tamaño y estado identificables.
- [ ] Crear/editar/completar/eliminar tarea; añadir/editar materia e importar plan; comprobar calendario y filtros.
- [ ] Probar errores de validación, fallo de carga y reintento sin perder valores.
- [ ] Recorrer menús, formularios y diálogos con Tab, Shift+Tab, Enter, Espacio y Escape.
- [ ] Verificar textos largos, zoom, reflow y que ninguna barra tape el foco.
- [ ] Medir contraste calculado y revisar hallazgos automáticos; no afirmar pruebas con lector de pantalla si no se realizaron.
- [ ] Guardar Lighthouse y aclarar laboratorio frente a datos de campo.
- [ ] Repetir la comprobación que falló después de corregirla.

### Cierre

- [ ] Build y suite completos al terminar fases 3, 5 y 6, con resultados registrados.
- [ ] Pruebas nuevas centradas en lógica crítica, contratos y flujos; evitar duplicar implementación sin cubrir riesgo.
- [ ] Revisar diff final y cambios ajenos preexistentes sin sobrescribirlos.
- [ ] Anotar lo no resuelto, causa y siguiente paso verificable.
- [ ] No realizar commits.

## 14. Orden recomendado de intervención

1. **Integridad y operación:** pérdidas de datos, fechas incorrectas, flujos que fallan, estado inconsistente, errores no recuperables.
2. **Acceso a funciones:** teclado, foco/modal, etiquetas, contraste esencial, contenido que se corta en móvil.
3. **Comprensión:** jerarquía, feedback de carga/error/éxito, estados vacíos y validación.
4. **Eficiencia:** rendimiento medido, trabajo repetido, carga inicial y estabilidad visual.
5. **Pulido:** consistencia de espacios, detalles tipográficos y movimiento con propósito.

Esta prioridad es una decisión para la auditoría de Tempo. Permite dedicar esfuerzo primero a mejoras que afectan si el estudiante puede completar su tarea, y después a refinamientos visuales. La investigación no autoriza reestructurar la arquitectura ni reemplazar el producto por otro diseño.
