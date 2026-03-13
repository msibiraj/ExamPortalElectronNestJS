import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as mammoth from 'mammoth';
import { DocumentChunk, DocumentChunkDocument, TopicChunk } from './schemas/document-chunk.schema';

// Max characters to send to Gemini for topic detection (free tier safe)
const MAX_CHARS = 40000;

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private genAI: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    @InjectModel(DocumentChunk.name, 'ai_db')
    private documentModel: Model<DocumentChunkDocument>,
  ) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY'),
    );
  }

  // ─── Text Extraction ─────────────────────────────────────────────────────────

  private async extractPdf(buffer: Buffer): Promise<string> {
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const data = await pdfParse(buffer);
    return data.text;
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  async extractText(buffer: Buffer, mimetype: string): Promise<string> {
    if (mimetype === 'application/pdf') {
      return this.extractPdf(buffer);
    }
    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      return this.extractDocx(buffer);
    }
    throw new BadRequestException('Unsupported file type. Please upload a PDF or DOCX file.');
  }

  // ─── Topic Detection ─────────────────────────────────────────────────────────

  private async detectTopics(text: string): Promise<TopicChunk[]> {
    const truncated = text.slice(0, MAX_CHARS);

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are analyzing a document to extract its main topics for an exam question generation system.

Read the following document content and identify the main topics or sections (maximum 12 topics).

For each topic:
1. Give it a clear, concise name (e.g. "Recursion", "OOP Inheritance", "SQL Joins")
2. Extract ALL the relevant content from the document that belongs to this topic
3. Generate a short preview (first sentence or key concept, max 120 characters)

Return ONLY a valid JSON object, no markdown, no explanation:
{
  "topics": [
    {
      "id": "topic_1",
      "name": "Topic Name Here",
      "content": "Full extracted content for this topic from the document...",
      "preview": "Short preview text..."
    }
  ]
}

DOCUMENT CONTENT:
${truncated}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

    const parsed = JSON.parse(raw);
    return parsed.topics as TopicChunk[];
  }

  // ─── Main Upload Handler ─────────────────────────────────────────────────────

  async processDocument(
    buffer: Buffer,
    mimetype: string,
    filename: string,
    userId: string,
    organizationId: string,
  ) {
    // Extract raw text
    const text = await this.extractText(buffer, mimetype);

    if (!text || text.trim().length < 100) {
      throw new BadRequestException('Document appears to be empty or could not be parsed.');
    }

    // Use Gemini to detect topics
    const topics = await this.detectTopics(text);

    if (!topics?.length) {
      throw new BadRequestException('Could not detect topics from this document.');
    }

    // Store in MongoDB
    const doc = await this.documentModel.create({
      organizationId,
      userId,
      filename,
      topics,
    });

    this.logger.log(`Document processed: ${filename} → ${topics.length} topics`);

    return {
      documentId: (doc._id as any).toString(),
      filename,
      topics: topics.map((t) => ({
        id: t.id,
        name: t.name,
        preview: t.preview,
      })),
    };
  }

  // ─── Get Topic Content for RAG ────────────────────────────────────────────────

  async getTopicContent(documentId: string, topicId: string): Promise<string | null> {
    const doc = await this.documentModel.findById(documentId);
    if (!doc) return null;
    const topic = doc.topics.find((t) => t.id === topicId);
    return topic?.content || null;
  }
}
