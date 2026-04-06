import {
  Body,
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Post,
  Param,
  Query,
  Redirect,
} from '@nestjs/common';
import {
  MailProviderName,
  SUPPORTED_PROVIDERS,
} from '../../common/constants/mail-provider.constants';
import { AuthUrlDto } from './dto/auth-url.dto';
import { CacheEmailConfigDto } from './dto/cache-email-config.dto';
import { EmailConfigLookupDto } from './dto/email-config-lookup.dto';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { AuthService } from './services/auth.service';
import { EmailConfigLookupService } from './services/email-config-lookup.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailConfigLookupService: EmailConfigLookupService,
  ) {}

  @Get('email-config/lookup')
  lookupEmailConfig(@Query() query: EmailConfigLookupDto) {
    return this.emailConfigLookupService.lookup(query.email);
  }

  @Post('email-config/cache')
  cacheEmailConfig(@Body() body: CacheEmailConfigDto) {
    return this.emailConfigLookupService.cacheManualConfig(body);
  }

  @Get(':provider')
  getAuthUrl(
    @Param('provider') provider: MailProviderName,
    @Query() query: AuthUrlDto,
  ) {
    this.ensureSupportedProvider(provider);
    return this.authService.getAuthorizationUrl(provider, query.redirectUri);
  }

  @Get(':provider/callback')
  @Redirect()
  async handleCallback(
    @Param('provider') provider: MailProviderName,
    @Query() query: OAuthCallbackDto,
  ) {
    this.ensureSupportedProvider(provider);
    if (query.error) {
      throw new BadRequestException(`OAuth consent failed for ${provider}: ${query.error}`);
    }

    const result = await this.authService.handleCallback(provider, query.code, query.state);
    return {
      url: result.redirectUrl,
      statusCode: 302,
    };
  }

  private ensureSupportedProvider(provider: string): asserts provider is MailProviderName {
    if (!SUPPORTED_PROVIDERS.includes(provider as MailProviderName)) {
      throw new NotFoundException(`Unsupported provider: ${provider}`);
    }
  }
}
