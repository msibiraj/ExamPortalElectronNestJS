import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, AdminCreateUserDto } from '@app/shared';
import { AuthService } from './auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('Admin — Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user in this organization (admin only)' })
  createUser(
    @CurrentUser() user: any,
    @Body() dto: AdminCreateUserDto,
  ) {
    return this.authService.createUser(dto, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List all users in this organization (admin only)' })
  listUsers(@CurrentUser() user: any) {
    return this.authService.listUsers(user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user name or role (admin only)' })
  updateUser(
    @Param('id') id: string,
    @Body() body: { name?: string; role?: string },
  ) {
    return this.authService.updateUser(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  deleteUser(@Param('id') id: string) {
    return this.authService.deleteUser(id);
  }
}
