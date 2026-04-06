import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from '../../config/configuration';
import { validateEnvironment } from '../../config/env.validation';
import {
  EmailServerConfig,
  EmailServerConfigSchema,
} from '../../database/schemas/email-server-config.schema';
import { OauthAccount, OauthAccountSchema } from '../../database/schemas/oauth-account.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { AuthController } from '../auth/auth.controller';
import { AppleProvider } from '../auth/providers/apple.provider';
import { GoogleProvider } from '../auth/providers/google.provider';
import { MicrosoftProvider } from '../auth/providers/microsoft.provider';
import { YahooProvider } from '../auth/providers/yahoo.provider';
import { AccountService } from '../auth/services/account.service';
import { AuthService } from '../auth/services/auth.service';
import { EmailConfigLookupService } from '../auth/services/email-config-lookup.service';
import { CryptoService } from '../auth/services/crypto.service';
import { OAuthStateService } from '../auth/services/oauth-state.service';
import { ProviderRegistryService } from '../auth/services/provider-registry.service';
import { SessionService } from '../auth/services/session.service';
import { MailController } from '../mail/mail.controller';
import { MailFetchService } from '../mail/services/mail-fetch.service';
import { SendMailService } from '../mail/services/send-mail.service';
import { TokenController } from '../token/token.controller';
import { TokenService } from '../token/token.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
      expandVariables: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('database.mongodbUri'),
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: OauthAccount.name, schema: OauthAccountSchema },
      { name: EmailServerConfig.name, schema: EmailServerConfigSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('security.jwtSecret'),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
  ],
  controllers: [AuthController, TokenController, MailController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    CryptoService,
    OAuthStateService,
    SessionService,
    AccountService,
    AuthService,
    EmailConfigLookupService,
    TokenService,
    SendMailService,
    MailFetchService,
    ProviderRegistryService,
    GoogleProvider,
    MicrosoftProvider,
    YahooProvider,
    AppleProvider,
    {
      provide: 'MAIL_PROVIDERS',
      inject: [GoogleProvider, MicrosoftProvider, YahooProvider, AppleProvider],
      useFactory: (
        googleProvider: GoogleProvider,
        microsoftProvider: MicrosoftProvider,
        yahooProvider: YahooProvider,
        appleProvider: AppleProvider,
      ) => [googleProvider, microsoftProvider, yahooProvider, appleProvider],
    },
  ],
})
export class AppModule {}
