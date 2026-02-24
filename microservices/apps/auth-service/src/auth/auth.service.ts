import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TokensService } from '../tokens/tokens.service';
import { RedisService } from '../redis/redis.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { SignupDto, LoginDto, RefreshTokenDto, IJwtPayload } from '@app/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
    private readonly redisService: RedisService,
    private readonly orgsService: OrganizationsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto) {
    const org = await this.orgsService.findByCode(signupDto.organizationCode);
    if (!org) {
      throw new RpcException(new BadRequestException('Invalid organization code'));
    }

    const existingUser = await this.usersService.findByEmail(signupDto.email);
    if (existingUser) {
      throw new RpcException(new ConflictException('Email already exists'));
    }

    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS', '12'), 10);
    const hashedPassword = await bcrypt.hash(signupDto.password, saltRounds);

    const user = await this.usersService.create({
      ...signupDto,
      password: hashedPassword,
      organizationId: org.id,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.organizationId.toString());
    await this.tokensService.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new RpcException(new UnauthorizedException('Invalid credentials'));
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new RpcException(new UnauthorizedException('Invalid credentials'));
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.organizationId.toString());
    await this.tokensService.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const isBlacklisted = await this.redisService.isTokenBlacklisted(refreshTokenDto.refreshToken);
      if (isBlacklisted) {
        throw new RpcException(new UnauthorizedException('Token has been revoked'));
      }

      const storedToken = await this.tokensService.findRefreshToken(payload.sub, refreshTokenDto.refreshToken);
      if (!storedToken) {
        throw new RpcException(new UnauthorizedException('Refresh token not found'));
      }

      await this.tokensService.removeRefreshToken(payload.sub, refreshTokenDto.refreshToken);
      await this.redisService.blacklistToken(refreshTokenDto.refreshToken, this.getRefreshTtlSeconds());

      const user = await this.usersService.findById(payload.sub);
      const tokens = await this.generateTokens(user.id, user.email, user.role, user.organizationId.toString());
      await this.tokensService.saveRefreshToken(user.id, tokens.refreshToken);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId },
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Refresh token error:', error);
      throw new RpcException(new UnauthorizedException('Invalid refresh token'));
    }
  }

  async verifyAccessToken(token: string) {
    try {
      const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new RpcException(new UnauthorizedException('Token has been revoked'));
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      return {
        id: payload.sub,
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        organizationId: payload.organizationId,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(new UnauthorizedException('Invalid token'));
    }
  }

  async logout(userId: string, refreshToken: string) {
    await this.redisService.blacklistToken(refreshToken, this.getRefreshTtlSeconds());
    await this.tokensService.removeAllRefreshTokens(userId);
    return { message: 'Logged out successfully' };
  }

  async getUserById(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new RpcException(new UnauthorizedException('User not found'));
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId };
  }

  async listUsers(organizationId: string) {
    const users = await this.usersService.findAll(organizationId);
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      organizationId: u.organizationId,
      createdAt: u.createdAt,
    }));
  }

  async updateUser(userId: string, data: { name?: string; role?: string }) {
    const user = await this.usersService.updateUser(userId, data);
    if (!user) throw new RpcException(new UnauthorizedException('User not found'));
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async deleteUser(userId: string) {
    await this.usersService.deleteUser(userId);
    return { message: 'User deleted' };
  }

  async createOrganization(name: string, code: string) {
    return this.orgsService.create(name, code);
  }

  async findOrganizationByCode(code: string) {
    return this.orgsService.findByCode(code);
  }

  async listOrganizations() {
    return this.orgsService.findAll();
  }

  private async generateTokens(userId: string, email: string, role: string, organizationId: string) {
    const accessPayload: IJwtPayload = {
      sub: userId,
      email,
      role: role as any,
      organizationId,
      type: 'access',
    };
    const refreshPayload: IJwtPayload = {
      sub: userId,
      email,
      role: role as any,
      organizationId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private getRefreshTtlSeconds(): number {
    return 7 * 24 * 60 * 60;
  }
}
