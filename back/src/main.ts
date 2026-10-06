import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { allowedOrigins } from './security.config';
import { SecurityExceptionFilter } from './security.filter';
import { configurarBodyParsers } from './http-body-parsers';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY)
    app.set(
      'trust proxy',
      process.env.TRUST_PROXY.split(',').map((value) => value.trim()),
    );
  app.use(helmet({ referrerPolicy: { policy: 'no-referrer' } }));
  configurarBodyParsers(app);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(new SecurityExceptionFilter());
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.enableShutdownHooks();

  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
