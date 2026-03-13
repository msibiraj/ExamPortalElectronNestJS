import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUESTION_SERVICE } from '@app/shared';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AuthModule } from '../auth/auth.module';
import { QuestionEmbedding, QuestionEmbeddingSchema } from './schemas/question-embedding.schema';

const AI_DB_CONNECTION = 'ai_db';

@Module({
  imports: [
    AuthModule,
    // Dedicated MongoDB connection for AI embeddings storage
    MongooseModule.forRootAsync({
      connectionName: AI_DB_CONNECTION,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature(
      [{ name: QuestionEmbedding.name, schema: QuestionEmbeddingSchema }],
      AI_DB_CONNECTION,
    ),
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
  providers: [AiService],
})
export class AiModule {}
