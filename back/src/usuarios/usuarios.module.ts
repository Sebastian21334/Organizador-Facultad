import { Module } from '@nestjs/common';
import { LimitesService } from './services/limites.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { UsuariosRepository } from './repositories/usuario.repository';
import { UsuariosService } from './services/usuarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  providers: [UsuariosRepository, UsuariosService, LimitesService],
  exports: [UsuariosService, LimitesService],
})
export class UsuariosModule {}
