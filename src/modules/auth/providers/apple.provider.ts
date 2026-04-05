import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSign } from 'crypto';
import { MAIL_PROVIDER } from '../../../common/constants/mail-provider.constants';
import { PROVIDER_SCOPES } from '../../../common/constants/provider-scopes.constants';
import { AuthUrlOptions, MailProvider } from '../interfaces/mail-provider.interface';
import { ProviderProfile } from '../interfaces/provider-profile.interface';
import { ProviderTokenResponse } from '../interfaces/provider-token-response.interface';

@Injectable()
export class AppleProvider implements MailProvider {
  readonly name = MAIL_PROVIDER.APPLE;

  constructor(private readonly configService: ConfigService) {}

  getAuthUrl({ state }: AuthUrlOptions) {
    const url = new URL('https://appleid.apple.com/auth/authorize');
    url.searchParams.set('client_id', this.configService.getOrThrow<string>('providers.apple.clientId'));
    url.searchParams.set('redirect_uri', this.configService.getOrThrow<string>('providers.apple.redirectUri'));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('scope', PROVIDER_SCOPES[this.name].join(' '));
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCodeForToken(code: string): Promise<ProviderTokenResponse> {
    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.configService.getOrThrow<string>('providers.apple.clientId'),
        client_secret: this.buildClientSecret(),
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.configService.getOrThrow<string>('providers.apple.redirectUri'),
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(`Apple token exchange failed: ${JSON.stringify(json)}`);
    }

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in,
      tokenType: json.token_type,
      idToken: json.id_token,
      scope: PROVIDER_SCOPES[this.name].join(' '),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<ProviderTokenResponse> {
    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.configService.getOrThrow<string>('providers.apple.clientId'),
        client_secret: this.buildClientSecret(),
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(`Apple refresh failed: ${JSON.stringify(json)}`);
    }

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in,
      tokenType: json.token_type,
      idToken: json.id_token,
      scope: PROVIDER_SCOPES[this.name].join(' '),
    };
  }

  async getProfile(
    _accessToken: string,
    tokens?: ProviderTokenResponse,
  ): Promise<ProviderProfile> {
    if (!tokens?.idToken) {
      throw new UnauthorizedException('Apple id_token missing from OAuth response');
    }

    const [, payload] = tokens.idToken.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub: string;
      email?: string;
    };

    if (!claims.email) {
      throw new UnauthorizedException(
        'Apple did not provide an email claim. iCloud mailbox access still requires IMAP with an app-specific password.',
      );
    }

    return {
      provider: this.name,
      providerUserId: claims.sub,
      email: claims.email,
      displayName: claims.email,
    };
  }

  private buildClientSecret() {
    const teamId = this.configService.getOrThrow<string>('providers.apple.teamId');
    const clientId = this.configService.getOrThrow<string>('providers.apple.clientId');
    const keyId = this.configService.getOrThrow<string>('providers.apple.keyId');
    const privateKey = this.configService.getOrThrow<string>('providers.apple.privateKey').replace(/\\n/g, '\n');
    const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: teamId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300,
        aud: 'https://appleid.apple.com',
        sub: clientId,
      }),
    ).toString('base64url');
    const unsignedToken = `${header}.${payload}`;
    const signer = createSign('SHA256');
    signer.update(unsignedToken);
    signer.end();
    const signature = signer.sign(privateKey).toString('base64url');
    return `${unsignedToken}.${signature}`;
  }
}
