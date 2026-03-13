import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';
import { QUESTION_SERVICE } from '@app/shared';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DocumentService } from './document.service';
import { QdrantService } from './qdrant.service';
import { AuthModule } from '../auth/auth.module';
import { DocumentChunk, DocumentChunkSchema } from './schemas/document-chunk.schema';

const AI_DB_CONNECTION = 'ai_db';

@Module({
  imports: [
    AuthModule,
    // Dedicated MongoDB connection for AI document storage
    MongooseModule.forRootAsync({
      connectionName: AI_DB_CONNECTION,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature(
      [{ name: DocumentChunk.name, schema: DocumentChunkSchema }],
      AI_DB_CONNECTION,
    ),
    // File upload: store in memory, max 10MB
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
    ClientsModule.registerAsync([
      {
        name: QUESTION_SERVICE,
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
  controllers: [AiController],
  providers: [AiService, DocumentService, QdrantService],
})
export class AiModule {}
