import { TareasService } from './tareas.service';

describe('Push usa el procesamiento existente de recordatorios', () => {
  const tarea = {
    id: 'tarea',
    usuarioId: 'usuario',
    titulo: 'Parcial',
    tipo: 'examen',
    fechaLimite: new Date(Date.now() + 60 * 60_000),
    materia: { nombre: 'Física' },
    usuario: {
      email: 'seba@example.com',
      nombre: 'Seba',
      recordatorioEmailHabilitado: true,
      recordatorioMinutos: 1440,
    },
  };
  const repo = {
    findRecordatoriosVencidos: jest.fn(),
    reclamarRecordatorio: jest.fn(),
    marcarRecordatorioEnviado: jest.fn(),
  };
  const mail = { enviarRecordatorio: jest.fn() };
  const limites = { consumir: jest.fn() };
  let service: TareasService;
  beforeEach(() => {
    jest.clearAllMocks();
    repo.findRecordatoriosVencidos.mockResolvedValue([tarea]);
    repo.reclamarRecordatorio.mockResolvedValue(true);
    mail.enviarRecordatorio.mockResolvedValue({ status: 'Succeeded' });
    service = new TareasService(
      repo as any,
      mail as any,
      {} as any,
      limites as any,
    );
  });
  it('el mismo recordatorio pasa la cuenta al correo/push y conserva la confirmación de envío', async () => {
    await (service as any).enviarRecordatorios();
    expect(mail.enviarRecordatorio).toHaveBeenCalledWith(
      'seba@example.com',
      {
        nombre: 'Seba',
        titulo: 'Parcial',
        tipo: 'examen',
        materia: 'Física',
        fechaLimite: tarea.fechaLimite,
      },
      'usuario',
    );
    expect(repo.marcarRecordatorioEnviado).toHaveBeenCalledWith(
      'tarea',
      expect.any(String),
    );
  });
  it('no crea un envío separado si los recordatorios por email están desactivados', async () => {
    repo.findRecordatoriosVencidos.mockResolvedValue([
      {
        ...tarea,
        usuario: { ...tarea.usuario, recordatorioEmailHabilitado: false },
      },
    ]);
    await (service as any).enviarRecordatorios();
    expect(mail.enviarRecordatorio).not.toHaveBeenCalled();
    expect(repo.reclamarRecordatorio).not.toHaveBeenCalled();
  });
  it('no vuelve a enviar cuando otro proceso ya reclamó la tarea', async () => {
    repo.reclamarRecordatorio.mockResolvedValue(false);
    await (service as any).enviarRecordatorios();
    expect(mail.enviarRecordatorio).not.toHaveBeenCalled();
  });
});
