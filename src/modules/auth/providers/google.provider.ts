import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_PROVIDER } from '../../../common/constants/mail-provider.constants';
import { PROVIDER_SCOPES } from '../../../common/constants/provider-scopes.constants';
import {
  AuthUrlOptions,
  ListMessagesOptions,
  MailProvider,
  ProviderMailbox,
  ProviderMessagePage,
  SendEmailPayload,
} from '../interfaces/mail-provider.interface';
import { ProviderProfile } from '../interfaces/provider-profile.interface';
import { ProviderTokenResponse } from '../interfaces/provider-token-response.interface';

@Injectable()
export class GoogleProvider implements MailProvider {
  readonly name = MAIL_PROVIDER.GOOGLE;

  constructor(private readonly configService: ConfigService) {}

  getAuthUrl({ state }: AuthUrlOptions) {
    const redirectUri = this.configService.getOrThrow<string>('providers.google.redirectUri');
    const clientId = this.configService.getOrThrow<string>('providers.google.clientId');
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('scope', PROVIDER_SCOPES[this.name].join(' '));
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCodeForToken(code: string): Promise<ProviderTokenResponse> {
    return this.exchange({
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.configService.getOrThrow<string>('providers.google.redirectUri'),
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<ProviderTokenResponse> {
    return this.exchange({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
  }

  async getProfile(accessToken: string): Promise<ProviderProfile> {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const profile = await response.json();
    return {
      provider: this.name,
      providerUserId: profile.sub,
      email: profile.email,
      displayName: profile.name,
    };
  }

  async listMailboxes(accessToken: string): Promise<ProviderMailbox[]> {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(`Gmail labels fetch failed: ${response.status} ${JSON.stringify(json)}`);
    }

    return (json.labels ?? []).map((label: { id: string; name: string }) => ({
      id: label.id,
      name: label.name,
      path: label.id,
    }));
  }

  async listMessages(options: ListMessagesOptions): Promise<ProviderMessagePage> {
    const folderPath = options.folderPath && options.folderPath.length > 0
      ? options.folderPath
      : 'INBOX';
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('maxResults', String(options.pageSize));
    url.searchParams.set('labelIds', folderPath);
    if (options.cursor) {
      url.searchParams.set('pageToken', options.cursor);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
      },
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(`Gmail message list failed: ${response.status} ${JSON.stringify(json)}`);
    }

    const messages = await Promise.all(
      (json.messages ?? []).map(async (message: { id: string }) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=raw`,
          {
            headers: {
              Authorization: `Bearer ${options.accessToken}`,
            },
          },
        );
        const detailJson = await detailResponse.json();
        if (!detailResponse.ok) {
          throw new Error(
            `Gmail message fetch failed: ${detailResponse.status} ${JSON.stringify(detailJson)}`,
          );
        }

        return {
          id: message.id,
          raw: Buffer.from(detailJson.raw, 'base64url').toString('utf8'),
        };
      }),
    );

    return {
      messages,
      total: json.resultSizeEstimate ?? messages.length,
      nextCursor: json.nextPageToken,
    };
  }

  async sendEmail(payload: SendEmailPayload): Promise<void> {
    const raw = this.buildMimeMessage(payload);
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${payload.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: Buffer.from(raw).toString('base64url'),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gmail send failed: ${response.status} ${body}`);
    }
  }

  private async exchange(
    params: Record<string, string>,
  ): Promise<ProviderTokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.configService.getOrThrow<string>('providers.google.clientId'),
        client_secret: this.configService.getOrThrow<string>('providers.google.clientSecret'),
        ...params,
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(`Google token exchange failed: ${JSON.stringify(json)}`);
    }

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in,
      tokenType: json.token_type,
      scope: json.scope,
      idToken: json.id_token,
    };
  }

  private buildMimeMessage(payload: SendEmailPayload) {
    const headers = [
      `From: ${payload.from}`,
      `To: ${payload.to.join(', ')}`,
      `Subject: ${payload.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      '',
      payload.html ?? payload.text ?? '',
    ];

    return headers.join('\r\n');
  }
}
