import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { MailProviderName } from '../../../common/constants/mail-provider.constants';
import { ProviderAuthState } from '../interfaces/provider-auth-state.interface';
import { CryptoService } from './crypto.service';

@Injectable()
export class OAuthStateService {
  constructor(
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
  ) {}

  create(provider: MailProviderName, redirectUri?: string): string {
    const state: ProviderAuthState = {
      provider,
      nonce: randomUUID(),
      redirectUri:
        redirectUri ?? this.configService.getOrThrow<string>('app.frontendRedirectUri'),
      issuedAt: Date.now(),
    };

    const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
    const signature = this.cryptoService.signState(payload);
    return `${payload}.${signature}`;
  }

  verify(rawState: string, expectedProvider: MailProviderName): ProviderAuthState {
    const [payload, signature] = rawState.split('.');
    const expectedSignature = this.cryptoService.signState(payload);
    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid OAuth state signature');
    }

    const state = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ProviderAuthState;
    const ageMs = Date.now() - state.issuedAt;
    if (state.provider !== expectedProvider || ageMs > 10 * 60 * 1000) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    return state;
  }
}
