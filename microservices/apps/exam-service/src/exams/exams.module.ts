import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { ExamPaper, ExamPaperSchema } from './schemas/exam-paper.schema';
import { ExamSchedule, ExamScheduleSchema } from './schemas/exam-schedule.schema';
import { StudentAttempt, StudentAttemptSchema } from './schemas/student-attempt.schema';
import { Question, QuestionSchema } from '../../../question-service/src/questions/schemas/question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExamPaper.name,     schema: ExamPaperSchema     },
      { name: ExamSchedule.name,  schema: ExamScheduleSchema  },
      { name: StudentAttempt.name,schema: StudentAttemptSchema },
      { name: Question.name,      schema: QuestionSchema       },
    ]),
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
