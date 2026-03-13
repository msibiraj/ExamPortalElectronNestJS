import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { QUESTION_SERVICE, QUESTION_PATTERNS } from '@app/shared';

const SYSTEM_PROMPT = `You are an AI assistant for an exam portal that helps create high-quality exam questions.

You help instructors generate questions by having a friendly conversation. You ask clarifying questions when needed and make suggestions based on what they already have.

QUESTION TYPES available:
- mcq-single: Multiple choice, one correct answer (provide 4 options)
- mcq-multiple: Multiple choice, multiple correct answers (provide 4 options)
- descriptive: Short/long answer (no options needed)
- programming: Coding question (include problem statement, sample input/output in body)

DIFFICULTY LEVELS: easy, medium, hard

RESPONSE FORMAT (STRICT):
Always respond with a valid JSON object:
{
  "message": "your conversational reply here",
  "questions": null
}

When generating questions, set questions to an array:
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
- Suggest subtopics if the user gives a broad topic
- Warn if a topic already has many questions (based on context provided)
- When generating, always produce the exact count requested
- Keep questions clear, unambiguous, and educationally sound
- Do NOT include markdown, code blocks, or any text outside the JSON object`;

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    @Inject(QUESTION_SERVICE) private readonly questionClient: ClientProxy,
  ) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY'),
    );
  }

  async chat(
    message: string,
    history: { role: string; parts: { text: string }[] }[],
    userId: string,
    organizationId: string,
  ) {
    // Fetch existing topics to give AI context about what's already in the bank
    let topicsContext = '';
    try {
      const questions: any[] = await firstValueFrom(
        this.questionClient.send(QUESTION_PATTERNS.FIND_ALL, {
          filter: {},
          userId,
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
          .map(([t, c]) => `${t} (${c} questions)`)
          .join(', ');
        topicsContext = `\n\nEXISTING QUESTION BANK CONTEXT:\nTopics already in the bank: ${topicList}\nTotal questions: ${questions.length}\nUse this to avoid duplicates and suggest underrepresented topics.`;
      }
    } catch {
      // proceed without context if question service unavailable
    }

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT + topicsContext,
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
