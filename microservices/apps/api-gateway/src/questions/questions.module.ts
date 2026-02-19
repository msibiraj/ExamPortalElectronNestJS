import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUESTION_SERVICE } from '@app/shared';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../guards/roles.guard';

@Module({
  imports: [
    AuthModule,
    ClientsModule.registerAsync([
      {
        name: QUESTION_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('QUESTION_SERVICE_HOST', 'localhost'),
            port: configService.get<number>('QUESTION_SERVICE_PORT', 4002),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService, RolesGuard],
})
export class QuestionsModule {}
