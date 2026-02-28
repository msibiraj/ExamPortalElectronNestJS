import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AUTH_PATTERNS,
  ORG_PATTERNS,
  SignupDto,
  LoginDto,
  RefreshTokenDto,
} from '@app/shared';
import { AuthService } from './auth.service';
import { InvitesService } from '../invites/invites.service';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly invitesService: InvitesService,
  ) {}

  @MessagePattern(AUTH_PATTERNS.SIGNUP)
  signup(@Payload() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH_TOKEN)
  refreshToken(@Payload() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @MessagePattern(AUTH_PATTERNS.VERIFY_TOKEN)
  verifyToken(@Payload() data: { token: string }) {
    return this.authService.verifyAccessToken(data.token);
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  logout(@Payload() data: { userId: string; refreshToken: string }) {
    return this.authService.logout(data.userId, data.refreshToken);
  }

  @MessagePattern(AUTH_PATTERNS.GET_USER)
  getUser(@Payload() data: { userId: string }) {
    return this.authService.getUserById(data.userId);
  }

  @MessagePattern(AUTH_PATTERNS.CREATE_USER)
  createUser(@Payload() data: { name: string; email: string; password: string; role?: string; organizationId: string }) {
    return this.authService.createUser(data);
  }

  @MessagePattern(AUTH_PATTERNS.LIST_USERS)
  listUsers(@Payload() data: { organizationId: string }) {
    return this.authService.listUsers(data.organizationId);
  }

  @MessagePattern(AUTH_PATTERNS.UPDATE_USER)
  updateUser(@Payload() data: { userId: string; name?: string; role?: string }) {
    return this.authService.updateUser(data.userId, { name: data.name, role: data.role });
  }

  @MessagePattern(AUTH_PATTERNS.DELETE_USER)
  deleteUser(@Payload() data: { userId: string }) {
    return this.authService.deleteUser(data.userId);
  }

  @MessagePattern(ORG_PATTERNS.CREATE)
  createOrganization(@Payload() data: { name: string; code: string }) {
    return this.authService.createOrganization(data.name, data.code);
  }

  @MessagePattern(ORG_PATTERNS.FIND_BY_CODE)
  findOrganizationByCode(@Payload() data: { code: string }) {
    return this.authService.findOrganizationByCode(data.code);
  }

  @MessagePattern(ORG_PATTERNS.LIST)
  listOrganizations() {
    return this.authService.listOrganizations();
  }

  @MessagePattern(AUTH_PATTERNS.INVITE_CREATE)
  createInvite(@Payload() data: { orgId: string; role: string; createdBy: string }) {
    return this.invitesService.createInvite(data.orgId, data.role, data.createdBy);
  }

  @MessagePattern(AUTH_PATTERNS.INVITE_GET)
  getInvite(@Payload() data: { token: string }) {
    return this.invitesService.getInvite(data.token);
  }

  @MessagePattern(AUTH_PATTERNS.INVITE_REDEEM)
  redeemInvite(@Payload() data: { token: string; name: string; email: string; password: string }) {
    return this.invitesService.redeemInvite(data.token, data.name, data.email, data.password);
  }
}
