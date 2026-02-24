import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    return this.userModel.create(data);
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
}
