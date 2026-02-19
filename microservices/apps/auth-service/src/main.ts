import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: parseInt(process.env.AUTH_SERVICE_PORT, 10) || 3001,
      },
    },
  );
  await app.listen();
  console.log('Auth Microservice is listening on TCP port 3001');
}
bootstrap();
