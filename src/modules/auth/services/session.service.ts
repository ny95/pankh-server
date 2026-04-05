import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MailProviderName } from '../../../common/constants/mail-provider.constants';

@Injectable()
export class SessionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signInSession(payload: {
    userId: string;
    provider: MailProviderName;
    email: string;
  }) {
    const jwtTtlSeconds = this.configService.get<number>('security.jwtTtlSeconds', 3600);
    const accessToken = await this.jwtService.signAsync(
      {
        sub: payload.userId,
        provider: payload.provider,
        email: payload.email,
      },
      {
        issuer: this.configService.get<string>('security.jwtIssuer'),
        audience: this.configService.get<string>('security.jwtAudience'),
        expiresIn: jwtTtlSeconds,
      },
    );

    return {
      token: accessToken,
      expiresIn: jwtTtlSeconds,
    };
  }
}
