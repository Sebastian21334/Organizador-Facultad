import { PlanEstudiosService } from './plan-estudios.service';
import { Cuatrimestre } from '../entities/materia.entity';

describe('Vista previa del plan, sin crear ni modificar materias', () => {
  const usuarioId = 'usuario-de-prueba';
  const materia = { nombre: '  ANALISIS   MATEMATICO I ', anioCursado: 1, cuatrimestre: Cuatrimestre.PRIMERO };
  let ia: any; let repo: any; let limites: any; let service: PlanEstudiosService;
  beforeEach(() => {
    ia = { extraerPlanEstudios: jest.fn().mockResolvedValue({ materias: [materia], advertencias: [] }) };
    repo = { buscarTodasPorUsuario: jest.fn().mockResolvedValue([
      ...Array.from({ length: 110 }, (_, i) => ({ nombre: `Materia ${i}` })), { nombre: 'Análisis Matemático I' },
    ]), importarPlan: jest.fn() };
    limites = { consumir: jest.fn().mockResolvedValue(undefined) };
    service = new PlanEstudiosService(ia, repo, limites);
  });
  it('compara todas las materias de la cuenta, incluidas las que superan la primera página', async () => {
    const result = await service.analizar('Plan de estudios con primer año y materias.', usuarioId);
    expect(result.materias[0].existe).toBe(true);
    expect(repo.buscarTodasPorUsuario).toHaveBeenCalledWith(usuarioId);
    expect(repo.importarPlan).not.toHaveBeenCalled();
  });
  it('comparte los límites de IA con el chat y no llama a IA si se agotaron', async () => {
    limites.consumir.mockRejectedValueOnce(new Error('límite'));
    await expect(service.analizar('Plan de estudios con materias.', usuarioId)).rejects.toThrow('límite');
    expect(ia.extraerPlanEstudios).not.toHaveBeenCalled();
  });
  it('solo entrega al guardado la cuenta autenticada y las materias confirmadas', async () => {
    await service.importar([materia], usuarioId);
    expect(repo.importarPlan).toHaveBeenCalledWith([materia], usuarioId);
    expect(ia.extraerPlanEstudios).not.toHaveBeenCalled();
  });
});
