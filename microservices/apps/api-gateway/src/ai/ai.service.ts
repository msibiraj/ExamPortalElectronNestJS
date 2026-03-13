import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as crypto from 'crypto';
import { QUESTION_SERVICE, QUESTION_PATTERNS } from '@app/shared';
import { QuestionEmbedding, QuestionEmbeddingDocument } from './schemas/question-embedding.schema';

// How many un-indexed questions to embed per chat request (lazy indexing)
const LAZY_BATCH_SIZE = 15;

// How many similar questions to retrieve as RAG context
const TOP_K = 5;

const SYSTEM_PROMPT = `You are an AI assistant for an exam portal that helps create high-quality exam questions.

You help instructors generate questions by having a friendly conversation. You ask clarifying questions when needed and make suggestions.

QUESTION TYPES available:
- mcq-single: Multiple choice, one correct answer (provide 4 options)
- mcq-multiple: Multiple choice, multiple correct answers (provide 4 options)
- descriptive: Short/long answer (no options needed)
- programming: Coding question (include problem statement with sample input/output in body)

DIFFICULTY LEVELS: easy, medium, hard

RESPONSE FORMAT (STRICT - always return valid JSON, no markdown):
{
  "message": "your conversational reply here",
  "questions": null
}

When generating questions, populate the questions array:
{
  "message": "Here are the questions I generated:",
  "questions": [
    {
      "type": "mcq-single",
      "topic": "React Hooks",
      "difficulty": "medium",
      "marks": 2,
      "body": "Question text here",
      "tags": ["react", "hooks"],
      "explanation": "Why this answer is correct",
      "options": [
        { "text": "Option A", "isCorrect": true },
        { "text": "Option B", "isCorrect": false },
        { "text": "Option C", "isCorrect": false },
        { "text": "Option D", "isCorrect": false }
      ]
    }
  ]
}

For descriptive/programming questions, omit the options field.

BEHAVIOR:
- Start by greeting and asking what topic and type of questions they need
- Suggest subtopics based on the existing question bank context provided
- When similar questions are provided in context, DO NOT duplicate them — generate meaningfully different questions
- Keep questions clear, unambiguous, and educationally sound
- When generating, always produce the exact count requested`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    @Inject(QUESTION_SERVICE) private questionClient: ClientProxy,
    @InjectModel(QuestionEmbedding.name, 'ai_db')
    private embeddingModel: Model<QuestionEmbeddingDocument>,
  ) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY'),
    );
  }

  // ─── Embedding Helpers ──────────────────────────────────────────────────────

  private async embedText(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  private md5(text: string): string {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  // ─── Lazy Indexing ──────────────────────────────────────────────────────────

  /**
   * Embeds up to LAZY_BATCH_SIZE questions that are not yet indexed (or changed).
   * Runs silently — does not block the chat response if it fails.
   */
  private async lazyIndex(questions: any[]): Promise<void> {
    try {
      const questionIds = questions.map((q) => q._id.toString());
      const existing = await this.embeddingModel.find(
        { questionId: { $in: questionIds } },
        { questionId: 1, bodyHash: 1 },
      );

      const existingMap = new Map(existing.map((e) => [e.questionId, e.bodyHash]));

      // Find questions that are missing or have been updated
      const toIndex = questions
        .filter((q) => {
          const hash = this.md5(q.body || '');
          return existingMap.get(q._id.toString()) !== hash;
        })
        .slice(0, LAZY_BATCH_SIZE);

      if (toIndex.length === 0) return;

      this.logger.log(`Lazy indexing ${toIndex.length} questions...`);

      for (const q of toIndex) {
        try {
          const textToEmbed = `${q.topic} ${q.type} ${q.difficulty} ${q.body}`;
          const embedding = await this.embedText(textToEmbed);
          const bodyHash = this.md5(q.body || '');

          // Extract a readable answer for context injection
          const answer = this.extractAnswer(q);

          await this.embeddingModel.findOneAndUpdate(
            { questionId: q._id.toString() },
            {
              questionId: q._id.toString(),
              body: q.body,
              topic: q.topic,
              type: q.type,
              difficulty: q.difficulty,
              answer,
              bodyHash,
              embedding,
            },
            { upsert: true, new: true },
          );
        } catch (err) {
          this.logger.warn(`Failed to embed question ${q._id}: ${err.message}`);
        }
      }

      this.logger.log(`Indexed ${toIndex.length} questions.`);
    } catch (err) {
      this.logger.warn(`lazyIndex failed: ${err.message}`);
    }
  }

  private extractAnswer(q: any): string {
    if (q.options?.length) {
      const correct = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.text);
      return correct.join(', ');
    }
    return q.explanation || q.markingRubric || '';
  }

  // ─── Semantic Search ────────────────────────────────────────────────────────

  private async semanticSearch(queryEmbedding: number[], topK: number) {
    const all = await this.embeddingModel.find({}, { embedding: 1, body: 1, topic: 1, type: 1, difficulty: 1, answer: 1 });

    const scored = all
      .map((doc) => ({
        doc,
        score: this.cosineSimilarity(queryEmbedding, doc.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.map((s) => s.doc);
  }

  // ─── Build RAG Context ──────────────────────────────────────────────────────

  private buildRagContext(similar: QuestionEmbeddingDocument[]): string {
    if (!similar.length) return '';

    const lines = similar.map(
      (q, i) =>
        `${i + 1}. [${q.type} | ${q.topic} | ${q.difficulty}]\n   Q: ${q.body}${q.answer ? `\n   A: ${q.answer}` : ''}`,
    );

    return `\n\nSIMILAR QUESTIONS ALREADY IN THE BANK (do NOT duplicate — generate meaningfully different ones, but match this style and depth):\n${lines.join('\n\n')}`;
  }

  // ─── Full Reindex ───────────────────────────────────────────────────────────

  async reindex(userId: string, organizationId: string): Promise<{ indexed: number; failed: number }> {
    const questions: any[] = await firstValueFrom(
      this.questionClient.send(QUESTION_PATTERNS.FIND_ALL, {
        filter: {},
        userId,
        organizationId,
      }),
    );

    await this.embeddingModel.deleteMany({});

    let indexed = 0;
    let failed = 0;

    for (const q of questions) {
      try {
        const textToEmbed = `${q.topic} ${q.type} ${q.difficulty} ${q.body}`;
        const embedding = await this.embedText(textToEmbed);
        await this.embeddingModel.create({
          questionId: q._id.toString(),
          body: q.body,
          topic: q.topic,
          type: q.type,
          difficulty: q.difficulty,
          answer: this.extractAnswer(q),
          bodyHash: this.md5(q.body || ''),
          embedding,
        });
        indexed++;
      } catch {
        failed++;
      }
    }

    this.logger.log(`Reindex complete: ${indexed} indexed, ${failed} failed`);
    return { indexed, failed };
  }

  // ─── Main Chat ──────────────────────────────────────────────────────────────

  async chat(
    message: string,
    history: { role: string; parts: { text: string }[] }[],
    userId: string,
    organizationId: string,
  ) {
    // 1. Fetch all questions from the question bank
    let questions: any[] = [];
    try {
      questions = await firstValueFrom(
        this.questionClient.send(QUESTION_PATTERNS.FIND_ALL, {
          filter: {},
          userId,
          organizationId,
        }),
      );
    } catch {
      // proceed without question bank context
    }

    // 2. Lazy index new/updated questions (non-blocking, runs in background)
    if (questions.length > 0) {
      this.lazyIndex(questions).catch(() => {});
    }

    // 3. Embed the user's message
    let ragContext = '';
    try {
      const queryEmbedding = await this.embedText(message);
      const similar = await this.semanticSearch(queryEmbedding, TOP_K);
      ragContext = this.buildRagContext(similar);
    } catch (err) {
      this.logger.warn(`RAG retrieval failed: ${err.message}`);
    }

    // 4. Build topic distribution summary for additional context
    let topicSummary = '';
    if (questions.length > 0) {
      const topicCounts: Record<string, number> = {};
      questions.forEach((q) => {
        topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
      });
      const topicList = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([t, c]) => `${t} (${c})`)
        .join(', ');
      topicSummary = `\n\nQUESTION BANK STATS: ${questions.length} total questions. Topics: ${topicList}`;
    }

    // 5. Chat with Gemini using RAG context in system prompt
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT + topicSummary + ragContext,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const rawText = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps the JSON
    const jsonText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

    try {
      const parsed = JSON.parse(jsonText);
      return {
        message: parsed.message || '',
        questions: parsed.questions || null,
      };
    } catch {
      return { message: rawText, questions: null };
    }
  }
}
