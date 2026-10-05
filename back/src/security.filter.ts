import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SecurityExceptionFilter.name);
  catch(error: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest<Request>();
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const response = error.getResponse();
      if (
        status === 429 &&
        typeof response === 'object' &&
        'retryAfter' in response
      )
        res.setHeader('Retry-After', String(response.retryAfter));
      res
        .status(status)
        .json(
          typeof response === 'string'
            ? { statusCode: status, message: response }
            : response,
        );
      return;
    }
    const parser = error as { type?: string; status?: number };
    if (
      ['entity.too.large', 'entity.parse.failed'].includes(parser?.type ?? '')
    ) {
      const status = parser.type === 'entity.too.large' ? 413 : 400;
      res
        .status(status)
        .json({
          statusCode: status,
          message: 'El contenido es inválido o demasiado grande.',
        });
      return;
    }
    const requestId = randomUUID();
    // No registrar contraseñas, tokens, SQL, emails ni respuestas completas de proveedores.
    this.logger.error(`Error interno [${requestId}] en ${req.method}`);
    res
      .status(500)
      .json({
        statusCode: 500,
        message: 'Ocurrió un error inesperado. Intentá de nuevo más tarde.',
        requestId,
      });
  }
}
