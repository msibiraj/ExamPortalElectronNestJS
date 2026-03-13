import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  QUESTION_SERVICE, EXAM_SERVICE,
  EXAM_PATTERNS, QUESTION_PATTERNS,
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionFilterDto,
  BulkTagDto,
  ImportQuestionsDto,
  RestoreVersionDto,
} from '@app/shared';

@Injectable()
export class QuestionsService {
  constructor(
    @Inject(QUESTION_SERVICE) private readonly questionClient: ClientProxy,
    @Inject(EXAM_SERVICE) private readonly examClient: ClientProxy,
  ) {}

  create(dto: CreateQuestionDto, userId: string, organizationId: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.CREATE, { ...dto, userId, organizationId }),
    );
  }

  findAll(filter: QuestionFilterDto, userId: string, organizationId: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.FIND_ALL, { filter, userId, organizationId }),
    );
  }

  findOne(id: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.FIND_ONE, { id }),
    );
  }

  update(id: string, dto: UpdateQuestionDto, userId: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.UPDATE, { id, ...dto, userId }),
    );
  }

  publish(id: string, userId: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.PUBLISH, { id, userId }),
    );
  }

  saveDraft(id: string, userId: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.SAVE_DRAFT, { id, userId }),
    );
  }

  archive(id: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.ARCHIVE, { id }),
    );
  }

  duplicate(id: string, userId: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.DUPLICATE, { id, userId }),
    );
  }

  bulkTag(dto: BulkTagDto) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.BULK_TAG, dto),
    );
  }

  exportCsv(userId: string, organizationId: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.EXPORT_CSV, { userId, organizationId }),
    );
  }

  importQuestions(dto: ImportQuestionsDto, userId: string, organizationId: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.IMPORT, { ...dto, userId, organizationId }),
    );
  }

  getHistory(questionId: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.GET_HISTORY, { questionId }),
    );
  }

  restoreVersion(questionId: string, dto: RestoreVersionDto, userId: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.RESTORE_VERSION, {
        questionId,
        ...dto,
        userId,
      }),
    );
  }

  bulkPublish(questionIds: string[], userId: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.BULK_PUBLISH, { questionIds, userId }),
    );
  }

  flagReview(id: string, flagged: boolean) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.FLAG_REVIEW, { id, flagged }),
    );
  }

  clearFlag(id: string) {
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.CLEAR_FLAG, { id }),
    );
  }

  async hardDelete(id: string) {
    const { count } = await firstValueFrom(
      this.examClient.send(EXAM_PATTERNS.PAPER_HAS_QUESTION, { questionId: id }),
    );
    if (count > 0) {
      throw new ConflictException(
        `Cannot delete: question is referenced in ${count} exam paper(s)`,
      );
    }
    return firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.HARD_DELETE, { id }),
    );
  }
}
