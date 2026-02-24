import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StudentAttemptDocument = StudentAttempt & Document;

@Schema({ _id: false })
class Answer {
  @Prop({ type: Types.ObjectId, required: true }) questionId: Types.ObjectId;
  @Prop({ required: true }) type: string; // mcq-single | mcq-multiple | descriptive | programming

  // MCQ
  @Prop({ type: [String] }) selectedOptions?: string[];

  // Descriptive
  @Prop() html?: string;

  // Programming
  @Prop() language?: string;
  @Prop() code?: string;

  @Prop({ type: Object }) lastRunResult?: Record<string, any>;

  // Grading
  @Prop() score?: number;
}
const AnswerSchema = SchemaFactory.createForClass(Answer);

@Schema({ timestamps: true })
export class StudentAttempt {
  @Prop({ type: Types.ObjectId, required: true }) examScheduleId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true }) studentId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true }) organizationId: Types.ObjectId;
  @Prop({ enum: ['in-progress', 'submitted', 'timed-out'], default: 'in-progress' }) status: string;
  @Prop() startedAt?: Date;
  @Prop() submittedAt?: Date;
  @Prop({ type: [AnswerSchema], default: [] }) answers: Answer[];
  @Prop() score?: number;
  @Prop() maxScore?: number;

  createdAt: Date;
  updatedAt: Date;
}

export const StudentAttemptSchema = SchemaFactory.createForClass(StudentAttempt);
StudentAttemptSchema.index({ examScheduleId: 1, studentId: 1 }, { unique: true });
StudentAttemptSchema.index({ studentId: 1, status: 1 });
