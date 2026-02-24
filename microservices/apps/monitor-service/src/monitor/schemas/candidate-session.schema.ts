import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CandidateSessionDocument = CandidateSession & Document;

@Schema({ timestamps: true })
export class CandidateSession {
  @Prop({ type: Types.ObjectId, required: true })
  examId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  candidateId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  organizationId?: Types.ObjectId;

  @Prop({ required: true })
  candidateName: string;

  @Prop({ required: true })
  candidateEmail: string;

  @Prop({
    required: true,
    enum: ['waiting', 'active', 'idle', 'submitted', 'disconnected', 'terminated'],
    default: 'waiting',
  })
  status: string;

  @Prop({ default: 0 })
  questionsAnswered: number;

  @Prop({ default: 0 })
  totalQuestions: number;

  @Prop({ default: 0 })
  violationCount: number;

  @Prop({ default: 'none', enum: ['none', 'low', 'medium', 'high'] })
  highestSeverity: string;

  // Extra time in minutes granted by proctor
  @Prop({ default: 0 })
  extraTimeMinutes: number;

  // ISO string of when candidate started their exam
  @Prop()
  startedAt?: string;

  // Accommodation flag
  @Prop({ default: false })
  hasAccommodation: boolean;

  // Socket ID of the connected candidate
  @Prop()
  socketId?: string;
}

export const CandidateSessionSchema = SchemaFactory.createForClass(CandidateSession);
CandidateSessionSchema.index({ examId: 1, candidateId: 1 }, { unique: true });
CandidateSessionSchema.index({ examId: 1, status: 1 });
