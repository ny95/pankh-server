export const MAIL_PROVIDER = {
  GOOGLE: 'google',
  MICROSOFT: 'microsoft',
  YAHOO: 'yahoo',
  APPLE: 'apple',
} as const;

export type MailProviderName =
  (typeof MAIL_PROVIDER)[keyof typeof MAIL_PROVIDER];

export const SUPPORTED_PROVIDERS = Object.values(MAIL_PROVIDER);
