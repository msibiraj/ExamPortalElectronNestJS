import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUESTION_SERVICE, EXAM_SERVICE } from '@app/shared';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../guards/roles.guard';

const redisClientFactory = (name: string) => ({
  name,
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    transport: Transport.REDIS,
    options: {
      host: configService.get<string>('REDISHOST') || configService.get<string>('REDIS_HOST', 'localhost'),
      port: parseInt(configService.get<string>('REDISPORT') || configService.get<string>('REDIS_PORT', '6379'), 10),
      password: configService.get<string>('REDISPASSWORD') || configService.get<string>('REDIS_PASSWORD') || undefined,
      username: configService.get<string>('REDISUSER') || configService.get<string>('REDIS_USERNAME') || undefined,
    },
  }),
  inject: [ConfigService],
});

@Module({
  imports: [
    AuthModule,
    ClientsModule.registerAsync([
      redisClientFactory(QUESTION_SERVICE),
      redisClientFactory(EXAM_SERVICE),
    ]),
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService, RolesGuard],
})
export class QuestionsModule {}
