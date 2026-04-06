import { IsEmail } from 'class-validator';

export class EmailConfigLookupDto {
  @IsEmail()
  email!: string;
}
