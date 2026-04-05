CREATE TABLE app_users (
  id UUID PRIMARY KEY,
  email CITEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  email CITEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_type TEXT,
  scope TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, email),
  UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_oauth_accounts_user_provider
  ON oauth_accounts (user_id, provider);

CREATE INDEX idx_oauth_accounts_expiry
  ON oauth_accounts (expires_at);
