import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';
import { CandidateSession, CandidateSessionSchema } from './schemas/candidate-session.schema';
import { ViolationLog, ViolationLogSchema } from './schemas/violation-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CandidateSession.name, schema: CandidateSessionSchema },
      { name: ViolationLog.name, schema: ViolationLogSchema },
    ]),
  ],
  controllers: [MonitorController],
  providers: [MonitorService],
})
export class MonitorModule {}
