import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerItemDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  // Supports single selections, arrays for matching/selects, or text for fill-in-blanks
  @IsNotEmpty()
  selectedAnswer: any; 
}

export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];
}
