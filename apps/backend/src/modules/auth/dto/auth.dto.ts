import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @IsString()
  password: string;

  @IsString()
  fullName: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @IsString()
  password: string;
}
