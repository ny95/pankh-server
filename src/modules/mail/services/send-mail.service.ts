import nodemailer from 'nodemailer';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { MailProviderName } from '../../../common/constants/mail-provider.constants';
import { AccountService } from '../../auth/services/account.service';
import { ProviderRegistryService } from '../../auth/services/provider-registry.service';
import { TokenService } from '../../token/token.service';
import { SendEmailDto } from '../dto/send-email.dto';
import { SendSmtpEmailDto } from '../dto/send-smtp-email.dto';

@Injectable()
export class SendMailService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly accountService: AccountService,
    private readonly providerRegistry: ProviderRegistryService,
  ) {}

  async send(userId: string, payload: SendEmailDto) {
    const provider = this.providerRegistry.get(payload.provider);
    if (!provider.sendEmail) {
      throw new BadRequestException(
        `Provider ${payload.provider} does not support backend send via API. Use IMAP/SMTP fallback.`,
      );
    }

    const account = await this.accountService.findAccountByUserAndProvider(userId, payload.provider);
    if (!account) {
      throw new BadRequestException(`Provider ${payload.provider} is not linked for this user`);
    }

    const brokeredToken = await this.tokenService.getBrokeredAccessToken(userId, payload.provider);

    await this.withRetry(async () => {
      await provider.sendEmail?.({
        accessToken: brokeredToken.accessToken,
        from: account.email,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        attachments: payload.attachments,
      });
    }, payload.provider);

    return {
      provider: payload.provider,
      accepted: payload.to,
      from: account.email,
    };
  }


  async sendSmtp(payload: SendSmtpEmailDto) {
    const transport = nodemailer.createTransport({
      host: payload.host,
      port: payload.port,
      secure: payload.secure,
      auth: {
        user: payload.username,
        pass: payload.password,
      },
    });

    await transport.sendMail({
      from: payload.from,
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      attachments: (payload.attachments ?? []).map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content, 'base64'),
        contentType: attachment.contentType,
      })),
    });

    return {
      accepted: payload.to,
      from: payload.from,
      transport: 'smtp',
    };
  }

  private async withRetry(operation: () => Promise<void>, provider: MailProviderName) {
    const maxAttempts = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await operation();
        return;
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts) {
          throw new InternalServerErrorException(
            `Failed to send email with ${provider} after ${maxAttempts} attempts`,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }

    throw lastError;
  }
}
