import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SUPPORTED_PROVIDERS,
  MailProviderName,
} from '../../../common/constants/mail-provider.constants';

class AttachmentDto {
  @IsString()
  filename!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  contentType?: string;
}

export class SendEmailDto {
  @IsIn(SUPPORTED_PROVIDERS)
  provider!: MailProviderName;

  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  to!: string[];

  @IsString()
  subject!: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
