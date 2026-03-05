import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ViolationLogDocument = ViolationLog & Document;

@Schema({ timestamps: true })
export class ViolationLog {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  examId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  candidateId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true })
  candidateName: string;

  @Prop({ required: true })
  type: string; // e.g. 'tab-switch', 'face-not-visible', 'multiple-faces', 'camera-offline', 'devtools'

  @Prop({ required: true, enum: ['low', 'medium', 'high'] })
  severity: string;

  @Prop()
  description?: string;

  // S3 URL of the screenshot uploaded at the moment of violation
  @Prop()
  snapshotUrl?: string;
}

export const ViolationLogSchema = SchemaFactory.createForClass(ViolationLog);
ViolationLogSchema.index({ examId: 1, createdAt: -1 });
ViolationLogSchema.index({ examId: 1, candidateId: 1, createdAt: -1 });
