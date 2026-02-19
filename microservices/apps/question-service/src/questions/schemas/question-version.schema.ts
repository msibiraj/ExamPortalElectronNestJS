import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QuestionVersionDocument = QuestionVersion & Document;

@Schema({ timestamps: true })
export class QuestionVersion {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true, index: true })
  questionId: Types.ObjectId;

  @Prop({ required: true })
  version: number;

  @Prop({ type: Object, required: true })
  snapshot: Record<string, any>;

  @Prop({ type: [String], default: [] })
  changedFields: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  savedBy: Types.ObjectId;

  @Prop({ required: true, enum: ['draft', 'published'] })
  status: string;
}

export const QuestionVersionSchema = SchemaFactory.createForClass(QuestionVersion);
QuestionVersionSchema.index({ questionId: 1, version: 1 }, { unique: true });
