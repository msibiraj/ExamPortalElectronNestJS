import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AUTH_SERVICE } from '@app/shared';
import { AuthController } from './auth.controller';
import { AdminUsersController } from './admin-users.controller';
import { AuthService } from './auth.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { InvitesController } from './invites.controller';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('REDISHOST') || configService.get<string>('REDIS_HOST', 'localhost'),
            port: parseInt(configService.get<string>('REDISPORT') || configService.get<string>('REDIS_PORT', '6379'), 10),
            password: configService.get<string>('REDISPASSWORD') || configService.get<string>('REDIS_PASSWORD') || undefined,
            username: configService.get<string>('REDISUSER') || configService.get<string>('REDIS_USERNAME') || undefined,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AuthController, AdminUsersController, OrganizationsController, InvitesController],
  providers: [AuthService, OrganizationsService, JwtAuthGuard, RolesGuard, PermissionsGuard],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard, ClientsModule],
})
export class AuthModule {}
