import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

@Injectable()
export class CryptoService {
  private readonly encryptionKey: Buffer;
  private readonly stateSecret: string;

  constructor(private readonly configService: ConfigService) {
    const encodedKey = this.configService.getOrThrow<string>('security.tokenEncryptionKey');
    this.encryptionKey = Buffer.from(encodedKey, 'base64');
    if (this.encryptionKey.length !== 32) {
      throw new Error('TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes');
    }

    this.stateSecret = this.configService.getOrThrow<string>('security.oauthStateSecret');
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
  }

  decrypt(cipherText: string): string {
    const [ivEncoded, tagEncoded, encryptedEncoded] = cipherText.split('.');
    const iv = Buffer.from(ivEncoded, 'base64url');
    const tag = Buffer.from(tagEncoded, 'base64url');
    const encrypted = Buffer.from(encryptedEncoded, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  signState(payload: string): string {
    return createHmac('sha256', this.stateSecret).update(payload).digest('base64url');
  }
}
