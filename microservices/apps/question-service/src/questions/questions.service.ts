import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Question, QuestionDocument } from './schemas/question.schema';
import { QuestionVersion, QuestionVersionDocument } from './schemas/question-version.schema';
import {
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
    @InjectModel(Question.name) private readonly questionModel: Model<QuestionDocument>,
    @InjectModel(QuestionVersion.name) private readonly versionModel: Model<QuestionVersionDocument>,
  ) {}

  // ── CREATE ─────────────────────────────────────────────────────────────────

  async create(dto: CreateQuestionDto & { userId: string; organizationId: string }) {
    const { userId, organizationId, ...questionData } = dto;
    const question = await this.questionModel.create({
      ...questionData,
      createdBy: new Types.ObjectId(userId),
      organizationId: new Types.ObjectId(organizationId),
      status: 'draft',
      currentVersion: 1,
    });
    await this.saveVersion(question, userId, 'draft');
    return question.toObject();
  }

  // ── READ ───────────────────────────────────────────────────────────────────

  async findAll(filter: QuestionFilterDto & { userId: string; organizationId: string }) {
    const { userId, organizationId, ...rest } = filter as any;
    const query: Record<string, any> = {
      createdBy: new Types.ObjectId(userId),
      organizationId: new Types.ObjectId(organizationId),
    };

    if (rest.search) {
      query.$or = [
        { body: { $regex: rest.search, $options: 'i' } },
        { tags: { $regex: rest.search, $options: 'i' } },
      ];
    }
    if (rest.types?.length) query.type = { $in: rest.types };
    if (rest.difficulties?.length) query.difficulty = { $in: rest.difficulties };
    if (rest.topic) query.topic = { $regex: rest.topic, $options: 'i' };
    if (rest.tags?.length) query.tags = { $all: rest.tags };
    if (rest.status) query.status = rest.status;
    if (rest.flaggedForReview !== undefined) query.flaggedForReview = rest.flaggedForReview;

    return this.questionModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async findOne(id: string) {
    const question = await this.questionModel.findById(id).lean();
    if (!question) throw new RpcException(new NotFoundException('Question not found'));
    return question;
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateQuestionDto & { userId: string }) {
    const { userId, ...updates } = dto;
    const question = await this.questionModel.findById(id);
    if (!question) throw new RpcException(new NotFoundException('Question not found'));

    const changedFields = Object.keys(updates).filter(
      (key) => JSON.stringify(question[key]) !== JSON.stringify(updates[key]),
    );

    Object.assign(question, updates);
    question.currentVersion += 1;
    await question.save();

    await this.saveVersion(question, userId, question.status, changedFields);
    return question.toObject();
  }

  // ── PUBLISH / DRAFT / ARCHIVE ───────────────────────────────────────────────

  async publish(id: string, userId: string) {
    const question = await this.questionModel.findById(id);
    if (!question) throw new RpcException(new NotFoundException('Question not found'));
    if (question.status === 'archived') {
      throw new RpcException(new ConflictException('Cannot publish an archived question'));
    }
    this.validateForPublish(question);
    question.status = 'published';
    question.currentVersion += 1;
    await question.save();
    await this.saveVersion(question, userId, 'published');
    return question.toObject();
  }

  async saveDraft(id: string, userId: string) {
    const question = await this.questionModel.findById(id);
    if (!question) throw new RpcException(new NotFoundException('Question not found'));
    question.status = 'draft';
    await question.save();
    return question.toObject();
  }

  async archive(id: string) {
    const question = await this.questionModel.findByIdAndUpdate(
      id,
      { status: 'archived' },
      { new: true },
    ).lean();
    if (!question) throw new RpcException(new NotFoundException('Question not found'));
    return question;
  }

  // ── DUPLICATE ──────────────────────────────────────────────────────────────

  async duplicate(id: string, userId: string) {
    const source = await this.questionModel.findById(id).lean();
    if (!source) throw new RpcException(new NotFoundException('Question not found'));

    const { _id, createdAt, updatedAt, currentVersion, ...rest } = source as any;
    const copy = await this.questionModel.create({
      ...rest,
      status: 'draft',
      currentVersion: 1,
      createdBy: new Types.ObjectId(userId),
      // organizationId is copied from source (same org)
      body: `[Copy] ${rest.body}`,
    });
    await this.saveVersion(copy, userId, 'draft');
    return copy.toObject();
  }

  // ── BULK TAG ───────────────────────────────────────────────────────────────

  async bulkTag(dto: BulkTagDto) {
    const ids = dto.questionIds.map((id) => new Types.ObjectId(id));
    await this.questionModel.updateMany(
      { _id: { $in: ids } },
      { $addToSet: { tags: { $each: dto.tags } } },
    );
    return { updated: dto.questionIds.length };
  }

  // ── EXPORT CSV ─────────────────────────────────────────────────────────────

  async exportCsv(userId: string, organizationId: string) {
    const questions = await this.questionModel
      .find({
        createdBy: new Types.ObjectId(userId),
        organizationId: new Types.ObjectId(organizationId),
      })
      .lean();

    const header = 'id,type,topic,difficulty,marks,status,tags,body\n';
    const rows = questions
      .map((q: any) =>
        [
          q._id,
          q.type,
          q.topic,
          q.difficulty,
          q.marks,
          q.status,
          (q.tags || []).join('|'),
          `"${(q.body || '').replace(/"/g, '""')}"`,
        ].join(','),
      )
      .join('\n');

    return { csv: header + rows };
  }

  // ── IMPORT ─────────────────────────────────────────────────────────────────

  async importQuestions(dto: ImportQuestionsDto & { userId: string; organizationId: string }) {
    const { userId, organizationId, format, content, importStatus = 'draft', topicMapping = {} } = dto;
    const imported: any[] = [];
    const skipped: { index: number; reason: string }[] = [];

    let parsedQuestions: any[] = [];
    if (format === 'csv') {
      parsedQuestions = this.parseCsv(content);
    } else {
      skipped.push({ index: 0, reason: `Format '${format}' parsing not yet implemented server-side` });
    }

    for (let i = 0; i < parsedQuestions.length; i++) {
      const raw = parsedQuestions[i];
      try {
        const topic = topicMapping[raw.topic] || raw.topic;
        const question = await this.questionModel.create({
          ...raw,
          topic,
          status: importStatus,
          currentVersion: 1,
          createdBy: new Types.ObjectId(userId),
          organizationId: new Types.ObjectId(organizationId),
        });
        await this.saveVersion(question, userId, importStatus);
        imported.push(question._id);
      } catch (err) {
        skipped.push({ index: i, reason: err.message });
      }
    }

    return { imported: imported.length, skipped };
  }

  // ── VERSION HISTORY ────────────────────────────────────────────────────────

  async getHistory(questionId: string) {
    return this.versionModel
      .find({ questionId: new Types.ObjectId(questionId) })
      .sort({ version: -1 })
      .lean();
  }

  async restoreVersion(questionId: string, dto: RestoreVersionDto & { userId: string }) {
    const { version, userId } = dto;
    const versionDoc = await this.versionModel.findOne({
      questionId: new Types.ObjectId(questionId),
      version,
    });
    if (!versionDoc) throw new RpcException(new NotFoundException('Version not found'));

    const question = await this.questionModel.findById(questionId);
    if (!question) throw new RpcException(new NotFoundException('Question not found'));

    const { status: snapStatus, ...snapData } = versionDoc.snapshot as any;
    Object.assign(question, snapData);
    question.status = 'draft';
    question.currentVersion += 1;
    await question.save();

    await this.saveVersion(question, userId, 'draft', [`Restored from v${version}`]);
    return question.toObject();
  }

  // ── FLAG FOR REVIEW ────────────────────────────────────────────────────────

  async flagReview(id: string, flagged: boolean) {
    const question = await this.questionModel.findByIdAndUpdate(
      id,
      { flaggedForReview: flagged },
      { new: true },
    ).lean();
    if (!question) throw new RpcException(new NotFoundException('Question not found'));
    return question;
  }

  // ── PRIVATE HELPERS ────────────────────────────────────────────────────────

  private async saveVersion(
    question: QuestionDocument,
    userId: string,
    status: string,
    changedFields: string[] = [],
  ) {
    const snapshot = question.toObject ? question.toObject() : question;
    await this.versionModel.create({
      questionId: question._id,
      version: question.currentVersion,
      snapshot,
      changedFields,
      savedBy: new Types.ObjectId(userId),
      status,
    });
  }

  private validateForPublish(question: QuestionDocument) {
    if (!question.body?.trim()) {
      throw new RpcException(new ConflictException('Question body is required'));
    }
    if (question.type === 'mcq-single' || question.type === 'mcq-multiple') {
      const hasCorrect = question.options?.some((o) => o.isCorrect);
      if (!hasCorrect) {
        throw new RpcException(new ConflictException('MCQ question must have at least one correct option'));
      }
    }
    if (question.type === 'programming') {
      if (!question.testCases?.length) {
        throw new RpcException(new ConflictException('Programming question must have at least one test case'));
      }
      const totalWeight = question.testCases.reduce((sum, tc) => sum + tc.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new RpcException(new ConflictException('Test case weights must sum to 100'));
      }
    }
  }

  private parseCsv(content: string): any[] {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map((line) => {
      const values = line.split(',');
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => (obj[h.trim()] = values[i]?.trim() ?? ''));
      if (obj.tags) obj.tags = obj.tags.split('|').filter(Boolean);
      if (obj.marks) obj.marks = parseFloat(obj.marks);
      return obj;
    });
  }
}
