import { MailProviderName } from '../constants/mail-provider.constants';

export interface JwtUser {
  sub: string;
  provider: MailProviderName;
  email: string;
}
