import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  AUTH_SERVICE,
  AUTH_PATTERNS,
  ORG_PATTERNS,
  SignupDto,
  LoginDto,
  RefreshTokenDto,
  AdminCreateUserDto,
} from '@app/shared';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
  ) {}

  async signup(signupDto: SignupDto) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.SIGNUP, signupDto),
    );
  }

  async login(loginDto: LoginDto) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.LOGIN, loginDto),
    );
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.REFRESH_TOKEN, refreshTokenDto),
    );
  }

  async logout(userId: string, refreshToken: string) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.LOGOUT, { userId, refreshToken }),
    );
  }

  async getUser(userId: string) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.GET_USER, { userId }),
    );
  }

  async verifyToken(token: string) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.VERIFY_TOKEN, { token }),
    );
  }

  async createUser(dto: AdminCreateUserDto, organizationId: string) {
    // Fetch all orgs (already-running pattern) to resolve the admin's org code
    const orgs: any[] = await firstValueFrom(
      this.authClient.send(ORG_PATTERNS.LIST, {}).pipe(timeout(10_000)),
    );
    const org = orgs.find(
      (o) => (o._id ?? o.id)?.toString() === organizationId,
    );
    if (!org) throw new Error('Organization not found');

    // Reuse the existing SIGNUP pattern — no auth-service restart needed
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.SIGNUP, { ...dto, organizationCode: org.code }).pipe(timeout(10_000)),
    );
  }

  async listUsers(organizationId: string) {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.LIST_USERS, { organizationId }));
  }

  async updateUser(userId: string, data: { name?: string; role?: string }) {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.UPDATE_USER, { userId, ...data }));
  }

  async deleteUser(userId: string) {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.DELETE_USER, { userId }));
  }
}
