import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushSubscription } from './entities/push-subscription.entity';
import { PushSubscriptionsRepository } from './repositories/push-subscriptions.repository';
import { PushService } from './services/push.service';
import { PushController } from './controllers/push.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription])],
  controllers: [PushController],
  providers: [PushSubscriptionsRepository, PushService],
  exports: [PushService],
})
export class PushModule {}
