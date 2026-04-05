# Email OAuth Aggregator + Thin Mail Backend

Production-oriented NestJS + Fastify backend for:

- OAuth login and token lifecycle for Gmail, Microsoft, Yahoo, and Apple identity
- Encrypted refresh-token storage on the backend only
- JWT session issuance to the Flutter client
- Short-lived token brokering for direct client-side mailbox access
- Backend mail sending through Gmail API and Microsoft Graph

This service is intentionally not a full mail server. It does not fetch, store, or index user mail.

## Stack

- NestJS 11
- Fastify
- MongoDB for users and OAuth tokens
- Redis optional for future caching/rate-limit storage
- AES-256-GCM refresh-token encryption
- JWT session tokens

## Folder Structure

```text
src/
  common/
    constants/
    decorators/
    guards/
    interfaces/
    strategies/
  config/
  database/
    schemas/
  modules/
    app/
    auth/
      dto/
      interfaces/
      providers/
      services/
    mail/
      dto/
      services/
    token/
      dto/
```

## Environment

Copy from [.env.example](/Users/na/Documents/flutter/projects/mail server/.env.example).

Important values:

- `TOKEN_ENCRYPTION_KEY` must be a base64-encoded 32-byte key
- `FRONTEND_REDIRECT_URI` must match the Flutter deep link or HTTPS callback exactly
- Each provider redirect URI must exactly match the value registered with that provider

Generate a 32-byte encryption key:

```bash
openssl rand -base64 32
```

## Endpoints

### Start OAuth

`GET /api/auth/:provider`

Example:

```bash
curl http://localhost:3000/api/auth/google
```

Response:

```json
{
  "provider": "google",
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### OAuth Callback

`GET /api/auth/:provider/callback`

The backend exchanges the code, stores tokens, issues a JWT, and redirects to the configured frontend callback:

```text
myapp://oauth/callback?token=...&provider=google&email=user@example.com
```

### Broker Access Token

`GET /api/token/:provider`

Client sends its JWT and receives a short-lived provider access token. Refresh tokens never leave the backend.

```bash
curl http://localhost:3000/api/token/google \
  -H "Authorization: Bearer APP_SESSION_JWT"
```

### Send Email

`POST /api/send-email`

```bash
curl http://localhost:3000/api/send-email \
  -H "Authorization: Bearer APP_SESSION_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "microsoft",
    "to": ["alice@example.com"],
    "subject": "Hello",
    "text": "Thin backend test"
  }'
```

## Provider Notes

### Google

- OAuth scopes: `gmail.readonly`, `gmail.send`
- Sending uses Gmail API
- Client can fetch mail with Gmail API or IMAP XOAUTH2

### Microsoft

- OAuth scopes: `Mail.Read`, `Mail.Send`
- Sending uses Microsoft Graph `sendMail`
- Client fetches mail and folders directly from Microsoft Graph

### Yahoo

- OAuth scopes and token exchange are implemented
- Client fetches via IMAP using the brokered access token
- Backend send proxy is intentionally not enabled here because Yahoo OAuth SMTP support varies by tenant/account setup

### Apple

- Sign in with Apple is treated as identity-only
- General iCloud Mail API access is not available
- Recommended fallback: iCloud IMAP/SMTP with an app-specific password, managed entirely client-side

## IMAP XOAUTH2 String Format

The client should build the SASL XOAUTH2 string as:

```text
base64("user=<email>\x01auth=Bearer <access_token>\x01\x01")
```

Example pre-base64 payload:

```text
user=user@example.com^Aauth=Bearer ya29.a0Af...^A^A
```

`^A` represents `\x01`.

## Security Design

- Refresh tokens are AES-256-GCM encrypted before persistence
- Refresh tokens are never returned by any API
- Session JWTs are app-scoped and separate from provider tokens
- OAuth state is HMAC-signed and short-lived
- Redirect URIs are read from explicit environment variables, not user input
- Send endpoint is JWT-protected and rate-limited
- Client should store the app JWT and brokered access tokens in Keychain/Keystore

## PostgreSQL Schema Reference

The runtime implementation in this repository uses MongoDB because the requirements specify MongoDB for token persistence. If you need a PostgreSQL equivalent schema for analytics or a future migration, use [docs/postgres-schema.sql](/Users/na/Documents/flutter/projects/mail server/docs/postgres-schema.sql).

## Client Flow

1. Flutter calls `GET /api/auth/:provider`
2. User completes provider login in a browser/webview
3. Provider redirects to backend callback
4. Backend stores encrypted refresh token and redirects to Flutter with app JWT
5. Flutter stores the JWT in Keychain/Keystore
6. Flutter calls `GET /api/token/:provider` when it needs a fresh provider access token
7. Flutter fetches mail/folders directly from Gmail API, Graph API, or IMAP
