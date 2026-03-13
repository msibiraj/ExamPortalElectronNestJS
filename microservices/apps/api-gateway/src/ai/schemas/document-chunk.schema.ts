import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DocumentChunkDocument = DocumentChunk & Document;

export interface TopicChunk {
  id: string;
  name: string;
  content: string;
  preview: string;
  // embeddings are stored in Qdrant, not MongoDB
}

@Schema({ timestamps: true })
export class DocumentChunk {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ type: [{ id: String, name: String, content: String, preview: String }], default: [] })
  topics: TopicChunk[];
}

export const DocumentChunkSchema = SchemaFactory.createForClass(DocumentChunk);
