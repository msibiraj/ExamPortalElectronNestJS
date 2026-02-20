import { IsString, IsArray, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  type: string;

  @IsString()
  topic: string;

  @IsString()
  difficulty: string;

  @IsNumber()
  @IsOptional()
  marks?: number;

  @IsString()
  body: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsArray()
  @IsOptional()
  options?: { text: string; isCorrect: boolean }[];

  @IsBoolean()
  @IsOptional()
  shuffleOptions?: boolean;

  @IsString()
  @IsOptional()
  markingRubric?: string;

  @IsNumber()
  @IsOptional()
  minWords?: number;

  @IsNumber()
  @IsOptional()
  maxWords?: number;

  @IsArray()
  @IsOptional()
  allowedLanguages?: string[];

  @IsOptional()
  @IsObject()
  timeLimits?: Record<string, number>;

  @IsNumber()
  @IsOptional()
  memoryLimit?: number;

  @IsOptional()
  @IsObject()
  starterCode?: Record<string, string>;

  @IsArray()
  @IsOptional()
  testCases?: { input: string; expectedOutput: string; weight: number; isHidden: boolean }[];

  @IsString()
  @IsOptional()
  referenceLanguage?: string;

  @IsString()
  @IsOptional()
  referenceSolution?: string;
}

export class UpdateQuestionDto extends CreateQuestionDto {}

export class QuestionFilterDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsArray()
  @IsOptional()
  types?: string[];

  @IsArray()
  @IsOptional()
  difficulties?: string[];

  @IsString()
  @IsOptional()
  topic?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  flaggedForReview?: boolean;
}

export class BulkTagDto {
  @IsArray()
  questionIds: string[];

  @IsArray()
  tags: string[];
}

export class ImportQuestionsDto {
  @IsString()
  @IsOptional()
  format?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  importStatus?: string;

  @IsOptional()
  topicMapping?: Record<string, string>;

  @IsArray()
  @IsOptional()
  questions?: CreateQuestionDto[];
}

export class RestoreVersionDto {
  @IsNumber()
  version: number;

  @IsString()
  userId: string;
}

export class FlagReviewDto {
  @IsBoolean()
  flagged: boolean;
}
