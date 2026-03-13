import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionEmbeddingDocument = QuestionEmbedding & Document;

@Schema({ timestamps: true })
export class QuestionEmbedding {
  // The _id of the question in the question-service
  @Prop({ required: true, unique: true, index: true })
  questionId: string;

  // Full question body stored here so we can inject it as RAG context
  @Prop({ required: true })
  body: string;

  @Prop({ required: true })
  topic: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  difficulty: string;

  // Correct answer text (for MCQ: correct option text; for others: explanation)
  @Prop({ default: '' })
  answer: string;

  // MD5 hash of body — used to detect if the question was edited
  @Prop({ required: true })
  bodyHash: string;

  // 768-dimension vector from Gemini text-embedding-004
  @Prop({ type: [Number], required: true })
  embedding: number[];
}

export const QuestionEmbeddingSchema = SchemaFactory.createForClass(QuestionEmbedding);
