import {
  Injectable,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { AccountService } from '../../auth/services/account.service';
import { ProviderRegistryService } from '../../auth/services/provider-registry.service';
import { ListMessagesDto } from '../dto/list-messages.dto';

@Injectable()
export class MailFetchService {
  constructor(
    private readonly accountService: AccountService,
    private readonly providerRegistry: ProviderRegistryService,
  ) {}

  async listFolders(user: JwtUser) {
    const { providerAdapter, accessToken } = await this.resolveProviderAccess(user);
    if (!providerAdapter.listMailboxes) {
      throw new NotImplementedException(
        `Mailbox listing is not implemented for provider ${user.provider}`,
      );
    }

    return providerAdapter.listMailboxes(accessToken);
  }

  async listMessages(user: JwtUser, query: ListMessagesDto) {
    const { providerAdapter, accessToken } = await this.resolveProviderAccess(user);
    if (!providerAdapter.listMessages) {
      throw new NotImplementedException(
        `Message listing is not implemented for provider ${user.provider}`,
      );
    }

    return providerAdapter.listMessages({
      accessToken,
      folderPath: query.folderPath,
      pageSize: query.pageSize,
      cursor: query.cursor,
    });
  }

  private async resolveProviderAccess(user: JwtUser) {
    const account = await this.accountService.findAccountByUserAndProvider(
      user.sub,
      user.provider,
    );
    if (!account) {
      throw new UnauthorizedException(`No linked ${user.provider} account for this user`);
    }

    const providerAdapter = this.providerRegistry.get(user.provider);
    const now = Date.now();
    if (account.expiresAt.getTime() <= now + 60_000) {
      const refreshToken = this.accountService.decryptRefreshToken(account.refreshToken);
      const refreshed = await providerAdapter.refreshAccessToken(refreshToken);
      const updated = await this.accountService.updateTokens(account.id, refreshed);
      return {
        providerAdapter,
        accessToken: updated?.accessToken ?? refreshed.accessToken,
      };
    }

    return {
      providerAdapter,
      accessToken: account.accessToken,
    };
  }
}
