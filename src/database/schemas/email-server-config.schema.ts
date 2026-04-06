import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmailServerConfigDocument = HydratedDocument<EmailServerConfig>;

@Schema({
  timestamps: true,
  collection: 'email_server_configs',
})
export class EmailServerConfig {
  @Prop({ required: true, unique: true, index: true })
  domain!: string;

  @Prop({ required: true })
  source!: string;

  @Prop({ required: true })
  imapHost!: string;

  @Prop({ required: true })
  imapPort!: number;

  @Prop({ required: true })
  imapSecure!: boolean;

  @Prop({ default: 'password-cleartext' })
  imapAuthMethod!: string;

  @Prop({ default: '%EMAILADDRESS%' })
  imapUsernamePattern!: string;

  @Prop()
  smtpHost?: string;

  @Prop()
  smtpPort?: number;

  @Prop()
  smtpSecure?: boolean;

  @Prop({ default: 'password-cleartext' })
  smtpAuthMethod!: string;

  @Prop({ default: '%EMAILADDRESS%' })
  smtpUsernamePattern!: string;
}

export const EmailServerConfigSchema =
  SchemaFactory.createForClass(EmailServerConfig);
