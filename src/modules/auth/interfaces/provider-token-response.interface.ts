export interface ProviderTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
}
