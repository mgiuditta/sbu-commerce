import 'reflect-metadata';
import { config } from 'dotenv';
config();

import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { CatalogModule } from './catalog.module';

async function bootstrap() {
  const logger = new Logger('CatalogService');
  const app = await NestFactory.create(CatalogModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL || 'nats://localhost:4222'],
      queue: 'catalog_queue',
    },
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.startAllMicroservices();
  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Catalog service running on port ${port}`);
}
bootstrap();
