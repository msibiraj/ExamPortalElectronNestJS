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
        port: parseInt(process.env.MONITOR_SERVICE_PORT, 10) || 4003,
      },
    },
  );
  await app.listen();
  console.log('Monitor Microservice is listening on TCP port 4003');
}
bootstrap();
