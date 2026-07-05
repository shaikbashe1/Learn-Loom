import { IsOptional, IsString } from 'class-validator';

export class CourseQueryDto {
  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
