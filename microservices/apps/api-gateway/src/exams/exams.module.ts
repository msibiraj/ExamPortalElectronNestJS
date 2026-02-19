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
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('EXAM_SERVICE_HOST', 'localhost'),
            port: configService.get<number>('EXAM_SERVICE_PORT', 4004),
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
