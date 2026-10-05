import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MateriasModule } from './materias/materias.module';
import { TareasModule } from './tareas/tareas.module';
import { IaModule } from './ia/ia.module';
import { MensajesModule } from './mensajes/mensajes.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContactoModule } from './contacto/contacto.module';
import { APP_GUARD } from '@nestjs/core';
import { SeguridadGuard } from './auth/guards/seguridad.guard';
import { databaseSsl, validateEnvironment } from './security.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        ssl: databaseSsl(),
        extra: {
          max: 10,
          statement_timeout: 15_000,
          connectionTimeoutMillis: 10_000,
        },
      }),
    }),
    MateriasModule,
    TareasModule,
    IaModule,
    MensajesModule,
    AuthModule,
    UsuariosModule,
    ContactoModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: SeguridadGuard }],
})
export class AppModule {}
