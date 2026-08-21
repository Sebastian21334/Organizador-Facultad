import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MensajesController } from './controllers/mensajes.controller';
import { MensajesService } from './services/mensajes.service';
import { MensajesRepository } from './repositories/mensajes.repository';
import { MensajeEntrante } from './entities/mensaje-entrante.entity';
import { IaModule } from '../ia/ia.module';
import { TareasModule } from '../tareas/tareas.module';
import { MateriasModule } from '../materias/materias.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MensajeEntrante]),
    IaModule,
    TareasModule,
    MateriasModule,
  ],
  controllers: [MensajesController],
  providers: [MensajesService, MensajesRepository],
})
export class MensajesModule {}