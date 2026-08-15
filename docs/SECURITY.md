# Smart Scout credential security

## BYOK promise

Smart Scout accepts customer-supplied AI provider credentials so customers can use Gemini, OpenAI or Anthropic and keep AI billing with their chosen provider.

## Storage model

- API keys are accepted only by the authenticated server-side `/api/recruiting/ai/connect` endpoint.
- The browser never writes an AI key to `localStorage` or `sessionStorage`.
- The credential vault encrypts keys with AES-256-GCM before persistence.
- Each credential uses a fresh random 96-bit IV and authenticated tenant/provider associated data.
- The database stores ciphertext, IV and authentication tag, not plaintext API keys.
- The UI never receives the stored plaintext key back.
- Disconnect deletes the stored credential for all supported providers.
- AI connection is tested before the credential is persisted; if vault persistence fails, the connection is reported as failed rather than falsely showing a connected state.

## Encryption key

Production should set `SMARTSCOUT_VAULT_KEY` to a base64-encoded 32-byte random key. The repository includes the variable in `.env.example` but never contains the production value.

If an explicit vault key is not supplied, the current implementation derives an encryption key from an existing server-only secret. This keeps credentials encrypted at rest during migration, but an explicit dedicated vault key is the recommended production configuration.

## Access boundaries

- Recruiting APIs require a Firebase ID token.
- The authenticated Firebase UID is used as the tenant identity; a caller-supplied tenant header cannot override it.
- Server-side credential decryption occurs only when an AI operation needs the credential.
- API keys must never be written to logs, analytics events or error messages.

## Transparency

The product UI explains that customers bring their own provider/key, AI usage remains on the provider account, keys are encrypted server-side and the key is not displayed after saving. Smart Scout does not describe the custom vault as an external KMS/Secret Manager unless such infrastructure is actually configured.
