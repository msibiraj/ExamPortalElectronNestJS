import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserRole } from '@app/shared';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: Object.values(UserRole), default: UserRole.PROCTOR })
  role: UserRole;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Organization', index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: [String], default: null })
  permissions: string[] | null;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
