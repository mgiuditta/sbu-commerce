import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'CATALOG_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL ?? 'nats://nats:4222'],
          queue: 'catalog_queue',
        },
      },
      {
        name: 'ORDER_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL ?? 'nats://nats:4222'],
          queue: 'order_queue',
        },
      },
      {
        name: 'CART_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL ?? 'nats://nats:4222'],
          queue: 'cart_queue',
        },
      },
      {
        name: 'PRICING_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL ?? 'nats://nats:4222'],
          queue: 'pricing_queue',
        },
      },
      {
        name: 'INVENTORY_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL ?? 'nats://nats:4222'],
          queue: 'inventory_queue',
        },
      },
      {
        name: 'AUTH_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL ?? 'nats://nats:4222'],
          queue: 'auth_queue',
        },
      },
    ]),
  ],
  controllers: [HealthController],
})
export class GatewayModule {}
