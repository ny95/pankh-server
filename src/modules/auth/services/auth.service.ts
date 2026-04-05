import { Injectable, UnauthorizedException } from '@nestjs/common';
import { MailProviderName } from '../../../common/constants/mail-provider.constants';
import { AccountService } from './account.service';
import { OAuthStateService } from './oauth-state.service';
import { ProviderRegistryService } from './provider-registry.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly accountService: AccountService,
    private readonly oauthStateService: OAuthStateService,
    private readonly sessionService: SessionService,
  ) {}

  getAuthorizationUrl(provider: MailProviderName, redirectUri?: string) {
    const providerAdapter = this.providerRegistry.get(provider);
    const state = this.oauthStateService.create(provider, redirectUri);

    return {
      provider,
      authUrl: providerAdapter.getAuthUrl({ state }),
    };
  }

  async handleCallback(provider: MailProviderName, code: string, state: string) {
    const oauthState = this.oauthStateService.verify(state, provider);
    const providerAdapter = this.providerRegistry.get(provider);
    const tokens = await providerAdapter.exchangeCodeForToken(code);

    if (!tokens.refreshToken && provider !== 'apple') {
      throw new UnauthorizedException(
        `Provider ${provider} did not return a refresh token. Ensure offline access is enabled.`,
      );
    }

    const profile = await providerAdapter.getProfile(tokens.accessToken, tokens);
    const { user } = await this.accountService.upsertAccount(profile, tokens);
    const session = await this.sessionService.signInSession({
      userId: user.id,
      provider,
      email: profile.email,
    });

    const redirectUrl = new URL(oauthState.redirectUri);
    redirectUrl.searchParams.set('token', session.token);
    redirectUrl.searchParams.set('provider', provider);
    redirectUrl.searchParams.set('email', profile.email);
    return {
      session,
      redirectUrl: redirectUrl.toString(),
    };
  }
}
