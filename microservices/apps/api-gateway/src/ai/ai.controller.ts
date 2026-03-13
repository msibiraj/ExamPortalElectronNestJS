import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserRole } from '@app/shared';

class ChatMessageDto {
  message: string;
  history: { role: string; parts: { text: string }[] }[];
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI to generate exam questions (RAG-powered)' })
  chat(@Body() dto: ChatMessageDto, @CurrentUser() user: any) {
    return this.aiService.chat(
      dto.message,
      dto.history || [],
      user.id,
      user.organizationId,
    );
  }

  @Post('reindex')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Force re-embed all questions into the vector index' })
  reindex(@CurrentUser() user: any) {
    return this.aiService.reindex(user.id, user.organizationId);
  }
}
