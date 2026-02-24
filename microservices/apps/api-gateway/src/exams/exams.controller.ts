import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserRole } from '@app/shared';

// ── Proctor / Admin routes (/exam-papers, /exam-schedules) ───────────────────

@ApiTags('Exam Papers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exam-papers')
export class ExamPapersController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROCTOR)
  @ApiOperation({ summary: 'Create exam paper (draft)' })
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.examsService.createPaper(dto, user.id, user.organizationId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROCTOR)
  findAll(@CurrentUser() user: any) {
    return this.examsService.findAllPapers(user.id, user.organizationId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROCTOR)
  findOne(@Param('id') id: string) {
    return this.examsService.findOnePaper(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.PROCTOR)
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.examsService.updatePaper(id, dto, user.id);
  }

  @Post(':id/publish')
  @Roles(UserRole.ADMIN, UserRole.PROCTOR)
  publish(@Param('id') id: string) {
    return this.examsService.publishPaper(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROCTOR)
  remove(@Param('id') id: string) {
    return this.examsService.deletePaper(id);
  }
}

// ── Exam schedule routes (/exam-schedules) ───────────────────────────────────

@ApiTags('Exam Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exam-schedules')
export class ExamSchedulesController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROCTOR)
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.examsService.createSchedule(dto, user.id, user.organizationId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROCTOR)
  findAll(@CurrentUser() user: any) {
    return this.examsService.findAllSchedules(user.id, user.organizationId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROCTOR)
  findOne(@Param('id') id: string) {
    return this.examsService.findOneSchedule(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.PROCTOR)
  update(@Param('id') id: string, @Body() dto: any) {
    return this.examsService.updateSchedule(id, dto);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.PROCTOR)
  complete(@Param('id') id: string) {
    return this.examsService.completeSchedule(id);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.PROCTOR)
  cancel(@Param('id') id: string) {
    return this.examsService.cancelSchedule(id);
  }

  @Get(':id/attempts')
  @Roles(UserRole.ADMIN, UserRole.PROCTOR)
  listAttempts(@Param('id') id: string) {
    return this.examsService.listAttempts(id);
  }
}

// ── Student exam routes (/student/exams) ─────────────────────────────────────

@ApiTags('Student Exams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('student/exams')
export class StudentExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get exams assigned to the logged-in student' })
  getMyExams(@CurrentUser() user: any) {
    return this.examsService.getStudentExams(user.id, user.organizationId);
  }

  @Get(':id/paper')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get exam paper for an active exam' })
  getPaper(@Param('id') id: string, @CurrentUser() user: any) {
    return this.examsService.getStudentPaper(id, user.id);
  }

  @Post(':id/start')
  @Roles(UserRole.STUDENT)
  start(@Param('id') id: string, @CurrentUser() user: any) {
    return this.examsService.startAttempt(id, user.id, user.organizationId);
  }

  @Post(':id/answer')
  @Roles(UserRole.STUDENT)
  saveAnswer(@Param('id') id: string, @CurrentUser() user: any, @Body() answer: any) {
    return this.examsService.saveAnswer(id, user.id, answer);
  }

  @Post(':id/submit')
  @Roles(UserRole.STUDENT)
  submit(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { answers: any[] }) {
    return this.examsService.submitAttempt(id, user.id, body.answers || []);
  }

  @Get(':id/attempt')
  @Roles(UserRole.STUDENT)
  getAttempt(@Param('id') id: string, @CurrentUser() user: any) {
    return this.examsService.getAttempt(id, user.id);
  }
}
