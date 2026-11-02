import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Objetivo } from './objetivo.entity';
import { Tarea } from '../tareas/entities/tarea.entity';
import { MailModule } from '../mail/mail.module';
import { ObjetivosController } from './objetivos.controller';
import { ObjetivosService } from './objetivos.service';
import { RecurrentesController } from './recurrentes.controller';
@Module({ imports: [TypeOrmModule.forFeature([Objetivo, Tarea]), MailModule], controllers: [RecurrentesController, ObjetivosController], providers: [ObjetivosService] })
export class ObjetivosModule {}
