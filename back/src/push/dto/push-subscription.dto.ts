import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class PushKeysDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{87}=?$/)
  p256dh!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{22}(==)?$/)
  auth!: string;
}

export class EliminarPushSubscriptionDto {
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_tld: true,
    disallow_auth: true,
  })
  @MaxLength(2048)
  endpoint!: string;
}

export class RegistrarPushSubscriptionDto extends EliminarPushSubscriptionDto {
  @IsObject()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}
