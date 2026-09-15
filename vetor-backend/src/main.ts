import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const uploadsDir = process.env.UPLOADS_DIR ?? './uploads';
  app.useStaticAssets(join(process.cwd(), uploadsDir), { prefix: '/uploads' });

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
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Vetor API em http://localhost:${port}/api — docs em http://localhost:${port}/api/docs`);
}

bootstrap();
