import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QuestionDocument = Question & Document;

@Schema()
export class McqOption {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true, default: false })
  isCorrect: boolean;
}

@Schema()
export class TestCase {
  @Prop({ required: true })
  input: string;

  @Prop({ required: true })
  expectedOutput: string;

  @Prop({ required: true, default: 0 })
  weight: number;

  @Prop({ required: true, default: false })
  isHidden: boolean;
}

@Schema({ timestamps: true })
export class Question {
  @Prop({
    required: true,
    enum: ['mcq-single', 'mcq-multiple', 'descriptive', 'programming'],
  })
  type: string;

  @Prop({ required: true })
  topic: string;

  @Prop({ required: true, enum: ['easy', 'medium', 'hard'] })
  difficulty: string;

  @Prop({ required: true, default: 1 })
  marks: number;

  @Prop({ required: true })
  body: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  explanation?: string;

  @Prop({ required: true, enum: ['draft', 'published', 'archived'], default: 'draft' })
  status: string;

  @Prop({ required: true, default: 1 })
  currentVersion: number;

  @Prop({ default: false })
  flaggedForReview: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  // MCQ fields
  @Prop({ type: [{ text: String, isCorrect: Boolean }], default: [] })
  options: McqOption[];

  @Prop({ default: false })
  shuffleOptions?: boolean;

  // Descriptive fields
  @Prop()
  markingRubric?: string;

  @Prop()
  minWords?: number;

  @Prop()
  maxWords?: number;

  // Programming fields
  @Prop({ type: [String], default: [] })
  allowedLanguages?: string[];

  @Prop({ type: Map, of: Number })
  timeLimits?: Map<string, number>;

  @Prop({ default: 256 })
  memoryLimit?: number;

  @Prop({ type: Map, of: String })
  starterCode?: Map<string, string>;

  @Prop({ type: [{ input: String, expectedOutput: String, weight: Number, isHidden: Boolean }], default: [] })
  testCases?: TestCase[];

  @Prop()
  referenceLanguage?: string;

  @Prop()
  referenceSolution?: string;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
QuestionSchema.index({ topic: 1, status: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ type: 1, difficulty: 1, status: 1 });
