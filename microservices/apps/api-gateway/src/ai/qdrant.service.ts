import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';

const COLLECTION_NAME = 'document_chunks1';
const VECTOR_SIZE = 768; // gemini-embedding-001 with outputDimensionality: 768

export interface ChunkPayload {
  documentId: string;
  chunkId: string;
  name: string;
  content: string;
  organizationId?: string;
  [key: string]: unknown;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;

  constructor(private configService: ConfigService) {
    this.client = new QdrantClient({
      url: this.configService.get<string>('QDRANT_URL'),
      apiKey: this.configService.get<string>('QDRANT_API_KEY'),
    });
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  private async ensureCollection() {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

      if (!exists) {
        await this.client.createCollection(COLLECTION_NAME, {
          vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
        this.logger.log(`Qdrant collection "${COLLECTION_NAME}" created`);
      }
    } catch (err) {
      this.logger.error(`Qdrant init failed: ${err.message}`);
    }
  }

  // ─── Upsert chunks for a document ────────────────────────────────────────────

  async upsertChunks(chunks: { embedding: number[]; payload: ChunkPayload }[]) {
    const points = chunks.map((chunk) => ({
      id: uuidv4(),
      vector: chunk.embedding,
      payload: chunk.payload,
    }));

    await this.client.upsert(COLLECTION_NAME, { points });
  }

  // ─── Search similar chunks by documentId ─────────────────────────────────────

  async searchSimilar(queryVector: number[], documentId: string, topK = 3): Promise<ChunkPayload[]> {
    const results = await this.client.query(COLLECTION_NAME, {
      query: queryVector,
      limit: topK,
      filter: {
        must: [{ key: 'documentId', match: { value: documentId } }],
      },
      with_payload: true,
    });

    return results.points.map((r) => r.payload as unknown as ChunkPayload);
  }

  // ─── Search similar chunks across all org documents ───────────────────────────

  async searchSimilarByOrg(queryVector: number[], organizationId: string, topK = 5): Promise<ChunkPayload[]> {
    this.logger.debug(`searchSimilarByOrg: orgId=${organizationId} topK=${topK} vectorLen=${queryVector?.length}`);
    const results = await this.client.query(COLLECTION_NAME, {
      query: queryVector,
      limit: topK * 4,
      with_payload: true,
    });

    return results.points
      .map((r) => r.payload as unknown as ChunkPayload)
      .filter((p) => !p.organizationId || p.organizationId === organizationId)
      .slice(0, topK);
  }

  // ─── Delete all chunks for a document ────────────────────────────────────────

  async deleteByDocumentId(documentId: string) {
    await this.client.delete(COLLECTION_NAME, {
      filter: {
        must: [{ key: 'documentId', match: { value: documentId } }],
      },
    });
  }
}
