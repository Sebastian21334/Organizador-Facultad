import {
  crearEmailContacto,
  crearEmailRecordatorio,
  crearEmailReset,
  crearEmailTempo,
  crearEmailVerificacion,
} from './tempo-email';

describe('Correos con identidad de Tempo', () => {
  const base = 'https://tempo.example';

  it('confirmación: marca, CTA, preheader, vencimiento y alternativa de texto', () => {
    const correo = crearEmailVerificacion(base, 'Seba', 'token-valido');
    expect(correo.asunto).toBe('Confirmá tu cuenta · Tempo');
    expect(correo.html).toContain('bgcolor="#6e1f2b"');
    expect(correo.html).toContain('Confirmar mi cuenta');
    expect(correo.html).toContain('max-height:0');
    expect(correo.html).toContain('24 horas');
    expect(correo.texto).toContain('Hola, Seba.');
    expect(correo.texto).toContain(
      `${base}/verificar-email?token=token-valido`,
    );
    expect(correo.texto).not.toContain('<table');
  });

  it('codifica el token y escapa nombres, títulos y mensajes sin inyectar HTML', () => {
    const token = 'a&b="<c># /';
    const correo = crearEmailVerificacion(
      base,
      '<img src=x onerror="alert(1)">',
      token,
    );
    expect(correo.html).not.toContain('<img');
    expect(correo.html).toContain('&lt;img');
    const url = correo.texto
      .split('\n\n')
      .find((linea) => linea.startsWith('Confirmar mi cuenta: '))!
      .replace('Confirmar mi cuenta: ', '');
    expect(new URL(url).searchParams.get('token')).toBe(token);
    expect(new URL(url).searchParams.size).toBe(1);
  });

  it('recuperación: ruta correcta, vence en una hora y explica que no cambió la clave', () => {
    const correo = crearEmailReset(`${base}/`, 'Seba', 'reset-token');
    expect(correo.html).toContain(
      `${base}/resetear-password?token=reset-token`,
    );
    expect(correo.html).toContain('1 hora');
    expect(correo.texto).toContain('tu contraseña no cambia');
    expect(correo.asunto).toContain('Tempo');
  });

  it('recordatorio: fecha independiente del servidor, materia, tipo, CTA y preferencias', () => {
    const correo = crearEmailRecordatorio(base, {
      nombre: 'Seba',
      titulo: 'Redes <parcial>',
      fechaLimite: new Date('2026-10-06T17:30:00Z'),
      materia: 'Redes & Comunicaciones',
      tipo: 'examen',
    });
    expect(correo.html).toContain('Redes &lt;parcial&gt;');
    expect(correo.html).toContain('Redes &amp; Comunicaciones');
    expect(correo.texto).toContain('14:30');
    expect(correo.texto).toContain('hora de Argentina');
    expect(correo.texto).toContain('Examen');
    expect(correo.html).toContain(`${base}/tareas`);
    expect(correo.texto).toContain('desactivar los avisos');
  });

  it('recordatorio sin materia no muestra información ficticia', () => {
    const correo = crearEmailRecordatorio(base, {
      nombre: 'Seba',
      titulo: 'Entrega',
      fechaLimite: new Date('2026-10-06T17:30:00Z'),
    });
    expect(correo.texto).not.toContain('Materia:');
    expect(correo.texto).not.toContain('undefined');
  });

  it('contacto: preserva saltos de línea y permite responder sin inyección en mailto', () => {
    const correo = crearEmailContacto({
      nombre: 'Seba',
      email: 'seba+tempo@example.com',
      motivo: 'problema',
      mensaje: '<script>alert(1)</script>\nSegunda línea',
    });
    expect(correo.html).toContain('&lt;script&gt;');
    expect(correo.html).not.toContain('<script>');
    expect(correo.html).toContain('<br>Segunda línea');
    expect(correo.html).toContain('mailto:seba%2Btempo%40example.com?subject=');
    expect(correo.texto).toContain(
      'Email para responder: seba+tempo@example.com',
    );
  });

  it.each([
    undefined,
    'javascript:alert(1)',
    'https://tempo.example?token=x',
    'https://user:pass@tempo.example',
  ])('rechaza configuración insegura o ausente (%s)', (url) => {
    expect(() => crearEmailVerificacion(url, 'Seba', 'token')).toThrow();
  });

  it('respeta una URL base con subdirectorio', () => {
    expect(crearEmailReset(`${base}/app`, 'Seba', 'token').texto).toContain(
      `${base}/app/resetear-password?token=token`,
    );
  });

  it('no admite scripts como CTA', () => {
    expect(() =>
      crearEmailTempo({
        asunto: 'Tempo',
        preheader: 'Tempo',
        etiqueta: 'Tempo',
        titulo: 'Prueba',
        parrafos: [],
        nota: '',
        accion: { texto: 'Abrir', url: 'javascript:alert(1)' },
      }),
    ).toThrow();
  });
});
