import { MAIL_PROVIDER, MailProviderName } from './mail-provider.constants';

export const PROVIDER_SCOPES: Record<MailProviderName, string[]> = {
  [MAIL_PROVIDER.GOOGLE]: [
    'openid',
    'email',
    'profile',
    'https://mail.google.com/',
  ],
  [MAIL_PROVIDER.MICROSOFT]: [
    'offline_access',
    'openid',
    'email',
    'profile',
    'Mail.Read',
    'Mail.Send',
    'User.Read',
  ],
  [MAIL_PROVIDER.YAHOO]: [
    'openid',
    'openid2',
    'mail-r',
    'mail-w',
    'sdct-r',
  ],
  [MAIL_PROVIDER.APPLE]: ['name', 'email'],
};
