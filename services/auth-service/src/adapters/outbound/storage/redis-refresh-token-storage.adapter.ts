import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { RefreshTokenStoragePort } from '@domain/ports/outbound/refresh-token-storage.port';

@Injectable()
export class RedisRefreshTokenStorageAdapter implements RefreshTokenStoragePort {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });
  }

  async store(userId: string, token: string): Promise<void> {
    await this.redis.set(`refresh:${userId}`, token, 'EX', 7 * 24 * 60 * 60);
  }

  async validate(userId: string, token: string): Promise<boolean> {
    const stored = await this.redis.get(`refresh:${userId}`);
    return stored === token;
  }

  async revoke(userId: string): Promise<void> {
    await this.redis.del(`refresh:${userId}`);
  }
}
