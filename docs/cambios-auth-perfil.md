# Cambios de autenticación y perfil — fases 3 y 5

Fecha: 9 de octubre de 2026 (Argentina).

Alcance implementado: cinco pantallas de autenticación, perfil y pruebas próximas a esos componentes. Se conservan rutas, arquitectura, HTML/CSS inline y contratos de `AuthService`. No se realizaron commits.

## Cambios y motivos

| Archivos | Qué cambió | Por qué | Principio aplicado |
|---|---|---|---|
| `front/src/app/features/auth/login.component.ts` | Requeridos visibles; errores asociados por `aria-invalid`/`aria-describedby`; foco en primer inválido. Login y reenvío impiden solicitudes simultáneas. | Un error debe poder encontrarse con teclado y comprenderse con tecnología de asistencia. Deshabilitar un botón por sí solo no protege el método de envíos repetidos. | WCAG: identificación de errores, etiquetas y foco; defensa en la lógica además de presentación. |
| `front/src/app/features/auth/register.component.ts` | Mensajes distintos para contraseña requerida, mínima y mayor de 72 bytes; confirmación requerida/diferente; ayuda junto al campo; nombre hasta 80 caracteres sin sólo espacios; correo hasta 254; foco y bloqueo de envíos duplicados. Se recortan espacios exteriores del nombre al enviarlo. | Antes podían existir formularios inválidos sin explicación visible; límites alineados con DTO actuales y feedback contextual permiten corregirlos. | Validación consistente con el servidor, prevención de errores y reducción de carga de memoria. |
| `front/src/app/features/auth/forgot-password.component.ts` | Requerido identificado, error asociado, foco y exclusión de solicitudes concurrentes o posteriores al éxito. | Evita varios correos por una misma acción y permite corregir el correo sin buscar el problema. | Idempotencia de la interacción y recuperación de errores. |
| `front/src/app/features/auth/reset-password.component.ts` | Validación accesible y diferenciada; enlaces malformados bloqueados; enlace explícito para solicitar uno nuevo; eliminación del temporizador de redirección; éxito persistente con botón para ingresar; borrado del token en memoria y del formulario tras éxito. | El usuario controla cuándo salir del resultado y dispone de tiempo para leerlo. No se envían solicitudes con un token estructuralmente inválido. | Control del usuario, feedback persistente y minimización de datos sensibles retenidos. |
| `front/src/app/features/auth/verify-email.component.ts` | Contraseña requerida con mensaje asociado y foco; guard separado para inválidos; preservación del bloqueo de envíos, validación del enlace y borrado de contraseña/token al confirmar. | El botón ya se protegía mientras esperaba, pero una contraseña vacía no explicaba el error. | Accesibilidad funcional y claridad de recuperación. |
| `front/src/app/features/perfil/perfil.component.ts` | Lectura/escritura del aviso en almacenamiento protegida; estado de carga y reintento; bloqueo de escrituras hasta tener perfil; nombre validado; errores por campo y foco dentro del formulario enviado. Reemplazo de `main` anidado por `div`. | Una preferencia opcional no puede impedir cargar la pantalla. La página conserva un único landmark principal en el shell. | Degradación gradual, estados explícitos y semántica consistente. |
| `front/src/app/features/perfil/perfil.component.ts` | Recordatorios usan el nombre ya confirmado, no el borrador; nombre y recordatorio se guardan de a uno. Cantidad requiere entero 1–30 sólo al activar avisos; desactivar funciona aunque el campo oculto sea inválido. | El botón de recordatorios no debe modificar un nombre que el usuario todavía no guardó. No deben bloquearse desactivaciones por datos irrelevantes. | Separación de intención de acciones, prevención de sobrescrituras y validación condicional. |
| `front/src/app/features/auth/auth-forms.spec.ts` | Nuevas pruebas de requerido/foco/relación de mensajes en las cinco pantallas, máximo en bytes, longitud mínima, confirmación distinta, envíos duplicados, token inválido, éxito persistente y retención ante fallo. | Protegen comportamientos del usuario, no detalles cosméticos. | Regresiones dirigidas a riesgos observados. |
| `front/src/app/features/perfil/perfil.component.spec.ts` | Nuevas pruebas de almacenamiento bloqueado, nombre vacío, guardado de recordatorios sin nombre borrador, exclusión de escrituras, cantidad fraccionaria/desactivación, reintento y errores de contraseña. | Cubre casos de navegador y red que antes podían interrumpir o alterar la intención del usuario. | Diseño para fallos y protección de integridad. |
| `front/src/app/core/services/password-policy.ts` y `.spec.ts`; registro, reset y perfil | Validador compartido de mínimo de contraseña con conteo Unicode compatible con `Length` de validator.js en la API: pares sustitutos y selectores de presentación. | Ocho emojis ocupan 16 unidades UTF-16; `Validators.minLength(15)` los aceptaba aunque el backend veía ocho caracteres. Se conserva el máximo en bytes como comprobación independiente. | Contrato consistente, reutilización de lógica y prueba de límites multibyte. |

## Comprobación realizada

Comando ejecutado desde `front`:

```text
npx ng test --watch=false --include='src/app/features/auth/**/*.spec.ts' --include='src/app/features/perfil/**/*.spec.ts' --include='src/app/core/services/password-policy.spec.ts'
```

Resultado final: **3 suites, 25 tests aprobados**, incluida compilación Angular de los componentes. Registro: `docs/fase-3-auth-perfil-tests.log`.

Comprobación adicional: `npx tsc -p tsconfig.spec.json --noEmit` sin errores para verificar también tipos de los archivos de pruebas.

El primer intento dentro del sandbox no ejecutó tests por un `EPERM` al renombrar temporales de Vitest. Se repitió con la ejecución local ampliada autorizada por la herramienta. Se detectó y corrigió durante la implementación el acceso con `ñ` en expresiones de template Angular, usando `controls['contraseñaActual']`; también se unificó el mensaje de enlace inválido entre carga y envío. La ejecución final anterior es válida.

Estas pruebas usan DOM simulado: verifican atributos, foco programático, llamadas y estados. No sustituyen contraste calculado, teclado de navegador real, lector de pantalla ni revisión en tres tamaños. Build completo y suite global se registran en el cierre de cada fase a cargo de la integración.

## Decisiones y límites

- El requisito mínimo de 15 caracteres se aplica a contraseñas nuevas. No se restringen contraseñas actuales con una regla nueva que pudiera impedir ingresar a usuarios existentes.
- No se cambia el contrato de backend ni `AuthService`. Como la API de preferencias exige nombre, si una cuenta carece de nombre confirmado se pide guardarlo primero con un mensaje explícito.
- Los mensajes de servidor conservan su comportamiento actual. Una revisión más amplia de normalización de errores compartidos queda fuera de estos componentes.
- Se conserva el idioma español y los estilos actuales; los ajustes de contraste/foco globales se integran por separado.
