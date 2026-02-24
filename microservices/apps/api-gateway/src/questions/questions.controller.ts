import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionFilterDto,
  BulkTagDto,
  ImportQuestionsDto,
  RestoreVersionDto,
  FlagReviewDto,
  UserRole,
} from '@app/shared';

@ApiTags('Questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.PROCTOR)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new question (saves as draft)' })
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: any) {
    return this.questionsService.create(dto, user.id, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List all questions with optional filters' })
  findAll(@Query() filter: QuestionFilterDto, @CurrentUser() user: any) {
    return this.questionsService.findAll(filter, user.id, user.organizationId);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export question list as CSV' })
  async exportCsv(@CurrentUser() user: any, @Res() res: Response) {
    const result = await this.questionsService.exportCsv(user.id, user.organizationId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=questions.csv');
    res.send(result.csv);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROCTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get a single question by ID' })
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a question (creates a new version)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: any,
  ) {
    return this.questionsService.update(id, dto, user.id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a question (makes it available for templates)' })
  publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.questionsService.publish(id, user.id);
  }

  @Post(':id/draft')
  @ApiOperation({ summary: 'Move question back to draft status' })
  saveDraft(@Param('id') id: string, @CurrentUser() user: any) {
    return this.questionsService.saveDraft(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a question (soft delete)' })
  archive(@Param('id') id: string) {
    return this.questionsService.archive(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a question as a new draft' })
  duplicate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.questionsService.duplicate(id, user.id);
  }

  @Post('bulk-tag')
  @ApiOperation({ summary: 'Add tags to multiple questions at once' })
  bulkTag(@Body() dto: BulkTagDto) {
    return this.questionsService.bulkTag(dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import questions from CSV/Moodle XML/QTI file content' })
  importQuestions(@Body() dto: ImportQuestionsDto, @CurrentUser() user: any) {
    return this.questionsService.importQuestions(dto, user.id, user.organizationId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get version history of a question' })
  getHistory(@Param('id') id: string) {
    return this.questionsService.getHistory(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a prior version of a question' })
  restoreVersion(
    @Param('id') id: string,
    @Body() dto: RestoreVersionDto,
    @CurrentUser() user: any,
  ) {
    return this.questionsService.restoreVersion(id, dto, user.id);
  }

  @Post(':id/flag')
  @ApiOperation({ summary: 'Flag or unflag a question for review' })
  flagReview(@Param('id') id: string, @Body() dto: FlagReviewDto) {
    return this.questionsService.flagReview(id, dto.flagged);
  }

  @Delete(':id/flag')
  @ApiOperation({ summary: 'Clear the review flag on a question' })
  clearFlag(@Param('id') id: string) {
    return this.questionsService.clearFlag(id);
  }
}
