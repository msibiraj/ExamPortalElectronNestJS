import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EXAM_SERVICE } from '@app/shared';
import { ExamPapersController, ExamSchedulesController, StudentExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../guards/roles.guard';

@Module({
  imports: [
    AuthModule,
    ClientsModule.registerAsync([
      {
        name: EXAM_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            password: configService.get<string>('REDIS_PASSWORD') || undefined,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ExamPapersController, ExamSchedulesController, StudentExamsController],
  providers: [ExamsService, RolesGuard],
})
export class ExamsModule {}
