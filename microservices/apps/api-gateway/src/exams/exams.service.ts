import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { EXAM_SERVICE, EXAM_PATTERNS } from '@app/shared';

@Injectable()
export class ExamsService {
  constructor(@Inject(EXAM_SERVICE) private readonly client: ClientProxy) {}

  private send<T = any>(pattern: any, payload: any): Promise<T> {
    return firstValueFrom(this.client.send<T>(pattern, payload));
  }

  // ── Paper ──
  createPaper(dto: any, userId: string)           { return this.send(EXAM_PATTERNS.PAPER_CREATE,   { dto, userId }); }
  findAllPapers(userId: string)                    { return this.send(EXAM_PATTERNS.PAPER_FIND_ALL, { userId }); }
  findOnePaper(id: string)                         { return this.send(EXAM_PATTERNS.PAPER_FIND_ONE, { id }); }
  updatePaper(id: string, dto: any, userId: string){ return this.send(EXAM_PATTERNS.PAPER_UPDATE,   { id, dto, userId }); }
  publishPaper(id: string)                         { return this.send(EXAM_PATTERNS.PAPER_PUBLISH,  { id }); }
  deletePaper(id: string)                          { return this.send(EXAM_PATTERNS.PAPER_DELETE,   { id }); }

  // ── Schedule ──
  createSchedule(dto: any, userId: string)         { return this.send(EXAM_PATTERNS.SCHEDULE_CREATE,   { dto, userId }); }
  findAllSchedules(userId: string)                 { return this.send(EXAM_PATTERNS.SCHEDULE_FIND_ALL, { userId }); }
  findOneSchedule(id: string)                      { return this.send(EXAM_PATTERNS.SCHEDULE_FIND_ONE, { id }); }
  updateSchedule(id: string, dto: any)             { return this.send(EXAM_PATTERNS.SCHEDULE_UPDATE,   { id, dto }); }
  activateSchedule(id: string)                     { return this.send(EXAM_PATTERNS.SCHEDULE_ACTIVATE, { id }); }
  completeSchedule(id: string)                     { return this.send(EXAM_PATTERNS.SCHEDULE_COMPLETE, { id }); }
  cancelSchedule(id: string)                       { return this.send(EXAM_PATTERNS.SCHEDULE_CANCEL,   { id }); }

  // ── Student ──
  getStudentExams(studentId: string)               { return this.send(EXAM_PATTERNS.STUDENT_EXAMS, { studentId }); }
  getStudentPaper(scheduleId: string, studentId: string) {
    return this.send(EXAM_PATTERNS.STUDENT_PAPER, { scheduleId, studentId });
  }

  // ── Attempt ──
  startAttempt(scheduleId: string, studentId: string)                    { return this.send(EXAM_PATTERNS.ATTEMPT_START,  { scheduleId, studentId }); }
  saveAnswer(scheduleId: string, studentId: string, answer: any)         { return this.send(EXAM_PATTERNS.ATTEMPT_SAVE,   { scheduleId, studentId, answer }); }
  submitAttempt(scheduleId: string, studentId: string, answers: any[])   { return this.send(EXAM_PATTERNS.ATTEMPT_SUBMIT, { scheduleId, studentId, answers }); }
  getAttempt(scheduleId: string, studentId: string)                      { return this.send(EXAM_PATTERNS.ATTEMPT_GET,    { scheduleId, studentId }); }
  listAttempts(scheduleId: string)                                        { return this.send(EXAM_PATTERNS.ATTEMPT_LIST,   { scheduleId }); }
}
