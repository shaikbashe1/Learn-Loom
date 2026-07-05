import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateCertificateDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;
}
