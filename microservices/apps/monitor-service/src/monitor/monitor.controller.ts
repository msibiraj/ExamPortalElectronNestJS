import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MonitorService } from './monitor.service';
import { MONITOR_PATTERNS } from '@app/shared';

@Controller()
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @MessagePattern(MONITOR_PATTERNS.UPSERT_SESSION)
  upsertSession(@Payload() data: any) {
    return this.monitorService.upsertSession(data);
  }

  @MessagePattern(MONITOR_PATTERNS.GET_SESSIONS)
  getSessions(@Payload() payload: { examId: string }) {
    return this.monitorService.getSessions(payload.examId);
  }

  @MessagePattern(MONITOR_PATTERNS.UPDATE_STATUS)
  updateStatus(@Payload() payload: { examId: string; candidateId: string; status: string }) {
    return this.monitorService.updateStatus(payload.examId, payload.candidateId, payload.status);
  }

  @MessagePattern(MONITOR_PATTERNS.UPDATE_PROGRESS)
  updateProgress(@Payload() payload: { examId: string; candidateId: string; questionsAnswered: number }) {
    return this.monitorService.updateProgress(payload.examId, payload.candidateId, payload.questionsAnswered);
  }

  @MessagePattern(MONITOR_PATTERNS.LOG_VIOLATION)
  logViolation(@Payload() data: any) {
    return this.monitorService.logViolation(data);
  }

  @MessagePattern(MONITOR_PATTERNS.GET_VIOLATIONS)
  getViolations(@Payload() payload: { examId: string; limit?: number }) {
    return this.monitorService.getViolations(payload.examId, payload.limit);
  }

  @MessagePattern(MONITOR_PATTERNS.GET_CANDIDATE_VIOLATIONS)
  getCandidateViolations(@Payload() payload: { examId: string; candidateId: string }) {
    return this.monitorService.getCandidateViolations(payload.examId, payload.candidateId);
  }

  @MessagePattern(MONITOR_PATTERNS.EXTEND_TIME)
  extendTime(@Payload() payload: { examId: string; candidateId: string; minutes: number }) {
    return this.monitorService.extendTime(payload.examId, payload.candidateId, payload.minutes);
  }

  @MessagePattern(MONITOR_PATTERNS.TERMINATE)
  terminate(@Payload() payload: { examId: string; candidateId: string }) {
    return this.monitorService.terminate(payload.examId, payload.candidateId);
  }

  @MessagePattern(MONITOR_PATTERNS.LOG_WARNING)
  logWarning(@Payload() payload: { examId: string; candidateId: string; candidateName: string; organizationId: string }) {
    return this.monitorService.logWarning(payload.examId, payload.candidateId, payload.candidateName, payload.organizationId);
  }
}
