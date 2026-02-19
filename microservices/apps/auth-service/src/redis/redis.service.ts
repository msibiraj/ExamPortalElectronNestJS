import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHash } from 'crypto';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    const key = `bl:${this.hashToken(token)}`;
    await this.client.set(key, '1', 'EX', ttlSeconds);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `bl:${this.hashToken(token)}`;
    const result = await this.client.get(key);
    return result !== null;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex').substring(0, 32);
  }
}
