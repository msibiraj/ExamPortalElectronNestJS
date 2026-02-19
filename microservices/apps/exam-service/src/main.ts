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
        port: parseInt(process.env.EXAM_SERVICE_PORT, 10) || 4004,
      },
    },
  );
  await app.listen();
  console.log('Exam Microservice is listening on TCP port 4004');
}
bootstrap();
