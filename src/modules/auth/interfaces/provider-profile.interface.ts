import { MailProviderName } from '../../../common/constants/mail-provider.constants';

export interface ProviderProfile {
  provider: MailProviderName;
  providerUserId: string;
  email: string;
  displayName?: string;
}
