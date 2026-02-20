import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MONITOR_SERVICE } from '@app/shared';
import { MonitorGateway } from './monitor.gateway';
import { MonitorHttpController } from './monitor.http.controller';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../guards/roles.guard';

@Module({
  imports: [
    AuthModule,
    ClientsModule.registerAsync([
      {
        name: MONITOR_SERVICE,
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
  controllers: [MonitorHttpController],
  providers: [MonitorGateway, RolesGuard],
})
export class MonitorModule {}
