import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { PricingModule } from './pricing.module';

async function bootstrap() {
  const app = await NestFactory.create(PricingModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://sbu:sbu_secret@localhost:5672'],
      queue: 'pricing_queue',
      queueOptions: { durable: true },
    },
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3004);
}
bootstrap();
