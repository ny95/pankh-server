const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseNumber(process.env.PORT, 3000),
    baseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
    frontendRedirectUri: process.env.FRONTEND_REDIRECT_URI ?? 'pankh://oauth/callback',
  },
  database: {
    mongodbUri: process.env.MONGODB_URI,
    redisUrl: process.env.REDIS_URL,
  },
  security: {
    jwtIssuer: process.env.JWT_ISSUER ?? 'pankh',
    jwtAudience: process.env.JWT_AUDIENCE ?? 'mail-client',
    jwtSecret: process.env.JWT_SECRET,
    jwtTtlSeconds: parseNumber(process.env.JWT_TTL_SECONDS, 3600),
    tokenBrokerTtlSeconds: parseNumber(process.env.TOKEN_BROKER_TTL_SECONDS, 900),
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
    oauthStateSecret: process.env.OAUTH_STATE_SECRET,
  },
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      tenantId: process.env.MICROSOFT_TENANT_ID ?? 'common',
      redirectUri: process.env.MICROSOFT_REDIRECT_URI,
    },
    yahoo: {
      clientId: process.env.YAHOO_CLIENT_ID,
      clientSecret: process.env.YAHOO_CLIENT_SECRET,
      redirectUri: process.env.YAHOO_REDIRECT_URI,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID,
      teamId: process.env.APPLE_TEAM_ID,
      keyId: process.env.APPLE_KEY_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY,
      redirectUri: process.env.APPLE_REDIRECT_URI,
    },
  },
});
