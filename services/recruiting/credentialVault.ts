import * as crypto from 'crypto';

export type StoredCredential = {
  tenantId: string;
  provider: string;
  model?: string;
  ciphertext: string;
  iv: string;
  tag: string;
  createdAt: string;
  updatedAt: string;
};

function getVaultKey(): Buffer {
  const explicit = process.env.SMARTSCOUT_VAULT_KEY;
  if (explicit) {
    const key = Buffer.from(explicit, 'base64');
    if (key.length !== 32) throw new Error('SMARTSCOUT_VAULT_KEY must be a base64-encoded 32-byte key');
    return key;
  }

  // Production-safe fallback: derive a deterministic 32-byte encryption key from
  // an existing server-only secret. This avoids making the first AI connection
  // depend on an additional Hostinger variable while keeping the credential out
  // of the browser and database plaintext.
  const rootSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.GEMINI_API_KEY;
  if (!rootSecret) throw new Error('No server secret is available for credential encryption');
  return crypto.createHash('sha256').update(`smartscout:vault:${rootSecret}`).digest();
}

export function encryptCredential(credential: string, tenantId: string, provider: string): StoredCredential {
  if (!credential || credential.length < 8) throw new Error('Credential is invalid');
  const key = getVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(`${tenantId}:${provider}`));
  const ciphertext = Buffer.concat([cipher.update(credential, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const now = new Date().toISOString();
  return { tenantId, provider, ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64'), createdAt: now, updatedAt: now };
}

export function decryptCredential(stored: StoredCredential): string {
  const key = getVaultKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(stored.iv, 'base64'));
  decipher.setAAD(Buffer.from(`${stored.tenantId}:${stored.provider}`));
  decipher.setAuthTag(Buffer.from(stored.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(stored.ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

export function maskCredential(stored: StoredCredential): string {
  const plaintext = decryptCredential(stored);
  if (plaintext.length <= 8) return '••••••••';
  return `${plaintext.slice(0, 4)}${'•'.repeat(Math.min(12, plaintext.length - 8))}${plaintext.slice(-4)}`;
}
