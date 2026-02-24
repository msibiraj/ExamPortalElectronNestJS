import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { OrganizationsService } from './organizations.service';

/**
 * Platform-level endpoints for managing organizations.
 * Protected by a PLATFORM_KEY header instead of JWT so server admins
 * can create orgs before any users exist.
 */
@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly orgsService: OrganizationsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization (requires x-platform-key header)' })
  async create(
    @Headers('x-platform-key') platformKey: string,
    @Body() body: { name: string; code: string },
  ) {
    const expected = this.configService.get<string>('PLATFORM_KEY');
    if (!expected || platformKey !== expected) {
      throw new UnauthorizedException('Invalid platform key');
    }
    return this.orgsService.create(body.name, body.code);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations (requires x-platform-key header)' })
  async list(@Headers('x-platform-key') platformKey: string) {
    const expected = this.configService.get<string>('PLATFORM_KEY');
    if (!expected || platformKey !== expected) {
      throw new UnauthorizedException('Invalid platform key');
    }
    return this.orgsService.list();
  }
}
