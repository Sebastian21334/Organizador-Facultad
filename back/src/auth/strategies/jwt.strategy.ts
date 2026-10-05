import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { JWT_AUDIENCE, JWT_ISSUER, sessionCookie } from '../../security.config';
import { isUUID } from 'class-validator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usuarios: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        sessionCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }

  async validate(payload: {
    sub: string;
    type: string;
    ver: number;
    jti: string;
    exp: number;
  }) {
    if (
      payload.type !== 'session' ||
      !isUUID(payload.sub) ||
      !isUUID(payload.jti) ||
      !Number.isInteger(payload.ver) ||
      !Number.isInteger(payload.exp)
    )
      throw new UnauthorizedException('Sesión inválida');
    const usuario = await this.usuarios.buscarPorId(payload.sub);
    if (
      !usuario ||
      !usuario.emailVerificado ||
      usuario.sessionVersion !== payload.ver
    ) {
      throw new UnauthorizedException(
        'La sesión venció. Iniciá sesión de nuevo.',
      );
    }
    return {
      userId: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      jti: payload.jti,
    };
  }
}
