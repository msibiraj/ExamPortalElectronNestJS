import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExamPaper, ExamPaperDocument } from './schemas/exam-paper.schema';
import { ExamSchedule, ExamScheduleDocument } from './schemas/exam-schedule.schema';
import { StudentAttempt, StudentAttemptDocument } from './schemas/student-attempt.schema';

@Injectable()
export class ExamsService {
  constructor(
    @InjectModel(ExamPaper.name)    private paperModel:   Model<ExamPaperDocument>,
    @InjectModel(ExamSchedule.name) private scheduleModel: Model<ExamScheduleDocument>,
    @InjectModel(StudentAttempt.name) private attemptModel: Model<StudentAttemptDocument>,
  ) {}

  // ── PAPER ──────────────────────────────────────────────────────────────────

  async createPaper(dto: any, userId: string) {
    const totalMarks = this.calcTotalMarks(dto.sections || []);
    const paper = await this.paperModel.create({
      ...dto,
      totalMarks,
      createdBy: new Types.ObjectId(userId),
      status: 'draft',
    });
    return paper.toObject();
  }

  async findAllPapers(userId: string) {
    return this.paperModel.find({ createdBy: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 }).lean();
  }

  async findOnePaper(id: string) {
    const paper = await this.paperModel.findById(id).lean();
    if (!paper) throw new RpcException(new NotFoundException('Exam paper not found'));
    return paper;
  }

  async updatePaper(id: string, dto: any, userId: string) {
    const paper = await this.paperModel.findById(id);
    if (!paper) throw new RpcException(new NotFoundException('Exam paper not found'));
    if (paper.status === 'published')
      throw new RpcException(new BadRequestException('Cannot edit a published paper. Duplicate it first.'));

    if (dto.sections) dto.totalMarks = this.calcTotalMarks(dto.sections);
    Object.assign(paper, dto);
    await paper.save();
    return paper.toObject();
  }

  async publishPaper(id: string) {
    const paper = await this.paperModel.findById(id);
    if (!paper) throw new RpcException(new NotFoundException('Exam paper not found'));
    if (!paper.sections.length || !paper.sections.some((s) => s.questions.length))
      throw new RpcException(new BadRequestException('Paper must have at least one question before publishing'));
    paper.status = 'published';
    await paper.save();
    return paper.toObject();
  }

  async deletePaper(id: string) {
    const paper = await this.paperModel.findByIdAndDelete(id);
    if (!paper) throw new RpcException(new NotFoundException('Exam paper not found'));
    return { deleted: true };
  }

  // ── SCHEDULE ───────────────────────────────────────────────────────────────

  async createSchedule(dto: any, userId: string) {
    const paper = await this.paperModel.findById(dto.paperId);
    if (!paper) throw new RpcException(new NotFoundException('Exam paper not found'));
    if (paper.status !== 'published')
      throw new RpcException(new BadRequestException('Only published papers can be scheduled'));

    const schedule = await this.scheduleModel.create({
      ...dto,
      paperId: new Types.ObjectId(dto.paperId),
      enrolledStudents: (dto.enrolledStudents || []).map((id: string) => new Types.ObjectId(id)),
      createdBy: new Types.ObjectId(userId),
      status: 'scheduled',
    });
    return schedule.toObject();
  }

  async findAllSchedules(userId: string) {
    return this.scheduleModel.find({ createdBy: new Types.ObjectId(userId) })
      .sort({ scheduledAt: -1 }).lean();
  }

  async findOneSchedule(id: string) {
    const schedule = await this.scheduleModel.findById(id).lean();
    if (!schedule) throw new RpcException(new NotFoundException('Exam schedule not found'));
    return schedule;
  }

  async updateSchedule(id: string, dto: any) {
    const schedule = await this.scheduleModel.findById(id);
    if (!schedule) throw new RpcException(new NotFoundException('Exam schedule not found'));
    if (['completed', 'cancelled'].includes(schedule.status))
      throw new RpcException(new BadRequestException(`Cannot modify a ${schedule.status} exam`));

    if (dto.enrolledStudents)
      dto.enrolledStudents = dto.enrolledStudents.map((id: string) => new Types.ObjectId(id));

    Object.assign(schedule, dto);
    await schedule.save();
    return schedule.toObject();
  }

  async activateSchedule(id: string) {
    return this.scheduleModel.findByIdAndUpdate(id, { status: 'active' }, { new: true }).lean();
  }

  async completeSchedule(id: string) {
    return this.scheduleModel.findByIdAndUpdate(id, { status: 'completed' }, { new: true }).lean();
  }

  async cancelSchedule(id: string) {
    return this.scheduleModel.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true }).lean();
  }

  // ── STUDENT ────────────────────────────────────────────────────────────────

  /** Exams a student is enrolled in */
  async getStudentExams(studentId: string): Promise<any[]> {
    const now = new Date();
    const schedules = await this.scheduleModel.find({
      enrolledStudents: new Types.ObjectId(studentId),
      status: { $in: ['scheduled', 'active'] },
    }).sort({ scheduledAt: 1 }).lean();

    return schedules.map((s) => ({
      ...s,
      isLive: s.status === 'active' || (s.status === 'scheduled' && new Date(s.scheduledAt) <= now),
    }));
  }

  /** Full paper with question details for an active exam */
  async getStudentPaper(scheduleId: string, studentId: string) {
    const schedule = await this.scheduleModel.findById(scheduleId).lean();
    if (!schedule) throw new RpcException(new NotFoundException('Exam not found'));

    const isEnrolled = schedule.enrolledStudents.some(
      (id) => id.toString() === studentId,
    );
    if (!isEnrolled) throw new RpcException(new ForbiddenException('You are not enrolled in this exam'));

    const paper = await this.paperModel.findById(schedule.paperId).lean();
    if (!paper) throw new RpcException(new NotFoundException('Paper not found'));

    return { schedule, paper };
  }

  // ── ATTEMPT ────────────────────────────────────────────────────────────────

  async startAttempt(scheduleId: string, studentId: string) {
    const existing = await this.attemptModel.findOne({
      examScheduleId: new Types.ObjectId(scheduleId),
      studentId: new Types.ObjectId(studentId),
    }).lean();
    if (existing) return existing; // resume

    const attempt = await this.attemptModel.create({
      examScheduleId: new Types.ObjectId(scheduleId),
      studentId: new Types.ObjectId(studentId),
      startedAt: new Date(),
      status: 'in-progress',
      answers: [],
    });
    return attempt.toObject();
  }

  async saveAnswer(scheduleId: string, studentId: string, answer: any) {
    const attempt = await this.attemptModel.findOne({
      examScheduleId: new Types.ObjectId(scheduleId),
      studentId: new Types.ObjectId(studentId),
      status: 'in-progress',
    });
    if (!attempt) throw new RpcException(new NotFoundException('Active attempt not found'));

    const qid = new Types.ObjectId(answer.questionId);
    const idx = attempt.answers.findIndex((a) => a.questionId.toString() === qid.toString());
    if (idx >= 0) {
      Object.assign(attempt.answers[idx], answer);
    } else {
      attempt.answers.push({ ...answer, questionId: qid });
    }
    attempt.markModified('answers');
    await attempt.save();
    return attempt.toObject();
  }

  async submitAttempt(scheduleId: string, studentId: string, finalAnswers: any[]) {
    const attempt = await this.attemptModel.findOne({
      examScheduleId: new Types.ObjectId(scheduleId),
      studentId: new Types.ObjectId(studentId),
    });
    if (!attempt) throw new RpcException(new NotFoundException('Attempt not found'));
    if (attempt.status !== 'in-progress')
      throw new RpcException(new BadRequestException('Attempt already submitted'));

    // Merge any last-minute answers
    if (finalAnswers?.length) {
      for (const answer of finalAnswers) {
        const qid = new Types.ObjectId(answer.questionId);
        const idx = attempt.answers.findIndex((a) => a.questionId.toString() === qid.toString());
        if (idx >= 0) Object.assign(attempt.answers[idx], answer);
        else attempt.answers.push({ ...answer, questionId: qid });
      }
    }
    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.markModified('answers');
    await attempt.save();
    return attempt.toObject();
  }

  async getAttempt(scheduleId: string, studentId: string) {
    return this.attemptModel.findOne({
      examScheduleId: new Types.ObjectId(scheduleId),
      studentId: new Types.ObjectId(studentId),
    }).lean();
  }

  async listAttempts(scheduleId: string) {
    return this.attemptModel.find({ examScheduleId: new Types.ObjectId(scheduleId) }).lean();
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  private calcTotalMarks(sections: any[]): number {
    return sections.reduce(
      (sum, s) => sum + (s.questions || []).reduce((acc: number, q: any) => acc + (q.marks || 0), 0),
      0,
    );
  }
}
