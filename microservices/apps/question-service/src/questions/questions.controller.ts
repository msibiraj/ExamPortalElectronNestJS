import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { QuestionsService } from './questions.service';
import {
  QUESTION_PATTERNS,
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionFilterDto,
  BulkTagDto,
  ImportQuestionsDto,
  RestoreVersionDto,
} from '@app/shared';

@Controller()
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @MessagePattern(QUESTION_PATTERNS.CREATE)
  create(@Payload() payload: CreateQuestionDto & { userId: string; organizationId: string }) {
    return this.questionsService.create(payload);
  }

  @MessagePattern(QUESTION_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: { filter: QuestionFilterDto; userId: string; organizationId: string }) {
    return this.questionsService.findAll({ ...payload.filter, userId: payload.userId, organizationId: payload.organizationId });
  }

  @MessagePattern(QUESTION_PATTERNS.FIND_ONE)
  findOne(@Payload() payload: { id: string }) {
    return this.questionsService.findOne(payload.id);
  }

  @MessagePattern(QUESTION_PATTERNS.UPDATE)
  update(@Payload() payload: { id: string } & UpdateQuestionDto & { userId: string }) {
    const { id, userId, ...dto } = payload;
    return this.questionsService.update(id, { ...dto, userId } as any);
  }

  @MessagePattern(QUESTION_PATTERNS.PUBLISH)
  publish(@Payload() payload: { id: string; userId: string }) {
    return this.questionsService.publish(payload.id, payload.userId);
  }

  @MessagePattern(QUESTION_PATTERNS.SAVE_DRAFT)
  saveDraft(@Payload() payload: { id: string; userId: string }) {
    return this.questionsService.saveDraft(payload.id, payload.userId);
  }

  @MessagePattern(QUESTION_PATTERNS.ARCHIVE)
  archive(@Payload() payload: { id: string }) {
    return this.questionsService.archive(payload.id);
  }

  @MessagePattern(QUESTION_PATTERNS.DUPLICATE)
  duplicate(@Payload() payload: { id: string; userId: string }) {
    return this.questionsService.duplicate(payload.id, payload.userId);
  }

  @MessagePattern(QUESTION_PATTERNS.BULK_TAG)
  bulkTag(@Payload() dto: BulkTagDto) {
    return this.questionsService.bulkTag(dto);
  }

  @MessagePattern(QUESTION_PATTERNS.EXPORT_CSV)
  exportCsv(@Payload() payload: { userId: string; organizationId: string }) {
    return this.questionsService.exportCsv(payload.userId, payload.organizationId);
  }

  @MessagePattern(QUESTION_PATTERNS.IMPORT)
  importQuestions(@Payload() payload: ImportQuestionsDto & { userId: string; organizationId: string }) {
    return this.questionsService.importQuestions(payload);
  }

  @MessagePattern(QUESTION_PATTERNS.GET_HISTORY)
  getHistory(@Payload() payload: { questionId: string }) {
    return this.questionsService.getHistory(payload.questionId);
  }

  @MessagePattern(QUESTION_PATTERNS.RESTORE_VERSION)
  restoreVersion(@Payload() payload: { questionId: string } & RestoreVersionDto & { userId: string }) {
    const { questionId, userId, version } = payload;
    return this.questionsService.restoreVersion(questionId, { version, userId });
  }

  @MessagePattern(QUESTION_PATTERNS.BULK_PUBLISH)
  bulkPublish(@Payload() payload: { questionIds: string[]; userId: string }) {
    return this.questionsService.bulkPublish(payload.questionIds, payload.userId);
  }

  @MessagePattern(QUESTION_PATTERNS.FLAG_REVIEW)
  flagReview(@Payload() payload: { id: string; flagged: boolean }) {
    return this.questionsService.flagReview(payload.id, payload.flagged);
  }

  @MessagePattern(QUESTION_PATTERNS.CLEAR_FLAG)
  clearFlag(@Payload() payload: { id: string }) {
    return this.questionsService.flagReview(payload.id, false);
  }
}
