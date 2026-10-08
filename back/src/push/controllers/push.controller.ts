import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  EliminarPushSubscriptionDto,
  RegistrarPushSubscriptionDto,
} from '../dto/push-subscription.dto';
import { PushService } from '../services/push.service';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('public-key')
  clavePublica() {
    return this.push.clavePublica();
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscriptions')
  listar(@Req() req: { user: { userId: string } }) {
    return this.push.listar(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscriptions')
  registrar(
    @Req() req: { user: { userId: string } },
    @Body() dto: RegistrarPushSubscriptionDto,
  ) {
    return this.push.registrar(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('subscriptions')
  eliminar(
    @Req() req: { user: { userId: string } },
    @Body() dto: EliminarPushSubscriptionDto,
  ) {
    return this.push.eliminar(req.user.userId, dto.endpoint);
  }
}
