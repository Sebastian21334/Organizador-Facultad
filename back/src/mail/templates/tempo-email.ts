export interface EmailTempo {
  asunto: string;
  texto: string;
  html: string;
}

interface ContenidoEmail {
  asunto: string;
  preheader: string;
  etiqueta: string;
  titulo: string;
  parrafos: string[];
  tarjeta?: { titulo: string; detalles?: [string, string][]; mensaje?: string };
  accion?: { texto: string; url: string };
  nota: string;
  pie?: string;
}

const SOPORTE = 'sebastiangonzalez100106@gmail.com';

export function escaparHtml(valor: string): string {
  return valor.replace(
    /[&<>"']/g,
    (caracter) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[caracter]!,
  );
}

function enlaceWeb(
  base: string | undefined,
  ruta: string,
  token?: string,
): string {
  if (!base)
    throw new Error(
      'Falta FRONTEND_URL para los enlaces de los correos de Tempo',
    );
  const url = new URL(base.endsWith('/') ? base : `${base}/`);
  if (!['https:', 'http:'].includes(url.protocol))
    throw new Error('FRONTEND_URL debe usar HTTP o HTTPS');
  if (url.username || url.password || url.search || url.hash)
    throw new Error(
      'FRONTEND_URL debe ser una URL base sin credenciales, parámetros ni fragmentos',
    );
  const destino = new URL(ruta, url);
  if (token !== undefined) destino.searchParams.set('token', token);
  return destino.href;
}

/** Tablas e inline styles: no depende de imágenes o fuentes externas para verse bien. */
export function crearEmailTempo(contenido: ContenidoEmail): EmailTempo {
  const e = escaparHtml;
  const multilinea = (valor: string) => e(valor).replace(/\r?\n/g, '<br>');
  const { tarjeta, accion } = contenido;
  if (accion && !/^(https?:\/\/|mailto:)/i.test(accion.url))
    throw new Error('Enlace de correo no permitido');
  const texto = [
    'Tempo · Organizá tu vida universitaria.',
    contenido.titulo,
    ...contenido.parrafos,
    tarjeta?.titulo,
    ...(tarjeta?.detalles?.map(([clave, valor]) => `${clave}: ${valor}`) ?? []),
    tarjeta?.mensaje,
    accion ? `${accion.texto}: ${accion.url}` : undefined,
    contenido.nota,
    contenido.pie,
    `Ayuda y contacto: ${SOPORTE}`,
  ]
    .filter(Boolean)
    .join('\n\n');
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${e(contenido.asunto)}</title></head>
<body style="margin:0;padding:0;background-color:#ede4d3;color:#2b231f;font-family:'Sora',Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;color:#ede4d3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${e(contenido.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ede4d3"><tr><td align="center" style="padding:32px 12px;">
    <!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
      <tr><td style="padding:0 12px 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
          <td width="44" height="44" align="center" bgcolor="#6e1f2b" style="border-radius:13px;color:#fffdf9;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:bold;">T</td>
          <td style="padding-left:12px;"><span style="font-family:'Fraunces',Georgia,'Times New Roman',serif;font-size:29px;font-weight:bold;color:#2b231f;">Tempo</span><br><span style="font-size:11px;line-height:18px;color:#5e534b;">Organizá tu vida universitaria.</span></td>
        </tr></table>
      </td></tr>
      <tr><td bgcolor="#fffdf9" style="border:1px solid #d8cbae;border-top:4px solid #6e1f2b;border-radius:18px;padding:32px 24px;">
        <p style="margin:0 0 18px;font-size:11px;line-height:18px;letter-spacing:2px;font-weight:bold;text-transform:uppercase;color:#6e1f2b;">${e(contenido.etiqueta)}</p>
        <h1 style="margin:0 0 24px;font-family:'Fraunces',Georgia,'Times New Roman',serif;font-size:34px;line-height:1.18;font-weight:bold;color:#2b231f;">${e(contenido.titulo)}</h1>
        ${contenido.parrafos.map((parrafo) => `<p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#5e534b;overflow-wrap:anywhere;word-break:break-word;">${multilinea(parrafo)}</p>`).join('')}
        ${
          tarjeta
            ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;"><tr><td bgcolor="#fbf3f4" style="border:1px solid #e2c2c7;border-radius:12px;padding:22px;overflow-wrap:anywhere;word-break:break-word;">
          <h2 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:29px;color:#6e1f2b;">${e(tarjeta.titulo)}</h2>
          ${(tarjeta.detalles ?? []).map(([clave, valor]) => `<p style="margin:8px 0;font-size:13px;line-height:22px;color:#5e534b;"><strong style="color:#2b231f;">${e(clave)}:</strong> ${e(valor)}</p>`).join('')}
          ${tarjeta.mensaje ? `<p style="margin:16px 0 0;font-size:14px;line-height:24px;color:#5e534b;">${multilinea(tarjeta.mensaje)}</p>` : ''}
        </td></tr></table>`
            : ''
        }
        ${
          accion
            ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 20px;"><tr><td align="center" bgcolor="#6e1f2b" style="border-radius:10px;mso-padding-alt:16px 24px;">
          <a href="${e(accion.url)}" style="display:inline-block;padding:16px 24px;border:1px solid #6e1f2b;border-radius:10px;color:#ffffff;font-size:14px;font-weight:bold;line-height:20px;text-decoration:none;">${e(accion.texto)} &nbsp;→</a>
        </td></tr></table>`
            : ''
        }
        <p style="margin:0;font-size:13px;line-height:22px;color:#7a6f66;">${multilinea(contenido.nota)}</p>
        ${accion ? `<div style="border-top:1px solid #e5dccd;margin-top:26px;padding-top:18px;"><p style="margin:0 0 6px;font-size:11px;line-height:18px;color:#7a6f66;">Si el botón no funciona, usá este enlace:</p><a href="${e(accion.url)}" style="font-size:11px;line-height:18px;color:#6e1f2b;overflow-wrap:anywhere;word-break:break-all;">${e(accion.url)}</a></div>` : ''}
      </td></tr>
      <tr><td align="center" style="padding:24px 12px 0;">
        <p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#6e1f2b;">Menos caos. Más tempo.</p>
        ${contenido.pie ? `<p style="margin:0 0 10px;font-size:11px;line-height:18px;color:#7a6f66;">${e(contenido.pie)}</p>` : ''}
        <p style="margin:0;font-size:11px;line-height:20px;color:#5e534b;">¿Necesitás ayuda? <a href="mailto:${SOPORTE}" style="color:#6e1f2b;text-decoration:underline;overflow-wrap:anywhere;">${SOPORTE}</a></p>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr></table>
</body></html>`;
  return { asunto: contenido.asunto, texto, html };
}

export function crearEmailVerificacion(
  base: string | undefined,
  nombre: string,
  token: string,
): EmailTempo {
  return crearEmailTempo({
    asunto: 'Confirmá tu cuenta · Tempo',
    preheader: 'Un último paso para empezar a organizar tu semestre.',
    etiqueta: 'Tu semestre empieza acá',
    titulo: 'Dale la bienvenida a un poco más de orden.',
    parrafos: [
      `Hola, ${nombre}.`,
      'Qué bueno tenerte en Tempo. Confirmá tu email para reunir tus materias, crear tareas con IA y activar tus recordatorios.',
    ],
    accion: {
      texto: 'Confirmar mi cuenta',
      url: enlaceWeb(base, 'verificar-email', token),
    },
    nota: 'Este enlace vence en 24 horas. Si no creaste esta cuenta, podés ignorar el mensaje.',
    pie: 'Recibiste este correo porque se registró una cuenta en Tempo con este email.',
  });
}

export function crearEmailReset(
  base: string | undefined,
  nombre: string,
  token: string,
): EmailTempo {
  return crearEmailTempo({
    asunto: 'Restablecé tu contraseña · Tempo',
    preheader: 'Volvé a tu espacio con una nueva contraseña.',
    etiqueta: 'Volvé a tu espacio',
    titulo: 'Un nuevo acceso. El mismo tempo.',
    parrafos: [
      `Hola, ${nombre}.`,
      'Recibimos un pedido para restablecer tu contraseña. Elegí una nueva y seguí con tu organización.',
    ],
    accion: {
      texto: 'Crear nueva contraseña',
      url: enlaceWeb(base, 'resetear-password', token),
    },
    nota: 'El enlace vence en 1 hora. Si no lo pediste, ignorá este correo: tu contraseña no cambia hasta que completes el proceso.',
    pie: 'Por seguridad, no compartas este enlace con nadie.',
  });
}

export interface RecordatorioEmail {
  nombre: string;
  titulo: string;
  fechaLimite: Date;
  materia?: string;
  tipo?: string;
}

export function crearEmailRecordatorio(
  base: string | undefined,
  tarea: RecordatorioEmail,
): EmailTempo {
  const fecha = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'full',
    timeStyle: 'short',
    hour12: false,
  }).format(tarea.fechaLimite);
  const detalles: [string, string][] = [
    ['Vence', `${fecha} (hora de Argentina)`],
  ];
  if (tarea.materia) detalles.push(['Materia', tarea.materia]);
  const tipos: Record<string, string> = {
    tarea: 'Tarea',
    examen: 'Examen',
    entrega: 'Entrega',
    tp: 'Trabajo práctico',
    otro: 'Otra actividad',
  };
  if (tarea.tipo) detalles.push(['Actividad', tipos[tarea.tipo] ?? tarea.tipo]);
  return crearEmailTempo({
    asunto: `Recordatorio: ${tarea.titulo} · Tempo`,
    preheader: `Tu próxima fecha: ${tarea.titulo}. Revisá los detalles en Tempo.`,
    etiqueta: 'Una fecha para tener presente',
    titulo: 'Tu próxima tarea, a tiempo.',
    parrafos: [
      `Hola, ${tarea.nombre}.`,
      'Una pausa para revisar tu agenda. Esta actividad tiene una fecha límite y queremos que la tengas presente.',
    ],
    tarjeta: { titulo: tarea.titulo, detalles },
    accion: { texto: 'Ver mis tareas', url: enlaceWeb(base, 'tareas') },
    nota: 'Podés cambiar la anticipación o desactivar los avisos desde Perfil → Recordatorios por email.',
    pie: 'Este aviso es automático: tenés los recordatorios de Tempo activados.',
  });
}

export function crearEmailContacto(datos: {
  nombre: string;
  email: string;
  motivo: string;
  mensaje: string;
}): EmailTempo {
  const motivos: Record<string, string> = {
    problema: 'Problema',
    sugerencia: 'Sugerencia',
    consulta: 'Consulta',
  };
  return crearEmailTempo({
    asunto: `Tempo · ${datos.motivo}`,
    preheader: `${datos.nombre} te escribió desde el formulario de Tempo.`,
    etiqueta: 'Ayuda y contacto',
    titulo: 'Hay un nuevo mensaje para vos.',
    parrafos: [
      'Alguien se comunicó desde Tempo. Estos son los datos para darle una mano.',
    ],
    tarjeta: {
      titulo: motivos[datos.motivo] ?? datos.motivo,
      detalles: [
        ['Nombre', datos.nombre],
        ['Email para responder', datos.email],
      ],
      mensaje: datos.mensaje,
    },
    accion: {
      texto: 'Responder por email',
      url: `mailto:${encodeURIComponent(datos.email)}?subject=${encodeURIComponent('Re: Tu mensaje a Tempo')}`,
    },
    nota: 'El botón abre una respuesta a la persona que completó el formulario.',
    pie: 'Mensaje recibido desde el formulario de ayuda de Tempo.',
  });
}
