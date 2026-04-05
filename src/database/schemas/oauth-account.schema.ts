import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type OauthAccountDocument = HydratedDocument<OauthAccount>;

@Schema({
  timestamps: true,
  collection: 'oauth_accounts',
})
export class OauthAccount {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  provider!: string;

  @Prop({ required: true, index: true })
  providerUserId!: string;

  @Prop({ required: true, index: true })
  email!: string;

  @Prop({ required: true })
  accessToken!: string;

  @Prop({ required: true })
  refreshToken!: string;

  @Prop()
  scope?: string;

  @Prop()
  tokenType?: string;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const OauthAccountSchema = SchemaFactory.createForClass(OauthAccount);
OauthAccountSchema.index({ provider: 1, email: 1 }, { unique: true });
