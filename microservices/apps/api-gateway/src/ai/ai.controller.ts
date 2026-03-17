import {
  Controller,
  Post,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional } from 'class-validator';
import { AiService } from './ai.service';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

class ChatMessageDto {
  @IsString()
  message: string;

  @IsArray()
  history: { role: string; parts: { text: string }[] }[];

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  topicId?: string;
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly documentService: DocumentService,
  ) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI — works with or without an uploaded document' })
  chat(@Body() dto: ChatMessageDto, @CurrentUser() user: any) {
    return this.aiService.chat(
      dto.message,
      dto.history || [],
      user.id,
      user.organizationId,
      dto.documentId,
    );
  }

  @Post('upload-document')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a PDF or DOCX — extracts content and detects topics' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded.');

    return this.documentService.processDocument(
      file.buffer,
      file.mimetype,
      file.originalname,
      user.id,
      user.organizationId,
    );
  }
}
