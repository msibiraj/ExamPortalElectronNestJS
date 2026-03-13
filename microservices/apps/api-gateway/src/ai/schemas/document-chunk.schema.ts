import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DocumentChunkDocument = DocumentChunk & Document;

export interface TopicChunk {
  id: string;
  name: string;
  content: string;   // full text of this topic section
  preview: string;   // first 150 chars shown in UI
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
