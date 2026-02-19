import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { Question, QuestionSchema } from './schemas/question.schema';
import { QuestionVersion, QuestionVersionSchema } from './schemas/question-version.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
      { name: QuestionVersion.name, schema: QuestionVersionSchema },
    ]),
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
