import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MailProviderName } from '../../../common/constants/mail-provider.constants';
import { MailProvider } from '../interfaces/mail-provider.interface';

@Injectable()
export class ProviderRegistryService {
  constructor(@Inject('MAIL_PROVIDERS') private readonly providers: MailProvider[]) {}

  get(providerName: MailProviderName): MailProvider {
    const provider = this.providers.find((item) => item.name === providerName);
    if (!provider) {
      throw new NotFoundException(`Unsupported provider: ${providerName}`);
    }

    return provider;
  }
}
