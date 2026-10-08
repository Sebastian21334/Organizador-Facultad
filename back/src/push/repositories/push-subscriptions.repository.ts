import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscription } from '../entities/push-subscription.entity';
import { RegistrarPushSubscriptionDto } from '../dto/push-subscription.dto';

@Injectable()
export class PushSubscriptionsRepository {
  constructor(
    @InjectRepository(PushSubscription)
    private readonly repo: Repository<PushSubscription>,
  ) {}

  async registrar(
    usuarioId: string,
    datos: RegistrarPushSubscriptionDto,
  ): Promise<void> {
    // Un mismo dispositivo puede cambiar de cuenta solo al registrarlo explícitamente.
    await this.repo.upsert(
      {
        endpoint: datos.endpoint,
        keys: datos.keys,
        userAgent: datos.userAgent ?? null,
        usuarioId,
      },
      ['endpoint'],
    );
  }
  buscarPorUsuario(usuarioId: string): Promise<PushSubscription[]> {
    return this.repo.find({ where: { usuarioId } });
  }
  async eliminar(usuarioId: string, endpoint: string): Promise<void> {
    await this.repo.delete({ usuarioId, endpoint });
  }
  async eliminarInvalida(suscripcion: PushSubscription): Promise<void> {
    // No borrar una renovación/reasignación que ocurrió mientras se enviaba el push.
    await this.repo.delete({
      id: suscripcion.id,
      usuarioId: suscripcion.usuarioId,
      keys: suscripcion.keys,
    });
  }
}
