import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.REDIS,
      options: {
        host: process.env.REDISHOST || process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDISPORT || process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDISPASSWORD || process.env.REDIS_PASSWORD || undefined,
        username: process.env.REDISUSER || process.env.REDIS_USERNAME || undefined,
      },
    },
  );
  await app.listen();
  console.log('Exam Microservice is listening via Redis');
}
bootstrap();
