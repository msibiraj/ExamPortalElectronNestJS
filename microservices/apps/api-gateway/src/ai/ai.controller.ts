import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

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
  @ApiOperation({ summary: 'Chat with AI to generate exam questions' })
  chat(@Body() dto: ChatMessageDto, @CurrentUser() user: any) {
    return this.aiService.chat(
      dto.message,
      dto.history || [],
      user.id,
      user.organizationId,
    );
  }
}
