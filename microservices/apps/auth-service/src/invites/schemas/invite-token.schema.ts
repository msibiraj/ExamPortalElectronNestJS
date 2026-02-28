import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InviteTokenDocument = InviteToken & Document;

@Schema({ timestamps: true })
export class InviteToken {
  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({ required: true, type: Types.ObjectId })
  organizationId: Types.ObjectId;

  @Prop({ required: true, enum: ['student', 'proctor'] })
  role: string;

  @Prop({ required: true, type: Types.ObjectId })
  createdBy: Types.ObjectId;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop()
  usedAt?: Date;
}

export const InviteTokenSchema = SchemaFactory.createForClass(InviteToken);
