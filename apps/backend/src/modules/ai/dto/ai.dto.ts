import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AIChatDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  lessonContext?: string;
}
