import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TareasController } from './controllers/tareas.controller';
import { TareasService } from './services/tareas.service';
import { TareasRepository } from './repositories/tareas.repository';
import { Tarea } from './entities/tarea.entity';
import { MailModule } from '../mail/mail.module';
import { MateriasModule } from '../materias/materias.module';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tarea]),
    MailModule,
    MateriasModule,
    UsuariosModule,
  ],
  controllers: [TareasController],
  providers: [TareasService, TareasRepository],
  exports: [TareasService],
})
export class TareasModule {}
