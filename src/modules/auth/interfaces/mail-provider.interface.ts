import { MailProviderName } from '../../../common/constants/mail-provider.constants';
import { ProviderProfile } from './provider-profile.interface';
import { ProviderTokenResponse } from './provider-token-response.interface';

export interface AuthUrlOptions {
  state: string;
}

export interface SendEmailPayload {
  accessToken: string;
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

export interface ListMessagesOptions {
  accessToken: string;
  folderPath?: string;
  pageSize: number;
  cursor?: string;
}

export interface ProviderMailbox {
  id: string;
  name: string;
  path: string;
}

export interface ProviderMessagePayload {
  id: string;
  raw: string;
}

export interface ProviderMessagePage {
  messages: ProviderMessagePayload[];
  total: number;
  nextCursor?: string;
}

export interface MailProvider {
  readonly name: MailProviderName;
  getAuthUrl(options: AuthUrlOptions): string;
  exchangeCodeForToken(code: string): Promise<ProviderTokenResponse>;
  refreshAccessToken(refreshToken: string): Promise<ProviderTokenResponse>;
  getProfile(
    accessToken: string,
    tokens?: ProviderTokenResponse,
  ): Promise<ProviderProfile>;
  listMailboxes?(accessToken: string): Promise<ProviderMailbox[]>;
  listMessages?(options: ListMessagesOptions): Promise<ProviderMessagePage>;
  sendEmail?(payload: SendEmailPayload): Promise<void>;
}
