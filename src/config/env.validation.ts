import { BadRequestException } from '@nestjs/common';

export const validateEnvironment = (config: Record<string, unknown>) => {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'TOKEN_ENCRYPTION_KEY',
    'OAUTH_STATE_SECRET',
    'FRONTEND_REDIRECT_URI',
  ];

  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new BadRequestException(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return config;
};
