import { Injectable } from '@nestjs/common';
import { IaService } from '../../ia/services/ia.service';
import { LimitesService } from '../../usuarios/services/limites.service';
import { MateriasRepository } from '../repositories/materias.repository';
import { MateriaPlanDto } from '../dto/plan-estudios.dto';
import { normalizarNombreMateria } from '../plan-estudios';

@Injectable()
export class PlanEstudiosService {
  constructor(
    private readonly ia: IaService,
    private readonly materias: MateriasRepository,
    private readonly limites: LimitesService,
  ) {}

  async analizar(texto: string, usuarioId: string) {
    await this.limites.consumir('ia-usuario-minuto', usuarioId, 5, 60_000);
    await this.limites.consumir('ia-usuario-dia', usuarioId, 30, 86_400_000);
    await this.limites.consumir('ia-global-dia', 'global', 500, 86_400_000);
    await this.limites.consumir('plan-usuario-dia', usuarioId, 5, 86_400_000);
    const resultado = await this.ia.extraerPlanEstudios(texto);
    const existentes = new Set((await this.materias.buscarTodasPorUsuario(usuarioId))
      .map(m => normalizarNombreMateria(m.nombre)));
    return {
      ...resultado,
      materias: resultado.materias.map(m => ({ ...m, existe: existentes.has(normalizarNombreMateria(m.nombre)) })),
    };
  }

  async importar(materias: MateriaPlanDto[], usuarioId: string) {
    return this.materias.importarPlan(materias, usuarioId);
  }
}
