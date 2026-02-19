import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';

@Injectable()
export class TokensService {
  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async saveRefreshToken(
    userId: string,
    token: string,
  ): Promise<RefreshTokenDocument> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return this.refreshTokenModel.create({ userId, token, expiresAt });
  }

  async findRefreshToken(
    userId: string,
    token: string,
  ): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel.findOne({ userId, token }).exec();
  }

  async removeRefreshToken(userId: string, token: string): Promise<void> {
    await this.refreshTokenModel.deleteOne({ userId, token }).exec();
  }

  async removeAllRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokenModel.deleteMany({ userId }).exec();
  }
}
