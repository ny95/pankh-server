import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../../database/schemas/user.schema';
import {
  OauthAccount,
  OauthAccountDocument,
} from '../../../database/schemas/oauth-account.schema';
import { ProviderProfile } from '../interfaces/provider-profile.interface';
import { ProviderTokenResponse } from '../interfaces/provider-token-response.interface';
import { CryptoService } from './crypto.service';

@Injectable()
export class AccountService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(OauthAccount.name)
    private readonly oauthAccountModel: Model<OauthAccountDocument>,
    private readonly cryptoService: CryptoService,
  ) {}

  async upsertAccount(profile: ProviderProfile, tokens: ProviderTokenResponse) {
    const user = await this.userModel.findOneAndUpdate(
      { email: profile.email },
      {
        $setOnInsert: { email: profile.email },
        $set: { displayName: profile.displayName },
        $addToSet: { linkedProviders: profile.provider },
      },
      { upsert: true, new: true },
    );

    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    const refreshToken = tokens.refreshToken ? this.cryptoService.encrypt(tokens.refreshToken) : undefined;

    const account = await this.oauthAccountModel.findOneAndUpdate(
      { provider: profile.provider, email: profile.email },
      {
        $setOnInsert: {
          userId: user._id,
          providerUserId: profile.providerUserId,
        },
        $set: {
          email: profile.email,
          accessToken: tokens.accessToken,
          expiresAt,
          scope: tokens.scope,
          tokenType: tokens.tokenType,
          ...(refreshToken ? { refreshToken } : {}),
        },
      },
      { upsert: true, new: true },
    );

    return { user, account };
  }

  async findAccountByUserAndProvider(userId: string, provider: string) {
    return this.oauthAccountModel.findOne({
      userId: new Types.ObjectId(userId),
      provider,
    });
  }

  async updateTokens(accountId: Types.ObjectId | string, tokens: ProviderTokenResponse) {
    const update: Partial<OauthAccount> = {
      accessToken: tokens.accessToken,
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      tokenType: tokens.tokenType,
      scope: tokens.scope,
    };

    if (tokens.refreshToken) {
      update.refreshToken = this.cryptoService.encrypt(tokens.refreshToken);
    }

    return this.oauthAccountModel.findByIdAndUpdate(accountId, update, { new: true });
  }

  decryptRefreshToken(encryptedValue: string) {
    return this.cryptoService.decrypt(encryptedValue);
  }
}
