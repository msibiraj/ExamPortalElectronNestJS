import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

export interface TestCaseResult {
  index: number;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error: string | null;
  timeMs: number;
}

export interface RunCodeDto {
  language: string;
  code: string;
  testCases: Array<{ input: string; expectedOutput: string }>;
  timeLimit?: number; // ms per test case, default 5000
}

@Injectable()
export class CodeRunnerService {
  private readonly logger = new Logger(CodeRunnerService.name);

  async run(dto: RunCodeDto): Promise<TestCaseResult[]> {
    const { language, code, testCases, timeLimit = 5000 } = dto;
    const results: TestCaseResult[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const result = await this.runSingle(language, code, tc.input, tc.expectedOutput, timeLimit);
      results.push({ index: i, ...result });
    }

    return results;
  }

  private async runSingle(
    language: string,
    code: string,
    input: string,
    expected: string,
    timeLimitMs: number,
  ): Promise<Omit<TestCaseResult, 'index'>> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'exam-run-'));
    const start = Date.now();

    try {
      let command: string;

      switch (language) {
        case 'python': {
          const file = path.join(tmpDir, 'solution.py');
          await fs.writeFile(file, code);
          command = `echo ${JSON.stringify(input)} | timeout ${timeLimitMs / 1000} python3 "${file}"`;
          break;
        }
        case 'javascript': {
          const file = path.join(tmpDir, 'solution.js');
          await fs.writeFile(file, code);
          command = `echo ${JSON.stringify(input)} | timeout ${timeLimitMs / 1000} node "${file}"`;
          break;
        }
        case 'typescript': {
          const file = path.join(tmpDir, 'solution.ts');
          await fs.writeFile(file, code);
          command = `echo ${JSON.stringify(input)} | timeout ${timeLimitMs / 1000} npx --yes ts-node --skip-project "${file}"`;
          break;
        }
        case 'java': {
          const file = path.join(tmpDir, 'Main.java');
          await fs.writeFile(file, code);
          command = `cd "${tmpDir}" && javac Main.java && echo ${JSON.stringify(input)} | timeout ${timeLimitMs / 1000} java -cp "${tmpDir}" Main`;
          break;
        }
        case 'cpp': {
          const srcFile = path.join(tmpDir, 'solution.cpp');
          const outFile = path.join(tmpDir, 'solution');
          await fs.writeFile(srcFile, code);
          command = `g++ -O2 -std=c++17 "${srcFile}" -o "${outFile}" && echo ${JSON.stringify(input)} | timeout ${timeLimitMs / 1000} "${outFile}"`;
          break;
        }
        case 'go': {
          const file = path.join(tmpDir, 'solution.go');
          await fs.writeFile(file, code);
          command = `echo ${JSON.stringify(input)} | timeout ${timeLimitMs / 1000} go run "${file}"`;
          break;
        }
        default:
          return { passed: false, input, expected, actual: '', error: `Unsupported language: ${language}`, timeMs: 0 };
      }

      const { stdout, stderr } = await execAsync(command, {
        timeout: timeLimitMs + 2000,
        maxBuffer: 1024 * 1024,
      });

      const actual = stdout.trim();
      const expectedTrimmed = expected.trim();
      const passed = actual === expectedTrimmed;
      const timeMs = Date.now() - start;

      return {
        passed,
        input,
        expected: expectedTrimmed,
        actual,
        error: stderr ? stderr.slice(0, 500) : null,
        timeMs,
      };
    } catch (err: any) {
      const timeMs = Date.now() - start;
      const isTimeout = err.killed || err.signal === 'SIGTERM' || err.code === 124;
      return {
        passed: false,
        input,
        expected: expected.trim(),
        actual: '',
        error: isTimeout ? 'Time Limit Exceeded' : (err.stderr || err.message || 'Runtime Error').slice(0, 500),
        timeMs,
      };
    } finally {
      fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
