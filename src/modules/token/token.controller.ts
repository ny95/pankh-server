import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MailProviderName } from '../../common/constants/mail-provider.constants';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { TokenService } from './token.service';

@Controller('token')
@UseGuards(JwtAuthGuard)
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get(':provider')
  getToken(
    @CurrentUser() user: JwtUser,
    @Param('provider') provider: MailProviderName,
  ) {
    return this.tokenService.getBrokeredAccessToken(user.sub, provider);
  }
}
