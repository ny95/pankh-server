import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EmailServerConfig,
  EmailServerConfigDocument,
} from '../../../database/schemas/email-server-config.schema';
import { CacheEmailConfigDto } from '../dto/cache-email-config.dto';

type LookupSource = 'cache' | 'ispdb' | 'domain-autoconfig' | 'manual';

type LookupResult = {
  found: boolean;
  source?: LookupSource;
  domain: string;
  hostedAuth?: {
    available: boolean;
    provider?: 'google' | 'microsoft' | 'yahoo';
  };
  config?: {
    imap: {
      host: string;
      port: number;
      secure: boolean;
      authMethod: string;
      usernamePattern: string;
    };
    smtp?: {
      host: string;
      port: number;
      secure: boolean;
      authMethod: string;
      usernamePattern: string;
    };
  };
};

type ParsedServer = {
  host: string;
  port: number;
  secure: boolean;
  authMethod: string;
  usernamePattern: string;
};

@Injectable()
export class EmailConfigLookupService {
  constructor(
    @InjectModel(EmailServerConfig.name)
    private readonly emailServerConfigModel: Model<EmailServerConfigDocument>,
  ) {}

  async lookup(email: string): Promise<LookupResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const domain = this.extractDomain(normalizedEmail);
    const cached = await this.emailServerConfigModel.findOne({ domain }).lean();

    if (cached) {
      return {
        found: true,
        source: 'cache',
        domain,
        hostedAuth: this.resolveHostedAuth(domain, this.toResponseConfig(cached)),
        config: this.toResponseConfig(cached),
      };
    }

    const discovered = await this.lookupRemote(domain);
    if (discovered?.config && discovered.source) {
      await this.upsert(domain, discovered.source, discovered.config);
      return {
        found: true,
        source: discovered.source,
        domain,
        hostedAuth: this.resolveHostedAuth(domain, discovered.config),
        config: discovered.config,
      };
    }

    return {
      found: false,
      domain,
      hostedAuth: {
        available: false,
      },
    };
  }

  async cacheManualConfig(dto: CacheEmailConfigDto) {
    const domain = this.extractDomain(dto.email);
    const config = {
      imap: {
        host: dto.imapHost.trim(),
        port: dto.imapPort,
        secure: dto.imapSecure,
        authMethod: dto.imapAuthMethod?.trim() ?? 'password-cleartext',
        usernamePattern: '%EMAILADDRESS%',
      },
      smtp:
          dto.smtpHost != null && dto.smtpPort != null && dto.smtpSecure != null
              ? {
                  host: dto.smtpHost.trim(),
                  port: dto.smtpPort,
                  secure: dto.smtpSecure,
                  authMethod: dto.smtpAuthMethod?.trim() ?? 'password-cleartext',
                  usernamePattern: '%EMAILADDRESS%',
                }
              : undefined,
    };

    await this.upsert(domain, 'manual', config);

    return {
      success: true,
      domain,
      source: 'manual',
      config,
    };
  }

  private async lookupRemote(domain: string): Promise<LookupResult | null> {
    const candidates: Array<{ url: string; source: LookupSource }> = [
      {
        url: `https://autoconfig.${domain}/mail/config-v1.1.xml?emailaddress=user@${domain}`,
        source: 'domain-autoconfig',
      },
      {
        url: `https://${domain}/.well-known/autoconfig/mail/config-v1.1.xml?emailaddress=user@${domain}`,
        source: 'domain-autoconfig',
      },
      {
        url: `https://autoconfig.thunderbird.net/v1.1/${domain}`,
        source: 'ispdb',
      },
    ];

    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate.url, {
          headers: { Accept: 'application/xml, text/xml;q=0.9, */*;q=0.8' },
        });
        if (!response.ok) {
          continue;
        }

        const xml = await response.text();
        const config = this.parseConfigXml(xml);
        if (!config?.imap?.host) {
          continue;
        }

        return {
          found: true,
          source: candidate.source,
          domain,
          config,
        };
      } catch {
        continue;
      }
    }

    return null;
  }

  private parseConfigXml(xml: string): LookupResult['config'] | undefined {
    const incomingBlocks = this.findBlocks(xml, 'incomingServer');
    const outgoingBlocks = this.findBlocks(xml, 'outgoingServer');

    for (const block of incomingBlocks) {
      if (!/type\s*=\s*["']imap["']/i.test(block.openTag)) {
        continue;
      }

      const imap = this.parseServerBlock(block.body);
      if (imap == null) {
        continue;
      }

      const smtpBlock = outgoingBlocks.find((item) =>
        /type\s*=\s*["']smtp["']/i.test(item.openTag),
      );
      const smtpCandidate =
        smtpBlock == null ? undefined : this.parseServerBlock(smtpBlock.body);
      const smtp = smtpCandidate ?? undefined;

      return { imap, smtp };
    }

    return undefined;
  }

  private findBlocks(xml: string, tagName: string) {
    const regex = new RegExp(
      `<${tagName}([^>]*)>([\\s\\S]*?)<\\/${tagName}>`,
      'gi',
    );
    const blocks: Array<{ openTag: string; body: string }> = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) != null) {
      blocks.push({
        openTag: match[1] ?? '',
        body: match[2] ?? '',
      });
    }
    return blocks;
  }

  private parseServerBlock(xml: string): ParsedServer | null {
    const host = this.readTag(xml, 'hostname');
    const port = Number.parseInt(this.readTag(xml, 'port') ?? '', 10);

    if (!host || !Number.isFinite(port)) {
      return null;
    }

    return {
      host,
      port,
      secure: this.socketTypeToSecure(this.readTag(xml, 'socketType')),
      authMethod: (this.readTag(xml, 'authentication') ?? 'password-cleartext')
        .trim()
        .toLowerCase(),
      usernamePattern: this.readTag(xml, 'username') ?? '%EMAILADDRESS%',
    };
  }

  private readTag(xml: string, tagName: string) {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = regex.exec(xml);
    return match?.[1]?.trim();
  }

  private socketTypeToSecure(socketType?: string) {
    const normalized = socketType?.trim().toUpperCase();
    return normalized == null ? true : normalized != 'PLAIN';
  }

  private extractDomain(email: string) {
    const parts = email.trim().toLowerCase().split('@');
    return parts[parts.length - 1] ?? '';
  }

  private async upsert(
    domain: string,
    source: LookupSource,
    config: NonNullable<LookupResult['config']>,
  ) {
    await this.emailServerConfigModel.updateOne(
      { domain },
      {
        $set: {
          domain,
          source,
          imapHost: config.imap.host,
          imapPort: config.imap.port,
          imapSecure: config.imap.secure,
          imapAuthMethod: config.imap.authMethod,
          imapUsernamePattern: config.imap.usernamePattern,
          smtpHost: config.smtp?.host,
          smtpPort: config.smtp?.port,
          smtpSecure: config.smtp?.secure,
          smtpAuthMethod: config.smtp?.authMethod ?? 'password-cleartext',
          smtpUsernamePattern: config.smtp?.usernamePattern ?? '%EMAILADDRESS%',
        },
      },
      { upsert: true },
    );
  }

  private toResponseConfig(document: {
    imapHost: string;
    imapPort: number;
    imapSecure: boolean;
    imapAuthMethod?: string;
    imapUsernamePattern?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpAuthMethod?: string;
    smtpUsernamePattern?: string;
  }) {
    return {
      imap: {
        host: document.imapHost,
        port: document.imapPort,
        secure: document.imapSecure,
        authMethod: document.imapAuthMethod ?? 'password-cleartext',
        usernamePattern: document.imapUsernamePattern ?? '%EMAILADDRESS%',
      },
      smtp:
          document.smtpHost != null &&
                  document.smtpPort != null &&
                  document.smtpSecure != null
              ? {
                  host: document.smtpHost,
                  port: document.smtpPort,
                  secure: document.smtpSecure,
                  authMethod: document.smtpAuthMethod ?? 'password-cleartext',
                  usernamePattern:
                      document.smtpUsernamePattern ?? '%EMAILADDRESS%',
                }
              : undefined,
    };
  }

  private resolveHostedAuth(
    domain: string,
    config: NonNullable<LookupResult['config']>,
  ): LookupResult['hostedAuth'] {
    const normalizedDomain = domain.trim().toLowerCase();
    const authMethod = config.imap.authMethod.toLowerCase();

    if (
      normalizedDomain == 'gmail.com' ||
      normalizedDomain == 'googlemail.com'
    ) {
      return { available: true, provider: 'google' };
    }

    if (
      normalizedDomain == 'outlook.com' ||
      normalizedDomain == 'hotmail.com' ||
      normalizedDomain == 'live.com' ||
      normalizedDomain == 'office365.com' ||
      normalizedDomain == 'microsoft.com'
    ) {
      return { available: true, provider: 'microsoft' };
    }

    if (
      normalizedDomain == 'yahoo.com' ||
      normalizedDomain.endsWith('.yahoo.com')
    ) {
      return { available: true, provider: 'yahoo' };
    }

    if (authMethod.includes('oauth2')) {
      if (config.imap.host.includes('gmail.com')) {
        return { available: true, provider: 'google' };
      }
      if (
        config.imap.host.includes('outlook') ||
        config.imap.host.includes('office365')
      ) {
        return { available: true, provider: 'microsoft' };
      }
      if (config.imap.host.includes('yahoo')) {
        return { available: true, provider: 'yahoo' };
      }
    }

    return { available: false };
  }
}
