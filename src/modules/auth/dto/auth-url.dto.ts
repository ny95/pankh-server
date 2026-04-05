import { IsOptional, IsUrl } from 'class-validator';

export class AuthUrlDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUri?: string;
}
