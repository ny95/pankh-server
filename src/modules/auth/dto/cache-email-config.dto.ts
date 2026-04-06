import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CacheEmailConfigDto {
  @IsEmail()
  email!: string;

  @IsString()
  imapHost!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  imapPort!: number;

  @IsBoolean()
  imapSecure!: boolean;

  @IsOptional()
  @IsString()
  imapAuthMethod?: string;

  @IsOptional()
  @IsString()
  smtpHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @IsOptional()
  @IsString()
  smtpAuthMethod?: string;
}
