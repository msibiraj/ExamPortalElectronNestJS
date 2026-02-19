import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExamScheduleDocument = ExamSchedule & Document;

@Schema({ timestamps: true })
export class ExamSchedule {
  @Prop({ type: Types.ObjectId, required: true }) paperId: Types.ObjectId;
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ required: true }) scheduledAt: Date;
  @Prop({ required: true }) durationMinutes: number;
  @Prop({ type: [Types.ObjectId], default: [] }) enrolledStudents: Types.ObjectId[];
  @Prop({
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled',
  })
  status: string;

  @Prop({
    type: { lateJoinWindowMinutes: Number, autoSubmit: Boolean },
    default: { lateJoinWindowMinutes: 10, autoSubmit: true },
  })
  settings: { lateJoinWindowMinutes: number; autoSubmit: boolean };

  @Prop({ type: Types.ObjectId, required: true }) createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const ExamScheduleSchema = SchemaFactory.createForClass(ExamSchedule);
ExamScheduleSchema.index({ status: 1, scheduledAt: 1 });
ExamScheduleSchema.index({ enrolledStudents: 1, status: 1 });
