import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CandidateSession, CandidateSessionDocument } from './schemas/candidate-session.schema';
import { ViolationLog, ViolationLogDocument } from './schemas/violation-log.schema';

@Injectable()
export class MonitorService {
  constructor(
    @InjectModel(CandidateSession.name)
    private readonly sessionModel: Model<CandidateSessionDocument>,
    @InjectModel(ViolationLog.name)
    private readonly violationModel: Model<ViolationLogDocument>,
  ) {}

  // ── SESSIONS ──────────────────────────────────────────────────────────────

  async upsertSession(data: {
    examId: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    organizationId?: string;
    totalQuestions?: number;
    hasAccommodation?: boolean;
    socketId?: string;
  }) {
    const { examId, candidateId, organizationId, ...rest } = data;
    return this.sessionModel
      .findOneAndUpdate(
        {
          examId: new Types.ObjectId(examId),
          candidateId: new Types.ObjectId(candidateId),
        },
        {
          $set: { ...rest, status: 'active', startedAt: new Date().toISOString() },
          $setOnInsert: {
            examId: new Types.ObjectId(examId),
            candidateId: new Types.ObjectId(candidateId),
            ...(organizationId ? { organizationId: new Types.ObjectId(organizationId) } : {}),
            violationCount: 0,
            highestSeverity: 'none',
          },
        },
        { upsert: true, new: true },
      )
      .lean();
  }

  async getSessions(examId: string) {
    return this.sessionModel
      .find({ examId: new Types.ObjectId(examId) })
      .sort({ candidateName: 1 })
      .lean();
  }

  async updateStatus(examId: string, candidateId: string, status: string) {
    return this.sessionModel
      .findOneAndUpdate(
        {
          examId: new Types.ObjectId(examId),
          candidateId: new Types.ObjectId(candidateId),
        },
        { $set: { status } },
        { new: true },
      )
      .lean();
  }

  async updateProgress(examId: string, candidateId: string, questionsAnswered: number) {
    return this.sessionModel
      .findOneAndUpdate(
        {
          examId: new Types.ObjectId(examId),
          candidateId: new Types.ObjectId(candidateId),
        },
        { $set: { questionsAnswered } },
        { new: true },
      )
      .lean();
  }

  // ── VIOLATIONS ────────────────────────────────────────────────────────────

  async logViolation(data: {
    examId: string;
    candidateId: string;
    candidateName: string;
    organizationId?: string;
    type: string;
    severity: 'low' | 'medium' | 'high';
    description?: string;
    frameSnapshot?: string;
  }) {
    const { examId, candidateId, organizationId, ...rest } = data;

    const violation = await this.violationModel.create({
      examId: new Types.ObjectId(examId),
      candidateId: new Types.ObjectId(candidateId),
      ...(organizationId ? { organizationId: new Types.ObjectId(organizationId) } : {}),
      ...rest,
    });

    await this.sessionModel.findOneAndUpdate(
      {
        examId: new Types.ObjectId(examId),
        candidateId: new Types.ObjectId(candidateId),
      },
      {
        $inc: { violationCount: 1 },
      },
    );

    const lowerSeverities: Record<string, string[]> = {
      low: ['none'],
      medium: ['none', 'low'],
      high: ['none', 'low', 'medium'],
    };
    const lower = lowerSeverities[data.severity];
    if (lower) {
      await this.sessionModel.findOneAndUpdate(
        {
          examId: new Types.ObjectId(examId),
          candidateId: new Types.ObjectId(candidateId),
          highestSeverity: { $in: lower },
        },
        { $set: { highestSeverity: data.severity } },
      );
    }

    return violation.toObject();
  }

  async getViolations(examId: string, limit = 100) {
    return this.violationModel
      .find({ examId: new Types.ObjectId(examId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async getCandidateViolations(examId: string, candidateId: string) {
    return this.violationModel
      .find({
        examId: new Types.ObjectId(examId),
        candidateId: new Types.ObjectId(candidateId),
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  // ── PROCTOR ACTIONS ───────────────────────────────────────────────────────

  async extendTime(examId: string, candidateId: string, minutes: number) {
    return this.sessionModel
      .findOneAndUpdate(
        {
          examId: new Types.ObjectId(examId),
          candidateId: new Types.ObjectId(candidateId),
        },
        { $inc: { extraTimeMinutes: minutes } },
        { new: true },
      )
      .lean();
  }

  async terminate(examId: string, candidateId: string) {
    return this.sessionModel
      .findOneAndUpdate(
        {
          examId: new Types.ObjectId(examId),
          candidateId: new Types.ObjectId(candidateId),
        },
        { $set: { status: 'terminated' } },
        { new: true },
      )
      .lean();
  }

  async logWarning(examId: string, candidateId: string, candidateName: string, organizationId?: string) {
    return this.logViolation({
      examId,
      candidateId,
      candidateName,
      organizationId,
      type: 'proctor-warning',
      severity: 'medium',
      description: 'Formal warning issued by proctor',
    });
  }
}
