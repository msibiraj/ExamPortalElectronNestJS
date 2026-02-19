import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AUTH_PATTERNS,
  SignupDto,
  LoginDto,
  RefreshTokenDto,
} from '@app/shared';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @MessagePattern(AUTH_PATTERNS.LIST_USERS)
  listUsers() {
    return this.authService.listUsers();
  }

  @MessagePattern(AUTH_PATTERNS.UPDATE_USER)
  updateUser(@Payload() data: { userId: string; name?: string; role?: string }) {
    return this.authService.updateUser(data.userId, { name: data.name, role: data.role });
  }

  @MessagePattern(AUTH_PATTERNS.DELETE_USER)
  deleteUser(@Payload() data: { userId: string }) {
    return this.authService.deleteUser(data.userId);
  }
}
