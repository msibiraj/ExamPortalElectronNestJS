import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExamPaperDocument = ExamPaper & Document;

// ── Embedded: one question slot in a section ──────────────────────────────────
@Schema({ _id: false })
export class PaperQuestion {
  @Prop({ type: Types.ObjectId, required: true }) questionId: Types.ObjectId;
  @Prop({ required: true }) order: number;
  @Prop({ required: true }) marks: number;
}
const PaperQuestionSchema = SchemaFactory.createForClass(PaperQuestion);

// ── Embedded: section ─────────────────────────────────────────────────────────
@Schema({ _id: false })
export class PaperSection {
  @Prop({ required: true }) name: string;
  @Prop() instructions?: string;
  @Prop({ type: [PaperQuestionSchema], default: [] }) questions: PaperQuestion[];
}
const PaperSectionSchema = SchemaFactory.createForClass(PaperSection);

// ── Main schema ───────────────────────────────────────────────────────────────
@Schema({ timestamps: true })
export class ExamPaper {
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ trim: true }) description?: string;
  @Prop() instructions?: string;
  @Prop({ type: [PaperSectionSchema], default: [] }) sections: PaperSection[];
  @Prop({ default: 0 }) totalMarks: number;

  @Prop({
    type: {
      shuffleSections: Boolean,
      shuffleQuestions: Boolean,
      shuffleOptions: Boolean,
      showMarks: Boolean,
    },
    default: { shuffleSections: false, shuffleQuestions: false, shuffleOptions: false, showMarks: true },
  })
  settings: {
    shuffleSections: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showMarks: boolean;
  };

  @Prop({ enum: ['draft', 'published'], default: 'draft' }) status: string;
  @Prop({ type: Types.ObjectId, required: true }) createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const ExamPaperSchema = SchemaFactory.createForClass(ExamPaper);
ExamPaperSchema.index({ createdBy: 1, status: 1 });
