import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { StorageService } from './storage/storage.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  // atrás do proxy da hospedagem: IP real do cliente (o limite de login é por IP)
  app.set('trust proxy', 1);
  // SIGTERM do deploy: termina as requisições e fecha o Prisma antes de sair
  app.enableShutdownHooks();

  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter));

  // fotos no disco são servidas pela API; no bucket S3, pela URL pública do bucket
  const storage = app.get(StorageService);
  if (storage.servidoPelaApi) {
    app.useStaticAssets(join(process.cwd(), storage.diretorioLocal), { prefix: '/uploads' });
  }

  const config = new DocumentBuilder()
    .setTitle('Vetor API')
    .setDescription(
      'API do sistema de gestão de manutenção de frotas Vetor. Contrato original em /endpoints.md, na raiz do monorepo.',
    )
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Vetor API em http://localhost:${port}/api — docs em http://localhost:${port}/api/docs`);
}

bootstrap();
