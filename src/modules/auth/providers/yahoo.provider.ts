import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_PROVIDER } from '../../../common/constants/mail-provider.constants';
import { PROVIDER_SCOPES } from '../../../common/constants/provider-scopes.constants';
import { AuthUrlOptions, MailProvider } from '../interfaces/mail-provider.interface';
import { ProviderProfile } from '../interfaces/provider-profile.interface';
import { ProviderTokenResponse } from '../interfaces/provider-token-response.interface';

@Injectable()
export class YahooProvider implements MailProvider {
  readonly name = MAIL_PROVIDER.YAHOO;

  constructor(private readonly configService: ConfigService) {}

  getAuthUrl({ state }: AuthUrlOptions) {
    const url = new URL('https://api.login.yahoo.com/oauth2/request_auth');
    url.searchParams.set(
      'client_id',
      this.configService.getOrThrow<string>('providers.yahoo.clientId'),
    );
    url.searchParams.set(
      'redirect_uri',
      this.configService.getOrThrow<string>('providers.yahoo.redirectUri'),
    );
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', PROVIDER_SCOPES[this.name].join(' '));
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCodeForToken(code: string): Promise<ProviderTokenResponse> {
    return this.exchange({
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.configService.getOrThrow<string>('providers.yahoo.redirectUri'),
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<ProviderTokenResponse> {
    return this.exchange({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
  }

  async getProfile(accessToken: string): Promise<ProviderProfile> {
    const response = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
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

  private async exchange(
    params: Record<string, string>,
  ): Promise<ProviderTokenResponse> {
    const credentials = Buffer.from(
      `${this.configService.getOrThrow<string>('providers.yahoo.clientId')}:${this.configService.getOrThrow<string>('providers.yahoo.clientSecret')}`,
    ).toString('base64');

    const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(`Yahoo token exchange failed: ${JSON.stringify(json)}`);
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
