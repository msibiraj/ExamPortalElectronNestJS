import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { QUESTION_SERVICE, QUESTION_PATTERNS } from '@app/shared';
import { DocumentService } from './document.service';

const SYSTEM_PROMPT = `You are an AI assistant for an exam portal that helps create high-quality exam questions.

You help instructors generate questions through a friendly conversation. You ask clarifying questions when needed.

QUESTION TYPES available:
- mcq-single: Multiple choice, exactly ONE correct answer (always provide exactly 4 options)
- mcq-multiple: Multiple choice, MULTIPLE correct answers (always provide exactly 4 options)
- descriptive: Short/long answer — no options needed
- programming: Coding problem — include clear problem statement with sample input/output in the body

DIFFICULTY LEVELS: easy, medium, hard

═══════════════════════════════════════════════════
RESPONSE FORMAT — always return a single valid JSON object, no markdown, no text outside JSON:
═══════════════════════════════════════════════════

For conversational replies (no generation):
{
  "message": "your reply here",
  "questions": null
}

For MCQ questions:
{
  "message": "Here are your questions:",
  "questions": [
    {
      "type": "mcq-single",
      "topic": "Topic Name",
      "difficulty": "medium",
      "marks": 2,
      "body": "Question text here?",
      "tags": ["tag1", "tag2"],
      "explanation": "Why the correct answer is correct",
      "options": [
        { "text": "Correct answer", "isCorrect": true },
        { "text": "Wrong option B", "isCorrect": false },
        { "text": "Wrong option C", "isCorrect": false },
        { "text": "Wrong option D", "isCorrect": false }
      ]
    }
  ]
}

For descriptive questions:
{
  "message": "Here are your questions:",
  "questions": [
    {
      "type": "descriptive",
      "topic": "Topic Name",
      "difficulty": "medium",
      "marks": 10,
      "body": "Question text here",
      "tags": ["tag1"],
      "explanation": "Model answer or key points",
      "markingRubric": "Award 5 marks for X, 3 marks for Y, 2 marks for Z",
      "minWords": 100,
      "maxWords": 300
    }
  ]
}

For programming questions:
{
  "message": "Here are your questions:",
  "questions": [
    {
      "type": "programming",
      "topic": "Topic Name",
      "difficulty": "hard",
      "marks": 10,
      "body": "Problem statement with clear requirements.\n\nSample Input:\n5\n\nSample Output:\n120\n\nConstraints:\n- 1 <= n <= 20",
      "tags": ["tag1", "algorithms"],
      "explanation": "Explanation of the approach",
      "allowedLanguages": ["python", "javascript", "java"],
      "timeLimits": { "python": 2000, "javascript": 1500, "java": 2000 },
      "memoryLimit": 256,
      "starterCode": {
        "python": "def solve(n):\n    # Write your code here\n    pass",
        "javascript": "function solve(n) {\n    // Write your code here\n}",
        "java": "public class Solution {\n    public static int solve(int n) {\n        // Write your code here\n        return 0;\n    }\n}"
      },
      "referenceLanguage": "python",
      "referenceSolution": "def solve(n):\n    if n <= 1:\n        return 1\n    return n * solve(n - 1)",
      "testCases": [
        { "input": "1", "expectedOutput": "1", "weight": 10, "isHidden": false },
        { "input": "5", "expectedOutput": "120", "weight": 20, "isHidden": false },
        { "input": "10", "expectedOutput": "3628800", "weight": 30, "isHidden": true },
        { "input": "15", "expectedOutput": "1307674368000", "weight": 40, "isHidden": true }
      ]
    }
  ]
}

STRICT VALIDATION RULES — violations will cause save failures:
1. type MUST be exactly one of: mcq-single, mcq-multiple, descriptive, programming
2. difficulty MUST be exactly one of: easy, medium, hard
3. marks MUST be a positive integer (default 2 for MCQ, 5 for descriptive, 10 for programming)
4. tags MUST be an array of strings (never null, never a string)
5. MCQ questions MUST have exactly 4 options with AT LEAST ONE option where isCorrect is true
6. mcq-single MUST have exactly ONE isCorrect:true option
7. mcq-multiple MUST have TWO or MORE isCorrect:true options
8. Programming questions MUST have testCases array where ALL weights are positive integers and weights SUM TO EXACTLY 100
9. body MUST be a non-empty string
10. topic MUST be a non-empty string

BEHAVIOR:
- ALWAYS read the full conversation history before responding — details like type, count, and difficulty may have been given in earlier turns
- If the user has already specified type, count, or difficulty in any previous message, use those values — do NOT ask again
- Only ask for missing information that has NOT been provided anywhere in the conversation
- Once you have type + count, generate immediately (difficulty defaults to "medium" if not specified)
- Generate exactly the number requested
- For programming questions, always include at least 4 test cases (mix of visible and hidden)
- For programming questions, always include starter code for each allowed language
- Keep questions grounded in the document content provided (if any)
- Do NOT generate outside the scope of the provided document content`;

type SimpleMsg = { role: 'user' | 'assistant'; content: string };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private groq: Groq;
  private genAI: GoogleGenAI;

  constructor(
    private configService: ConfigService,
    @Inject(QUESTION_SERVICE) private readonly questionClient: ClientProxy,
    private readonly documentService: DocumentService,
  ) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
    this.genAI = new GoogleGenAI({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
    });
  }

  // ─── Gemini 2.0 Flash ────────────────────────────────────────────────────────

  private async callGemini(history: SimpleMsg[], message: string, systemPrompt: string): Promise<string> {
    const contents = [
      ...history.map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: message || '' }] },
    ];

    const response = await this.genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 8192,
      },
    });

    return response.text?.trim() ?? '';
  }

  // ─── Groq llama-3.3-70b (fallback) ───────────────────────────────────────────

  private async callGroq(history: SimpleMsg[], message: string, systemPrompt: string): Promise<string> {
    const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
      ...history,
      { role: 'user', content: message || '' },
    ];

    const response = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 16384,
      messages: [
        { role: 'system', content: systemPrompt },
        ...groqMessages,
      ],
    });

    return response.choices[0].message.content?.trim() ?? '';
  }

  // ─── Rate limit detection ─────────────────────────────────────────────────────

  private isRateLimitError(err: any): boolean {
    return (
      err?.status === 429 ||
      err?.statusCode === 429 ||
      err?.code === 429 ||
      String(err?.message ?? '').includes('429') ||
      String(err?.message ?? '').toLowerCase().includes('quota') ||
      String(err?.message ?? '').toLowerCase().includes('rate') ||
      String(err?.message ?? '').toLowerCase().includes('resource_exhausted')
    );
  }

  // ─── JSON repair ──────────────────────────────────────────────────────────────

  private repairJson(str: string): string {
    let result = '';
    let inString = false;
    let escape = false;
    for (const char of str) {
      if (escape) { result += char; escape = false; continue; }
      if (char === '\\' && inString) { result += char; escape = true; continue; }
      if (char === '"') { result += char; inString = !inString; continue; }
      if (inString && char === '\n') { result += '\\n'; continue; }
      if (inString && char === '\r') { result += '\\r'; continue; }
      if (inString && char === '\t') { result += '\\t'; continue; }
      result += char;
    }
    return result;
  }

  // ─── Main chat handler ────────────────────────────────────────────────────────

  async chat(
    message: string,
    history: { role: string; parts?: { text: string }[]; content?: string }[],
    organizationId: string,
    documentId?: string,
  ) {
    let contextSection = '';

    // RAG: always search — scoped to document if provided, otherwise across all org documents
    const relevantTopics = await this.documentService.searchSimilarTopics(
      message,
      documentId || null,
      8,
      organizationId,
    );
    const ragUsed = relevantTopics.length > 0;
    this.logger.log(`RAG: ${ragUsed ? `${relevantTopics.length} chunks retrieved` : 'no chunks found'} | documentId=${documentId || 'none'} | org=${organizationId}`);
    if (ragUsed) {
      relevantTopics.forEach((t, i) =>
        this.logger.debug(`RAG Chunk ${i + 1}: ${t.preview}`),
      );
    }
    if (ragUsed) {
      const combined = relevantTopics
        .map((t, i) => `[Chunk ${i + 1}]\n${t.content}`)
        .join('\n\n');
      contextSection = `\n\n═══════════════════════════════════════════
RETRIEVED DOCUMENT CONTEXT (RAG) — Generate questions ONLY from this content:
═══════════════════════════════════════════
${combined.slice(0, 10000)}
═══════════════════════════════════════════`;
    }

    // Question bank context — always append so AI knows existing topics
    try {
      const questions: any[] = await firstValueFrom(
        this.questionClient.send(QUESTION_PATTERNS.FIND_ALL, {
          filter: {},
          organizationId,
        }),
      );
      if (questions?.length) {
        const topicCounts: Record<string, number> = {};
        questions.forEach((q) => {
          topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
        });
        const topicList = Object.entries(topicCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([t, c]) => `${t} (${c})`)
          .join(', ');
        contextSection += `\n\nQUESTION BANK: ${questions.length} questions across these topics: ${topicList}. Avoid generating duplicates.`;
      }
    } catch {
      // proceed without question bank context
    }

    // Build shared message history
    const historyMessages: SimpleMsg[] = history
      .map((h) => {
        const raw = String(h.parts?.[0]?.text ?? h.content ?? '').trim();
        let content = raw;
        if (h.role === 'model') {
          try {
            const parsed = JSON.parse(raw);
            const msgText = (parsed.message || '').trim();
            const qCount = parsed.questions?.length ?? 0;
            content = qCount > 0 ? `${msgText}\n[Generated ${qCount} question(s)]`.trim() : msgText;
          } catch {
            // not JSON, use raw text
          }
        }
        return {
          role: (h.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
          content,
        };
      })
      .filter((m) => m.content.length > 0)
      .reduce<SimpleMsg[]>((acc, m) => {
        if (acc.length > 0 && acc[acc.length - 1].role === m.role) return acc;
        acc.push(m);
        return acc;
      }, []);

    // Ensure history ends with assistant so user message alternates correctly
    while (historyMessages.length > 0 && historyMessages[historyMessages.length - 1].role === 'user') {
      historyMessages.pop();
    }

    const fullPrompt = SYSTEM_PROMPT + contextSection;

    // ── Call Gemini first, fall back to Groq on rate limit ──
    let rawText: string;
    try {
      this.logger.debug(`Sending to Gemini 2.0 Flash (${historyMessages.length + 1} messages)`);
      rawText = await this.callGemini(historyMessages, message, fullPrompt);
      this.logger.log('Response from: Gemini 2.0 Flash');
    } catch (geminiErr: any) {
      if (this.isRateLimitError(geminiErr)) {
        this.logger.warn('Gemini rate limit reached — falling back to Groq llama-3.3-70b-versatile');
        try {
          rawText = await this.callGroq(historyMessages, message, fullPrompt);
          this.logger.log('Response from: Groq llama-3.3-70b-versatile (fallback)');
        } catch (groqErr: any) {
          if (groqErr?.status === 429) {
            return {
              message: 'Both AI providers have reached their rate limits. Please wait a few minutes and try again.',
              questions: null,
            };
          }
          throw groqErr;
        }
      } else {
        throw geminiErr;
      }
    }

    // Extract JSON — strip markdown code blocks and extra text
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : rawText;

    try {
      const parsed = JSON.parse(jsonText);
      return {
        message: parsed.message || '',
        questions: parsed.questions || null,
        isRag: ragUsed,
      };
    } catch {
      try {
        const parsed = JSON.parse(this.repairJson(jsonText));
        return {
          message: parsed.message || '',
          questions: parsed.questions || null,
          isRag: ragUsed,
        };
      } catch {
        return { message: rawText, questions: null, isRag: false };
      }
    }
  }
}
