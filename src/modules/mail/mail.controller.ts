import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ListMessagesDto } from './dto/list-messages.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { SendSmtpEmailDto } from './dto/send-smtp-email.dto';
import { MailFetchService } from './services/mail-fetch.service';
import { SendMailService } from './services/send-mail.service';

@Controller()
export class MailController {
  constructor(
    private readonly sendMailService: SendMailService,
    private readonly mailFetchService: MailFetchService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('mail/folders')
  listFolders(@CurrentUser() user: JwtUser) {
    return this.mailFetchService.listFolders(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mail/messages')
  listMessages(@CurrentUser() user: JwtUser, @Query() query: ListMessagesDto) {
    return this.mailFetchService.listMessages(user, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-email')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  sendEmail(@CurrentUser() user: JwtUser, @Body() body: SendEmailDto) {
    return this.sendMailService.send(user.sub, body);
  }

  @Post('send-email/smtp')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  sendSmtpEmail(@Body() body: SendSmtpEmailDto) {
    return this.sendMailService.sendSmtp(body);
  }
}

