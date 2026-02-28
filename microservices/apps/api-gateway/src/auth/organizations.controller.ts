import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Headers,
  Param,
  HttpCode,
  HttpStatus,
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

  private checkPlatformKey(platformKey: string) {
    const expected = this.configService.get<string>('PLATFORM_KEY');
    if (!expected || platformKey !== expected) {
      throw new UnauthorizedException('Invalid platform key');
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new organization (requires x-platform-key header)' })
  async create(
    @Headers('x-platform-key') platformKey: string,
    @Body() body: { name: string; code: string },
  ) {
    this.checkPlatformKey(platformKey);
    return this.orgsService.create(body.name, body.code);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations (requires x-platform-key header)' })
  async list(@Headers('x-platform-key') platformKey: string) {
    this.checkPlatformKey(platformKey);
    return this.orgsService.list();
  }

  @Get(':orgId/users')
  @ApiOperation({ summary: 'List all users in an organization (requires x-platform-key header)' })
  async listOrgUsers(
    @Headers('x-platform-key') platformKey: string,
    @Param('orgId') orgId: string,
  ) {
    this.checkPlatformKey(platformKey);
    return this.orgsService.listOrgUsers(orgId);
  }

  @Patch(':orgId/users/:userId/permissions')
  @ApiOperation({ summary: 'Set admin permissions for a user (requires x-platform-key header)' })
  async setPermissions(
    @Headers('x-platform-key') platformKey: string,
    @Param('userId') userId: string,
    @Body() body: { permissions: string[] },
  ) {
    this.checkPlatformKey(platformKey);
    return this.orgsService.setUserPermissions(userId, body.permissions);
  }

  @Delete(':orgId/users/:userId/permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user permissions to unrestricted (requires x-platform-key header)' })
  async resetPermissions(
    @Headers('x-platform-key') platformKey: string,
    @Param('userId') userId: string,
  ) {
    this.checkPlatformKey(platformKey);
    return this.orgsService.setUserPermissions(userId, null);
  }
}
