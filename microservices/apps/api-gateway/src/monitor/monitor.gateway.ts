import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { MONITOR_SERVICE, MONITOR_PATTERNS, WS_EVENTS } from '@app/shared';

// In-memory store: examId → Map<candidateId, { socketId, lastFrame }>
const examFrames = new Map<string, Map<string, string>>();

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  namespace: '/monitor',
})
export class MonitorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(MonitorGateway.name);

  // socket.id → { role, examId, candidateId, candidateName }
  private readonly socketMeta = new Map<string, Record<string, string>>();

  constructor(
    @Inject(MONITOR_SERVICE) private readonly monitorClient: ClientProxy,
  ) {}

  // ── LIFECYCLE ──────────────────────────────────────────────────────────────

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const meta = this.socketMeta.get(client.id);
    if (meta?.role === 'candidate' && meta.examId && meta.candidateId) {
      await firstValueFrom(
        this.monitorClient.send(MONITOR_PATTERNS.UPDATE_STATUS, {
          examId: meta.examId,
          candidateId: meta.candidateId,
          status: 'disconnected',
        }),
      ).catch(() => {});

      this.server.to(`exam:${meta.examId}`).emit(WS_EVENTS.CANDIDATE_UPDATE, {
        candidateId: meta.candidateId,
        status: 'disconnected',
      });
    }
    this.socketMeta.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── PROCTOR EVENTS ─────────────────────────────────────────────────────────

  @SubscribeMessage(WS_EVENTS.PROCTOR_JOIN)
  async handleProctorJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string },
  ) {
    client.join(`exam:${data.examId}`);
    client.join(`proctor:${data.examId}`);
    this.socketMeta.set(client.id, { role: 'proctor', examId: data.examId });

    // Send current session list to this proctor
    const sessions = await firstValueFrom(
      this.monitorClient.send(MONITOR_PATTERNS.GET_SESSIONS, { examId: data.examId }),
    ).catch(() => []);

    // Attach latest frames
    const frameMap = examFrames.get(data.examId);
    const sessionsWithFrames = sessions.map((s: any) => ({
      ...s,
      lastFrame: frameMap?.get(String(s.candidateId)) ?? null,
    }));

    client.emit(WS_EVENTS.SESSION_LIST, sessionsWithFrames);
    this.logger.log(`Proctor joined exam room: ${data.examId}`);
  }

  @SubscribeMessage(WS_EVENTS.SEND_MESSAGE)
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; candidateId: string; message: string },
  ) {
    this.server.to(`candidate:${data.candidateId}`).emit(WS_EVENTS.MESSAGE_RECEIVED, {
      message: data.message,
    });
  }

  @SubscribeMessage(WS_EVENTS.SEND_WARNING)
  async handleSendWarning(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; candidateId: string; candidateName: string },
  ) {
    await firstValueFrom(
      this.monitorClient.send(MONITOR_PATTERNS.LOG_WARNING, data),
    ).catch(() => {});

    this.server.to(`candidate:${data.candidateId}`).emit(WS_EVENTS.WARNING_RECEIVED, {
      message: 'A formal warning has been issued by the proctor.',
    });

    this.server.to(`exam:${data.examId}`).emit(WS_EVENTS.CANDIDATE_UPDATE, {
      candidateId: data.candidateId,
      warningIssued: true,
    });
  }

  @SubscribeMessage(WS_EVENTS.BROADCAST)
  handleBroadcast(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; message: string },
  ) {
    // Send to all candidates in the exam (not proctors)
    this.server.to(`exam:${data.examId}`).except(`proctor:${data.examId}`).emit(
      WS_EVENTS.MESSAGE_RECEIVED,
      { message: data.message, broadcast: true },
    );
  }

  @SubscribeMessage(WS_EVENTS.EXTEND_TIME)
  async handleExtendTime(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; candidateId: string; minutes: number },
  ) {
    const updated = await firstValueFrom(
      this.monitorClient.send(MONITOR_PATTERNS.EXTEND_TIME, data),
    ).catch(() => null);

    this.server.to(`candidate:${data.candidateId}`).emit(WS_EVENTS.TIME_EXTENDED, {
      extraMinutes: data.minutes,
    });

    if (updated) {
      this.server.to(`exam:${data.examId}`).emit(WS_EVENTS.CANDIDATE_UPDATE, {
        candidateId: data.candidateId,
        extraTimeMinutes: updated.extraTimeMinutes,
      });
    }
  }

  @SubscribeMessage(WS_EVENTS.TERMINATE)
  async handleTerminate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; candidateId: string },
  ) {
    await firstValueFrom(
      this.monitorClient.send(MONITOR_PATTERNS.TERMINATE, data),
    ).catch(() => {});

    this.server.to(`candidate:${data.candidateId}`).emit(WS_EVENTS.EXAM_TERMINATED, {
      reason: 'Your exam has been terminated by the proctor.',
    });

    this.server.to(`exam:${data.examId}`).emit(WS_EVENTS.CANDIDATE_UPDATE, {
      candidateId: data.candidateId,
      status: 'terminated',
    });
  }

  // ── CANDIDATE EVENTS ───────────────────────────────────────────────────────

  @SubscribeMessage(WS_EVENTS.CANDIDATE_JOIN)
  async handleCandidateJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      examId: string;
      candidateId: string;
      candidateName: string;
      candidateEmail: string;
      totalQuestions?: number;
      hasAccommodation?: boolean;
    },
  ) {
    client.join(`exam:${data.examId}`);
    client.join(`candidate:${data.candidateId}`);
    this.socketMeta.set(client.id, {
      role: 'candidate',
      examId: data.examId,
      candidateId: data.candidateId,
      candidateName: data.candidateName,
    });

    const session = await firstValueFrom(
      this.monitorClient.send(MONITOR_PATTERNS.UPSERT_SESSION, {
        ...data,
        socketId: client.id,
      }),
    ).catch(() => null);

    // Notify proctors
    this.server.to(`proctor:${data.examId}`).emit(WS_EVENTS.CANDIDATE_UPDATE, {
      ...session,
      lastFrame: null,
    });
  }

  @SubscribeMessage(WS_EVENTS.CANDIDATE_FRAME)
  handleCandidateFrame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; candidateId: string; frame: string },
  ) {
    // Store latest frame in memory (not persisted — just for live view)
    if (!examFrames.has(data.examId)) {
      examFrames.set(data.examId, new Map());
    }
    examFrames.get(data.examId).set(data.candidateId, data.frame);

    // Push frame to proctors watching this exam
    this.server.to(`proctor:${data.examId}`).emit(WS_EVENTS.FRAME_UPDATE, {
      candidateId: data.candidateId,
      frame: data.frame,
    });
  }

  @SubscribeMessage(WS_EVENTS.CANDIDATE_PROGRESS)
  async handleCandidateProgress(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; candidateId: string; questionsAnswered: number },
  ) {
    const updated = await firstValueFrom(
      this.monitorClient.send(MONITOR_PATTERNS.UPDATE_PROGRESS, data),
    ).catch(() => null);

    if (updated) {
      this.server.to(`proctor:${data.examId}`).emit(WS_EVENTS.CANDIDATE_UPDATE, {
        candidateId: data.candidateId,
        questionsAnswered: updated.questionsAnswered,
        status: 'active',
      });
    }
  }

  @SubscribeMessage(WS_EVENTS.CANDIDATE_LEAVE)
  async handleCandidateLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; candidateId: string },
  ) {
    await firstValueFrom(
      this.monitorClient.send(MONITOR_PATTERNS.UPDATE_STATUS, {
        ...data,
        status: 'submitted',
      }),
    ).catch(() => {});

    this.server.to(`proctor:${data.examId}`).emit(WS_EVENTS.CANDIDATE_UPDATE, {
      candidateId: data.candidateId,
      status: 'submitted',
    });
  }

  // ── VIOLATION REPORTING (called via HTTP from candidate app) ───────────────
  // Exposed as a method so MonitorController (HTTP) can call it

  async emitViolation(examId: string, violationData: any) {
    const violation = await firstValueFrom(
      this.monitorClient.send(MONITOR_PATTERNS.LOG_VIOLATION, { examId, ...violationData }),
    ).catch(() => null);

    if (violation) {
      this.server.to(`proctor:${examId}`).emit(WS_EVENTS.VIOLATION_EVENT, violation);
      this.server.to(`proctor:${examId}`).emit(WS_EVENTS.CANDIDATE_UPDATE, {
        candidateId: violationData.candidateId,
        violationCount: true, // signal to increment
        severity: violationData.severity,
      });
    }
    return violation;
  }
}
