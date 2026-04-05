import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_PROVIDER } from '../../../common/constants/mail-provider.constants';
import { PROVIDER_SCOPES } from '../../../common/constants/provider-scopes.constants';
import {
  AuthUrlOptions,
  MailProvider,
  SendEmailPayload,
} from '../interfaces/mail-provider.interface';
import { ProviderProfile } from '../interfaces/provider-profile.interface';
import { ProviderTokenResponse } from '../interfaces/provider-token-response.interface';

@Injectable()
export class MicrosoftProvider implements MailProvider {
  readonly name = MAIL_PROVIDER.MICROSOFT;

  constructor(private readonly configService: ConfigService) {}

  getAuthUrl({ state }: AuthUrlOptions) {
    const tenantId = this.configService.getOrThrow<string>('providers.microsoft.tenantId');
    const redirectUri = this.configService.getOrThrow<string>('providers.microsoft.redirectUri');
    const clientId = this.configService.getOrThrow<string>('providers.microsoft.clientId');
    const url = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('scope', PROVIDER_SCOPES[this.name].join(' '));
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCodeForToken(code: string): Promise<ProviderTokenResponse> {
    return this.exchange({
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.configService.getOrThrow<string>('providers.microsoft.redirectUri'),
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<ProviderTokenResponse> {
    return this.exchange({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
  }

  async getProfile(accessToken: string): Promise<ProviderProfile> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const profile = await response.json();

    return {
      provider: this.name,
      providerUserId: profile.id,
      email: profile.mail ?? profile.userPrincipalName,
      displayName: profile.displayName,
    };
  }

  async sendEmail(payload: SendEmailPayload): Promise<void> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${payload.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: payload.subject,
          body: {
            contentType: payload.html ? 'HTML' : 'Text',
            content: payload.html ?? payload.text ?? '',
          },
          toRecipients: payload.to.map((address) => ({
            emailAddress: { address },
          })),
          attachments: (payload.attachments ?? []).map((attachment) => ({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: attachment.filename,
            contentType: attachment.contentType ?? 'application/octet-stream',
            contentBytes: attachment.content,
          })),
        },
        saveToSentItems: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Microsoft Graph send failed: ${response.status} ${body}`);
    }
  }

  private async exchange(
    params: Record<string, string>,
  ): Promise<ProviderTokenResponse> {
    const tenantId = this.configService.getOrThrow<string>('providers.microsoft.tenantId');
    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.configService.getOrThrow<string>('providers.microsoft.clientId'),
          client_secret: this.configService.getOrThrow<string>('providers.microsoft.clientSecret'),
          ...params,
        }),
      },
    );

    const json = await response.json();
    if (!response.ok) {
      throw new Error(`Microsoft token exchange failed: ${JSON.stringify(json)}`);
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
}
