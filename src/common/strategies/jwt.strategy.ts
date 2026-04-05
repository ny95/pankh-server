import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from '../interfaces/jwt-user.interface';

interface JwtPayload {
  sub: string;
  provider: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('security.jwtSecret'),
      issuer: configService.get<string>('security.jwtIssuer'),
      audience: configService.get<string>('security.jwtAudience'),
    });
  }

  validate(payload: JwtPayload): JwtUser {
    return {
      sub: payload.sub,
      provider: payload.provider as JwtUser['provider'],
      email: payload.email,
    };
  }
}
