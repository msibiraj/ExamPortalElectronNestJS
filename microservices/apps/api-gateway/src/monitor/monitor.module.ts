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
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('MONITOR_SERVICE_HOST', 'localhost'),
            port: configService.get<number>('MONITOR_SERVICE_PORT', 4003),
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
