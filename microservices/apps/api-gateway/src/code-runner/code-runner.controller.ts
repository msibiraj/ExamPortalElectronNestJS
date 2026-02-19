import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { CodeRunnerService, RunCodeDto } from './code-runner.service';

@Controller('exam')
export class CodeRunnerController {
  constructor(private readonly codeRunnerService: CodeRunnerService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  run(@Body() dto: RunCodeDto) {
    return this.codeRunnerService.run(dto);
  }
}
