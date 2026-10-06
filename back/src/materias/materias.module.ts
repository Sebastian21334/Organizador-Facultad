import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MateriasController } from './controllers/materias.controller'; 
import { MateriasService } from './services/materias.service';
import { MateriasRepository } from './repositories/materias.repository';
import { Materia } from './entities/materia.entity';
import { IaModule } from '../ia/ia.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PlanEstudiosService } from './services/plan-estudios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Materia]), IaModule, UsuariosModule],
  controllers: [MateriasController],
  providers: [MateriasService, MateriasRepository, PlanEstudiosService],
  exports: [MateriasRepository],
})
export class MateriasModule {}
