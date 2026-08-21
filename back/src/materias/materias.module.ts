import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MateriasController } from './controllers/materias.controller'; 
import { MateriasService } from './services/materias.service';
import { MateriasRepository } from './repositories/materias.repository';
import { Materia } from './entities/materia.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Materia])],
  controllers: [MateriasController],
  providers: [MateriasService, MateriasRepository],
  exports: [MateriasRepository],
})
export class MateriasModule {}