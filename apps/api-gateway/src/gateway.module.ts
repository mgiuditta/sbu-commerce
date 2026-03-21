import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'CATALOG_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? 'amqp://sbu:sbu_secret@localhost:5672'],
          queue: 'catalog_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'ORDER_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? 'amqp://sbu:sbu_secret@localhost:5672'],
          queue: 'orders_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'CART_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? 'amqp://sbu:sbu_secret@localhost:5672'],
          queue: 'cart_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'PRICING_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? 'amqp://sbu:sbu_secret@localhost:5672'],
          queue: 'pricing_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'INVENTORY_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? 'amqp://sbu:sbu_secret@localhost:5672'],
          queue: 'inventory_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'AUTH_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? 'amqp://sbu:sbu_secret@localhost:5672'],
          queue: 'auth_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [HealthController],
})
export class GatewayModule {}
