import { MailProviderName } from '../../../common/constants/mail-provider.constants';

export interface ProviderAuthState {
  provider: MailProviderName;
  nonce: string;
  redirectUri: string;
  issuedAt: number;
}
