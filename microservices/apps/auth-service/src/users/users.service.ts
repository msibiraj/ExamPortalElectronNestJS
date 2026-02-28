import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(data: {
    email: string;
    password: string;
    name: string;
    organizationId: string;
    role?: string;
  }): Promise<UserDocument> {
    try {
      return await this.userModel.create(data);
    } catch (err) {
      if (err?.code === 11000) {
        throw new RpcException(new ConflictException('Email already exists'));
      }
      throw err;
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findAll(organizationId: string): Promise<UserDocument[]> {
    return this.userModel
      .find({ organizationId })
      .select('-password')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateUser(id: string, data: { name?: string; role?: string }): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, { $set: data }, { new: true }).select('-password').exec();
  }

  async deleteUser(id: string): Promise<void> {
    await this.userModel.findByIdAndDelete(id).exec();
  }

  async setPermissions(userId: string, permissions: string[] | null): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { $set: { permissions } }, { new: true })
      .select('-password')
      .exec();
  }
}
