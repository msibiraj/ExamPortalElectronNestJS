import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { QuestionsModule } from './questions/questions.module';
import { MonitorModule } from './monitor/monitor.module';
import { CodeRunnerModule } from './code-runner/code-runner.module';
import { ExamsModule } from './exams/exams.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    QuestionsModule,
    MonitorModule,
    CodeRunnerModule,
    ExamsModule,
  ],
})
export class AppModule {}
