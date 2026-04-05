import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailProviderName } from '../../common/constants/mail-provider.constants';
import { AccountService } from '../auth/services/account.service';
import { ProviderRegistryService } from '../auth/services/provider-registry.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly accountService: AccountService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly configService: ConfigService,
  ) {}

  async getBrokeredAccessToken(userId: string, provider: MailProviderName) {
    const account = await this.accountService.findAccountByUserAndProvider(userId, provider);
    if (!account) {
      throw new UnauthorizedException(`No linked ${provider} account for this user`);
    }

    const now = Date.now();
    const brokerTtlSeconds = this.configService.get<number>('security.tokenBrokerTtlSeconds', 900);
    const remainingMs = account.expiresAt.getTime() - now;
    if (remainingMs > brokerTtlSeconds * 1000) {
      return {
        provider,
        accessToken: account.accessToken,
        expiresIn: Math.floor(remainingMs / 1000),
        tokenType: account.tokenType ?? 'Bearer',
      };
    }

    const refreshToken = this.accountService.decryptRefreshToken(account.refreshToken);
    const providerAdapter = this.providerRegistry.get(provider);
    const refreshed = await providerAdapter.refreshAccessToken(refreshToken);
    const updatedAccount = await this.accountService.updateTokens(account.id, refreshed);

    return {
      provider,
      accessToken: updatedAccount?.accessToken ?? refreshed.accessToken,
      expiresIn: refreshed.expiresIn,
      tokenType: refreshed.tokenType ?? 'Bearer',
    };
  }
}
