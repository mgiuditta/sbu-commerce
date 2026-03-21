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
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://sbu:sbu_secret@localhost:5672'],
      queue: 'catalog_queue',
      queueOptions: { durable: true },
    },
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.startAllMicroservices();
  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Catalog service running on port ${port}`);
}
bootstrap();
