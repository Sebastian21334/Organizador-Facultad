import { Module } from '@nestjs/common';
import { IaService } from './services/ia.service';

@Module({
  providers: [IaService],
  exports: [IaService],
})
export class IaModule {}