import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { Roles } from '../decorators/roles.decorator';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { MONITOR_SERVICE, MONITOR_PATTERNS, UserRole, AdminPermission } from '@app/shared';
import { MonitorGateway } from './monitor.gateway';

@ApiTags('Monitor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN, UserRole.PROCTOR)
@Controller('monitor')
export class MonitorHttpController {
  constructor(
    @Inject(MONITOR_SERVICE) private readonly monitorClient: ClientProxy,
    private readonly monitorGateway: MonitorGateway,
  ) {}

  @Get(':examId/sessions')
  @RequirePermissions(AdminPermission.VIEW_REPORTS)
  @ApiOperation({ summary: 'Get all candidate sessions for an exam' })
  getSessions(@Param('examId') examId: string) {
    return firstValueFrom(
      this.monitorClient.send(MONITOR_PATTERNS.GET_SESSIONS, { examId }),
    );
  }

  @Get(':examId/violations')
  @RequirePermissions(AdminPermission.VIEW_REPORTS)
  @ApiOperation({ summary: 'Get violation feed for an exam' })
  getViolations(
    @Param('examId') examId: string,
    @Query('limit') limit?: number,
  ) {
    return firstValueFrom(
      this.monitorClient.send(MONITOR_PATTERNS.GET_VIOLATIONS, { examId, limit }),
    );
  }

  @Get(':examId/violations/:candidateId')
  @RequirePermissions(AdminPermission.VIEW_REPORTS)
  @ApiOperation({ summary: 'Get violations for a specific candidate' })
  getCandidateViolations(
    @Param('examId') examId: string,
    @Param('candidateId') candidateId: string,
  ) {
    return firstValueFrom(
      this.monitorClient.send(MONITOR_PATTERNS.GET_CANDIDATE_VIOLATIONS, { examId, candidateId }),
    );
  }

  @Post(':examId/violation')
  @Roles(UserRole.ADMIN, UserRole.PROCTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'Report a violation from candidate app' })
  async reportViolation(
    @Param('examId') examId: string,
    @CurrentUser() user: any,
    @Body() body: {
      candidateId: string;
      candidateName: string;
      type: string;
      severity: 'low' | 'medium' | 'high';
      description?: string;
      frameSnapshot?: string;
    },
  ) {
    return this.monitorGateway.emitViolation(examId, { ...body, organizationId: user.organizationId });
  }

  @Post(':examId/candidates/:candidateId/extend-time')
  @RequirePermissions(AdminPermission.MANAGE_PROCTORING)
  @ApiOperation({ summary: 'Extend time for a candidate (live)' })
  extendTime(
    @Param('examId') examId: string,
    @Param('candidateId') candidateId: string,
    @Body() body: { minutes: number },
  ) {
    return firstValueFrom(
      this.monitorClient.send(MONITOR_PATTERNS.EXTEND_TIME, {
        examId,
        candidateId,
        minutes: body.minutes,
      }),
    );
  }

  @Post(':examId/candidates/:candidateId/terminate')
  @RequirePermissions(AdminPermission.MANAGE_PROCTORING)
  @ApiOperation({ summary: 'Terminate a candidate exam' })
  terminate(
    @Param('examId') examId: string,
    @Param('candidateId') candidateId: string,
  ) {
    return firstValueFrom(
      this.monitorClient.send(MONITOR_PATTERNS.TERMINATE, { examId, candidateId }),
    );
  }
}
