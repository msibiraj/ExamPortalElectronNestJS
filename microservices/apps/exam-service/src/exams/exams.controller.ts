import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ExamsService } from './exams.service';
import { EXAM_PATTERNS } from '@app/shared';

@Controller()
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // ── PAPER ──────────────────────────────────────────────────────────────────

  @MessagePattern(EXAM_PATTERNS.PAPER_CREATE)
  createPaper(@Payload() p: { dto: any; userId: string; organizationId: string }) {
    return this.examsService.createPaper(p.dto, p.userId, p.organizationId);
  }

  @MessagePattern(EXAM_PATTERNS.PAPER_FIND_ALL)
  findAllPapers(@Payload() p: { userId: string; organizationId: string }) {
    return this.examsService.findAllPapers(p.userId, p.organizationId);
  }

  @MessagePattern(EXAM_PATTERNS.PAPER_FIND_ONE)
  findOnePaper(@Payload() p: { id: string }) {
    return this.examsService.findOnePaper(p.id);
  }

  @MessagePattern(EXAM_PATTERNS.PAPER_UPDATE)
  updatePaper(@Payload() p: { id: string; dto: any; userId: string }) {
    return this.examsService.updatePaper(p.id, p.dto, p.userId);
  }

  @MessagePattern(EXAM_PATTERNS.PAPER_PUBLISH)
  publishPaper(@Payload() p: { id: string }) {
    return this.examsService.publishPaper(p.id);
  }

  @MessagePattern(EXAM_PATTERNS.PAPER_DELETE)
  deletePaper(@Payload() p: { id: string }) {
    return this.examsService.deletePaper(p.id);
  }

  // ── SCHEDULE ───────────────────────────────────────────────────────────────

  @MessagePattern(EXAM_PATTERNS.SCHEDULE_CREATE)
  createSchedule(@Payload() p: { dto: any; userId: string; organizationId: string }) {
    return this.examsService.createSchedule(p.dto, p.userId, p.organizationId);
  }

  @MessagePattern(EXAM_PATTERNS.SCHEDULE_FIND_ALL)
  findAllSchedules(@Payload() p: { userId: string; organizationId: string }) {
    return this.examsService.findAllSchedules(p.userId, p.organizationId);
  }

  @MessagePattern(EXAM_PATTERNS.SCHEDULE_FIND_ONE)
  findOneSchedule(@Payload() p: { id: string }) {
    return this.examsService.findOneSchedule(p.id);
  }

  @MessagePattern(EXAM_PATTERNS.SCHEDULE_UPDATE)
  updateSchedule(@Payload() p: { id: string; dto: any }) {
    return this.examsService.updateSchedule(p.id, p.dto);
  }

  @MessagePattern(EXAM_PATTERNS.SCHEDULE_COMPLETE)
  completeSchedule(@Payload() p: { id: string }) {
    return this.examsService.completeSchedule(p.id);
  }

  @MessagePattern(EXAM_PATTERNS.SCHEDULE_CANCEL)
  cancelSchedule(@Payload() p: { id: string }) {
    return this.examsService.cancelSchedule(p.id);
  }

  // ── STUDENT ────────────────────────────────────────────────────────────────

  @MessagePattern(EXAM_PATTERNS.STUDENT_EXAMS)
  getStudentExams(@Payload() p: { studentId: string; organizationId: string }): Promise<any[]> {
    return this.examsService.getStudentExams(p.studentId, p.organizationId);
  }

  @MessagePattern(EXAM_PATTERNS.STUDENT_PAPER)
  getStudentPaper(@Payload() p: { scheduleId: string; studentId: string }) {
    return this.examsService.getStudentPaper(p.scheduleId, p.studentId);
  }

  // ── ATTEMPT ────────────────────────────────────────────────────────────────

  @MessagePattern(EXAM_PATTERNS.ATTEMPT_START)
  startAttempt(@Payload() p: { scheduleId: string; studentId: string; organizationId: string }) {
    return this.examsService.startAttempt(p.scheduleId, p.studentId, p.organizationId);
  }

  @MessagePattern(EXAM_PATTERNS.ATTEMPT_SAVE)
  saveAnswer(@Payload() p: { scheduleId: string; studentId: string; answer: any }) {
    return this.examsService.saveAnswer(p.scheduleId, p.studentId, p.answer);
  }

  @MessagePattern(EXAM_PATTERNS.ATTEMPT_SUBMIT)
  submitAttempt(@Payload() p: { scheduleId: string; studentId: string; answers: any[] }) {
    return this.examsService.submitAttempt(p.scheduleId, p.studentId, p.answers);
  }

  @MessagePattern(EXAM_PATTERNS.ATTEMPT_GET)
  getAttempt(@Payload() p: { scheduleId: string; studentId: string }) {
    return this.examsService.getAttempt(p.scheduleId, p.studentId);
  }

  @MessagePattern(EXAM_PATTERNS.ATTEMPT_LIST)
  listAttempts(@Payload() p: { scheduleId: string }) {
    return this.examsService.listAttempts(p.scheduleId);
  }

  @MessagePattern(EXAM_PATTERNS.ATTEMPT_GET_DETAILS)
  getAttemptDetails(@Payload() p: { scheduleId: string; studentId: string }): Promise<any> {
    return this.examsService.getAttemptDetails(p.scheduleId, p.studentId);
  }

  @MessagePattern(EXAM_PATTERNS.ATTEMPT_GRADE)
  gradeAttempt(@Payload() p: { attemptId: string; scores: { questionId: string; score: number }[] }) {
    return this.examsService.gradeAttempt(p.attemptId, p.scores);
  }
}
