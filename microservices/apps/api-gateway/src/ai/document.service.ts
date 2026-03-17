import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import { DocumentChunk, DocumentChunkDocument, TopicChunk } from './schemas/document-chunk.schema';
import { QdrantService } from './qdrant.service';

const MIN_CHUNK_CHARS = 100;
const MAX_CHUNK_CHARS = 1500;

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private genAI: GoogleGenAI;

  constructor(
    private configService: ConfigService,
    @InjectModel(DocumentChunk.name, 'ai_db')
    private documentModel: Model<DocumentChunkDocument>,
    private qdrantService: QdrantService,
  ) {
    this.genAI = new GoogleGenAI({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
    });
  }

  // ─── Embedding ────────────────────────────────────────────────────────────────

  async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.genAI.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text.slice(0, 8000),
      config: { outputDimensionality: 768 },
    });
    const values = result.embeddings?.[0]?.values;
    this.logger.debug(`Embedding dimensions: ${values?.length}`);
    if (!values?.length) throw new Error('Gemini returned empty embedding');
    return values;
  }

  // ─── Semantic Search via Qdrant ───────────────────────────────────────────────

  async searchSimilarTopics(query: string, documentId: string | null, topK = 3, organizationId?: string): Promise<TopicChunk[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const results = documentId
        ? await this.qdrantService.searchSimilar(queryEmbedding, documentId, topK)
        : organizationId
          ? await this.qdrantService.searchSimilarByOrg(queryEmbedding, organizationId, topK + 2)
          : [];
      return results.map((r) => ({
        id: r.chunkId,
        name: r.name,
        content: r.content,
        preview: r.content.slice(0, 120),
      }));
    } catch (err) {
      this.logger.error(`searchSimilarTopics failed: ${err.message}`);
      return [];
    }
  }

  // ─── Text Extraction ─────────────────────────────────────────────────────────

  private async extractPdf(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text;
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

  // ─── Paragraph Chunking (free, no API) ───────────────────────────────────────

  private splitIntoChunks(text: string): TopicChunk[] {
    // Split on double newlines OR single newlines followed by a capital letter / number (PDF paragraph breaks)
    const paragraphs = text
      .split(/\n{2,}|\n(?=[A-Z0-9])/)
      .map((p) => p.replace(/\n+/g, ' ').trim())
      .filter((p) => p.length >= MIN_CHUNK_CHARS);

    const chunks: TopicChunk[] = [];
    let buffer = '';
    let index = 1;

    for (const para of paragraphs) {
      if (buffer.length + para.length > MAX_CHUNK_CHARS && buffer.length >= MIN_CHUNK_CHARS) {
        chunks.push({
          id: `chunk_${index++}`,
          name: `Chunk ${index - 1}`,
          content: buffer.trim(),
          preview: buffer.trim().slice(0, 120),
        });
        buffer = '';
      }
      buffer += (buffer ? ' ' : '') + para;
    }

    if (buffer.trim().length >= MIN_CHUNK_CHARS) {
      chunks.push({
        id: `chunk_${index}`,
        name: `Chunk ${index}`,
        content: buffer.trim(),
        preview: buffer.trim().slice(0, 120),
      });
    }

    return chunks;
  }

  // ─── Main Upload Handler ─────────────────────────────────────────────────────

  async processDocument(
    buffer: Buffer,
    mimetype: string,
    filename: string,
    userId: string,
    organizationId: string,
  ) {
    const text = await this.extractText(buffer, mimetype);

    if (!text || text.trim().length < 100) {
      throw new BadRequestException('Document appears to be empty or could not be parsed.');
    }

    const chunks = this.splitIntoChunks(text);

    if (!chunks.length) {
      throw new BadRequestException('Could not extract content from this document.');
    }

    // Store metadata in MongoDB (no embeddings)
    const doc = await this.documentModel.create({
      organizationId,
      userId,
      filename,
      topics: chunks,
    });

    const documentId = (doc._id as any).toString();

    // Generate embeddings and upsert to Qdrant
    const qdrantChunks: { embedding: number[]; payload: any }[] = [];
    await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const embedding = await this.generateEmbedding(chunk.content);
          qdrantChunks.push({
            embedding,
            payload: {
              documentId,
              chunkId: chunk.id,
              name: chunk.name,
              content: chunk.content,
              organizationId,
            },
          });
        } catch (err) {
          this.logger.warn(`Embedding failed for ${chunk.id}: ${err.message}`);
        }
      }),
    );

    if (qdrantChunks.length) {
      await this.qdrantService.upsertChunks(qdrantChunks);
    }

    this.logger.log(`Document processed: ${filename} → ${chunks.length} chunks → ${qdrantChunks.length} indexed in Qdrant`);

    return {
      documentId,
      filename,
      chunkCount: chunks.length,
    };
  }
}
